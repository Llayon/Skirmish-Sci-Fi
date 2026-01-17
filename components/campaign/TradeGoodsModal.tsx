import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import Modal from '../ui/Modal';
import { Coins } from 'lucide-react';

const TradeGoodsModal: React.FC = () => {
  const { t } = useTranslation();
  const { actions } = useCampaignProgressStore();

  const handleSell = () => {
    actions.resolveTradeGoodsSale(true);
  };

  const handleWait = () => {
    actions.resolveTradeGoodsSale(false);
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title={t('dashboard.tradeGoodsModal.title')}>
      <Card className="w-full sm:max-w-lg bg-surface-overlay text-center !p-0">
        <div className="p-6">
          <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
            <Coins className='w-8 h-8 text-primary' />
          </div>
          <p className="text-text-base mb-6">
            {t('dashboard.tradeGoodsModal.description')}
          </p>
          <div className='flex justify-center gap-4'>
            <Button onClick={handleWait} variant="secondary">
              {t('dashboard.tradeGoodsModal.waitButton')}
            </Button>
            <Button onClick={handleSell} variant="primary">
              {t('dashboard.tradeGoodsModal.sellButton')}
            </Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

export default TradeGoodsModal;