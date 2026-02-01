import { describe, it, expectTypeOf } from 'vitest';
import type { BattleAction, BattleActionByType } from './actions';

describe('BattleAction Types', () => {
  it('should narrow types correctly', () => {
    const action = { type: 'shoot', characterId: 'p1', targetId: 'p2', weaponInstanceId: 'w1', isAimed: true } as BattleAction;

    if (action.type === 'shoot') {
      // Compile-level verification that these properties exist
      expectTypeOf(action).toMatchTypeOf<BattleActionByType<'shoot'>>();
      expectTypeOf(action.weaponInstanceId).toBeString();
      expectTypeOf(action.targetId).toBeString();

      // Verification that properties from other actions do not exist (optional but good for strictness check if needed,
      // but TS usually handles this by erroring on access. expectTypeOf doesn't easily test "prop does not exist")
    } else if (action.type === 'move') {
      expectTypeOf(action).toMatchTypeOf<BattleActionByType<'move'>>();
      expectTypeOf(action.position).toBeObject();
      expectTypeOf(action.isDash).toBeBoolean();
    }
  });

  it('should have correct action types in union', () => {
    type ActionTypes = BattleAction['type'];
    expectTypeOf<ActionTypes>().toEqualTypeOf<'move' | 'slide' | 'teleport' | 'shoot' | 'panic_fire' | 'brawl' | 'use_consumable' | 'use_utility_device' | 'interact' | 'end_turn' | 'roll_initiative' | 'advance_phase'>();
  });
});
