export interface NotableSightEntry {
    id: 'nothing' | 'documentation' | 'priority_target' | 'loot_cache' | 'shiny_bits' | 'really_shiny_bits' | 'person_of_interest' | 'peculiar_item' | 'curious_item';
    ranges: {
      opportunity: [number, number];
      patron: [number, number];
      rival: [number, number];
      quest: [number, number];
    },
    reward?: { credits?: number | string; storyPoints?: number; xp?: number; rumors?: number; lootRoll?: boolean; lootRollChance?: string };
}

export const NOTABLE_SIGHTS_TABLE: NotableSightEntry[] = [
    { id: 'nothing', ranges: { opportunity: [1, 20], patron: [1, 20], rival: [1, 40], quest: [1, 10] } },
    { id: 'documentation', ranges: { opportunity: [21, 30], patron: [21, 30], rival: [41, 50], quest: [11, 25] }, reward: { rumors: 1 } },
    { id: 'priority_target', ranges: { opportunity: [31, 40], patron: [31, 40], rival: [51, 60], quest: [26, 35] }, reward: { credits: '1d3' } },
    { id: 'loot_cache', ranges: { opportunity: [41, 50], patron: [41, 50], rival: [61, 70], quest: [36, 50] }, reward: { lootRoll: true } },
    { id: 'shiny_bits', ranges: { opportunity: [51, 60], patron: [51, 60], rival: [71, 75], quest: [51, 55] }, reward: { credits: 1 } },
    { id: 'really_shiny_bits', ranges: { opportunity: [61, 70], patron: [61, 70], rival: [76, 80], quest: [56, 65] }, reward: { credits: 2 } },
    { id: 'person_of_interest', ranges: { opportunity: [71, 80], patron: [71, 80], rival: [81, 90], quest: [66, 80] }, reward: { storyPoints: 1 } },
    { id: 'peculiar_item', ranges: { opportunity: [81, 90], patron: [81, 90], rival: [91, 95], quest: [81, 90] }, reward: { xp: 2 } },
    { id: 'curious_item', ranges: { opportunity: [91, 100], patron: [91, 100], rival: [96, 100], quest: [91, 100] }, reward: { credits: 1, lootRollChance: '5-6' } },
];