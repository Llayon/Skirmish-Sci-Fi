
import { TableEntry } from '../types';

export interface CharacterEvent {
    id: string;
    descriptionKey: string;
}

export type CharacterEventTableEntry = TableEntry<CharacterEvent>;

export const CHARACTER_EVENTS_TABLE: CharacterEventTableEntry[] = [
  { roll_range: [1, 3], value: { id: 'depressed', descriptionKey: 'postBattle.characterEvents.1-3' } },
  { roll_range: [4, 6], value: { id: 'business_elsewhere', descriptionKey: 'postBattle.characterEvents.4-6' } },
  { roll_range: [7, 10], value: { id: 'local_friends', descriptionKey: 'postBattle.characterEvents.7-10' } },
  { roll_range: [11, 12], value: { id: 'moving_on', descriptionKey: 'postBattle.characterEvents.11-12' } },
  { roll_range: [13, 15], value: { id: 'letter_from_home', descriptionKey: 'postBattle.characterEvents.13-15' } },
  { roll_range: [16, 19], value: { id: 'argument', descriptionKey: 'postBattle.characterEvents.16-19' } },
  { roll_range: [20, 23], value: { id: 'scrap_with_crew', descriptionKey: 'postBattle.characterEvents.20-23' } },
  { roll_range: [24, 26], value: { id: 'good_food', descriptionKey: 'postBattle.characterEvents.24-26' } },
  { roll_range: [27, 29], value: { id: 'identity_crisis', descriptionKey: 'postBattle.characterEvents.27-29' } },
  { roll_range: [30, 33], value: { id: 'make_over', descriptionKey: 'postBattle.characterEvents.30-33' } },
  { roll_range: [34, 38], value: { id: 'overhear_useful', descriptionKey: 'postBattle.characterEvents.34-38' } },
  { roll_range: [39, 41], value: { id: 'earn_on_side', descriptionKey: 'postBattle.characterEvents.39-41' } },
  { roll_range: [42, 45], value: { id: 'heart_to_heart', descriptionKey: 'postBattle.characterEvents.42-45' } },
  { roll_range: [46, 48], value: { id: 'exercise', descriptionKey: 'postBattle.characterEvents.46-48' } },
  { roll_range: [49, 51], value: { id: 'unusual_hobby', descriptionKey: 'postBattle.characterEvents.49-51' } },
  { roll_range: [52, 55], value: { id: 'scars_tell_story', descriptionKey: 'postBattle.characterEvents.52-55' } },
  { roll_range: [56, 59], value: { id: 'reflection', descriptionKey: 'postBattle.characterEvents.56-59' } },
  { roll_range: [60, 62], value: { id: 'breakthrough', descriptionKey: 'postBattle.characterEvents.60-62' } },
  { roll_range: [63, 66], value: { id: 'ship_injury', descriptionKey: 'postBattle.characterEvents.63-66' } },
  { roll_range: [67, 68], value: { id: 'true_love', descriptionKey: 'postBattle.characterEvents.67-68' } },
  { roll_range: [69, 71], value: { id: 'personal_enemy', descriptionKey: 'postBattle.characterEvents.69-71' } },
  { roll_range: [72, 75], value: { id: 'gift', descriptionKey: 'postBattle.characterEvents.72-75' } },
  { roll_range: [76, 78], value: { id: 'feeling_great', descriptionKey: 'postBattle.characterEvents.76-78' } },
  { roll_range: [79, 82], value: { id: 'know_someone', descriptionKey: 'postBattle.characterEvents.79-82' } },
  { roll_range: [83, 84], value: { id: 'charmed_existence', descriptionKey: 'postBattle.characterEvents.83-84' } },
  { roll_range: [85, 87], value: { id: 'hard_work', descriptionKey: 'postBattle.characterEvents.85-87' } },
  { roll_range: [88, 91], value: { id: 'item_damaged', descriptionKey: 'postBattle.characterEvents.88-91' } },
  { roll_range: [92, 94], value: { id: 'item_lost', descriptionKey: 'postBattle.characterEvents.92-94' } },
  { roll_range: [95, 97], value: { id: 'melancholy', descriptionKey: 'postBattle.characterEvents.95-97' } },
  { roll_range: [98, 100], value: { id: 'time_to_burn', descriptionKey: 'postBattle.characterEvents.98-100' } },
];
