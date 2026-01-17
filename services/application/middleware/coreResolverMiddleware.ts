import { Battle, LogEntry, PlayerAction, MultiplayerRole, Weapon, AIActionPlan } from '../../../types';
import { getWeaponById, getConsumableById } from '../../data/items';
import { resolveBrawling } from '../../rules/brawling';
import { resolveShooting } from '../../rules/shooting';
import { distance } from '../../gridUtils';
import { BattleDomain } from '@/services/domain/battleDomain';
import { rollD6 } from '../../utils/rolls';
import { checkMissionStatus } from '../../rules/mission';
import { advancePhaseActionResolver } from '../actionProcessor';
import type { ActionMiddleware } from './types';


const resolveMoveAction = (battle: Battle, action: Extract<PlayerAction, { type: 'move' }>): LogEntry[] => {
    let tempLog: LogEntry[] = [];
    let charToUpdate = battle.participants.find(p => p.id === action.payload.characterId);
    
    if (!charToUpdate) return [];

    const terrifyingEffect = charToUpdate.activeEffects.find(e => e.sourceId === 'terrifying');
    const isFlee = terrifyingEffect;

    charToUpdate.position = action.payload.position;
    charToUpdate.actionsTaken.move = true;
    
    if (action.payload.isDash) {
        charToUpdate.actionsTaken.dash = true;
        charToUpdate.actionsRemaining = 0; // A Dash consumes the entire turn.
    } else if (charToUpdate.status === 'stunned' || isFlee) {
        charToUpdate.actionsRemaining = 0; // A stunned character or one fleeing only gets one action.
    } else {
        charToUpdate.actionsRemaining--; // A regular move costs one action.
    }

    if (isFlee) {
        charToUpdate.activeEffects = charToUpdate.activeEffects.filter(e => e.sourceId !== 'terrifying');
        tempLog.push({ key: 'log.playerPhase.fleeAndRecover', params: { name: charToUpdate.name! } });
    } else {
        tempLog.push({ key: action.payload.isDash ? 'log.playerPhase.dashes' : 'log.playerPhase.moves', params: { name: charToUpdate.name! } });
    }
    
    if (charToUpdate.actionsRemaining <= 0) {
        charToUpdate.actionsTaken = { move: true, combat: true, dash: true, interact: true };
    }
    
    return tempLog;
};

const resolveTeleportAction = (battle: Battle, action: Extract<PlayerAction, { type: 'teleport' }>): LogEntry[] => {
    let tempLog: LogEntry[] = [];
    let charToUpdate = battle.participants.find(p => p.id === action.payload.characterId);
    
    if (!charToUpdate) return [];

    charToUpdate.position = action.payload.position;
    charToUpdate.actionsTaken.move = true; // Teleport counts as a move action
    charToUpdate.actionsRemaining--;

    tempLog.push({ key: 'log.playerPhase.teleports', params: { name: charToUpdate.name! } });
    
    if (charToUpdate.actionsRemaining <= 0) {
        charToUpdate.actionsTaken = { move: true, combat: true, dash: true, interact: true };
    }
    
    return tempLog;
};


const resolveFollowUpMoveAction = (battle: Battle, action: Extract<PlayerAction, { type: 'follow_up_move' }>): LogEntry[] => {
    const charToUpdate = battle.participants.find(p => p.id === action.payload.characterId);

    if (!charToUpdate) return [];

    charToUpdate.position = action.payload.position;
    battle.followUpState = null;
    
    return [{ key: 'log.playerPhase.followsUp', params: { name: charToUpdate.name! } }];
};

const resolveShootAction = (battle: Battle, action: Extract<PlayerAction, { type: 'shoot' }>, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const attacker = battle.participants.find(p => p.id === action.payload.characterId);
    const target = battle.participants.find(p => p.id === action.payload.targetId);
    
    if (!attacker || !target) return [];

    const weapon = BattleDomain.getEffectiveWeapon(attacker, action.payload.weaponInstanceId);
    if (!weapon) return [];
    
    const resultLog = resolveShooting(attacker, target, weapon, battle, action.payload.isAimed, false, multiplayerRole);
    
    const shooter = battle.participants.find(p => p.id === attacker.id);
    if (shooter) {
        if (shooter.status === 'casualty') {
            return resultLog;
        }

        const actionCost = action.payload.isAimed ? 2 : 1;
        shooter.actionsRemaining = shooter.status === 'stunned' ? 0 : shooter.actionsRemaining - actionCost;
        if (shooter.actionsRemaining < 0) shooter.actionsRemaining = 0;
        
        shooter.actionsTaken.combat = true;
        shooter.combatActionsTaken = (shooter.combatActionsTaken || 0) + 1;

        if (shooter.actionsRemaining <= 0) {
            shooter.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }
        shooter.lastTargetId = action.payload.targetId;
    }

    return resultLog;
};

const resolveBrawlAction = (battle: Battle, action: Extract<PlayerAction, { type: 'brawl' }>, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const attacker = battle.participants.find(p => p.id === action.payload.characterId);
    const target = battle.participants.find(p => p.id === action.payload.targetId);

    if (!attacker || !target) return [];

    const brawlLog = resolveBrawling(attacker, target, action.payload.weaponInstanceId, battle, multiplayerRole);
    
    const brawler = battle.participants.find(p => p.id === attacker.id);
    if (brawler) {
        if (brawler.status === 'casualty') {
            return brawlLog;
        }

        brawler.actionsRemaining = brawler.status === 'stunned' ? 0 : brawler.actionsRemaining - 1;
        brawler.actionsTaken.combat = true;
        brawler.combatActionsTaken = (brawler.combatActionsTaken || 0) + 1;

        if (brawler.actionsRemaining <= 0) {
            brawler.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }
    }

    return brawlLog;
};

const resolveUseConsumableAction = (battle: Battle, action: Extract<PlayerAction, { type: 'use_consumable' }>, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const consumable = getConsumableById(action.payload.consumableId);
    if (!consumable) return [];
    
    let tempLog: LogEntry[] = [{ key: 'log.playerPhase.usesConsumable', params: { name: '', consumable: action.payload.consumableId } }];
    let user = battle.participants.find(p => p.id === action.payload.characterId);
    
    if (!user || user.type !== 'character') return [];
    
    tempLog[0].params!.name = user.name;
    
    const consumableIndex = user.consumables.indexOf(action.payload.consumableId);
    if (consumableIndex === -1) return [];
    user.consumables.splice(consumableIndex, 1);
    
    switch(consumable.id) {
        case 'booster_pills':
            user.status = 'active';
            user.stunTokens = 0;
            user.activeEffects.push({ sourceId: 'booster_pills', sourceName: 'Booster Pills', duration: 1, statModifiers: { speed: user.stats.speed } });
            tempLog.push({ key: 'log.playerPhase.boosterPillsEffect' });
            break;
        case 'combat_serum':
            user.activeEffects.push({ sourceId: 'combat_serum', sourceName: 'Combat Serum', duration: -1, statModifiers: { reactions: 2, speed: 2 } });
            tempLog.push({ key: 'log.playerPhase.combatSerumEffect' });
            break;
        case 'rage_out':
            user.activeEffects.push({ sourceId: 'rage_out', sourceName: 'Rage Out', duration: user.raceId === 'kerin' ? -1 : 2, statModifiers: { speed: 2 } });
            tempLog.push({ key: 'log.playerPhase.rageOutEffect' });
            break;
        case 'still':
            user.activeEffects.push({ sourceId: 'still', sourceName: 'Still Stance', duration: 2, preventMovement: true });
            tempLog.push({ key: 'log.playerPhase.stillEffect' });
            break;
        case 'kiranin_crystals':
            const targets = battle.participants.filter(p => {
                const isOpponent = multiplayerRole ? !p.id.startsWith(multiplayerRole) : p.type !== user.type;
                // Rulebook: "does not affect characters that already acted" - proxy this by checking if they still have 2 actions
                return isOpponent && p.status === 'active' && p.actionsRemaining === 2 && distance(user.position, p.position) <= 4;
            });
            if (targets.length > 0) {
                targets.forEach(t => {
                    const targetToUpdate = battle.participants.find(p => p.id === t.id);
                    if (targetToUpdate) {
                       targetToUpdate.status = 'dazed';
                       tempLog.push({ key: 'log.playerPhase.kiraninCrystalsDazed', params: { target: t.name! } });
                    }
                });
            } else {
                tempLog.push({ key: 'log.playerPhase.kiraninCrystalsNoEffect' });
            }
            break;
    }
    
    user.consumablesUsedThisTurn = (user.consumablesUsedThisTurn || 0) + 1;
    if (user.consumablesUsedThisTurn > 1) {
        user.actionsRemaining--;
        user.actionsTaken.combat = true;
        tempLog.push({ key: 'log.playerPhase.consumableCostAction' });

        if (user.actionsRemaining <= 0) {
            user.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }
    } else {
        tempLog.push({ key: 'log.playerPhase.consumableCostFree' });
    }
    
    return tempLog;
};

const resolveInteractAction = (battle: Battle, action: Extract<PlayerAction, { type: 'interact' }>): LogEntry[] => {
    let logs: LogEntry[] = [];
    const interactor = battle.participants.find(p => p.id === action.payload.characterId);
    if (!interactor || interactor.type !== 'character') return [];
    
    const mission = battle.mission;
    const objectivePos = mission.objectivePosition;

    switch(mission.type) {
        case 'Access':
            if (objectivePos) {
                logs.push({ key: 'log.mission.access.attempt', params: { name: interactor.name } });
                const roll = rollD6();
                const isEngineer = interactor.classId === 'engineer';
                const bonus = BattleDomain.calculateEffectiveStats(interactor).savvy + (isEngineer ? 1 : 0);
                const total = roll + bonus;
                logs.push({ key: 'log.mission.access.roll', params: { roll, bonus, total } });
                if (total >= 6) {
                    logs.push({ key: 'log.mission.access.success' });
                    mission.status = 'success';
                } else {
                    logs.push({ key: 'log.mission.access.failure' });
                    if (roll === 1 && !isEngineer) {
                        if (mission.accessFirstNat1) {
                            logs.push({ key: 'log.mission.access.lockout' });
                            mission.status = 'failure';
                        } else {
                            logs.push({ key: 'log.mission.access.hardened' });
                            mission.accessFirstNat1 = true;
                        }
                    }
                }
            }
            break;
        case 'Acquire':
            if (mission.itemPosition && distance(interactor.position, mission.itemPosition) <= 1) {
                mission.itemCarrierId = interactor.id;
                mission.itemPosition = null;
                logs.push({ key: 'log.mission.acquire.pickup', params: { name: interactor.name } });
            }
            break;
        case 'Deliver':
            if (mission.itemPosition && distance(interactor.position, mission.itemPosition) <= 1) {
                mission.itemCarrierId = interactor.id;
                mission.itemPosition = null;
                logs.push({ key: 'log.mission.acquire.pickup', params: { name: interactor.name } });
            } else if (mission.itemCarrierId === interactor.id && objectivePos && distance(interactor.position, objectivePos) === 0) {
                mission.packageDelivered = true;
                mission.itemCarrierId = null;
                logs.push({ key: 'log.mission.deliver.placed', params: { name: interactor.name } });
            }
            break;
        case 'Patrol':
            const pointToVisit = mission.patrolPoints?.find(p => !p.visited && battle.terrain.some(t => t.id === p.id && distance(interactor.position, t.position) <= 2));
            if (pointToVisit) {
                pointToVisit.visited = true;
                const visitedCount = mission.patrolPoints?.filter(p => p.visited).length || 0;
                logs.push({ key: 'log.mission.patrol.scanned', params: { name: interactor.name, current: visitedCount, total: mission.patrolPoints!.length } });
            }
            break;
        case 'Search':
            if (objectivePos && mission.searchRadius && mission.searchedPositions) {
                const searchPosition = interactor.position;
                if (distance(searchPosition, objectivePos) <= mission.searchRadius && !mission.searchedPositions.some(p => p.x === searchPosition.x && p.y === searchPosition.y)) {
                    mission.searchedPositions.push(searchPosition);
                    logs.push({ key: 'log.mission.search.attemptPosition', params: { name: interactor.name } });
                    
                    const savvyRoll = rollD6();
                    const savvyStat = BattleDomain.calculateEffectiveStats(interactor).savvy;
                    
                    if (savvyRoll + savvyStat >= 5) {
                        logs.push({ key: 'log.mission.search.success' });
                        mission.status = 'success';
                    } else {
                        logs.push({ key: 'log.mission.search.failurePosition' });
                        
                        // Check for mission failure if all cells are searched
                        let totalCellsInZone = 0;
                        for (let y = objectivePos.y - mission.searchRadius; y <= objectivePos.y + mission.searchRadius; y++) {
                            for (let x = objectivePos.x - mission.searchRadius; x <= objectivePos.x + mission.searchRadius; x++) {
                                if (distance({x,y}, objectivePos) <= mission.searchRadius) {
                                    totalCellsInZone++;
                                }
                            }
                        }
                        
                        if (mission.searchedPositions.length >= totalCellsInZone) {
                            logs.push({ key: 'log.mission.search.all_searched' });
                            mission.status = 'failure';
                        }
                    }
                }
            }
            break;
    }
    
    interactor.actionsRemaining--;
    interactor.actionsTaken.interact = true;
    if (interactor.actionsRemaining <= 0) {
        interactor.actionsTaken = { move: true, combat: true, dash: true, interact: true };
    }
    
    return logs;
};


const resolveEndTurnAction = (battle: Battle, action: Extract<PlayerAction, { type: 'end_turn' }>, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const charToEnd = battle.participants.find(p => p.id === action.payload.characterId);
    
    if (!charToEnd) return [];
    
    charToEnd.actionsRemaining = 0;
    charToEnd.actionsTaken = { move: true, combat: true, dash: true, interact: true };

    if (charToEnd.status === 'stunned') {
        const newTokens = charToEnd.stunTokens - 1;
        if (newTokens <= 0) {
            charToEnd.status = 'active';
            charToEnd.stunTokens = 0;
        } else {
            charToEnd.stunTokens = newTokens;
        }
    } else if (charToEnd.status === 'dazed') {
        charToEnd.status = 'active';
    }

    const currentPhaseOrder = battle.phase === 'quick_actions' ? battle.quickActionOrder : battle.slowActionOrder;
    
    let nextActiveId: string | null = null;
    let nextIndex = -1;

    // Find the first available participant from the beginning of the order.
    // This is more robust than just checking from the current index onwards.
    for (let i = 0; i < currentPhaseOrder.length; i++) {
        const nextParticipantId = currentPhaseOrder[i];
        const nextParticipant = battle.participants.find(p => p.id === nextParticipantId);
        
        if (nextParticipant && nextParticipant.status !== 'casualty' && nextParticipant.actionsRemaining > 0) {
            nextActiveId = nextParticipant.id;
            nextIndex = i;
            break;
        }
    }
    
    battle.activeParticipantId = nextActiveId;
    battle.currentTurnIndex = nextIndex;

    if (nextActiveId) {
        const nextParticipant = battle.participants.find(p => p.id === nextActiveId)!;
        const nextRole = nextParticipant.id.startsWith('host') ? 'host' : 'guest';
        if (battle.activePlayerRole !== nextRole) {
            battle.activePlayerRole = nextRole;
        }
    } else {
        battle.activePlayerRole = null;
    }

    battle.followUpState = null;

    // If no one is left to act in this phase, automatically advance to the next.
    if (!nextActiveId) {
        advancePhaseActionResolver(battle, multiplayerRole);
    }

    return [];
};

const resolveRollInitiativeAction = (battle: Battle, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const isMultiplayer = !!battle.firstPlayerRole;
    let tempLog: LogEntry[] = [];
    
    let roleToRollFor: MultiplayerRole | undefined;

    if (isMultiplayer) {
        const hostHasRolled = battle.participants.some(p => p.id.startsWith('host') && battle.reactionRolls[p.id]);
        const guestHasRolled = battle.participants.some(p => p.id.startsWith('guest') && battle.reactionRolls[p.id]);

        if (battle.firstPlayerRole === 'host') {
            if (!hostHasRolled) roleToRollFor = 'host';
            else if (!guestHasRolled) roleToRollFor = 'guest';
        } else { // guest is first player
            if (!guestHasRolled) roleToRollFor = 'guest';
            else if (!hostHasRolled) roleToRollFor = 'host';
        }
        
        if (!roleToRollFor) return [];
    }

    const charactersToRoll = battle.participants.filter(p => 
      p.type === 'character' && 
      p.status !== 'casualty' &&
      (!isMultiplayer || p.id.startsWith(roleToRollFor!))
    );

    const caughtOffGuard = battle.deploymentCondition?.id === 'caught_off_guard' && battle.round === 1;
    if (caughtOffGuard) {
        tempLog.push({ key: 'log.deployment.caughtOffGuard' });
    }
    
    if (!isMultiplayer) {
        const diceRolls = charactersToRoll.map(() => rollD6());
        const ones = diceRolls.filter(r => r === 1);
        const ferals = charactersToRoll.filter(c => c.specialAbilities?.includes('feral_reaction_fumble'));
        const feralFumble = ones.length === 1 && ferals.length > 0;

        if (feralFumble) {
            tempLog.push({ key: 'log.info.reactionRolls' });
            const fumbleDie = 1;
            const indexOfOne = diceRolls.indexOf(1);
            const remainingDice = [...diceRolls];
            remainingDice.splice(indexOfOne, 1);
            
            const feralToFumble = ferals[0];
            const remainingChars = charactersToRoll.filter(c => c.id !== feralToFumble.id);

            const feralStats = BattleDomain.calculateEffectiveStats(feralToFumble, 'reaction_roll');
            const feralSuccess = !caughtOffGuard && fumbleDie <= feralStats.reactions;
            battle.reactionRolls[feralToFumble.id] = { roll: fumbleDie, success: feralSuccess };
            tempLog.push({ key: 'log.trait.feralFumble', traitId: 'feral_reaction_fumble', params: { name: feralToFumble.name } });
            tempLog.push({ key: feralSuccess ? 'log.info.reactionSuccess' : 'log.info.reactionFail', params: { name: feralToFumble.name, roll: fumbleDie, reactions: feralStats.reactions } });

            remainingChars.forEach((char, index) => {
                const roll = remainingDice[index];
                const stats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
                const success = !caughtOffGuard && roll <= stats.reactions;
                battle.reactionRolls[char.id] = { roll, success };
                tempLog.push({ key: success ? 'log.info.reactionSuccess' : 'log.info.reactionFail', params: { name: char.name, roll, reactions: stats.reactions } });
            });
        } else {
            tempLog.push({ key: 'log.info.reactionRolls' });
            charactersToRoll.forEach((char, index) => {
                const effectiveStats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
                const roll = diceRolls[index];
                const success = !caughtOffGuard && roll <= effectiveStats.reactions;
                battle.reactionRolls[char.id] = { roll, success };
                tempLog.push({ key: success ? 'log.info.reactionSuccess' : 'log.info.reactionFail', params: { name: char.name, roll, reactions: effectiveStats.reactions } });
            });
        }
    } else {
        tempLog.push({ key: 'log.info.reactionRolls' });
        charactersToRoll.forEach(char => {
            const effectiveStats = BattleDomain.calculateEffectiveStats(char, 'reaction_roll');
            const roll = rollD6();
            const success = !caughtOffGuard && roll <= effectiveStats.reactions;
            battle.reactionRolls[char.id] = { roll, success };
            tempLog.push({ key: success ? 'log.info.reactionSuccess' : 'log.info.reactionFail', params: { name: char.name, roll, reactions: effectiveStats.reactions } });
        });
    }

    if (isMultiplayer) {
        const hostHasRolledNow = battle.participants.some(p => p.id.startsWith('host') && battle.reactionRolls[p.id]);
        const guestHasRolledNow = battle.participants.some(p => p.id.startsWith('guest') && battle.reactionRolls[p.id]);

        if (hostHasRolledNow && guestHasRolledNow) {
            const firstPlayerRole = battle.firstPlayerRole!;
            const secondPlayerRole = firstPlayerRole === 'host' ? 'guest' : 'host';

            const firstPlayerChars = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty' && p.id.startsWith(firstPlayerRole));
            const secondPlayerChars = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty' && p.id.startsWith(secondPlayerRole));

            const firstPlayerSuccesses = firstPlayerChars.filter(p => battle.reactionRolls[p.id]?.success).map(p => p.id);
            const firstPlayerFails = firstPlayerChars.filter(p => !battle.reactionRolls[p.id]?.success).map(p => p.id);
            const secondPlayerSuccesses = secondPlayerChars.filter(p => battle.reactionRolls[p.id]?.success).map(p => p.id);
            const secondPlayerFails = secondPlayerChars.filter(p => !battle.reactionRolls[p.id]?.success).map(p => p.id);

            battle.quickActionOrder = [...firstPlayerSuccesses, ...secondPlayerSuccesses];
            battle.slowActionOrder = [...firstPlayerFails, ...secondPlayerFails];

            // Atomically advance the phase now that the condition is met.
            advancePhaseActionResolver(battle, multiplayerRole);
        }
    } else { // Solo mode
        const allPlayerChars = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty');
        battle.quickActionOrder = allPlayerChars.filter(p => battle.reactionRolls[p.id]?.success).map(p => p.id);
        battle.slowActionOrder = allPlayerChars.filter(p => !battle.reactionRolls[p.id]?.success).map(p => p.id);
    }
      
    return tempLog;
};

export const applyEnemyAction = (battle: Battle, enemyId: string, actionPlan: AIActionPlan, multiplayerRole: MultiplayerRole | null): LogEntry[] => {
    const enemy = battle.participants.find(p => p.id === enemyId);
    if (!enemy) return [];

    let logs: LogEntry[] = [];
    const wasStunned = enemy.status === 'stunned';

    switch(actionPlan.type) {
        case 'move':
            enemy.position = actionPlan.targetPos;
            logs.push({ key: 'log.enemyPhase.moves', params: { name: enemy.name! } });
            break;
        case 'shoot':
            const target = battle.participants.find(p => p.id === actionPlan.targetId);
            const weaponData = getWeaponById(actionPlan.weaponId);
            if (target && weaponData) {
                logs.push(...resolveShooting(enemy, target, weaponData, battle, actionPlan.isAimed, false, multiplayerRole));
                enemy.lastTargetId = actionPlan.targetId;
            }
            break;
        case 'brawl':
            const brawlTarget = battle.participants.find(p => p.id === actionPlan.targetId);
            if (brawlTarget) {
                logs.push(...resolveBrawling(enemy, brawlTarget, actionPlan.weaponId, battle, multiplayerRole));
            }
            break;
        case 'hold':
            if (actionPlan.reason && actionPlan.reason.startsWith('log.')) {
                logs.push({ key: actionPlan.reason, params: { name: enemy.name! } });
            } else {
                logs.push({ key: 'log.enemyPhase.holdsPosition', params: { name: enemy.name! } });
            }
            break;
        case 'interact':
            logs.push({ key: 'log.enemyPhase.interacts', params: { name: enemy.name! } });
            break;
    }
    
    const finalEnemyState = battle.participants.find(p => p.id === enemyId);
    if (finalEnemyState && finalEnemyState.status !== 'casualty') {
        finalEnemyState.actionsRemaining = 0; // AI turn is always over after one action plan.
        if (wasStunned) {
            const newTokens = finalEnemyState.stunTokens - 1;
            if (newTokens <= 0) {
                finalEnemyState.status = 'active';
                finalEnemyState.stunTokens = 0;
            } else {
                finalEnemyState.stunTokens = newTokens;
            }
        }
    }
    
    return logs;
};

export const coreResolverMiddleware: ActionMiddleware = (context, next) => {
    const { battle, action, multiplayerRole, logEntries } = context;
    let logs: LogEntry[] = [];

    switch (action.type) {
        case 'move':
            logs = resolveMoveAction(battle, action); break;
        case 'teleport':
            logs = resolveTeleportAction(battle, action); break;
        case 'follow_up_move':
            logs = resolveFollowUpMoveAction(battle, action); break;
        case 'shoot':
            logs = resolveShootAction(battle, action, multiplayerRole); break;
        case 'brawl':
            logs = resolveBrawlAction(battle, action, multiplayerRole); break;
        case 'use_consumable':
            logs = resolveUseConsumableAction(battle, action, multiplayerRole); break;
        case 'interact':
            logs = resolveInteractAction(battle, action); break;
        case 'end_turn':
            logs = resolveEndTurnAction(battle, action, multiplayerRole); break;
        case 'roll_initiative':
            logs = resolveRollInitiativeAction(battle, multiplayerRole); break;
        case 'advance_phase':
             logs = []; break;
        default:
            logs = [];
    }
    logEntries.push(...logs);
    next();
};