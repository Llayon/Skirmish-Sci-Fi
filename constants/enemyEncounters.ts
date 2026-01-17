
import { AIType, TableEntry } from '../types';

export interface RulebookEnemyTemplate {
    roll_range: [number, number];
    id: string;
    numbersModifier: number;
    panic: [number, number];
    speed: number;
    combat: number;
    toughness: number;
    ai: AIType;
    weaponsCode: string;
    armorSave?: number;
    rules: string[];
    predefinedWeapons?: string[];
}

export interface UniqueIndividualTemplate {
    roll_range: [number, number];
    id: string;
    speed: string;
    combat: string;
    toughness: string;
    ai: AIType | 'same';
    luck: number;
    weapons: string[];
    rules: string[];
    armorSave?: number;
}


export const CRIMINAL_ELEMENTS_SUBTABLE: RulebookEnemyTemplate[] = [
    { roll_range: [1, 10], id: 'gangers', numbersModifier: 2, panic: [1, 2], speed: 4, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '1 A', rules: ['leg_it'] },
    { roll_range: [11, 19], id: 'punks', numbersModifier: 3, panic: [1, 3], speed: 4, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '1 A', rules: ['careless', 'bad_shots'] },
    { roll_range: [20, 27], id: 'raiders', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 1, toughness: 3, ai: 'Aggressive', weaponsCode: '2 A', rules: ['scavengers'] },
    { roll_range: [28, 34], id: 'cultists', numbersModifier: 2, panic: [1, 1], speed: 4, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '1 A', rules: ['intrigue'] },
    { roll_range: [35, 43], id: 'psychos', numbersModifier: 2, panic: [1, 1], speed: 6, combat: 0, toughness: 4, ai: 'Rampaging', weaponsCode: '1 B', rules: ['bad_shots'] },
    { roll_range: [44, 48], id: 'brat_gang', numbersModifier: 2, panic: [1, 3], speed: 5, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '2 C', rules: ['careless'], armorSave: 6 },
    { roll_range: [49, 51], id: 'gene_renegades', numbersModifier: 1, panic: [1, 2], speed: 5, combat: 0, toughness: 4, ai: 'Cautious', weaponsCode: '1 B', rules: ['alert'] },
    { roll_range: [52, 57], id: 'anarchists', numbersModifier: 2, panic: [1, 2], speed: 5, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '2 B', rules: ['stubborn'] },
    { roll_range: [58, 64], id: 'pirates', numbersModifier: 2, panic: [1, 3], speed: 5, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '2 A', rules: ['loot'] },
    { roll_range: [65, 71], id: 'kerin_outlaws', numbersModifier: 1, panic: [1, 1], speed: 4, combat: 1, toughness: 4, ai: 'Aggressive', weaponsCode: '2 A', rules: ['stubborn'] },
    { roll_range: [72, 79], id: 'skulker_brigands', numbersModifier: 3, panic: [1, 2], speed: 6, combat: 0, toughness: 3, ai: 'Cautious', weaponsCode: '1 B', rules: ['alert', 'scavengers'] },
    { roll_range: [80, 83], id: 'tech_gangers', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 0, toughness: 5, ai: 'Tactical', weaponsCode: '3 C', rules: ['loot'], armorSave: 6 },
    { roll_range: [84, 90], id: 'starport_scum', numbersModifier: 3, panic: [1, 3], speed: 4, combat: 0, toughness: 3, ai: 'Defensive', weaponsCode: '1 A', rules: ['friday_night_warriors'] },
    { roll_range: [91, 94], id: 'hulker_gang', numbersModifier: 0, panic: [1, 1], speed: 4, combat: 1, toughness: 5, ai: 'Aggressive', weaponsCode: '1 A', rules: ['ferocious', 'aggro'] },
    { roll_range: [95, 100], id: 'gun_slingers', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 1, toughness: 3, ai: 'Tactical', weaponsCode: '1 B', rules: ['trick_shot'] }
];

export const HIRED_MUSCLE_SUBTABLE: RulebookEnemyTemplate[] = [
    { roll_range: [1, 14], id: 'unknown_mercs', numbersModifier: 0, panic: [1, 2], speed: 5, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '2 B', rules: ['call_it_a_day'] },
    { roll_range: [15, 26], id: 'enforcers', numbersModifier: 0, panic: [1, 2], speed: 4, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '2 A', rules: ['cop_killer'] },
    { roll_range: [27, 34], id: 'guild_troops', numbersModifier: 0, panic: [1, 2], speed: 4, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '2 C', rules: ['intrigue'] },
    { roll_range: [35, 39], id: 'roid_gangers', numbersModifier: 1, panic: [1, 1], speed: 4, combat: 0, toughness: 5, ai: 'Aggressive', weaponsCode: '1 A', rules: [] },
    { roll_range: [40, 42], id: 'black_ops_team', numbersModifier: 0, panic: [1, 1], speed: 6, combat: 2, toughness: 5, ai: 'Tactical', weaponsCode: '3 A', rules: ['tough_fight'] },
    { roll_range: [43, 46], id: 'war_bots', numbersModifier: 0, panic: [0, 0], speed: 3, combat: 1, toughness: 4, ai: 'Aggressive', weaponsCode: '3 C', rules: ['fearless'], armorSave: 5 },
    { roll_range: [47, 50], id: 'secret_agents', numbersModifier: 0, panic: [1, 2], speed: 5, combat: 1, toughness: 4, ai: 'Cautious', weaponsCode: '2 C', rules: ['loot', 'intrigue'] },
    { roll_range: [51, 53], id: 'assassins', numbersModifier: 0, panic: [1, 1], speed: 6, combat: 2, toughness: 3, ai: 'Aggressive', weaponsCode: '1 B', rules: ['gruesome', 'tough_fight'] },
    { roll_range: [54, 59], id: 'feral_mercenaries', numbersModifier: 2, panic: [1, 2], speed: 5, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '2 B', rules: ['quick_feet'] },
    { roll_range: [60, 64], id: 'skulker_mercenaries', numbersModifier: 3, panic: [1, 2], speed: 7, combat: 0, toughness: 3, ai: 'Cautious', weaponsCode: '2 C', rules: ['alert', 'scavengers'] },
    { roll_range: [65, 74], id: 'corporate_security', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 1, toughness: 4, ai: 'Defensive', weaponsCode: '2 B', rules: [], armorSave: 6 },
    { roll_range: [75, 79], id: 'unity_grunts', numbersModifier: 1, panic: [1, 1], speed: 5, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '2 B', rules: [], armorSave: 6 }, // Corrected weapons code from rules text
    { roll_range: [80, 85], id: 'security_bots', numbersModifier: 1, panic: [0, 0], speed: 3, combat: 0, toughness: 5, ai: 'Defensive', weaponsCode: '2 A', rules: ['careless', 'fearless'], armorSave: 6 },
    { roll_range: [86, 90], id: 'black_dragon_mercs', numbersModifier: 1, panic: [1, 2], speed: 5, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '2 C', rules: ['stubborn'] },
    { roll_range: [91, 95], id: 'rage_lizard_mercs', numbersModifier: 0, panic: [1, 2], speed: 4, combat: 1, toughness: 5, ai: 'Tactical', weaponsCode: '3 B', rules: ['up_close'] },
    { roll_range: [96, 100], id: 'blood_storm_mercs', numbersModifier: 0, panic: [1, 1], speed: 4, combat: 1, toughness: 4, ai: 'Aggressive', weaponsCode: '2 B', rules: ['ferocious'] }
];

export const INTERESTED_PARTIES_SUBTABLE: RulebookEnemyTemplate[] = [
    { roll_range: [1, 6], id: 'renegade_soldiers', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 1, toughness: 5, ai: 'Tactical', weaponsCode: '2 B', rules: ['grudge'] },
    { roll_range: [7, 13], id: 'bounty_hunters', numbersModifier: 0, panic: [1, 2], speed: 5, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '1 B', rules: ['intrigue'] },
    { roll_range: [14, 18], id: 'abandoned', numbersModifier: 1, panic: [1, 3], speed: 4, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '1 A', rules: ['careless', 'cowardly'] },
    { roll_range: [19, 27], id: 'vigilantes', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '2 A', rules: ['persistent'] },
    { roll_range: [28, 35], id: 'isolationists', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 0, toughness: 3, ai: 'Cautious', weaponsCode: '1 A', rules: ['dogged'] },
    { roll_range: [36, 41], id: 'zealots', numbersModifier: 2, panic: [1, 1], speed: 5, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '1 A', rules: ['ferocious'] },
    { roll_range: [42, 48], id: 'mutants', numbersModifier: 3, panic: [1, 3], speed: 4, combat: 0, toughness: 5, ai: 'Aggressive', weaponsCode: '1 A', rules: ['cowardly'] },
    { roll_range: [49, 52], id: 'primitives', numbersModifier: 2, panic: [1, 2], speed: 6, combat: 1, toughness: 3, ai: 'Aggressive', weaponsCode: '0 A', rules: ['going_medieval'], predefinedWeapons: ['blade'] }, // Weapons handled by rule
    { roll_range: [53, 56], id: 'precursor_exiles', numbersModifier: 0, panic: [1, 2], speed: 6, combat: 1, toughness: 4, ai: 'Tactical', weaponsCode: '3 B', rules: ['prediction'] },
    { roll_range: [57, 63], id: 'kerin_colonists', numbersModifier: 1, panic: [1, 1], speed: 5, combat: 1, toughness: 4, ai: 'Aggressive', weaponsCode: '2 A', rules: ['stubborn', 'invasion_threat'] },
    { roll_range: [64, 68], id: 'swift_war_squad', numbersModifier: 2, panic: [1, 1], speed: 6, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '1 B', rules: ['unpredictable'] },
    { roll_range: [69, 72], id: 'soulless_task_force', numbersModifier: 0, panic: [1, 1], speed: 4, combat: 2, toughness: 5, ai: 'Tactical', weaponsCode: '3 C', rules: [], armorSave: 6 },
    { roll_range: [73, 76], id: 'tech_zealots', numbersModifier: 1, panic: [1, 2], speed: 5, combat: 0, toughness: 5, ai: 'Aggressive', weaponsCode: '3 C', rules: ['loot'], armorSave: 6 },
    { roll_range: [77, 83], id: 'colonial_militia', numbersModifier: 1, panic: [1, 2], speed: 4, combat: 0, toughness: 3, ai: 'Cautious', weaponsCode: '2 B', rules: ['home_field_advantage'] },
    { roll_range: [84, 88], id: 'planetary_nomads', numbersModifier: 2, panic: [1, 2], speed: 6, combat: 0, toughness: 3, ai: 'Cautious', weaponsCode: '2 A', rules: ['alert'] },
    { roll_range: [89, 100], id: 'salvage_team', numbersModifier: 1, panic: [1, 3], speed: 4, combat: 0, toughness: 4, ai: 'Cautious', weaponsCode: '2 B', rules: ['scavengers'] }
];

export const ROVING_THREATS_SUBTABLE: RulebookEnemyTemplate[] = [
    { roll_range: [1, 4], id: 'converted_acquisition', numbersModifier: 1, panic: [0, 0], speed: 4, combat: 0, toughness: 5, ai: 'Aggressive', weaponsCode: '2 B', rules: ['careless', 'built_in', 'invasion_threat'], armorSave: 6 },
    { roll_range: [5, 12], id: 'converted_infiltrators', numbersModifier: 0, panic: [0, 0], speed: 4, combat: 0, toughness: 4, ai: 'Aggressive', weaponsCode: '1 A', rules: ['invasion_threat'], armorSave: 6 },
    { roll_range: [13, 18], id: 'abductor_raiders', numbersModifier: 3, panic: [1, 1], speed: 4, combat: 0, toughness: 3, ai: 'Aggressive', weaponsCode: '2 A', rules: ['invasion_threat'] },
    { roll_range: [19, 28], id: 'swarm_brood', numbersModifier: 2, panic: [0, 0], speed: 6, combat: 1, toughness: 4, ai: 'Beast', weaponsCode: 'N/A', predefinedWeapons: ['claws_d1'], rules: ['pack_hunters', 'invasion_threat'] },
    { roll_range: [29, 34], id: 'haywire_robots', numbersModifier: 2, panic: [0, 0], speed: 3, combat: 0, toughness: 4, ai: 'Rampaging', weaponsCode: 'N/A', predefinedWeapons: ['smash_d0'], rules: ['careless'], armorSave: 6 },
    { roll_range: [35, 44], id: 'razor_lizards', numbersModifier: 2, panic: [1, 2], speed: 6, combat: 1, toughness: 3, ai: 'Beast', weaponsCode: 'N/A', predefinedWeapons: ['fangs_d0'], rules: ['needle_fangs'] },
    { roll_range: [45, 56], id: 'sand_runners', numbersModifier: 1, panic: [1, 2], speed: 7, combat: 0, toughness: 3, ai: 'Beast', weaponsCode: 'N/A', predefinedWeapons: ['fangs_d1'], rules: ['leap'] },
    { roll_range: [57, 63], id: 'void_rippers', numbersModifier: 0, panic: [1, 2], speed: 5, combat: 1, toughness: 5, ai: 'Rampaging', weaponsCode: 'N/A', predefinedWeapons: ['fangs_d0'], rules: ['gruesome'] },
    { roll_range: [64, 69], id: 'krorg', numbersModifier: 0, panic: [0, 0], speed: 5, combat: 2, toughness: 6, ai: 'Rampaging', weaponsCode: 'N/A', predefinedWeapons: ['claws_d1'], rules: ['ferocious', 'easy_targets', 'tough_fight'], armorSave: 5 },
    { roll_range: [70, 78], id: 'large_bugs', numbersModifier: 2, panic: [1, 1], speed: 5, combat: 1, toughness: 5, ai: 'Rampaging', weaponsCode: 'N/A', predefinedWeapons: ['mandibles_d1'], rules: ['easy_targets', 'stubborn'] },
    { roll_range: [79, 84], id: 'carnivore_chasers', numbersModifier: 2, panic: [1, 2], speed: 6, combat: 0, toughness: 4, ai: 'Beast', weaponsCode: 'N/A', predefinedWeapons: ['fangs_d0'], rules: ['alert'] },
    { roll_range: [85, 97], id: 'vent_crawlers', numbersModifier: 0, panic: [0, 0], speed: 6, combat: 2, toughness: 5, ai: 'Rampaging', weaponsCode: 'N/A', predefinedWeapons: ['claws_d1'], rules: ['fate_worse_than_death'] },
    { roll_range: [98, 100], id: 'distorts', numbersModifier: 0, panic: [0, 0], speed: 4, combat: 0, toughness: 4, ai: 'Beast', weaponsCode: 'N/A', predefinedWeapons: ['touch_d3'], rules: ['stubborn', 'shimmer', 'respawn'] }
];

export const UNIQUE_INDIVIDUALS_TABLE: UniqueIndividualTemplate[] = [
    { roll_range: [1, 6], id: 'enemy_bruiser', speed: 'same', combat: 'same+1', toughness: 'same', ai: 'Guardian', luck: 0, weapons: ['power_claw'], rules: [] },
    { roll_range: [7, 12], id: 'enemy_heavy', speed: 'same', combat: 'same', toughness: 'same', ai: 'Defensive', luck: 0, weapons: ['rattle_gun'], rules: [] },
    { roll_range: [13, 17], id: 'enemy_boss', speed: 'same+1', combat: 'same+1', toughness: 'same-1', ai: 'same', luck: 1, weapons: ['hand_cannon', 'brutal_melee_weapon'], rules: ['boss'] },
    { roll_range: [18, 22], id: 'hired_killer', speed: '5', combat: '+1', toughness: '5', ai: 'Aggressive', luck: 1, weapons: ['machine_pistol', 'blade'], rules: [] },
    { roll_range: [23, 25], id: 'corporate_spook', speed: '5', combat: '+1', toughness: '4', ai: 'Cautious', luck: 1, weapons: ['hand_laser'], rules: ['spook_bail', 'corporate_rival'] },
    { roll_range: [26, 30], id: 'bounty_tracker', speed: '5', combat: '+1', toughness: '5', ai: 'Aggressive', luck: 1, weapons: ['shotgun', 'blade'], rules: [] },
    { roll_range: [31, 35], id: 'callous_merc', speed: '4', combat: '+2', toughness: '5', ai: 'Tactical', luck: 1, weapons: ['infantry_laser', 'blade'], rules: [] },
    { roll_range: [36, 41], id: 'freelancer', speed: '4', combat: '+1', toughness: '4', ai: 'Tactical', luck: 1, weapons: ['hand_cannon', 'blade'], rules: ['freelancer_loot'] },
    { roll_range: [42, 44], id: 'secret_agent', speed: '6', combat: '+2', toughness: '4', ai: 'Aggressive', luck: 1, weapons: ['hand_laser', 'glare_sword'], rules: ['target_priority'] },
    { roll_range: [45, 48], id: 'hulker_brawler', speed: '4', combat: '+1', toughness: '6', ai: 'Aggressive', luck: 0, weapons: ['hand_cannon', 'brutal_melee_weapon'], rules: ['melee_fighter'] },
    { roll_range: [49, 53], id: 'gun_slinger_unique', speed: '5', combat: '+1', toughness: '4', ai: 'Tactical', luck: 1, weapons: ['machine_pistol'], rules: ['sharp_shooter'] },
    { roll_range: [54, 56], id: 'engineer_tech', speed: '6', combat: '+1', toughness: '4', ai: 'Cautious', luck: 1, weapons: ['blast_pistol'], rules: [] },
    { roll_range: [57, 61], id: 'mutant_bruiser', speed: '4', combat: '+1', toughness: '5', ai: 'Guardian', luck: 1, weapons: ['shotgun', 'brutal_melee_weapon'], rules: ['ferocious'] },
    { roll_range: [62, 65], id: 'precursor_wanderer', speed: '7', combat: '+2', toughness: '4', ai: 'Aggressive', luck: 1, weapons: ['infantry_laser', 'glare_sword'], rules: ['one_with_the_flow'], armorSave: 6 },
    { roll_range: [66, 69], id: 'hakshan_investigator', speed: '5', combat: '+0', toughness: '4', ai: 'Defensive', luck: 1, weapons: ['plasma_rifle'], rules: [] },
    { roll_range: [70, 75], id: 'kerin_warrior', speed: '5', combat: '+2', toughness: '5', ai: 'Aggressive', luck: 1, weapons: ['machine_pistol', 'ripper_sword'], rules: [] },
    { roll_range: [76, 79], id: 'nomad_scout', speed: '6', combat: '+1', toughness: '4', ai: 'Defensive', luck: 0, weapons: ['marksman_rifle'], rules: ['concealed'] },
    { roll_range: [80, 82], id: 'cyborg_merc', speed: '7', combat: '+2', toughness: '6', ai: 'Tactical', luck: 1, weapons: ['auto_rifle', 'power_claw'], rules: [], armorSave: 6 },
    { roll_range: [83, 85], id: 'rogue_psionic', speed: '4', combat: '+0', toughness: '4', ai: 'Cautious', luck: 3, weapons: ['hand_gun'], rules: [] },
    { roll_range: [86, 91], id: 'gene_dog', speed: '6', combat: '+1', toughness: '4', ai: 'Guardian', luck: 0, weapons: ['fangs_d0'], rules: ['loyal'] },
    { roll_range: [92, 96], id: 'sand_runner', speed: '7', combat: '+0', toughness: '3', ai: 'Guardian', luck: 0, weapons: ['fangs_d1'], rules: [] },
    { roll_range: [97, 100], id: 'mk_ii_security_bot', speed: '4', combat: '+2', toughness: '5', ai: 'Guardian', luck: 0, weapons: ['fury_rifle'], rules: ['targeting_ai'], armorSave: 6 }
];


export type EnemyEncounterCategory = 'Criminal Elements' | 'Hired Muscle' | 'Interested Parties' | 'Roving Threats';

interface EnemyEncounterCategoryEntry {
    category: EnemyEncounterCategory;
    ranges: {
        opportunity: [number, number];
        patron: [number, number];
        quest: [number, number];
        rival: [number, number];
    }
}
export const ENEMY_ENCOUNTER_CATEGORY_TABLE: EnemyEncounterCategoryEntry[] = [
    { category: 'Criminal Elements', ranges: { opportunity: [1,30], patron: [1,25], quest: [1,15], rival: [1,50] } },
    { category: 'Hired Muscle', ranges: { opportunity: [31,60], patron: [26,60], quest: [16,40], rival: [51,80] } },
    { category: 'Interested Parties', ranges: { opportunity: [61,80], patron: [61,75], quest: [41,70], rival: [81,100] } },
    { category: 'Roving Threats', ranges: { opportunity: [81,100], patron: [76,100], quest: [71,100], rival: [-1,-1] } }, // Rival has no range for roving threats
];
