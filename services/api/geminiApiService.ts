/**
 * Service for interacting with the Google Gemini API.
 * This service is currently mocked for local testing and does not make live API calls.
 */
import { Character } from '../../types';
import { logger } from '../utils/logger';

// Mocked details to maintain functionality without a live API key.
const fallbackCharacterDetails = {
    name: "Valen 'Rook' Kor",
    backstory: "Rook grew up in the lower levels of a hive city, learning to strip ships for parts before they were cold. A deal gone wrong forced them off-world, and now they sell their skills to the highest bidder, forever looking over their shoulder.",
};

const getFallbackDetails = () => {
    logger.warn("Using fallback character details. Gemini API calls are mocked.");
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return {
        ...fallbackCharacterDetails,
        name: `${fallbackCharacterDetails.name} (${randomSuffix})`,
    };
};

export class GeminiApiService {
    constructor() {
        logger.info("GeminiApiService initialized in mocked mode.");
    }

    /**
     * Generates character details using mocked data.
     * @param partialChar - The partial character data (ignored in mock).
     * @returns A promise that resolves to the character's name, and backstory.
     */
    async generateCharacterDetails(
        partialChar: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns'>
    ): Promise<Pick<Character, 'name' | 'backstory'>> {
        // Always return mocked details
        return Promise.resolve(getFallbackDetails());
    }
    
    /**
     * Generates details for multiple characters using mocked data.
     * @param partialChars - An array of partial character data (length is used).
     * @returns A promise that resolves to an array of mocked character details.
     */
    generateMultipleCharacterDetails(
        partialChars: Pick<Character, 'raceId' | 'classId' | 'backgroundId' | 'motivationId' | 'pronouns'>[]
    ): Promise<Pick<Character, 'name' | 'backstory'>[]> {
        // Always return an array of mocked details
        return Promise.resolve(partialChars.map(() => getFallbackDetails()));
    }
}

/**
 * Singleton instance of the GeminiApiService for use throughout the application.
 */
export const geminiApiService = new GeminiApiService();