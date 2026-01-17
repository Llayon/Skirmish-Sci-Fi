import { useCallback, useMemo } from 'react';
import { useCampaignProgressStore, useBattleStore, useMultiplayerStore, useCrewStore, useShipStore } from '../stores';
import { MISSION_DEFINITIONS } from '../constants/missions';
import { CampaignDomain } from '../services/domain/campaignDomain';
import { World } from '@/types';

export const useCampaignActions = () => {
    const { initiateTravel: initiateTravelAction, purchaseCommercialPassage, updateCampaign } = useCampaignProgressStore(state => state.actions);
    const startBattle = useBattleStore(state => state.actions.startBattle);
    const startMultiplayer = useMultiplayerStore(state => state.actions.startMultiplayer);
    const campaign = useCampaignProgressStore(state => state.campaign);
    const crew = useCrewStore(state => state.crew);
    const { ship, stash } = useShipStore(state => state);

    const { startNewCampaignTurn } = useCampaignProgressStore(state => state.actions);
    
    const advanceTurn = useCallback(() => {
        startNewCampaignTurn();
    }, [startNewCampaignTurn]);

    const startMission = useCallback(() => {
        const fullCampaign = campaign ? { ...campaign, ship, stash } : null;
        if (fullCampaign?.activeMission && crew) {
            const missionOptions: any = {};
            if (fullCampaign.activeMission.hazard?.id === 'vip') {
                missionOptions.hasVip = true;
            }
             if (fullCampaign.activeMission.hazard?.id === 'veteran_opposition') {
                missionOptions.enemyCountModifier = 1;
            }
            startBattle({
                missionType: fullCampaign.activeMission.missionType,
                battleType: 'patron',
                ...missionOptions,
            });
        }
    }, [campaign, crew, startBattle, ship, stash]);

    const findOpportunity = useCallback(() => {
        const fullCampaign = campaign ? { ...campaign, ship, stash } : null;
        if (!crew || !fullCampaign) return;
        const randomIndex = Math.floor(Math.random() * MISSION_DEFINITIONS.length);
        const randomMissionType = MISSION_DEFINITIONS[randomIndex].type;
        startBattle({ missionType: randomMissionType, battleType: 'opportunity' });
    }, [crew, campaign, startBattle, ship, stash]);

    const confrontRival = useCallback(() => {
        const fullCampaign = campaign ? { ...campaign, ship, stash } : null;
        if (!crew || !fullCampaign) return;

        // The battle setup will read the rival state from the campaign.
        startBattle({ missionType: 'Eliminate', enemyCountModifier: 1, battleType: 'rival' });
        
        // After starting the battle process (which goes to a briefing screen),
        // we can clear the rival trigger state from the campaign.
        updateCampaign(c => {
            c.locatedRivalId = null; // Clear both types of triggers
            c.rivalAttackHappening = false;
            c.attackingRivalId = null;
        });
    }, [crew, campaign, startBattle, updateCampaign, ship, stash]);
    
    const playWithFriend = useCallback(() => {
        startMultiplayer();
    }, [startMultiplayer]);
    
    const initiateTravel = useCallback((isFleeing: boolean, destination?: World) => {
        initiateTravelAction(isFleeing, destination);
    }, [initiateTravelAction]);
    
    const fleeInvasion = useCallback(() => {
        initiateTravel(true);
    }, [initiateTravel]);
    
    const fuelCostDetails = useMemo(() => {
        const fullCampaign = campaign ? { ...campaign, ship, stash } : null;
        if (!ship || !fullCampaign) return { total: 0, fromCredits: 0, fromFuel: 0 };
        
        const { cost } = CampaignDomain.calculateFuelCost(ship, fullCampaign);
        const fuelAvailable = fullCampaign.fuelCredits || 0;
        
        const fromFuel = Math.min(fuelAvailable, cost);
        const fromCredits = cost - fromFuel;

        return { total: cost, fromCredits, fromFuel };
    }, [ship, campaign, stash]);

    return {
        advanceTurn,
        startMission,
        findOpportunity,
        confrontRival,
        playWithFriend,
        initiateTravel,
        fleeInvasion,
        purchaseCommercialPassage,
        fuelCostDetails,
    };
};