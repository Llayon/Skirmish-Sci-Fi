

import React from 'react';
import Card from '../ui/Card';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore } from '../../stores';
import Modal from '../ui/Modal';
import { Handshake } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import { TRADE_TABLE } from '@/constants/tradeTable';
import { resolveTable } from '@/services/utils/tables';
import { TradeTableResult } from '@/constants/tradeTable';

const FreeTradeChoiceModal: React.FC = () => {
  const { t } = useTranslation();
  const { campaign, actions } = useCampaignProgressStore();
  const crew = useCrewStore(state => state.crew);

  const choice = campaign?.pendingTradeChoice;
  if (!choice || !crew) return null;

  const trader = crew.members.find(c => c.id === choice.traderId);
  if (!trader) return null;

  const outcome1 = resolveTable(TRADE_TABLE, choice.roll1).value;
  const outcome2 = resolveTable(TRADE_TABLE, choice.roll2).value;

  const handleSelect = (roll: number) => {
    actions.resolveTradeChoice({ traderId: choice.traderId, roll: roll });
  };

  const renderOutcome = (outcome: TradeTableResult) => {
    // This is a simplified description for the choice modal.
    // It strips out dynamic parameters to give a general idea of the event.
    return t(outcome.logKey, { name: '', profit: '', item: '...' }).replace('{name}', '').replace('found', 'Find').trim();
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title={t('dashboard.freeTradeChoiceModal.title')}>
      <Card className="w-full sm:max-w-lg bg-surface-overlay text-center !p-0">
        <div className="p-6">
            <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
              <Handshake className='w-8 h-8 text-primary' />
            </div>
            <p className="text-text-base mb-6">
              {t('dashboard.freeTradeChoiceModal.description', { name: sanitizeToText(trader.name) })}
            </p>
            <div className='space-y-3'>
              <Card className='bg-surface-base/50 text-left' variant='interactive' onClick={() => handleSelect(choice.roll1)}>
                <p className='font-bold text-primary'>Roll {choice.roll1}: {renderOutcome(outcome1)}</p>
              </Card>
              <Card className='bg-surface-base/50 text-left' variant='interactive' onClick={() => handleSelect(choice.roll2)}>
                <p className='font-bold text-primary'>Roll {choice.roll2}: {renderOutcome(outcome2)}</p>
              </Card>
            </div>
        </div>
      </Card>
    </Modal>
  );
};

export default FreeTradeChoiceModal;