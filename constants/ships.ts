import { ShipTrait } from '../types';

interface ShipTableEntry {
  range: [number, number];
  id: string;
  nameKey: string;
  debtBase: number;
  hull: number;
  traits: ShipTrait[];
}

export const SHIP_TABLE: ShipTableEntry[] = [
  { range: [1, 12], id: 'worn_freighter', nameKey: 'ships.worn_freighter', debtBase: 20, hull: 30, traits: [] },
  { range: [13, 18], id: 'retired_troop_transport', nameKey: 'ships.retired_troop_transport', debtBase: 30, hull: 35, traits: ['emergency_drives'] },
  { range: [19, 23], id: 'strange_alien_vessel', nameKey: 'ships.strange_alien_vessel', debtBase: 15, hull: 25, traits: [] },
  { range: [24, 31], id: 'upgraded_shuttle', nameKey: 'ships.upgraded_shuttle', debtBase: 10, hull: 20, traits: [] },
  { range: [32, 38], id: 'retired_scout_ship', nameKey: 'ships.retired_scout_ship', debtBase: 20, hull: 25, traits: ['fuel_efficient'] },
  { range: [39, 45], id: 'repurposed_science_vessel', nameKey: 'ships.repurposed_science_vessel', debtBase: 10, hull: 20, traits: [] },
  { range: [46, 56], id: 'battered_mining_ship', nameKey: 'ships.battered_mining_ship', debtBase: 20, hull: 35, traits: ['fuel_hog'] },
  { range: [57, 65], id: 'unreliable_merchant_cruiser', nameKey: 'ships.unreliable_merchant_cruiser', debtBase: 20, hull: 30, traits: [] },
  { range: [66, 70], id: 'former_diplomatic_vessel', nameKey: 'ships.former_diplomatic_vessel', debtBase: 15, hull: 25, traits: [] },
  { range: [71, 76], id: 'ancient_low_tech_craft', nameKey: 'ships.ancient_low_tech_craft', debtBase: 20, hull: 35, traits: ['dodgy_drive'] },
  { range: [77, 84], id: 'built_from_salvaged_wrecks', nameKey: 'ships.built_from_salvaged_wrecks', debtBase: 20, hull: 30, traits: [] },
  { range: [85, 95], id: 'worn_colony_ship', nameKey: 'ships.worn_colony_ship', debtBase: 20, hull: 25, traits: ['standard_issue'] },
  { range: [96, 100], id: 'retired_military_patrol_ship', nameKey: 'ships.retired_military_patrol_ship', debtBase: 35, hull: 40, traits: ['armored'] },
];
