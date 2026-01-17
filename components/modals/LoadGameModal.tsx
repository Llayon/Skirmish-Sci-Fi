import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useCampaignProgressStore } from '@/stores';
import type { SlotId } from '@/types';
import { useTranslation } from '@/i18n';
import { FolderOpen, Trash2, AlertTriangle } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import { preloadCampaignDashboard } from '@/services/utils/componentPreloader';

const ConfirmationModal: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <Modal onClose={onCancel} title={t('saveSlots.deleteWarningTitle')}>
      <Card className='w-full sm:max-w-sm bg-surface-overlay text-center !p-0'>
        <div className='p-6'>
          <AlertTriangle className='w-12 h-12 text-danger mx-auto mb-4' />
          <p className='text-text-muted mb-6'>{t('saveSlots.deleteWarningPrompt')}</p>
          <div className='flex justify-center gap-4'>
            <Button onClick={onCancel} variant='secondary'>{t('buttons.cancel')}</Button>
            <Button onClick={onConfirm} variant='danger'>{t('buttons.delete')}</Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

const LoadGameModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { saveSlots, actions } = useCampaignProgressStore();
  const [slotToDelete, setSlotToDelete] = useState<SlotId | null>(null);

  const slotIds: SlotId[] = ['autosave', 'slot_1', 'slot_2', 'slot_3', 'slot_4'];

  const handleLoad = (slotId: SlotId) => {
    actions.loadGame(slotId);
    onClose();
  };

  const handleDelete = () => {
    if (slotToDelete) {
      actions.deleteSlot(slotToDelete);
      setSlotToDelete(null);
    }
  };

  return (
    <>
      <Modal onClose={onClose} title={t('buttons.loadGame')}>
        <Card className='w-full sm:max-w-lg bg-surface-overlay max-h-[80vh] flex flex-col !p-0'>
          <div className='overflow-y-auto flex-grow p-6 space-y-3'>
            {slotIds.map(id => {
              const slot = saveSlots[id];
              return (
                <div key={id} className='p-3 bg-secondary rounded-lg flex items-center justify-between gap-4'>
                  <div className='flex-grow'>
                    <p className='font-bold text-text-base'>
                      {id === 'autosave' ? t('saveSlots.autosave') : `Slot ${id.split('_')[1]}`}
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
                    <Button onMouseEnter={preloadCampaignDashboard} onClick={() => handleLoad(id)} disabled={!slot} variant='primary' className='text-sm py-1 px-3'>
                      <FolderOpen size={14} /> {t('buttons.load')}
                    </Button>
                    <Button onClick={() => setSlotToDelete(id)} disabled={!slot || id === 'autosave'} variant='danger' className='text-sm py-1 px-3'>
                      <Trash2 size={14} />
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
      {slotToDelete && <ConfirmationModal onConfirm={handleDelete} onCancel={() => setSlotToDelete(null)} />}
    </>
  );
};

export default LoadGameModal;