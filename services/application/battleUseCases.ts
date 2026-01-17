import { Battle, Crew, PlayerAction, MultiplayerRole, AIActionPlan, AnimationState, MissionType, MissionModifiers, Difficulty, Campaign, NotableSightResult, LogEntry, BattleParticipant, TerrainTheme } from '../../types';
import { BattleDomain } from '../domain/battleDomain';
import { setupBattle as setupBattleDomain, setupMultiplayerBattle as setupMultiplayerBattleDomain } from './battleSetup';
import { processAction as processActionDomain, advancePhaseActionResolver, applyEnemyAction as applyEnemyActionDomain } from './actionProcessor';
import { getEnemyAIAction } from '../aiLogic';
import { rollD100, rollD6 } from '../utils/rolls';
import { NOTABLE_SIGHTS_TABLE } from '../../constants/notableSights';
import { getRandomPosition } from '../gridUtils';
import { EnemyEncounterCategory } from '@/constants/enemyEncounters';

export class BattleUseCases {
    constructor(private battleDomain: BattleDomain) {}

    async startNewBattle(options: {
        crew: Crew,
        difficulty: Difficulty,
        missionType?: MissionType,
        battleType?: 'patron' | 'rival' | 'quest' | 'opportunity' | 'invasion',
        campaign?: Campaign,
        enemyCountModifier?: number,
        hasVip?: boolean,
        isOutOfSequence?: boolean,
        sourceTravelEventId?: 'raided',
        enemyFaction?: string,
        forceEnemyCategory?: EnemyEncounterCategory;
        customEnemyCount?: number;
        forceTerrainTheme?: TerrainTheme;
    }): Promise<Battle> {
        const { crew, difficulty, missionType, battleType = 'opportunity', campaign, ...restOptions } = options;
        return setupBattleDomain(crew, difficulty, missionType, battleType, campaign, restOptions);
    }
    
    async startMultiplayerBattle(hostCrew: Crew, guestCrew: Crew): Promise<Battle> {
        return setupMultiplayerBattleDomain(hostCrew, guestCrew);
    }
    
    processPlayerAction(battle: Battle, action: PlayerAction, multiplayerRole: MultiplayerRole | null): { logs: any[] } {
        const { logs } = processActionDomain(battle, action, multiplayerRole);
        return { logs };
    }
    
    advancePhase(battle: Battle, multiplayerRole: MultiplayerRole | null): void {
        advancePhaseActionResolver(battle, multiplayerRole);
    }

    processEnemyTurn(battle: Battle, enemyId: string, multiplayerRole: MultiplayerRole | null): { updatedBattle: Battle, animation: AnimationState, duration: number } {
        const updatedBattle = JSON.parse(JSON.stringify(battle));
        const enemy = updatedBattle.participants.find(p => p.id === enemyId);

        if (!enemy || (enemy.status !== 'active' && enemy.status !== 'stunned')) {
            return { updatedBattle, animation: null, duration: 0 };
        }
          
        const isStunned = enemy.status === 'stunned';
        const actionPlan = getEnemyAIAction(enemy, updatedBattle, isStunned);
        
        let animation: AnimationState = null;
        if (actionPlan.type === 'move') {
            animation = { type: 'move', path: actionPlan.path, id: `anim_${Date.now()}` };
        } else if (actionPlan.type === 'shoot') {
            const target = updatedBattle.participants.find(p => p.id === actionPlan.targetId);
            if (target) {
                animation = { type: 'shoot', from: enemy.position, to: target.position, id: `anim_${Date.now()}` };
            }
        }

        const logs = applyEnemyActionDomain(updatedBattle, enemyId, actionPlan, multiplayerRole);
        updatedBattle.log.push(...logs);

        let duration = 0;
        if (animation?.type === 'move') duration = 1000;
        if (animation?.type === 'shoot') duration = 400;

        return { updatedBattle, animation, duration };
    }

    resolveNotableSight(battle: Battle): { notableSight: NotableSightResult, logs: LogEntry[], updatedParticipants?: BattleParticipant[] } {
        const logs: LogEntry[] = [];
        let updatedParticipants: BattleParticipant[] | undefined;

        if (battle.battleType === 'invasion') {
            return { notableSight: { id: 'nothing', present: false, descriptionKey: 'preBattleBriefing.sights.nothing', roll: 0 }, logs };
        }

        const roll = rollD100();
        const battleType = battle.battleType || 'opportunity';
        
        const resultEntry = NOTABLE_SIGHTS_TABLE.find(entry => {
            const range = entry.ranges[battleType];
            return roll >= range[0] && roll <= range[1];
        });

        if (!resultEntry) {
            return { notableSight: { id: 'nothing', present: false, descriptionKey: 'preBattleBriefing.sights.nothing', roll }, logs };
        }

        const notableSight: NotableSightResult = {
            present: resultEntry.id !== 'nothing',
            descriptionKey: `preBattleBriefing.sights.${resultEntry.id}`,
            id: resultEntry.id,
            roll,
        };

        if (notableSight.present) {
            const center = { x: Math.floor(battle.gridSize.width / 2), y: Math.floor(battle.gridSize.height / 2) };
            const distance = rollD6() + rollD6() + 2;
            notableSight.position = getRandomPosition(battle.gridSize, battle.participants, battle.terrain); // Simplified for now
        }

        switch (resultEntry.id) {
            case 'priority_target': {
                const enemies = battle.participants.filter(p => p.type === 'enemy');
                if (enemies.length > 0) {
                    const originalTarget = enemies[Math.floor(Math.random() * enemies.length)];
                    const target = JSON.parse(JSON.stringify(originalTarget));
                    target.stats.toughness += 1;
                    notableSight.targetEnemyId = target.id;
                    logs.push({ key: 'log.info.priorityTargetSelected', params: { name: target.name } });
                    updatedParticipants = [target];
                }
                break;
            }
        }
        
        return { notableSight, logs, updatedParticipants };
    }
}