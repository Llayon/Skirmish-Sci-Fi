import React, { useState, useMemo } from 'react';
import { BattleParticipant, MultiplayerRole, Mission } from '../../types';
import { useTranslation } from '../../i18n';
import { StatDisplay } from '../CharacterCard';
import { Zap, Footprints, Target, Heart, Brain, Dices, Package, Shield, Sparkles, Hourglass, BarChart3 } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { sanitizeToText } from '../../services/utils/sanitization';
import { BattleDomain } from '../../services/domain/battleDomain';

/**
 * Props for the ParticipantInfo component.
 * @property {BattleParticipant} participant - The participant whose information is to be displayed.
 * @property {Mission} mission - The current battle mission object.
 * @property {BattleParticipant[]} participants - The list of all participants in the battle.
 * @property {MultiplayerRole | null} multiplayerRole - The role of the current player in a multiplayer game.
 */
type ParticipantInfoProps = {
  participant: BattleParticipant;
  mission: Mission;
  participants: BattleParticipant[];
  multiplayerRole: MultiplayerRole | null;
};

/**
 * Displays detailed information about a battle participant, including stats, loadout, and active effects.
 * This component is typically shown within the BattleHUD or an info panel.
 * @param {ParticipantInfoProps} props - The component props.
 * @returns {React.ReactElement} The rendered participant information panel.
 */
const ParticipantInfo: React.FC<ParticipantInfoProps> = ({ participant, mission, participants, multiplayerRole }) => {
  const { t } = useTranslation();
  const [infoPanelTab, setInfoPanelTab] = useState<'stats' | 'loadout' | 'effects'>('stats');

  const effectiveStats = useMemo(() => BattleDomain.calculateEffectiveStats(participant), [participant]);
  const p = participant;

  let participantName: string;
  if (p.type === 'character') {
    participantName = sanitizeToText(p.name);
  } else {
    const nameParts = (p.name || '').split(' #');
    const templateId = nameParts[0];
    const number = nameParts[1];
    participantName = `${t(`enemies.${templateId}`)} #${number}`;
  }

  const isItemCarrier = useMemo(() => {
    return mission.itemCarrierId === participant.id;
  }, [mission.itemCarrierId, participant.id]);

  const isEngaged = useMemo(() => BattleDomain.isEngaged(p, participants, multiplayerRole), [p, participants, multiplayerRole]);

  const isPanicked = p.activeEffects.some(e => e.sourceId === 'terrifying');

  const isOpponent = useMemo(() => {
    if (multiplayerRole) {
      // In multiplayer, an opponent is anyone whose ID does not start with your role prefix.
      return !p.id.startsWith(multiplayerRole);
    }
    // In solo mode, an opponent is any participant of type 'enemy'.
    return p.type === 'enemy';
  }, [p, multiplayerRole]);


  const TabButton: React.FC<{ name: string; icon: React.ReactNode; activeTab: 'stats' | 'loadout' | 'effects'; onClick: () => void; }> = ({ name, icon, activeTab, onClick }) => {
    const isActive = name.toLowerCase() === activeTab;
    return (
      <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-base hover:border-border'}`}
      >
        {icon}
        <span className='hidden sm:inline'>{name}</span>
      </button>
    );
  };

  return (
    <div>
      <div className='flex justify-between items-start'>
        <div className='flex items-center gap-2'>
          <h4 className={`font-bold text-lg ${isOpponent ? 'text-danger' : 'text-primary'}`}>{participantName}</h4>
          {isItemCarrier && (
            <Tooltip content={t('missions.tooltips.itemCarrier')}>
              <Package size={18} className='text-warning' />
            </Tooltip>
          )}
        </div>
        {p.type === 'character' && (
          <div className='text-right -mt-1'>
            <p className='text-xs text-text-muted uppercase'>XP</p>
            <p className='text-lg font-bold font-orbitron text-warning'>{p.xp}</p>
          </div>
        )}
      </div>
      <div className='text-sm text-text-base mb-3 -mt-2 h-4 flex items-center gap-2 flex-wrap'>
        {p.status === 'stunned' &&
          <Tooltip content={t('tooltips.statuses.stunned')}>
            <span className='text-warning font-bold text-sm underline decoration-dotted cursor-help'>{t('battle.infoPanel.status.stunned', { tokens: p.stunTokens })}</span>
          </Tooltip>
        }
        {p.status === 'dazed' &&
          <Tooltip content={t('tooltips.statuses.dazed')}>
            <span className='text-accent font-bold text-sm underline decoration-dotted cursor-help'>{t('battle.infoPanel.status.dazed')}</span>
          </Tooltip>
        }
        {isPanicked &&
          <Tooltip content={t('tooltips.statuses.panicked')}>
            <span className='text-warning font-bold text-sm underline decoration-dotted cursor-help'>{t('battle.infoPanel.status.panicked')}</span>
          </Tooltip>
        }
        {isEngaged &&
          <Tooltip content={t('tooltips.statuses.engaged')}>
            <span className='text-danger font-bold text-sm underline decoration-dotted cursor-help'>{t('battle.infoPanel.status.engaged')}</span>
          </Tooltip>
        }
      </div>

      <div className='border-b border-border -mx-3'>
        <nav className='flex justify-around'>
          <TabButton name={t('battle.infoPanel.statsTab')} icon={<BarChart3 size={16} />} activeTab={infoPanelTab} onClick={() => setInfoPanelTab('stats')} />
          <TabButton name={t('battle.infoPanel.loadoutTab')} icon={<Package size={16} />} activeTab={infoPanelTab} onClick={() => setInfoPanelTab('loadout')} />
          <TabButton name={t('battle.infoPanel.effectsTab')} icon={<Sparkles size={16} />} activeTab={infoPanelTab} onClick={() => setInfoPanelTab('effects')} />
        </nav>
      </div>

      <div className='py-3 min-h-[160px]'>
        {infoPanelTab === 'stats' && (
          <div className='grid grid-cols-3 gap-1 my-3 animate-fade-in'>
            <StatDisplay icon={<Zap size={16} />} label={t('characterCard.react')} value={effectiveStats.reactions} tooltip={t('tooltips.stats.reactions')} />
            <StatDisplay icon={<Footprints size={16} />} label={t('characterCard.speed')} value={effectiveStats.speed} tooltip={t('tooltips.stats.speed')} />
            <StatDisplay icon={<Target size={16} />} label={t('characterCard.combat')} value={effectiveStats.combat} tooltip={t('tooltips.stats.combat')} />
            <StatDisplay icon={<Heart size={16} />} label={t('characterCard.tough')} value={effectiveStats.toughness} tooltip={t('tooltips.stats.toughness')} />
            <StatDisplay icon={<Brain size={16} />} label={t('characterCard.savvy')} value={effectiveStats.savvy} tooltip={t('tooltips.stats.savvy')} />
            <StatDisplay icon={<Dices size={16} />} label={t('characterCard.luck')} value={`${p.currentLuck}/${p.stats.luck}`} tooltip={t('tooltips.stats.luck')} />
          </div>
        )}
        {infoPanelTab === 'loadout' && (
          <div className='space-y-3 my-3 animate-fade-in'>
            <div className='space-y-1 text-xs'>
              {(p.weapons || []).map(cw => {
                const w = BattleDomain.getEffectiveWeapon(p, cw.instanceId);
                if (!w) return null;
                const descriptionKey = `weapons_desc.${w.id}`;
                const description = t(descriptionKey);
                const hasDescription = description !== descriptionKey;
                
                return (
                  <div key={cw.instanceId} className='p-2 bg-surface-base/70 rounded-md border border-border/50'>
                    <p className='font-bold text-primary/90'>{t(`weapons.${w.id}`)}</p>
                    {hasDescription && <p className="text-text-base/80 text-[11px] my-1 whitespace-normal">{description}</p>}
                    <div className='grid grid-cols-3 gap-x-2 mt-1'><span>R: {w.range}</span><span>S: {w.shots}</span><span>D: +{w.damage}</span></div>
                    <p className='italic text-text-muted text-[10px] truncate mt-1'>{w.traits.join(', ')}</p>
                  </div>
                );
              })}
              {(p.weapons || []).length === 0 && <p className='text-text-muted italic text-xs'>{t('characterCard.unarmed')}</p>}
              {p.armor && <div className='text-text-base mt-1 flex items-center gap-2 text-xs'><Shield size={12} className='text-info' /> {t(`protective_devices.${p.armor}`)}</div>}
              {p.screen && <div className='text-text-base flex items-center gap-2 text-xs'><Sparkles size={12} className='text-accent' /> {t(`protective_devices.${p.screen}`)}</div>}
            </div>
          </div>
        )}
        {infoPanelTab === 'effects' && (
          <div className='my-3 animate-fade-in'>
            {p.activeEffects.length > 0 ? (
              <div className='space-y-1 text-xs'>
                {p.activeEffects.map(e => (
                  <div key={e.sourceId} className='flex items-center gap-2 text-warning p-2 bg-warning/30 rounded-md'>
                    <Hourglass size={12} />
                    <span>{e.sourceName} ({e.duration === -1 ? t('battle.infoPanel.permanent') : t('battle.infoPanel.roundsLeft', { duration: e.duration })})</span>
                  </div>
                ))}
              </div>
            ) : <p className='text-text-muted text-sm text-center italic py-4'>{t('battle.infoPanel.noEffects')}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantInfo;