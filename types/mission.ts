import type { Position } from './character';

export type MissionType =
  | 'Access'
  | 'Acquire'
  | 'Defend'
  | 'Deliver'
  | 'Eliminate'
  | 'FightOff'
  | 'MoveThrough'
  | 'Patrol'
  | 'Protect'
  | 'Secure'
  | 'Search';

export type MissionStatus = 'in_progress' | 'success' | 'failure';

export interface PatrolPoint {
    id: string;
    visited: boolean;
}

export interface MissionBase {
    type: MissionType;
    titleKey: string;
    descriptionKey: string;
    status: MissionStatus;
    customData?: Record<string, any>; // Deprecated but keeping for now if strictly needed, ideally removed
}

export interface AccessMission extends MissionBase {
    type: 'Access';
    objectivePosition?: Position; // Hack point
    accessFirstNat1?: boolean;
}

export interface AcquireMission extends MissionBase {
    type: 'Acquire';
    itemCarrierId?: string | null;
    itemPosition?: Position | null;
    itemDestroyed?: boolean;
}

export interface DefendMission extends MissionBase {
    type: 'Defend';
    objectivePosition?: Position; // Point to defend
}

export interface DeliverMission extends MissionBase {
    type: 'Deliver';
    itemCarrierId?: string | null;
    itemPosition?: Position | null; // Initial position of package to pick up
    objectivePosition?: Position; // Delivery destination
    packageDelivered?: boolean;
    itemDestroyed?: boolean;
}

export interface EliminateMission extends MissionBase {
    type: 'Eliminate';
    targetEnemyId?: string;
    eliminateTargetCanEscape?: boolean;
}

export interface FightOffMission extends MissionBase {
    type: 'FightOff';
}

export interface MoveThroughMission extends MissionBase {
    type: 'MoveThrough';
    crewMembersExited?: number;
}

export interface PatrolMission extends MissionBase {
    type: 'Patrol';
    patrolPoints?: PatrolPoint[];
}

export interface ProtectMission extends MissionBase {
    type: 'Protect';
    vipId?: string;
    vipTurnStartInZone?: boolean;
}

export interface SecureMission extends MissionBase {
    type: 'Secure';
    objectivePosition?: Position; // Point to hold
    secureRoundsCompleted?: number;
}

export interface SearchMission extends MissionBase {
    type: 'Search';
    objectivePosition?: Position; // Center of search area
    searchedPositions?: Position[];
    searchRadius?: number;
    itemPosition?: Position | null; // Found item position
}

export type Mission =
    | AccessMission
    | AcquireMission
    | DefendMission
    | DeliverMission
    | EliminateMission
    | FightOffMission
    | MoveThroughMission
    | PatrolMission
    | ProtectMission
    | SecureMission
    | SearchMission;


// Type Guards

export function isAccessMission(mission: Mission): mission is AccessMission {
    return mission.type === 'Access';
}

export function isAcquireMission(mission: Mission): mission is AcquireMission {
    return mission.type === 'Acquire';
}

export function isDefendMission(mission: Mission): mission is DefendMission {
    return mission.type === 'Defend';
}

export function isDeliverMission(mission: Mission): mission is DeliverMission {
    return mission.type === 'Deliver';
}

export function isEliminateMission(mission: Mission): mission is EliminateMission {
    return mission.type === 'Eliminate';
}

export function isFightOffMission(mission: Mission): mission is FightOffMission {
    return mission.type === 'FightOff';
}

export function isMoveThroughMission(mission: Mission): mission is MoveThroughMission {
    return mission.type === 'MoveThrough';
}

export function isPatrolMission(mission: Mission): mission is PatrolMission {
    return mission.type === 'Patrol';
}

export function isProtectMission(mission: Mission): mission is ProtectMission {
    return mission.type === 'Protect';
}

export function isSecureMission(mission: Mission): mission is SecureMission {
    return mission.type === 'Secure';
}

export function isSearchMission(mission: Mission): mission is SearchMission {
    return mission.type === 'Search';
}

export function isMissionType<T extends Mission>(mission: Mission, type: MissionType): mission is T {
    return mission.type === type;
}
