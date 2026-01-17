import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore } from '../../stores';
import { PendingPrecursorEventChoice, CharacterEvent } from '../../types';
import { Star } from 'lucide-react';
import Modal from '../ui/Modal';
import { sanitizeToText } from '@/services/utils/sanitization';

interface PrecursorEventChoiceModalProps {
  choice: PendingPrecursorEventChoice;
}

const PrecursorEventChoiceModal: React.FC<PrecursorEventChoiceModalProps> = ({ choice }) => {
  const { t } = useTranslation();
  const { resolvePrecursorEventChoice } = useCampaignProgressStore(state => state.actions);
  const crew = useCrewStore(state => state.crew);

  const character = crew?.members.find(c => c.id === choice.characterId);
  if (!character) return null;

  const handleSelect = (event: CharacterEvent) => {
    resolvePrecursorEventChoice(choice.characterId, event);
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title="A Precursor's Choice">
      <Card className='w-full sm:max-w-lg bg-surface-overlay flex flex-col text-center animate-fade-in !p-0'>
        <div className="p-6">
            <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
              <Star className='w-8 h-8 text-primary' />
            </div>

            <div className='my-4 text-text-base'>
              <p className='mb-4'>
                As a Precursor, {sanitizeToText(character.name)} senses two possible futures. Choose one outcome:
              </p>
              <div className='space-y-3'>
                <Card className='bg-surface-base/50 text-left' variant='interactive' onClick={() => handleSelect(choice.event1)}>
                  <p className='font-bold text-primary'>{t(choice.event1.descriptionKey, { name: sanitizeToText(character.name) })}</p>
                </Card>
                <Card className='bg-surface-base/50 text-left' variant='interactive' onClick={() => handleSelect(choice.event2)}>
                  <p className='font-bold text-primary'>{t(choice.event2.descriptionKey, { name: sanitizeToText(character.name) })}</p>
                </Card>
              </div>
            </div>
        </div>
      </Card>
    </Modal>
  );
};

export default PrecursorEventChoiceModal;