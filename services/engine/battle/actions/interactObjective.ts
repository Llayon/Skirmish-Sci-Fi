import { EngineBattleState, BattleEvent, EngineLogEntry, EngineDeps } from '../types';
import type { Position } from '@/types/character';

const chebyshevDistance = (a: Position, b: Position): number => {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

export function interactObjective(
    state: EngineBattleState,
    action: { type: 'INTERACT_OBJECTIVE'; participantId: string; objectiveId: string },
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle, rng } = state;
    const { participantId, objectiveId } = action;

    const log: EngineLogEntry[] = [];
    let currentRng = rng;

    // 1. Validate Participant
    const participantIndex = battle.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) throw new Error(`Participant ${participantId} not found`);
    const participant = battle.participants[participantIndex];

    if (participant.status === 'casualty') throw new Error(`Casualty ${participantId} cannot interact`);
    if (participant.actionsRemaining <= 0) throw new Error(`Participant ${participantId} has no actions remaining`);

    // 2. Validate Objective / Mission
    const mission = battle.mission;
    const objectivePos = mission.objectivePosition;

    // 3. Logic based on Mission Type (Vertical Slice: Access only)
    if (mission.type === 'Patrol') {
        const patrolPoints = mission.patrolPoints;
        const terrain = battle.terrain.find(t => t.id === objectiveId);

        // Validation
        if (!patrolPoints || !terrain) {
             return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'invalid_objective' 
                    }
                ], 
                log 
            };
        }

        const pointIndex = patrolPoints.findIndex(p => p.id === objectiveId);
        if (pointIndex === -1) {
             // Objective ID refers to terrain, but is it a patrol point?
             // The prompt implies checking "id" matches.
              return { 
                 next: state, 
                 events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'invalid_objective' 
                    }
                 ], 
                 log 
             };
        }

        const terrainCenter = { 
            x: terrain.position.x + Math.floor(terrain.size.width / 2), 
            y: terrain.position.y + Math.floor(terrain.size.height / 2), 
        };
        const dist = chebyshevDistance(participant.position, terrainCenter);
        
        // Check range (UI uses <= 2)
        if (dist > 2) {
             return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'out_of_range' 
                    }
                ], 
                log 
            };
        }

        const point = patrolPoints[pointIndex];
        if (point.visited) {
             return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'invalid_objective' 
                    }
                ], 
                log 
            };
        }

        // Success Logic
        const events: BattleEvent[] = [
            { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId }
        ];

        log.push({ key: 'log.mission.patrol.scanned' });

        const nextMission = { ...mission };
        const nextPoints = [...patrolPoints];
        nextPoints[pointIndex] = { ...point, visited: true };
        nextMission.patrolPoints = nextPoints;

        // Check completion
        if (nextPoints.every(p => p.visited)) {
            nextMission.status = 'success';
            log.push({ key: 'log.mission.success' });
        }

        // Update Participant
        const nextParticipant = { ...participant };
        nextParticipant.actionsRemaining = Math.max(0, participant.actionsRemaining - 1);
        
        const currentActions = participant.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
        nextParticipant.actionsTaken = { ...currentActions, interact: true };
        
        if (nextParticipant.actionsRemaining <= 0) {
            nextParticipant.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }

        const nextParticipants = [...battle.participants];
        nextParticipants[participantIndex] = nextParticipant;

        events.push({ 
            type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
            participantId, 
            objectiveId, 
            success: true
        });

        return {
            next: {
                schemaVersion: state.schemaVersion,
                battle: {
                    ...battle,
                    participants: nextParticipants,
                    mission: nextMission
                },
                rng: currentRng
            },
            events,
            log
        };
    }

    if (mission.type === 'Access') {
        if (!objectivePos) {
             return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'invalid_objective' 
                    }
                ], 
                log 
            };
        }

        const events: BattleEvent[] = [
            { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId }
        ];
        
        // Distance Check (vertical slice: must be on the objective)
        const dist = chebyshevDistance(participant.position, objectivePos);
        const maxDist = 0;

        if (dist > maxDist) {
             events.push({ 
                type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                participantId, 
                objectiveId, 
                success: false, 
                reason: 'out_of_range' 
            });
            return { next: state, events, log };
        }

        // Valid Interaction - Process Cost
        log.push({ key: 'log.mission.access.attempt', params: { name: participant.name } });

        // RNG Roll
        const rollResult = deps.rng.d6(currentRng);
        currentRng = rollResult.next;
        const roll = rollResult.value;

        // Calculate Stats
        const savvy = participant.type === 'character' ? participant.stats.savvy : 0;
        // Note: BattleDomain.calculateEffectiveStats logic is complex (implants, injuries, etc).
        // For vertical slice/parity, we assume base stats or implement simplified lookup if needed.
        // V1 uses BattleDomain.calculateEffectiveStats. 
        // Engine V2 constraint: "pure". We can't import BattleDomain if it has side effects, 
        // but checking effective stats usually requires traversing effects.
        // For now, let's use raw stats + basic effect logic if present, or just raw stats for the slice.
        // User constraints say: "Engine V2 НЕ должен импортировать V1 mission logic."
        // But referencing BattleDomain for pure stat calc might be allowed? 
        // "В services/engine/** запрещены внешние импорты из v1/domain" -> usually implies NO BattleDomain.
        // I will use raw stats.savvy for now. If parity fails due to effects, I'll add local helper.
        
        const bonus = savvy;
        const total = roll + bonus;
        
        log.push({ key: 'log.mission.access.roll', params: { roll, bonus, total } });

        const success = total >= 6;
        const nextMission = { ...mission };
        
        if (success) {
            log.push({ key: 'log.mission.access.success' });
            nextMission.status = 'success';
        } else {
            log.push({ key: 'log.mission.access.failure' });
            // Lockout logic (parity)
            if (roll === 1) {
                if (nextMission.accessFirstNat1) {
                    log.push({ key: 'log.mission.access.lockout' });
                    nextMission.status = 'failure';
                } else {
                    log.push({ key: 'log.mission.access.hardened' });
                    nextMission.accessFirstNat1 = true;
                }
            }
        }

        // Update Participant
        const nextParticipant = { ...participant };
        nextParticipant.actionsRemaining = Math.max(0, participant.actionsRemaining - 1);
        
        const currentActions = participant.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
        nextParticipant.actionsTaken = { ...currentActions, interact: true };
        
        if (nextParticipant.actionsRemaining <= 0) {
            nextParticipant.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }

        const nextParticipants = [...battle.participants];
        nextParticipants[participantIndex] = nextParticipant;

        events.push({ 
            type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
            participantId, 
            objectiveId, 
            success, 
            roll 
        });

        return {
            next: {
                schemaVersion: state.schemaVersion,
                battle: {
                    ...battle,
                    participants: nextParticipants,
                    mission: nextMission
                },
                rng: currentRng
            },
            events,
            log
        };
    }

    if (mission.type === 'Acquire') {
        const itemPos = mission.itemPosition;
        const dist = itemPos ? chebyshevDistance(participant.position, itemPos) : -1;
        
        // Check for existence and range
        if (!itemPos || dist > 1) {
            // Divergence: V1 consumes AP for nothing. V2 is state No-Op but emits events for observability.
            return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: !itemPos ? 'invalid_objective' : 'out_of_range' 
                    }
                ], 
                log 
            };
        }

        const events: BattleEvent[] = [
            { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId }
        ];

        log.push({ key: 'log.mission.acquire.pickup', params: { name: participant.name } });

        const nextMission = { ...mission };
        nextMission.itemCarrierId = participantId;
        nextMission.itemPosition = null;

        // Update Participant
        const nextParticipant = { ...participant };
        nextParticipant.actionsRemaining = Math.max(0, participant.actionsRemaining - 1);
        
        const currentActions = participant.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
        nextParticipant.actionsTaken = { ...currentActions, interact: true };
        
        if (nextParticipant.actionsRemaining <= 0) {
            nextParticipant.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }

        const nextParticipants = [...battle.participants];
        nextParticipants[participantIndex] = nextParticipant;

        events.push({ 
            type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
            participantId, 
            objectiveId, 
            success: true
        });

        return {
            next: {
                schemaVersion: state.schemaVersion,
                battle: {
                    ...battle,
                    participants: nextParticipants,
                    mission: nextMission
                },
                rng: currentRng
            },
            events,
            log
        };
    }

    if (mission.type === 'Deliver') {
        const itemPos = mission.itemPosition;
        const objectivePos = mission.objectivePosition;
        let performedAction = false;
        
        // Prepare mutable next state containers
        let nextMission = { ...mission };
        let nextParticipant = { ...participant };
        
        // 1. Try Pickup (Acquire Logic)
        if (itemPos && chebyshevDistance(participant.position, itemPos) <= 1) {
            nextMission.itemCarrierId = participantId;
            nextMission.itemPosition = null;
            log.push({ key: 'log.mission.acquire.pickup', params: { name: participant.name } });
            performedAction = true;
        } 
        // 2. Try Deliver (Deliver Logic)
        else if (mission.itemCarrierId === participantId && objectivePos && chebyshevDistance(participant.position, objectivePos) === 0) {
            nextMission.packageDelivered = true;
            nextMission.itemCarrierId = null;
            nextMission.status = 'success';
            log.push({ key: 'log.mission.deliver.placed', params: { name: participant.name } });
            performedAction = true;
        }

        if (performedAction) {
            const events: BattleEvent[] = [
                { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId }
            ];

            // Update Participant
            nextParticipant.actionsRemaining = Math.max(0, participant.actionsRemaining - 1);
            
            const currentActions = participant.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
            nextParticipant.actionsTaken = { ...currentActions, interact: true };
            
            if (nextParticipant.actionsRemaining <= 0) {
                nextParticipant.actionsTaken = { move: true, combat: true, dash: true, interact: true };
            }

            const nextParticipants = [...battle.participants];
            nextParticipants[participantIndex] = nextParticipant;

            events.push({ 
                type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                participantId, 
                objectiveId, 
                success: true
            });

            return {
                next: {
                    schemaVersion: state.schemaVersion,
                    battle: {
                        ...battle,
                        participants: nextParticipants,
                        mission: nextMission
                    },
                    rng: currentRng
                },
                events,
                log
            };
        } else {
             // Divergence: V1 consumes AP, V2 is No-Op with event
             return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'out_of_range' 
                    }
                ], 
                log 
            };
        }
    }

    if (mission.type === 'Search') {
        if (!objectivePos) {
             return { 
                next: state, 
                events: [{ 
                    type: 'OBJECTIVE_INTERACT_RESOLVED', 
                    participantId, 
                    objectiveId, 
                    success: false, 
                    reason: 'invalid_objective' 
                }], 
                log 
            };
        }

        const searchRadius = mission.searchRadius ?? 1; // Default fallback if undefined (parity safe?)
        const dist = chebyshevDistance(participant.position, objectivePos);

        if (dist > searchRadius) {
             // For Search, we emit DECLARED then RESOLVED failure
             const events: BattleEvent[] = [
                { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                { 
                    type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                    participantId, 
                    objectiveId, 
                    success: false, 
                    reason: 'out_of_range' 
                }
            ];
            return { next: state, events, log };
        }

        // Check if position already searched
        // V1 behavior: Consumes AP, no roll, no duplicate (based on exploratory test)
        // V2 behavior: No-op (no AP cost, no event) - Improvement
        const currentPos = participant.position;
        const alreadySearched = mission.searchedPositions?.some(p => p.x === currentPos.x && p.y === currentPos.y);

        if (alreadySearched) {
            // Divergence: V1 consumes AP, V2 does nothing (safe no-op)
            // But we emit events for observability as per tests
            return { 
                next: state, 
                events: [
                    { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
                    { 
                        type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                        participantId, 
                        objectiveId, 
                        success: false, 
                        reason: 'already_searched' 
                    }
                ], 
                log 
            };
        }

        // Happy Path: Not searched yet
        const events: BattleEvent[] = [
            { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId }
        ];
        
        const nextMission = { ...mission };
        nextMission.searchedPositions = [...(mission.searchedPositions || []), { ...participant.position }];
        
        log.push({ key: 'log.mission.search.attemptPosition', params: { name: participant.name } });

        // RNG
        const rollResult = deps.rng.d6(currentRng);
        currentRng = rollResult.next;
        const roll = rollResult.value;

        // Stats
        const savvy = participant.type === 'character' ? participant.stats.savvy : 0;
        const total = roll + savvy;

        const success = total >= 5;

        if (success) {
            log.push({ key: 'log.mission.search.success' });
            nextMission.status = 'success';
        } else {
            log.push({ key: 'log.mission.search.failurePosition' });
            // Check for total failure
            // Logic: count cells in radius. If all searched, fail mission.
            // V1 logic:
            let totalCellsInZone = 0;
            for (let y = objectivePos.y - searchRadius; y <= objectivePos.y + searchRadius; y++) {
                for (let x = objectivePos.x - searchRadius; x <= objectivePos.x + searchRadius; x++) {
                    if (chebyshevDistance({x,y}, objectivePos) <= searchRadius) {
                        totalCellsInZone++;
                    }
                }
            }
            if (nextMission.searchedPositions.length >= totalCellsInZone) {
                log.push({ key: 'log.mission.search.all_searched' });
                nextMission.status = 'failure';
            }
        }

        // Update Participant (Common logic, maybe refactor later?)
        const nextParticipant = { ...participant };
        nextParticipant.actionsRemaining = Math.max(0, participant.actionsRemaining - 1);
        
        const currentActions = participant.actionsTaken ?? { move: false, combat: false, dash: false, interact: false };
        nextParticipant.actionsTaken = { ...currentActions, interact: true };
        
        if (nextParticipant.actionsRemaining <= 0) {
            nextParticipant.actionsTaken = { move: true, combat: true, dash: true, interact: true };
        }

        const nextParticipants = [...battle.participants];
        nextParticipants[participantIndex] = nextParticipant;

        events.push({ 
            type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
            participantId, 
            objectiveId, 
            success, 
            roll 
        });

        return {
            next: {
                schemaVersion: state.schemaVersion,
                battle: {
                    ...battle,
                    participants: nextParticipants,
                    mission: nextMission
                },
                rng: currentRng
            },
            events,
            log
        };
    }

    // Fallback for unsupported mission types in this slice
    return { 
        next: state, 
        events: [
            { type: 'OBJECTIVE_INTERACT_DECLARED' as const, participantId, objectiveId },
            { 
                type: 'OBJECTIVE_INTERACT_RESOLVED' as const, 
                participantId, 
                objectiveId, 
                success: false, 
                reason: 'invalid_objective' 
            }
        ], 
        log 
    };
}
