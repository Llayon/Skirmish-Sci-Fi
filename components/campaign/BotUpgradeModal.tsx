import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore, useCampaignProgressStore } from '../../stores';
import { Character, CharacterStats } from '../../types';
import { Zap, Footprints, Target, Heart, Brain, Coins } from 'lucide-react';
import Modal from '../ui/Modal';
import { sanitizeToText } from '@/services/utils/sanitization';
import Tooltip from '../ui/Tooltip';

interface BotUpgradeModalProps {
  character: Character;
  onClose: () => void;
}

const BotUpgradeModal: React.FC<BotUpgradeModalProps> = ({ character, onClose }) => {
  const { t } = useTranslation();
  const { upgradeBot } = useCrewStore(state => state.actions);
  const { campaign } = useCampaignProgressStore();

  const upgrades: { stat: Extract<keyof CharacterStats, string>, cost: number, icon: React.ReactNode }[] = [
    { stat: 'reactions', cost: 7, icon: <Zap size={16} /> },
    { stat: 'combat', cost: 7, icon: <Target size={16} /> },
    { stat: 'speed', cost: 5, icon: <Footprints size={16} /> },
    { stat: 'savvy', cost: 5, icon: <Brain size={16} /> },
    { stat: 'toughness', cost: 6, icon: <Heart size={16} /> },
  ];

  const getCost = (baseCost: number) => {
    let cost = baseCost;
    if (character.raceId === 'soulless') {
        cost = Math.ceil(baseCost * 1.5);
    }
    if (campaign?.currentWorld?.traits.some(t => t.id === 'bot_manufacturing')) {
      cost -= 1;
    }
    return Math.max(0, cost);
  };

  if (!character.canInstallBotUpgrades) return null;

  return (
    <Modal onClose={onClose} title={`${t('characterCard.upgradeBot')} for ${sanitizeToText(character.name)}`}>
      <Card className='w-full sm:max-w-md bg-surface-overlay max-h-[90vh] flex flex-col !p-0'>
        <div className='p-6'>
          <div className='flex justify-between items-center mb-4'>
            <p className='text-text-muted'>{t('crewCreator.startingCredits')}:</p>
            <p className='text-2xl font-bold text-primary flex items-center gap-2'>
              <Coins size={20}/> {campaign?.credits ?? 0}
            </p>
          </div>

          <div className='space-y-3'>
            {upgrades.map(upgrade => {
              const finalCost = getCost(upgrade.cost);
              const currentStat = character.stats[upgrade.stat];
              const isUpgraded = character.upgradedStats?.includes(upgrade.stat);
              const canAfford = (campaign?.credits ?? 0) >= finalCost;
              const isDisabled = isUpgraded || !canAfford;

              return (
                <div key={upgrade.stat} className='p-3 bg-surface-base/50 rounded-md flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='text-primary'>{upgrade.icon}</div>
                    <div>
                      <p className='font-bold text-text-base capitalize'>{t(`characterCard.${upgrade.stat}`)}: {currentStat}</p>
                      <p className='text-xs text-text-muted'>{t('dashboard.shipStash.shipUpgrades')}: {finalCost} cr</p>
                    </div>
                  </div>
                  <Tooltip content={isUpgraded ? "Already upgraded" : !canAfford ? "Insufficient credits" : `Upgrade ${t(`characterCard.${upgrade.stat}`)}`}>
                    <div className='inline-block'>
                      <Button
                        onClick={() => upgradeBot(character.id, upgrade.stat, finalCost)}
                        disabled={isDisabled}
                        variant={isUpgraded ? 'secondary' : 'primary'}
                        className='text-xs py-1 px-3'
                      >
                        {isUpgraded ? t('buttons.equipped') : t('buttons.purchase')}
                      </Button>
                    </div>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>

        <div className='mt-auto text-right border-t border-border pt-4 px-6'>
          <Button onClick={onClose} variant='primary'>{t('buttons.done')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default BotUpgradeModal;