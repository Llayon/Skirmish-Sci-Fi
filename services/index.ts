import { CampaignUseCases } from './application/campaignUseCases';
import { BattleUseCases } from './application/battleUseCases';
import { CampaignDomain } from './domain/campaignDomain';
import { BattleDomain } from './domain/battleDomain';

// Domain Services (stateless, can be singletons)
export const campaignDomain = new CampaignDomain();
export const battleDomain = new BattleDomain();

// Application Services (Use Cases)
export const campaignUseCases = new CampaignUseCases(campaignDomain);
export const battleUseCases = new BattleUseCases(battleDomain);
