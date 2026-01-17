import React from 'react';
import { Mission, DeploymentCondition } from '../../types';
import { useTranslation } from '../../i18n';
import Card from '../ui/Card';
import { Trophy, CircleDotDashed, ShieldCheck, Search, Users, ShieldQuestion, MapPinned } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { useBattleStore } from '../../stores';

/**
 * Props for the MissionPanel component.
 * @property {Mission} mission - The mission object containing details to display.
 */
interface MissionPanelProps {
  mission: Mission;
}

/**
 * A UI component that displays the current mission objectives and progress.
 * @param {MissionPanelProps} props - The component props.
 * @returns {React.ReactElement} The rendered mission panel.
 */
const MissionPanel: React.FC<MissionPanelProps> = ({ mission }) => {
  const { t } = useTranslation();
  const deploymentCondition = useBattleStore(state => state.battle?.deploymentCondition);

  const renderProgress = () => {
    switch (mission.type) {
      case 'Patrol':
        const visited = mission.patrolPoints?.filter(p => p.visited).length || 0;
        const total = mission.patrolPoints?.length || 0;
        return <span className='text-warning font-bold'>{t('missions.progress.patrol', { visited, total })}</span>;
      case 'Secure':
        return <span className='text-warning font-bold'>{t('missions.progress.secure', { current: mission.secureRoundsCompleted || 0, total: 2 })}</span>;
      case 'MoveThrough':
        return <span className='text-warning font-bold'>{t('missions.progress.move_through', { current: mission.crewMembersExited || 0, total: 2 })}</span>;
      default:
        return null;
    }
  };

  const Icon = () => {
    switch (mission.type) {
      case 'Access': return <CircleDotDashed className='text-primary' />;
      case 'Acquire': return <Trophy className='text-warning' />;
      case 'Deliver': return <Trophy className='text-warning' />;
      case 'Defend': return <ShieldCheck className='text-success' />;
      case 'FightOff': return <ShieldCheck className='text-success' />;
      case 'Eliminate': return <Trophy className='text-danger' />;
      case 'Protect': return <Users className='text-info' />;
      case 'Search': return <Search className='text-warning' />;
      default: return <ShieldQuestion className='text-text-base' />;
    }
  }

  return (
    <Card className='bg-surface-base/40 border border-border/50 mb-4'>
      <div className='flex items-start gap-4'>
        <div className='flex-shrink-0 pt-1'>
          <Icon />
        </div>
        <div>
          <h4 className='font-bold text-primary font-orbitron'>{t(mission.titleKey)}</h4>
          <p className='text-sm text-text-base mt-1'>{t(mission.descriptionKey)}</p>
          <div className='mt-2 text-sm'>{renderProgress()}</div>
        </div>
      </div>
      {deploymentCondition && deploymentCondition.id !== 'no_condition' && (
        <Tooltip content={t(deploymentCondition.descriptionKey)}>
          <div className='mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-warning cursor-help'>
            <MapPinned size={16} />
            <p className='text-sm font-semibold'>{t(deploymentCondition.nameKey)}</p>
          </div>
        </Tooltip>
      )}
    </Card>
  );
};

export default MissionPanel;