import React, { useMemo } from 'react';
import type { BattleParticipant } from '@/types';
import type { Position, Terrain } from '@/types/battle';
import { useTranslation } from '@/i18n';
import Card from '../ui/Card';
import { sanitizeToText } from '@/services/utils/sanitization';

type TileInspectorProps = {
  pos: Position;
  terrain: Terrain | null;
  occupiedBy: BattleParticipant | null;
  isReachable: boolean;
  isCoverSpot: boolean;
};

const TileInspector: React.FC<TileInspectorProps> = ({ pos, terrain, occupiedBy, isReachable, isCoverSpot }) => {
  const { t } = useTranslation();

  const occupiedLabel = useMemo(() => {
    if (!occupiedBy) return null;
    if (occupiedBy.type === 'character') return sanitizeToText(occupiedBy.name);
    const nameParts = occupiedBy.name.split(' #');
    return `${t(`enemies.${nameParts[0]}`)} #${nameParts[1]}`;
  }, [occupiedBy, t]);

  return (
    <Card className="w-56 p-2 bg-surface-overlay/90 backdrop-blur-md border-border/70 shadow-2xl animate-fade-in text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold font-orbitron text-text-base">
          {t('battle.hud.tile')} {pos.x},{pos.y}
        </div>
        <span className="px-1.5 py-0.5 rounded border border-border/70 bg-surface-raised/70 text-[10px] font-bold text-text-muted">
          {t('battle.hud.inspectPinned')}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-text-base">
        {terrain && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-muted">{t('battle.hud.terrain')}</span>
            <span className="font-bold truncate">{terrain.name}</span>
          </div>
        )}

        {occupiedLabel && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-muted">{t('battle.hud.occupied')}</span>
            <span className="font-bold truncate">{occupiedLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">{t('battle.hud.reachable')}</span>
          <span className={`font-bold ${isReachable ? 'text-success' : 'text-text-base'}`}>{isReachable ? t('battle.hud.yes') : t('battle.hud.no')}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">{t('battle.hud.cover')}</span>
          <span className={`font-bold ${isCoverSpot ? 'text-info' : 'text-text-base'}`}>{isCoverSpot ? t('battle.hud.yes') : t('battle.hud.no')}</span>
        </div>

        {terrain && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted">{t('battle.hud.blocksLos')}</span>
              <span className={`font-bold ${terrain.blocksLineOfSight ? 'text-warning' : 'text-text-base'}`}>{terrain.blocksLineOfSight ? t('battle.hud.yes') : t('battle.hud.no')}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted">{t('battle.hud.impassable')}</span>
              <span className={`font-bold ${terrain.isImpassable ? 'text-danger' : 'text-text-base'}`}>{terrain.isImpassable ? t('battle.hud.yes') : t('battle.hud.no')}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default TileInspector;

