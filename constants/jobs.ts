
import { PatronType, DangerPay, TimeFrame, Benefit, Hazard, Condition } from '../types';

type PatronTableEntry = {
    range: [number, number];
    value: {
        type: PatronType;
        dangerPayBonus: number;
        timeFrameBonus: number;
    }
};

export const PATRON_TABLE: PatronTableEntry[] = [
    { range: [1, 2], value: { type: 'corporation', dangerPayBonus: 1, timeFrameBonus: 0 } },
    { range: [3, 4], value: { type: 'local_government', dangerPayBonus: 0, timeFrameBonus: 0 } },
    { range: [5, 5], value: { type: 'sector_government', dangerPayBonus: 0, timeFrameBonus: 0 } },
    { range: [6, 7], value: { type: 'wealthy_individual', dangerPayBonus: 0, timeFrameBonus: 0 } },
    { range: [8, 9], value: { type: 'private_organization', dangerPayBonus: 0, timeFrameBonus: 0 } },
    { range: [10, 10], value: { type: 'secretive_group', dangerPayBonus: 0, timeFrameBonus: 1 } },
];

type DangerPayTableEntry = { range: [number, number]; value: DangerPay };
export const DANGER_PAY_TABLE: DangerPayTableEntry[] = [
    { range: [-Infinity, 4], value: { credits: 1 } },
    { range: [5, 8], value: { credits: 2 } },
    { range: [9, 9], value: { credits: 3 } },
    { range: [10, Infinity], value: { credits: 3, bonus: 'reroll_mission_pay' } },
];

type TimeFrameTableEntry = { range: [number, number]; value: TimeFrame };
export const TIME_FRAME_TABLE: TimeFrameTableEntry[] = [
    { range: [-Infinity, 5], value: { turns: 1, descriptionKey: 'timeframes.this_turn' } },
    { range: [6, 7], value: { turns: 2, descriptionKey: 'timeframes.next_turn' } },
    { range: [8, 9], value: { turns: 3, descriptionKey: 'timeframes.two_turns' } },
    { range: [10, Infinity], value: { turns: 'any', descriptionKey: 'timeframes.any_time' } },
];

export const BHC_TABLE: Record<PatronType, { benefits: number, hazards: number, conditions: number }> = {
    corporation: { benefits: 8, hazards: 8, conditions: 5 },
    local_government: { benefits: 8, hazards: 8, conditions: 8 },
    sector_government: { benefits: 8, hazards: 8, conditions: 8 },
    wealthy_individual: { benefits: 5, hazards: 8, conditions: 8 },
    private_organization: { benefits: 8, hazards: 8, conditions: 8 },
    secretive_group: { benefits: 8, hazards: 5, conditions: 8 },
};

type BenefitTableEntry = { range: [number, number]; value: Benefit };
export const BENEFITS_SUBTABLE: BenefitTableEntry[] = [
    { range: [1, 2], value: { id: 'fringe_benefit', nameKey: 'benefits.fringe_benefit.name', effectKey: 'benefits.fringe_benefit.effect' } },
    { range: [3, 4], value: { id: 'connections', nameKey: 'benefits.connections.name', effectKey: 'benefits.connections.effect' } },
    { range: [5, 5], value: { id: 'company_store', nameKey: 'benefits.company_store.name', effectKey: 'benefits.company_store.effect' } },
    { range: [6, 6], value: { id: 'health_insurance', nameKey: 'benefits.health_insurance.name', effectKey: 'benefits.health_insurance.effect' } },
    { range: [7, 7], value: { id: 'security_team', nameKey: 'benefits.security_team.name', effectKey: 'benefits.security_team.effect' } },
    { range: [8, 9], value: { id: 'persistent', nameKey: 'benefits.persistent.name', effectKey: 'benefits.persistent.effect' } },
    { range: [10, 10], value: { id: 'negotiable', nameKey: 'benefits.negotiable.name', effectKey: 'benefits.negotiable.effect' } },
];

type HazardTableEntry = { range: [number, number]; value: Hazard };
export const HAZARDS_SUBTABLE: HazardTableEntry[] = [
    { range: [1, 2], value: { id: 'dangerous_job', nameKey: 'hazards.dangerous_job.name', effectKey: 'hazards.dangerous_job.effect' } },
    { range: [3, 4], value: { id: 'hot_job', nameKey: 'hazards.hot_job.name', effectKey: 'hazards.hot_job.effect' } },
    { range: [5, 5], value: { id: 'vip', nameKey: 'hazards.vip.name', effectKey: 'hazards.vip.effect' } },
    { range: [6, 6], value: { id: 'veteran_opposition', nameKey: 'hazards.veteran_opposition.name', effectKey: 'hazards.veteran_opposition.effect' } },
    { range: [7, 7], value: { id: 'low_priority', nameKey: 'hazards.low_priority.name', effectKey: 'hazards.low_priority.effect' } },
    { range: [8, 10], value: { id: 'private_transport', nameKey: 'hazards.private_transport.name', effectKey: 'hazards.private_transport.effect' } },
];

type ConditionTableEntry = { range: [number, number]; value: Condition };
export const CONDITIONS_SUBTABLE: ConditionTableEntry[] = [
    { range: [1, 1], value: { id: 'vengeful', nameKey: 'conditions.vengeful.name', effectKey: 'conditions.vengeful.effect' } },
    { range: [2, 3], value: { id: 'demanding', nameKey: 'conditions.demanding.name', effectKey: 'conditions.demanding.effect' } },
    { range: [4, 4], value: { id: 'small_squad', nameKey: 'conditions.small_squad.name', effectKey: 'conditions.small_squad.effect' } },
    { range: [5, 5], value: { id: 'full_squad', nameKey: 'conditions.full_squad.name', effectKey: 'conditions.full_squad.effect' } },
    { range: [6, 6], value: { id: 'clean', nameKey: 'conditions.clean.name', effectKey: 'conditions.clean.effect' } },
    { range: [7, 8], value: { id: 'busy', nameKey: 'conditions.busy.name', effectKey: 'conditions.busy.effect' } },
    { range: [9, 9], value: { id: 'one_time_contract', nameKey: 'conditions.one_time_contract.name', effectKey: 'conditions.one_time_contract.effect' } },
    { range: [10, 10], value: { id: 'reputation_required', nameKey: 'conditions.reputation_required.name', effectKey: 'conditions.reputation_required.effect' } },
];
