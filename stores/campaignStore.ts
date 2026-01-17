
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Campaign, Crew, Ship, SlotId, SaveSlot, SaveSlots, Battle, Mission, BattleParticipant, ShipComponentId, CharacterEvent, OnBoardItemId, World, Rival, CampaignLogEntry, Character, LootItem, CharacterWeapon, Stash } from '../types';
import { useCrewStore } from './crewStore';
import { useShipStore } from './shipStore';
import { useUiStore } from './uiStore';
import { campaignUseCases, battleUseCases } from '../services';
import { rollD6, rollD100 } from '@/services/utils/rolls';
import { getShipComponentById, getWeaponById } from '@/services/data/items';
import { uiService } from '../services/uiService';
import { generateJobOffers as generateOffersService } from '@/services/application/jobOfferGenerator';
import { CampaignDomain } from '../services/domain/campaignDomain';
import { resolveTable } from '@/services/utils/tables';
import { BATTLEFIELD_FINDS_TABLE } from '../../constants/battlefieldFinds';
import { getLootFromTradeTable, rollOnLootTable } from '@/services/lootService';
import { MILITARY_WEAPON_TABLE, GEAR_TABLE, GADGET_TABLE } from '@/constants/items';
import { TRADE_TABLE } from '@/constants/tradeTable';
import { applyRaceToCharacter, generateNewRecruit } from '@/services/characterService';

type CampaignProgressData = Omit<Campaign, 'ship' | 'stash'>;

interface CampaignProgressState {
  campaign: CampaignProgressData | null;
  isHydrated: boolean;
  saveSlots: SaveSlots;
  actions: {
    _setIsHydrated: (hydrated: boolean) => void;
    startCampaign: (crew: Crew, campaign: Campaign) => void;
    resetGame: (goToMainMenu?: boolean) => void;
    loadGame: (slotId: SlotId) => void;
    saveGame: (slotId: SlotId) => void;
    deleteSlot: (slotId: SlotId) => void;
    autosave: () => void;
    updateCampaign: (recipe: (campaign: CampaignProgressData) => void) => void;
    startNewCampaignTurn: () => void;
    applyForTraining: () => void;
    finalizeUpkeep: (payments: { debt: number; repairs: number; medicalBayTarget?: string | null; }) => void;
    skipUpkeep: () => void;
    setBattleFromLobby: (battle: Battle, role: 'host' | 'guest') => void;
    startMultiplayerBattle: (hostCrew: Crew, guestCrew: Crew) => void;
    resolveSingleTask: (characterId: string) => void;
    finalizeTasks: () => void;
    acceptJob: (offerId: string) => void;
    resolveRumors: () => void;
    useOnBoardItem: (itemId: any, payload: { characterId?: string }) => void;
    purchaseShipComponent: (componentId: ShipComponentId) => void;
    resolvePostBattleActivity: (activityType: string, battle: Battle) => any;
    resolveGalacticWarProgress: (planetName: string) => any;
    purchaseItemRoll: (table: 'military' | 'gear' | 'gadget') => any;
    purchaseBasicWeapon: (weaponId: string) => void;
    sellItem: (sourceId: string, itemId: string, itemType: 'weapon') => void;
    resolveCampaignEvent: () => any;
    resolveCharacterEvent: (characterId: string) => any;
    initiateTravel: (isFleeing: boolean, destination?: World) => void;
    resolveFleeItemLoss: (itemsToDiscard: { charId: string | 'stash'; instanceId: string; itemType: string }[]) => void;
    payBureaucracyBribe: () => void;
    declineBureaucracyBribe: () => void;
    addCredits: (amount: number) => void;
    spendCredits: (amount: number) => void;
    gainStoryPoints: (amount: number) => void;
    resolveTravelEvent: (payload?: any) => void;
    resolveTradeChoice: (payload: any) => void;
    resolveRecruitChoice: (recruit: Character) => void;
    updateFromBattle: (participants: BattleParticipant[], mission: Mission, round: number) => void;
    applyOutOfSequenceBattleRewardsAndContinue: (battle: Battle) => void;
    spendStoryPointForCredits: () => void;
    spendStoryPointForXp: (characterId: string) => void;
    purchaseLicense: () => void;
    attemptForgery: (characterId: string) => void;
    useBusyMarkets: () => void;
    purchaseExtraTradeRoll: () => void;
    resolvePrecursorEventChoice: (characterId: string, chosenEvent: CharacterEvent) => void;
    finalizeGearChoice: (gearToKeep: Record<string, string[]>) => void;
    completeFleeSequence: () => void;
    clearCharacterEventResult: () => void;
    sellItemsForFuelAndFlee: (itemsToSell: { charId: string | 'stash'; itemId: string; itemType: string; instanceId: string }[]) => void;
    purchaseCommercialPassage: () => void;
    searchForNewShip: () => void;
    purchaseFoundShip: (useFinancing: boolean) => void;
    declineFoundShip: () => void;
    attemptInterdictionLicense: () => void;
    resolveTradeGoodsSale: (sellNow: boolean) => void;
    resolveItemChoice: (itemId: 'duplicator' | 'fixer', payload: { item: any }) => void;
  };
}

const initialState: Omit<CampaignProgressState, 'actions'> = {
  campaign: null,
  isHydrated: false,
  saveSlots: {},
};

const getFullCampaign = (get: () => CampaignProgressState): Campaign | null => {
    const campaignProgress = get().campaign;
    if (!campaignProgress) return null;
    const { ship, stash } = useShipStore.getState();
    return { ...campaignProgress, ship, stash };
};

export const useCampaignProgressStore = create<CampaignProgressState>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      actions: {
        _setIsHydrated: (hydrated) => set({ isHydrated: hydrated }),
        startCampaign: (newCrew, newCampaign) => {
          newCampaign.currentWorld = campaignUseCases.generateInitialWorld();
          newCampaign.visitedWorlds = [newCampaign.currentWorld];
          const { ship, stash, ...campaignProgress } = newCampaign;
          
          useCrewStore.getState().actions.setCrew(newCrew);
          useShipStore.getState().actions.setShipAndStash(ship, stash);
          set({ campaign: campaignProgress });
          
          get().actions.autosave();
          useUiStore.getState().actions.setGameMode('dashboard');
        },
        resetGame: (goToMainMenu = false) => {
          useCrewStore.getState().actions.setCrew(null);
          useShipStore.getState().actions.setShipAndStash(null, null);
          set({ campaign: null });
          if (!goToMainMenu) {
            set({ saveSlots: {} });
          }
          import('./battleStore').then(store => store.useBattleStore.getState().actions.resetBattle());
          import('./multiplayerStore').then(store => store.useMultiplayerStore.getState().actions.reset());
          useUiStore.getState().actions.setGameMode(goToMainMenu ? 'main_menu' : 'crew_creation');
        },
        loadGame: (slotId) => {
          const slot = get().saveSlots[slotId];
          if (slot) {
            const { ship, stash, ...campaignProgress } = slot.campaign;
            useCrewStore.getState().actions.setCrew(slot.crew);
            useShipStore.getState().actions.setShipAndStash(ship, stash);
            set({ campaign: campaignProgress });
            useUiStore.getState().actions.setGameMode('dashboard');
          }
        },
        saveGame: (slotId) => {
          const campaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;

          if (crew && campaign) {
            const newSave: SaveSlot = {
              crew,
              campaign,
              metadata: {
                crewName: crew.name,
                turn: campaign.turn,
                savedAt: new Date().toISOString(),
              },
            };
            set(state => {
              state.saveSlots[slotId] = newSave;
            });
          }
        },
        deleteSlot: (slotId) => set(state => { delete state.saveSlots[slotId]; }),
        autosave: () => get().actions.saveGame('autosave'),
        updateCampaign: (recipe) => set(state => { if (state.campaign) { recipe(state.campaign); } }),
        startNewCampaignTurn: () => {
            get().actions.updateCampaign(c => {
                const fledFromInvasion = c.fledFromInvasionThisTurn;
                c.fledFromInvasionThisTurn = false;

                if (c.pendingTravelCompletion) {
                    let newWorld: World;
                    if (c.pendingTravelDestination) {
                        newWorld = c.pendingTravelDestination;
                    } else {
                        newWorld = CampaignDomain.generateNewWorld(c.isRedZone);
                        if (!c.visitedWorlds) c.visitedWorlds = [];
                        if (!c.visitedWorlds.find(w => w.name === newWorld.name)) {
                            c.visitedWorlds.push(newWorld);
                        }
                    }
                    c.currentWorld = newWorld;
                    
                    if (fledFromInvasion) {
                        c.patrons = [];
                        c.rivals = c.rivals.filter(r => r.status === 'defeated');
                    } else {
                         c.patrons = c.patrons.filter(p => p.persistent);
                         c.rivals = c.rivals.filter(r => {
                            if (r.status === 'defeated') return true;
                            const roll = rollD6();
                            return roll >= 5;
                        });
                    }

                    if (c.hasTradeGoods) {
                      c.pendingTradeGoodsSale = true;
                    }
                    c.pendingTravelCompletion = null;
                    c.pendingTravelDestination = undefined;
                }
                if (c.currentWorld?.traits.some(t => t.id === 'fuel_shortage')) {
                    const extraCost = Math.ceil(rollD6() / 2);
                    c.currentWorld.fuelShortageCost = extraCost;
                    c.log.push({
                        key: 'log.campaign.world.fuelShortageUpdate',
                        turn: c.turn + 1,
                        params: { cost: extraCost }
                    });
                } else if (c.currentWorld) {
                    delete c.currentWorld.fuelShortageCost;
                }
                c.turn++;
                c.campaignPhase = 'upkeep';
                c.tasksFinalized = false;
                c.taskResultsLog = [];
                const { ship, stash } = useShipStore.getState();
                const fullCampaign = { ...c, ship, stash };
                c.jobOffers = fullCampaign ? generateOffersService(fullCampaign) : [];
                
                c.spForCreditsUsedThisTurn = false;
                c.spForXpUsedThisTurn = false;
                c.spForActionUsedThisTurn = false;
                c.componentPurchasedThisTurn = false;
                c.busyMarketsUsedThisTurn = false;
                c.redJobLicenseOwned = false;
                c.trainingApplicationStatus = 'none';
                c.decoyBonusThisTurn = 0;
                c.rivalAttackHappening = false;
                c.hasInsiderInformation = false;
            });
            const campaign = get().campaign;
            if (campaign && (campaign.turn - 1) % 3 === 0 && campaign.turn > 1) {
                get().actions.gainStoryPoints(1);
            }
            get().actions.autosave();
        },
        applyForTraining: () => {
          get().actions.updateCampaign(c => {
            if (c.credits >= 1 && (!c.trainingApplicationStatus || c.trainingApplicationStatus === 'none')) {
              c.credits -= 1;
              c.trainingApplicationStatus = 'pending';
              const crew = useCrewStore.getState().crew;
              const hasRestrictedEducation = c.currentWorld?.traits.some(t => t.id === 'restricted_education');
              const broker = crew?.members.find(m => !m.isUnavailableForTasks && m.advancedTraining === 'broker');
              const savvyBonus = broker?.stats.savvy || 0;
              const brokerBonus = broker ? 1 : 0;
              const bonus = savvyBonus + brokerBonus;
              const roll = rollD6() + bonus;
              const target = hasRestrictedEducation ? 6 : 4;
              
              if (roll >= target) {
                c.trainingApplicationStatus = 'approved';
                c.log.push({ key: 'log.campaign.training.applicationSuccess', turn: c.turn, params: { roll } });
              } else {
                c.trainingApplicationStatus = 'denied';
                c.log.push({ key: 'log.campaign.training.applicationFailure', turn: c.turn, params: { roll } });
              }
            }
          });
        },
        finalizeUpkeep: (payments: { debt: number; repairs: number; medicalBayTarget?: string | null; }) => {
            const campaign = getFullCampaign(get);
            const crew = useCrewStore.getState().crew;
            if (!campaign || !crew) return;
            const { updatedCampaign, updatedCrew } = campaignUseCases.finalizeUpkeep(campaign, crew, payments);
            const { ship, stash, ...campaignProgress } = updatedCampaign;
            useCrewStore.getState().actions.setCrew(updatedCrew);
            useShipStore.getState().actions.setShipAndStash(ship, stash);
            set({ campaign: campaignProgress });
            useUiStore.getState().actions.setGameMode('dashboard');
            get().actions.autosave();
        },
        skipUpkeep: () => {
          get().actions.updateCampaign(c => {
            if (c.campaignPhase === 'upkeep' && c.canSkipUpkeep) {
              c.campaignPhase = 'actions';
              c.tasksFinalized = false;
              c.taskResultsLog = [];
              c.log.push({ key: 'log.campaign.upkeep.skipped', turn: c.turn });
            }
          });
          get().actions.autosave();
          useUiStore.getState().actions.setGameMode('dashboard');
        },
        setBattleFromLobby: (newBattle, role) => {
          import('./battleStore').then(store => store.useBattleStore.getState().actions.setNewBattle(newBattle));
          useUiStore.getState().actions.setGameMode('battle');
        },
        startMultiplayerBattle: async (hostCrew, guestCrew) => {
            const newBattle = await battleUseCases.startMultiplayerBattle(hostCrew, guestCrew);
            const { multiplayerService } = await import('../services/multiplayerService');
            multiplayerService.send({ type: 'START_BATTLE', payload: newBattle });
            get().actions.setBattleFromLobby(newBattle, 'host');
        },
        resolveSingleTask: (characterId: string) => {
          const fullCampaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;
          if (!fullCampaign || !crew) return;
      
          const character = crew.members.find(c => c.id === characterId);
          if (!character) return;
      
          // Handle recruit task specifically based on user feedback
          if (character.task === 'recruit') {
            const alreadyResolved = get().campaign!.taskResultsLog.some(
              (l: CampaignLogEntry) => l.key.includes('recruit.success') || l.key.includes('recruit.fail')
            );
            if (alreadyResolved) {
              get().actions.updateCampaign(c => {
                c.taskResultsLog.push({ key: 'log.campaign.task.recruit.assist', turn: c.turn, params: { name: character.name } });
              });
              useCrewStore.getState().actions.updateCrew(c => {
                const char = c.members.find(m => m.id === characterId);
                if (char) char.taskCompletedThisTurn = true;
              });
              return;
            }
      
            const recruiters = crew.members.filter(m => m.task === 'recruit' && !m.taskCompletedThisTurn);
            const roll = rollD6();
            const bonus = recruiters.length; // Per rulebook
            const total = roll + bonus;
      
            if (total >= 6) { // Success
              const isAdventurous = fullCampaign.currentWorld?.traits.some(t => t.id === 'adventurous_population');
              if (isAdventurous) {
                const recruit1 = generateNewRecruit() as Character;
                const recruit2 = generateNewRecruit() as Character;
                get().actions.updateCampaign(c => {
                  c.pendingRecruitChoice = { recruiterId: characterId, recruits: [recruit1, recruit2] };
                  c.taskResultsLog.push({ key: 'log.campaign.task.recruit.adventurous_choice', turn: c.turn, params: { name: character.name, traitId: 'adventurous_population' } });
                });
              } else {
                const newRecruit = generateNewRecruit() as Character;
                useCrewStore.getState().actions.addRecruit(newRecruit);
                get().actions.updateCampaign(c => {
                  c.taskResultsLog.push({ key: 'log.campaign.task.recruit.success_roll', turn: c.turn, params: { name: character.name, recruitName: newRecruit.name, roll, bonus, total } });
                });
              }
            } else { // Failure
              get().actions.updateCampaign(c => {
                c.taskResultsLog.push({ key: 'log.campaign.task.recruit.fail', turn: c.turn, params: { name: character.name, roll, bonus, total } });
              });
            }
            // Mark all recruiters as done for this turn
            useCrewStore.getState().actions.updateCrew(c => {
              recruiters.forEach(r => {
                const char = c.members.find(m => m.id === r.id);
                if (char) char.taskCompletedThisTurn = true;
              });
            });
          } else {
            // Original logic for other tasks
            const { updatedCampaign, updatedCrew, log } = campaignUseCases.resolveSingleTask(fullCampaign, crew, characterId);
            useCrewStore.getState().actions.setCrew(updatedCrew);
            set(state => {
              if (!state.campaign) return;
              const { ship, stash, ...campaignProgress } = updatedCampaign;
              state.campaign = campaignProgress;
              if (log) {
                state.campaign.taskResultsLog.push(log);
              }
            });
          }
        },
        finalizeTasks: () => set(state => { if (state.campaign) state.campaign.tasksFinalized = true; }),
        acceptJob: (offerId: string) => {
            const campaign = getFullCampaign(get);
            if (!campaign) return;
            const { updatedCampaign } = campaignUseCases.acceptJob(campaign, offerId);
            const { ship, stash, ...campaignProgress } = updatedCampaign;
            set({ campaign: campaignProgress });
        },
        resolveRumors: () => {
          set(state => {
            if (state.campaign) {
              const roll = rollD6();
              if (roll <= state.campaign.questRumors.length) {
                state.campaign.questRumors = [];
                state.campaign.activeQuest = {
                  id: 'star_eater',
                  titleKey: 'quests.star_eater.title',
                  descriptionKey: 'quests.star_eater.description',
                  status: 'in_progress',
                  rumors: 0,
                };
                state.campaign.log.push({ key: 'log.campaign.quest.found', turn: state.campaign.turn });
                
                if (state.campaign.hasLocalMaps) {
                    state.campaign.questRumors.push({
                        id: `rumor_map_${Date.now()}`,
                        description: 'A rumor from local maps',
                        type: 'generic'
                    });
                    state.campaign.hasLocalMaps = false;
                    state.campaign.log.push({ key: 'log.campaign.task.trade.local_maps_bonus', turn: state.campaign.turn });
                }
              } else {
                state.campaign.log.push({ key: 'log.campaign.quest.fail', turn: state.campaign.turn, params: { roll } });
              }
            }
          });
        },
        useOnBoardItem: (itemId, payload) => {
          const fullCampaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;
          if (!fullCampaign || !crew) return;
          const { updatedCampaign, updatedCrew } = campaignUseCases.useOnBoardItem(fullCampaign, crew, itemId, payload);
          const { ship: newShip, stash: newStash, ...newCampaignProgress } = updatedCampaign;
          useCrewStore.getState().actions.setCrew(updatedCrew);
          useShipStore.getState().actions.setShipAndStash(newShip, newStash);
          set({ campaign: newCampaignProgress });
        },
        purchaseShipComponent: (componentId) => {
            const { ship } = useShipStore.getState();
            const { campaign } = get();
            if (!campaign || !ship) return;
            const componentData = getShipComponentById(componentId);
            if (!componentData) return;
            let finalCost = componentData.cost;
            const hasStandardIssue = ship.traits.includes('standard_issue');
            const hasShipyards = campaign.currentWorld?.traits.some(t => t.id === 'shipyards');
            if (hasStandardIssue) finalCost -= 1;
            if (hasShipyards) finalCost -= 2;
            finalCost = Math.max(0, finalCost);
            if (campaign.componentPurchasedThisTurn || campaign.credits < finalCost) return;
            get().actions.spendCredits(finalCost);
            useShipStore.getState().actions.installComponent(componentId);
            set(state => {
                if(state.campaign) state.campaign.componentPurchasedThisTurn = true;
            });
        },
        resolvePostBattleActivity: (activityType: string, battle: Battle) => {
            const fullCampaign = getFullCampaign(get);
            if (!fullCampaign) return { key: 'log.error.generic', turn: get().campaign?.turn ?? 1 };
            let primaryLog: CampaignLogEntry = { key: `postBattle.activities.results.${activityType}`, turn: fullCampaign.turn };

            switch (activityType) {
                case 'payment': {
                    if (battle.battleType === 'invasion') {
                        primaryLog = { key: 'log.campaign.payment.invasion', turn: fullCampaign.turn };
                        break;
                    }
                    
                    const hasBoomingEconomy = fullCampaign.currentWorld?.traits.some(t => t.id === 'booming_economy');
                    const wonMission = battle.mission.status === 'success';
                    const isRivalBattle = battle.battleType === 'rival';
                    const isQuestFinale = battle.isQuestBattle && wonMission;
                    
                    const rollWithEconomy = () => {
                        let roll = rollD6();
                        if (hasBoomingEconomy) {
                            while (roll === 1) {
                                roll = rollD6();
                            }
                        }
                        return roll;
                    };

                    let amount = 0;

                    if (isQuestFinale) {
                        const roll1 = rollWithEconomy();
                        const roll2 = rollWithEconomy();
                        amount = Math.max(roll1, roll2) + 1;
                    } else {
                        let roll = rollWithEconomy();
                        if (wonMission && !isRivalBattle) {
                            if (roll <= 2) {
                                roll = 3;
                            }
                        }
                        amount = roll;
                    }

                    get().actions.addCredits(amount);
                    primaryLog.params = { amount };
                    break;
                }
                case 'invasion': {
                    const { wasInvaded, logs } = CampaignDomain.resolveInvasionCheck(fullCampaign, battle);
                    get().actions.updateCampaign(c => {
                        c.log.push(...logs);
                        c.isWorldInvaded = wasInvaded;
                        c.invasionCheckModifier = 0;
                        if (wasInvaded && !c.galacticWar) {
                            c.galacticWar = { trackedPlanets: [] };
                        }
                        if (wasInvaded && c.currentWorld && !c.galacticWar?.trackedPlanets.find(p => p.name === c.currentWorld!.name)) {
                            c.galacticWar!.trackedPlanets.push({
                                name: c.currentWorld.name,
                                status: 'contested',
                                rollModifier: 0,
                            });
                            c.log.push({ key: 'log.campaign.war.now_contested', turn: c.turn, params: { planetName: c.currentWorld.name } });
                        }
                    });
                    const finalCampaignState = get().campaign!;
                    primaryLog = finalCampaignState.isWorldInvaded
                        ? { key: 'postBattle.activities.results.invasionHappened', turn: finalCampaignState.turn }
                        : { key: 'postBattle.activities.results.invasionAverted', turn: finalCampaignState.turn };
                    break;
                }
                default: {
                     const { updatedCampaign, log } = campaignUseCases.resolvePostBattleActivity(activityType, battle, fullCampaign as Campaign);
                     const { ship, stash, ...newCampaignProgress } = updatedCampaign;
                     set({ campaign: newCampaignProgress });
                     useShipStore.getState().actions.setShipAndStash(ship, stash);
                     return log;
                }
            }
            return primaryLog;
        },
        resolveGalacticWarProgress: (planetName: string) => {
          const campaign = getFullCampaign(get);
          if (!campaign) return [];
          const { updatedCampaign, logs } = campaignUseCases.resolveGalacticWarProgress(campaign, planetName);
          const { ship, stash, ...newCampaignProgress } = updatedCampaign;
          set({ campaign: newCampaignProgress });
          return logs;
        },
        purchaseItemRoll: (table) => {
            const campaign = getFullCampaign(get);
            if (!campaign) return null;
            const hasWeaponLicensing = campaign.currentWorld?.traits.some(t => t.id === 'weapon_licensing');
            const cost = 3 + (hasWeaponLicensing ? 1 : 0);
            if (campaign.credits < cost) {
                uiService.showToast('Not enough credits', 'warning');
                return null;
            }
            get().actions.spendCredits(cost);
            let tableToRollOn;
            if (table === 'military') tableToRollOn = MILITARY_WEAPON_TABLE;
            else if (table === 'gear') tableToRollOn = GEAR_TABLE;
            else tableToRollOn = GADGET_TABLE;
            const rollResult = (resolveTable(tableToRollOn, rollD100()) as any).value;
            const item = { type: rollResult.type as any, id: rollResult.id, amount: 1 };
            useShipStore.getState().actions.addItemToStash({ ...item, id: item.id });
            return item;
        },
        purchaseBasicWeapon: (weaponId: string) => {
            const campaign = getFullCampaign(get);
            if (!campaign) return;
            const hasWeaponLicensing = campaign.currentWorld?.traits.some(t => t.id === 'weapon_licensing');
            const cost = 1 + (hasWeaponLicensing ? 1 : 0);
            if (campaign.credits < cost) {
                uiService.showToast('Not enough credits', 'warning');
                return;
            }
            get().actions.spendCredits(cost);
            useShipStore.getState().actions.addItemToStash({ id: weaponId, weaponId, type: 'weapon' });
        },
        sellItem: (sourceId, itemId, itemType) => {
          const campaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;
          if (!campaign || !crew) return;
          const { updatedCampaign, updatedCrew } = campaignUseCases.sellItem(campaign, crew, sourceId, itemId, itemType);
          useCrewStore.getState().actions.setCrew(updatedCrew);
          const { ship, stash, ...newCampaignProgress } = updatedCampaign;
          set({ campaign: newCampaignProgress });
        },
        resolveCampaignEvent: () => {
          const campaign = getFullCampaign(get);
          if (!campaign) return null;
          const { updatedCampaign, result } = campaignUseCases.resolveCampaignEvent(campaign);
          const { ship, stash, ...newCampaignProgress } = updatedCampaign;
          set({ campaign: newCampaignProgress });
          return result;
        },
        resolveCharacterEvent: (characterId: string) => {
            const campaign = getFullCampaign(get);
            const crew = useCrewStore.getState().crew;
            if (!campaign || !crew) return null;
            const { updatedCampaign, updatedCrew, result } = campaignUseCases.resolveCharacterEvent(campaign, crew, characterId);
            useCrewStore.getState().actions.setCrew(updatedCrew);
            const { ship, stash, ...newCampaignProgress } = updatedCampaign;
            set(state => {
                state.campaign = newCampaignProgress;
                state.campaign!.characterEventResult = result;
            });
            return result;
        },
        initiateTravel: (isFleeing, destination) => {
            const campaign = get().campaign;
            if (!campaign) return;
            const { ship, stash } = useShipStore.getState();
            const crew = useCrewStore.getState().crew;

            if (isFleeing && !ship) {
                const itemsToLose = rollD6();
                get().actions.updateCampaign(c => {
                    c.credits = 0;
                    c.pendingFleeItemLoss = { count: itemsToLose };
                });
                return;
            }

            const fullCampaign = { ...campaign, ship, stash };
            if (!isFleeing && campaign.currentWorld?.traits.some(t => t.id === 'bureaucratic_mess')) {
                const roll = rollD6() + rollD6();
                if (roll <= 4) {
                    get().actions.updateCampaign(c => {
                        c.pendingTravelDestination = destination;
                        c.pendingBureaucracyBribe = roll;
                        c.log.push({ key: 'log.campaign.travel.bureaucracy_delay', turn: c.turn, params: { worldName: c.currentWorld!.name, bribe: roll } });
                    });
                    return;
                }
            }
            const hasFuelCell = stash?.onBoardItems.includes('military_fuel_cell');
            const { cost } = CampaignDomain.calculateFuelCost(ship, fullCampaign as Campaign);
            const finalCost = hasFuelCell ? 0 : cost;
            const fuelAvailable = fullCampaign!.fuelCredits || 0;
            const fromFuel = Math.min(fuelAvailable, finalCost);
            const fromCredits = finalCost - fromFuel;
            if (fullCampaign.credits < fromCredits) {
                if (isFleeing) {
                    useUiStore.getState().actions.setGameMode('dashboard'); 
                    return; 
                }
                uiService.showToast("Not enough credits for fuel!", "error");
                return;
            }
            if (hasFuelCell) {
                useShipStore.getState().actions.updateStash(s => {
                    const index = s.onBoardItems.indexOf('military_fuel_cell');
                    if (index > -1) s.onBoardItems.splice(index, 1);
                });
            }
            const { updatedCampaign, updatedCrew, wasShipDestroyed } = campaignUseCases.initiateTravel(fullCampaign, crew!, isFleeing, destination);
            const { ship: newShip, stash: newStash, ...campaignProgress } = updatedCampaign;
            
            useCrewStore.getState().actions.setCrew(updatedCrew);
            useShipStore.getState().actions.setShipAndStash(newShip, newStash);
            set(state => {
              state.campaign = campaignProgress;
              if (isFleeing && state.campaign && state.campaign.activeTravelEvent) {
                  state.campaign.activeTravelEvent = null;
              }
            });
            if (wasShipDestroyed) return;
            get().actions.autosave();
        },
        resolveFleeItemLoss: (itemsToDiscard) => {
            useCrewStore.getState().actions.removeItems(itemsToDiscard.filter(i => i.charId !== 'stash'));
            useShipStore.getState().actions.removeItemsFromStash(itemsToDiscard.filter(i => i.charId === 'stash').map(i => ({ instanceId: i.instanceId, type: i.itemType })));
            get().actions.updateCampaign(c => {
                c.pendingFleeItemLoss = undefined;
                c.pendingFleeCharacterEvent = true;
            });
        },
        payBureaucracyBribe: () => {
            const bribe = get().campaign?.pendingBureaucracyBribe;
            if (!bribe) return;
            let canPay = false;
            get().actions.updateCampaign(c => {
                if (c.credits >= bribe) {
                    c.credits -= bribe;
                    c.log.push({ key: 'log.campaign.travel.bureaucracy_paid', turn: c.turn, params: { worldName: c.currentWorld!.name, bribe } });
                    canPay = true;
                }
            });
            if (canPay) {
                const destination = get().campaign?.pendingTravelDestination;
                get().actions.initiateTravel(false, destination);
            }
        },
        declineBureaucracyBribe: () => {
            get().actions.updateCampaign(c => {
                const bribe = c.pendingBureaucracyBribe;
                c.log.push({ key: 'log.campaign.travel.bureaucracy_stay', turn: c.turn, params: { worldName: c.currentWorld!.name, bribe } });
                c.pendingBureaucracyBribe = null;
                c.pendingTravelDestination = undefined;
            });
        },
        addCredits: (amount) => set(state => { if (state.campaign) state.campaign.credits += amount; }),
        spendCredits: (amount) => set(state => { if (state.campaign) state.campaign.credits -= amount; }),
        gainStoryPoints: (amount) => {
            const crew = useCrewStore.getState().crew;
            const manipulators = crew?.members.filter(m => (m as any).specialAbilities?.includes('manipulator_rules')).length || 0;
            let bonusPoints = 0;
            for (let i = 0; i < manipulators; i++) {
                if (rollD6() === 6) {
                    bonusPoints++;
                }
            }
            const totalGain = amount + bonusPoints;
            set(state => {
                if (state.campaign) {
                    state.campaign.storyPoints += totalGain;
                    if (totalGain > 0) {
                        state.campaign.log.push({ key: 'log.campaign.sp.storyPointGained', params: { amount: totalGain }, turn: state.campaign.turn });
                    }
                }
            });
        },
        resolveTravelEvent: (payload?: any) => {
          const fullCampaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;
          if (!fullCampaign || !crew || !fullCampaign.activeTravelEvent) return;
          const { updatedCampaign, updatedCrew, battleOptions, logs, rerolledEvent } = campaignUseCases.resolveTravelEvent(fullCampaign, crew, payload);
          const { ship: newShip, stash: newStash, ...newCampaignProgress } = updatedCampaign;
          useCrewStore.getState().actions.setCrew(updatedCrew);
          useShipStore.getState().actions.setShipAndStash(newShip, newStash);
          set(state => { 
            state.campaign = newCampaignProgress;
            if (state.campaign) {
              state.campaign.log.push(...logs);
              if (!rerolledEvent) {
                  state.campaign.activeTravelEvent = null;
              }
            }
          });
          if (battleOptions) {
            import('./battleStore').then(store => store.useBattleStore.getState().actions.startBattle(battleOptions));
          }
          if (!newCampaignProgress.pendingGearChoiceAfterShipDestruction && !battleOptions) {
            get().actions.autosave();
          }
        },
        resolveTradeChoice: (payload: any) => {
            set(state => {
                const campaign = state.campaign;
                const crew = useCrewStore.getState().crew;
                if (!campaign || !crew) return;
                const { traderId, roll, choice, ...restPayload } = payload;
                const trader = crew.members.find(c => c.id === traderId);
                const tradeEntry = resolveTable(TRADE_TABLE, roll).value;
                if (!trader || !tradeEntry) return;
                let log: CampaignLogEntry | null = null;
                let shouldCompleteTask = true;
                switch (tradeEntry.id) {
                    case 'contraband':
                        if (choice === 'accept') {
                            const creditRoll = rollD6();
                            campaign.credits += creditRoll;
                            log = { key: 'dashboard.tradeResults.contraband_success', turn: campaign.turn, params: { name: trader.name, credits: creditRoll } };
                            campaign.taskResultsLog.push(log);
                            if (creditRoll >= 4) {
                                const newRival: Rival = { id: `rival_contraband_${Date.now()}`, name: "The Syndicate", status: 'active' };
                                campaign.rivals.push(newRival);
                                campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.contraband_trouble', turn: campaign.turn });
                            }
                        } else {
                            log = { key: 'dashboard.tradeResults.contraband_decline', turn: campaign.turn, params: { name: trader.name } };
                            campaign.taskResultsLog.push(log);
                        }
                        break;
                    case 'unload_stuff':
                        if (choice === 'sell') {
                            const { weaponInstanceId, characterId } = payload;
                            campaign.credits += 2;
                            if (characterId === 'stash') {
                                useShipStore.getState().actions.updateStash(s => {
                                    s.weapons = s.weapons.filter(w => w.instanceId !== weaponInstanceId);
                                });
                            } else {
                                useCrewStore.getState().actions.updateCrew(c => {
                                    const char = c.members.find(m => m.id === characterId);
                                    if (char) {
                                        char.weapons = char.weapons.filter(w => w.instanceId !== weaponInstanceId);
                                    }
                                });
                            }
                            campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.unload_stuff_sold', turn: campaign.turn, params: { name: trader.name } });
                            shouldCompleteTask = false;
                        } else { // done
                             campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.unload_stuff_done', turn: campaign.turn, params: { name: trader.name } });
                        }
                        break;
                    case 'rare_sale':
                        if (choice === 'buy') {
                            campaign.credits -= 3;
                            const lootResult = rollOnLootTable();
                            const equipOrStashItem = (char: Character, item: LootItem, crew: Crew, stash: Stash | null, logs: CampaignLogEntry[]) => {
                                let equipped = false;
                                switch (item.type) {
                                    case 'weapon': if (char.weapons.length < 3) { char.weapons.push({ instanceId: `loot_${item.id}_${Date.now()}`, weaponId: item.id }); equipped = true; } break;
                                    case 'armor': if (!char.armor) { char.armor = item.id; equipped = true; } break;
                                    case 'screen': if (!char.screen) { char.screen = item.id; equipped = true; } break;
                                    case 'consumable': if (char.consumables.length < 3) { char.consumables.push(item.id); equipped = true; } break;
                                }
                                if (equipped) {
                                    logs.push({ key: 'dashboard.tradeResults.equip_success', turn: campaign.turn, params: { name: char.name, item: item.id } });
                                } else if (stash) {
                                    if(item.type === 'weapon') stash.weapons.push({ instanceId: `loot_${item.id}_${Date.now()}`, weaponId: item.id });
                                    else (stash as any)[`${item.type}s`].push(item.id);
                                    logs.push({ key: 'dashboard.tradeResults.stash_success', turn: campaign.turn, params: { item: item.id } });
                                }
                            };
                            lootResult.items.forEach(item => {
                                const hasWeaponLicensing = campaign.currentWorld?.traits.some(t => t.id === 'weapon_licensing');
                                if (item.type === 'weapon' && hasWeaponLicensing) {
                                    if (campaign.credits >= 1) {
                                        campaign.credits -= 1;
                                        campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.weapon_license_fee', turn: campaign.turn });
                                    } else {
                                        campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.weapon_license_fail', turn: campaign.turn });
                                        return;
                                    }
                                }
                                equipOrStashItem(trader, item, crew, useShipStore.getState().stash, campaign.taskResultsLog);
                            });
                            campaign.credits += lootResult.credits;
                            for (let i = 0; i < lootResult.rumors; i++) campaign.questRumors.push({ id: `rumor_${Date.now()}_${i}`, description: 'A new lead', type: 'generic' });
                            campaign.storyPoints += lootResult.storyPoints;
                        } else {
                             campaign.taskResultsLog.push({ key: 'dashboard.tradeResults.buy_pass', turn: campaign.turn, params: { name: trader.name } });
                        }
                        break;
                    default:
                        const { ship, stash } = useShipStore.getState();
                        const fullCampaign = { ...state.campaign, ship, stash };

                        const { updatedCampaign, updatedCrew: newCrew, log: resultLog } = campaignUseCases.resolveTradeChoice(fullCampaign, crew, payload);
                        const { ship: newShip, stash: newStash, ...newCampaignProgress } = updatedCampaign;
                        useCrewStore.getState().actions.setCrew(newCrew);
                        useShipStore.getState().actions.setShipAndStash(newShip, newStash);
                        state.campaign = newCampaignProgress;
                        state.campaign.taskResultsLog.push(resultLog);
                        const updatedTrader = useCrewStore.getState().crew!.members.find(c => c.id === traderId);
                        if (updatedTrader) updatedTrader.taskCompletedThisTurn = true;
                        state.campaign.pendingTradeResult = null;
                        return;
                }
                if (shouldCompleteTask) {
                    useCrewStore.getState().actions.updateCrew(c => {
                        const t = c.members.find(m => m.id === traderId);
                        if (t) t.taskCompletedThisTurn = true;
                    });
                    state.campaign.pendingTradeResult = null;
                }
            });
        },
        resolveRecruitChoice: (recruit) => {
            const recruiterId = get().campaign?.pendingRecruitChoice?.recruiterId;
            if (!recruiterId) return;
            let recruiterName = 'Recruiter';
            useCrewStore.getState().actions.addRecruit(recruit);
            useCrewStore.getState().actions.updateCrew(crew => {
                const recruiter = crew.members.find(m => m.id === recruiterId);
                if (recruiter) {
                    recruiter.taskCompletedThisTurn = true;
                    recruiterName = recruiter.name;
                }
            });
            get().actions.updateCampaign(c => {
                c.taskResultsLog.push({
                    key: 'log.campaign.task.recruit.success_adventurous',
                    turn: c.turn,
                    params: { name: recruiterName, recruitName: recruit.name }
                });
                c.pendingRecruitChoice = undefined;
            });
        },
        updateFromBattle: (participants, mission, round) => {
            set(state => {
                if (state.campaign) {
                    state.campaign.log.push({ key: 'log.mission.completed', params: { mission: `missions.titles.${mission.type}`, outcome: mission.status }, turn: state.campaign.turn });
                    if (mission.status === 'success') {
                        state.campaign.credits += 1;
                        if (mission.type === 'Protect' && round <= 4) {
                            state.campaign.credits += 2;
                        }
                    }
                }
            });
        },
        applyOutOfSequenceBattleRewardsAndContinue: (battle: Battle) => {
            useCrewStore.getState().actions.updateFromBattle(battle);
            set(state => {
                if (state.campaign) {
                    state.campaign.log.push({ key: 'log.mission.completed', params: { mission: `missions.titles.${battle.mission.type}`, outcome: battle.mission.status }, turn: state.campaign.turn });
                    if (battle.mission.status === 'success') {
                        state.campaign.credits += 1;
                        if (battle.sourceTravelEventId === 'raided') {
                            const fullCampaign = { ...state.campaign, ship: useShipStore.getState().ship, stash: useShipStore.getState().stash };
                            const logEntry = get().actions.resolvePostBattleActivity('loot', battle);
                            if (logEntry && 'key' in logEntry) {
                                state.campaign.log.push(logEntry as CampaignLogEntry);
                            }
                        }
                    } else if (battle.mission.status === 'failure' && battle.sourceTravelEventId === 'raided') {
                        state.campaign.credits = 0;
                        state.campaign.log.push({ key: 'log.campaign.travel.raided_loss', turn: state.campaign.turn });
                        useShipStore.getState().actions.updateStash(s => {
                            s.weapons = [];
                            s.armor = [];
                            s.screen = [];
                            s.consumables = [];
                            s.implants = [];
                            s.utilityDevices = [];
                            s.sights = [];
                            s.gunMods = [];
                        });
                    }
                }
            });
            get().actions.updateCampaign(c => {
                c.pendingTravelCompletion = { fromEvent: 'raided' };
            });
            get().actions.startNewCampaignTurn();
        },
        spendStoryPointForCredits: () => {
            set(state => {
                if (state.campaign && state.campaign.storyPoints > 0 && !state.campaign.spForCreditsUsedThisTurn) {
                    state.campaign.storyPoints--;
                    state.campaign.credits += 3;
                    state.campaign.spForCreditsUsedThisTurn = true;
                    state.campaign.log.push({ key: 'log.campaign.sp.spentForCredits', turn: state.campaign.turn });
                }
            });
        },
        spendStoryPointForXp: (characterId: string) => {
            let characterName = 'a crew member';
            set(state => {
                if (state.campaign && state.campaign.storyPoints > 0 && !state.campaign.spForXpUsedThisTurn) {
                    state.campaign.storyPoints--;
                    state.campaign.spForXpUsedThisTurn = true;
                    characterName = useCrewStore.getState().crew?.members.find(c => c.id === characterId)?.name || 'a crew member';
                    state.campaign.log.push({ key: 'log.campaign.sp.spentForXp', turn: state.campaign.turn, params: { name: characterName } });
                }
            });
            useCrewStore.getState().actions.addXp(characterId, 3);
        },
        purchaseLicense: () => {
          set(state => {
            if (state.campaign?.currentWorld?.licenseRequired && !state.campaign.currentWorld.licenseOwned) {
              const cost = state.campaign.currentWorld.licenseCost || 0;
              if (state.campaign.credits >= cost) {
                state.campaign.credits -= cost;
                state.campaign.currentWorld.licenseOwned = true;
                state.campaign.log.push({
                  key: 'log.campaign.licensePurchased',
                  turn: state.campaign.turn,
                  params: { world: state.campaign.currentWorld.name, cost }
                });
              }
            }
          });
        },
        attemptForgery: (characterId: string) => {
          const crew = useCrewStore.getState().crew;
          if (!crew) return;
          const character = crew.members.find(c => c.id === characterId);
          if (!character) return;
          
          set(state => {
            if (state.campaign?.currentWorld) {
              state.campaign.currentWorld.forgeryAttempted = true;
              const roll = rollD6();
              const savvy = character.stats.savvy;
              const total = roll + savvy;
    
              if (total >= 6) {
                state.campaign.currentWorld.licenseOwned = true;
                uiService.showToast(`Forgery successful! (Roll: ${roll} + ${savvy} Savvy = ${total})`, 'success');
                state.campaign.log.push({ key: 'log.campaign.licenseForgedSuccess', params: { name: character.name }, turn: state.campaign.turn });
              } else {
                uiService.showToast(`Forgery failed. (Roll: ${roll} + ${savvy} Savvy = ${total})`, 'warning');
                state.campaign.log.push({ key: 'log.campaign.licenseForgedFail', params: { name: character.name }, turn: state.campaign.turn });
                if (roll === 1) {
                  const newRival: Rival = { id: `rival_forgery_${Date.now()}`, name: "Local Law Enforcement", status: 'active' };
                  if (!state.campaign.rivals) state.campaign.rivals = [];
                  state.campaign.rivals.push(newRival);
                  uiService.showToast(`Fumbled! You've gained a new Rival: ${newRival.name}`, 'error');
                  state.campaign.log.push({ key: 'log.campaign.licenseForgedFumble', params: { rivalName: newRival.name }, turn: state.campaign.turn });
                }
              }
            }
          });
        },
        useBusyMarkets: () => {
          set(state => {
              if (state.campaign) {
                  if (state.campaign.credits >= 2 && !state.campaign.busyMarketsUsedThisTurn) {
                      state.campaign.credits -= 2;
                      state.campaign.busyMarketsUsedThisTurn = true;
                      const crew = useCrewStore.getState().crew;
                      const trader = crew?.members.find(c => c.task === 'trade' && !c.taskCompletedThisTurn) || crew?.members.find(c => !c.taskCompletedThisTurn);
                      if (trader) {
                          state.campaign.pendingTradeResult = {
                              traderId: trader.id,
                              roll: rollD100()
                          };
                          state.campaign.log.push({ key: 'log.campaign.world.busy_markets_used', turn: state.campaign.turn, params: { name: trader.name }});
                      } else {
                          state.campaign.log.push({ key: 'log.campaign.world.busy_markets_no_trader', turn: state.campaign.turn });
                      }
                  }
              }
          });
        },
        purchaseExtraTradeRoll: () => {
            set(state => {
                if (state.campaign && state.campaign.credits >= 3) {
                    const crew = useCrewStore.getState().crew;
                    const trader = crew?.members.find(c => c.task === 'trade' && !c.taskCompletedThisTurn);
                    if (trader) {
                        state.campaign.credits -= 3;
                        state.campaign.pendingTradeResult = {
                            traderId: trader.id,
                            roll: rollD100()
                        };
                        state.campaign.taskResultsLog.push({
                            key: 'log.campaign.task.trade.extra_roll',
                            turn: state.campaign.turn,
                            params: { name: trader.name }
                        });
                    } else {
                        uiService.showToast("No available crew member is set to 'Trade'.", "warning");
                    }
                }
            });
        },
        resolvePrecursorEventChoice: (characterId, chosenEvent) => {
          const fullCampaign = getFullCampaign(get);
          const crew = useCrewStore.getState().crew;
          if (!fullCampaign || !crew) return;
          const { updatedCampaign, updatedCrew, result } = campaignUseCases.resolvePrecursorEventChoice(fullCampaign, crew, characterId, chosenEvent);
          const { ship: newShip, stash: newStash, ...newCampaignProgress } = updatedCampaign;
          useCrewStore.getState().actions.setCrew(updatedCrew);
          useShipStore.getState().actions.setShipAndStash(newShip, newStash);
          set(state => { 
            state.campaign = newCampaignProgress;
            state.campaign!.taskResultsLog.push(result);
            state.campaign!.pendingPrecursorEventChoice = undefined;
          });
        },
        finalizeGearChoice: (gearToKeep) => {
          useCrewStore.getState().actions.pruneGearAfterShipDestruction(gearToKeep);
          get().actions.updateCampaign(c => {
            c.pendingGearChoiceAfterShipDestruction = false;
            c.pendingTravelCompletion = { fromEvent: 'ship_destroyed' };
          });
          get().actions.startNewCampaignTurn();
        },
        completeFleeSequence: () => {
          get().actions.updateCampaign(c => {
            c.pendingFleeCharacterEvent = false;
            c.characterEventResult = null;
            c.isWorldInvaded = false;
            c.fledFromInvasionThisTurn = true;
            c.pendingTravelCompletion = { fromEvent: 'fled_invasion' };
          });
          get().actions.startNewCampaignTurn();
        },
        clearCharacterEventResult: () => {
            get().actions.updateCampaign(c => {
                c.characterEventResult = null;
            });
        },
        sellItemsForFuelAndFlee: (itemsToSell) => {
            const creditsGenerated = Math.floor(itemsToSell.length / 2);
            get().actions.addCredits(creditsGenerated);
            const stashItems = itemsToSell.filter(i => i.charId === 'stash');
            const crewItems = itemsToSell.filter(i => i.charId !== 'stash');
            useShipStore.getState().actions.removeItemsFromStash(stashItems.map(i => ({ instanceId: i.instanceId, type: i.itemType })));
            useCrewStore.getState().actions.removeItems(crewItems);
            get().actions.updateCampaign(c => {
                c.log.push({ key: 'log.campaign.flee.sold_items', turn: c.turn, params: { count: itemsToSell.length, credits: creditsGenerated } });
            });
            get().actions.initiateTravel(true);
        },
        purchaseCommercialPassage: () => {
            const fullCampaign = getFullCampaign(get);
            const crew = useCrewStore.getState().crew;
            if (!fullCampaign || !crew) return;
            const { updatedCampaign, updatedCrew } = campaignUseCases.purchaseCommercialPassage(fullCampaign, crew);
            const { ship, stash, ...campaignProgress } = updatedCampaign;
            useCrewStore.getState().actions.setCrew(updatedCrew);
            useShipStore.getState().actions.setShipAndStash(ship, stash);
            set({ campaign: campaignProgress });
            get().actions.initiateTravel(false);
        },
        searchForNewShip: () => {
            const fullCampaign = getFullCampaign(get);
            if (!fullCampaign) return;
            const { updatedCampaign } = campaignUseCases.searchForNewShip(fullCampaign);
            const { ship, stash, ...campaignProgress } = updatedCampaign;
            set({ campaign: campaignProgress });
        },
        purchaseFoundShip: (useFinancing) => {
            const fullCampaign = getFullCampaign(get);
            const crew = useCrewStore.getState().crew;
            if (!fullCampaign || !crew) return;
            const { updatedCampaign, updatedCrew } = campaignUseCases.purchaseFoundShip(fullCampaign, crew, useFinancing);
            const { ship, stash, ...campaignProgress } = updatedCampaign;
            useCrewStore.getState().actions.setCrew(updatedCrew);
            useShipStore.getState().actions.setShipAndStash(ship, stash);
            set({ campaign: campaignProgress });
        },
        declineFoundShip: () => {
            get().actions.updateCampaign(c => {
                c.pendingShipOffer = undefined;
                c.log.push({ key: 'log.campaign.ship.declined_offer', turn: c.turn });
            });
        },
        attemptInterdictionLicense: () => {
            const crew = useCrewStore.getState().crew;
            if (!crew) return;
            get().actions.updateCampaign(c => {
                if (!c.currentWorld || c.currentWorld.interdictionLicenseAttempted) return;
                c.currentWorld.interdictionLicenseAttempted = true;
                const broker = crew.members.find(m => m.advancedTraining === 'broker' && !m.isUnavailableForTasks);
                const savvyBonus = broker?.stats.savvy || 0;
                const roll = rollD6() + savvyBonus;
                if (roll >= 5) {
                    c.currentWorld.interdictionTurnsRemaining! += 2;
                    c.log.push({ key: 'log.campaign.interdiction.success', turn: c.turn, params: { name: broker?.name || 'crew', roll } });
                } else {
                    c.log.push({ key: 'log.campaign.interdiction.fail', turn: c.turn, params: { name: broker?.name || 'crew', roll } });
                }
            });
        },
        resolveTradeGoodsSale: (sellNow) => {
            set(state => {
                if (state.campaign?.pendingTradeGoodsSale) {
                    state.campaign.pendingTradeGoodsSale = false;
                    if (sellNow) {
                        const roll = rollD6();
                        if (roll > 1) {
                            state.campaign.credits += roll;
                            state.campaign.log.push({ key: 'log.campaign.tradeGoods.sold', turn: state.campaign.turn, params: { credits: roll } });
                        } else {
                            state.campaign.log.push({ key: 'log.campaign.tradeGoods.lost', turn: state.campaign.turn });
                        }
                    } else {
                        state.campaign.log.push({ key: 'log.campaign.tradeGoods.wait', turn: state.campaign.turn });
                    }
                    if (sellNow) {
                      state.campaign.hasTradeGoods = false;
                    }
                }
            });
        },
        resolveItemChoice: (itemId: 'duplicator' | 'fixer', payload: { item: any }) => {
          set(state => {
              if (!state.campaign) return;
      
              const { item } = payload;
              
              if (itemId === 'duplicator') {
                  const { addItemToStash } = useShipStore.getState().actions;
                  const newItem = { 
                      ...item, 
                      id: item.itemId, 
                      weaponId: item.type === 'weapon' ? item.itemId : undefined,
                      instanceId: `${item.itemId}_${Date.now()}` 
                  };
                  addItemToStash(newItem);
      
                  useShipStore.getState().actions.updateStash(s => {
                      const index = s.onBoardItems.indexOf('duplicator');
                      if (index > -1) s.onBoardItems.splice(index, 1);
                  });
                  state.campaign.log.push({ key: 'log.campaign.item.duplicator_used', turn: state.campaign.turn, params: { item: item.name } });
      
              } else if (itemId === 'fixer') {
                  useCrewStore.getState().actions.updateCrew(c => {
                      const char = c.members.find(m => m.id === item.charId);
                      if (!char) return;
      
                      const damagedIndex = (char.damagedEquipment || []).findIndex(d => d.instanceId === item.instanceId);
                      if (damagedIndex > -1) {
                          const repairedItem = char.damagedEquipment!.splice(damagedIndex, 1)[0];
                          if (repairedItem.type === 'weapon') {
                              char.weapons.push({ instanceId: repairedItem.instanceId, weaponId: repairedItem.weaponId! });
                          } else if (repairedItem.type === 'armor') {
                              char.armor = repairedItem.instanceId;
                          } else if (repairedItem.type === 'screen') {
                              char.screen = repairedItem.instanceId;
                          }
                      }
                  });
      
                  useShipStore.getState().actions.updateStash(s => {
                      const index = s.onBoardItems.indexOf('fixer');
                      if (index > -1) s.onBoardItems.splice(index, 1);
                  });
                  state.campaign.log.push({ key: 'log.campaign.item.fixer_used', turn: state.campaign.turn, params: { item: item.name } });
              }
      
              state.campaign.pendingItemChoice = undefined;
          });
        },
      },
    })),
    {
      name: 'five-parsecs-campaign-progress',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('An error occurred during rehydration:', error);
        } else if (state) {
          state.actions._setIsHydrated(true);
        }
      },
      partialize: (state) => ({ campaign: state.campaign, saveSlots: state.saveSlots }),
    }
  )
);
