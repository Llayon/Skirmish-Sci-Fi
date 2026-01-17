import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useCampaignProgressStore } from '@/stores';
import type { SlotId } from '@/types';
import { useTranslation } from '@/i18n';
import { Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { sanitizeToText } from '@/services/utils/sanitization';

const OverwriteConfirmationModal: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <Modal onClose={onCancel} title={t('saveSlots.overwriteWarningTitle')}>
      <Card className='w-full sm:max-w-sm bg-surface-overlay text-center !p-0'>
        <div className='p-6'>
          <AlertTriangle className='w-12 h-12 text-warning mx-auto mb-4' />
          <p className='text-text-muted mb-6'>{t('saveSlots.overwriteWarningPrompt')}</p>
          <div className='flex justify-center gap-4'>
            <Button onClick={onCancel} variant='secondary'>{t('buttons.cancel')}</Button>
            <Button onClick={onConfirm} variant='primary'>{t('buttons.save')}</Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

const SaveGameModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { saveSlots, actions } = useCampaignProgressStore();
  const { addToast } = useToast();
  const [slotToSave, setSlotToSave] = useState<SlotId | null>(null);

  const slotIds: SlotId[] = ['slot_1', 'slot_2', 'slot_3', 'slot_4'];

  const handleSave = (slotId: SlotId) => {
    if (saveSlots[slotId]) {
      setSlotToSave(slotId); // Ask for confirmation
    } else {
      actions.saveGame(slotId);
      addToast({ message: 'Game Saved!', type: 'success' });
      onClose();
    }
  };

  const confirmSave = () => {
    if (slotToSave) {
      actions.saveGame(slotToSave);
      addToast({ message: 'Game Saved!', type: 'success' });
      setSlotToSave(null);
      onClose();
    }
  };

  return (
    <>
      <Modal onClose={onClose} title={t('buttons.saveGame')}>
        <Card className='w-full sm:max-w-lg bg-surface-overlay max-h-[80vh] flex flex-col !p-0'>
          <div className='overflow-y-auto flex-grow p-6 space-y-3'>
            {slotIds.map(id => {
              const slot = saveSlots[id];
              return (
                <div key={id} className='p-3 bg-secondary rounded-lg flex items-center justify-between gap-4'>
                  <div className='flex-grow'>
                    <p className='font-bold text-text-base'>
                      {`Slot ${id.split('_')[1]}`}
                    </p>
                    {slot ? (
                      <div className='text-xs text-text-muted mt-1'>
                        <p>{sanitizeToText(slot.metadata.crewName)} - {t('saveSlots.turn')} {slot.metadata.turn}</p>
                        <p>{t('saveSlots.lastSaved')}: {new Date(slot.metadata.savedAt).toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className='text-xs text-text-muted italic mt-1'>{t('saveSlots.emptySlot')}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <Button onClick={() => handleSave(id)} variant='primary' className='text-sm py-1 px-3'>
                      <Save size={14} /> {t('buttons.save')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className='mt-6 text-right border-t border-border pt-4 px-6'>
            <Button onClick={onClose} variant='secondary'>{t('buttons.cancel')}</Button>
          </div>
        </Card>
      </Modal>
      {slotToSave && <OverwriteConfirmationModal onConfirm={confirmSave} onCancel={() => setSlotToSave(null)} />}
    </>
  );
};

export default SaveGameModal;