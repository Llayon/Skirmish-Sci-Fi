
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Ship, OnBoardItemId, CharacterWeapon, Stash, ShipComponentId } from '../types';
import { uiService } from '../services/uiService';

interface ShipState {
  ship: Ship | null;
  stash: Stash | null;
  actions: {
    setShipAndStash: (ship: Ship | null, stash: Stash | null) => void;
    updateShip: (recipe: (ship: Ship) => void) => void;
    updateStash: (recipe: (stash: Stash) => void) => void;
    addItemToStash: (item: { instanceId?: string; weaponId?: string; id: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'onBoardItem' | 'gunMod' | 'gunSight' | 'implant' | 'utilityDevice' }) => void;
    removeItemFromStash: (item: { instanceId?: string; weaponId?: string; id?: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'utilityDevice' | 'onBoardItem' }) => boolean;
    removeItemsFromStash: (itemsToRemove: { instanceId: string; type: string }[]) => void;
    removeModFromStash: (modId: string) => boolean;
    addModToStash: (modId: string) => void;
    removeSightFromStash: (sightId: string) => boolean;
    addSightToStash: (sightId: string) => void;
    installComponent: (componentId: ShipComponentId) => void;
  };
}

const initialState: Omit<ShipState, 'actions'> = {
  ship: null,
  stash: null,
};

export const useShipStore = create<ShipState>()(
  immer((set, get) => ({
    ...initialState,
    actions: {
      setShipAndStash: (ship, stash) => set({ ship, stash }),
      updateShip: (recipe) => set(state => { if (state.ship) { recipe(state.ship); } }),
      updateStash: (recipe) => set(state => { if (state.stash) { recipe(state.stash); } }),
      addItemToStash: (item) => {
        const { ship, stash } = get();
        if (!ship && stash) {
          const stashCount = stash.weapons.length + stash.armor.length + stash.screen.length + stash.consumables.length + stash.implants.length + stash.utilityDevices.length;
          if (stashCount >= 5) {
            uiService.showToast("Cannot move item to stash. Stash is full (max 5 items without a ship).", "warning");
            return;
          }
        }
        
        get().actions.updateStash(s => {
          const instanceId = item.instanceId || item.id!;
          const weaponId = item.weaponId || (item.type === 'weapon' ? item.id : undefined);
          
          if (item.type === 'weapon' && weaponId) s.weapons.push({ instanceId, weaponId });
          else if (item.type === 'armor') s.armor.push(instanceId);
          else if (item.type === 'screen') s.screen.push(instanceId);
          else if (item.type === 'consumable') s.consumables.push(instanceId);
          else if (item.type === 'onBoardItem') s.onBoardItems.push(instanceId as OnBoardItemId);
          else if (item.type === 'gunMod') {
            if (!s.gunMods) s.gunMods = [];
            s.gunMods.push(instanceId);
          } else if (item.type === 'gunSight') {
            s.sights.push(instanceId);
          } else if (item.type === 'implant') {
            s.implants.push(instanceId);
          } else if (item.type === 'utilityDevice') {
            s.utilityDevices.push(instanceId);
          }
        });
      },
      removeItemFromStash: (item) => {
        let itemFound = false;
        get().actions.updateStash(stash => {
          const instanceId = item.instanceId || item.id!;
          if (item.type === 'weapon') {
              const index = stash.weapons.findIndex(w => w.instanceId === instanceId);
              if (index > -1) { stash.weapons.splice(index, 1); itemFound = true; }
          } else if (item.type === 'armor') {
              const index = stash.armor.indexOf(instanceId);
              if (index > -1) { stash.armor.splice(index, 1); itemFound = true; }
          } else if (item.type === 'screen') {
              const index = stash.screen.indexOf(instanceId);
              if (index > -1) { stash.screen.splice(index, 1); itemFound = true; }
          } else if (item.type === 'consumable') {
              const index = stash.consumables.indexOf(instanceId);
              if (index > -1) { stash.consumables.splice(index, 1); itemFound = true; }
          } else if (item.type === 'implant') {
              const index = stash.implants.indexOf(instanceId);
              if (index > -1) { stash.implants.splice(index, 1); itemFound = true; }
          } else if (item.type === 'utilityDevice') {
              const index = stash.utilityDevices.indexOf(instanceId);
              if (index > -1) { stash.utilityDevices.splice(index, 1); itemFound = true; }
          } else if (item.type === 'onBoardItem') {
              const index = stash.onBoardItems.indexOf(instanceId as OnBoardItemId);
              if (index > -1) {
                  stash.onBoardItems.splice(index, 1);
                  itemFound = true;
              }
          }
        });
        return itemFound;
      },
      removeItemsFromStash: (itemsToRemove) => {
        get().actions.updateStash(stash => {
          itemsToRemove.forEach(item => {
            switch(item.type) {
              case 'weapon': stash.weapons = stash.weapons.filter(w => w.instanceId !== item.instanceId); break;
              case 'armor': stash.armor = stash.armor.filter(id => id !== item.instanceId); break;
              case 'screen': stash.screen = stash.screen.filter(id => id !== item.instanceId); break;
              case 'consumable': stash.consumables = stash.consumables.filter(id => id !== item.instanceId); break;
              // Add other types if they become sellable
            }
          });
        });
      },
      removeModFromStash: (modId) => {
        let found = false;
        get().actions.updateStash(stash => {
            const index = stash.gunMods.indexOf(modId);
            if (index > -1) {
                stash.gunMods.splice(index, 1);
                found = true;
            }
        });
        return found;
      },
      addModToStash: (modId) => {
        get().actions.updateStash(stash => {
            if (!stash.gunMods) stash.gunMods = [];
            stash.gunMods.push(modId);
        });
      },
      removeSightFromStash: (sightId) => {
        let found = false;
        get().actions.updateStash(stash => {
            const index = stash.sights.indexOf(sightId);
            if (index > -1) {
                stash.sights.splice(index, 1);
                found = true;
            }
        });
        return found;
      },
      addSightToStash: (sightId) => {
        get().actions.updateStash(stash => {
            stash.sights.push(sightId);
        });
      },
      installComponent: (componentId) => {
        get().actions.updateShip(ship => {
          if (!ship.components.includes(componentId)) {
            ship.components.push(componentId);
          }
        });
      },
    },
  }))
);
