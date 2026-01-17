
import { Battle, LogEntry, PlayerAction, MultiplayerRole, BattlePhase, AIActionPlan, BattleParticipant, Enemy, Character, CharacterWeapon, Terrain, BattleEventTableEntry } from '../../types';
import { checkMissionStatus } from '../rules/mission';
import type { MiddlewareContext, ActionMiddleware } from './middleware/types';
import { errorHandlingMiddleware } from './middleware/errorHandlingMiddleware';
import { validationMiddleware } from './middleware/validationMiddleware';
import { coreResolverMiddleware } from './middleware/coreResolverMiddleware';
import { missionStatusMiddleware } from './middleware/missionStatusMiddleware';
import { applyEnemyAction as applyEnemyActionDomain } from './middleware/coreResolverMiddleware';
import { rollD6, rollD100 } from '../utils/rolls';
import { BattleDomain } from '@/services/domain/battleDomain';
import { BATTLE_EVENTS_TABLE } from '../../constants/battleEvents';
import { resolveTable } from '../utils/tables';
import { getRandomPosition, findFleePath, distance } from '../gridUtils';
import { ENEMY_TEMPLATES, UNIQUE_INDIVIDUAL_TEMPLATE } from '../../constants/enemies';
import { resolveShooting } from '../rules/shooting';
import { generateNewRecruit } from '../characterService';
import { applyHitAndSaves } from '../rules/damage';

// --- Action Middleware System ---
const findFirstActiveInOrder = (order: string[], participants: BattleParticipant[]): { id: string | null; index: number } => {
    for (let i = 0; i < order.length; i++) {
        const participantId = order[i];
        const participant = participants.find(p => p.id === participantId);
        if (participant && participant.status !== 'casualty' && participant.actionsRemaining > 0) {
            return { id: participant.id, index: i };
        }
    }
    return { id: null, index: -1 };
};

const findNextActiveInOrder = (order: string[], participants: BattleParticipant[], currentIndex: number): { id: string | null; index: number } => {
    for (let i = currentIndex + 1; i < order.length; i++) {
        const participantId = order[i];
        const participant = participants.find(p => p.id === participantId);
        if (participant && participant.status !== 'casualty' && participant.actionsRemaining > 0) {
            return { id: participant.id, index: i };
        }
    }
    return { id: null, index: -1 };
};

const resolveBattleEvent = (battle: Battle): LogEntry[] => {
    const logs: LogEntry[] = [];
    const roll = rollD100();
    const event = (resolveTable(BATTLE_EVENTS_TABLE, roll) as BattleEventTableEntry).value;
    const eventLogKey = `battle.battleEvents.${event.id}`;
    const eventName = `log.info.battle_event.${event.id}`;

    logs.push({ key: 'log.info.battleEventTriggered', params: { eventName: eventLogKey } });

    switch(event.id) {
        case 'renewed_efforts': {
            const activeEnemies = battle.participants.filter(p => p.type === 'enemy' && p.status === 'active');
            if (activeEnemies.length > 0) {
                const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
                battle.renewedEffortsActive = true;
                logs.push({ key: eventName, params: { name: randomEnemy.name } });
            }
            break;
        }
        case 'enemy_reinforcements': {
            const activeEnemies = battle.participants.filter(p => p.type === 'enemy');
            if (activeEnemies.length > 0) {
                const { type, ...templateEnemyData } = activeEnemies[0];
                const newEnemies: Enemy[] = [];
                for (let i = 0; i < 2; i++) {
                    const spawnX = Math.floor(battle.gridSize.width / 2) + i;
                    const newEnemy: Enemy = {
                        ...JSON.parse(JSON.stringify(templateEnemyData)),
                        id: `reinforcement_${Date.now()}_${i}`,
                        name: `${templateEnemyData.name.split(' #')[0]} #${activeEnemies.length + i + 1}`,
                        position: { x: spawnX, y: 0 },
                        isSpecialist: i === 0, // One is a specialist
                    };
                    newEnemies.push(newEnemy);
                }
                battle.participants.push(...newEnemies.map(e => ({ ...e, type: 'enemy' as const })));
                logs.push({ key: eventName });
            }
            break;
        }
        case 'change_of_plans':
            battle.participants.forEach(p => {
                if (p.type === 'enemy') {
                    if (p.ai === 'Cautious') p.ai = 'Tactical';
                    else p.ai = 'Cautious';
                }
            });
            logs.push({ key: eventName });
            break;
        case 'lost_heart':
            battle.enemiesWillFleeNextRound = true;
            logs.push({ key: eventName });
            break;
        case 'seized_the_moment': {
            const activeCrew = battle.participants.filter(p => p.type === 'character' && p.status === 'active');
            if (activeCrew.length > 0) {
                const char = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                battle.seizedTheMomentCharacterId = char.id;
                logs.push({ key: eventName, params: { name: char.name } });
            }
            break;
        }
        case 'critters': {
            const critterCount = Math.ceil(rollD6() / 2); // 1D3
            const critterTemplate = ENEMY_TEMPLATES.find(t => t.id === 'vent_crawler');
            if (critterTemplate) {
                for (let i = 0; i < critterCount; i++) {
                    const position = getRandomPosition(battle.gridSize, battle.participants, battle.terrain);
                    const newCritter: BattleParticipant = {
                        type: 'enemy',
                        id: `critter_${Date.now()}_${i}`,
                        name: `Vent Crawler #${i + 1}`,
                        ai: critterTemplate.ai,
                        stats: critterTemplate.stats,
                        weapons: critterTemplate.weapons.map(wId => ({ instanceId: `critter_${i}_${wId}`, weaponId: wId })),
                        position,
                        status: 'active',
                        actionsRemaining: 2,
                        actionsTaken: { move: false, combat: false, dash: false, interact: false },
                        stunTokens: 0,
                        currentLuck: 0,
                        activeEffects: [],
                        consumablesUsedThisTurn: 0,
                        consumables: [],
                        utilityDevices: [],
                    };
                    battle.participants.push(newCritter);
                }
            }
            logs.push({ key: eventName });
            break;
        }
        case 'ammo_fault': {
            const crewWhoFired = battle.log
                .filter(l => typeof l === 'object' && l.key.includes('shoot') && l.params?.attacker)
                .map(l => (l as LogEntry).params!.attacker as string);

            const uniqueShooters = [...new Set(crewWhoFired)];
            const potentialTargets = battle.participants.filter(p => uniqueShooters.includes(p.name!) && p.weapons.length > 0);
            
            if (potentialTargets.length > 0) {
                const char = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                const weapon = char.weapons[Math.floor(Math.random() * char.weapons.length)];
                if (!char.inoperableWeapons) char.inoperableWeapons = [];
                char.inoperableWeapons.push(weapon.instanceId);
                logs.push({ key: eventName, params: { name: char.name, weaponName: weapon.weaponId } });
            }
            break;
        }
        case 'visibility_change':
            const newVisibility = rollD6() + 6;
            battle.maxVisibility = newVisibility;
            logs.push({ key: eventName, params: { distance: newVisibility } });
            break;
        case 'tougher_than_expected': {
            const activeEnemies = battle.participants.filter(p => p.type === 'enemy' && p.status !== 'casualty');
            if (activeEnemies.length > 0) {
                const enemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
                enemy.stats.toughness = Math.min(6, enemy.stats.toughness + 1);
                logs.push({ key: eventName, params: { name: enemy.name } });
            }
            break;
        }
        case 'snap_shot': {
            const activeCrew = battle.participants.filter(p => p.type === 'character' && p.status === 'active');
            if (activeCrew.length > 0) {
                const char = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                const weapon = char.weapons.map(cw => BattleDomain.getEffectiveWeapon(char, cw.instanceId)).find(w => w && w.range !== 'brawl');
                const target = battle.participants.find(p => p.type === 'enemy' && p.status === 'active' && weapon && typeof weapon.range === 'number' && distance(char.position, p.position) <= weapon.range);
                if (weapon && target) {
                    logs.push({ key: eventName, params: { name: char.name } });
                    logs.push(...resolveShooting(char, target, weapon, battle, false, false, null));
                }
            }
            break;
        }
        case 'cunning_plan':
            battle.cunningPlanActive = true;
            logs.push({ key: eventName });
            break;
        case 'possible_reinforcements':
            battle.pendingReinforcements = [
                { id: `pr_${Date.now()}_1`, position: { x: 5, y: 0 } },
                { id: `pr_${Date.now()}_2`, position: { x: Math.floor(battle.gridSize.width / 2), y: 0 } },
                { id: `pr_${Date.now()}_3`, position: { x: battle.gridSize.width - 5, y: 0 } },
            ];
            logs.push({ key: eventName });
            break;
        case 'clock_is_running_out':
            battle.tickingClock = { startRound: battle.round, dice: 1 };
            logs.push({ key: eventName });
            break;
        case 'environmental_hazard': {
            const randomTerrain = battle.terrain[Math.floor(Math.random() * battle.terrain.length)];
            const targets = battle.participants.filter(p => distance(p.position, randomTerrain.position) <= 1);
            targets.forEach(t => {
                const roll = rollD6();
                const savvy = t.type === 'character' ? t.stats.savvy : 0;
                if (roll + savvy < 5) {
                    logs.push(...applyHitAndSaves(battle, t, t, { id: 'hazard', range: 0, shots: 1, damage: 1, traits: ['piercing'] }, false));
                }
            });
            logs.push({ key: eventName, params: { terrainName: randomTerrain.name } });
            break;
        }
        case 'a_desperate_plan': {
            const activeCrew = battle.participants.filter(p => p.type === 'character' && p.status === 'active');
            if (activeCrew.length >= 2) {
                const char1 = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                const char2 = activeCrew.filter(c => c.id !== char1.id)[Math.floor(Math.random() * (activeCrew.length - 1))];
                char1.actionsRemaining = 0;
                battle.desperatePlanCharacterId = char2.id;
                logs.push({ key: eventName, params: { name1: char1.name, name2: char2.name } });
            }
            break;
        }
        case 'a_moment_of_hesitation':
            battle.momentOfHesitationActive = true;
            logs.push({ key: eventName, params: { name: 'a character' } }); // Placeholder name
            break;
        case 'fumbled_grenade': {
            const activeEnemies = battle.participants.filter(p => p.type === 'enemy' && p.status === 'active');
            if (activeEnemies.length > 0) {
                const fumbler = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
                const fleeTo = findFleePath(fumbler.position, fumbler.position, 6, battle, fumbler.id);
                fumbler.position = fleeTo;
                fumbler.status = 'stunned';
                fumbler.stunTokens++;
                
                const nearbyFigures = battle.participants.filter(p => p.id !== fumbler.id && distance(p.position, fumbler.position) <= 4);
                nearbyFigures.forEach(fig => {
                    const fleeToFig = findFleePath(fig.position, fumbler.position, 4, battle, fig.id);
                    fig.position = fleeToFig;
                });
            }
            logs.push({ key: eventName });
            break;
        }
        case 'back_up': {
            const newRecruit = generateNewRecruit() as Character;
            const position = { x: Math.floor(battle.gridSize.width / 2), y: battle.gridSize.height - 1 };
            battle.participants.push({ ...newRecruit, type: 'character', position, name: newRecruit.name || "Backup" });
            logs.push({ key: eventName, params: { name: newRecruit.name } });
            break;
        }
        case 'enemy_vip': {
            const vipTemplate = UNIQUE_INDIVIDUAL_TEMPLATE;
            const position = { x: Math.floor(battle.gridSize.width / 2), y: 0 };
            const newVip: BattleParticipant = {
                type: 'enemy',
                id: `vip_${Date.now()}`,
                name: 'Enemy VIP',
                ai: vipTemplate.ai,
                stats: vipTemplate.stats,
                armor: vipTemplate.armor,
                panicRange: vipTemplate.panicRange,
                isFearless: vipTemplate.isFearless,
                isUnique: true,
                weapons: vipTemplate.weapons.map(wId => ({ instanceId: `vip_${wId}_${Date.now()}`, weaponId: wId })),
                position,
                status: 'active',
                actionsRemaining: 2,
                actionsTaken: { move: false, combat: false, dash: false, interact: false },
                stunTokens: 0,
                currentLuck: vipTemplate.stats.luck,
                activeEffects: [],
                consumablesUsedThisTurn: 0,
                consumables: vipTemplate.consumables,
                utilityDevices: [],
            };
            battle.participants.push(newVip);
            logs.push({ key: eventName });
            break;
        }
        case 'fog_cloud': {
            const fog: Terrain = {
                id: 'fog_cloud',
                name: 'Fog Cloud',
                type: 'Field',
                position: { x: Math.floor(battle.gridSize.width / 2) - 3, y: Math.floor(battle.gridSize.height / 2) - 3 },
                size: { width: 6, height: 6 },
                isDifficult: false,
                providesCover: true,
                blocksLineOfSight: true, // Simplified: LoS is handled by special rule
                isImpassable: false,
            };
            battle.terrain.push(fog);
            // Actual visibility reduction past 2" needs LoS check modification, which is not possible here.
            logs.push({ key: eventName });
            break;
        }
        case 'lost': {
             const activeCrew = battle.participants.filter(p => p.type === 'character' && p.status === 'active');
             if (activeCrew.length > 1) { // Can't lose the last one
                const char = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                char.status = 'casualty';
                (char as Character).knockedOut = true; // Special flag to prevent injury roll
                logs.push({ key: eventName, params: { name: char.name } });
             }
             break;
        }
        case 'i_found_something': {
            const char = battle.participants.find(p => p.type === 'character' && p.status === 'active');
            if (char) {
                const pos = getRandomPosition(battle.gridSize, battle.participants, battle.terrain);
                if (!battle.battleEventMarkers) battle.battleEventMarkers = [];
                battle.battleEventMarkers.push({ id: `loot_${Date.now()}`, position: pos, type: 'loot' });
                logs.push({ key: eventName, params: { name: char.name } });
            }
            break;
        }
        case 'looks_valuable': {
            const char = battle.participants.find(p => p.type === 'character' && p.status === 'active');
            if (char) {
                const pos = getRandomPosition(battle.gridSize, battle.participants, battle.terrain);
                if (!battle.battleEventMarkers) battle.battleEventMarkers = [];
                battle.battleEventMarkers.push({ id: `credits_${Date.now()}`, position: pos, type: 'credits' });
                logs.push({ key: eventName, params: { name: char.name } });
            }
            break;
        }
        case 'you_want_me_to_check_that_out': {
             const activeCrew = battle.participants.filter(p => p.type === 'character' && p.status === 'active');
             if (activeCrew.length > 1) {
                const char = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                char.status = 'casualty';
                (char as Character).knockedOut = true;
                if (!battle.charactersWhoLeftForLoot) battle.charactersWhoLeftForLoot = [];
                battle.charactersWhoLeftForLoot.push(char.id);
                logs.push({ key: eventName, params: { name: char.name } });
             }
            break;
        }
    }
    return logs;
};

export const advancePhaseActionResolver = (battle: Battle, multiplayerRole: MultiplayerRole | null): void => {
    if (multiplayerRole) {
        switch (battle.phase) {
            case 'reaction_roll':
                battle.phase = 'quick_actions';
                battle.log.push({ key: 'log.info.phaseQuick' });
                const quickResult = findFirstActiveInOrder(battle.quickActionOrder, battle.participants);
                battle.activeParticipantId = quickResult.id;
                battle.currentTurnIndex = quickResult.index;
                if (quickResult.id) {
                    const activeP = battle.participants.find(p => p.id === quickResult.id)!;
                    battle.activePlayerRole = activeP.id.startsWith('host') ? 'host' : 'guest';
                } else {
                    battle.phase = 'slow_actions';
                    battle.log.push({ key: 'log.info.noQuickActions' }, { key: 'log.info.phaseSlow' });
                    const slowResult = findFirstActiveInOrder(battle.slowActionOrder, battle.participants);
                    battle.activeParticipantId = slowResult.id;
                    battle.currentTurnIndex = slowResult.index;
                    if (slowResult.id) {
                        const activeP = battle.participants.find(p => p.id === slowResult.id)!;
                        battle.activePlayerRole = activeP.id.startsWith('host') ? 'host' : 'guest';
                    } else {
                        battle.phase = 'end_round';
                        battle.log.push({ key: 'log.info.noSlowActions' });
                    }
                }
                break;
            case 'quick_actions':
                battle.phase = 'slow_actions';
                battle.log.push({ key: 'log.info.phaseSlow' });
                const slowResult = findFirstActiveInOrder(battle.slowActionOrder, battle.participants);
                battle.activeParticipantId = slowResult.id;
                battle.currentTurnIndex = slowResult.index;
                if (slowResult.id) {
                    const activeP = battle.participants.find(p => p.id === slowResult.id)!;
                    battle.activePlayerRole = activeP.id.startsWith('host') ? 'host' : 'guest';
                } else {
                    battle.phase = 'end_round';
                    battle.log.push({ key: 'log.info.noSlowActions' });
                }
                break;
            case 'slow_actions':
                // Find next participant in slow action order
                const nextSlowResult = findNextActiveInOrder(battle.slowActionOrder, battle.participants, battle.currentTurnIndex);
                if (nextSlowResult.id) {
                    battle.activeParticipantId = nextSlowResult.id;
                    battle.currentTurnIndex = nextSlowResult.index;
                    const activeP = battle.participants.find(p => p.id === nextSlowResult.id)!;
                    battle.activePlayerRole = activeP.id.startsWith('host') ? 'host' : 'guest';
                } else {
                    // No more participants with slow actions, end the round
                    battle.phase = 'end_round';
                    battle.activeParticipantId = null;
                    battle.currentTurnIndex = -1;
                    battle.activePlayerRole = null;
                }
                break;
            case 'end_round':
                const { logs: missionLogsMulti } = checkMissionStatus(battle, 'end_of_round');
                battle.log.push(...missionLogsMulti);

                // The TypeScript compiler narrows the type of `battle.phase` to 'end_round' inside this
                // switch case. Even though `checkMissionStatus` might change it, the compiler isn't
                // aware of this side effect. We must re-check the type against the broader BattlePhase enum.
                if ((battle.phase as BattlePhase) === 'battle_over') {
                    return;
                }

                const nextRound = battle.round + 1;
                battle.round = nextRound;
                battle.phase = 'reaction_roll';
                battle.firstPlayerRole = battle.firstPlayerRole === 'host' ? 'guest' : 'host';
                battle.activePlayerRole = null;
                battle.activeParticipantId = null;
                battle.currentTurnIndex = -1;
                battle.quickActionOrder = [];
                battle.slowActionOrder = [];
                battle.reactionRolls = {};
                battle.reactionRerollsUsed = false;
                battle.participants.forEach(p => {
                    p.activeEffects = p.activeEffects.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration !== 0);
                    if (p.status === 'dazed') p.status = 'active';
                    p.actionsRemaining = p.status === 'stunned' ? 1 : (p.status === 'active' ? 2 : 0);
                    p.actionsTaken = { move: false, combat: false, dash: false, interact: false };
                    p.consumablesUsedThisTurn = 0;
                    p.combatActionsTaken = 0;
                });
                battle.log.push({ key: 'log.info.endOfRound', params: { round: battle.round - 1 } }, { key: 'log.info.prepareForRound', params: { round: nextRound } });
                break;
        }
    } else { // Solo mode
        switch (battle.phase) {
            case 'reaction_roll':
                battle.phase = 'quick_actions';
                battle.log.push({ key: 'log.info.phaseQuick' });
                const quickResult = findFirstActiveInOrder(battle.quickActionOrder, battle.participants);
                battle.activeParticipantId = quickResult.id;
                battle.currentTurnIndex = quickResult.index;
                if (!quickResult.id) {
                    battle.phase = 'enemy_actions';
                    battle.log.push({ key: 'log.info.noQuickActions' });
                }
                break;
            case 'quick_actions': {
                const enemiesStillActive = battle.participants.some(p => p.type === 'enemy' && p.status !== 'casualty');
                if (enemiesStillActive) {
                    battle.phase = 'enemy_actions';
                    battle.log.push({ key: 'log.info.phaseEnemy' });
                    battle.activeParticipantId = null;
                    battle.currentTurnIndex = 0;
                } else {
                    // Skip enemy phase if no enemies are left
                    battle.phase = 'slow_actions';
                    battle.log.push({ key: 'log.info.phaseSlow' });
                    const slowResult = findFirstActiveInOrder(battle.slowActionOrder, battle.participants);
                    battle.activeParticipantId = slowResult.id;
                    battle.currentTurnIndex = slowResult.index;
                    if (!slowResult.id) {
                        battle.phase = 'end_round';
                        battle.log.push({ key: 'log.info.noSlowActions' });
                        // The round is over, so immediately process the end_round logic.
                        advancePhaseActionResolver(battle, null);
                    }
                }
                break;
            }
            case 'enemy_actions':
                battle.phase = 'slow_actions';
                battle.log.push({ key: 'log.info.phaseSlow' });
                const slowResult = findFirstActiveInOrder(battle.slowActionOrder, battle.participants);
                battle.activeParticipantId = slowResult.id;
                battle.currentTurnIndex = slowResult.index;
                if (!slowResult.id) {
                    battle.phase = 'end_round';
                    battle.log.push({ key: 'log.info.noSlowActions' });
                     // The round is over, so immediately process the end_round logic.
                    advancePhaseActionResolver(battle, null);
                }
                break;
            case 'slow_actions':
                battle.phase = 'end_round';
                battle.activeParticipantId = null;
                battle.currentTurnIndex = 0;
                // The round is over, so immediately process the end_round logic.
                if (!multiplayerRole) {
                    advancePhaseActionResolver(battle, null);
                }
                break;
            case 'end_round':
                if ((battle.round === 2 || battle.round === 4) && battle.battleEventTriggeredForRound !== battle.round) {
                    battle.log.push(...resolveBattleEvent(battle));
                    battle.battleEventTriggeredForRound = battle.round;
                }
                
                if (battle.enemiesWillFleeNextRound) {
                    battle.participants.filter(p => p.type === 'enemy').forEach(e => e.status = 'casualty');
                    battle.log.push({ key: 'log.info.moraleBail', params: { name: "All enemies" } });
                }

                if (battle.enemiesLostThisRound > 0) {
                    const logs: LogEntry[] = [];
                    logs.push({ key: 'log.info.moraleCheck', params: { count: battle.enemiesLostThisRound } });

                    const representativeEnemy = battle.participants.find(p => p.type === 'enemy' && !(p as Enemy).isFearless && p.status !== 'casualty') as Enemy | undefined;
                    const panicRange = representativeEnemy?.panicRange;
                    let bailingCount = 0;
                    const rolls: number[] = [];

                    if (panicRange && panicRange[1] > 0) {
                        for (let i = 0; i < battle.enemiesLostThisRound; i++) {
                            const roll = rollD6();
                            rolls.push(roll);
                            if (roll >= panicRange[0] && roll <= panicRange[1]) {
                                bailingCount++;
                            }
                        }
                        logs.push({ key: 'log.info.moraleRolls', params: { rolls: rolls.join(', '), count: bailingCount } });
                    }

                    if (bailingCount > 0) {
                        const potentialBailers = battle.participants
                            .filter(p => p.type === 'enemy' && !(p as Enemy).isFearless && p.status !== 'casualty')
                            .sort((a, b) => a.position.y - b.position.y);

                        const enemiesToBail = potentialBailers.slice(0, bailingCount);

                        enemiesToBail.forEach(enemy => {
                            logs.push({ key: 'log.info.moraleBail', params: { name: enemy.name } });
                        });
                        
                        const idsToBail = new Set(enemiesToBail.map(e => e.id));
                        battle.participants = battle.participants.filter(p => !idsToBail.has(p.id));

                    } else if (rolls.length > 0) {
                        logs.push({ key: 'log.info.moraleNoBail' });
                    }
                    battle.log.push(...logs);
                }

                const enemiesRemaining = battle.participants.some(p => p.type === 'enemy' && p.status !== 'casualty');
                if (!enemiesRemaining && !battle.heldTheField) {
                    battle.heldTheField = true;
                    battle.log.push({ key: 'log.info.battleEndEnemiesDefeated' });
                }

                const { logs: missionLogsSolo } = checkMissionStatus(battle, 'end_of_round');
                battle.log.push(...missionLogsSolo);
                
                // The check below was too aggressive. `checkMissionStatus` now handles ending the battle if appropriate.
                // For missions like 'Access' or 'Acquire', the player may continue to act after clearing the field.
                // if (!enemiesRemaining && (battle.phase as BattlePhase) !== 'battle_over') {
                //     battle.phase = 'battle_over';
                // }

                if ((battle.phase as BattlePhase) === 'battle_over') {
                    const crewRemaining = battle.participants.some(p => p.type === 'character' && p.status !== 'casualty');
                    if (!crewRemaining) {
                        battle.log.push({ key: 'log.info.battleEndCrewDefeated' });
                    }
                    return;
                }

                const nextRound = battle.round + 1;
                battle.round = nextRound;
                battle.phase = 'reaction_roll';
                battle.log.push({ key: 'log.info.endOfRound', params: { round: battle.round - 1 } }, { key: 'log.info.prepareForRound', params: { round: nextRound } });
                battle.reactionRolls = {};
                battle.reactionRerollsUsed = false;
                battle.activeParticipantId = null;
                battle.currentTurnIndex = 0;
                battle.quickActionOrder = [];
                battle.slowActionOrder = [];
                battle.enemyTurnOrder = battle.participants.filter(p => p.type === 'enemy' && p.status !== 'casualty').map(e => e.id);
                battle.enemiesLostThisRound = 0;
                battle.participants.forEach(p => {
                    p.activeEffects = p.activeEffects.map(e => ({ ...e, duration: e.duration - 1 })).filter(e => e.duration !== 0);
                    if (p.status === 'dazed') p.status = 'active';
                    p.actionsRemaining = p.status === 'stunned' ? 1 : (p.status === 'active' ? 2 : 0);
                    p.actionsTaken = { move: false, combat: false, dash: false, interact: false };
                    p.consumablesUsedThisTurn = 0;
                    p.combatActionsTaken = 0;
                });
                break;
        }
    }
};

export const processAction = (battle: Battle, action: PlayerAction, multiplayerRole: MultiplayerRole | null): { success: boolean; logs: LogEntry[] } => {
    const middlewares: ActionMiddleware[] = [
        errorHandlingMiddleware,
        validationMiddleware,
        coreResolverMiddleware,
        missionStatusMiddleware,
    ];

    const context: MiddlewareContext = {
        battle,
        action,
        multiplayerRole,
        logEntries: [],
        success: true,
    };

    let index = -1;
    const dispatch = (i: number) => {
        if (i <= index) return;
        index = i;
        const middleware = middlewares[i];
        if (middleware) {
            middleware(context, () => dispatch(i + 1));
        }
    };

    dispatch(0);
    
    return { success: context.success, logs: context.logEntries };
};

export const applyEnemyAction = (battle: Battle, enemyId: string, actionPlan: AIActionPlan, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const logs = applyEnemyActionDomain(battle, enemyId, actionPlan, multiplayerRole);
    
    const { logs: missionLogs } = checkMissionStatus(battle, 'after_action');
    logs.push(...missionLogs);

    return logs;
};
