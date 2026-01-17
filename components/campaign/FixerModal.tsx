
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore, useShipStore, useCampaignProgressStore } from '../../stores';
import Modal from '../ui/Modal';
import { sanitizeToText } from '@/services/utils/sanitization';
import { getWeaponById, getProtectiveDeviceById } from '@/services/data/items';

type DamagedItem = {
  instanceId: string;
  itemId: string;
  type: 'weapon' | 'armor' | 'screen';
  name: string;
  location: string;
  charId?: string;
};

const FixerModal: React.FC = () => {
  const { t } = useTranslation();
  const { crew } = useCrewStore();
  const { stash } = useShipStore();
  const { resolveItemChoice, updateCampaign } = useCampaignProgressStore(state => state.actions);
  const [selectedItem, setSelectedItem] = useState<DamagedItem | null>(null);

  const allDamagedItems = useMemo((): DamagedItem[] => {
    const items: DamagedItem[] = [];
    if (!crew) return items;

    // Helper to get item name
    const getItemName = (type: string, id: string) => {
        switch (type) {
            case 'weapon': return t(`weapons.${id}`);
            case 'armor': case 'screen': return t(`protective_devices.${id}`);
            default: return id;
        }
    };
    
    // Crew items
    crew.members.forEach(char => {
      const charName = sanitizeToText(char.name);
      (char.damagedEquipment || []).forEach(d => {
        items.push({ 
            instanceId: d.instanceId, 
            itemId: d.weaponId || d.instanceId, 
            type: d.type, 
            name: getItemName(d.type, d.weaponId || d.instanceId), 
            location: charName, 
            charId: char.id 
        });
      });
    });

    return items;
  }, [crew, t]);

  const handleClose = () => {
    updateCampaign(c => { c.pendingItemChoice = undefined; });
  };

  const handleConfirm = () => {
    if (selectedItem) {
      resolveItemChoice('fixer', { item: selectedItem });
      handleClose();
    }
  };

  return (
    <Modal onClose={handleClose} title={t('on_board_items.fixer')}>
      <Card className='w-full sm:max-w-lg bg-surface-overlay !p-0'>
        <div className='p-6'>
          <p className='text-text-muted mb-4'>{t('tooltips.on_board_items.fixer')}</p>
          <div className='space-y-2 max-h-80 overflow-y-auto pr-2'>
            {allDamagedItems.length > 0 ? allDamagedItems.map(item => (
              <label key={item.instanceId} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border-2 ${selectedItem?.instanceId === item.instanceId ? 'bg-primary/20 border-primary' : 'bg-surface-base/50 border-transparent hover:border-border'}`}>
                <input
                  type="radio"
                  name="item-to-fix"
                  checked={selectedItem?.instanceId === item.instanceId}
                  onChange={() => setSelectedItem(item)}
                  className="form-radio h-4 w-4 text-primary bg-surface-base border-border focus:ring-primary"
                />
                <div>
                  <span className='font-bold text-text-base'>{item.name}</span>
                  <span className='text-xs text-text-muted block'>({item.location})</span>
                </div>
              </label>
            )) : (
              <p className='text-text-muted italic text-center py-4'>{t('dashboard.fixerModal.noDamagedItems')}</p>
            )}
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

export default FixerModal;
