import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore, useShipStore, useCampaignProgressStore } from '../../stores';
import Modal from '../ui/Modal';
import { AlertTriangle, Coins } from 'lucide-react';
import { sanitizeToText } from '../../services/utils/sanitization';

interface SellGearForFuelModalProps {
  onClose: () => void;
  fuelNeeded: number;
}

type SellableItem = {
  charId: string | 'stash';
  instanceId: string;
  itemId: string;
  itemType: string;
  name: string;
};

const SellGearForFuelModal: React.FC<SellGearForFuelModalProps> = ({ onClose, fuelNeeded }) => {
  const { t } = useTranslation();
  const crew = useCrewStore(state => state.crew);
  const { stash } = useShipStore(state => state);
  const { campaign, actions } = useCampaignProgressStore();
  const [selectedItems, setSelectedItems] = useState<SellableItem[]>([]);

  const allItems: SellableItem[] = useMemo(() => {
    const items: SellableItem[] = [];
    if (!crew || !stash) return items;

    for (const char of crew.members) {
      const charName = sanitizeToText(char.name);
      char.weapons.forEach(w => items.push({ charId: char.id, instanceId: w.instanceId, itemId: w.weaponId, itemType: 'weapon', name: `${t(`weapons.${w.weaponId}`)} (${charName})` }));
      if (char.armor) items.push({ charId: char.id, instanceId: char.armor, itemId: char.armor, itemType: 'armor', name: `${t(`protective_devices.${char.armor}`)} (${charName})` });
      if (char.screen) items.push({ charId: char.id, instanceId: char.screen, itemId: char.screen, itemType: 'screen', name: `${t(`protective_devices.${char.screen}`)} (${charName})` });
      char.consumables.forEach(c => items.push({ charId: char.id, instanceId: c, itemId: c, itemType: 'consumable', name: `${t(`consumables.${c}`)} (${charName})` }));
    }

    stash.weapons.forEach(w => items.push({ charId: 'stash', instanceId: w.instanceId, itemId: w.weaponId, itemType: 'weapon', name: `${t(`weapons.${w.weaponId}`)} (Stash)` }));
    stash.armor.forEach(a => items.push({ charId: 'stash', instanceId: a, itemId: a, itemType: 'armor', name: `${t(`protective_devices.${a}`)} (Stash)` }));
    stash.screen.forEach(s => items.push({ charId: 'stash', instanceId: s, itemId: s, itemType: 'screen', name: `${t(`protective_devices.${s}`)} (Stash)` }));
    stash.consumables.forEach(c => items.push({ charId: 'stash', instanceId: c, itemId: c, itemType: 'consumable', name: `${t(`consumables.${c}`)} (Stash)` }));

    return items;
  }, [crew, stash, t]);

  const handleToggleItem = (item: SellableItem) => {
    setSelectedItems(prev => {
      if (prev.some(i => i.instanceId === item.instanceId)) {
        return prev.filter(i => i.instanceId !== item.instanceId);
      }
      return [...prev, item];
    });
  };

  const creditsGenerated = Math.floor(selectedItems.length / 2);
  const creditsNeeded = fuelNeeded - (campaign?.credits ?? 0);
  const canFlee = creditsGenerated >= creditsNeeded;

  const handleConfirm = () => {
    actions.sellItemsForFuelAndFlee(selectedItems);
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Sell Gear for Fuel">
      <Card className="w-full sm:max-w-2xl bg-surface-overlay !p-0">
        <div className='p-6'>
            <div className='text-center mb-4'>
                <AlertTriangle className='w-12 h-12 text-warning mx-auto mb-4' />
                <h3 className='text-xl font-bold text-warning'>Insufficient Fuel</h3>
                <p className='text-text-muted mt-2'>You must sell gear at a loss (2 items for 1 credit) to afford the fuel cost.</p>
            </div>

            <div className='flex justify-around items-center p-3 bg-surface-base rounded-md mb-4 text-center'>
                <div>
                    <p className='text-xs uppercase text-text-muted'>Fuel Cost</p>
                    <p className='font-bold text-lg'>{fuelNeeded} cr</p>
                </div>
                <div>
                    <p className='text-xs uppercase text-text-muted'>Credits Needed</p>
                    <p className='font-bold text-lg text-danger'>{creditsNeeded} cr</p>
                </div>
                 <div>
                    <p className='text-xs uppercase text-text-muted'>Credits Generated</p>
                    <p className={`font-bold text-lg ${canFlee ? 'text-success' : 'text-warning'}`}>{creditsGenerated} cr</p>
                </div>
            </div>

            <div className='space-y-2 max-h-64 overflow-y-auto pr-2 border-t border-b border-border/50 py-2'>
                {allItems.map(item => (
                    <label key={item.instanceId} className='flex items-center gap-3 p-2 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80'>
                         <input
                            type="checkbox"
                            checked={selectedItems.some(i => i.instanceId === item.instanceId)}
                            onChange={() => handleToggleItem(item)}
                            className='form-checkbox h-4 w-4 text-primary bg-surface-base border-border focus:ring-primary'
                          />
                          <span className='text-sm text-text-base'>{item.name}</span>
                    </label>
                ))}
            </div>

            <div className='mt-6 flex justify-end gap-4'>
                <Button onClick={onClose} variant='secondary'>Cancel</Button>
                <Button onClick={handleConfirm} disabled={!canFlee} variant='primary'>
                    <Coins size={16} /> Sell &amp; Attempt Flee
                </Button>
            </div>
        </div>
      </Card>
    </Modal>
  );
};

export default SellGearForFuelModal;