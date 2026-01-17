
import { TableEntry } from '../types';

export type TradeResultType = 'simple' | 'choice' | 'item_roll' | 'recruit' | 'xp_choice' | 'item_choice' | 'gamble' | 'sell_choice';

export interface TradeTableResult {
    id: string;
    type: TradeResultType;
    logKey: string;
    credits?: number;
    storyPoints?: number;
    rumors?: number;
    items?: { type: string; id: string; amount: number; damaged?: boolean }[];
    choices?: { id: string; labelKey: string; cost?: number; type: string }[];
    gambleDieSides?: number;
    gambleTarget?: number;
    itemsToReceive?: number;
}

export const TRADE_TABLE: TableEntry<TradeTableResult>[] = [
    { roll_range: [1, 3], value: { id: 'personal_weapon', type: 'item_roll', logKey: 'dashboard.tradeResults.personal_weapon', items: [{ type: 'low_tech_weapon', id: '', amount: 1 }] } },
    { roll_range: [4, 6], value: { id: 'sell_cargo', type: 'simple', logKey: 'dashboard.tradeResults.sell_cargo', credits: 2 } },
    { roll_range: [7, 9], value: { id: 'find_useful', type: 'item_roll', logKey: 'dashboard.tradeResults.find_useful', items: [{ type: 'gear', id: '', amount: 1 }] } },
    { roll_range: [10, 11], value: { id: 'quality_food', type: 'recruit', logKey: 'dashboard.tradeResults.quality_food' } },
    { roll_range: [12, 14], value: { id: 'instruction_book', type: 'xp_choice', logKey: 'dashboard.tradeResults.instruction_book' } },
    { roll_range: [15, 18], value: { id: 'bits_of_scrap', type: 'simple', logKey: 'dashboard.tradeResults.bits_of_scrap', credits: 1 } },
    { roll_range: [19, 22], value: { id: 'medical_pack', type: 'item_choice', logKey: 'dashboard.tradeResults.medical_pack', choices: [{ id: 'stim-pack', labelKey: 'consumables.stim-pack', type: 'consumable' }, { id: 'med-patch', labelKey: 'consumables.med-patch', type: 'consumable' }] } },
    { roll_range: [23, 24], value: { id: 'worthless_trinket', type: 'gamble', logKey: 'dashboard.tradeResults.worthless_trinket', storyPoints: 1, gambleDieSides: 6, gambleTarget: 6 } },
    { roll_range: [25, 26], value: { id: 'local_maps', type: 'simple', logKey: 'dashboard.tradeResults.local_maps' } },
    { roll_range: [27, 28], value: { id: 'luxury_trinket', type: 'choice', logKey: 'dashboard.tradeResults.luxury_trinket' } }, // Special handling in use case
    { roll_range: [29, 30], value: { id: 'basic_supplies', type: 'simple', logKey: 'dashboard.tradeResults.basic_supplies' } },
    { roll_range: [31, 34], value: { id: 'contraband', type: 'choice', logKey: 'dashboard.tradeResults.contraband' } },
    { roll_range: [35, 37], value: { id: 'gun_upgrade_kit', type: 'item_choice', logKey: 'dashboard.tradeResults.gun_upgrade_kit', choices: [{ id: 'laser_sight', labelKey: 'gun_sights.laser_sight', type: 'gun_sight' }, { id: 'bipod', labelKey: 'gun_mods.bipod', type: 'gun_mod' }, { id: 'beam_light', labelKey: 'gun_mods.beam_light', type: 'gun_mod' }] } },
    { roll_range: [38, 39], value: { id: 'useless_trinket', type: 'gamble', logKey: 'dashboard.tradeResults.useless_trinket', storyPoints: 1, gambleDieSides: 6, gambleTarget: 6 } },
    { roll_range: [40, 44], value: { id: 'trade_goods', type: 'simple', logKey: 'dashboard.tradeResults.trade_goods' } }, // Special handling
    { roll_range: [45, 48], value: { id: 'something_interesting', type: 'item_roll', logKey: 'dashboard.tradeResults.something_interesting', items: [{ type: 'loot', id: '', amount: 1 }] } },
    { roll_range: [49, 51], value: { id: 'fuel', type: 'simple', logKey: 'dashboard.tradeResults.fuel' } }, // Special handling
    { roll_range: [52, 53], value: { id: 'spare_parts', type: 'simple', logKey: 'dashboard.tradeResults.spare_parts' } }, // Special handling
    { roll_range: [54, 55], value: { id: 'tourist_garbage', type: 'gamble', logKey: 'dashboard.tradeResults.tourist_garbage', storyPoints: 1, gambleDieSides: 6, gambleTarget: 5 } },
    { roll_range: [56, 56], value: { id: 'rare_sale', type: 'choice', logKey: 'dashboard.tradeResults.rare_sale' } },
    { roll_range: [57, 59], value: { id: 'ordnance', type: 'item_choice', logKey: 'dashboard.tradeResults.ordnance', choices: [{ id: 'frakk_grenade', labelKey: 'weapons.frakk_grenade', type: 'weapon' }, { id: 'dazzle_grenade', labelKey: 'weapons.dazzle_grenade', type: 'weapon' }], itemsToReceive: 3 } },
    { roll_range: [60, 62], value: { id: 'basic_firearms', type: 'item_choice', logKey: 'dashboard.tradeResults.basic_firearms', choices: [{ id: 'hand_gun', labelKey: 'weapons.hand_gun', type: 'weapon' }, { id: 'colony_rifle', labelKey: 'weapons.colony_rifle', type: 'weapon' }, { id: 'shotgun', labelKey: 'weapons.shotgun', type: 'weapon' }] } },
    { roll_range: [63, 63], value: { id: 'odd_device', type: 'choice', logKey: 'dashboard.tradeResults.odd_device' } },
    { roll_range: [64, 65], value: { id: 'military_fuel_cell', type: 'simple', logKey: 'dashboard.tradeResults.military_fuel_cell' } }, // Special handling
    { roll_range: [66, 69], value: { id: 'hot_tip', type: 'simple', logKey: 'dashboard.tradeResults.hot_tip', rumors: 1 } },
    { roll_range: [70, 71], value: { id: 'insider_information', type: 'simple', logKey: 'dashboard.tradeResults.insider_information' } },
    { roll_range: [72, 75], value: { id: 'army_surplus', type: 'item_choice', logKey: 'dashboard.tradeResults.army_surplus', choices: [{ id: 'auto_rifle', labelKey: 'weapons.auto_rifle', type: 'weapon' }, { id: 'blast_pistol', labelKey: 'weapons.blast_pistol', type: 'weapon' }, { id: 'glare_sword', labelKey: 'weapons.glare_sword', type: 'weapon' }] } },
    { roll_range: [76, 78], value: { id: 'unload_stuff', type: 'sell_choice', logKey: 'dashboard.tradeResults.unload_stuff' } },
    { roll_range: [79, 81], value: { id: 'blinking_lights', type: 'item_roll', logKey: 'dashboard.tradeResults.blinking_lights', items: [{ type: 'gear_subsection', id: '', amount: 1 }] } },
    { roll_range: [82, 86], value: { id: 'gently_used', type: 'item_roll', logKey: 'dashboard.tradeResults.gently_used', items: [{ type: 'gear_subsection', id: '', amount: 1, damaged: true }] } },
    { roll_range: [87, 91], value: { id: 'pre_owned', type: 'item_roll', logKey: 'dashboard.tradeResults.pre_owned', items: [{ type: 'loot', id: '', amount: 1, damaged: true }] } },
    { roll_range: [92, 95], value: { id: 'medical_reserves', type: 'simple', logKey: 'dashboard.tradeResults.medical_reserves', items: [{ type: 'consumable', id: 'stim-pack', amount: 2 }, { type: 'consumable', id: 'med-patch', amount: 2 }] } },
    { roll_range: [96, 100], value: { id: 'starship_parts', type: 'simple', logKey: 'dashboard.tradeResults.starship_parts' } }, // Special handling
];
