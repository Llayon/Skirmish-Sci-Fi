

import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import { Briefcase, Coins, User, Clock, Shield, Award, AlertCircle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; }> = ({ icon, label, value }) => (
  <div className='flex items-start gap-2 text-sm'>
    <div className='flex-shrink-0 text-primary mt-0.5'>{icon}</div>
    <div>
      <span className='font-semibold text-text-base'>{label}:</span>
      <span className='text-text-base ml-2'>{value}</span>
    </div>
  </div>
);

/**
 * A component that displays available mission offers for the crew to accept.
 * This is shown on the campaign dashboard when no mission is currently active.
 * @returns {React.ReactElement} The rendered job board.
 */
const JobBoard: React.FC = () => {
  const { t } = useTranslation();
  const campaign = useCampaignProgressStore(state => state.campaign);
  const jobOffers = campaign?.jobOffers || [];
  const { acceptJob } = useCampaignProgressStore(state => state.actions);

  const licenseNeeded = campaign?.currentWorld?.licenseRequired && !campaign?.currentWorld?.licenseOwned;
  const isBlacklisted = campaign?.currentWorld?.blacklistedFromPatrons;
  const actionsDisabled = !campaign?.tasksFinalized || licenseNeeded || isBlacklisted;

  const actionsTooltip = useMemo(() => {
    if (!campaign?.tasksFinalized) {
        return t('tooltips.actions.finalizeTasksFirst');
    }
    if (licenseNeeded) {
        return t('dashboard.worldInfo.licenseNeededTooltip');
    }
    if (isBlacklisted) {
        return t('dashboard.jobBoard.blacklisted');
    }
    return '';
  }, [campaign, licenseNeeded, isBlacklisted, t]);

  if (isBlacklisted) {
    return (
      <Card>
        <h3 className='text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.jobBoard.title')}</h3>
        <p className='text-danger italic text-center py-4'>{t('dashboard.jobBoard.blacklisted')}</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.jobBoard.title')}</h3>
      <div className='space-y-4'>
        {jobOffers.length > 0 ? (
          jobOffers.map(offer => (
            <Card key={offer.id} className='bg-surface-base/50'>
              <h4 className='font-bold text-primary'>{t(offer.titleKey)}</h4>
              <p className='text-sm text-text-base mt-1 mb-4'>{t(offer.descriptionKey)}</p>

              <div className='space-y-2 mb-4'>
                <DetailRow icon={<User size={16} />} label={t('dashboard.jobBoard.patron')} value={t(`dashboard.patrons.${offer.patronType}`)} />
                <DetailRow icon={<Coins size={16} />} label={t('dashboard.jobBoard.dangerPay')} value={`${offer.dangerPay.credits} credits ${offer.dangerPay.bonus ? '(+bonus)' : ''}`} />
                <DetailRow icon={<Clock size={16} />} label={t('dashboard.jobBoard.timeFrame')} value={t(offer.timeFrame.descriptionKey)} />
                {offer.benefit &&
                  <Tooltip content={t(offer.benefit.effectKey)}>
                    <div className='underline decoration-dotted cursor-help'>
                      <DetailRow icon={<Award size={16} />} label={t('dashboard.jobBoard.benefit')} value={t(offer.benefit.nameKey)} />
                    </div>
                  </Tooltip>
                }
                {offer.hazard &&
                  <Tooltip content={t(offer.hazard.effectKey)}>
                    <div className='underline decoration-dotted cursor-help'>
                      <DetailRow icon={<AlertCircle size={16} />} label={t('dashboard.jobBoard.hazard')} value={t(offer.hazard.nameKey)} />
                    </div>
                  </Tooltip>
                }
                {offer.condition &&
                  <Tooltip content={t(offer.condition.effectKey)}>
                    <div className='underline decoration-dotted cursor-help'>
                      <DetailRow icon={<Shield size={16} />} label={t('dashboard.jobBoard.condition')} value={t(offer.condition.nameKey)} />
                    </div>
                  </Tooltip>
                }
              </div>

              <div className='text-right'>
                <Tooltip content={actionsTooltip}>
                  {/* The div wrapper is necessary for the tooltip to work on a disabled button */}
                  <div className='inline-block'>
                    <Button
                      onClick={() => acceptJob(offer.id)}
                      variant='primary'
                      disabled={actionsDisabled}
                      className='text-sm py-1 px-3'
                    >
                      <Briefcase size={14} />
                      <span>{t('buttons.acceptJob')}</span>
                    </Button>
                  </div>
                </Tooltip>
              </div>
            </Card>
          ))
        ) : (
          <p className='text-text-muted italic text-center py-4'>{t('dashboard.jobBoard.noOffers')}</p>
        )}
      </div>
    </Card>
  );
};

export default JobBoard;