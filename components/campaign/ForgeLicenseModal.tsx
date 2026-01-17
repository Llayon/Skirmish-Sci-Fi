import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore } from '../../stores';
import Modal from '../ui/Modal';
import { Dices } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import { Select } from '../ui/Select';

interface ForgeLicenseModalProps {
  onClose: () => void;
}

const ForgeLicenseModal: React.FC<ForgeLicenseModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { crew } = useCrewStore();
  const { attemptForgery } = useCampaignProgressStore(state => state.actions);
  const [selectedCharId, setSelectedCharId] = useState<string>('');

  const handleAttempt = () => {
    if (!selectedCharId) return;
    attemptForgery(selectedCharId);
    onClose();
  };

  const crewOptions = crew?.members
    .filter(m => !m.isUnavailableForTasks)
    .map(c => ({ value: c.id, label: `${sanitizeToText(c.name)} (Savvy: ${c.stats.savvy})` })) || [];

  return (
    <Modal onClose={onClose} title={t('dashboard.worldInfo.forgeTitle')}>
      <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
        <div className='p-6'>
          <p className='text-text-muted mb-4'>
            {t('dashboard.worldInfo.forgeDescription')}
          </p>
          <div className='space-y-4'>
            <Select
              value={selectedCharId}
              onChange={setSelectedCharId}
              options={crewOptions}
              placeholder={t('dashboard.worldInfo.selectCharacter')}
            />
            <Button onClick={handleAttempt} disabled={!selectedCharId} className='w-full'>
              <Dices size={16} /> {t('buttons.attemptForgery')}
            </Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

export default ForgeLicenseModal;