

import { TableEntry, BattleEvent, BattleEventTableEntry } from '../types';

export const BATTLE_EVENTS_TABLE: BattleEventTableEntry[] = [
  { roll_range: [1, 5], value: { id: 'renewed_efforts' } },
  { roll_range: [6, 9], value: { id: 'enemy_reinforcements' } },
  { roll_range: [10, 13], value: { id: 'change_of_plans' } },
  { roll_range: [14, 16], value: { id: 'lost_heart' } },
  { roll_range: [17, 20], value: { id: 'seized_the_moment' } },
  { roll_range: [21, 26], value: { id: 'critters' } },
  { roll_range: [27, 30], value: { id: 'ammo_fault' } },
  { roll_range: [31, 34], value: { id: 'visibility_change' } },
  { roll_range: [35, 38], value: { id: 'tougher_than_expected' } },
  { roll_range: [39, 42], value: { id: 'snap_shot' } },
  { roll_range: [43, 46], value: { id: 'cunning_plan' } },
  { roll_range: [47, 50], value: { id: 'possible_reinforcements' } },
  { roll_range: [51, 54], value: { id: 'clock_is_running_out' } },
  { roll_range: [55, 60], value: { id: 'environmental_hazard' } },
  { roll_range: [61, 65], value: { id: 'a_desperate_plan' } },
  { roll_range: [66, 70], value: { id: 'a_moment_of_hesitation' } },
  { roll_range: [71, 73], value: { id: 'fumbled_grenade' } },
  { roll_range: [74, 77], value: { id: 'back_up' } },
  { roll_range: [78, 80], value: { id: 'enemy_vip' } },
  { roll_range: [81, 85], value: { id: 'fog_cloud' } },
  { roll_range: [86, 89], value: { id: 'lost' } },
  { roll_range: [90, 93], value: { id: 'i_found_something' } },
  { roll_range: [94, 97], value: { id: 'looks_valuable' } },
  { roll_range: [98, 100], value: { id: 'you_want_me_to_check_that_out' } },
];