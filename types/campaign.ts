import type { CharacterWeapon, OnBoardItemId, ShipComponentId } from './items';
import type { Crew, TaskType, RaceId, Character } from './character';

export interface LogEntry {
  key: string;
  params?: Record<string, string | number>;
  source?: 'player' | 'enemy' | 'host' | 'guest';
  traitId?: string;
}

export type CampaignLog = (string | LogEntry)[];

export interface CampaignLogEntry {
    key: string;
    params?: Record<string, string | number>;
    turn: number;
}

export type RumorType = 'quest_start' | 'location_info' | 'character_info' | 'generic';

export interface Rumor {
    id: string;
    description: string;
    type: RumorType;
}

export interface Patron {
    id: string;
    name: string;
    type: string;
    persistent?: boolean;
}

export interface Rival {
    id: string;
    name: string;
    status: 'active' | 'defeated';
    kerinBrawlBonus?: boolean;
}

export type CampaignPhase = 'upkeep' | 'actions';

export type PatronType = 'corporation' | 'local_government' | 'sector_government' | 'wealthy_individual' | 'private_organization' | 'secretive_group';
export type DangerPay = { credits: number; bonus?: 'reroll_mission_pay' };
export type TimeFrame = { turns: number | 'any'; descriptionKey: string };
export type Benefit = { id: string; nameKey: string; effectKey: string; };
export type Hazard = { id: string; nameKey: string; effectKey: string; };
export type Condition = { id: string; nameKey: string; effectKey: string; };

export type MissionType = 'Access' | 'Acquire' | 'Defend' | 'Deliver' | 'Eliminate' | 'FightOff' | 'MoveThrough' | 'Patrol' | 'Protect' | 'Secure' | 'Search';

export interface MissionOffer {
    id: string;
    missionType: MissionType;
    patronType: PatronType;
    dangerPay: DangerPay;
    timeFrame: TimeFrame;
    benefit?: Benefit;
    hazard?: Hazard;
    condition?: Condition;
    titleKey: string;
    descriptionKey: string;
}

export interface ActiveMission extends MissionOffer {
    turnAccepted: number;
}

export interface Quest {
    id: string;
    titleKey: string;
    descriptionKey: string;
    status: 'in_progress' | 'completed' | 'finale';
    rumors: number;
    requiresTravel?: boolean;
}


export type ShipTrait = 'emergency_drives' | 'fuel_efficient' | 'fuel_hog' | 'standard_issue' | 'dodgy_drive' | 'armored';

export interface Ship {
  id: string;
  nameKey: string;
  hull: number;
  maxHull: number;
  traits: ShipTrait[];
  lifeSupportDamaged?: boolean;
  components: ShipComponentId[];
}

export interface WorldTrait {
    id: string;
    nameKey: string;
    descriptionKey: string;
    restrictedAlienSpecies?: RaceId;
}

export interface World {
    name: string;
    traits: WorldTrait[];
    licenseRequired?: boolean;
    licenseCost?: number;
    licenseOwned?: boolean;
    isRedZone?: boolean;
    forgeryAttempted?: boolean;
    invasionDefenseBonus?: number;
    restrictedAlienSpecies?: RaceId;
    blacklistedFromPatrons?: boolean;
    fuelShortageCost?: number;
    interdictionTurnsRemaining?: number;
    interdictionLicenseAttempted?: boolean;
}

export interface TravelEvent {
    eventId: string;
    // Can store arbitrary data for multi-step events
    data?: any; 
}

export interface TrackedPlanet {
  name: string;
  status: 'contested' | 'lost' | 'liberated';
  rollModifier: number;
}

export interface GalacticWar {
  trackedPlanets: TrackedPlanet[];
}

export interface PendingTradeResult {
    traderId: string;
    roll: number;
}

export interface CharacterEvent {
    id: string;
    descriptionKey: string;
}

export interface PendingPrecursorEventChoice {
    characterId: string;
    event1: CharacterEvent;
    event2: CharacterEvent;
}

export interface Stash {
  weapons: CharacterWeapon[];
  armor: string[];
  screen: string[];
  consumables: string[];
  sights: string[];
  gunMods: string[];
  implants: string[];
  utilityDevices: string[];
  onBoardItems: OnBoardItemId[];
  damagedItems?: { id: string; type: string }[];
}

export type Difficulty = 'easy' | 'normal' | 'challenging' | 'hardcore' | 'insanity';

export interface Campaign {
  turn: number;
  storyPoints: number;
  credits: number;
  debt: number;
  rivals: Rival[];
  patrons: Patron[];
  questRumors: Rumor[];
  log: CampaignLogEntry[];
  campaignPhase: CampaignPhase;
  difficulty: Difficulty;
  jobOffers: MissionOffer[];
  activeMission: ActiveMission | null;
  activeQuest: Quest | null;
  ship: Ship | null;
  stash: Stash;
  currentWorld: World | null;
  patronJobsToGenerate?: number;
  locatedRivalId?: string | null;
  taskResultsLog: CampaignLogEntry[];
  starshipParts?: number;
  starshipPartsDiscount?: number;
  personalTrinkets?: { id: string }[];
  isWorldInvaded?: boolean;
  itemsSoldThisTurn?: number;
  invasionCheckModifier?: number;
  planetLockdownTurns?: number;
  activeTravelEvent?: TravelEvent | null;
  pendingTravelCompletion?: { fromEvent: string; } | null;
  tasksFinalized: boolean;
  spForCreditsUsedThisTurn?: boolean;
  spForXpUsedThisTurn?: boolean;
  spForActionUsedThisTurn?: boolean;
  componentPurchasedThisTurn?: boolean;
  busyMarketsUsedThisTurn?: boolean;
  redJobLicenseOwned?: boolean;
  trainingApplicationStatus?: 'none' | 'pending' | 'approved' | 'denied';
  decoyBonusThisTurn?: number;
  rivalAttackHappening?: boolean;
  attackingRivalId?: string | null;
  luxuryTrinketRecruitBonus?: boolean;
  pendingGearChoiceAfterShipDestruction?: boolean;
  pendingFleeCharacterEvent?: boolean;
  characterEventResult?: { key: string, params?: any } | null;
  pendingInvasionBattleGearUp?: boolean;
  visitedWorlds?: World[];
  pendingTravelDestination?: World;
  isRedZone?: boolean;
  pendingShipOffer?: { ship: Ship, cost: number } | null;
  shipSearchConductedThisTurn?: boolean;
  cosmicPhenomenonHappened?: boolean;
  invasionImmunityForNextWorld?: boolean;
  pendingCriminalFavor?: boolean;
  pendingBureaucracyBribe?: number | null;
  galacticWar?: GalacticWar;
  pendingTradeResult?: PendingTradeResult | null;
  pendingPrecursorEventChoice?: PendingPrecursorEventChoice | null;
  freeTradeUsedThisTurn?: boolean;
  pendingTradeChoice?: { traderId: string; roll1: number; roll2: number } | null;
  pendingRecruitChoice?: { recruiterId: string; recruits: [Character, Character] } | null;
  hasLocalMaps?: boolean;
  canSkipUpkeep?: boolean;
  hasTradeGoods?: boolean;
  pendingTradeGoodsSale?: boolean;
  fuelCredits?: number;
  hasInsiderInformation?: boolean;
  // On-board item states
  pendingItemChoice?: { itemId: 'duplicator' | 'fixer'; characterId?: string };
  geneticReconfigurationDiscount?: { characterId: string; discount: number } | null;
  purifierUsedThisTurn?: boolean;
  upkeepSkippedThisTurn?: boolean;
  // Fleeing from Invasion states
  fledFromInvasionThisTurn?: boolean;
  pendingFleeItemLoss?: { count: number };
}

export interface TableEntry<T> {
  roll_range: [number, number];
  value: T;
}

export type CharacterEventTableEntry = TableEntry<CharacterEvent>;

export type SlotId = 'autosave' | 'slot_1' | 'slot_2' | 'slot_3' | 'slot_4';

export interface SaveSlot {
  crew: Crew;
  campaign: Campaign;
  metadata: {
    crewName: string;
    turn: number;
    savedAt: string;
  };
}

export type SaveSlots = {
  [key in SlotId]?: SaveSlot;
};