import { Mission } from '../types';

type MissionDefinition = Omit<Mission, 'status'>;

export const MISSION_DEFINITIONS: MissionDefinition[] = [
    {
        type: 'Access',
        titleKey: 'missions.titles.Access',
        descriptionKey: 'missions.descriptions.Access',
    },
    {
        type: 'Acquire',
        titleKey: 'missions.titles.Acquire',
        descriptionKey: 'missions.descriptions.Acquire',
    },
    {
        type: 'Defend',
        titleKey: 'missions.titles.Defend',
        descriptionKey: 'missions.descriptions.Defend',
    },
    {
        type: 'Deliver',
        titleKey: 'missions.titles.Deliver',
        descriptionKey: 'missions.descriptions.Deliver',
    },
    {
        type: 'Eliminate',
        titleKey: 'missions.titles.Eliminate',
        descriptionKey: 'missions.descriptions.Eliminate',
    },
    {
        type: 'FightOff',
        titleKey: 'missions.titles.FightOff',
        descriptionKey: 'missions.descriptions.FightOff',
    },
    {
        type: 'MoveThrough',
        titleKey: 'missions.titles.MoveThrough',
        descriptionKey: 'missions.descriptions.MoveThrough',
    },
    {
        type: 'Patrol',
        titleKey: 'missions.titles.Patrol',
        descriptionKey: 'missions.descriptions.Patrol',
    },
    {
        type: 'Protect',
        titleKey: 'missions.titles.Protect',
        descriptionKey: 'missions.descriptions.Protect',
    },
    {
        type: 'Secure',
        titleKey: 'missions.titles.Secure',
        descriptionKey: 'missions.descriptions.Secure',
    },
    {
        type: 'Search',
        titleKey: 'missions.titles.Search',
        descriptionKey: 'missions.descriptions.Search',
    },
];