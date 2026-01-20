import { Battle, Crew, PlayerAction, MultiplayerRole, AIActionPlan, AnimationState, MissionType, MissionModifiers, Difficulty, Campaign, NotableSightResult, LogEntry, BattleParticipant, TerrainTheme, Mission, DeploymentCondition, Enemy, Character } from '../../types';
import { UNIQUE_INDIVIDUALS_TABLE, ENEMY_ENCOUNTER_CATEGORY_TABLE, CRIMINAL_ELEMENTS_SUBTABLE, HIRED_MUSCLE_SUBTABLE, INTERESTED_PARTIES_SUBTABLE, ROVING_THREATS_SUBTABLE, RulebookEnemyTemplate, EnemyEncounterCategory } from '../../constants/enemyEncounters';
import { MISSION_DEFINITIONS } from '../../constants/missions';
import { isPointInTerrain, findNearestWalkable } from '../gridUtils';
import { generateTerrain } from '../terrainGenerator';
import { DEPLOYMENT_CONDITIONS_TABLE, DeploymentConditionEntry } from '../../constants/deployment';
import { rollD100, rollD6, rollD10 } from '../utils/rolls';
import { resolveTable } from '../utils/tables';
import { BASIC_ENEMY_WEAPON_TABLE, OPPORTUNITY_MISSION_TABLE, PATRON_MISSION_TABLE, QUEST_MISSION_TABLE, RIVAL_ATTACK_TABLE, SPECIALIST_WEAPON_TABLE } from '../../constants/battleSetup';

const BATTLE_GRID_SIZE = { width: 32, height: 32 };

const PORTRAITS = Array.from({ length: 30 }, (_, i) => `/assets/portraits/sci_fi_portrait_${String(i + 1).padStart(2, '0')}.png`);
let portraitIndex = 0;

const getNextPortrait = () => {
    const portrait = PORTRAITS[portraitIndex % PORTRAITS.length];
    portraitIndex++;
    return portrait;
};


export const setupBattle = async (
    crew: Crew,
    difficulty: Difficulty,
    missionType?: MissionType,
    battleType: 'patron' | 'rival' | 'quest' | 'opportunity' | 'invasion' = 'opportunity',
    campaign?: Campaign,
    options: {
        enemyCountModifier?: number,
        hasVip?: boolean,
        isOutOfSequence?: boolean,
        sourceTravelEventId?: 'raided',
        enemyFaction?: string,
        forceEnemyCategory?: EnemyEncounterCategory;
        customEnemyCount?: number;
        forceTerrainTheme?: TerrainTheme;
    } = {}
): Promise<Battle> => {
    const participants: BattleParticipant[] = [];

    // Shuffle portraits for this battle
    PORTRAITS.sort(() => Math.random() - 0.5);
    portraitIndex = 0;

    const terrain = generateTerrain(options.forceTerrainTheme || 'Industrial', BATTLE_GRID_SIZE, campaign?.currentWorld?.traits);
    
    // --- MISSION & DEPLOYMENT ---
    let finalMissionType = missionType;
    if (!finalMissionType) {
        let missionTable = OPPORTUNITY_MISSION_TABLE;
        if (battleType === 'quest') missionTable = QUEST_MISSION_TABLE;
        if (battleType === 'patron') missionTable = PATRON_MISSION_TABLE;
        finalMissionType = resolveTable(missionTable, rollD10()).value;
    }
    const missionTemplate = MISSION_DEFINITIONS.find(m => m.type === finalMissionType) ?? MISSION_DEFINITIONS[0];
    const mission: Mission = {
        type: missionTemplate.type,
        titleKey: missionTemplate.titleKey,
        descriptionKey: missionTemplate.descriptionKey,
        status: 'in_progress'
    };
    
    let rivalAttackType: string | undefined;
    let enemyCountModifier = options.enemyCountModifier || 0;
    let canSeizeInitiative = true;

    const rivalIdForBattle = campaign?.attackingRivalId || campaign?.locatedRivalId;

    if (battleType === 'rival') {
        const attackRoll = rollD10();
        rivalAttackType = resolveTable(RIVAL_ATTACK_TABLE, attackRoll).value;
        switch (rivalAttackType) {
            case 'Ambush':
                crew.members.splice(0, 1); // Deploy one less
                canSeizeInitiative = false;
                break;
            case 'Brought friends':
            case 'Assault':
                enemyCountModifier = 1;
                break;
        }
    }
    if (battleType === 'invasion') {
        enemyCountModifier = 2;
    }

    const roll = rollD100();
    let rangeKey: keyof DeploymentConditionEntry['ranges'] = 'opportunity_patron';
    if (battleType === 'rival') rangeKey = 'rival';
    else if (battleType === 'quest') rangeKey = 'quest';
    const conditionEntry = DEPLOYMENT_CONDITIONS_TABLE.find(c => {
        const range = c.ranges[rangeKey];
        return roll >= range[0] && roll <= range[1];
    });
    const deploymentCondition: DeploymentCondition | undefined = conditionEntry ? { id: conditionEntry.id, nameKey: conditionEntry.nameKey, descriptionKey: conditionEntry.descriptionKey } : undefined;

    const battle: Battle = {
        id: `battle_${Date.now()}`,
        participants,
        gridSize: BATTLE_GRID_SIZE,
        terrain,
        mission,
        log: [{ key: 'log.info.battleBegins' }],
        round: 1,
        phase: 'reaction_roll',
        difficulty,
        quickActionOrder: [],
        slowActionOrder: [],
        reactionRolls: {},
        reactionRerollsUsed: false,
        activeParticipantId: null,
        currentTurnIndex: 0,
        enemyTurnOrder: [],
        followUpState: null,
        battleType,
        deploymentCondition,
        worldTraits: campaign?.currentWorld?.traits,
        enemiesLostThisRound: 0,
        heldTheField: false,
        isRivalBattle: battleType === 'rival',
        rivalId: rivalIdForBattle,
        wasRivalTracked: !!campaign?.locatedRivalId && !campaign?.attackingRivalId,
        rivalAttackType,
        canSeizeInitiative,
        enemyCategory: 'Criminal Elements', // Default, will be overwritten
        isQuestBattle: battleType === 'quest',
        isOutOfSequence: options.isOutOfSequence,
        sourceTravelEventId: options.sourceTravelEventId,
    };


    // --- ENEMY GENERATION ---
    // 1. Determine Category & Subtable
    let category = options.forceEnemyCategory || ENEMY_ENCOUNTER_CATEGORY_TABLE.find(c => {
        const range = c.ranges[battleType === 'rival' ? 'rival' : battleType];
        return range && campaign!.turn >= range[0] && campaign!.turn <= range[1];
    })?.category || 'Criminal Elements';

    if (battleType === 'invasion') category = 'Roving Threats';
    battle.enemyCategory = category;

    let subtable: RulebookEnemyTemplate[];
    switch (category) {
        case 'Hired Muscle': subtable = HIRED_MUSCLE_SUBTABLE; break;
        case 'Interested Parties': subtable = INTERESTED_PARTIES_SUBTABLE; break;
        case 'Roving Threats': subtable = ROVING_THREATS_SUBTABLE; break;
        case 'Criminal Elements':
        default: subtable = CRIMINAL_ELEMENTS_SUBTABLE; break;
    }

    const enemyTemplate = resolveTable(subtable, rollD100());

    // 2. Determine Number of Opponents
    let numOpponents = 0;
    if (options.customEnemyCount) {
        numOpponents = options.customEnemyCount;
    } else if (options.sourceTravelEventId === 'raided') {
        const crewSize = crew.members.length;
        let baseNum = 0;
        if (crewSize >= 6) {
            baseNum = Math.max(rollD6(), rollD6(), rollD6());
        } else if (crewSize === 5) {
            baseNum = Math.max(rollD6(), rollD6());
        } else { // 4 or less
            baseNum = rollD6();
        }
        numOpponents = baseNum + enemyTemplate.numbersModifier + 1;
    } else {
        const crewSizeForRoll = crew.members.length; // Use actual fielded crew size
        if (crewSizeForRoll >= 6) {
            numOpponents = Math.max(rollD6(), rollD6());
        } else if (crewSizeForRoll === 5) {
            numOpponents = rollD6();
        } else { // 4 or less
            numOpponents = Math.min(rollD6(), rollD6());
        }
        numOpponents += enemyTemplate.numbersModifier;
        numOpponents += enemyCountModifier;
        if (crew.members.length <= 4) numOpponents = Math.max(1, numOpponents - 1);
        
        // Difficulty modifiers
        if (difficulty === 'easy' && numOpponents >= 5) numOpponents--;
        if (difficulty === 'hardcore' || difficulty === 'insanity') numOpponents++;
    }

    if (campaign?.currentWorld?.traits.some(t => t.id === 'heavily_enforced') && category === 'Criminal Elements') {
        battle.log.push({ key: 'log.info.worldTraitHeavilyEnforced' });
        numOpponents = Math.max(1, numOpponents - 1);
    }
    if (campaign?.currentWorld?.traits.some(t => t.id === 'rampant_crime') && category === 'Criminal Elements') {
        battle.log.push({ key: 'log.info.worldTraitRampantCrime' });
        numOpponents++;
    }
    if (campaign?.currentWorld?.traits.some(t => t.id === 'dangerous') && category === 'Roving Threats') {
        battle.log.push({ key: 'log.info.worldTraitDangerous' });
        numOpponents++;
    }
    
    numOpponents = Math.max(1, numOpponents);

    // 3. Determine Specialists & Lieutenants
    let numSpecialists = 0;
    if (numOpponents >= 3 && numOpponents <= 6) numSpecialists = 1;
    if (numOpponents >= 7) numSpecialists = 2;
    if (difficulty === 'insanity') numSpecialists++;

    const hasLieutenant = numOpponents >= 4;

    // 4. Create Enemy Placeholders
    const enemies: Enemy[] = [];
    for (let i = 0; i < numOpponents; i++) {
        const enemy: Enemy = {
            id: `enemy_${Date.now()}_${i}`,
            name: `${enemyTemplate.id} #${i + 1}`,
            stats: {
                reactions: 0, // Will be set from template
                speed: enemyTemplate.speed,
                combat: enemyTemplate.combat,
                toughness: enemyTemplate.toughness,
                savvy: 0, luck: 0
            },
            ai: enemyTemplate.ai,
            weapons: [],
            isSpecialist: i < numSpecialists,
            isLieutenant: false, // Will be assigned later
            panicRange: enemyTemplate.panic,
            isFearless: enemyTemplate.ai === 'Rampaging' || (enemyTemplate.panic[0] === 0 && enemyTemplate.panic[1] === 0),
            // Battle-specific fields
            position: {x:-1, y:-1}, status: 'active', actionsRemaining: 2,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0, currentLuck: 0, activeEffects: [], consumablesUsedThisTurn: 0,
            consumables: [], utilityDevices: [], portraitUrl: getNextPortrait(),
        };
        enemies.push(enemy);
    }
    
    if (hasLieutenant) {
        const nonSpecialists = enemies.filter(e => !e.isSpecialist);
        if (nonSpecialists.length > 0) {
            nonSpecialists[0].isLieutenant = true;
            nonSpecialists[0].stats.combat++;
            nonSpecialists[0].weapons.push({ instanceId: `lw_${nonSpecialists[0].id}`, weaponId: 'blade' });
        }
    }

    // 5. Assign Weapons
    if (enemyTemplate.predefinedWeapons) {
        enemies.forEach(e => {
            e.weapons.push(...enemyTemplate.predefinedWeapons!.map(wId => ({ instanceId: `pw_${e.id}_${wId}`, weaponId: wId })));
        });
    } else {
        const specialists = enemies.filter(e => e.isSpecialist);
        const nonSpecialists = enemies.filter(e => !e.isSpecialist);

        const [, weaponCol, specCol] = (enemyTemplate.weaponsCode || '1 A').match(/(\d+)\s+([A-C])/) || ['1 A', '1', 'A'];

        // Varied Armaments for Non-Specialists
        const group1Size = Math.ceil(nonSpecialists.length / 2);
        const group2Size = nonSpecialists.length - group1Size;
        const group1Roll = rollD6();
        const group2Roll = group2Size > 0 ? rollD6() : 0;
        
        nonSpecialists.forEach((e, i) => {
            const roll = i < group1Size ? group1Roll : group2Roll;
            const weaponEntry = BASIC_ENEMY_WEAPON_TABLE.find(w => w.roll === roll);
            if(weaponEntry) {
                const weaponIds = weaponEntry[`col${weaponCol}` as keyof typeof weaponEntry] as string[];
                e.weapons.push(...weaponIds.map(wId => ({ instanceId: `bw_${e.id}_${wId}`, weaponId: wId })));
            }
        });

        // Specialist Weapons
        specialists.forEach(e => {
            const roll = rollD6();
            const weaponEntry = SPECIALIST_WEAPON_TABLE.find(w => w.roll === roll);
            if (weaponEntry) {
                 const weaponIds = weaponEntry[`col${specCol}` as keyof typeof weaponEntry] as string[];
                 e.weapons.push(...weaponIds.map(wId => ({ instanceId: `sw_${e.id}_${wId}`, weaponId: wId })));
            }
        });
    }

     // Add Blades for Aggressive/Rampage AI
    enemies.forEach(e => {
        if ((e.ai === 'Aggressive' && e.stats.combat > 0) || e.ai === 'Rampaging') {
            if (!e.weapons.some(w => w.weaponId === 'blade')) {
                e.weapons.push({ instanceId: `bw_${e.id}_blade`, weaponId: 'blade' });
            }
        }
    });

    // Handle 'VIP' Hazard
    if (options.hasVip) {
        const vipEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        vipEnemy.stats.toughness += 1;
        vipEnemy.stats.combat = 2; // Sets final combat skill, not adds
    }

    participants.push(...enemies.map(e => ({ ...e, type: 'enemy' as const })));

    // 6. Unique Individuals
    let uniqueRoll = rollD6() + rollD6();
    let addUnique = false;
    let numUniques = 1;
    if (category === 'Interested Parties') uniqueRoll++;
    if (difficulty === 'hardcore' || difficulty === 'insanity') uniqueRoll++;
    if (battleType !== 'invasion' && category !== 'Roving Threats' && uniqueRoll >= 9) addUnique = true;
    if (difficulty === 'insanity') {
        addUnique = true;
        const insanityRoll = rollD6() + rollD6();
        if (insanityRoll >= 11) numUniques = 2;
    }
    
    if (addUnique) {
        for(let i=0; i<numUniques; i++) {
            const uniqueEntry = resolveTable(UNIQUE_INDIVIDUALS_TABLE, rollD6() + rollD6());
            const uniqueStats = { ...enemyTemplate };
            // Apply modifiers
            if (uniqueEntry.speed !== 'same') uniqueStats.speed = parseInt(uniqueEntry.speed.replace('"', ''), 10);
            if (uniqueEntry.combat.includes('+')) uniqueStats.combat += parseInt(uniqueEntry.combat.replace('same', '0'), 10);
            if (uniqueEntry.toughness.includes('-')) uniqueStats.toughness -= parseInt(uniqueEntry.toughness.replace('same', '0').replace('-', ''), 10);

            const unique: Enemy = {
                id: `unique_${Date.now()}_${i}`, name: uniqueEntry.id, isUnique: true,
                stats: { reactions: 0, speed: uniqueStats.speed, combat: uniqueStats.combat, toughness: uniqueStats.toughness, savvy: 0, luck: uniqueEntry.luck },
                ai: uniqueEntry.ai === 'same' ? enemyTemplate.ai : uniqueEntry.ai,
                weapons: uniqueEntry.weapons.map(wId => ({ instanceId: `uw_${i}_${wId}`, weaponId: wId })),
                isFearless: true,
                position: {x:-1, y:-1}, status: 'active', actionsRemaining: 2,
                actionsTaken: { move: false, combat: false, dash: false, interact: false },
                stunTokens: 0, currentLuck: uniqueEntry.luck, activeEffects: [], consumablesUsedThisTurn: 0,
                consumables: [], utilityDevices: [], portraitUrl: getNextPortrait(),
            }
            participants.push({ ...unique, type: 'enemy' as const });
        }
    }

    // --- MISSION TARGETS ---
    if (mission.type === 'Eliminate') {
        const potentialTargets = participants.filter(p => p.type === 'enemy' && !p.isUnique);
        if (potentialTargets.length > 0) {
            const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            mission.targetEnemyId = target.id;
        }
    }


    // --- PARTICIPANT PLACEMENT & FINAL SETUP ---
    const tempBattleForSetup = { participants: [], gridSize: BATTLE_GRID_SIZE, terrain } as Battle;
    
    // Create VIP for Protect mission
    // FIX: Changed vipParticipant type to Character and created a full Character object.
    let vipParticipant: Character | null = null;
    if (mission.type === 'Protect') {
        const vipId = `vip_${Date.now()}`;
        mission.vipId = vipId;
        vipParticipant = {
            id: vipId,
            name: 'VIP',
            raceId: 'baseline_human',
            classId: 'negotiator',
            backgroundId: 'wealthy_merchant',
            motivationId: 'survival',
            pronouns: 'they/them',
            xp: 0,
            injuries: [],
            task: 'idle',
            backstory: 'A very important person who needs protection.',
            stats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0, luck: 0 },
            weapons: [],
            armor: undefined,
            screen: undefined,
            consumables: [],
            utilityDevices: [],
            implants: [],
            position: { x: -1, y: -1 },
            status: 'active',
            actionsRemaining: 2,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0,
            currentLuck: 0,
            activeEffects: [],
            consumablesUsedThisTurn: 0,
            portraitUrl: getNextPortrait(),
        };
    }

    const crewToPlace = [...crew.members];
    if (vipParticipant) {
        crewToPlace.push(vipParticipant);
    }
    
    crewToPlace.forEach((char, index) => {
        const initialX = Math.floor(BATTLE_GRID_SIZE.width / 2) - Math.floor(crewToPlace.length / 2) + index;
        const initialPos = { x: initialX, y: BATTLE_GRID_SIZE.height - 2 };
        const finalPos = findNearestWalkable(initialPos, tempBattleForSetup);
        participants.push({
            ...char, type: 'character', position: finalPos, status: 'active', actionsRemaining: 2,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0, currentLuck: char.stats.luck, activeEffects: [], consumablesUsedThisTurn: 0,
            deflectorFieldUsedThisBattle: false, portraitUrl: char.portraitUrl || getNextPortrait(),
        });
    });

    const finalEnemies = participants.filter(p => p.type === 'enemy');
    finalEnemies.forEach((enemy, index) => {
        const initialX = Math.floor(BATTLE_GRID_SIZE.width / 2) - Math.floor(finalEnemies.length / 2) + index;
        const initialPos = { x: initialX, y: 1 };
        enemy.position = findNearestWalkable(initialPos, { ...tempBattleForSetup, participants });
    });

    battle.participants = participants;
    battle.enemyTurnOrder = participants.filter(p => p.type === 'enemy').map(e => e.id);


    // --- VISIBILITY RULES ---
    let hazeVisibility: number | undefined;
    if (campaign?.currentWorld?.traits.some(t => t.id === 'haze')) {
        hazeVisibility = rollD6() + 8;
        battle.log.push({ key: 'log.info.worldTraitHaze', params: { distance: hazeVisibility } });
    }

    let gloomVisibility: number | undefined;
    if (campaign?.currentWorld?.traits.some(t => t.id === 'gloom')) {
        gloomVisibility = 9;
        battle.log.push({ key: 'log.info.worldTraitGloom', params: { distance: 9 } });
    }

    let deploymentVisibility: number | undefined;
    if (deploymentCondition?.id === 'poor_visibility') {
        // Note: The rulebook states this should be rerolled each round. This is not yet implemented.
        // This only sets the initial value.
        deploymentVisibility = rollD6() + 8;
    }
    if (deploymentCondition?.id === 'gloomy') {
        deploymentVisibility = 9;
    }
    
    // Rulebook: If multiple visibility restrictions apply, use the shortest.
    const visibilities = [hazeVisibility, gloomVisibility, deploymentVisibility].filter((v): v is number => v !== undefined);
    if (visibilities.length > 0) {
        battle.maxVisibility = Math.min(...visibilities);
    }
    
    if (battleType === 'patron' && campaign?.activeMission) {
        battle.originalActiveMission = campaign.activeMission;
    }

    return battle;
};

export const setupMultiplayerBattle = async (
    hostCrew: Crew,
    guestCrew: Crew
): Promise<Battle> => {
    const participants: BattleParticipant[] = [];

    const terrain = generateTerrain('Industrial', BATTLE_GRID_SIZE);

    const missionTemplate = MISSION_DEFINITIONS.find(m => m.type === 'FightOff')!;
    const mission: Mission = {
        type: missionTemplate.type,
        titleKey: missionTemplate.titleKey,
        descriptionKey: missionTemplate.descriptionKey,
        status: 'in_progress'
    };
    
    const firstPlayerRole: MultiplayerRole = Math.random() < 0.5 ? 'host' : 'guest';

    const battle: Battle = {
        id: `battle_mp_${Date.now()}`,
        participants,
        gridSize: BATTLE_GRID_SIZE,
        terrain,
        mission,
        log: [{ key: 'log.info.battleBegins' }],
        round: 1,
        phase: 'reaction_roll',
        difficulty: 'normal', // Difficulty might not apply in MP
        quickActionOrder: [],
        slowActionOrder: [],
        reactionRolls: {},
        reactionRerollsUsed: false,
        activeParticipantId: null,
        currentTurnIndex: 0,
        enemyTurnOrder: [],
        followUpState: null,
        enemiesLostThisRound: 0,
        heldTheField: false,
        firstPlayerRole,
        activePlayerRole: null,
    };

    // Add host crew
    hostCrew.members.forEach((char, index) => {
        const initialX = Math.floor(BATTLE_GRID_SIZE.width / 2) - Math.floor(hostCrew.members.length / 2) + index;
        const initialPos = { x: initialX, y: BATTLE_GRID_SIZE.height - 2 };
        const finalPos = findNearestWalkable(initialPos, battle);
        participants.push({
            ...char, 
            id: `host_${char.id}`, // prefix ID
            type: 'character', 
            position: finalPos, 
            status: 'active', 
            actionsRemaining: 2,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0, 
            currentLuck: char.stats.luck, 
            activeEffects: [], 
            consumablesUsedThisTurn: 0,
            deflectorFieldUsedThisBattle: false,
        });
    });

    // Add guest crew
    guestCrew.members.forEach((char, index) => {
        const initialX = Math.floor(BATTLE_GRID_SIZE.width / 2) - Math.floor(guestCrew.members.length / 2) + index;
        const initialPos = { x: initialX, y: 1 };
        const finalPos = findNearestWalkable(initialPos, battle);
         participants.push({
            ...char, 
            id: `guest_${char.id}`, // prefix ID
            type: 'character', 
            position: finalPos, 
            status: 'active', 
            actionsRemaining: 2,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0, 
            currentLuck: char.stats.luck, 
            activeEffects: [], 
            consumablesUsedThisTurn: 0,
            deflectorFieldUsedThisBattle: false,
        });
    });

    battle.participants = participants;

    return battle;
};
