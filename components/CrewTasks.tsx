

import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore, useCrewStore } from '@/stores';
import { TaskType, CampaignLogEntry, Character } from '@/types';
import { Handshake, Dumbbell, HeartPulse, UserRound, Briefcase, UserPlus, Map as MapIcon, Footprints, Wrench, Shield, UserX, CheckSquare, Brain, CheckCircle, Star } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/Select';
import { sanitizeToText } from '@/services/utils/sanitization';

const TASKS: { id: TaskType, icon: React.ReactNode }[] = [
  { id: 'explore', icon: <MapIcon size={16} /> },
  { id: 'trade', icon: <Handshake size={16} /> },
  { id: 'train', icon: <Dumbbell size={16} /> },
  { id: 'heal', icon: <HeartPulse size={16} /> },
  { id: 'repair', icon: <Wrench size={16} /> },
  { id: 'find_patron', icon: <Briefcase size={16} /> },
  { id: 'recruit', icon: <UserPlus size={16} /> },
  { id: 'track_rival', icon: <Footprints size={16} /> },
  { id: 'decoy_rival', icon: <Shield size={16} /> },
];

/**
 * A component for managing crew member tasks during the campaign's action phase.
 * It allows players to assign tasks to available members and resolve their outcomes.
 * It also displays a log of task results for the current turn.
 * @returns {React.ReactElement} The rendered crew tasks panel.
 */
const CrewTasks: React.FC = () => {
  const { t } = useTranslation();
  const crew = useCrewStore(state => state.crew);
  const campaign = useCampaignProgressStore(state => state.campaign);
  const { resolveSingleTask, finalizeTasks, purchaseExtraTradeRoll } = useCampaignProgressStore(state => state.actions);
  const { assignTask, spendStoryPointForAction } = useCrewStore(state => state.actions);

  const [charForExtraTask, setCharForExtraTask] = useState('');
  
  const restrictedSpecies = useMemo(() => {
    return campaign?.currentWorld?.traits.find(t => t.id === 'alien_species_restricted')?.restrictedAlienSpecies;
  }, [campaign?.currentWorld]);

  const availableMembers = useMemo(() => {
    return crew?.members.filter(m => {
        if (m.taskCompletedThisTurn || m.isUnavailableForTasks || m.justRecovered) {
            return false;
        }
        if (restrictedSpecies && m.raceId === restrictedSpecies) {
            return false;
        }
        const isInSickBay = m.injuries.some(i => i.recoveryTurns > 0);
        // Can work if NOT in sick bay, OR if they are in sick bay AND have a pain suppressor.
        return !isInSickBay || m.implants?.includes('pain_suppressor');
    }) || [];
}, [crew, restrictedSpecies]);

const unavailableMembers = useMemo(() => {
    return crew?.members.filter(m => {
        if (m.taskCompletedThisTurn) return false;
        if (restrictedSpecies && m.raceId === restrictedSpecies) {
            return true;
        }
        const isInSickBay = m.injuries.some(i => i.recoveryTurns > 0);
        const cannotWorkWhileInjured = isInSickBay && !m.implants?.includes('pain_suppressor');
        return m.isUnavailableForTasks || m.justRecovered || cannotWorkWhileInjured;
    }) || [];
}, [crew, restrictedSpecies]);
  const completedMembers = useMemo(() => crew?.members.filter(m => m.taskCompletedThisTurn && !m.isUnavailableForTasks && !m.justRecovered) || [], [crew]);
  const taskLog = useMemo(() => campaign?.taskResultsLog || [], [campaign]);

  const allTasksResolved = useMemo(() => availableMembers.length === 0, [availableMembers]);

  const taskOptions = useMemo((): SelectOption[] => {
    return TASKS.map(task => ({
      value: task.id,
      label: t(`tasks.${task.id}`),
    }));
  }, [t]);

  const hasTravelRestriction = useMemo(() =>
    campaign?.currentWorld?.traits.some(t => t.id === 'travel_restricted'),
  [campaign?.currentWorld?.traits]);

  const exploreTaskAssignedTo = useMemo(() =>
    crew?.members.find(m => m.task === 'explore')?.id,
  [crew?.members]);
  
  const completedMemberOptions: SelectOption[] = useMemo(() => completedMembers.map((m: Character) => ({ value: m.id, label: sanitizeToText(m.name) })), [completedMembers]);

  const taskAssignments = useMemo(() => {
    const counts: Record<string, number> = {};
    crew?.members.forEach(member => {
      if (member.task && member.task !== 'idle') {
        counts[member.task] = (counts[member.task] || 0) + 1;
      }
    });
    return counts;
  }, [crew?.members]);

  const handleExtraTask = () => {
      if (charForExtraTask) {
          spendStoryPointForAction(charForExtraTask);
          setCharForExtraTask('');
      }
  };

  const renderLog = (log: CampaignLogEntry) => {
    const { key, params } = log;
    const p = params as any; // Cast to any to access dynamic properties

    if (p?.itemType && p?.itemId) {
      const { itemType, itemId, ...restParams } = p;

      let finalItemTypeKey: string;
      switch (itemType) {
        case 'armor':
        case 'screen':
        case 'protective_device':
          finalItemTypeKey = 'protective_devices';
          break;
        case 'ship_item':
          finalItemTypeKey = 'on_board_items';
          break;
        case 'gun_mod':
          finalItemTypeKey = 'gun_mods';
          break;
        case 'gun_sight':
          finalItemTypeKey = 'gun_sights';
          break;
        case 'utility_device':
          finalItemTypeKey = 'utility_devices';
          break;
        default:
          finalItemTypeKey = `${itemType}s`; // weapons, consumables, implants
          break;
      }

      const finalKey = `${finalItemTypeKey}.${itemId}`;
      const finalItemName = t(finalKey);

      const finalParams = { ...restParams, item: finalItemName };
      return t(key, finalParams);
    }

    if (p?.traitId) {
        const { traitId, ...restParams } = p;
        const finalTraitName = t(`worldtraits.${traitId}.name`);
        const finalParams = { ...restParams, trait: finalTraitName };
        return t(key, finalParams);
    }
    
    return t(key, params);
  };
  
  const isAnyoneTrading = useMemo(() => crew?.members.some(m => m.task === 'trade'), [crew]);

  const getUnavailableReason = (char: Character): string => {
    if (restrictedSpecies && char.raceId === restrictedSpecies) {
      return t('dashboard.crewAssignments.speciesRestricted');
    }
    if (char.isUnavailableForTasks) {
      return t('dashboard.crewAssignments.disgruntled');
    }
    if (char.justRecovered) {
      return t('dashboard.crewAssignments.recovering');
    }
    return t('dashboard.crewAssignments.recovering');
  };

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.crewAssignments.title')}</h3>

      <div className='space-y-6'>
        {/* Task Results */}
        <div>
          <h4 className='font-bold text-primary flex items-center gap-2 mb-2'>
            <Brain size={16} />
            {t('dashboard.crewAssignments.resultsTitle')}
          </h4>
          <div className='p-3 bg-surface-base/50 rounded-md min-h-[60px] max-h-40 overflow-y-auto'>
            {taskLog.length > 0 ? (
              <ul className='space-y-1 text-sm text-text-base'>
                {taskLog.map((log, i) => (
                  <li key={i} className='italic animate-fade-in'>&raquo; {renderLog(log)}</li>
                ))}
              </ul>
            ) : (
              <p className='text-text-muted italic text-center py-2'>{t('dashboard.crewAssignments.noTasksRun')}</p>
            )}
          </div>
        </div>

        {/* Available Members */}
        <div>
          <h4 className='font-bold text-text-base flex items-center gap-2 mb-2'>
            <UserRound size={16} />
            {t('dashboard.crewAssignments.availableMembers')}
          </h4>
          <div className='space-y-2'>
            {availableMembers.length > 0 ? availableMembers.map(char => {
              const isInSickBay = char.injuries.some(i => i.recoveryTurns > 0);
              // A character in the `availableMembers` list is either healthy or has a pain suppressor.
              // If they are in sick bay (meaning they have a pain suppressor), they can do any task.
              // If they are not in sick bay, they can do any task except 'heal'.
              let charTaskOptions = taskOptions.filter(opt => isInSickBay || opt.value !== 'heal');

              if (hasTravelRestriction && exploreTaskAssignedTo && char.id !== exploreTaskAssignedTo) {
                charTaskOptions = charTaskOptions.map(opt =>
                  opt.value === 'explore' ? { ...opt, disabled: true } : opt
                );
              }
              
              if (campaign?.currentWorld?.blacklistedFromPatrons) {
                charTaskOptions = charTaskOptions.filter(opt => opt.value !== 'find_patron');
              }

              // New logic to enforce the 2-person limit per task
              charTaskOptions = charTaskOptions.map(opt => {
                  const task = opt.value as TaskType;
                  const assignments = taskAssignments[task] || 0;
                  const isAlreadyAssignedToThisTask = char.task === task;
                  
                  // If the task is already assigned to 2 or more people,
                  // and this character is NOT one of them, then disable this option.
                  if (assignments >= 2 && !isAlreadyAssignedToThisTask) {
                      return { ...opt, disabled: true };
                  }
                  
                  return opt;
              });

              return (
                <div key={char.id} className='flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2 bg-surface-base/50 rounded-md'>
                  <span className='flex-1 text-text-base font-semibold'>{sanitizeToText(char.name)}</span>
                  <div className='flex items-center gap-2 w-full sm:w-auto'>
                    <div className='flex-grow'>
                      <Select
                        value={char.task}
                        onChange={(value) => assignTask(char.id, value as TaskType)}
                        options={[{ value: 'idle', label: t('dashboard.crewAssignments.selectTask') }, ...charTaskOptions]}
                        aria-label={`Assign task for ${sanitizeToText(char.name)}`}
                      />
                    </div>
                    <Button onClick={() => resolveSingleTask(char.id)} disabled={char.task === 'idle'} className='text-xs py-1 px-3'>
                      <CheckSquare size={14} />
                    </Button>
                  </div>
                </div>
              )
            }) : <p className='text-text-muted italic text-center py-2'>{t('dashboard.crewAssignments.noAvailable')}</p>}
          </div>
           {isAnyoneTrading && (
              <div className='mt-4 text-right'>
                <Button onClick={purchaseExtraTradeRoll} disabled={(campaign?.credits || 0) < 3}>
                  {t('dashboard.crewAssignments.buyExtraRoll')}
                </Button>
              </div>
           )}
        </div>
      </div>

      {/* Unavailable Members List */}
      {unavailableMembers.length > 0 && (
        <div className='mt-6 pt-4 border-t border-border/50'>
          <h4 className='font-bold text-text-muted flex items-center gap-2 mb-2'>
            <UserX size={16} />
            {t('dashboard.crewAssignments.unavailable')}
          </h4>
          <ul className='space-y-1 pl-4'>
            {unavailableMembers.map(char => (
              <li key={char.id} className='text-sm text-text-muted italic'>
                {sanitizeToText(char.name)} ({getUnavailableReason(char)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extra Task via Story Point */}
      <div className='mt-6 pt-4 border-t border-border/50'>
        <h4 className='font-bold text-primary flex items-center gap-2 mb-2'>
          <Star size={16} />
          {t('dashboard.crewAssignments.extraTaskTitle')}
        </h4>
        {campaign?.spForActionUsedThisTurn ? (
          <p className='text-text-muted italic text-center py-2'>{t('dashboard.crewAssignments.extraTaskUsed')}</p>
        ) : (campaign?.storyPoints || 0) > 0 ? (
          <div className='flex flex-col sm:flex-row items-center gap-2'>
            <div className='flex-grow w-full sm:w-auto'>
              <Select
                value={charForExtraTask}
                onChange={setCharForExtraTask}
                options={completedMemberOptions}
                placeholder={t('dashboard.crewAssignments.selectCompleted')}
              />
            </div>
            <Button onClick={handleExtraTask} disabled={!charForExtraTask}>
              {t('dashboard.crewAssignments.extraTaskButton')}
            </Button>
          </div>
        ) : (
          <p className='text-text-muted italic text-center py-2'>{t('dashboard.crewAssignments.noSPForTask')}</p>
        )}
      </div>

      {/* Finalize Button */}
      <div className='mt-6 pt-4 border-t border-border/50 text-center'>
        {campaign?.tasksFinalized ? (
          <div className='flex items-center justify-center gap-2 text-success italic'>
            <CheckCircle size={18} />
            <span>{t('dashboard.crewAssignments.tasksFinalized')}</span>
          </div>
        ) : (
          <Button onClick={finalizeTasks} disabled={!allTasksResolved}>
            {t('buttons.finalizeAssignments')}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default CrewTasks;