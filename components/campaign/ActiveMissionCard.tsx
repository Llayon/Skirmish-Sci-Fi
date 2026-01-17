
import React from 'react';
import Card from '../ui/Card';
import { useTranslation } from '../../i18n';
import { ActiveMission } from '../../types';
import { Briefcase, User, Coins, Clock, Award, AlertCircle, Shield } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { useCampaignProgressStore } from '../../stores';

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
 * Props for the ActiveMissionCard component.
 * @property {ActiveMission} [mission] - The active mission to display. If not provided, it will be sourced from the global store.
 */
interface ActiveMissionCardProps {
  mission?: ActiveMission;
}

/**
 * A card component that displays the details of the currently active mission for the crew.
 * It shows the mission title, description, patron, rewards, and any special conditions.
 * @param {ActiveMissionCardProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered card, or null if there is no active mission.
 */
const ActiveMissionCard: React.FC<ActiveMissionCardProps> = ({ mission: missionProp }) => {
  const { t } = useTranslation();
  const missionFromStore = useCampaignProgressStore(state => state.campaign?.activeMission);
  const mission = missionProp || missionFromStore;

  if (!mission) return null;

  const deadline = typeof mission.timeFrame.turns === 'number'
    ? mission.turnAccepted + mission.timeFrame.turns - 1
    : null;

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-1 font-orbitron flex items-center gap-2'>
        <Briefcase /> {t('dashboard.activeMission.title')}
      </h3>
      {deadline && <p className='text-xs text-warning mb-4 ml-8'>{t('dashboard.activeMission.deadline', { turn: deadline })}</p>}

      <Card className='bg-surface-base/50'>
        <h4 className='font-bold text-primary'>{t(mission.titleKey)}</h4>
        <p className='text-sm text-text-base mt-1 mb-4'>{t(mission.descriptionKey)}</p>

        <div className='space-y-2'>
          <DetailRow icon={<User size={16} />} label={t('dashboard.jobBoard.patron')} value={t(`dashboard.patrons.${mission.patronType}`)} />
          <DetailRow icon={<Coins size={16} />} label={t('dashboard.jobBoard.dangerPay')} value={`${mission.dangerPay.credits} credits ${mission.dangerPay.bonus ? '(+bonus)' : ''}`} />
          <DetailRow icon={<Clock size={16} />} label={t('dashboard.jobBoard.timeFrame')} value={t(mission.timeFrame.descriptionKey)} />
          {mission.benefit &&
            <Tooltip content={t(mission.benefit.effectKey)}>
              <div className='underline decoration-dotted cursor-help'>
                <DetailRow icon={<Award size={16} />} label={t('dashboard.jobBoard.benefit')} value={t(mission.benefit.nameKey)} />
              </div>
            </Tooltip>
          }
          {mission.hazard &&
            <Tooltip content={t(mission.hazard.effectKey)}>
              <div className='underline decoration-dotted cursor-help'>
                <DetailRow icon={<AlertCircle size={16} />} label={t('dashboard.jobBoard.hazard')} value={t(mission.hazard.nameKey)} />
              </div>
            </Tooltip>
          }
          {mission.condition &&
            <Tooltip content={t(mission.condition.effectKey)}>
              <div className='underline decoration-dotted cursor-help'>
                <DetailRow icon={<Shield size={16} />} label={t('dashboard.jobBoard.condition')} value={t(mission.condition.nameKey)} />
              </div>
            </Tooltip>
          }
        </div>
      </Card>
    </Card>
  );
};

export default ActiveMissionCard;