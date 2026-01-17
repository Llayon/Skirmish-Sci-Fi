import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import { useTranslation } from '../../i18n';
import { World } from '../../types';
import { Globe, ShieldCheck, AlertTriangle, Coins, Handshake, Timer } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import Button from '../ui/Button';
import { useCampaignProgressStore } from '@/stores';
import ForgeLicenseModal from './ForgeLicenseModal';

interface WorldInfoCardProps {
  world: World;
}

const WorldInfoCard: React.FC<WorldInfoCardProps> = ({ world }) => {
  const { t } = useTranslation();
  const { campaign, actions } = useCampaignProgressStore();
  const [showForgeLicenseModal, setShowForgeLicenseModal] = useState(false);

  const handleAttemptLicense = () => {
    actions.attemptInterdictionLicense();
  };

  const handlePurchase = () => {
    actions.purchaseLicense();
  };

  const handleUseBusyMarkets = () => {
    actions.useBusyMarkets();
  };

  if (!world) {
    return (
      <Card className='p-4'>
        <p className='text-text-muted'>World information not available</p>
      </Card>
    );
  }

  const hasBusyMarkets = world.traits?.some(t => t.id === 'busy_markets') ?? false;
  const busyMarketsUsed = campaign?.busyMarketsUsedThisTurn;
  const canAffordBusyMarkets = (campaign?.credits ?? 0) >= 2;

  const busyMarketTooltip = useMemo(() => {
    if (!campaign?.tasksFinalized) return "Finalize tasks before using world actions.";
    if (busyMarketsUsed) return "Already used this turn.";
    if (!canAffordBusyMarkets) return "Insufficient credits.";
    return "Spend 2 credits to roll on the Trade Table.";
  }, [campaign?.tasksFinalized, busyMarketsUsed, canAffordBusyMarkets]);

  const renderLicenseStatus = () => {
    if (!world.licenseRequired) return null;

    if (world.licenseOwned) {
      return (
        <div className='p-2 rounded-md bg-success/20'>
          <p className='flex items-center gap-2 text-sm text-success'><ShieldCheck size={16} /> {t('dashboard.worldInfo.licenseOwned')}</p>
        </div>
      );
    }

    const canAfford = (campaign?.credits ?? 0) >= (world.licenseCost ?? 0);
    const attemptMade = world.forgeryAttempted;

    return (
      <div className='p-3 rounded-md bg-warning/20 space-y-3'>
        <p className='flex items-center gap-2 text-sm text-text-base'>
          <AlertTriangle size={16} className='text-warning flex-shrink-0' /> 
          {t('dashboard.worldInfo.licenseRequired', { cost: world.licenseCost })}
        </p>
        <div className='flex justify-end gap-2'>
          <Tooltip content={attemptMade ? t('dashboard.worldInfo.forgeryAttempted') : ''}>
            <div className='inline-block'>
              <Button onClick={() => setShowForgeLicenseModal(true)} disabled={attemptMade} variant='secondary' className='text-xs py-1 px-2'>
                {t('buttons.attemptForgery')}
              </Button>
            </div>
          </Tooltip>
          <Button onClick={handlePurchase} disabled={!canAfford} variant='primary' className='text-xs py-1 px-2'>
            <Coins size={14} /> {t('buttons.purchaseLicense')}
          </Button>
        </div>
      </div>
    );
  };
  
  const renderInterdictionStatus = () => {
    if (world.interdictionTurnsRemaining === undefined) return null;
    
    if (world.interdictionTurnsRemaining === 0) {
      return (
        <div className='mt-3 p-2 rounded-md bg-danger/20 text-danger font-bold text-sm flex items-center gap-2'>
          <Timer size={16} /> {t('dashboard.worldInfo.interdictionEnforced')}
        </div>
      );
    }
    
    return (
      <div className='mt-3 p-3 rounded-md bg-warning/20 space-y-3'>
        <p className='flex items-center gap-2 text-sm text-text-base'>
          <Timer size={16} className='text-warning flex-shrink-0' />
          {t('dashboard.worldInfo.interdictionWarning', { turns: world.interdictionTurnsRemaining })}
        </p>
        <div className='flex justify-end'>
          <Tooltip content={world.interdictionLicenseAttempted ? t('dashboard.worldInfo.licenseAttempted') : ''}>
            <div className='inline-block'>
              <Button onClick={handleAttemptLicense} disabled={world.interdictionLicenseAttempted} variant='secondary' className='text-xs py-1 px-2'>
                {t('dashboard.worldInfo.licenseExtensionButton')}
              </Button>
            </div>
          </Tooltip>
        </div>
      </div>
    );
  };


  return (
    <>
      {showForgeLicenseModal && <ForgeLicenseModal onClose={() => setShowForgeLicenseModal(false)} />}
      <Card>
        <h3 className='text-2xl font-bold mb-4 font-orbitron flex items-center gap-2'>
          <Globe size={20} /> {t('dashboard.worldInfo.title')}
        </h3>
        <div className='space-y-3'>
          <div className='p-3 bg-surface-base/50 rounded-md space-y-2'>
            <h4 className='font-bold text-text-base'>{world.name}</h4>
            {(world.traits || []).map(trait => (
              <Tooltip key={trait.id} content={t(trait.descriptionKey)}>
                <p className='font-semibold text-primary cursor-help hover:underline'>{t(trait.nameKey)}</p>
              </Tooltip>
            ))}
          </div>

          {world.isRedZone && (
            <div className='mt-3 p-2 rounded-md bg-danger/20 text-danger font-bold text-sm flex items-center gap-2'>
              <AlertTriangle size={16} /> {t('dashboard.worldInfo.redZoneWarning')}
            </div>
          )}

          {renderLicenseStatus()}
          {renderInterdictionStatus()}

          {hasBusyMarkets && (
            <div className='mt-3 pt-3 border-t border-border/50'>
              <Tooltip content={busyMarketTooltip}>
                <div className='inline-block w-full'>
                  <Button
                    onClick={handleUseBusyMarkets}
                    disabled={!campaign?.tasksFinalized || busyMarketsUsed || !canAffordBusyMarkets}
                    variant='secondary'
                    className='w-full'
                  >
                    <Handshake size={16} /> Use Busy Markets (2cr)
                  </Button>
                </div>
              </Tooltip>
              {busyMarketsUsed && <p className="text-xs text-text-muted italic text-center mt-2">Used this turn.</p>}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default WorldInfoCard;
