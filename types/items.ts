export interface GunMod {
  id: string;
  traits?: string[];
}

export interface GunSight {
  id: string;
  traits?: string[];
}

export interface Implant {
  id: string;
  statModifiers?: {
    reactions?: number;
    speed?: number;
    combat?: number;
    toughness?: number;
    savvy?: number;
    luck?: number;
  };
  traits?: string[];
}

export type UtilityDeviceEffectType = 'passive' | 'active_action' | 'active_free';

export interface UtilityDevice {
  id: string;
  effectType?: UtilityDeviceEffectType;
  duration?: number; // in rounds, -1 for permanent
  traits?: string[];
}

export interface CharacterWeapon {
  instanceId: string;
  weaponId: string;
  modId?: string;
  sightId?: string;
}

export interface Consumable {
  id: string;
}

export type ProtectiveDeviceTrait =
  | 'camo_cloak'
  | 'deflector_field'
  | 'battle_dress_reactions'
  | 'flak_screen_damage_reduction'
  | 'flex_armor_toughness'
  | 'frag_vest_area_save'
  | 'screen_generator_ranged_save'
  | 'stealth_gear_long_range_penalty';

export interface ProtectiveDevice {
  id: string;
  type: 'armor' | 'screen';
  savingThrow?: number;
  traits?: ProtectiveDeviceTrait[];
}

export interface Weapon {
  id: string;
  range: number | 'brawl';
  shots: number;
  damage: number;
  traits: string[];
  instanceId?: string; // For effective weapon representation
  modId?: string;      // For effective weapon representation
  sightId?: string;    // For effective weapon representation
}

export type OnBoardItemId =
  | 'analyzer' | 'colonist_ration_packs' | 'duplicator' | 'fake_id' | 'fixer'
  | 'genetic_reconfiguration_kit' | 'loaded_dice' | 'lucky_dice' | 'mk_II_translator'
  | 'med-patch' | 'meditation_orb' | 'nano-doc' | 'novelty_stuffed_animal'
  | 'purifier' | 'repair_bot' | 'sector_permit' | 'spare_parts'
  | 'military_fuel_cell'
  | 'teach-bot' | 'transcender';

export type OnBoardItemType = 'passive' | 'manual_consumable' | 'auto_consumable' | 'active';

export interface OnBoardItem {
  id: OnBoardItemId;
  nameKey: string;
  effectKey: string;
  type: OnBoardItemType;
}

export type ShipComponentId =
  | 'medical_bay' | 'cargo_hold' | 'database' | 'shuttle' | 'merchant_link'
  | 'drop_launcher' | 'probe_launcher' | 'auto_turrets' | 'military_nav_system'
  | 'improved_shielding' | 'hidden_compartment' | 'suspension_pod'
  | 'living_quarters' | 'military_fuel_converters';

export interface ShipComponent {
    id: ShipComponentId;
    nameKey: string;
    cost: number;
    effectKey: string;
}

export interface EquipmentPool {
    weapons: string[];
    armor: string[];
    screen: string[];
    consumables: string[];
}

export type LootItem = {
    type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'gun_mod' | 'gun_sight' | 'utility_device' | 'ship_item';
    id: string;
    amount: number;
};

export type LootResult = {
    items: LootItem[];
    credits: number;
    rumors: number;
    storyPoints: number;
    discount: number;
    damaged: boolean;
};