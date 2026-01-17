import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LogEntry, Weapon } from '../../types';
import { useTranslation } from '../../i18n';
import { Swords, Target, Footprints, Brain, Zap, Skull, Hand, Crosshair, Shield, Ban, Pill, Wind, ChevronDown, ChevronUp } from 'lucide-react';
import { sanitizeToText } from '../../services/utils/sanitization';
import { useBattleStore } from '../../stores';
import { getWeaponById } from '../../services/data/items';
import Tooltip from '../ui/Tooltip';

/**
 * A component to display detailed weapon information inside a tooltip.
 * @param {{ weapon: Weapon }} props - The weapon data to display.
 */
const WeaponTooltipContent: React.FC<{ weapon: Weapon }> = ({ weapon }) => {
  const { t } = useTranslation();
  const descriptionKey = `weapons_desc.${weapon.id}`;
  const description = t(descriptionKey);

  return (
    <div className='text-left text-xs space-y-1 max-w-xs'>
      <p className='font-bold text-primary'>{t(`weapons.${weapon.id}`)}</p>
      {description !== descriptionKey && (
          <p className="text-text-base text-[11px] whitespace-normal my-1">{description}</p>
      )}
      <div className='grid grid-cols-3 gap-x-2'>
        <span>R: {weapon.range}</span>
        <span>S: {weapon.shots}</span>
        <span>D: +{weapon.damage}</span>
      </div>
      {weapon.traits.length > 0 && (
        <p className='italic text-text-muted text-[10px] truncate'>{weapon.traits.join(', ')}</p>
      )}
    </div>
  );
};

/**
 * Props for the BattleLog component.
 * @property {(string | LogEntry)[]} log - An array of log entries to display.
 */
type BattleLogProps = {
  log: (string | LogEntry)[];
};

/**
 * Displays a virtualized, scrollable log of battle events.
 * It intelligently parses and formats log entries, making participant names clickable
 * and showing tooltips for items like weapons.
 * @param {BattleLogProps} props - The component props.
 * @returns {React.ReactElement} The rendered battle log.
 */
const BattleLog: React.FC<BattleLogProps> = ({ log }) => {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get required state from stores
  const participants = useBattleStore(state => state.battle?.participants) || [];
  const { setSelectedParticipantId } = useBattleStore(state => state.actions);

  const rowVirtualizer = useVirtualizer({
    count: log.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22, // Estimated height of a single-line log entry
    overscan: 10,
  });

  useEffect(() => {
    if (log.length > 0) {
      rowVirtualizer.scrollToIndex(log.length - 1, { align: 'end', behavior: 'auto' });
    }
  }, [log, rowVirtualizer, isExpanded]);

  // Create a memoized map of names to IDs for performance
  const nameToIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach(p => {
      if (p.type === 'character') {
        map.set(sanitizeToText(p.name), p.id);
      } else {
        const nameParts = (p.name || '').split(' #');
        const templateId = nameParts[0];
        const number = nameParts[1];
        const translatedName = `${t(`enemies.${templateId}`)} #${number}`;
        map.set(translatedName, p.id);
      }
    });
    return map;
  }, [participants, t]);


  const renderLogMessage = (logEntry: string | LogEntry, index: number) => {
    let keyForIcon = '';
    let source: 'player' | 'enemy' | 'host' | 'guest' | undefined = undefined;

    // Helper to translate names consistently
    const translateName = (nameStr: string): string => {
      if (nameStr.includes('_') && nameStr.includes(' #')) {
        const nameParts = nameStr.split(' #');
        const templateId = nameParts[0];
        const number = nameParts[1];
        return `${t(`enemies.${templateId}`)} #${number}`;
      }
      return sanitizeToText(nameStr);
    };

    // If it's a simple string (like a separator)
    if (typeof logEntry === 'string') {
      if (logEntry.startsWith('---')) {
        return <p key={index} className='font-bold text-primary text-center tracking-wider py-1 opacity-70 my-1'>{logEntry}</p>;
      }
      return <>{logEntry}</>; // Render plain string for others
    }

    // If it's a LogEntry object
    if (logEntry && typeof logEntry === 'object' && typeof logEntry.key === 'string') {
      source = logEntry.source;
      keyForIcon = logEntry.key;

      const template = t(logEntry.key);
      const parts = template.split(/(\{\w+\})/g).filter(part => part);

      const messageElements = parts.map((part, i) => {
        if (part.startsWith('{') && part.endsWith('}')) {
          const paramKey = part.slice(1, -1);
          const paramValue = logEntry.params?.[paramKey];

          if (paramValue === undefined) return part; // Placeholder not found, show as is

          // --- INTERACTIVE WEAPON ---
          if (paramKey === 'weapon') {
            const weaponId = String(paramValue);
            const weaponData = getWeaponById(weaponId);
            if (weaponData) {
              return (
                <Tooltip key={i} content={<WeaponTooltipContent weapon={weaponData} />}>
                  <span className='font-semibold text-accent underline decoration-dotted cursor-help'>
                    {t(`weapons.${weaponId}`)}
                  </span>
                </Tooltip>
              );
            }
            return <span key={i} className='font-semibold'>{t(`weapons.${weaponId}`)}</span>;
          }

          // --- INTERACTIVE PARTICIPANT NAME ---
          const participantKeys = ['attacker', 'defender', 'name', 'target', 'winner', 'loser', 'name1', 'name2'];
          if (participantKeys.includes(paramKey)) {
            const rawName = String(paramValue);
            const translatedName = translateName(rawName);
            const participantId = nameToIdMap.get(translatedName);
            const participant = participants.find(p => p.id === participantId);

            if (participantId && participant) {
              const isOpponent = participant.type === 'enemy' || (logEntry.source === 'player' && source === 'enemy');
              return (
                <span
                  key={i}
                  role='button'
                  tabIndex={0}
                  className={`font-bold cursor-pointer hover:underline ${isOpponent ? 'text-danger/90' : 'text-primary'}`}
                  onClick={() => setSelectedParticipantId(participantId)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedParticipantId(participantId)}
                >
                  {translatedName}
                </span>
              );
            }
            return <span key={i} className='font-semibold'>{translatedName}</span>;
          }

          // --- OTHER PARAMS ---
          if (paramKey === 'consumable') return <span key={i} className='font-semibold'>{t(`consumables.${paramValue}`)}</span>;
          if (paramKey === 'device') return <span key={i} className='font-semibold'>{t(`protective_devices.${paramValue}`)}</span>;
          if (paramKey === 'reason') {
            const translatedReason = t(String(paramValue));
            return translatedReason === paramValue ? String(paramValue) : translatedReason;
          }
          if (paramKey === 'eventName') return <span key={i} className='font-bold text-primary'>{t(String(paramValue))}</span>
          if (paramKey === 'trait') {
            const key = `traits.${paramValue}`;
            const translatedTrait = t(key);
            return key === translatedTrait ? String(paramValue) : translatedTrait;
          }
          if (paramKey === 'traitId') return <span key={i} className='font-bold text-info'>{t(`traits.${paramValue}`)}</span>;

          return String(paramValue);
        }
        return part;
      });

      // --- ICON LOGIC ---
      const lowerCaseMsg = template.toLowerCase();
      let icon = null;
      if (keyForIcon.includes('battle_event')) icon = <Wind size={14} className='inline-block mr-2 text-primary' />;
      else if (keyForIcon.includes('casualty') || lowerCaseMsg.includes(t('battle.infoPanel.casualty').toLowerCase())) icon = <Skull size={14} className='inline-block mr-2 text-danger' />;
      else if (keyForIcon.includes('stun') || lowerCaseMsg.includes('stunned')) icon = <Zap size={14} className='inline-block mr-2 text-warning' />;
      else if (keyForIcon.includes('dazed') || lowerCaseMsg.includes(t('battle.infoPanel.status.dazed').toLowerCase())) icon = <Brain size={14} className='inline-block mr-2 text-accent' />;
      else if (keyForIcon.includes('panicked') || lowerCaseMsg.includes(t('battle.infoPanel.status.panicked').toLowerCase())) icon = <Wind size={14} className='inline-block mr-2 text-warning' />;
      else if (keyForIcon.includes('shoot') || lowerCaseMsg.includes('shot')) icon = <Target size={14} className='inline-block mr-2' />;
      else if (keyForIcon.includes('brawl')) icon = <Swords size={14} className='inline-block mr-2' />;
      else if (keyForIcon.includes('move') || keyForIcon.includes('dash') || keyForIcon.includes('flee') || keyForIcon.includes('push')) icon = <Footprints size={14} className='inline-block mr-2' />;
      else if (keyForIcon.includes('hit') || lowerCaseMsg.includes('hit!')) icon = <Crosshair size={14} className='inline-block mr-2 text-success' />;
      else if (keyForIcon.includes('miss')) icon = <Ban size={14} className='inline-block mr-2 text-text-muted' />;
      else if (keyForIcon.includes('save')) icon = <Shield size={14} className='inline-block mr-2 text-info' />;
      else if (keyForIcon.includes('uses') || keyForIcon.includes('consumable')) icon = <Pill size={14} className='inline-block mr-2' />;

      const isErrorMsg = keyForIcon.includes('error');
      if (isErrorMsg) icon = <Ban size={14} className='inline-block mr-2 text-warning' />;

      return (
        <div key={index} className={`${isErrorMsg ? 'text-warning' : 'text-text-base'} whitespace-pre-wrap flex items-start py-0.5`}>
          <span className='w-5 shrink-0 pt-0.5'>{icon}</span>
          <span className='flex-1'>{messageElements}</span>
        </div>
      );
    }

    console.warn('Malformed log entry:', logEntry);
    return (
      <div key={index} className='text-warning whitespace-pre-wrap flex items-start py-0.5'>
        <span className='w-5 shrink-0 pt-0.5'><Ban size={14} /></span>
        <span className='flex-1'><i className='text-danger'>[Invalid Log Entry]</i></span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-surface-base/50 rounded-md p-2 mt-auto transition-all duration-300 ${isExpanded ? 'max-h-[30rem]' : 'max-h-48'}`}>
      <div className='flex justify-between items-center p-2 border-b border-border mb-2'>
        <h4 className='font-bold text-text-base'>{t('battle.battleLog')}</h4>
        <Tooltip content={isExpanded ? t('battle.log.collapse') : t('battle.log.expand')}>
          <button onClick={() => setIsExpanded(!isExpanded)} className='p-1 rounded-full hover:bg-surface-raised'>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </Tooltip>
      </div>
      <div ref={parentRef} className={`flex-grow overflow-y-auto pr-2 text-sm transition-all duration-300 ${isExpanded ? 'h-96' : 'h-32'}`}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualItem => (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderLogMessage(log[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BattleLog;