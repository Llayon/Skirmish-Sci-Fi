import { EnemyTemplate } from '../types';

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
    {
        id: "ktharr_raider",
        ai: 'Aggressive',
        stats: { reactions: 1, speed: 5, combat: 0, toughness: 3, savvy: 0, luck: 0 },
        weapons: ['scrap_pistol', 'blade'],
        consumables: ['stim-pack'],
        panicRange: [1, 2],
        isFearless: false,
    },
    {
        id: 'unity_guard',
        ai: 'Tactical',
        stats: { reactions: 1, speed: 4, combat: 1, toughness: 4, savvy: 0, luck: 1 },
        weapons: ['military_rifle'],
        armor: 'combat_armor',
        consumables: [],
        panicRange: [1, 1],
        isFearless: false,
    },
    {
        id: 'cyber_mastiff',
        ai: 'Beast',
        stats: { reactions: 2, speed: 7, combat: 1, toughness: 3, savvy: -1, luck: 0 },
        weapons: ['power_claw'],
        consumables: [],
        panicRange: [1, 2],
        isFearless: false,
    },
    {
        id: 'rogue_sniper',
        ai: 'Cautious',
        stats: { reactions: 2, speed: 4, combat: 0, toughness: 2, savvy: 1, luck: 1 },
        weapons: ['marksman_rifle', 'hold_out_pistol'],
        armor: 'stealth_gear',
        consumables: [],
        panicRange: [1, 1],
        isFearless: false,
    },
    {
        id: 'berserker_x17',
        ai: 'Rampaging',
        stats: { reactions: 0, speed: 5, combat: 2, toughness: 5, savvy: -2, luck: 0 },
        weapons: ['shatter_axe'],
        armor: 'flex_armor',
        consumables: [],
        panicRange: [0, 0],
        isFearless: true,
    },
    {
        id: 'vent_crawler',
        ai: 'Rampaging',
        stats: { reactions: 0, speed: 6, combat: 2, toughness: 5, savvy: 0, luck: 0 },
        weapons: ['claws_d1'], // Rulebook says d0, but using d1 for consistency with available items
        consumables: [],
        panicRange: [0,0],
        isFearless: true,
    }
];

export const UNIQUE_INDIVIDUAL_TEMPLATE: EnemyTemplate = {
    id: 'unique_individual_mercenary',
    ai: 'Tactical',
    stats: { reactions: 2, speed: 5, combat: 2, toughness: 4, savvy: 1, luck: 2 },
    weapons: ['military_rifle', 'boarding_saber'],
    armor: 'combat_armor',
    consumables: ['stim-pack'],
    panicRange: [0, 0],
    isFearless: true,
};
