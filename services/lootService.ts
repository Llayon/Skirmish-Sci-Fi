
import { rollD100, rollD6 } from './utils/rolls';
import { resolveTable } from './utils/tables';
import * as lootTables from '../constants/lootTables';
import { getProtectiveDeviceById } from './data/items';
import { LootItem, LootResult } from '../types';
import { GEAR_TABLE, LOW_TECH_WEAPON_TABLE } from '../constants/items';

const rollOnWeaponTable = (): LootItem => {
    const category = resolveTable(lootTables.WEAPON_CATEGORY_SUBTABLE, rollD100()).value;
    switch (category) {
        case 'slug_weapons': 
            return { type: 'weapon', id: resolveTable(lootTables.SLUG_WEAPONS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'energy_weapons':
            return { type: 'weapon', id: resolveTable(lootTables.ENERGY_WEAPONS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'special_weapons':
            return { type: 'weapon', id: resolveTable(lootTables.SPECIAL_WEAPONS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'melee_weapons':
            return { type: 'weapon', id: resolveTable(lootTables.MELEE_WEAPONS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'grenades':
            const grenade = resolveTable(lootTables.GRENADES_SUBTABLE, rollD100()).value;
            return { type: 'weapon', id: grenade.id, amount: grenade.amount };
        default:
            return { type: 'weapon', id: 'blade', amount: 1 };
    }
};

const rollOnGearTable = (): LootItem => {
    const category = resolveTable(lootTables.GEAR_SUBTABLE, rollD100()).value;
    switch (category) {
        case 'gun_mods':
            return { type: 'gun_mod', id: resolveTable(lootTables.GUN_MODS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'gun_sights':
            return { type: 'gun_sight', id: resolveTable(lootTables.GUN_SIGHTS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'protective_items': {
            const id = resolveTable(lootTables.PROTECTIVE_ITEMS_SUBTABLE, rollD100()).value;
            const device = getProtectiveDeviceById(id);
            return { type: device?.type || 'armor', id, amount: 1 };
        }
        case 'utility_items':
            return { type: 'utility_device', id: resolveTable(lootTables.UTILITY_ITEMS_SUBTABLE, rollD100()).value, amount: 1 };
        default:
             return { type: 'consumable', id: 'stim-pack', amount: 1 };
    }
};

const rollOnOddsAndEndsTable = (): LootItem => {
    const category = resolveTable(lootTables.ODDS_AND_ENDS_TABLE, rollD100()).value;
    switch(category) {
        case 'consumables':
            return { type: 'consumable', id: resolveTable(lootTables.CONSUMABLES_SUBTABLE, rollD100()).value, amount: 2 };
        case 'implants':
            return { type: 'implant', id: resolveTable(lootTables.IMPLANTS_SUBTABLE, rollD100()).value, amount: 1 };
        case 'ship_items':
            return { type: 'ship_item', id: resolveTable(lootTables.SHIP_ITEMS_SUBTABLE, rollD100()).value, amount: 1 };
        default:
             return { type: 'consumable', id: 'stim-pack', amount: 1 };
    }
};

export const rollOnLootTable = (): LootResult => {
    const mainCategoryRoll = rollD100();
    const category = resolveTable(lootTables.LOOT_TABLE, mainCategoryRoll).value;
    
    const result: LootResult = { items: [], credits: 0, rumors: 0, storyPoints: 0, discount: 0, damaged: false };

    switch(category) {
        case 'weapon':
        case 'damaged_weapon': {
            const rolls = category === 'damaged_weapon' ? 2 : 1;
            for (let i = 0; i < rolls; i++) {
                result.items.push(rollOnWeaponTable());
            }
            result.damaged = category === 'damaged_weapon';
            break;
        }
        case 'gear':
        case 'damaged_gear': {
            const rolls = category === 'damaged_gear' ? 2 : 1;
             for (let i = 0; i < rolls; i++) {
                result.items.push(rollOnGearTable());
            }
            result.damaged = category === 'damaged_gear';
            break;
        }
        case 'odds_and_ends':
            result.items.push(rollOnOddsAndEndsTable());
            break;
        case 'rewards': {
            const rewardType = resolveTable(lootTables.REWARDS_TABLE, rollD100()).value;
            switch(rewardType) {
                case 'rumors_1': result.rumors = 1; break;
                case 'rumors_2': result.rumors = 2; break;
                case 'credits_3': result.credits = 3; break;
                case 'credits_d6': result.credits = rollD6(); break;
                case 'credits_d6_2': result.credits = rollD6() + 2; break;
                case 'credits_2d6_high': result.credits = Math.max(rollD6(), rollD6()); break;
                case 'discount_d6': result.discount = rollD6(); break;
                case 'discount_d6_2': result.discount = rollD6() + 2; break;
                case 'story_points_2': result.storyPoints = 2; break;
                case 'story_points_3': result.storyPoints = 3; break;
            }
            break;
        }
        default:
            break;
    }
    
    return result;
};

export const getLootFromTradeTable = (type: string, damaged: boolean = false): LootResult => {
    const result: LootResult = { items: [], credits: 0, rumors: 0, storyPoints: 0, discount: 0, damaged };
    let lootItem: LootItem | null = null;

    switch (type) {
        case 'low_tech_weapon': {
            const weaponEntry = resolveTable(LOW_TECH_WEAPON_TABLE, rollD100()).value;
            lootItem = { type: 'weapon', id: weaponEntry.id, amount: 1 };
            break;
        }
        case 'gear': {
            const gearEntry = resolveTable(GEAR_TABLE, rollD100()).value;
            lootItem = { type: gearEntry.type as any, id: gearEntry.id, amount: 1 };
            break;
        }
        case 'loot': {
            // This rolls on the main loot table which returns a full result
            const lootRollResult = rollOnLootTable();
            lootRollResult.damaged = damaged; // Apply damaged status if applicable
            return lootRollResult;
        }
        case 'gear_subsection': {
            const gearCategory = resolveTable(lootTables.GEAR_SUBTABLE, rollD100()).value;
            switch(gearCategory) {
                case 'gun_mods':
                    lootItem = { type: 'gun_mod', id: resolveTable(lootTables.GUN_MODS_SUBTABLE, rollD100()).value, amount: 1 };
                    break;
                case 'gun_sights':
                    lootItem = { type: 'gun_sight', id: resolveTable(lootTables.GUN_SIGHTS_SUBTABLE, rollD100()).value, amount: 1 };
                    break;
                case 'protective_items': {
                    const protId = resolveTable(lootTables.PROTECTIVE_ITEMS_SUBTABLE, rollD100()).value;
                    const protDevice = getProtectiveDeviceById(protId);
                    lootItem = { type: protDevice?.type || 'armor', id: protId, amount: 1 };
                    break;
                }
                case 'utility_items':
                    lootItem = { type: 'utility_device', id: resolveTable(lootTables.UTILITY_ITEMS_SUBTABLE, rollD100()).value, amount: 1 };
                    break;
            }
            break;
        }
        default:
            break;
    }

    if (lootItem) {
        result.items.push(lootItem);
    }
    
    return result;
};
