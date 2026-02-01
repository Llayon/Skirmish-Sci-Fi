import { EngineBattleState, EngineDeps, BattleEvent, EngineLogEntry } from '../types';
import { cascadePhase } from '../helpers/turnFlow';

export function rollInitiative(
    state: EngineBattleState, 
    deps: EngineDeps
): { next: EngineBattleState; events: BattleEvent[]; log: EngineLogEntry[] } {
    const { battle } = state;
    
    // 0. Guard: Phase must be 'reaction_roll'
    if (battle.phase !== 'reaction_roll') {
        throw new Error(`Invariant: Cannot ROLL_INITIATIVE in phase ${battle.phase}`);
    }

    let currentRng = state.rng;
    const events: BattleEvent[] = [];
    const logDelta: EngineLogEntry[] = [];
    const reactionRolls: Record<string, { roll: number; success: boolean }> = {};

    // 1. Gather participants
    const participantsById = new Map(battle.participants.map(p => [p.id, p]));
    const characterIds = battle.participants
        .filter(p => p.type === 'character')
        .map(p => p.id); // Maintain order

    // 2. Determine conditions
    const caughtOffGuard = battle.round === 1 && battle.deploymentCondition?.id === 'caught_off_guard';

    // Log caughtOffGuard condition if applicable
    logDelta.push({ 
        key: 'log.action.rollInitiative',
    });

    if (caughtOffGuard) {
        logDelta.push({ 
            key: 'log.deployment.caughtOffGuard',
        });
    }

    // 3. Roll for each character
    const rolls: Array<{ id: string; roll: number; success: boolean }> = [];

    for (const id of characterIds) {
        const participant = participantsById.get(id);
        if (!participant) {
            throw new Error(`Invariant: Participant ${id} not found`);
        }

        const { value, next } = deps.rng.d6(currentRng);
        currentRng = next;

        const success = !caughtOffGuard && value <= (participant.stats.reactions);
        
        reactionRolls[id] = { roll: value, success };
        rolls.push({ id, roll: value, success });
        
        events.push({ 
            type: 'REACTION_ROLLED', 
            participantId: id, 
            roll: value, 
            success 
        });
    }

    // 4. Handle Feral Fumble (Baseline logic)
    // "if exactly one '1' is rolled among characters, and that character has 'feral_reaction_fumble'"
    if (!caughtOffGuard) {
        const ones = rolls.filter(r => r.roll === 1);
        if (ones.length === 1) {
            const fumbledRoll = ones[0];
            const participant = participantsById.get(fumbledRoll.id);
            if (!participant) throw new Error(`Invariant: Participant ${fumbledRoll.id} not found`);
            
            if (participant.type === 'character' && participant.specialAbilities?.includes('feral_reaction_fumble')) {
                 logDelta.push({
                     key: 'log.trait.feralFumble',
                     params: { name: participant.name }
                 });
                 // Success remains true (per baseline requirement description: "success не менять")
            }
        }
    }

    // 5. Determine Order
    // Quick: success === true
    // Slow: success === false
    // Use the *updated* reactionRolls (which are now populated)
    const quick = characterIds.filter(id => {
        const res = reactionRolls[id];
        if (!res) throw new Error(`Invariant: No roll for ${id}`);
        return res.success;
    });
    
    const slow = characterIds.filter(id => {
        const res = reactionRolls[id];
        if (!res) throw new Error(`Invariant: No roll for ${id}`);
        return !res.success;
    });

    events.push({ type: 'TURN_ORDER_SET', quick, slow });

    // 6. Initial Phase Transition & Cascade
    let nextBattle = {
        ...battle,
        reactionRolls,
        quickActionOrder: quick,
        slowActionOrder: slow,
        phase: 'quick_actions' as const,
        currentTurnIndex: -1,
        activeParticipantId: null,
    };

    events.push({ type: 'PHASE_CHANGED', from: 'reaction_roll', to: 'quick_actions' });
    logDelta.push({ key: 'log.phase.changed', params: { from: 'reaction_roll', to: 'quick_actions' } });

    // 7. Apply Cascade (Auto-select first active or move to next phase)
    const intermediateState: EngineBattleState = {
        schemaVersion: state.schemaVersion,
        battle: nextBattle,
        rng: currentRng
    };

    const cascadeResult = cascadePhase(intermediateState);

    return {
        next: cascadeResult.next,
        events: [...events, ...cascadeResult.events],
        log: [...logDelta, ...cascadeResult.log]
    };
}
