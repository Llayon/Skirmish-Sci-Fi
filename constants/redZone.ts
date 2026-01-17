import { TableEntry, ThreatCondition } from '../types';

export const THREAT_CONDITIONS: TableEntry<ThreatCondition>[] = [
    { roll_range: [1, 1], value: { id: 'comms_interference', nameKey: 'threats.comms_interference.name', descriptionKey: 'threats.comms_interference.desc' } },
    { roll_range: [2, 2], value: { id: 'elite_opposition', nameKey: 'threats.elite_opposition.name', descriptionKey: 'threats.elite_opposition.desc' } },
    { roll_range: [3, 3], value: { id: 'pitch_black', nameKey: 'threats.pitch_black.name', descriptionKey: 'threats.pitch_black.desc' } },
    { roll_range: [4, 4], value: { id: 'heavy_opposition', nameKey: 'threats.heavy_opposition.name', descriptionKey: 'threats.heavy_opposition.desc' } },
    { roll_range: [5, 5], value: { id: 'armored_opponents', nameKey: 'threats.armored_opponents.name', descriptionKey: 'threats.armored_opponents.desc' } },
    { roll_range: [6, 6], value: { id: 'enemy_captain', nameKey: 'threats.enemy_captain.name', descriptionKey: 'threats.enemy_captain.desc' } },
];

export interface TimeConstraintEvent {
    id: 'none' | 'reinforcements' | 'significant_reinforcements' | 'countdown' | 'evac_now' | 'elite_reinforcements';
}

export type TimeConstraintTableEntry = TableEntry<TimeConstraintEvent>;

export const TIME_CONSTRAINT_TABLE: TimeConstraintTableEntry[] = [
    { roll_range: [1, 1], value: { id: 'none' } },
    { roll_range: [2, 2], value: { id: 'reinforcements' } },
    { roll_range: [3, 3], value: { id: 'significant_reinforcements' } },
    { roll_range: [4, 4], value: { id: 'countdown' } },
    { roll_range: [5, 5], value: { id: 'evac_now' } },
    { roll_range: [6, 6], value: { id: 'elite_reinforcements' } },
];
