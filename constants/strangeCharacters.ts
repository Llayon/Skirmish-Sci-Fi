import { CharacterStats, RaceId } from '../types';

export interface StrangeCharacterData {
    id: string;
    nameKey: string;
    baseRaceId?: RaceId;
    baseStats: Partial<CharacterStats>;
    rules: string[];
    specialAbilities?: string[];
    innateArmorSave?: number;
    noXP?: boolean;
    creationOverrides?: {
        fixedMotivation?: string;
        fixedBackground?: string;
        rollTwiceBackground?: boolean;
        ignoreSPCreation?: boolean;
        classRestrictions?: {
            [key: string]: string;
        };
        addResources?: {
            rivals?: number;
            storyPoints?: number;
            questRumors?: number;
            credits?: number | 'reduce';
        };
    };
}

export const STRANGE_CHARACTERS: Record<string, StrangeCharacterData> = {
    deconverted: {
        id: 'deconverted',
        nameKey: 'strange_characters.deconverted',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        rules: [
            'strange_characters_rules.deconverted_innate_armor',
            'strange_characters_rules.deconverted_implants',
            'strange_characters_rules.deconverted_savvy_cap'
        ],
        innateArmorSave: 6,
        creationOverrides: {
            fixedMotivation: 'revenge'
        }
    },
    unity_agent: {
        id: 'unity_agent',
        nameKey: 'strange_characters.unity_agent',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 2, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        rules: ['strange_characters_rules.unity_agent_favor'],
        creationOverrides: {
            fixedMotivation: 'order'
        }
    },
    mysterious_past: {
        id: 'mysterious_past',
        nameKey: 'strange_characters.mysterious_past',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.mysterious_past_roll'],
        creationOverrides: {
            rollTwiceBackground: true,
            ignoreSPCreation: true
        }
    },
    hakshan: {
        id: 'hakshan',
        nameKey: 'strange_characters.hakshan',
        baseRaceId: 'baseline_human', // Placeholder, visually distinct
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        rules: ['strange_characters_rules.hakshan_motivation'],
        creationOverrides: {
            // has 'Truth' motivation in addition to rolled one. Logic handled in character service.
        }
    },
    stalker: {
        id: 'stalker',
        nameKey: 'strange_characters.stalker',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0 },
        rules: ['strange_characters_rules.stalker_teleport'],
        specialAbilities: ['stalker_teleport']
    },
    hulker: {
        id: 'hulker',
        nameKey: 'strange_characters.hulker',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 1, speed: 4, combat: 1, toughness: 5, savvy: 0 },
        rules: ['strange_characters_rules.hulker_shooting', 'strange_characters_rules.hulker_traits'],
        specialAbilities: ['hulker_rules'],
        creationOverrides: {
            classRestrictions: {
                technician: 'primitive',
                scientist: 'primitive',
                hacker: 'primitive'
            }
        }
    },
    hopeful_rookie: {
        id: 'hopeful_rookie',
        nameKey: 'strange_characters.hopeful_rookie',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.hopeful_rookie_bonus', 'strange_characters_rules.hopeful_rookie_loss']
    },
    genetic_uplift: {
        id: 'genetic_uplift',
        nameKey: 'strange_characters.genetic_uplift',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 2, speed: 5, combat: 1, toughness: 4, savvy: 1 },
        rules: ['strange_characters_rules.genetic_uplift_penalty'],
        creationOverrides: {
            addResources: {
                rivals: 1
            }
        }
    },
    mutant: {
        id: 'mutant',
        nameKey: 'strange_characters.mutant',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.mutant_tasks'],
        creationOverrides: {
            fixedBackground: 'lower_megacity'
        }
    },
    assault_bot: {
        id: 'assault_bot',
        nameKey: 'strange_characters.assault_bot',
        baseRaceId: 'bot',
        baseStats: { reactions: 2, speed: 4, combat: 1, toughness: 4, savvy: 0 },
        rules: ['strange_characters_rules.assault_bot_savvy', 'strange_characters_rules.assault_bot_armor'],
        specialAbilities: ['hulker_rules'], // Ignores Clumsy and Heavy
        innateArmorSave: 5,
        noXP: true
    },
    manipulator: {
        id: 'manipulator',
        nameKey: 'strange_characters.manipulator',
        baseRaceId: 'baseline_human', // Placeholder
        baseStats: { reactions: 2, speed: 4, combat: 0, toughness: 3, savvy: 1 },
        rules: ['strange_characters_rules.manipulator_brawl', 'strange_characters_rules.manipulator_sp'],
        specialAbilities: ['manipulator_rules'],
        creationOverrides: {
            fixedBackground: 'bureaucrat'
        }
    },
    primitive: {
        id: 'primitive',
        nameKey: 'strange_characters.primitive',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.primitive_shooting', 'strange_characters_rules.primitive_melee'],
        creationOverrides: {
            fixedBackground: 'primitive_world'
        }
    },
    feeler: {
        id: 'feeler',
        nameKey: 'strange_characters.feeler',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.feeler_motivation']
    },
    emo_suppressed: {
        id: 'emo_suppressed',
        nameKey: 'strange_characters.emo_suppressed',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.emo_suppressed_loyalty'],
        creationOverrides: {
            fixedMotivation: 'survival'
        }
    },
    minor_alien: {
        id: 'minor_alien',
        nameKey: 'strange_characters.minor_alien',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.minor_alien_resources', 'strange_characters_rules.minor_alien_xp']
    },
    traveler: {
        id: 'traveler',
        nameKey: 'strange_characters.traveler',
        baseRaceId: 'baseline_human',
        baseStats: { reactions: 3, speed: 4, combat: 0, toughness: 4, savvy: 2 },
        rules: ['strange_characters_rules.traveler_flee', 'strange_characters_rules.traveler_event'],
        creationOverrides: {
            fixedMotivation: 'truth',
            addResources: {
                storyPoints: 2,
                questRumors: 2
            }
        }
    },
    empath: {
        id: 'empath',
        nameKey: 'strange_characters.empath',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.empath_tasks', 'strange_characters_rules.empath_implants']
    },
    bio_upgrade: {
        id: 'bio_upgrade',
        nameKey: 'strange_characters.bio_upgrade',
        baseRaceId: 'baseline_human',
        baseStats: {},
        rules: ['strange_characters_rules.bio_upgrade_implants', 'strange_characters_rules.bio_upgrade_credits'],
        creationOverrides: {
            addResources: {
                credits: 'reduce'
            }
        }
    }
};
