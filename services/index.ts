import { CampaignUseCases } from './application/campaignUseCases';
import { BattleUseCases } from './application/battleUseCases';
import { CampaignDomain } from './domain/campaignDomain';
import { BattleDomain } from './domain/battleDomain';
import { geminiApiService as geminiApi, GeminiApiService } from './api/geminiApiService';

// Domain Services (stateless, can be singletons)
export const campaignDomain = new CampaignDomain();
export const battleDomain = new BattleDomain();

// Re-export infrastructure singletons for consistency
export const geminiApiService = geminiApi;

// Application Services (Use Cases)
export const campaignUseCases = new CampaignUseCases(campaignDomain, geminiApiService as GeminiApiService);
export const battleUseCases = new BattleUseCases(battleDomain);
