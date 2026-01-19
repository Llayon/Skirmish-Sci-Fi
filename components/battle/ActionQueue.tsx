import React from 'react';
import { useBattleStore } from '@/stores';
import { useTranslation } from '@/i18n';
import { sanitizeToText } from '@/services/utils/sanitization';
import { BattleParticipant } from '@/types';
import { Heart, Shield, Zap } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

type ActionQueueProps = {
  embedded?: boolean;
  compact?: boolean;
};

const ActionQueue: React.FC<ActionQueueProps> = ({ embedded = false, compact = false }) => {
  const { t } = useTranslation();
  const battle = useBattleStore(state => state.battle);
  if (!battle) return null;

  const { phase, participants, quickActionOrder, slowActionOrder, enemyTurnOrder, activeParticipantId } = battle;

  const isQuickPhase = phase === 'quick_actions';
  const isSlowPhase = phase === 'slow_actions';
  const isEnemyPhase = phase === 'enemy_actions';

  const containerHeight = compact ? 'h-[96px]' : 'h-[120px]';

  if (!isQuickPhase && !isSlowPhase && !isEnemyPhase) {
    return embedded ? null : <div className={containerHeight} />;
  }

  let order: string[] = [];
  if (isQuickPhase) order = quickActionOrder;
  else if (isSlowPhase) order = slowActionOrder;
  else if (isEnemyPhase) order = enemyTurnOrder;

  const orderedParticipants = order
    .map(id => participants.find(p => p.id === id))
    .filter((p): p is BattleParticipant => !!p && p.status !== 'casualty');

  const getParticipantName = (p: BattleParticipant) => {
    if (p.type === 'character') {
      return sanitizeToText(p.name);
    }
    const nameParts = p.name.split(' #');
    return `${t(`enemies.${nameParts[0]}`)} #${nameParts[1]}`;
  };

  const list = (
    <div className='flex items-start justify-center gap-3 flex-grow'>
        {orderedParticipants.map(p => {
          const isActive = p.id === activeParticipantId;
          const hasActed = p.actionsRemaining <= 0;
          const isOpponent = p.type === 'enemy';

          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'} ${hasActed && !isEnemyPhase ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
                <img
                  src={p.portraitUrl}
                  alt={getParticipantName(p)}
                  className={`w-14 h-14 rounded-full object-cover border-4 ${isActive ? (isOpponent ? 'border-danger' : 'border-primary') : 'border-secondary'}`}
                />
              </div>
               <div className="flex items-center justify-center gap-1.5 -mt-2.5 bg-surface-base/60 rounded-full px-2 py-0.5 z-10 border border-border/50">
                <Tooltip content={t('characterCard.tough')}>
                  <div className="flex items-center text-xs">
                    <Heart size={10} className="text-danger" />
                    <span className="ml-0.5 font-mono font-bold">{p.stats.toughness}</span>
                  </div>
                </Tooltip>
                {(p.armor || p.screen) && (
                    <Tooltip content={t('characterCard.equipment')}>
                        <Shield size={10} className="text-info" />
                    </Tooltip>
                )}
                <Tooltip content={t('battle.infoPanel.actionsTitle', { actionsLeft: p.actionsRemaining })}>
                    <div className="flex items-center gap-0.5">
                        <Zap size={10} className={p.actionsRemaining >= 1 ? 'text-warning fill-current' : 'text-text-muted/50'} />
                        <Zap size={10} className={p.actionsRemaining >= 2 ? 'text-warning fill-current' : 'text-text-muted/50'} />
                    </div>
                </Tooltip>
              </div>
              <p className={`text-xs font-semibold truncate max-w-[70px] ${isActive ? 'text-primary' : 'text-text-base'}`}>
                {getParticipantName(p)}
              </p>
            </div>
          );
        })}
      </div>
  );

  if (embedded) {
    return <div className={`${containerHeight} flex flex-col`}>{list}</div>;
  }

  return (
    <div className={`bg-surface-base/40 border-b border-border/50 p-2 ${containerHeight} flex flex-col`}>
      <h3 className='text-center text-sm font-bold uppercase text-primary tracking-wider mb-2'>
        {t(`battle.phase.${phase}`)}
      </h3>
      {list}
    </div>
  );
};

export default ActionQueue;
