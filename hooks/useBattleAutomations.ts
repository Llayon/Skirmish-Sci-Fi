import React, { useEffect } from 'react';
import { useBattleStore, useMultiplayerStore } from '../stores';
import { shallow } from 'zustand/shallow';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Encapsulates automated battle logic, such as turn progression for solo mode,
 * enemy turn processing, and camera centering on the active participant.
 */
export const useBattleAutomations = (scrollContainerRef: React.RefObject<HTMLDivElement>) => {
    const battle = useBattleStore(state => state.battle);
    const isProcessingEnemies = useBattleStore(state => state.isProcessingEnemies);
    const activeParticipantId = useBattleStore(state => state.battle?.activeParticipantId);
    const selectedParticipantId = useBattleStore(state => state.selectedParticipantId);

    const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);
    const { endTurn, processEnemyTurn, advancePhase, setAnimation, setAnimatingParticipantId, setSelectedParticipantId, setIsProcessingEnemies, setShowEnemyTurnBanner } = useBattleStore(state => state.actions);

    // Automatically end turn when out of actions in solo mode
    useEffect(() => {
        if (!battle || multiplayerRole || (battle.phase !== 'quick_actions' && battle.phase !== 'slow_actions') || !activeParticipantId || isProcessingEnemies) {
            return;
        }

        const activeP = battle.participants.find(p => p.id === activeParticipantId);
        if (activeP && activeP.actionsRemaining <= 0 && !battle.followUpState) {
            const timer = setTimeout(() => {
                const currentBattleState = useBattleStore.getState().battle;
                if (currentBattleState && currentBattleState.activeParticipantId === activeP.id && !currentBattleState.followUpState) {
                    const participantInCurrentState = currentBattleState.participants.find(p => p.id === activeP.id);
                    if (participantInCurrentState && participantInCurrentState.actionsRemaining <= 0) {
                        endTurn(activeP.id);
                    }
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [activeParticipantId, battle, multiplayerRole, isProcessingEnemies, endTurn]);

    // Process enemy turns automatically in solo mode
    useEffect(() => {
        if (battle?.phase === 'enemy_actions' && !multiplayerRole && !isProcessingEnemies) {
            const processTurns = async () => {
                setIsProcessingEnemies(true);
                setShowEnemyTurnBanner(true);
                await sleep(2000);
                setShowEnemyTurnBanner(false);
                
                const enemiesToAct = battle.enemyTurnOrder;
                for (const enemyId of enemiesToAct) {
                    const currentBattleState = useBattleStore.getState().battle;
                    const enemy = currentBattleState?.participants.find(p => p.id === enemyId);
                    if (!currentBattleState || !enemy || enemy.status === 'casualty') continue;
                    
                    setSelectedParticipantId(enemyId);
                    await sleep(500);

                    const { animation, duration } = await processEnemyTurn(enemyId);

                    if (animation) {
                        setAnimatingParticipantId(enemyId);
                        setAnimation(animation);
                        await sleep(duration);
                        setAnimatingParticipantId(null);
                        setAnimation(null);
                    }
                    
                    await sleep(1000);
                }

                setIsProcessingEnemies(false);
                setSelectedParticipantId(null);
                advancePhase();
            };
            processTurns();
        }
    }, [battle?.phase, multiplayerRole, isProcessingEnemies, battle?.enemyTurnOrder, advancePhase, processEnemyTurn, setAnimation, setAnimatingParticipantId, setSelectedParticipantId, setIsProcessingEnemies, setShowEnemyTurnBanner]);

    // Center view on active character or enemy
    useEffect(() => {
        if (!battle || !scrollContainerRef.current) return;

        const { participants, gridSize, phase } = battle;
        let participantToCenterId: string | null = null;

        if (phase === 'quick_actions' || phase === 'slow_actions') {
            participantToCenterId = activeParticipantId;
        } else if (phase === 'enemy_actions' && !multiplayerRole) {
            participantToCenterId = selectedParticipantId;
        }

        if (!participantToCenterId) return;
        const participantToCenter = participants.find(p => p.id === participantToCenterId);
        if (!participantToCenter) return;

        const scrollContainer = scrollContainerRef.current;
        const gridContentElement = scrollContainer.querySelector<HTMLDivElement>('[data-testid="battle-grid-content"]');
        if (!gridContentElement) return;

        const timer = setTimeout(() => {
            const containerRect = scrollContainer.getBoundingClientRect();
            const gridContentRect = gridContentElement.getBoundingClientRect();
            if (gridContentRect.width === 0) return;

            const cellWidth = gridContentRect.width / gridSize.width;
            const cellHeight = gridContentRect.height / gridSize.height;

            const targetCenterX = (participantToCenter.position.x + 0.5) * cellWidth;
            const targetCenterY = (participantToCenter.position.y + 0.5) * cellHeight;

            const newScrollLeft = targetCenterX - (containerRect.width / 2);
            const newScrollTop = targetCenterY - (containerRect.height / 2);

            scrollContainer.scrollTo({ left: newScrollLeft, top: newScrollTop, behavior: 'smooth' });
        }, 150);

        return () => clearTimeout(timer);
    }, [activeParticipantId, selectedParticipantId, battle, multiplayerRole, scrollContainerRef]);
};