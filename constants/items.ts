import { Weapon, Consumable, ProtectiveDevice, GunMod, GunSight, Implant, UtilityDevice } from '../types';

export const GUN_MODS: GunMod[] = [
    { id: 'assault_blade', traits: ['melee', 'damage_plus_one', 'brawl_tie_winner'] },
    { id: 'beam_light', traits: [] },
    { id: 'bipod', traits: ['bipod_bonus'] },
    { id: 'hot_shot_pack', traits: ['hot_shot_damage', 'hot_shot_overheat'] },
    { id: 'cyber_configurable_nano_sludge', traits: ['permanent_plus_one_hit'] },
    { id: 'stabilizer', traits: ['ignores_heavy'] },
    { id: 'shock_attachment', traits: ['shock_attachment_impact'] },
    { id: 'upgrade_kit', traits: ['range_increase_2'] },
];

export const GUN_SIGHTS: GunSight[] = [
    { id: 'laser_sight', traits: ['snap_shot', 'pistol_only_sight'] },
    { id: 'quality_sight', traits: ['quality_sight_range', 'quality_sight_reroll'] },
    { id: 'seeker_sight', traits: ['seeker_sight_bonus'] },
    { id: 'tracker_sight', traits: ['tracker_sight'] },
    { id: 'unity_battle_sight', traits: ['unity_battle_sight'] },
];

export const IMPLANTS: Implant[] = [
    { id: 'ai_companion' },
    { id: 'body_wire', statModifiers: { reactions: 1 } },
    { id: 'boosted_arm', traits: ['boosted_arm_grenade_range'] },
    { id: 'boosted_leg', statModifiers: { speed: 1 } },
    { id: 'cyber_hand' },
    { id: 'genetic_defenses' },
    { id: 'health_boost', traits: ['health_boost_recovery', 'health_boost_toughness'] },
    { id: 'nerve_adjuster', traits: ['nerve_adjuster_save'] },
    { id: 'neural_optimization', traits: ['neural_optimization_stun_immunity'] },
    { id: 'night_sight' },
    { id: 'pain_suppressor', traits: ['pain_suppressor_tasks'] },
];

export const UTILITY_DEVICES: UtilityDevice[] = [
    { id: 'auto_sensor', effectType: 'passive' },
    { id: 'battle_visor', effectType: 'passive', traits: ['reroll_shooting_ones'] },
    { id: 'communicator', effectType: 'passive' },
    { id: 'concealed_blade', effectType: 'active_free' },
    { id: 'displacer', effectType: 'active_action' },
    { id: 'distraction_bot', effectType: 'active_action' },
    { id: 'grapple_launcher', effectType: 'active_action' },
    { id: 'grav_dampener', effectType: 'passive' },
    { id: 'hazard_suit', effectType: 'passive' },
    { id: 'hover_board', effectType: 'active_action' },
    { id: 'insta_wall', effectType: 'active_action' },
    { id: 'jump_belt', effectType: 'active_action' },
    { id: 'motion_tracker', effectType: 'passive' },
    { id: 'multi_cutter', effectType: 'active_action' },
    { id: 'robo_rabbits_foot', effectType: 'passive' },
    { id: 'scanner_bot', effectType: 'passive' },
    { id: 'snooper_bot', effectType: 'passive' },
    { id: 'sonic_emitter', effectType: 'passive' },
    { id: 'steel_boots', effectType: 'passive' },
    { id: 'time_distorter', effectType: 'active_free', duration: 2 },
];


export const CONSUMABLES: Consumable[] = [
    { id: 'booster_pills' },
    { id: 'combat_serum' },
    { id: 'kiranin_crystals' },
    { id: 'rage_out' },
    { id: 'still' },
    { id: 'stim-pack' },
    { id: 'med-patch' },
    { id: 'communicator' },
    { id: 'grapple_gun' },
    { id: 'data-spike' },
    { id: 'rations' },
    { id: 'toolkit' },
    { id: 'binoculars' },
];

export const PROTECTIVE_DEVICES: ProtectiveDevice[] = [
  {
    id: "battle_dress",
    type: "armor",
    savingThrow: 5,
    traits: ['battle_dress_reactions'],
  },
  {
    id: "camo_cloak",
    type: "screen",
    traits: ['camo_cloak'],
  },
  {
    id: "combat_armor",
    type: "armor",
    savingThrow: 5,
  },
  {
    id: "deflector_field",
    type: "screen",
    traits: ['deflector_field'],
  },
  {
    id: 'flak_screen',
    type: 'screen',
    traits: ['flak_screen_damage_reduction']
  },
  {
    id: 'flex_armor',
    type: 'armor',
    traits: ['flex_armor_toughness']
  },
  {
    id: 'frag_vest',
    type: 'armor',
    savingThrow: 6,
    traits: ['frag_vest_area_save']
  },
  {
    id: 'screen_generator',
    type: 'screen',
    savingThrow: 5,
    traits: ['screen_generator_ranged_save']
  },
  {
    id: 'stealth_gear',
    type: 'armor',
    traits: ['stealth_gear_long_range_penalty']
  }
];

export const WEAPONS: Weapon[] = [
    { "id": "auto_rifle", "range": 24, "shots": 2, "damage": 0, "traits": [] },
    { "id": "beam_pistol", "range": 10, "shots": 1, "damage": 1, "traits": ["pistol", "critical"] },
    { "id": "blade", "range": "brawl", "shots": 0, "damage": 0, "traits": ["melee"] },
    { "id": "blast_pistol", "range": 8, "shots": 1, "damage": 1, "traits": ["pistol"] },
    { "id": "blast_rifle", "range": 16, "shots": 1, "damage": 1, "traits": [] },
    { "id": "boarding_saber", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee", "elegant"] },
    { "id": "brutal_melee_weapon", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee", "clumsy"] },
    { "id": "cling_fire_pistol", "range": 12, "shots": 2, "damage": 1, "traits": ["focused", "terrifying"] },
    { "id": "colony_rifle", "range": 18, "shots": 1, "damage": 0, "traits": [] },
    { "id": "dazzle_grenade", "range": 6, "shots": 1, "damage": 0, "traits": ["area", "stun", "single_use"] },
    { "id": "dueling_pistol", "range": 8, "shots": 1, "damage": 0, "traits": ["pistol", "critical"] },
    { "id": "flak_gun", "range": 8, "shots": 2, "damage": 1, "traits": ["focused", "critical"] },
    { "id": "frakk_grenade", "range": 6, "shots": 2, "damage": 0, "traits": ["heavy", "area", "single_use"] },
    { "id": "fury_rifle", "range": 24, "shots": 1, "damage": 2, "traits": ["heavy", "piercing"] },
    { "id": "glare_sword", "range": "brawl", "shots": 0, "damage": 0, "traits": ["melee", "elegant", "piercing"] },
    { "id": "hand_cannon", "range": 8, "shots": 1, "damage": 2, "traits": ["pistol"] },
    { "id": "hand_flamer", "range": 12, "shots": 2, "damage": 1, "traits": ["focused", "area"] },
    { "id": "hand_gun", "range": 12, "shots": 1, "damage": 0, "traits": ["pistol"] },
    { "id": "hand_laser", "range": 12, "shots": 1, "damage": 0, "traits": ["snap_shot", "pistol"] },
    { "id": "hold_out_pistol", "range": 4, "shots": 1, "damage": 0, "traits": ["melee", "pistol"] },
    { "id": "hunting_rifle", "range": 30, "shots": 1, "damage": 1, "traits": ["heavy"] },
    { "id": "hyper_blaster", "range": 24, "shots": 3, "damage": 1, "traits": [] },
    { "id": "infantry_laser", "range": 30, "shots": 1, "damage": 0, "traits": ["snap_shot"] },
    { "id": "machine_pistol", "range": 8, "shots": 2, "damage": 0, "traits": ["pistol", "focused"] },
    { "id": "marksman_rifle", "range": 36, "shots": 1, "damage": 0, "traits": ["heavy"] },
    { "id": "military_rifle", "range": 24, "shots": 1, "damage": 0, "traits": [] },
    { "id": "needle_rifle", "range": 18, "shots": 2, "damage": 0, "traits": ["critical"] },
    { "id": "plasma_rifle", "range": 20, "shots": 2, "damage": 1, "traits": ["focused", "piercing"] },
    { "id": "power_claw", "range": "brawl", "shots": 0, "damage": 3, "traits": ["melee", "clumsy"] },
    { "id": "rattle_gun", "range": 24, "shots": 3, "damage": 0, "traits": ["heavy"] },
    { "id": "ripper_sword", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee"] },
    { "id": "scrap_pistol", "range": 9, "shots": 1, "damage": 0, "traits": ["pistol"] },
    { "id": "shatter_axe", "range": "brawl", "shots": 0, "damage": 2, "traits": ["melee"] },
    { "id": "shell_gun", "range": 30, "shots": 2, "damage": 0, "traits": ["heavy", "area"] },
    { "id": "shotgun", "range": 12, "shots": 2, "damage": 1, "traits": ["focused"] },
    { "id": "supression_maul", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee", "impact"] },
    // Natural Weapons
    { "id": "claws_d1", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee"] },
    { "id": "smash_d0", "range": "brawl", "shots": 0, "damage": 0, "traits": ["melee"] },
    { "id": "fangs_d0", "range": "brawl", "shots": 0, "damage": 0, "traits": ["melee"] },
    { "id": "fangs_d1", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee"] },
    { "id": "mandibles_d1", "range": "brawl", "shots": 0, "damage": 1, "traits": ["melee"] },
    { "id": "touch_d3", "range": "brawl", "shots": 0, "damage": 3, "traits": ["melee"] }
];


// --- STARTING EQUIPMENT TABLES ---

interface EquipmentTableEntry {
  roll_range: [number, number];
  value: { type: 'weapon' | 'armor' | 'screen' | 'consumable', id: string };
}
interface WeaponTableEntry {
  roll_range: [number, number];
  value: { type: 'weapon', id: string };
}

export const LOW_TECH_WEAPON_TABLE: WeaponTableEntry[] = [
    { roll_range: [1, 15], value: { type: 'weapon', id: 'hand_gun' } },
    { roll_range: [16, 35], value: { type: 'weapon', id: 'scrap_pistol' } },
    { roll_range: [36, 40], value: { type: 'weapon', id: 'machine_pistol' } },
    { roll_range: [41, 65], value: { type: 'weapon', id: 'colony_rifle' } },
    { roll_range: [66, 75], value: { type: 'weapon', id: 'shotgun' } },
    { roll_range: [76, 80], value: { type: 'weapon', id: 'hunting_rifle' } },
    { roll_range: [81, 95], value: { type: 'weapon', id: 'blade' } },
    { roll_range: [96, 100], value: { type: 'weapon', id: 'brutal_melee_weapon' } },
];

export const MILITARY_WEAPON_TABLE: WeaponTableEntry[] = [
    { roll_range: [1, 25], value: { type: 'weapon', id: 'military_rifle' } },
    { roll_range: [26, 45], value: { type: 'weapon', id: 'infantry_laser' } },
    { roll_range: [46, 50], value: { type: 'weapon', id: 'marksman_rifle' } },
    { roll_range: [51, 60], value: { type: 'weapon', id: 'needle_rifle' } },
    { roll_range: [61, 75], value: { type: 'weapon', id: 'auto_rifle' } },
    { roll_range: [76, 80], value: { type: 'weapon', id: 'rattle_gun' } },
    { roll_range: [81, 95], value: { type: 'weapon', id: 'boarding_saber' } },
    { roll_range: [96, 100], value: { type: 'weapon', id: 'shatter_axe' } },
];

export const HIGH_TECH_WEAPON_TABLE: WeaponTableEntry[] = [
    { roll_range: [1, 5], value: { type: 'weapon', id: 'dueling_pistol' } },
    { roll_range: [6, 15], value: { type: 'weapon', id: 'hand_cannon' } },
    { roll_range: [16, 30], value: { type: 'weapon', id: 'hand_laser' } },
    { roll_range: [31, 45], value: { type: 'weapon', id: 'beam_pistol' } },
    { roll_range: [46, 55], value: { type: 'weapon', id: 'infantry_laser' } },
    { roll_range: [56, 70], value: { type: 'weapon', id: 'blast_pistol' } },
    { roll_range: [71, 80], value: { type: 'weapon', id: 'blast_rifle' } },
    { roll_range: [81, 85], value: { type: 'weapon', id: 'plasma_rifle' } },
    { roll_range: [86, 100], value: { type: 'weapon', id: 'glare_sword' } },
];

export const GEAR_TABLE: EquipmentTableEntry[] = [
    { roll_range: [1, 4], value: { type: 'weapon', id: 'blade' } },
    { roll_range: [5, 10], value: { type: 'consumable', id: 'binoculars' } },
    { roll_range: [11, 15], value: { type: 'consumable', id: 'toolkit' } },
    { roll_range: [16, 20], value: { type: 'consumable', id: 'booster_pills' } },
    { roll_range: [21, 24], value: { type: 'screen', id: 'camo_cloak' } },
    { roll_range: [25, 28], value: { type: 'armor', id: 'combat_armor' } },
    { roll_range: [29, 33], value: { type: 'consumable', id: 'communicator' } },
    { roll_range: [34, 37], value: { type: 'weapon', id: 'blade' } },
    { roll_range: [38, 42], value: { type: 'consumable', id: 'data-spike' } },
    { roll_range: [43, 46], value: { type: 'consumable', id: 'med-patch' } },
    { roll_range: [47, 52], value: { type: 'armor', id: 'frag_vest' } },
    { roll_range: [53, 57], value: { type: 'consumable', id: 'grapple_gun' } },
    { roll_range: [58, 61], value: { type: 'armor', id: 'flex_armor' } },
    { roll_range: [62, 65], value: { type: 'consumable', id: 'rations' } },
    { roll_range: [66, 69], value: { type: 'consumable', id: 'rage_out' } },
    { roll_range: [70, 75], value: { type: 'consumable', id: 'med-patch' } },
    { roll_range: [76, 81], value: { type: 'consumable', id: 'stim-pack' } },
    { roll_range: [82, 85], value: { type: 'consumable', id: 'still' } },
    { roll_range: [86, 89], value: { type: 'consumable', id: 'binoculars' } },
    { roll_range: [90, 92], value: { type: 'consumable', id: 'data-spike' } },
    { roll_range: [93, 96], value: { type: 'consumable', id: 'combat_serum' } },
    { roll_range: [97, 100], value: { type: 'consumable', id: 'toolkit' } },
];

export const GADGET_TABLE: EquipmentTableEntry[] = [
    { roll_range: [1, 4], value: { type: 'consumable', id: 'kiranin_crystals' } },
    { roll_range: [5, 9], value: { type: 'consumable', id: 'data-spike' } },
    { roll_range: [10, 13], value: { type: 'consumable', id: 'combat_serum' } },
    { roll_range: [14, 17], value: { type: 'consumable', id: 'rage_out' } },
    { roll_range: [18, 21], value: { type: 'consumable', id: 'booster_pills' } },
    { roll_range: [22, 24], value: { type: 'consumable', id: 'toolkit' } },
    { roll_range: [25, 27], value: { type: 'screen', id: 'deflector_field' } },
    { roll_range: [28, 31], value: { type: 'consumable', id: 'kiranin_crystals' } },
    { roll_range: [32, 36], value: { type: 'consumable', id: 'rations' } },
    { roll_range: [37, 41], value: { type: 'consumable', id: 'grapple_gun' } },
    { roll_range: [42, 46], value: { type: 'consumable', id: 'grapple_gun' } },
    { roll_range: [47, 50], value: { type: 'consumable', id: 'stim-pack' } },
    { roll_range: [51, 55], value: { type: 'consumable', id: 'toolkit' } },
    { roll_range: [56, 60], value: { type: 'consumable', id: 'binoculars' } },
    { roll_range: [61, 65], value: { type: 'screen', id: 'screen_generator' } },
    { roll_range: [66, 69], value: { type: 'consumable', id: 'binoculars' } },
    { roll_range: [70, 73], value: { type: 'consumable', id: 'still' } },
    { roll_range: [74, 79], value: { type: 'consumable', id: 'communicator' } },
    { roll_range: [80, 83], value: { type: 'weapon', id: 'dazzle_grenade' } },
    { roll_range: [84, 89], value: { type: 'consumable', id: 'still' } },
    { roll_range: [90, 93], value: { type: 'armor', id: 'stealth_gear' } },
    { roll_range: [94, 100], value: { type: 'consumable', id: 'stim-pack' } },
];