import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import Modal from '../ui/Modal';
import { Briefcase, Coins } from 'lucide-react';

const BureaucracyBribeModal: React.FC = () => {
  const { t } = useTranslation();
  const { campaign, actions } = useCampaignProgressStore();

  const bribeAmount = campaign?.pendingBureaucracyBribe;
  if (!bribeAmount) return null;

  const canAfford = (campaign?.credits ?? 0) >= bribeAmount;

  const handlePay = () => {
    actions.payBureaucracyBribe();
  };

  const handleStay = () => {
    actions.declineBureaucracyBribe();
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title={t('travelEvents.bureaucratic_mess.title')}>
      <Card className="w-full sm:max-w-md bg-surface-overlay text-center !p-0">
        <div className='p-6'>
          <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
            <Briefcase className='w-8 h-8 text-primary' />
          </div>
          <p className="text-text-base mb-6">
            {t('travelEvents.bureaucratic_mess.desc', { bribe: bribeAmount })}
          </p>
          <div className='flex justify-center gap-4'>
            <Button onClick={handleStay} variant="secondary">
              {t('travelEvents.bureaucratic_mess.stay')}
            </Button>
            <Button onClick={handlePay} disabled={!canAfford} variant="primary">
              <Coins size={16} /> {t('travelEvents.bureaucratic_mess.pay_bribe', { bribe: bribeAmount })}
            </Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

export default BureaucracyBribeModal;