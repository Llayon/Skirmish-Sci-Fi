import { TableEntry, Background, RaceId, CharacterStats, SpecialAbility, Motivation, Class } from '../types';

export interface RaceData {
    id: RaceId;
    nameKey: string;
    baseStats: Partial<CharacterStats>;
    innateArmorSave?: number;
    noXP?: boolean;
    noConsumablesOrImplants?: boolean;
    usesBotInjuryTable?: boolean;
    canInstallBotUpgrades?: boolean;
    specialAbilities?: SpecialAbility[];
    rules?: string[]; // description keys
}

export const RACES: Record<RaceId, RaceData> = {
    baseline_human: {
        id: 'baseline_human',
        nameKey: 'races.baseline_human',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        rules: ['races.rules.human_luck']
    },
    bot: {
        id: 'bot',
        nameKey: 'races.bot',
        baseStats: { reactions: 2, speed: 4, combat: 1, toughness: 4, savvy: 2, luck: 0 },
        innateArmorSave: 6,
        noXP: true,
        noConsumablesOrImplants: true,
        usesBotInjuryTable: true,
        canInstallBotUpgrades: true,
        rules: ['races.rules.bot_upgrades', 'races.rules.bot_no_events']
    },
    engineer: {
        id: 'engineer',
        nameKey: 'races.engineer',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 2, savvy: 1 },
        rules: ['races.rules.engineer_repair', 'races.rules.engineer_toughness_cap']
    },
    kerin: {
        id: 'kerin',
        nameKey: 'races.kerin',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 4, savvy: 0 },
        specialAbilities: ['kerin_brawl', 'kerin_must_brawl'],
        rules: ['races.rules.kerin_must_brawl']
    },
    soulless: {
        id: 'soulless',
        nameKey: 'races.soulless',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 4, savvy: 1 },
        innateArmorSave: 6,
        noConsumablesOrImplants: true,
        usesBotInjuryTable: true,
        canInstallBotUpgrades: true,
        rules: ['races.rules.soulless_armor', 'races.rules.soulless_no_implants', 'races.rules.soulless_upgrades']
    },
    precursor: {
        id: 'precursor',
        nameKey: 'races.precursor',
        baseStats: { reactions: 1, speed: 5, combat: 0, toughness: 2, savvy: 0 },
        specialAbilities: ['precursor_event'],
        rules: ['races.rules.precursor_event_choice']
    },
    swift: {
        id: 'swift',
        nameKey: 'races.swift',
        baseStats: { reactions: 1, speed: 5, combat: 0, toughness: 3, savvy: 0 },
        specialAbilities: ['swift_fly', 'swift_volley'],
        rules: ['races.rules.swift_fly', 'races.rules.swift_volley']
    },
    feral: {
        id: 'feral',
        nameKey: 'races.feral',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        specialAbilities: ['feral_initiative', 'feral_reaction_fumble'],
        rules: ['races.rules.feral_initiative', 'races.rules.feral_reaction_fumble'],
    }
};

export const CREW_TYPE_TABLE: TableEntry<string>[] = [
    { roll_range: [1, 60], value: 'baseline_human' },
    { roll_range: [61, 80], value: 'primary_alien' },
    { roll_range: [81, 90], value: 'bot' },
    { roll_range: [91, 100], value: 'strange_character' },
];

export const PRIMARY_ALIEN_TABLE: TableEntry<RaceId>[] = [
    { roll_range: [1, 20], value: 'engineer' },
    { roll_range: [21, 40], value: 'kerin' },
    { roll_range: [41, 55], value: 'soulless' },
    { roll_range: [56, 70], value: 'precursor' },
    { roll_range: [71, 90], value: 'feral' },
    { roll_range: [91, 100], value: 'swift' },
];

export const STRANGE_CHARACTER_TABLE: TableEntry<string>[] = [
    { roll_range: [1, 2], value: 'deconverted' },
    { roll_range: [3, 8], value: 'unity_agent' },
    { roll_range: [9, 17], value: 'mysterious_past' },
    { roll_range: [18, 22], value: 'hakshan' },
    { roll_range: [23, 27], value: 'stalker' },
    { roll_range: [28, 34], value: 'hulker' },
    { roll_range: [35, 41], value: 'hopeful_rookie' },
    { roll_range: [42, 47], value: 'genetic_uplift' },
    { roll_range: [48, 53], value: 'mutant' },
    { roll_range: [54, 58], value: 'assault_bot' },
    { roll_range: [59, 62], value: 'manipulator' },
    { roll_range: [63, 67], value: 'primitive' },
    { roll_range: [68, 73], value: 'feeler' },
    { roll_range: [74, 79], value: 'emo_suppressed' },
    { roll_range: [80, 85], value: 'minor_alien' },
    { roll_range: [86, 87], value: 'traveler' },
    { roll_range: [88, 93], value: 'empath' },
    { roll_range: [94, 100], value: 'bio_upgrade' },
];

export const MOTIVATION_TABLE: TableEntry<Motivation>[] = [
    { roll_range: [1, 8], value: { id: "wealth", effect: "", resources: "+1D6 credits", starting_rolls: [] } },
    { roll_range: [9, 14], value: { id: "fame", effect: "", resources: "+1 story point", starting_rolls: [] } },
    { roll_range: [15, 19], value: { id: "glory", effect: "+1 Combat Skill", resources: "", starting_rolls: ["+1 Military Weapon"] } },
    { roll_range: [20, 26], value: { id: "survival", effect: "+1 Toughness", resources: "", starting_rolls: [] } },
    { roll_range: [27, 32], value: { id: "escape", effect: "+1 Speed", resources: "", starting_rolls: [] } },
    { roll_range: [33, 39], value: { id: "adventure", effect: "", resources: "+1D6 credits", starting_rolls: ["+1 Low-tech Weapon"] } },
    { roll_range: [40, 44], value: { id: "truth", effect: "", resources: "1 Rumor, +1 story point", starting_rolls: [] } },
    { roll_range: [45, 49], value: { id: "technology", effect: "+1 Savvy", resources: "", starting_rolls: ["+1 Gadget"] } },
    { roll_range: [50, 56], value: { id: "discovery", effect: "+1 Savvy", resources: "", starting_rolls: ["+1 Gear"] } },
    { roll_range: [57, 63], value: { id: "loyalty", effect: "", resources: "Patron, +1 story point", starting_rolls: [] } },
    { roll_range: [64, 69], value: { id: "revenge", effect: "+2 XP", resources: "Rival", starting_rolls: [] } },
    { roll_range: [70, 74], value: { id: "romance", effect: "", resources: "1 Rumor, +1 story point", starting_rolls: [] } },
    { roll_range: [75, 79], value: { id: "faith", effect: "", resources: "1 Rumor, +1 story point", starting_rolls: [] } },
    { roll_range: [80, 84], value: { id: "political", effect: "", resources: "Patron, +1 story point", starting_rolls: [] } },
    { roll_range: [85, 90], value: { id: "power", effect: "+2 XP", resources: "Rival", starting_rolls: [] } },
    { roll_range: [91, 95], value: { id: "order", effect: "", resources: "Patron, +1 story point", starting_rolls: [] } },
    { roll_range: [96, 100], value: { id: "freedom", effect: "+2 XP", resources: "", starting_rolls: [] } },
];

export const CLASS_TABLE: TableEntry<Class>[] = [
    { roll_range: [1, 5], value: { id: "working_class", effect: "+1 Savvy, +1 Luck", resources: "", starting_rolls: [] } },
    { roll_range: [6, 9], value: { id: "technician", effect: "+1 Savvy", resources: "", starting_rolls: ["+1 Gear"] } },
    { roll_range: [10, 13], value: { id: "scientist", effect: "+1 Savvy", resources: "", starting_rolls: ["+1 Gadget"] } },
    { roll_range: [14, 17], value: { id: "hacker", effect: "+1 Savvy", resources: "Rival", starting_rolls: [] } },
    { roll_range: [18, 22], value: { id: "soldier", effect: "+1 Combat Skill", resources: "+1D6 credits", starting_rolls: [] } },
    { roll_range: [23, 27], value: { id: "mercenary", effect: "+1 Combat Skill", resources: "", starting_rolls: ["+1 Military Weapon"] } },
    { roll_range: [28, 32], value: { id: "agitator", effect: "", resources: "Rival", starting_rolls: [] } },
    { roll_range: [33, 36], value: { id: "primitive", effect: "+1 Speed", resources: "", starting_rolls: ["+1 Low-tech Weapon"] } },
    { roll_range: [37, 40], value: { id: "artist", effect: "", resources: "+1D6 credits", starting_rolls: [] } },
    { roll_range: [41, 44], value: { id: "negotiator", effect: "", resources: "Patron, +1 story point", starting_rolls: [] } },
    { roll_range: [45, 49], value: { id: "trader", effect: "", resources: "+2D6 credits", starting_rolls: [] } },
    { roll_range: [50, 54], value: { id: "starship_crew", effect: "+1 Savvy", resources: "", starting_rolls: [] } },
    { roll_range: [55, 58], value: { id: "petty_criminal", effect: "+1 Speed", resources: "", starting_rolls: [] } },
    { roll_range: [59, 63], value: { id: "ganger", effect: "+1 Reactions", resources: "", starting_rolls: ["+1 Low-tech Weapon"] } },
    { roll_range: [64, 67], value: { id: "scoundrel", effect: "+1 Speed", resources: "", starting_rolls: [] } },
    { roll_range: [68, 71], value: { id: "enforcer", effect: "+1 Combat Skill", resources: "Patron", starting_rolls: [] } },
    { roll_range: [72, 75], value: { id: "special_agent", effect: "+1 Reactions", resources: "Patron", starting_rolls: ["+1 Gadget"] } },
    { roll_range: [76, 79], value: { id: "troubleshooter", effect: "+1 Reactions", resources: "", starting_rolls: ["+1 Low-tech Weapon"] } },
    { roll_range: [80, 83], value: { id: "bounty_hunter", effect: "+1 Speed", resources: "1 Rumor", starting_rolls: ["+1 Low-tech Weapon"] } },
    { roll_range: [89, 92], value: { id: "explorer", effect: "+2 XP", resources: "", starting_rolls: ["+1 Gear"] } },
    { roll_range: [93, 96], value: { id: "punk", effect: "+2 XP", resources: "Rival", starting_rolls: [] } },
    { roll_range: [97, 100], value: { id: "scavenger", effect: "", resources: "1 Rumor", starting_rolls: ["+1 High-tech Weapon"] } },
];

export const CHARACTER_BACKGROUNDS: Background[] = [
    { id: "peaceful_high_tech", roll_range: [1, 4], effect: "+1 Savvy", resources: "1-6 credits", starting_rolls: [] },
    { id: "dystopian_city", roll_range: [5, 9], effect: "+1 Speed", resources: "", starting_rolls: [] },
    { id: "low_tech_colony", roll_range: [10, 13], effect: "", resources: "", starting_rolls: ["+1 Low-tech Weapon"] },
    { id: "mining_colony", roll_range: [14, 17], effect: "+1 Toughness", resources: "", starting_rolls: [] },
    { id: "military_brat", roll_range: [18, 21], effect: "+1 Combat Skill", resources: "", starting_rolls: [] },
    { id: "space_station", roll_range: [22, 25], effect: "", resources: "", starting_rolls: ["+1 Gear"] },
    { id: "military_outpost", roll_range: [26, 29], effect: "+1 Reactions", resources: "", starting_rolls: [] },
    { id: "drifter", roll_range: [30, 34], effect: "", resources: "", starting_rolls: ["+1 Gear"] },
    { id: "lower_megacity", roll_range: [35, 39], effect: "", resources: "", starting_rolls: ["+1 Low-tech Weapon"] },
    { id: "wealthy_merchant", roll_range: [40, 42], effect: "", resources: "+2D6 credits", starting_rolls: [] },
    { id: "frontier_gang", roll_range: [43, 46], effect: "+1 Combat Skill", resources: "", starting_rolls: [] },
    { id: "religious_cult", roll_range: [47, 49], effect: "", resources: "Patron, +1 story point", starting_rolls: [] },
    { id: "war_torn", roll_range: [50, 52], effect: "+1 Reactions", resources: "", starting_rolls: ["+1 Military Weapon"] },
    { id: "tech_guild", roll_range: [53, 55], effect: "+1 Savvy", resources: "+1D6 credits", starting_rolls: ["+1 High-tech Weapon"] },
    { id: "alien_colony", roll_range: [56, 59], effect: "", resources: "", starting_rolls: ["+1 Gadget"] },
    { id: "space_mission", roll_range: [60, 64], effect: "+1 Savvy", resources: "", starting_rolls: [] },
    { id: "research_outpost", roll_range: [65, 68], effect: "+1 Savvy", resources: "", starting_rolls: ["+1 Gadget"] },
    { id: "primitive_world", roll_range: [69, 72], effect: "+1 Toughness", resources: "", starting_rolls: ["+1 Low-tech Weapon"] },
    { id: "orphan_program", roll_range: [73, 76], effect: "", resources: "Patron, +1 story point", starting_rolls: [] },
    { id: "isolationist", roll_range: [77, 80], effect: "", resources: "2 Quest Rumors", starting_rolls: [] },
    { id: "comfortable_megacity", roll_range: [81, 84], effect: "", resources: "+1D6 credits", starting_rolls: [] },
    { id: "industrial_world", roll_range: [85, 89], effect: "", resources: "", starting_rolls: ["+1 Gear"] },
    { id: "bureaucrat", roll_range: [90, 93], effect: "", resources: "+1D6 credits", starting_rolls: [] },
    { id: "wasteland_nomads", roll_range: [94, 97], effect: "+1 Reactions", resources: "", starting_rolls: ["+1 Low-tech Weapon"] },
    { id: "alien_culture", roll_range: [98, 100], effect: "", resources: "", starting_rolls: ["+1 High-tech Weapon"] }
];

export const PRONOUNS: string[] = ["they/them", "she/her", "he/him"];
