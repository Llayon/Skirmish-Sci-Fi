import { TableEntry } from '../types';

export interface BattlefieldFindResult {
    id: 'weapon' | 'consumable' | 'rumor' | 'starship_part' | 'personal_trinket' | 'debris' | 'vital_info' | 'nothing';
}

export type BattlefieldFindsTableEntry = TableEntry<BattlefieldFindResult>;

export const BATTLEFIELD_FINDS_TABLE: BattlefieldFindsTableEntry[] = [
    { roll_range: [1, 15], value: { id: 'weapon' } },
    { roll_range: [16, 25], value: { id: 'consumable' } },
    { roll_range: [26, 35], value: { id: 'rumor' } },
    { roll_range: [36, 45], value: { id: 'starship_part' } },
    { roll_range: [46, 60], value: { id: 'personal_trinket' } },
    { roll_range: [61, 75], value: { id: 'debris' } },
    { roll_range: [76, 90], value: { id: 'vital_info' } },
    { roll_range: [91, 100], value: { id: 'nothing' } },
];
