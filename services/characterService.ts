import { Character, CharacterStats, Background, Patron, EquipmentPool, RaceId, SpecialAbility, Motivation, Class, TableEntry } from '../types';
import { RACES, CLASS_TABLE, CHARACTER_BACKGROUNDS, PRONOUNS, MOTIVATION_TABLE, CREW_TYPE_TABLE, PRIMARY_ALIEN_TABLE, STRANGE_CHARACTER_TABLE } from '../constants/characterCreation';
import { STRANGE_CHARACTERS } from '../constants/strangeCharacters';
import { 
    LOW_TECH_WEAPON_TABLE,
    MILITARY_WEAPON_TABLE,
    HIGH_TECH_WEAPON_TABLE,
    GEAR_TABLE,
    GADGET_TABLE,
} from '../constants/items';
import { rollD100, rollD6 } from './utils/rolls';
import { resolveTable } from './utils/tables';

// Define the signature for the function that will provide character details (name, backstory, etc.)
export type CharacterDetailsProvider = (
  partialChar: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns' | 'strangeCharacterId'>
) => Promise<Pick<Character, 'name' | 'backstory'>>;
export type MultipleCharacterDetailsProvider = (
    partialChars: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns' | 'strangeCharacterId'>[]
) => Promise<Pick<Character, 'name' | 'backstory'>[]>;


export interface CampaignBonuses {
    credits: number;
    storyPoints: number;
    patrons: Patron[];
    questRumors: number;
    rivals: number;
}

const PORTRAITS = Array.from({ length: 30 }, (_, i) => `/assets/portraits/sci_fi_portrait_${String(i + 1).padStart(2, '0')}.png`);
let portraitIndex = 0;
PORTRAITS.sort(() => Math.random() - 0.5); // Shuffle once on script load

const getNextPortrait = () => {
    const portrait = PORTRAITS[portraitIndex % PORTRAITS.length];
    portraitIndex++;
    return portrait;
};


/**
 * Generates the random components of a character (class, background, pronouns).
 */
export const generateCharacterRandomComponents = (): {
    classInfo: Class;
    background: Background;
    motivationInfo: Motivation;
    pronouns: string;
} => {
    const classRoll = rollD100();
    const backgroundRoll = rollD100();
    const motivationRoll = rollD100();

    const classInfo = resolveTable(CLASS_TABLE, classRoll).value;
    const background = resolveTable<Background>(CHARACTER_BACKGROUNDS, backgroundRoll);
    const motivationInfo = resolveTable(MOTIVATION_TABLE, motivationRoll).value;
    const pronouns = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
    
    return { classInfo, background, motivationInfo, pronouns };
};

/**
 * Generates a single new character with random attributes, calculates campaign bonuses,
 * and enriches with details from a provided async function.
 */
export const generateCharacter = async (
    detailsProvider: CharacterDetailsProvider
): Promise<{ character: Character, campaignBonuses: CampaignBonuses, savvyIncreased: boolean }> => {
    const crewTypeRoll = rollD100();
    const crewType = resolveTable(CREW_TYPE_TABLE, crewTypeRoll).value;
    
    let raceId: RaceId = 'baseline_human';
    let strangeCharacterId: string | undefined = undefined;
    let isBot = false;

    switch (crewType) {
        case 'primary_alien':
            raceId = resolveTable(PRIMARY_ALIEN_TABLE, rollD100()).value;
            break;
        case 'bot':
            isBot = true;
            raceId = 'bot';
            break;
        case 'strange_character':
            strangeCharacterId = resolveTable(STRANGE_CHARACTER_TABLE, rollD100()).value;
            break;
        case 'baseline_human':
        default:
            raceId = 'baseline_human';
            break;
    }
    
    const pronouns = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
    
    if (isBot) {
        const details = await detailsProvider({ raceId, classId: 'bot', backgroundId: 'N/A', motivationId: 'N/A', pronouns, strangeCharacterId });
        return assembleCharacterFromComponents({
            raceId, details, pronouns
        });
    }

    const strangeData = strangeCharacterId ? STRANGE_CHARACTERS[strangeCharacterId] : null;
    
    // Determine background, motivation, class, applying overrides
    let background: Background;
    let motivationInfo: Motivation;
    let classInfo: Class;

    if (strangeData?.creationOverrides?.fixedMotivation) {
        motivationInfo = MOTIVATION_TABLE.find(m => m.value.id === strangeData.creationOverrides!.fixedMotivation)!.value;
    } else {
        motivationInfo = resolveTable(MOTIVATION_TABLE, rollD100()).value;
    }
    
    if (strangeData?.creationOverrides?.rollTwiceBackground) {
        const roll1 = rollD100();
        let roll2 = rollD100();
        while (roll1 === roll2) roll2 = rollD100();
        const bg1 = resolveTable(CHARACTER_BACKGROUNDS, roll1);
        const bg2 = resolveTable(CHARACTER_BACKGROUNDS, roll2);
        // Combine effects and resources
        background = {
            ...bg1,
            effect: `${bg1.effect}, ${bg2.effect}`,
            resources: `${bg1.resources}, ${bg2.resources}`,
            starting_rolls: [...bg1.starting_rolls, ...bg2.starting_rolls],
        }
    } else if (strangeData?.creationOverrides?.fixedBackground) {
        background = CHARACTER_BACKGROUNDS.find(b => b.id === strangeData.creationOverrides!.fixedBackground)!;
    } else {
        background = resolveTable(CHARACTER_BACKGROUNDS, rollD100());
    }
    
    let classRoll = rollD100();
    if (strangeData?.creationOverrides?.classRestrictions) {
        const initialClass = resolveTable(CLASS_TABLE, classRoll).value.id;
        if (strangeData.creationOverrides.classRestrictions[initialClass]) {
            const newClassId = strangeData.creationOverrides.classRestrictions[initialClass];
            classInfo = CLASS_TABLE.find(c => c.value.id === newClassId)!.value;
        } else {
            classInfo = resolveTable(CLASS_TABLE, classRoll).value;
        }
    } else {
        classInfo = resolveTable(CLASS_TABLE, classRoll).value;
    }
    
    const details = await detailsProvider({
        raceId: strangeData?.baseRaceId || raceId,
        strangeCharacterId,
        classId: classInfo.id,
        backgroundId: background.id,
        motivationId: motivationInfo.id,
        pronouns,
    });
    
    return assembleCharacterFromComponents({ raceId, strangeCharacterId, classInfo, background, motivationInfo, pronouns, details });
};

export const generateFullRandomCrew = async (
    detailsProvider: MultipleCharacterDetailsProvider
): Promise<{ characters: Character[], campaignBonuses: CampaignBonuses, savvyIncreases: number }> => {

    const generationData = [];
    for (let i = 0; i < 4; i++) {
        generationData.push(await generateCharacter(() => Promise.resolve({name: '', backstory: ''})));
    }

    const partialCharsForApi = generationData.map(d => ({
        raceId: d.character.raceId,
        strangeCharacterId: d.character.strangeCharacterId,
        classId: d.character.classId,
        backgroundId: d.character.backgroundId,
        motivationId: d.character.motivationId,
        pronouns: d.character.pronouns,
    }));
    
    const allDetails = await detailsProvider(partialCharsForApi);

    const finalCharacters = generationData.map((d, i) => ({ ...d.character, ...allDetails[i]}));

    const totalBonuses = generationData.reduce((acc, curr) => {
        acc.credits += curr.campaignBonuses.credits;
        acc.storyPoints += curr.campaignBonuses.storyPoints;
        acc.patrons.push(...curr.campaignBonuses.patrons);
        acc.questRumors += curr.campaignBonuses.questRumors;
        acc.rivals += curr.campaignBonuses.rivals;
        return acc;
    }, { credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 } as CampaignBonuses & { startingRolls: string[] });

    const savvyIncreases = finalCharacters.filter(c => {
        const baseRaceSavvy = c.strangeCharacterId ? (STRANGE_CHARACTERS[c.strangeCharacterId]?.baseStats.savvy ?? 0) : (RACES[c.raceId]?.baseStats.savvy ?? 0);
        return c.stats.savvy > baseRaceSavvy;
    }).length;

    return {
        characters: finalCharacters,
        campaignBonuses: totalBonuses,
        savvyIncreases
    };
};

/**
 * Assembles a full character object from its generated components and AI-provided details.
 */
export const assembleCharacterFromComponents = (
    { raceId, strangeCharacterId, classInfo, background, motivationInfo, pronouns, details }:
    { raceId: RaceId, strangeCharacterId?: string, classInfo?: Class, background?: Background, motivationInfo?: Motivation, pronouns: string, details: Pick<Character, 'name' | 'backstory'> }
): { character: Character, campaignBonuses: CampaignBonuses, savvyIncreased: boolean } => {
    
    const strangeData = strangeCharacterId ? STRANGE_CHARACTERS[strangeCharacterId] : null;
    const baseRaceId = strangeData?.baseRaceId || raceId;
    const raceData = RACES[baseRaceId];
    
    const baseStats: CharacterStats = { reactions: 0, speed: 0, combat: 0, toughness: 0, savvy: 0, luck: 1 };
    Object.assign(baseStats, raceData.baseStats);
    if (strangeData) {
        Object.assign(baseStats, strangeData.baseStats);
    }

    const campaignBonuses: CampaignBonuses = { credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 };
    let savvyIncreased = false;
    let startingRolls: string[] = [];

    if (background && classInfo && motivationInfo) {
        const combinedEffects = `${background.effect}, ${classInfo.effect}, ${motivationInfo.effect}`.toLowerCase();
        
        if (combinedEffects.includes('savvy')) { baseStats.savvy++; savvyIncreased = true; }
        if (combinedEffects.includes('speed')) baseStats.speed++;
        if (combinedEffects.includes('toughness')) baseStats.toughness++;
        if (combinedEffects.includes('combat skill')) baseStats.combat++;
        if (combinedEffects.includes('reactions')) baseStats.reactions++;
        if (combinedEffects.includes('luck')) baseStats.luck++;
        
        const combinedResources = `${background.resources}, ${classInfo.resources}, ${motivationInfo.resources}`.toLowerCase();
        if (combinedResources.includes('patron')) {
            campaignBonuses.patrons.push({ id: `patron_${Date.now()}`, name: `A mysterious patron`, type: 'mysterious' });
        }
        if (combinedResources.includes('story point') && !strangeData?.creationOverrides?.ignoreSPCreation) campaignBonuses.storyPoints++;
        if (combinedResources.includes('1 rumor')) campaignBonuses.questRumors++;
        if (combinedResources.includes('2 quest rumors')) campaignBonuses.questRumors += 2;
        if (combinedResources.includes('rival')) campaignBonuses.rivals++;
        if (combinedResources.includes('1d6 credits')) campaignBonuses.credits += rollD6();
        if (combinedResources.includes('2d6 credits')) campaignBonuses.credits += rollD6() + rollD6();

        startingRolls.push(...background.starting_rolls, ...classInfo.starting_rolls, ...motivationInfo.starting_rolls);
    }
    
    if (strangeData?.creationOverrides?.addResources) {
        const res = strangeData.creationOverrides.addResources;
        if(res.rivals) campaignBonuses.rivals += res.rivals;
        if(res.storyPoints) campaignBonuses.storyPoints += res.storyPoints;
        if(res.questRumors) campaignBonuses.questRumors += res.questRumors;
        if(res.credits === 'reduce') {
            campaignBonuses.credits -= 2;
        } else if (res.credits) {
            campaignBonuses.credits += res.credits;
        }
    }
    
    if (raceId !== 'baseline_human') {
        baseStats.luck = Math.min(1, baseStats.luck);
    }
    if (raceId === 'engineer') {
        baseStats.toughness = Math.min(4, baseStats.toughness);
    }

    const character: Character = {
        id: `char_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...details,
        raceId: baseRaceId,
        strangeCharacterId,
        classId: classInfo?.id || 'bot',
        pronouns,
        backgroundId: background?.id || 'N/A',
        motivationId: motivationInfo?.id || 'N/A',
        stats: baseStats,
        xp: 0,
        consumables: [],
        weapons: [],
        implants: [],
        utilityDevices: [],
        armor: undefined,
        screen: undefined,
        injuries: [],
        task: 'idle',
        position: { x: -1, y: -1 },
        status: 'active',
        actionsRemaining: 0,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        stunTokens: 0,
        currentLuck: 0,
        activeEffects: [],
        consumablesUsedThisTurn: 0,
        portraitUrl: getNextPortrait(),
        innateArmorSave: strangeData?.innateArmorSave || raceData.innateArmorSave,
        noXP: strangeData?.noXP || raceData.noXP,
        noConsumablesOrImplants: raceData.noConsumablesOrImplants,
        usesBotInjuryTable: raceData.usesBotInjuryTable,
        canInstallBotUpgrades: raceData.canInstallBotUpgrades,
        specialAbilities: strangeData?.specialAbilities || raceData.specialAbilities,
        startingRolls: startingRolls,
    };
    
    let xp_bonus = 0;
    if (classInfo && `${classInfo.effect}`.toLowerCase().includes('+2 xp')) xp_bonus += 2;
    if (motivationInfo && `${motivationInfo.effect}`.toLowerCase().includes('+2 xp')) xp_bonus += 2;
    character.xp = xp_bonus;
    
    return { character, campaignBonuses, savvyIncreased };
};

export const applyRaceToCharacter = (character: Character, newRaceId: RaceId): Character => {
    const newChar = { ...character };
    const newRace = RACES[newRaceId];

    // Handle special case: converting TO a Bot
    if (newRace.id === 'bot') {
        newChar.originalBackgroundId = character.backgroundId;
        newChar.originalClassId = character.classId;
        newChar.backgroundId = 'N/A';
        newChar.classId = 'bot';
    } 
    // Handle special case: converting FROM a Bot
    else if (character.raceId === 'bot') {
        // Restore original background/class if available, otherwise generate new ones
        const { background, classInfo } = character.originalBackgroundId && character.originalClassId
            ? {
                background: CHARACTER_BACKGROUNDS.find(b => b.id === character.originalBackgroundId) || CHARACTER_BACKGROUNDS[0],
                classInfo: CLASS_TABLE.find(c => c.value.id === character.originalClassId)?.value || CLASS_TABLE[0].value
              }
            : generateCharacterRandomComponents();

        newChar.backgroundId = background.id;
        newChar.classId = classInfo.id;
        newChar.originalBackgroundId = undefined;
        newChar.originalClassId = undefined;
    }

    newChar.raceId = newRaceId;

    // Recalculate stats from scratch
    const background = CHARACTER_BACKGROUNDS.find(b => b.id === newChar.backgroundId) || CHARACTER_BACKGROUNDS[0];
    const classInfo = CLASS_TABLE.find(c => c.value.id === newChar.classId)?.value || CLASS_TABLE[0].value;
    const motivationInfo = MOTIVATION_TABLE.find(m => m.value.id === newChar.motivationId)?.value || MOTIVATION_TABLE[0].value;


    let finalStats: CharacterStats = { reactions: 0, speed: 0, combat: 0, toughness: 0, savvy: 0, luck: 1 };
    
    if (newRaceId === 'bot' || !background || !classInfo || !motivationInfo) {
        // Bot has fixed stats
        Object.assign(finalStats, newRace.baseStats);
    } else {
        Object.assign(finalStats, newRace.baseStats);
        const combinedEffects = `${background.effect}, ${classInfo.effect}, ${motivationInfo.effect}`.toLowerCase();
        if (combinedEffects.includes('savvy')) finalStats.savvy++;
        if (combinedEffects.includes('speed')) finalStats.speed++;
        if (combinedEffects.includes('toughness')) finalStats.toughness++;
        if (combinedEffects.includes('combat skill')) finalStats.combat++;
        if (combinedEffects.includes('reactions')) finalStats.reactions++;
        if (combinedEffects.includes('luck')) finalStats.luck++;
    }

    // Clamp luck for non-humans
    if (newRaceId !== 'baseline_human') {
        finalStats.luck = Math.min(1, finalStats.luck);
    }
    // Engineer toughness cap
    if (newRaceId === 'engineer' && finalStats.toughness > 4) {
        finalStats.toughness = 4;
    }

    newChar.stats = finalStats;

    // Update race-specific flags and abilities
    newChar.innateArmorSave = newRace.innateArmorSave;
    newChar.noXP = newRace.noXP;
    newChar.noConsumablesOrImplants = newRace.noConsumablesOrImplants;
    newChar.usesBotInjuryTable = newRace.usesBotInjuryTable;
    newChar.canInstallBotUpgrades = newRace.canInstallBotUpgrades;
    newChar.specialAbilities = newRace.specialAbilities;
    
    // Bots can't have Luck, XP, or upgrades
    if (newRace.id === 'bot') {
        newChar.stats.luck = 0;
        newChar.xp = 0;
    }

    return newChar;
};

/**
 * Generates a single new character with random attributes, calculates campaign bonuses,
 * and enriches with details from a provided async function. Always starts as a Baseline Human.
 */
export const generateCharacter_DEPRECATED = async (
    detailsProvider: CharacterDetailsProvider
): Promise<{ character: Character, campaignBonuses: CampaignBonuses, savvyIncreased: boolean }> => {
  const { classInfo, background, pronouns, motivationInfo } = generateCharacterRandomComponents();
  
  const details = await detailsProvider({
    raceId: 'baseline_human',
    classId: classInfo.id,
    backgroundId: background.id,
    motivationId: motivationInfo.id,
    pronouns: pronouns,
  });

  return assembleCharacterFromComponents({raceId: 'baseline_human', classInfo, background, motivationInfo, pronouns, details});
};

/**
 * Generates starting equipment for the crew.
 * To be called once, after the initial crew is created.
 */
export const generateStartingEquipment = (savvyIncreases: number, bonusRolls: string[]): EquipmentPool => {
    const equipmentPool: EquipmentPool = {
        weapons: [],
        armor: [],
        screen: [],
        consumables: [],
    };

    const addEquipment = (item: { type: 'weapon' | 'armor' | 'screen' | 'consumable', id: string }) => {
        switch (item.type) {
            case 'weapon': equipmentPool.weapons.push(item.id); break;
            case 'armor': equipmentPool.armor.push(item.id); break;
            case 'screen': equipmentPool.screen.push(item.id); break;
            case 'consumable': equipmentPool.consumables.push(item.id); break;
        }
    };
    
    // Base Crew Rolls
    const highTechRolls = Math.min(savvyIncreases, 3);
    const militaryRolls = 3 - highTechRolls;
    const lowTechRolls = 3;

    for (let i = 0; i < highTechRolls; i++) {
        addEquipment(resolveTable(HIGH_TECH_WEAPON_TABLE, rollD100()).value);
    }
    for (let i = 0; i < militaryRolls; i++) {
        addEquipment(resolveTable(MILITARY_WEAPON_TABLE, rollD100()).value);
    }
    for (let i = 0; i < lowTechRolls; i++) {
        addEquipment(resolveTable(LOW_TECH_WEAPON_TABLE, rollD100()).value);
    }
    addEquipment(resolveTable(GEAR_TABLE, rollD100()).value);
    addEquipment(resolveTable(GADGET_TABLE, rollD100()).value);

    // Bonus Rolls from character creation
    bonusRolls.forEach(rollStr => {
        if (rollStr.includes('Military Weapon')) {
            addEquipment(resolveTable(MILITARY_WEAPON_TABLE, rollD100()).value);
        } else if (rollStr.includes('Low-tech Weapon')) {
            addEquipment(resolveTable(LOW_TECH_WEAPON_TABLE, rollD100()).value);
        } else if (rollStr.includes('High-tech Weapon')) {
            addEquipment(resolveTable(HIGH_TECH_WEAPON_TABLE, rollD100()).value);
        } else if (rollStr.includes('Gadget')) {
            addEquipment(resolveTable(GADGET_TABLE, rollD100()).value);
        } else if (rollStr.includes('Gear')) {
            addEquipment(resolveTable(GEAR_TABLE, rollD100()).value);
        }
    });

    return equipmentPool;
};


/**
 * Generates a new recruit with random attributes.
 * This is a simplified version of generateCharacter for in-game recruiting.
 */
export const generateNewRecruit = (): Partial<Character> => {
    const crewTypeRoll = rollD100();
    const crewType = resolveTable(CREW_TYPE_TABLE, crewTypeRoll).value;
    
    let raceId: RaceId = 'baseline_human';
    let strangeCharacterId: string | undefined = undefined;

    switch (crewType) {
        case 'primary_alien':
            raceId = resolveTable(PRIMARY_ALIEN_TABLE, rollD100()).value;
            break;
        case 'bot':
            raceId = 'bot';
            break;
        case 'strange_character':
            strangeCharacterId = resolveTable(STRANGE_CHARACTER_TABLE, rollD100()).value;
            break;
        case 'baseline_human':
        default:
            raceId = 'baseline_human';
            break;
    }

    const strangeData = strangeCharacterId ? STRANGE_CHARACTERS[strangeCharacterId] : null;
    const baseRaceId = strangeData?.baseRaceId || raceId;
    const raceData = RACES[baseRaceId];

    const baseStats: CharacterStats = { reactions: 0, speed: 0, combat: 0, toughness: 0, savvy: 0, luck: 1 };
    Object.assign(baseStats, raceData.baseStats);
    if (strangeData) {
        Object.assign(baseStats, strangeData.baseStats);
    }
    
    const pronouns = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
    
    const partialCharacter: Partial<Character> = {
        id: `char_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        raceId: baseRaceId,
        strangeCharacterId,
        classId: raceId === 'bot' ? 'bot' : 'recruited',
        pronouns,
        backgroundId: raceId === 'bot' ? 'N/A' : 'recruited',
        motivationId: raceId === 'bot' ? 'N/A' : 'survival',
        stats: baseStats,
        xp: 0,
        consumables: [],
        weapons: [{ instanceId: `recruit_wep_${Date.now()}`, weaponId: 'hand_gun' }],
        implants: [],
        utilityDevices: [],
        armor: undefined,
        screen: undefined,
        injuries: [],
        task: 'idle',
        position: { x: -1, y: -1 },
        status: 'active',
        actionsRemaining: 0,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        stunTokens: 0,
        currentLuck: 0,
        activeEffects: [],
        consumablesUsedThisTurn: 0,
        portraitUrl: getNextPortrait(),
        innateArmorSave: strangeData?.innateArmorSave || raceData.innateArmorSave,
        noXP: strangeData?.noXP || raceData.noXP,
        noConsumablesOrImplants: raceData.noConsumablesOrImplants,
        usesBotInjuryTable: raceData.usesBotInjuryTable,
        canInstallBotUpgrades: raceData.canInstallBotUpgrades,
        specialAbilities: strangeData?.specialAbilities || raceData.specialAbilities,
    };
    
    return partialCharacter;
};
