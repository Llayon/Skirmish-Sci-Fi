
import React, { useMemo } from 'react';
import { BattleParticipant, Weapon, isAcquireMission, isDeliverMission, isAccessMission, isPatrolMission, isSearchMission } from '../../types';
import { useTranslation } from '../../i18n';
import Button from '../ui/Button';
import { distance } from '../../services/gridUtils';
import { Move, Footprints, Swords, Target, Crosshair, Hand, Search, Loader, XCircle, Wind, Zap, Pill, Tornado, Snowflake, Skull } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { BattleDomain } from '../../services/domain/battleDomain';
import { useGameState } from '../../hooks/useGameState';
import { useMultiplayerStore, useBattleStore } from '../../stores';
import { BattleLogic } from '../../hooks/useBattleLogic';
import { getWeaponById } from '../../services/data/items';

/**
 * Props for the ActionControls component.
 * @property {BattleParticipant} participant - The participant whose actions are being controlled.
 * @property {BattleLogic} battleLogic - The battle logic hooks providing UI state and handlers.
 */
type ActionControlsProps = {
  participant: BattleParticipant;
  battleLogic: BattleLogic;
};

/**
 * A specialized Button component wrapped in a Tooltip.
 * @param {string} tooltip - The text to display in the tooltip.
 */
const ActionButton: React.FC<React.ComponentProps<typeof Button> & { tooltip: string }> = ({ tooltip, children, ...props }) => (
  <Tooltip content={tooltip}>
    <Button {...props} aria-label={tooltip} className={`w-14 h-14 p-2 rounded-full text-2xl shadow-lg hover:shadow-primary/50 ${props.className || ''}`}>
      {children}
    </Button>
  </Tooltip>
);

/**
 * Renders the set of available actions for the currently active participant.
 * This includes movement, combat, interaction, and ending the turn.
 * @param {ActionControlsProps} props - The component props.
 * @returns {React.ReactElement} The rendered action controls UI.
 */
const ActionControls: React.FC<ActionControlsProps> = ({ participant, battleLogic }) => {
  const { t } = useTranslation();
  const { battle } = useGameState();
  const { uiState, handlers } = battleLogic;

  const multiplayerRole = useMultiplayerStore(state => state.multiplayerRole);
  const { setSelectedParticipantId } = useBattleStore(state => state.actions);
  const selectedParticipantId = useBattleStore(state => state.selectedParticipantId);
  const pendingActionFor = useBattleStore(state => state.pendingActionFor);

  const mission = battle!.mission;
  const terrain = battle!.terrain;
  const participants = battle!.participants;
  const followUpState = battle!.followUpState;
  const isFrozenWorld = battle!.worldTraits?.some(trait => trait.id === 'frozen');
  const isNullZone = battle!.worldTraits?.some(trait => trait.id === 'null_zone');

  const isPending = pendingActionFor === participant.id;

  const enemies = useMemo(() =>
    participants.filter(p => p.type === 'enemy' && p.status !== 'casualty'),
    [participants]
  );

  const availableRangedWeapons = useMemo(() =>
    (participant?.weapons || [])
      .map(cw => BattleDomain.getEffectiveWeapon(participant, cw.instanceId))
      .filter((w): w is Weapon & { instanceId: string } => !!w && w.range !== 'brawl' && !participant.inoperableWeapons?.includes(w.instanceId)),
    [participant]
  );

  const availableBrawlWeapons = useMemo(() =>
    (participant?.weapons || [])
      .map(cw => BattleDomain.getEffectiveWeapon(participant, cw.instanceId))
      .filter((w): w is Weapon & { instanceId: string } => !!w && (w.traits.includes('melee') || w.traits.includes('pistol')) && !participant.inoperableWeapons?.includes(w.instanceId)),
    [participant]
  );

  const isEngaged = useMemo(() => BattleDomain.isEngaged(participant, participants, multiplayerRole), [participant, participants, multiplayerRole]);
  const mustBrawl = useMemo(() =>
    participant.specialAbilities?.includes('kerin_must_brawl') &&
    participants.some(p => p.type === 'enemy' && p.status !== 'casualty' && distance(participant.position, p.position) <= participant.stats.speed),
    [participant, participants]
  );


  const interaction = useMemo(() => {
    if (participant.actionsTaken.combat || participant.actionsTaken.dash) return null;

    if (isAcquireMission(mission)) {
      if (mission.itemPosition && distance(participant.position, mission.itemPosition) <= 1) {
        return { textKey: 'buttons.pickupItem', icon: Hand };
      }
    }
    if (isDeliverMission(mission)) {
        if (mission.itemPosition && distance(participant.position, mission.itemPosition) <= 1) {
            return { textKey: 'buttons.pickupItem', icon: Hand };
        }
        if (mission.objectivePosition && mission.itemCarrierId === participant.id && distance(participant.position, mission.objectivePosition) === 0) {
            return { textKey: 'buttons.placePackage', icon: Hand };
        }
    }
    if (isAccessMission(mission)) {
      const objectivePos = mission.objectivePosition;
      if (objectivePos && (distance(participant.position, objectivePos) === 0 || (participant.type === 'character' && participant.classId === 'engineer' && distance(participant.position, objectivePos) <= 6))) {
        return { textKey: 'buttons.accessConsole', icon: Hand };
      }
    }
    if (isPatrolMission(mission)) {
        if (terrain.find(t => mission.patrolPoints?.some(p => !p.visited && p.id === t.id) && distance(participant.position, { x: t.position.x + Math.floor(t.size.width / 2), y: t.position.y + Math.floor(t.size.height / 2) }) <= 2)) {
            return { textKey: 'buttons.scanArea', icon: Hand };
        }
    }
    if (isSearchMission(mission)) {
        if (mission.objectivePosition && mission.searchRadius && distance(participant.position, mission.objectivePosition) <= mission.searchRadius && !mission.searchedPositions?.some(p => p.x === participant.position.x && p.y === participant.position.y)) {
            return { textKey: 'buttons.search', icon: Search };
        }
    }

    return null;
  }, [participant, mission, terrain]);

  const canFollowUp = followUpState?.participantId === participant.id;
  const isPanicked = participant.activeEffects.some(e => e.sourceId === 'terrifying');
  const hasStillEffect = participant.activeEffects.some(e => e.sourceId === 'still');
  const hasPreventMoveEffect = participant.activeEffects.some(e => e.preventMovement);
  const actionsLeft = participant.actionsRemaining;
  const consumablesUsed = participant.consumablesUsedThisTurn || 0;

    const canUseConsumable = useMemo(() => {
        if ((participant.type === 'character' && participant.noConsumablesOrImplants) || !participant.consumables || participant.consumables.length === 0) return false;
        if (consumablesUsed >= 2) return false;
        if (consumablesUsed >= 1 && (participant.actionsTaken.combat || participant.actionsRemaining < 1)) return false;
        return true;
    }, [participant, consumablesUsed]);

  const isManipulatorDoubleAction = useMemo(() =>
        participant.specialAbilities?.includes('manipulator_rules') &&
        (participant.combatActionsTaken || 0) === 1 &&
        participant.actionsRemaining > 0 &&
        participant.weapons.filter(cw => getWeaponById(cw.weaponId)?.traits.includes('pistol')).length >= 2,
    [participant]);

  const baseActionDisabled = actionsLeft <= 0 || (participant.actionsTaken.combat && !isManipulatorDoubleAction) || participant.actionsTaken.interact;

  if (isPending) return <Loader size={32} className='animate-spin text-primary' />;
  if (isPanicked) {
    return (
      <div className='flex items-center gap-2 p-2 bg-surface-raised/80 rounded-full border border-warning/50 backdrop-blur-sm animate-slide-up'>
        <ActionButton tooltip={t('buttons.flee')} onClick={() => handlers.selectMoveAction(participant.id, false)} selected={uiState.mode === 'move'} variant='danger'><Wind /></ActionButton>
      </div>
    );
  }
  if (canFollowUp) {
    return (
      <div className='flex items-center gap-2 p-2 bg-surface-raised/80 rounded-full border border-success/50 backdrop-blur-sm animate-slide-up'>
        <ActionButton tooltip={t('buttons.followUpMove')} onClick={() => handlers.selectFollowUpMove(participant.id)} selected={uiState.mode === 'follow_up_move'}><Move /></ActionButton>
        <ActionButton tooltip={t('buttons.followUpSkip')} onClick={handlers.skipFollowUpMove}>{t('buttons.skip')}</ActionButton>
      </div>
    );
  }

  const mustBrawlTooltip = mustBrawl ? t('tooltips.actions.mustBrawl') : '';
  const teleportTooltip = isNullZone ? t('tooltips.actions.nullZone') : t('tooltips.actions.teleport');

  return (
    <div className='relative' data-testid="action-controls">
        <div className="absolute bottom-full mb-2 w-full flex flex-col items-center gap-2">
            {/* WEAPON/CONSUMABLE SELECTION TRAY */}
            {(uiState.mode === 'selectingShootWeapon' || uiState.mode === 'selectingPanicFireWeapon' || uiState.mode === 'selectingBrawlWeapon' || uiState.mode === 'selectingConsumable') && (
                <div className='p-3 bg-surface-raised/90 rounded-lg border border-border/50 backdrop-blur-sm animate-slide-up w-64'>
                {uiState.mode === 'selectingShootWeapon' && (
                    <>
                    <p className='text-xs text-text-muted uppercase font-bold mb-2'>{t('battle.infoPanel.selectWeaponTitle', { shotType: uiState.isAimed ? t('battle.infoPanel.shotTypeAimed') : t('battle.infoPanel.shotTypeSnap') })}</p>
                    <div className='space-y-2'>
                        {availableRangedWeapons.map(w => (
                        <Button key={w.instanceId} onClick={() => handlers.selectWeaponForAction(w.instanceId)} variant='secondary' className='w-full justify-start text-sm py-2'>{t(`weapons.${w.id}`)}</Button>
                        ))}
                    </div>
                    </>
                )}
                {uiState.mode === 'selectingPanicFireWeapon' && (
                    <>
                    <p className='text-xs text-text-muted uppercase font-bold mb-2'>{t('battle.infoPanel.selectWeaponTitle', { shotType: t('battle.infoPanel.shotTypePanic') })}</p>
                    <div className='space-y-2'>
                        {availableRangedWeapons.map(w => (
                        <Button key={w.instanceId} onClick={() => handlers.selectWeaponForAction(w.instanceId)} variant='secondary' className='w-full justify-start text-sm py-2'>{t(`weapons.${w.id}`)}</Button>
                        ))}
                    </div>
                    </>
                )}
                {uiState.mode === 'selectingBrawlWeapon' && (
                    <>
                    <p className='text-xs text-text-muted uppercase font-bold mb-2'>{t('battle.infoPanel.chooseBrawlWeaponTitle')}</p>
                    <div className='space-y-2'>
                        {availableBrawlWeapons.map(w => (
                        <Button key={w.instanceId} onClick={() => handlers.selectBrawlWeapon(w.instanceId)} variant='secondary' className='w-full justify-start text-sm py-2'>{t(`weapons.${w.id}`)} {t('battle.infoPanel.meleeBonus', { bonus: w.traits.includes('melee') ? 2 : 1 })}</Button>
                        ))}
                        <Button onClick={() => handlers.selectBrawlWeapon(undefined)} variant='secondary' className='w-full justify-start text-sm py-2'>{t('battle.infoPanel.unarmedBonus')}</Button>
                    </div>
                    </>
                )}
                {uiState.mode === 'selectingConsumable' && (
                    <>
                    <p className='text-xs text-text-muted uppercase font-bold mb-2'>{t('battle.infoPanel.consumablesTitle', { costType: consumablesUsed > 0 ? t('battle.infoPanel.costTypeAction') : t('battle.infoPanel.costTypeFree') })}</p>
                    <div className='space-y-2'>
                        {participant.consumables.map(cId => (
                        <Button key={cId} onClick={() => handlers.handleUseConsumable(participant.id, cId)} variant='secondary' className='w-full justify-start text-sm py-2'>{t(`consumables.${cId}`)}</Button>
                        ))}
                    </div>
                    </>
                )}
                </div>
            )}
            {/* TARGET SELECTION PANEL */}
            {enemies.length > 0 && uiState.mode === 'idle' && (
                <div className="flex justify-center gap-2">
                    {enemies.map(enemy => (
                        <Tooltip key={enemy.id} content={t(`enemies.${enemy.name.split(' #')[0]}`)}>
                            <button
                                type="button"
                                onClick={() => setSelectedParticipantId(enemy.id)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2 shadow-md hover:shadow-lg ${
                                    selectedParticipantId === enemy.id
                                    ? 'bg-danger/50 border-warning scale-110 ring-2 ring-warning'
                                    : 'bg-danger/80 border-danger hover:bg-danger'
                                }`}
                                aria-label={`Select ${enemy.name}`}
                            >
                                <Skull size={20} className="text-text-inverted" />
                            </button>
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
      
      <div className='flex items-center gap-2 p-2 bg-surface-raised/80 rounded-full border border-border/50 backdrop-blur-sm animate-slide-up'>
        <ActionButton tooltip={mustBrawlTooltip || t('tooltips.actions.move')} onClick={() => handlers.selectMoveAction(participant.id, false)} disabled={baseActionDisabled || participant.actionsTaken.move || hasStillEffect || hasPreventMoveEffect || (mustBrawl && !isEngaged)} selected={uiState.mode === 'move' && !uiState.isDash}><Move /></ActionButton>
        <ActionButton tooltip={mustBrawlTooltip || t('tooltips.actions.dash')} onClick={() => handlers.selectMoveAction(participant.id, true)} disabled={baseActionDisabled || participant.actionsTaken.move || hasStillEffect || hasPreventMoveEffect || mustBrawl} selected={uiState.mode === 'move' && uiState.isDash}><Footprints /></ActionButton>
        
        {isFrozenWorld && (
            <ActionButton 
                tooltip={t('tooltips.actions.slide')} 
                onClick={() => handlers.selectSlideAction(participant.id)} 
                disabled={baseActionDisabled || participant.actionsTaken.move || hasStillEffect || hasPreventMoveEffect || mustBrawl} 
                selected={uiState.mode === 'sliding'}
            >
                <Snowflake />
            </ActionButton>
        )}

        {participant.specialAbilities?.includes('stalker_teleport') &&
            <ActionButton tooltip={teleportTooltip} onClick={() => handlers.selectTeleportAction(participant.id)} disabled={baseActionDisabled || participant.actionsTaken.move || hasStillEffect || hasPreventMoveEffect || mustBrawl || isNullZone} selected={uiState.mode === 'teleporting'}><Zap /></ActionButton>
        }

        {interaction && <ActionButton tooltip={t(interaction.textKey)} onClick={() => handlers.selectInteractAction(participant.id)} disabled={baseActionDisabled || mustBrawl} selected={uiState.mode === 'interact'} variant='primary'>{React.createElement(interaction.icon)}</ActionButton>}

        {isEngaged ? (
          <ActionButton tooltip={t('tooltips.actions.brawl')} onClick={() => handlers.selectBrawlAction(participant.id)} disabled={baseActionDisabled || participant.actionsTaken.dash || participant.specialAbilities?.includes('manipulator_rules')} variant='danger' selected={uiState.mode === 'selectingBrawlWeapon' || uiState.mode === 'brawling'}><Swords /></ActionButton>
        ) : (
          <>
            <ActionButton tooltip={mustBrawlTooltip || t('tooltips.actions.snapShot')} onClick={() => handlers.selectShootAction(participant.id, false)} disabled={baseActionDisabled || participant.actionsTaken.dash || availableRangedWeapons.length === 0 || mustBrawl} selected={(uiState.mode === 'selectingShootWeapon' || uiState.mode === 'shoot') && !uiState.isAimed}><Target /></ActionButton>
            <ActionButton tooltip={mustBrawlTooltip || t('tooltips.actions.aimedShot')} onClick={() => handlers.selectShootAction(participant.id, true)} disabled={(baseActionDisabled && !isManipulatorDoubleAction) || participant.actionsTaken.move || participant.actionsTaken.dash || availableRangedWeapons.length === 0 || actionsLeft < 2 || participant.status === 'stunned' || mustBrawl} selected={(uiState.mode === 'selectingShootWeapon' || uiState.mode === 'shoot') && uiState.isAimed}><Crosshair /></ActionButton>
            <ActionButton tooltip={t('tooltips.actions.panicFire')} onClick={() => handlers.selectPanicFireAction(participant.id)} disabled={baseActionDisabled || participant.actionsTaken.dash || availableRangedWeapons.length === 0 || mustBrawl} selected={uiState.mode === 'selectingPanicFireWeapon'}><Tornado /></ActionButton>
          </>
        )}

        {canUseConsumable && <ActionButton tooltip={t('tooltips.actions.useConsumable')} onClick={() => handlers.selectConsumableAction(participant.id)} selected={uiState.mode === 'selectingConsumable'} variant='primary'><Pill /></ActionButton>}

        {uiState.mode !== 'idle' && <ActionButton tooltip={t('buttons.cancel')} onClick={handlers.cancelAction} variant='danger'><XCircle /></ActionButton>}
        <Button onClick={() => handlers.endTurn()} variant='primary' className='py-2 px-6 ml-4 h-14 rounded-full'>{t('buttons.endTurn')}</Button>
      </div>
    </div>
  );
};

export default ActionControls;
