import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore, useShipStore, useCampaignProgressStore } from '../../stores';
import Modal from '../ui/Modal';
import { sanitizeToText } from '@/services/utils/sanitization';
import { getWeaponById, getProtectiveDeviceById, getConsumableById, getUtilityDeviceById, getImplantById } from '@/services/data/items';

type DuplicatableItem = {
  instanceId: string;
  itemId: string;
  type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'utilityDevice' | 'implant';
  name: string;
  location: string;
  charId?: string;
};

const DuplicatorModal: React.FC = () => {
  const { t } = useTranslation();
  const { crew } = useCrewStore();
  const { stash } = useShipStore();
  const { resolveItemChoice, updateCampaign } = useCampaignProgressStore(state => state.actions);
  const [selectedItem, setSelectedItem] = useState<DuplicatableItem | null>(null);

  const allItems = useMemo((): DuplicatableItem[] => {
    const items: DuplicatableItem[] = [];
    if (!crew || !stash) return items;

    // Helper to get item name
    const getItemName = (type: string, id: string) => {
        switch (type) {
            case 'weapon': return t(`weapons.${id}`);
            case 'armor': case 'screen': return t(`protective_devices.${id}`);
            case 'consumable': return t(`consumables.${id}`);
            case 'utilityDevice': return t(`utility_devices.${id}`);
            case 'implant': return t(`implants.${id}`);
            default: return id;
        }
    };

    // Stash items
    stash.weapons.forEach(w => items.push({ instanceId: w.instanceId, itemId: w.weaponId, type: 'weapon', name: getItemName('weapon', w.weaponId), location: t('labels.stash'), charId: 'stash' }));
    stash.armor.forEach(id => items.push({ instanceId: id, itemId: id, type: 'armor', name: getItemName('armor', id), location: t('labels.stash'), charId: 'stash' }));
    stash.screen.forEach(id => items.push({ instanceId: id, itemId: id, type: 'screen', name: getItemName('screen', id), location: t('labels.stash'), charId: 'stash' }));
    stash.consumables.forEach(id => items.push({ instanceId: id, itemId: id, type: 'consumable', name: getItemName('consumable', id), location: t('labels.stash'), charId: 'stash' }));
    stash.utilityDevices.forEach(id => items.push({ instanceId: id, itemId: id, type: 'utilityDevice', name: getItemName('utilityDevice', id), location: t('labels.stash'), charId: 'stash' }));
    stash.implants.forEach(id => items.push({ instanceId: id, itemId: id, type: 'implant', name: getItemName('implant', id), location: t('labels.stash'), charId: 'stash' }));
    
    // Crew items
    crew.members.forEach(char => {
      const charName = sanitizeToText(char.name);
      char.weapons.forEach(w => items.push({ instanceId: w.instanceId, itemId: w.weaponId, type: 'weapon', name: getItemName('weapon', w.weaponId), location: charName, charId: char.id }));
      if (char.armor) items.push({ instanceId: char.armor, itemId: char.armor, type: 'armor', name: getItemName('armor', char.armor), location: charName, charId: char.id });
      if (char.screen) items.push({ instanceId: char.screen, itemId: char.screen, type: 'screen', name: getItemName('screen', char.screen), location: charName, charId: char.id });
      char.consumables.forEach(id => items.push({ instanceId: id, itemId: id, type: 'consumable', name: getItemName('consumable', id), location: charName, charId: char.id }));
      char.utilityDevices.forEach(id => items.push({ instanceId: id, itemId: id, type: 'utilityDevice', name: getItemName('utilityDevice', id), location: charName, charId: char.id }));
      char.implants.forEach(id => items.push({ instanceId: id, itemId: id, type: 'implant', name: getItemName('implant', id), location: charName, charId: char.id }));
    });

    return items;
  }, [crew, stash, t]);

  const handleClose = () => {
    updateCampaign(c => { c.pendingItemChoice = undefined; });
  };

  const handleConfirm = () => {
    if (selectedItem) {
      resolveItemChoice('duplicator', { item: selectedItem });
      handleClose();
    }
  };

  return (
    <Modal onClose={handleClose} title={t('on_board_items.duplicator')}>
      <Card className='w-full sm:max-w-md bg-surface-overlay !p-0'>
        <div className='p-6'>
          <p className='text-text-muted mb-4'>{t('tooltips.on_board_items.duplicator')}</p>
          <div className='space-y-2 max-h-80 overflow-y-auto pr-2'>
            {allItems.map(item => (
              <label key={item.instanceId} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border-2 ${selectedItem?.instanceId === item.instanceId ? 'bg-primary/20 border-primary' : 'bg-surface-base/50 border-transparent hover:border-border'}`}>
                <input
                  type="radio"
                  name="item-to-duplicate"
                  checked={selectedItem?.instanceId === item.instanceId}
                  onChange={() => setSelectedItem(item)}
                  className="form-radio h-4 w-4 text-primary bg-surface-base border-border focus:ring-primary"
                />
                <div>
                  <span className='font-bold text-text-base'>{item.name}</span>
                  <span className='text-xs text-text-muted block'>({item.location})</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className='mt-auto flex justify-end gap-4 border-t border-border pt-4 px-6'>
          <Button onClick={handleClose} variant='secondary'>{t('buttons.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!selectedItem}>{t('buttons.confirm')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default DuplicatorModal;