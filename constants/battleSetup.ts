
import { TableEntry, MissionType } from '../types';

export type RivalAttackType = 'Ambush' | 'Brought friends' | 'Showdown' | 'Assault' | 'Raid';

export const RIVAL_ATTACK_TABLE: TableEntry<RivalAttackType>[] = [
    { roll_range: [1, 1], value: 'Ambush' },
    { roll_range: [2, 3], value: 'Brought friends' },
    { roll_range: [4, 7], value: 'Showdown' },
    { roll_range: [8, 8], value: 'Assault' },
    { roll_range: [9, 10], value: 'Raid' },
];

export const OPPORTUNITY_MISSION_TABLE: TableEntry<MissionType>[] = [
    { roll_range: [1, 2], value: 'MoveThrough' },
    { roll_range: [3, 4], value: 'Deliver' },
    { roll_range: [5, 6], value: 'Access' },
    { roll_range: [7, 8], value: 'Patrol' },
    { roll_range: [9, 10], value: 'FightOff' },
];

export const QUEST_MISSION_TABLE: TableEntry<MissionType>[] = [
    { roll_range: [1, 2], value: 'MoveThrough' },
    { roll_range: [3, 4], value: 'Search' },
    { roll_range: [5, 6], value: 'Defend' },
    { roll_range: [7, 8], value: 'Acquire' },
    { roll_range: [9, 10], value: 'FightOff' },
];

export const PATRON_MISSION_TABLE: TableEntry<MissionType>[] = [
    { roll_range: [1, 2], value: 'Deliver' },
    { roll_range: [3, 3], value: 'Eliminate' },
    { roll_range: [4, 5], value: 'MoveThrough' },
    { roll_range: [6, 7], value: 'Secure' },
    { roll_range: [8, 8], value: 'Protect' },
    { roll_range: [9, 10], value: 'FightOff' },
];

export const BASIC_ENEMY_WEAPON_TABLE: { roll: number, col1: string[], col2: string[], col3: string[] }[] = [
    { roll: 1, col1: ['scrap_pistol'], col2: ['colony_rifle'], col3: ['hand_laser'] },
    { roll: 2, col1: ['hand_gun'], col2: ['military_rifle'], col3: ['hand_laser'] },
    { roll: 3, col1: ['colony_rifle'], col2: ['military_rifle'], col3: ['infantry_laser'] },
    { roll: 4, col1: ['military_rifle'], col2: ['military_rifle'], col3: ['infantry_laser'] },
    { roll: 5, col1: ['scrap_pistol', 'blade'], col2: ['hand_laser'], col3: ['blast_rifle'] },
    { roll: 6, col1: ['shotgun'], col2: ['infantry_laser'], col3: ['blast_rifle'] },
];

export const SPECIALIST_WEAPON_TABLE: { roll: number, colA: string[], colB: string[], colC: string[] }[] = [
    { roll: 1, colA: ['power_claw'], colB: ['marksman_rifle'], colC: ['marksman_rifle'] },
    { roll: 2, colA: ['shotgun'], colB: ['auto_rifle'], colC: ['shell_gun'] },
    { roll: 3, colA: ['auto_rifle'], colB: ['shell_gun'], colC: ['fury_rifle'] },
    { roll: 4, colA: ['cling_fire_pistol'], colB: ['hand_flamer'], colC: ['plasma_rifle'] },
    { roll: 5, colA: ['hunting_rifle'], colB: ['rattle_gun'], colC: ['plasma_rifle'] },
    { roll: 6, colA: ['hand_gun', 'ripper_sword'], colB: ['rattle_gun'], colC: ['hyper_blaster'] },
];
