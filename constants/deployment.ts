import { DeploymentConditionId } from '../types/battle';

export interface DeploymentConditionEntry {
    id: DeploymentConditionId;
    nameKey: string;
    descriptionKey: string;
    ranges: {
      opportunity_patron: [number, number];
      rival: [number, number];
      quest: [number, number];
    }
}

export const DEPLOYMENT_CONDITIONS_TABLE: DeploymentConditionEntry[] = [
    { id: 'no_condition', nameKey: 'deployment.no_condition.name', descriptionKey: 'deployment.no_condition.desc', ranges: { opportunity_patron: [1, 40], rival: [1, 10], quest: [1, 5] } },
    { id: 'small_encounter', nameKey: 'deployment.small_encounter.name', descriptionKey: 'deployment.small_encounter.desc', ranges: { opportunity_patron: [41, 45], rival: [11, 15], quest: [6, 10] } },
    { id: 'poor_visibility', nameKey: 'deployment.poor_visibility.name', descriptionKey: 'deployment.poor_visibility.desc', ranges: { opportunity_patron: [46, 50], rival: [16, 20], quest: [11, 25] } },
    { id: 'brief_engagement', nameKey: 'deployment.brief_engagement.name', descriptionKey: 'deployment.brief_engagement.desc', ranges: { opportunity_patron: [51, 55], rival: [21, 25], quest: [26, 30] } },
    { id: 'toxic_environment', nameKey: 'deployment.toxic_environment.name', descriptionKey: 'deployment.toxic_environment.desc', ranges: { opportunity_patron: [56, 60], rival: [26, 30], quest: [31, 40] } },
    { id: 'surprise_encounter', nameKey: 'deployment.surprise_encounter.name', descriptionKey: 'deployment.surprise_encounter.desc', ranges: { opportunity_patron: [61, 65], rival: [31, 45], quest: [41, 50] } },
    { id: 'delayed', nameKey: 'deployment.delayed.name', descriptionKey: 'deployment.delayed.desc', ranges: { opportunity_patron: [66, 75], rival: [46, 50], quest: [51, 60] } },
    { id: 'slippery_ground', nameKey: 'deployment.slippery_ground.name', descriptionKey: 'deployment.slippery_ground.desc', ranges: { opportunity_patron: [76, 80], rival: [51, 60], quest: [61, 65] } },
    { id: 'bitter_struggle', nameKey: 'deployment.bitter_struggle.name', descriptionKey: 'deployment.bitter_struggle.desc', ranges: { opportunity_patron: [81, 85], rival: [61, 75], quest: [66, 80] } },
    { id: 'caught_off_guard', nameKey: 'deployment.caught_off_guard.name', descriptionKey: 'deployment.caught_off_guard.desc', ranges: { opportunity_patron: [86, 90], rival: [76, 90], quest: [81, 90] } },
    { id: 'gloomy', nameKey: 'deployment.gloomy.name', descriptionKey: 'deployment.gloomy.desc', ranges: { opportunity_patron: [91, 100], rival: [91, 100], quest: [91, 100] } },
];
