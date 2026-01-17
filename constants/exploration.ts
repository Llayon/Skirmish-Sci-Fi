import { TableEntry } from '../types';

export interface ExplorationResult {
    id: string;
}

export type ExplorationTableEntry = TableEntry<ExplorationResult>;

export const EXPLORATION_TABLE: ExplorationTableEntry[] = [
    { roll_range: [1, 3], value: { id: 'good_deal' } },
    { roll_range: [4, 6], value: { id: 'meet_patron' } },
    { roll_range: [7, 8], value: { id: 'bad_food' } },
    { roll_range: [9, 11], value: { id: 'meet_interesting' } },
    { roll_range: [12, 15], value: { id: 'nice_chat' } },
    { roll_range: [16, 18], value: { id: 'see_sights' } },
    { roll_range: [19, 21], value: { id: 'new_friend' } },
    { roll_range: [22, 24], value: { id: 'relax' } },
    { roll_range: [25, 28], value: { id: 'possible_bargain' } },
    { roll_range: [29, 31], value: { id: 'alien_merchant' } },
    { roll_range: [32, 34], value: { id: 'got_noticed' } },
    { roll_range: [35, 37], value: { id: 'hear_tip' } },
    { roll_range: [38, 40], value: { id: 'completely_lost' } },
    { roll_range: [41, 44], value: { id: 'package_delivery' } },
    { roll_range: [45, 47], value: { id: 'tech_fanatic' } },
    { roll_range: [48, 50], value: { id: 'few_drinks' } },
    { roll_range: [51, 53], value: { id: 'gambling_problem' } },
    { roll_range: [54, 57], value: { id: 'overheard_talk' } },
    { roll_range: [58, 60], value: { id: 'pick_fight' } },
    { roll_range: [61, 64], value: { id: 'found_trainer' } },
    { roll_range: [65, 68], value: { id: 'info_broker' } },
    { roll_range: [69, 71], value: { id: 'arms_dealer' } },
    { roll_range: [72, 75], value: { id: 'promising_lead' } },
    { roll_range: [76, 79], value: { id: 'needs_love' } },
    { roll_range: [80, 82], value: { id: 'bad_fight' } },
    { roll_range: [83, 86], value: { id: 'small_job' } },
    { roll_range: [87, 90], value: { id: 'reward_offer' } },
    { roll_range: [91, 94], value: { id: 'useful_contact' } },
    { roll_range: [95, 96], value: { id: 'found_item' } },
    { roll_range: [97, 100], value: { id: 'nice_place' } },
];