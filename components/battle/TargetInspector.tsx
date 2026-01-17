import React from 'react';
import { BattleParticipant } from '@/types';
import { useTranslation } from '@/i18n';
import { Heart, Shield } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';
import Card from '../ui/Card';
import Tooltip from '../ui/Tooltip';
import { getProtectiveDeviceById } from '@/services/data/items';

interface TargetInspectorProps {
  participant: BattleParticipant;
}

const TargetInspector: React.FC<TargetInspectorProps> = ({ participant }) => {
  const { t } = useTranslation();
  const isOpponent = participant.type === 'enemy';

  let name = participant.type === 'character' ? sanitizeToText(participant.name) : t(`enemies.${participant.name.split(' #')[0]}`) + ` #${participant.name.split(' #')[1]}`;

  const getStatusText = () => {
    if (participant.status === 'stunned') return t('battle.infoPanel.status.stunned', { tokens: participant.stunTokens });
    if (participant.status === 'dazed') return t('battle.infoPanel.status.dazed');
    if (participant.activeEffects.some(e => e.sourceId === 'terrifying')) return t('battle.infoPanel.status.panicked');
    return null;
  };

  const statusText = getStatusText();
  
  const armor = participant.armor ? getProtectiveDeviceById(participant.armor) : undefined;
  const screen = participant.screen ? getProtectiveDeviceById(participant.screen) : undefined;
  const protection = armor || screen;

  return (
    <Card className="w-48 p-2 bg-surface-overlay/90 backdrop-blur-md border-border/70 shadow-2xl animate-fade-in text-xs">
      <h5 className={`font-bold font-orbitron truncate ${isOpponent ? 'text-danger' : 'text-primary'}`}>{name}</h5>
      <div className="flex items-center justify-between gap-2 mt-2">
        <Tooltip content={t('characterCard.tough')}>
          <div className="flex items-center gap-1.5" aria-label={t('characterCard.tough')}>
            <Heart size={12} className="text-danger" />
            <span className="font-bold">{participant.stats.toughness}</span>
          </div>
        </Tooltip>
        {protection && (
            <Tooltip content={t(`protective_devices.${protection.id}`)}>
                <div className="flex items-center gap-1.5" aria-label="Protection">
                    <Shield size={12} className="text-info" />
                    {protection.savingThrow && <span className="font-bold">{protection.savingThrow}+</span>}
                </div>
            </Tooltip>
        )}
      </div>
      {statusText && (
        <div className="mt-2 pt-1 border-t border-border/50 text-center">
            <p className="font-bold text-warning">{statusText}</p>
        </div>
      )}
    </Card>
  );
};

export default TargetInspector;