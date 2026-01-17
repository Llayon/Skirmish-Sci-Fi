import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import { Character } from '../../types';
import Modal from '../ui/Modal';
import { UserPlus } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import { RACES } from '@/constants/characterCreation';
import { STRANGE_CHARACTERS } from '@/constants/strangeCharacters';

const RecruitChoiceModal: React.FC = () => {
  const { t } = useTranslation();
  const { campaign, actions } = useCampaignProgressStore();

  const choice = campaign?.pendingRecruitChoice;
  if (!choice) return null;

  const handleSelect = (recruit: Character) => {
    actions.resolveRecruitChoice(recruit);
  };

  const RecruitCard: React.FC<{ recruit: Character }> = ({ recruit }) => {
    const typeKey = recruit.strangeCharacterId 
        ? `strange_characters.${recruit.strangeCharacterId}` 
        : `races.${recruit.raceId}`;
    const typeName = t(typeKey);
    const className = t(`classes.${recruit.classId}`);

    return (
      <Card className='bg-surface-base/50 text-left'>
        <h4 className='font-bold text-primary'>{typeName} - {className}</h4>
        <div className='text-sm mt-2 grid grid-cols-3 gap-2'>
          <span>R: {recruit.stats.reactions}</span>
          <span>S: {recruit.stats.speed}"</span>
          <span>C: +{recruit.stats.combat}</span>
          <span>T: {recruit.stats.toughness}</span>
          <span>S: +{recruit.stats.savvy}</span>
          <span>L: {recruit.stats.luck}</span>
        </div>
        <div className='text-right mt-4'>
            <Button onClick={() => handleSelect(recruit)} variant='primary' className='text-xs py-1 px-3'>
                {t('dashboard.recruitChoiceModal.hireButton')}
            </Button>
        </div>
      </Card>
    );
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title={t('dashboard.recruitChoiceModal.title')}>
      <Card className="w-full sm:max-w-2xl bg-surface-overlay text-center !p-0">
        <div className="p-6">
            <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
              <UserPlus className='w-8 h-8 text-primary' />
            </div>
            <p className="text-text-base mb-6">{t('dashboard.recruitChoiceModal.description')}</p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <RecruitCard recruit={choice.recruits[0]} />
              <RecruitCard recruit={choice.recruits[1]} />
            </div>
        </div>
      </Card>
    </Modal>
  );
};

export default RecruitChoiceModal;