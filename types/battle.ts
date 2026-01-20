
import type { BattleParticipant, Position, ParticipantStatus } from './character';
import type { CampaignLog, LogEntry, Difficulty, TableEntry, ActiveMission, WorldTrait } from './campaign';
import type { Mission, MissionType } from './mission';
import type { Weapon, ProtectiveDevice } from './items';
import { EnemyEncounterCategory } from '@/constants/enemyEncounters';

export type GridSize = { width: number; height: number };
export type { Position, ParticipantStatus, BattleParticipant } from './character';
export type { Mission, MissionType, PatrolPoint } from './mission';

export type MultiplayerRole = 'host' | 'guest';

export type AIActionPlan =
  | { type: 'move'; targetPos: Position; path: Position[] }
  | { type: 'shoot'; targetId: string, weaponId: string, isAimed: boolean }
  | { type: 'brawl'; targetId: string, weaponId?: string }
  | { type: 'interact'; targetId?: string, position?: Position }
  | { type: 'hold'; reason?: string };

export type TerrainType = 'Linear' | 'Individual' | 'Area' | 'Field' | 'Block' | 'Interior' | 'Door';

export interface Terrain {
  id: string;
  name: string;
  type: TerrainType;
  position: Position;
  size: { width: number; height: number };
  isDifficult: boolean;
  providesCover: boolean;
  blocksLineOfSight: boolean;
  isImpassable: boolean;
  isInteractive?: boolean;
  parentId?: string;
}

export type TerrainTheme = 'Industrial' | 'Wilderness' | 'AlienRuin' | 'CrashSite';

export type FeatureType =
  | 'large_structure' | 'industrial_cluster' | 'fenced_area' | 'landing_pad' | 'cargo_area' | 'two_structures'
  | 'linear_obstacle' | 'building' | 'industrial_rubble' | 'spread_scatter' | 'open_ground_central' | 'industrial_urban_scatter'
  | 'forested_hill' | 'large_swamp' | 'rock_formations_group' | 'forested_area_paths' | 'bare_hill' | 'single_ruin'
  | 'dense_forest_swamp' | 'rock_formation_plants' | 'plant_cluster' | 'open_space_scattered_plants' | 'natural_linear'
  | 'scatter_plants' | 'large_rubble_pile' | 'large_ruined_building' | 'overgrown_plaza' | 'ruined_tower_rubble' | 'large_statue_rubble'
  | 'ruined_wall' | 'ruined_building' | 'partial_ruin' | 'open_space_scatter' | 'strange_statue_wreck' | 'scattered_plants_rubble'
  | 'damaged_structure' | 'natural_feature_wreckage' | 'burning_forest' | 'wreckage_pile' | 'large_crater_wreckage' | 'large_crater'
  | 'open_scatter_mix' | 'scattered_wreckage' | 'large_wreckage_piece' | 'crater' | 'wreckage_line' | 'open_ground_smoke'
  | 'scatter' | 'hill';

export type BattlePhase = 'reaction_roll' | 'quick_actions' | 'enemy_actions' | 'slow_actions' | 'end_round' | 'battle_over';

export interface ReactionRollResult {
    roll: number;
    success: boolean;
}

export type AnimationState =
  | ({ type: 'move'; path: Position[] } & { id: string })
  | ({ type: 'shoot'; from: Position; to: Position } & { id: string })
  | null;

export type DeploymentConditionId =
  | 'no_condition'
  | 'small_encounter'
  | 'poor_visibility'
  | 'brief_engagement'
  | 'toxic_environment'
  | 'surprise_encounter'
  | 'delayed'
  | 'slippery_ground'
  | 'bitter_struggle'
  | 'caught_off_guard'
  | 'gloomy';

export interface DeploymentCondition {
  id: DeploymentConditionId;
  nameKey: string;
  descriptionKey: string;
}

export interface MissionModifiers {
  vip?: boolean;
}

export interface NotableSightResult {
  id: string;
  present: boolean;
  descriptionKey: string;
  position?: Position;
  targetEnemyId?: string; // For 'Priority target'
  acquiredBy?: string;
  roll: number;
  reward?: { credits?: number | string; storyPoints?: number; xp?: number; rumors?: number; lootRoll?: boolean; lootRollChance?: string };
}

export interface BattleEventMarker {
  id: string;
  position: Position;
  type: 'loot' | 'credits';
}

export interface ThreatCondition {
    id: string;
    nameKey: string;
    descriptionKey: string;
}

export interface BattleEvent {
    id: string;
}

export type BattleEventTableEntry = TableEntry<BattleEvent>;

export interface Battle {
  id:string;
  participants: BattleParticipant[];
  gridSize: { width: number; height: number };
  terrain: Terrain[];
  mission: Mission;
  log: CampaignLog;
  round: number;
  phase: BattlePhase;
  difficulty: Difficulty;
  quickActionOrder: string[];
  slowActionOrder: string[];
  reactionRolls: Record<string, ReactionRollResult>;
  reactionRerollsUsed: boolean;
  activeParticipantId: string | null;
  currentTurnIndex: number; // Used for both player and enemy phases
  enemyTurnOrder: string[];
  followUpState: {
    participantId: string;
    maxMove: number;
  } | null;
  firstCasualtyInflictedById?: string | null;
  killedUniqueIndividualIds?: string[];
  isQuestBattle?: boolean;
  isRivalBattle?: boolean;
  rivalId?: string;
  wasRivalTracked?: boolean;
  isRedZone?: boolean;
  enemyFaction?: string;
  enemyCategory?: EnemyEncounterCategory;
  isOutOfSequence?: boolean;
  sourceTravelEventId?: 'raided';
  deploymentCondition?: DeploymentCondition;
  worldTraits?: WorldTrait[];
  threatCondition?: ThreatCondition;
  maxVisibility?: number;
  offTableParticipants?: string[];
  battleType?: 'patron' | 'rival' | 'quest' | 'opportunity' | 'invasion';
  originalActiveMission?: ActiveMission;
  enemiesLostThisRound: number;
  heldTheField: boolean;
  notableSight?: NotableSightResult;
  rivalAttackType?: string;
  canSeizeInitiative?: boolean;
  seizeInitiativePenalty?: number;
  dropDeploymentAvailable?: boolean;
  // --- Battle Event specific ---
  battleEventTriggeredForRound?: number;
  enemiesWillFleeNextRound?: boolean;
  seizedTheMomentCharacterId?: string;
  desperatePlanCharacterId?: string;
  cunningPlanActive?: boolean;
  pendingReinforcements?: { position: Position; id: string }[];
  tickingClock?: { startRound: number; dice: number };
  battleEventMarkers?: BattleEventMarker[];
  renewedEffortsActive?: boolean;
  momentOfHesitationActive?: boolean;
  charactersWhoLeftForLoot?: string[];
  tickingClockActive?: boolean;
  // --- Multiplayer specific ---
  firstPlayerRole?: MultiplayerRole;
  activePlayerRole?: MultiplayerRole | null;
}

/**
 * A view model representing a participant to be displayed within a BattleCell.
 * This flattens complex state into simple booleans for the display component.
 * @property {string} id - The unique ID of the participant.
 * @property {string} name - The display name of the participant.
 * @property {'character' | 'enemy'} type - The type of participant.
 * @property {ParticipantStatus} status - The current status (active, stunned, etc.).
 * @property {number} stunTokens - The number of stun tokens.
 * @property {boolean} isOpponent - Whether this participant is an opponent to the current player.
 * @property {boolean} isItemCarrier - Whether this participant is carrying a mission item.
 * @property {boolean} isSelected - Whether this participant is currently selected by the player.
 * @property {boolean} isActive - Whether it is currently this participant's turn.
 * @property {boolean} isAnimating - Whether this participant is currently part of an animation.
 * @property {boolean} isPending - Whether an action is pending for this participant in multiplayer.
 * @property {boolean} hasCoverFromAttacker - Whether the participant has cover from the current attacker.
 * @property {boolean} [isMissionTarget] - Whether the participant is the primary target of the mission.
 * @property {boolean} [isUnique] - Whether the participant is a unique individual.
 */
export type BattleCellParticipantViewModel = {
  id: string;
  name: string;
  type: 'character' | 'enemy';
  status: ParticipantStatus;
  stunTokens: number;
  isOpponent: boolean;
  isItemCarrier: boolean;
  isSelected: boolean;
  isActive: boolean;
  isAnimating: boolean;
  isPending: boolean;
  hasCoverFromAttacker: boolean;
  isMissionTarget?: boolean;
  isUnique?: boolean;
};

export type PlayerAction =
  | { type: 'move'; payload: { characterId: string; position: Position; isDash: boolean } }
  | { type: 'slide'; payload: { characterId: string; path: Position[] } }
  | { type: 'teleport'; payload: { characterId: string; position: Position } }
  | { type: 'follow_up_move'; payload: { characterId: string; position: Position; isDash: boolean } }
  | { type: 'shoot'; payload: { characterId: string; targetId: string; weaponInstanceId: string; isAimed: boolean } }
  | { type: 'panic_fire'; payload: { characterId: string; weaponInstanceId: string } }
  | { type: 'brawl'; payload: { characterId: string; targetId: string; weaponInstanceId?: string } }
  | { type: 'use_consumable'; payload: { characterId: string; consumableId: string } }
  | { type: 'use_utility_device'; payload: { characterId: string; deviceId: string; targetIds?: string[], position?: Position } }
  | { type: 'interact'; payload: { characterId: string; targetId?: string; position?: Position } }
  | { type: 'end_turn'; payload: { characterId: string } }
  | { type: 'roll_initiative'; payload: {} }
  | { type: 'advance_phase'; payload: {} };

export type PlayerActionUIState =
  | { mode: 'idle' }
  | { mode: 'move'; characterId: string; isDash: boolean }
  | { mode: 'sliding'; characterId: string; distance: number }
  | { mode: 'teleporting'; characterId: string; distance: number }
  | { mode: 'follow_up_move'; characterId: string }
  | { mode: 'selectingShootWeapon'; characterId: string; isAimed: boolean }
  | { mode: 'selectingPanicFireWeapon'; characterId: string }
  | { mode: 'shoot'; characterId: string; isAimed: boolean; weaponInstanceId: string }
  | { mode: 'selectingBrawlWeapon'; characterId: string }
  | { mode: 'brawling'; characterId: string; weaponInstanceId?: string }
  | { mode: 'interact'; characterId: string }
  | { mode: 'selectingConsumable'; characterId: string }
  | { mode: 'selectingConcealedBladeTarget', characterId: string }
  | { mode: 'selectingTimeDistorterTargets', characterId: string, selectedTargetIds: string[] };


// --- Trait System Types ---

// Base context, contains shared data that can be mutated by handlers
export interface TraitSystemBaseContext {
  battle: Battle;
  log: LogEntry[];
  attacker: BattleParticipant;
  weapon?: Weapon;
}

// Context for the entire shooting action
export interface ShootingContext extends TraitSystemBaseContext {
  weapon: Weapon;
  target: BattleParticipant;
  isAimed: boolean;
  roll: {
    base: number;
    bonus: number;
    final: number;
    targetNumber: number;
    isHit: boolean;
    rerolledText: string;
  };
  hitsToResolve: number;
}

// Context for when a hit is confirmed and effects are applied
export interface HitContext extends TraitSystemBaseContext {
  weapon: Weapon;
  target: BattleParticipant;
  isRanged: boolean;
  hit: {
    isNegated: boolean;
    skipDamage: boolean;
    applyStunAndPushback: boolean;
  };
}

// Context for the damage calculation step
export interface DamageContext extends TraitSystemBaseContext {
    weapon: Weapon;
    target: BattleParticipant;
    damage: {
        baseRoll: number;
        weaponBonus: number;
        finalDamage: number;
        targetToughness: number;
        isLethal: boolean;
    };
}

// Context for the saving throw step
export interface SavingThrowContext extends TraitSystemBaseContext {
    weapon: Weapon;
    target: BattleParticipant;
    isRanged: boolean;
    save: {
        device: ProtectiveDevice | null;
        baseTarget: number | null;
        finalTarget: number | null;
        roll: number;
        isSuccess: boolean;
        isBypassed: boolean;
    };
}

// Context for brawl roll resolution
export interface BrawlContext extends TraitSystemBaseContext {
    defender: BattleParticipant;
    attackerWeapon: Weapon | undefined;
    defenderWeapon: Weapon | undefined;
    attackerRoll: {
        base: number;
        bonus: number;
        final: number;
        rerolledText: string;
    };
    defenderRoll: {
        base: number;
        bonus: number;
        final: number;
        rerolledText: string;
    };
    winner: BattleParticipant | null;
    loser: BattleParticipant | null;
}

// Context for after the main action is resolved
export interface AfterActionContext extends TraitSystemBaseContext {
    weapon: Weapon;
    initialTarget: BattleParticipant;
}

// A generic type for all contexts
export type TraitContext = ShootingContext | HitContext | DamageContext | SavingThrowContext | BrawlContext | AfterActionContext;

// A handler function takes a context and modifies it
export type TraitHandler<T extends TraitContext> = (context: T) => void;

// An object containing handlers for different hooks
export interface TraitHandlers {
    onShootingRoll?: TraitHandler<ShootingContext>;
    onBrawlRoll?: TraitHandler<BrawlContext>;
    onHit?: TraitHandler<HitContext>;
    onDamageRoll?: TraitHandler<DamageContext>;
    onSavingThrow?: TraitHandler<SavingThrowContext>;
    afterAction?: TraitHandler<AfterActionContext>;
}

export interface TraitPlugin {
    id: string;
    priority: number;
    hooks: TraitHandlers;
}
