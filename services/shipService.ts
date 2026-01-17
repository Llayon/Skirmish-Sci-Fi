import { Ship } from '../types';
import { SHIP_TABLE } from '../constants/ships';
import { rollD6, rollD100 } from './utils/rolls';

export const generateStartingShip = (): { ship: Ship; debt: number } => {
  const roll = rollD100();
  const shipEntry = SHIP_TABLE.find(e => roll >= e.range[0] && roll <= e.range[1])!;
  
  const debtRoll = rollD6();
  const totalDebt = shipEntry.debtBase + debtRoll;

  const ship: Ship = {
    id: shipEntry.id,
    nameKey: shipEntry.nameKey,
    hull: shipEntry.hull,
    maxHull: shipEntry.hull,
    traits: shipEntry.traits,
    components: [],
  };

  return { ship, debt: totalDebt };
};
