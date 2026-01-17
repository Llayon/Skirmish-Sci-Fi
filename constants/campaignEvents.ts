
import { TableEntry } from '../types';

export interface CampaignEvent {
    id: string; // e.g., 'friendly_doc'
    descriptionKey: string; // e.g., 'postBattle.campaignEvents.1-3'
}

export type CampaignEventTableEntry = TableEntry<CampaignEvent>;

export const CAMPAIGN_EVENTS_TABLE: CampaignEventTableEntry[] = [
    { roll_range: [1, 3], value: { id: 'friendly_doc', descriptionKey: 'postBattle.campaignEvents.1-3' } },
    { roll_range: [4, 8], value: { id: 'life_support_upgrade', descriptionKey: 'postBattle.campaignEvents.4-8' } },
    { roll_range: [9, 12], value: { id: 'new_ally', descriptionKey: 'postBattle.campaignEvents.9-12' } },
    { roll_range: [13, 16], value: { id: 'local_friends', descriptionKey: 'postBattle.campaignEvents.13-16' } },
    { roll_range: [17, 20], value: { id: 'wrong_people', descriptionKey: 'postBattle.campaignEvents.17-20' } },
    { roll_range: [21, 23], value: { id: 'old_nemesis', descriptionKey: 'postBattle.campaignEvents.21-23' } },
    { roll_range: [24, 26], value: { id: 'shady_deal', descriptionKey: 'postBattle.campaignEvents.24-26' } },
    { roll_range: [27, 30], value: { id: 'sell_cargo', descriptionKey: 'postBattle.campaignEvents.27-30' } },
    { roll_range: [31, 35], value: { id: 'overheard_something', descriptionKey: 'postBattle.campaignEvents.31-35' } },
    { roll_range: [36, 38], value: { id: 'settle_business', descriptionKey: 'postBattle.campaignEvents.36-38' } },
    { roll_range: [39, 41], value: { id: 'admirer', descriptionKey: 'postBattle.campaignEvents.39-41' } },
    { roll_range: [42, 44], value: { id: 'alien_merchant', descriptionKey: 'postBattle.campaignEvents.42-44' } },
    { roll_range: [45, 48], value: { id: 'equipment_malfunction', descriptionKey: 'postBattle.campaignEvents.45-48' } },
    { roll_range: [49, 51], value: { id: 'bad_reputation', descriptionKey: 'postBattle.campaignEvents.49-51' } },
    { roll_range: [52, 56], value: { id: 'tax_man', descriptionKey: 'postBattle.campaignEvents.52-56' } },
    { roll_range: [57, 59], value: { id: 'new_leader', descriptionKey: 'postBattle.campaignEvents.57-59' } },
    { roll_range: [60, 63], value: { id: 'business_contacts', descriptionKey: 'postBattle.campaignEvents.60-63' } },
    { roll_range: [64, 66], value: { id: 'learning_opportunity', descriptionKey: 'postBattle.campaignEvents.64-66' } },
    { roll_range: [67, 70], value: { id: 'grav_adjuster_misaligned', descriptionKey: 'postBattle.campaignEvents.67-70' } },
    { roll_range: [71, 74], value: { id: 'crew_downtime', descriptionKey: 'postBattle.campaignEvents.71-74' } },
    { roll_range: [75, 78], value: { id: 'arms_dealer', descriptionKey: 'postBattle.campaignEvents.75-78' } },
    { roll_range: [79, 81], value: { id: 'renegotiate_debts', descriptionKey: 'postBattle.campaignEvents.79-81' } },
    { roll_range: [82, 84], value: { id: 'rumors_of_war', descriptionKey: 'postBattle.campaignEvents.82-84' } },
    { roll_range: [85, 88], value: { id: 'time_on_hands', descriptionKey: 'postBattle.campaignEvents.85-88' } },
    { roll_range: [89, 91], value: { id: 'noticed_by_wrong_person', descriptionKey: 'postBattle.campaignEvents.89-91' } },
    { roll_range: [92, 94], value: { id: 'time_to_go', descriptionKey: 'postBattle.campaignEvents.92-94' } },
    { roll_range: [95, 97], value: { id: 'lockdown', descriptionKey: 'postBattle.campaignEvents.95-97' } },
    { roll_range: [98, 100], value: { id: 'great_story', descriptionKey: 'postBattle.campaignEvents.98-100' } },
];
