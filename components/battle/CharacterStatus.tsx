import React from 'react';
import { BattleParticipant } from '../../types';
import { useTranslation } from '../../i18n';
import { Heart, Shield, Zap, Crosshair } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import { getWeaponById } from '@/services/data/items';
import { useBattleInteractionState } from '@/hooks/battle/useBattleInteractionState';
import { HudDensity } from '@/stores';

interface CharacterStatusProps {
  participant: BattleParticipant;
  embedded?: boolean;
  density?: HudDensity;
}

const CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded = false, density = 'normal' }) => {
  const { t } = useTranslation();
  const { rangeDisplayWeaponInstanceId, setRangeDisplayWeapon } = useBattleInteractionState();

  const isOpponent = participant.type === 'enemy';

  let name = participant.type === 'character' ? sanitizeToText(participant.name) : t(`enemies.${participant.name.split(' #')[0]}`) + ` #${participant.name.split(' #')[1]}`;

  const content = (
    <div className={`${embedded ? '' : 'bg-surface-raised/80 backdrop-blur-sm p-3 rounded-lg border border-border/50 w-full animate-slide-up shadow-lg'}`}>
      <div className='text-center'>
        <img src={participant.portraitUrl} alt={name} className='w-16 h-16 rounded-full mx-auto mb-2 border-2 border-border object-cover shadow-md' />
        <h4 className={`font-bold text-lg font-orbitron truncate ${isOpponent ? 'text-danger' : 'text-primary'}`}>{name}</h4>
        <div className='flex items-center justify-center gap-4 mt-2'>
          <div className='flex items-center gap-1.5 text-sm' title={t('characterCard.tough')}>
            <Heart size={16} className='text-danger' />
            <span className='font-bold text-text-base'>{participant.stats.toughness}</span>
          </div>
          {participant.armor && (
            <div className='flex items-center gap-1.5 text-sm' title={t('characterCard.equipment')}>
              <Shield size={16} className='text-info' />
              <span className='font-bold text-text-base'>{t(`protective_devices.${participant.armor}`)}</span>
            </div>
          )}
        </div>
        <div className='flex items-center justify-center gap-2 mt-3'>
          <span className='text-xs text-text-muted uppercase font-bold'>{t('battle.hud.actions')}</span>
          <div className='flex gap-1.5'>
            {[...Array(participant.actionsRemaining)].map((_, i) => (
              <Zap key={i} size={18} className='text-warning fill-current' />
            ))}
            {[...Array(2 - participant.actionsRemaining)].map((_, i) => (
              <Zap key={i} size={18} className='text-text-muted' />
            ))}
          </div>
        </div>
      </div>
      <div className='mt-3 pt-3 border-t border-border/50'>
        <h5 className='text-xs text-text-muted uppercase font-bold mb-2 text-left'>{t('battle.hud.weapons')}</h5>
        <div className='space-y-1'>
          {(participant.weapons || []).map(cw => {
            const weapon = getWeaponById(cw.weaponId);
            if (!weapon) return null;
            const isSelectedForRange = rangeDisplayWeaponInstanceId === cw.instanceId;
            return (
              <button
                key={cw.instanceId}
                onClick={() => setRangeDisplayWeapon(cw.instanceId)}
                className={`w-full flex items-center justify-between text-left p-2 rounded-md text-sm transition-colors ${isSelectedForRange ? 'bg-primary/20 ring-1 ring-primary' : 'bg-surface-base/50 hover:bg-surface-base'}`}
                disabled={weapon.range === 'brawl'}
                title={weapon.range === 'brawl' ? t('tooltips.actions.brawlWeaponNoRange') : t('tooltips.actions.showWeaponRange')}
              >
                <span className='font-semibold'>{t(`weapons.${weapon.id}`)}</span>
                <div className='flex items-center gap-2 text-text-muted'>
                  <span>{weapon.range === 'brawl' ? 'Brawl' : `${weapon.range}"`}</span>
                  <Crosshair size={16} className={isSelectedForRange ? 'text-primary' : ''} />
                </div>
              </button>
            );
          })}
          {(participant.weapons || []).length === 0 && (
            <p className='text-xs text-text-muted italic text-center'>{t('characterCard.unarmed')}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (!embedded) return content;

  return <div className={`${density === 'compact' ? 'text-sm' : ''}`}>{content}</div>;
};

export default CharacterStatus;
