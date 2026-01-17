import { Weapon, Consumable, ProtectiveDevice, OnBoardItemId, OnBoardItem, ShipComponent, GunMod, GunSight, Implant, UtilityDevice } from '../../types';
import { WEAPONS, CONSUMABLES, PROTECTIVE_DEVICES, GUN_MODS, GUN_SIGHTS, IMPLANTS, UTILITY_DEVICES } from '../../constants/items';
import { ON_BOARD_ITEMS } from '../../constants/onBoardItems';
import { SHIP_COMPONENTS } from '../../constants/shipComponents';

export const getWeaponById = (id: string): Weapon | undefined => WEAPONS.find(w => w.id === id);
export const getConsumableById = (id: string): Consumable | undefined => CONSUMABLES.find(c => c.id === id);
export const getProtectiveDeviceById = (id: string | undefined): ProtectiveDevice | undefined => PROTECTIVE_DEVICES.find(d => d.id === id);
export const getOnBoardItemById = (id: OnBoardItemId): OnBoardItem | undefined => ON_BOARD_ITEMS.find(i => i.id === id);
export const getShipComponentById = (id: string): ShipComponent | undefined => SHIP_COMPONENTS.find(c => c.id === id);
export const getGunModById = (id: string): GunMod | undefined => GUN_MODS.find(m => m.id === id);
export const getGunSightById = (id: string): GunSight | undefined => GUN_SIGHTS.find(s => s.id === id);
export const getImplantById = (id: string): Implant | undefined => IMPLANTS.find(i => i.id === id);
export const getUtilityDeviceById = (id: string): UtilityDevice | undefined => UTILITY_DEVICES.find(d => d.id === id);