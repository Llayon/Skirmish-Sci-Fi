import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore, useShipStore } from '../../stores';
import { Handshake, Loader } from 'lucide-react';
import Modal from '../ui/Modal';
import { TRADE_TABLE, TradeTableResult } from '../../constants/tradeTable';
import { sanitizeToText } from '@/services/utils/sanitization';

const TradeEventModal: React.FC = () => {
  const { t } = useTranslation();
  const campaign = useCampaignProgressStore(state => state.campaign);
  const crew = useCrewStore(state => state.crew);
  const { stash } = useShipStore(state => state);
  const { resolveTradeChoice } = useCampaignProgressStore(state => state.actions);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingResult = campaign?.pendingTradeResult;
  if (!pendingResult) return null;

  const tradeEntry = TRADE_TABLE.find(e => pendingResult.roll >= e.roll_range[0] && pendingResult.roll <= e.roll_range[1])?.value as TradeTableResult | undefined;
  if (!tradeEntry) return null;

  const handleChoice = (payload: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    resolveTradeChoice({ ...payload, traderId: pendingResult.traderId, roll: pendingResult.roll });
  };
  
  const nonInteractiveTypes = ['simple', 'item_roll', 'recruit', 'gamble'];

  useEffect(() => {
    if (tradeEntry && nonInteractiveTypes.includes(tradeEntry.type)) {
      handleChoice({});
    }
  }, [tradeEntry]);


  const handleItemSelection = (itemId: string) => {
    const itemsToReceive = tradeEntry.itemsToReceive || 1;
    setSelectedItems(prev => {
      const currentCount = Object.values(prev).reduce((sum: number, count: number) => sum + count, 0);
      const itemInSelection = prev[itemId] || 0;
      if (currentCount < itemsToReceive) {
        return { ...prev, [itemId]: itemInSelection + 1 };
      }
      return prev;
    });
  };

  const renderEventContent = () => {
    if (nonInteractiveTypes.includes(tradeEntry.type)) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader className="animate-spin" size={16} />
          <span>Resolving trade...</span>
        </div>
      );
    }
    
    switch (tradeEntry.id) {
      case 'instruction_book':
        return (
          <div className='space-y-2'>
            <p>{t('dashboard.tradeModal.instruction_book_prompt')}</p>
            {crew?.members.filter(m => !m.noXP).map(char => (
              <Button key={char.id} onClick={() => handleChoice({ characterId: char.id })} variant='secondary' className='w-full justify-start'>
                {char.name}
              </Button>
            ))}
          </div>
        );
      case 'medical_pack':
      case 'gun_upgrade_kit':
      case 'basic_firearms':
      case 'army_surplus':
        return (
          <div className='space-y-2'>
            <p>{t('dashboard.tradeModal.item_choice_prompt')}</p>
            {tradeEntry.choices?.map(choice => (
              <Button key={choice.id} onClick={() => handleChoice({ items: [{ id: choice.id, type: choice.type, amount: 1 }] })} variant='secondary' className='w-full justify-start'>
                {t(choice.labelKey)}
              </Button>
            ))}
          </div>
        );
      case 'ordnance':
        const selectedCount = Object.values(selectedItems).reduce((sum: number, count: number) => sum + count, 0);
        return (
          <div className='space-y-2'>
            <p>{t('dashboard.tradeModal.ordnance_prompt', { count: selectedCount, total: 3 })}</p>
            {tradeEntry.choices?.map(choice => (
              <div key={choice.id} className='flex items-center justify-between'>
                <span>{t(choice.labelKey)}: {selectedItems[choice.id] || 0}</span>
                <Button onClick={() => handleItemSelection(choice.id)} variant='secondary' disabled={selectedCount >= 3}>+</Button>
              </div>
            ))}
            <Button onClick={() => handleChoice({ items: Object.entries(selectedItems).map(([id, amount]) => ({ id, type: 'weapon', amount })) })} disabled={selectedCount < 3} className='w-full mt-4'>Confirm</Button>
          </div>
        )
      case 'luxury_trinket':
        return (
          <div className='space-y-2'>
            <p>{t('dashboard.tradeModal.luxury_trinket_prompt')}</p>
            <Button onClick={() => handleChoice({ choice: 'bonus' })} variant='secondary' className='w-full justify-start'>{t('dashboard.tradeModal.luxury_trinket_recruit')}</Button>
            <Button onClick={() => handleChoice({ choice: 'sell' })} variant='secondary' className='w-full justify-start'>{t('dashboard.tradeModal.luxury_trinket_sell')}</Button>
          </div>
        )
      case 'contraband':
        return (
          <div className='space-y-2'>
            <p>{t('dashboard.tradeModal.contraband_prompt')}</p>
            <Button onClick={() => handleChoice({ choice: 'accept' })} variant='danger' className='w-full justify-start'>{t('dashboard.tradeModal.contraband_accept')}</Button>
            <Button onClick={() => handleChoice({ choice: 'decline' })} variant='secondary' className='w-full justify-start'>{t('dashboard.tradeModal.contraband_decline')}</Button>
          </div>
        )
      case 'rare_sale':
      case 'odd_device': {
        const cost = tradeEntry.id === 'rare_sale' ? 3 : 1;
        return (
          <div className='space-y-2'>
            <p>{t(`dashboard.tradeModal.${tradeEntry.id}_prompt`)}</p>
            <Button onClick={() => handleChoice({ choice: 'buy' })} disabled={(campaign?.credits || 0) < cost} variant='primary' className='w-full justify-start'>{t('dashboard.tradeModal.buy', { cost })}</Button>
            <Button onClick={() => handleChoice({ choice: 'pass' })} variant='secondary' className='w-full justify-start'>{t('dashboard.tradeModal.pass')}</Button>
          </div>
        )
      }
      case 'unload_stuff':
        const hasImportRestrictions = campaign?.currentWorld?.traits.some(t => t.id === 'import_restrictions');
        if (hasImportRestrictions) {
          return (
            <div>
              <p className='text-warning text-sm italic py-2'>{t('worldtraits.import_restrictions.desc')}</p>
              <Button onClick={() => handleChoice({ choice: 'done' })} variant='primary' className='w-full mt-4'>{t('buttons.done')}</Button>
            </div>
          )
        }
        const sellableWeapons: { instanceId: string, weaponId: string, charName: string, charId: string }[] = [];
        crew?.members.forEach(char => {
            char.weapons.forEach(w => {
                const isDamaged = char.damagedEquipment?.some(d => d.instanceId === w.instanceId);
                if (!isDamaged) {
                    sellableWeapons.push({ ...w, charName: sanitizeToText(char.name), charId: char.id });
                }
            });
        });
        stash?.weapons.forEach(w => {
            const isDamaged = stash.damagedItems?.some(d => d.id === w.instanceId);
            if (!isDamaged) {
                sellableWeapons.push({ ...w, charName: 'Stash', charId: 'stash' });
            }
        });

        return (
            <div className='space-y-2'>
                <p>{t('dashboard.tradeModal.unload_stuff_prompt')}</p>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {sellableWeapons.length > 0 ? sellableWeapons.map(w => (
                        <Button key={w.instanceId} onClick={() => handleChoice({ choice: 'sell', weaponInstanceId: w.instanceId, characterId: w.charId })} variant='secondary' className='w-full justify-start'>
                            Sell {t(`weapons.${w.weaponId}`)} from {w.charName} (2cr)
                        </Button>
                    )) : <p className='text-sm italic text-text-muted'>{t('dashboard.tradeModal.unload_stuff_none')}</p>}
                </div>
                <Button onClick={() => handleChoice({ choice: 'done' })} variant='primary' className='w-full mt-4'>{t('buttons.done')}</Button>
            </div>
        )
      default:
        return <p>Error: Unhandled interactive trade choice.</p>;
    }
  };

  return (
    <Modal onClose={() => { }} disableClose={true} title={t(tradeEntry.logKey)}>
      <Card className='w-full sm:max-w-lg bg-surface-overlay flex flex-col text-center animate-fade-in !p-0'>
        <div className='p-6'>
          <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
            <Handshake className='w-8 h-8 text-primary' />
          </div>

          <div className='my-4 text-text-base'>
            {renderEventContent()}
          </div>
        </div>
      </Card>
    </Modal>
  );
};

export default TradeEventModal;