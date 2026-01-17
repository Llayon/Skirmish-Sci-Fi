
import type { CharacterWeapon } from './items';

export interface CharacterStats {
  reactions: number;
  speed: number;
  combat: number;
  toughness: number;
  savvy: number;
  luck: number;
}

export interface Position {
  x: number;
  y: number;
}

export type ParticipantStatus = 'active' | 'stunned' | 'casualty' | 'dazed';

export interface ActiveEffect {
  sourceId: string;
  sourceName: string; 
  duration: number; 
  statModifiers?: Partial<CharacterStats>;
  fleeFrom?: Position;
  fleeDistance?: number;
  preventMovement?: boolean;
  isFrozenInTime?: boolean;
  isDistracted?: boolean;
}

export interface Injury {
    id: string;
    effect: string; 
    recoveryTurns: number; 
}

export interface InjuryResultData {
    id: string;
    descriptionKey: string;
    recoveryTurns?: '1d3' | '1d6' | '1d3+1' | number;
    isDead?: boolean;
    equipmentEffect?: 'damaged' | 'lost';
    // Allow surgeryCost to be a number after the dice roll is resolved.
    surgeryCost?: '1d6' | number;
    xpGain?: number;
}

export type StatUpgrade = {
    stat: keyof CharacterStats;
    cost: number;
};

export type TaskType = 'idle' | 'explore' | 'trade' | 'train' | 'heal' | 'find_patron' | 'recruit' | 'track_rival' | 'repair' | 'decoy_rival';

export type RaceId = 'baseline_human' | 'bot' | 'engineer' | 'kerin' | 'soulless' | 'precursor' | 'swift' | 'feral';
export type SpecialAbility = 'kerin_brawl' | 'precursor_event' | 'swift_fly' | 'swift_volley' | 'feral_initiative' | 'feral_reaction_fumble' | 'kerin_must_brawl' | 'hulker_rules';

export interface Motivation {
  id: string;
  effect: string;
  resources: string;
  starting_rolls: string[];
}

export interface Class {
  id: string;
  effect: string;
  resources: string;
  starting_rolls: string[];
}

export type AdvancedTrainingId = 'pilot' | 'mechanic' | 'medical' | 'merchant' | 'security' | 'broker' | 'bot_technician';

export interface AdvancedTrainingCourse {
  id: AdvancedTrainingId;
  nameKey: string;
  effectKey: string;
  cost: number;
}

export interface Character {
  id:string;
  isLeader?: boolean;
  name: string;
  pronouns: string;
  raceId: RaceId;
  backgroundId: string;
  motivationId: string;
  classId: string;
  stats: CharacterStats;
  xp: number;
  upgradesAvailable?: number;
  consumables: string[];
  weapons: CharacterWeapon[];
  armor?: string; 
  screen?: string; 
  implants: string[];
  utilityDevices: string[];
  backstory: string;
  injuries: Injury[];
  task: TaskType;
  taskCompletedThisTurn?: boolean;
  startingRolls?: string[];
  isUnavailableForTasks?: boolean;
  justRecovered?: boolean;
  geneticKitDiscount?: boolean;
  nanoDocProtection?: boolean;
  damagedEquipment?: { instanceId: string, type: 'weapon' | 'armor' | 'screen', weaponId?: string }[];
  advancedTraining?: AdvancedTrainingId | null;
  portraitUrl?: string;
  upgradedStats?: (keyof CharacterStats)[];
  strangeCharacterId?: string;
  // Battle-specific fields
  position: Position;
  status: ParticipantStatus;
  actionsRemaining: number;
  actionsTaken: {
    move: boolean;
    combat: boolean;
    dash: boolean;
    interact: boolean;
  };
  combatActionsTaken?: number;
  stunTokens: number;
  currentLuck: number;
  activeEffects: ActiveEffect[];
  consumablesUsedThisTurn: number;
  deflectorFieldUsedThisBattle?: boolean;
  inoperableWeapons?: string[]; 
  utilityDevicesUsed?: string[];
  lastTargetId?: string;
  knockedOut?: boolean;
  hasFiredThisRound?: boolean;
  isVip?: boolean;
  // Character event flags
  refusesToFightNextTurn?: boolean;
  unavailableTurns?: number;
  isUnavailableForBattle?: boolean;
  pendingDelivery?: boolean;
  wantsToStay?: boolean;
  // Race-specific flags
  originalBackgroundId?: string;
  originalClassId?: string;
  innateArmorSave?: number;
  noXP?: boolean;
  noConsumablesOrImplants?: boolean;
  usesBotInjuryTable?: boolean;
  canInstallBotUpgrades?: boolean;
  specialAbilities?: string[];
  specialAbilityUpgrades?: {
    stalker_teleport?: number;
  };
}

export interface Crew {
  name: string;
  members: Character[];
}

export interface Background {
  id: string;
  roll_range: [number, number];
  effect: string;
  resources: string;
  starting_rolls: string[];
}

export interface CrewType {
  id: string;
  stats: Partial<CharacterStats>;
}

export type AIType = 'Aggressive' | 'Tactical' | 'Cautious' | 'Rampaging' | 'Defensive' | 'Beast' | 'Guardian';

export interface EnemyTemplate {
  id: string;
  stats: CharacterStats;
  ai: AIType;
  weapons: string[];
  armor?: string;
  screen?: string;
  consumables: string[];
  panicRange?: [number, number];
  isFearless?: boolean;
}

export interface Enemy {
  id: string;
  name: string; 
  raceId?: RaceId;
  classId?: string;
  stats: CharacterStats;
  ai: AIType;
  weapons: CharacterWeapon[]; 
  armor?: string; 
  screen?: string;
  portraitUrl?: string; 
  panicRange?: [number, number];
  isFearless?: boolean;
  isSpecialist?: boolean;
  isLieutenant?: boolean;
  isUnique?: boolean;
  // Battle-specific fields
  position: Position;
  status: ParticipantStatus;
  actionsRemaining: number;
  actionsTaken: {
    move: boolean;
    combat: boolean;
    dash: boolean;
    interact: boolean;
  };
  combatActionsTaken?: number;
  stunTokens: number;
  currentLuck: number;
  activeEffects: ActiveEffect[];
  consumablesUsedThisTurn: number;
  consumables: string[];
  deflectorFieldUsedThisBattle?: boolean;
  guardedBy?: string; 
  inoperableWeapons?: string[]; 
  utilityDevices: string[];
  utilityDevicesUsed?: string[];
  lastTargetId?: string;
  specialAbilities?: string[];
  hasFiredThisRound?: boolean;
}

export type BattleParticipant = ({ type: 'character' } & Character) | ({ type: 'enemy' } & Enemy);
