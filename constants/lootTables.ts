
import { TableEntry } from '../types';

export type LootTableResultType = 'weapon' | 'damaged_weapon' | 'damaged_gear' | 'gear' | 'odds_and_ends' | 'rewards';
export const LOOT_TABLE: TableEntry<LootTableResultType>[] = [
    { roll_range: [1, 25], value: 'weapon' },
    { roll_range: [26, 35], value: 'damaged_weapon' },
    { roll_range: [36, 45], value: 'damaged_gear' },
    { roll_range: [46, 65], value: 'gear' },
    { roll_range: [66, 80], value: 'odds_and_ends' },
    { roll_range: [81, 100], value: 'rewards' },
];

export type WeaponCategoryType = 'slug_weapons' | 'energy_weapons' | 'special_weapons' | 'melee_weapons' | 'grenades';
export const WEAPON_CATEGORY_SUBTABLE: TableEntry<WeaponCategoryType>[] = [
    { roll_range: [1, 35], value: 'slug_weapons' },
    { roll_range: [36, 50], value: 'energy_weapons' },
    { roll_range: [51, 65], value: 'special_weapons' },
    { roll_range: [66, 85], value: 'melee_weapons' },
    { roll_range: [86, 100], value: 'grenades' },
];

export const SLUG_WEAPONS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 5], value: 'hold_out_pistol' },
    { roll_range: [6, 13], value: 'hand_gun' },
    { roll_range: [14, 18], value: 'scrap_pistol' },
    { roll_range: [19, 26], value: 'machine_pistol' },
    { roll_range: [27, 32], value: 'dueling_pistol' },
    { roll_range: [33, 37], value: 'hand_cannon' },
    { roll_range: [38, 46], value: 'colony_rifle' },
    { roll_range: [47, 56], value: 'military_rifle' },
    { roll_range: [57, 65], value: 'shotgun' },
    { roll_range: [66, 70], value: 'flak_gun' },
    { roll_range: [71, 78], value: 'hunting_rifle' },
    { roll_range: [79, 83], value: 'marksman_rifle' },
    { roll_range: [84, 92], value: 'auto_rifle' },
    { roll_range: [93, 100], value: 'rattle_gun' },
];

export const ENERGY_WEAPONS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 20], value: 'hand_laser' },
    { roll_range: [21, 35], value: 'beam_pistol' },
    { roll_range: [36, 55], value: 'infantry_laser' },
    { roll_range: [56, 70], value: 'blast_pistol' },
    { roll_range: [71, 90], value: 'blast_rifle' },
    { roll_range: [91, 100], value: 'hyper_blaster' },
];

export const SPECIAL_WEAPONS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 20], value: 'needle_rifle' },
    { roll_range: [21, 45], value: 'plasma_rifle' },
    { roll_range: [46, 60], value: 'fury_rifle' },
    { roll_range: [61, 75], value: 'shell_gun' },
    { roll_range: [76, 90], value: 'cling_fire_pistol' },
    { roll_range: [91, 100], value: 'hand_flamer' },
];

export const MELEE_WEAPONS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 20], value: 'blade' },
    { roll_range: [21, 40], value: 'brutal_melee_weapon' },
    { roll_range: [41, 55], value: 'boarding_saber' },
    { roll_range: [56, 75], value: 'ripper_sword' },
    { roll_range: [76, 85], value: 'shatter_axe' },
    { roll_range: [86, 90], value: 'power_claw' },
    { roll_range: [91, 95], value: 'glare_sword' },
    { roll_range: [96, 100], value: 'supression_maul' },
];

export const GRENADES_SUBTABLE: TableEntry<{id: string, amount: number}>[] = [
    { roll_range: [1, 60], value: { id: 'frakk_grenade', amount: 3 } },
    { roll_range: [61, 100], value: { id: 'dazzle_grenade', amount: 3 } },
];

export type GearCategoryType = 'gun_mods' | 'gun_sights' | 'protective_items' | 'utility_items';
export const GEAR_SUBTABLE: TableEntry<GearCategoryType>[] = [
    { roll_range: [1, 20], value: 'gun_mods' },
    { roll_range: [21, 40], value: 'gun_sights' },
    { roll_range: [41, 75], value: 'protective_items' },
    { roll_range: [76, 100], value: 'utility_items' },
];

export const GUN_MODS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 10], value: 'assault_blade' },
    { roll_range: [11, 20], value: 'beam_light' },
    { roll_range: [21, 35], value: 'bipod' },
    { roll_range: [36, 55], value: 'hot_shot_pack' },
    { roll_range: [56, 65], value: 'cyber_configurable_nano_sludge' },
    { roll_range: [66, 80], value: 'stabilizer' },
    { roll_range: [81, 90], value: 'shock_attachment' },
    { roll_range: [91, 100], value: 'upgrade_kit' },
];

export const GUN_SIGHTS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 20], value: 'laser_sight' },
    { roll_range: [21, 45], value: 'quality_sight' },
    { roll_range: [46, 70], value: 'seeker_sight' },
    { roll_range: [71, 85], value: 'tracker_sight' },
    { roll_range: [86, 100], value: 'unity_battle_sight' },
];

export const PROTECTIVE_ITEMS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 5], value: 'battle_dress' },
    { roll_range: [6, 15], value: 'camo_cloak' },
    { roll_range: [16, 40], value: 'combat_armor' },
    { roll_range: [41, 50], value: 'deflector_field' },
    { roll_range: [51, 65], value: 'flak_screen' },
    { roll_range: [66, 75], value: 'flex_armor' },
    { roll_range: [76, 90], value: 'frag_vest' },
    { roll_range: [91, 95], value: 'screen_generator' },
    { roll_range: [96, 100], value: 'stealth_gear' },
];

export const UTILITY_ITEMS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 6], value: 'auto_sensor' },
    { roll_range: [7, 11], value: 'battle_visor' },
    { roll_range: [12, 17], value: 'communicator' },
    { roll_range: [18, 23], value: 'concealed_blade' },
    { roll_range: [24, 29], value: 'displacer' },
    { roll_range: [30, 34], value: 'distraction_bot' },
    { roll_range: [35, 38], value: 'grapple_launcher' },
    { roll_range: [39, 43], value: 'grav_dampener' },
    { roll_range: [44, 49], value: 'hazard_suit' },
    { roll_range: [50, 54], value: 'hover_board' },
    { roll_range: [55, 57], value: 'insta_wall' },
    { roll_range: [58, 63], value: 'jump_belt' },
    { roll_range: [64, 70], value: 'motion_tracker' },
    { roll_range: [71, 75], value: 'multi_cutter' },
    { roll_range: [76, 79], value: 'robo_rabbits_foot' },
    { roll_range: [80, 84], value: 'scanner_bot' },
    { roll_range: [85, 89], value: 'snooper_bot' },
    { roll_range: [90, 93], value: 'sonic_emitter' },
    { roll_range: [94, 96], value: 'steel_boots' },
    { roll_range: [97, 100], value: 'time_distorter' },
];

export type OddsAndEndsCategoryType = 'consumables' | 'implants' | 'ship_items';
export const ODDS_AND_ENDS_TABLE: TableEntry<OddsAndEndsCategoryType>[] = [
    { roll_range: [1, 55], value: 'consumables' },
    { roll_range: [56, 70], value: 'implants' },
    { roll_range: [71, 100], value: 'ship_items' },
];

export const CONSUMABLES_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 20], value: 'booster_pills' },
    { roll_range: [21, 30], value: 'combat_serum' },
    { roll_range: [31, 40], value: 'kiranin_crystals' },
    { roll_range: [41, 55], value: 'rage_out' },
    { roll_range: [56, 70], value: 'still' },
    { roll_range: [71, 100], value: 'stim-pack' },
];

export const IMPLANTS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 10], value: 'ai_companion' },
    { roll_range: [11, 16], value: 'body_wire' },
    { roll_range: [17, 28], value: 'boosted_arm' },
    { roll_range: [29, 40], value: 'boosted_leg' },
    { roll_range: [41, 50], value: 'cyber_hand' },
    { roll_range: [51, 61], value: 'genetic_defenses' },
    { roll_range: [62, 71], value: 'health_boost' },
    { roll_range: [72, 79], value: 'nerve_adjuster' },
    { roll_range: [80, 85], value: 'neural_optimization' },
    { roll_range: [86, 94], value: 'night_sight' },
    { roll_range: [95, 100], value: 'pain_suppressor' },
];

export const SHIP_ITEMS_SUBTABLE: TableEntry<string>[] = [
    { roll_range: [1, 4], value: 'analyzer' },
    { roll_range: [5, 11], value: 'colonist_ration_packs' },
    { roll_range: [12, 17], value: 'duplicator' },
    { roll_range: [18, 24], value: 'fake_id' },
    { roll_range: [25, 31], value: 'fixer' },
    { roll_range: [32, 34], value: 'genetic_reconfiguration_kit' },
    { roll_range: [35, 39], value: 'loaded_dice' },
    { roll_range: [40, 44], value: 'lucky_dice' },
    { roll_range: [45, 48], value: 'mk_II_translator' },
    { roll_range: [49, 56], value: 'med-patch' },
    { roll_range: [57, 60], value: 'meditation_orb' },
    { roll_range: [61, 67], value: 'nano-doc' },
    { roll_range: [68, 71], value: 'novelty_stuffed_animal' },
    { roll_range: [72, 74], value: 'purifier' },
    { roll_range: [75, 78], value: 'repair_bot' },
    { roll_range: [79, 83], value: 'sector_permit' },
    { roll_range: [84, 91], value: 'spare_parts' },
    { roll_range: [92, 96], value: 'teach-bot' },
    { roll_range: [97, 100], value: 'transcender' },
];

export type RewardType = 'rumors_1' | 'rumors_2' | 'credits_3' | 'credits_d6' | 'credits_d6_2' | 'credits_2d6_high' | 'discount_d6' | 'discount_d6_2' | 'story_points_2' | 'story_points_3';
export const REWARDS_TABLE: TableEntry<RewardType>[] = [
    { roll_range: [1, 10], value: 'rumors_1' },
    { roll_range: [11, 20], value: 'rumors_2' },
    { roll_range: [21, 25], value: 'credits_3' },
    { roll_range: [26, 40], value: 'credits_d6' },
    { roll_range: [41, 55], value: 'credits_d6_2' },
    { roll_range: [56, 70], value: 'credits_2d6_high' },
    { roll_range: [71, 85], value: 'discount_d6' },
    { roll_range: [86, 90], value: 'discount_d6_2' },
    { roll_range: [91, 95], value: 'story_points_2' },
    { roll_range: [96, 100], value: 'story_points_3' },
];