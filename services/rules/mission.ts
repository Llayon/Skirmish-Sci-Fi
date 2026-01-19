import { Battle, BattleParticipant, LogEntry, MissionType } from '../../types';
import { distance } from '../gridUtils';
import { rollD6 } from '../utils/rolls';

export function checkMissionStatus(battle: Battle, context: 'after_action' | 'end_of_round'): { battle: Battle, logs: LogEntry[] } {
    const { mission, gridSize } = battle;
    let logs: LogEntry[] = [];
    
    if (mission.status !== 'in_progress') {
        return { battle, logs };
    }

    // --- Core Win/Loss Conditions (Checked Every Time) ---
    let playersAlive: boolean;
    if (mission.type === 'Protect' && mission.vipId) {
         playersAlive = battle.participants.some(p => p.type === 'character' && p.id !== mission.vipId && p.status !== 'casualty');
    } else {
         playersAlive = battle.participants.some(p => p.type === 'character' && p.status !== 'casualty');
    }
    const enemiesAlive = battle.participants.some(p => p.type === 'enemy' && p.status !== 'casualty');

    if (!playersAlive) {
        mission.status = 'failure';
        logs.push({ key: 'log.mission.wipe.failure' });
        battle.phase = 'battle_over';
        return { battle, logs };
    }
    
    if (!enemiesAlive) {
        const eliminationWinTypes: MissionType[] = ['Defend', 'FightOff'];
        if (eliminationWinTypes.includes(mission.type)) {
            mission.status = 'success';
            logs.push({ key: 'log.mission.wipe.success' });
            battle.phase = 'battle_over';
            return { battle, logs };
        }
    }

    // Check for item destruction first, as it's an instant failure.
    if ((mission.type === 'Acquire' || mission.type === 'Deliver') && mission.itemDestroyed) {
        mission.status = 'failure';
        battle.phase = 'battle_over';
        return { battle, logs };
    }

    // Check mission-specific success conditions that can happen mid-round
    if (context === 'after_action') {
        // Check for VIP casualty in Protect mission.
        if (mission.type === 'Protect' && mission.vipId) {
            const vip = battle.participants.find(p => p.id === mission.vipId);
            if (vip && vip.status === 'casualty') {
                mission.status = 'failure';
                logs.push({ key: 'log.mission.protect.failure' });
            }
        }
        
        switch (mission.type) {
            case 'Acquire':
                if (!gridSize) break;
                const carrier = battle.participants.find(p => p.id === mission.itemCarrierId);
                if (carrier && (carrier.position.x === 0 || carrier.position.x === gridSize.width - 1 || carrier.position.y === 0 || carrier.position.y === gridSize.height - 1)) {
                    mission.status = 'success';
                    logs.push({ key: 'log.mission.acquire.escaped', params: { name: carrier.name } });
                }
                break;
            case 'Deliver':
                if (mission.packageDelivered) {
                    mission.status = 'success';
                }
                break;
            case 'Eliminate':
                const target = battle.participants.find(p => p.id === mission.targetEnemyId);
                if (!target || target.status === 'casualty') {
                    mission.status = 'success';
                    logs.push({ key: 'log.mission.eliminate.success' });
                }
                break;
            case 'MoveThrough':
                const exitedThisAction = battle.participants.filter(p => p.type === 'character' && p.status !== 'casualty' && (p.position.y === 0));
                if (exitedThisAction.length > 0) {
                     mission.crewMembersExited = (mission.crewMembersExited || 0) + exitedThisAction.length;
                     exitedThisAction.forEach(p => p.status = 'casualty'); // Effectively remove them from play
                     logs.push({ key: 'log.mission.move_through.escaped', params: { count: exitedThisAction.length } });
                     if (mission.crewMembersExited >= 2) {
                         mission.status = 'success';
                     }
                }
                break;
            case 'Patrol':
                if (mission.patrolPoints?.every(p => p.visited)) {
                    mission.status = 'success';
                    logs.push({ key: 'log.mission.patrol.success' });
                }
                break;
        }
    }
    
    // Check mission-specific success/failure conditions that happen at the end of a round
    if (context === 'end_of_round' && mission.status === 'in_progress') {
        // Round Limit Checks (Round 6)
        if (battle.round >= 6) {
            const timeLimitedSuccess: MissionType[] = ['Defend', 'FightOff'];
            const timeLimitedFailure: MissionType[] = ['Acquire', 'Deliver', 'MoveThrough', 'Patrol', 'Protect', 'Secure', 'Access'];

            if (timeLimitedSuccess.includes(mission.type)) {
                mission.status = 'success';
                logs.push({ key: 'log.mission.timeout.success', params: { type: mission.type } });
            } else if (timeLimitedFailure.includes(mission.type)) {
                mission.status = 'failure';
                logs.push({ key: 'log.mission.timeout.failure', params: { type: mission.type } });
            }
        }

        if (mission.status === 'in_progress') {
            switch (mission.type) {
                case 'Eliminate':
                    if(mission.eliminateTargetCanEscape) {
                        const target = battle.participants.find(p => p.id === mission.targetEnemyId);
                        if (target && target.status !== 'casualty') {
                            mission.status = 'failure';
                            logs.push({ key: 'log.mission.eliminate.escaped' });
                        }
                    }
                    break;
                case 'Protect':
                case 'Secure': {
                    if (!gridSize) return { battle, logs };
                    const center = { x: Math.floor(gridSize.width / 2), y: Math.floor(gridSize.height / 2) };

                    if (mission.type === 'Protect') {
                        const vip = battle.participants.find(p => p.id === mission.vipId);
                        if (vip && mission.vipTurnStartInZone && distance(vip.position, center) <= 3) {
                            mission.status = 'success';
                            logs.push({ key: 'log.mission.protect.success' });
                        }
                    } else {
                        const crewInZone = battle.participants.some(p => p.type === 'character' && p.status !== 'casualty' && distance(p.position, center) <= 2);
                        const enemiesNear = battle.participants.some(p => p.type === 'enemy' && p.status !== 'casualty' && battle.participants.some(c => c.type === 'character' && distance(c.position, p.position) <= 6));
                        
                        if (crewInZone && !enemiesNear) {
                            mission.secureRoundsCompleted = (mission.secureRoundsCompleted || 0) + 1;
                            logs.push({ key: 'log.mission.secure.progress', params: { current: mission.secureRoundsCompleted, total: 2 } });
                            if (mission.secureRoundsCompleted >= 2) {
                                mission.status = 'success';
                            }
                        } else {
                            if (mission.secureRoundsCompleted > 0) {
                                logs.push({ key: 'log.mission.secure.reset' });
                            }
                            mission.secureRoundsCompleted = 0;
                        }
                    }
                    break;
                }
            }
        }
    }
    
    if (mission.status === 'success' || mission.status === 'failure') {
        battle.phase = 'battle_over';
    }

    return { battle, logs };
}
