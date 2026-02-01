import { Character } from '../../types';
import { logger } from './logger';

const fallbackCharacterDetails = {
    name: "Valen 'Rook' Kor",
    backstory: "Rook grew up in the lower levels of a hive city, learning to strip ships for parts before they were cold. A deal gone wrong forced them off-world, and now they sell their skills to the highest bidder, forever looking over their shoulder.",
};

/**
 * Generates character narrative details using local random generation.
 * Used as a replacement for external AI APIs.
 */
export const generateNarrativeDetails = async (
    partialChar: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns' | 'strangeCharacterId'>
): Promise<Pick<Character, 'name' | 'backstory'>> => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return Promise.resolve({
        ...fallbackCharacterDetails,
        name: `${fallbackCharacterDetails.name} (${randomSuffix})`,
    });
};

/**
 * Generates narrative details for multiple characters.
 */
export const generateMultipleNarrativeDetails = async (
    partialChars: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns' | 'strangeCharacterId'>[]
): Promise<Pick<Character, 'name' | 'backstory'>[]> => {
    return Promise.resolve(partialChars.map(() => {
        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        return {
            ...fallbackCharacterDetails,
            name: `${fallbackCharacterDetails.name} (${randomSuffix})`,
        };
    }));
};
