import { Campaign, Crew, CampaignLogEntry, Character, TaskType, Rival, Battle, Mission, BattleParticipant, CharacterEvent, World, OnBoardItemId, CharacterStats, LootItem, WorldTrait, RaceId, Stash, LootResult } from '../../types';
import { CampaignDomain } from '../domain/campaignDomain';
import { rollD6, rollD100, rollD10 } from '../utils/rolls';
import { generateNewRecruit, applyRaceToCharacter, generateCharacter, generateFullRandomCrew } from '../characterService';
import { GeminiApiService } from '../api/geminiApiService';
import { generateJobOffers as generateOffersService } from './jobOfferGenerator';
import { resolveTable } from '../utils/tables';
import { BATTLEFIELD_FINDS_TABLE } from '../../constants/battlefieldFinds';
import { getLootFromTradeTable, rollOnLootTable } from '../lootService';
import { CAMPAIGN_EVENTS_TABLE } from '../../constants/campaignEvents';
import { CHARACTER_EVENTS_TABLE } from '../../constants/characterEvents';
import { generateStartingShip } from '../shipService';
import { TRADE_TABLE } from '@/constants/tradeTable';
import { EXPLORATION_TABLE } from '../../constants/exploration';
import { MILITARY_WEAPON_TABLE, LOW_TECH_WEAPON_TABLE } from '../../constants/items';
import { getWeaponById, getProtectiveDeviceById, getConsumableById } from '../data/items';
import { useShipStore } from '../../stores/shipStore';
import { cloneDeep } from '../utils/cloneDeep';

export class CampaignUseCases {
    constructor(private campaignDomain: CampaignDomain, private geminiApiService: GeminiApiService) {}

    async addSingleCharacter() {
        return generateCharacter(this.geminiApiService.generateCharacterDetails.bind(this.geminiApiService));
    }
    
    async generateFullCrew() {
        return generateFullRandomCrew(this.geminiApiService.generateMultipleCharacterDetails.bind(this.geminiApiService));
    }
    
    resolveSingleTask(campaign: Campaign, crew: Crew, characterId: string): { updatedCampaign: Campaign; updatedCrew: Crew; log: CampaignLogEntry; } {
        const updatedCampaign = cloneDeep(campaign);
        const updatedCrew = cloneDeep(crew);
        let log: CampaignLogEntry;
        
        const character = updatedCrew.members.find((c: Character) => c.id === characterId);
        if (!character) {
             log = { key: 'log.error.generic', turn: campaign.turn };
             return { updatedCampaign, updatedCrew, log };
        }

        switch (character.task) {
            case 'explore': {
                const roll = rollD100();
                const result = resolveTable(EXPLORATION_TABLE, roll).value;
                
                const params: Record<string, any> = { name: character.name };
                log = { key: `log.campaign.task.explore.${result.id}`, turn: campaign.turn, params };

                switch (result.id) {
                    case 'good_deal':
                        updatedCampaign.pendingTradeResult = { traderId: character.id, roll: rollD100() };
                        break;
                    case 'meet_patron':
                        updatedCampaign.patronJobsToGenerate = (updatedCampaign.patronJobsToGenerate || 0) + 1;
                        break;
                    case 'bad_food':
                        if (character.raceId !== 'soulless' && character.raceId !== 'kerin') {
                            character.injuries.push({ id: 'bad_food', effect: 'Food poisoning', recoveryTurns: 1 });
                        }
                        break;
                    case 'meet_interesting':
                    case 'overheard_talk':
                    case 'hear_tip':
                        updatedCampaign.questRumors.push({ id: `rumor_explore_${Date.now()}`, description: 'A rumor from exploration', type: 'generic' });
                        if (character.raceId === 'precursor' && rollD6() >= 5) {
                            updatedCampaign.questRumors.push({ id: `rumor_precursor_${Date.now()}`, description: 'A second rumor from exploration', type: 'generic' });
                        }
                        break;
                    case 'nice_chat':
                        if (rollD6() + character.stats.savvy >= 5) {
                            updatedCampaign.storyPoints++;
                        }
                        break;
                    case 'new_friend':
                        if (updatedCrew.members.length < 6) {
                            const newRecruit = generateNewRecruit() as Character;
                            if (character.raceId === 'feral') {
                                applyRaceToCharacter(newRecruit, 'feral');
                            }
                            newRecruit.name = `Friend of ${character.name}`;
                            updatedCrew.members.push(newRecruit);
                            log.params!.recruitName = newRecruit.name;
                        }
                        break;
                    case 'earn_on_side':
                        updatedCampaign.credits += 2;
                        log.params!.credits = 2;
                        break;
                    case 'heart_to_heart':
                        if (updatedCrew.members.length > 1) {
                            let otherChar;
                            do {
                                otherChar = updatedCrew.members[Math.floor(Math.random() * updatedCrew.members.length)];
                            } while (otherChar.id === character.id);
                            otherChar.xp++;
                            character.xp++;
                            log.params!.otherName = otherChar.name;
                        } else {
                            character.xp++;
                        }
                        break;
                    case 'exercise':
                    case 'found_trainer':
                        character.xp += 2;
                        break;
                    case 'unusual_hobby':
                        updatedCampaign.storyPoints++;
                        if (character.raceId === 'swift' || character.raceId === 'precursor') {
                            character.xp += 2;
                        }
                        break;
                    case 'got_noticed':
                    case 'pick_fight':
                        const newRival: Rival = { id: `rival_explore_${Date.now()}`, name: `Local Trouble`, status: 'active' };
                        if (!updatedCampaign.rivals) updatedCampaign.rivals = [];
                        updatedCampaign.rivals.push(newRival);
                        break;
                    case 'info_broker':
                        if (updatedCampaign.credits >= 2) {
                            updatedCampaign.credits -= 2;
                            updatedCampaign.questRumors.push({ id: `rumor_broker_${Date.now()}`, description: 'A rumor from an info broker', type: 'generic' });
                        }
                        break;
                    case 'arms_dealer':
                        if (updatedCampaign.credits >= 3) {
                            updatedCampaign.credits -= 3;
                            const weapon = resolveTable(MILITARY_WEAPON_TABLE, rollD100()).value;
                            useShipStore.getState().actions.addItemToStash({ ...weapon, id: weapon.id });
                            log.params!.itemId = weapon.id;
                            log.params!.itemType = 'weapon';
                        }
                        break;
                    case 'bad_fight':
                        character.injuries.push({ id: 'bad_fight', effect: 'Got into a bad fight', recoveryTurns: Math.ceil(rollD6() / 2) });
                        const allItems = [...character.weapons, ...(character.armor ? [{instanceId: character.armor}] : []), ...(character.screen ? [{instanceId: character.screen}] : [])];
                        if (allItems.length > 0) {
                            const itemLost = allItems[Math.floor(Math.random() * allItems.length)];
                            character.weapons = character.weapons.filter(w => w.instanceId !== itemLost.instanceId);
                            if (character.armor === itemLost.instanceId) character.armor = undefined;
                            if (character.screen === itemLost.instanceId) character.screen = undefined;
                        }
                        break;
                    case 'found_item':
                        const weapon = resolveTable(LOW_TECH_WEAPON_TABLE, rollD100()).value;
                        useShipStore.getState().actions.addItemToStash({ ...weapon, id: weapon.id });
                        log.params!.itemId = weapon.id;
                        log.params!.itemType = 'weapon';
                        break;
                }
                character.taskCompletedThisTurn = true;
                break;
            }
            case 'trade': {
                const roll = rollD100();
                updatedCampaign.pendingTradeResult = { traderId: character.id, roll };
                log = { key: 'log.campaign.task.trade.pending', turn: campaign.turn, params: { name: character.name } };
                character.taskCompletedThisTurn = true;
                break;
            }
            case 'recruit': {
                if (updatedCrew.members.length < 6) {
                    const newRecruit = generateNewRecruit() as Character;
                    newRecruit.name = `Recruit #${updatedCrew.members.length + 1}`;
                    updatedCrew.members.push(newRecruit);
                    log = { key: 'log.campaign.task.recruit.success_auto', turn: campaign.turn, params: { name: character.name, recruitName: newRecruit.name } };
                } else {
                    const isEasyRecruiting = campaign.currentWorld?.traits.some(t => t.id === 'easy_recruiting');
                    const recruiters = updatedCrew.members.filter((m: Character) => m.task === 'recruit').length;
                    let modifier = 0;
                    
                    if (isEasyRecruiting) {
                        modifier = 1;
                    }

                    const luxuryTrinketBonus = updatedCampaign.luxuryTrinketRecruitBonus ? 2 : 0;
                    if (luxuryTrinketBonus > 0) {
                        updatedCampaign.luxuryTrinketRecruitBonus = false; 
                        updatedCampaign.taskResultsLog.push({ 
                            key: 'log.campaign.task.trade.luxury_trinket_bonus', 
                            turn: campaign.turn, 
                            params: { name: character.name } 
                        });
                    }
                    
                    const roll = rollD6();
                    const total = roll + recruiters + modifier + luxuryTrinketBonus;
                    const bonus = recruiters + modifier + luxuryTrinketBonus;
                    
                    const logParams = {
                        name: character.name,
                        roll,
                        total,
                        bonus
                    };

                    if (total >= 6) {
                        const newRecruit = generateNewRecruit() as Character;
                        newRecruit.name = `Recruit #${updatedCrew.members.length + 1}`;
                        updatedCrew.members.push(newRecruit);
                        
                        if (isEasyRecruiting) {
                            log = { key: 'log.campaign.task.recruit.success_roll_bonus', turn: campaign.turn, params: { ...logParams, recruitName: newRecruit.name, traitId: 'easy_recruiting' } };
                        } else {
                            log = { key: 'log.campaign.task.recruit.success_roll', turn: campaign.turn, params: { ...logParams, recruitName: newRecruit.name } };
                        }
                    } else {
                        if (isEasyRecruiting) {
                            log = { key: 'log.campaign.task.recruit.fail_bonus', turn: campaign.turn, params: { ...logParams, traitId: 'easy_recruiting' } };
                        } else {
                            log = { key: 'log.campaign.task.recruit.fail', turn: campaign.turn, params: logParams };
                        }
                    }
                }
                character.taskCompletedThisTurn = true;
                break;
            }
            case 'repair': {
                const itemToRepair = character.damagedEquipment?.[0];
                if (!itemToRepair) {
                    log = { key: 'log.campaign.task.repair.no_items', turn: updatedCampaign.turn, params: { name: character.name } };
                    break;
                }

                const roll = rollD6();
                const savvy = character.stats.savvy;
                const engineerBonus = character.raceId === 'engineer' ? 1 : 0;
                const techKnowledgeBonus = updatedCampaign.currentWorld?.traits.some(t => t.id === 'technical_knowledge') ? 1 : 0;
                const bonus = savvy + engineerBonus + techKnowledgeBonus;
                const total = roll + bonus;
                
                const logParams: any = { 
                    name: character.name, 
                    roll, 
                    bonus, 
                    total, 
                    item: itemToRepair.weaponId || itemToRepair.instanceId,
                    itemType: itemToRepair.type 
                };

                if (roll === 1) {
                    character.damagedEquipment.shift(); // Item lost permanently
                    log = { key: 'log.campaign.task.repair.fumble', turn: updatedCampaign.turn, params: logParams };
                } else if (total >= 6) {
                    const repairedItem = character.damagedEquipment.shift()!;
                    if (repairedItem.type === 'weapon') {
                        character.weapons.push({ instanceId: repairedItem.instanceId, weaponId: repairedItem.weaponId! });
                    } else if (repairedItem.type === 'armor') {
                        character.armor = repairedItem.instanceId;
                    } else if (repairedItem.type === 'screen') {
                        character.screen = repairedItem.instanceId;
                    }
                    
                    log = { 
                        key: techKnowledgeBonus > 0 ? 'log.campaign.task.repair.success_bonus' : 'log.campaign.task.repair.success', 
                        turn: updatedCampaign.turn, 
                        params: techKnowledgeBonus > 0 ? { ...logParams, traitId: 'technical_knowledge' } : logParams 
                    };
                } else {
                    log = { 
                        key: techKnowledgeBonus > 0 ? 'log.campaign.task.repair.fail_bonus' : 'log.campaign.task.repair.fail', 
                        turn: updatedCampaign.turn, 
                        params: techKnowledgeBonus > 0 ? { ...logParams, traitId: 'technical_knowledge' } : logParams 
                    };
                }
                character.taskCompletedThisTurn = true;
                break;
            }
            case 'track_rival': {
                const alreadyResolved = updatedCampaign.taskResultsLog.some(
                    (l: CampaignLogEntry) => l.key.includes('track_rival.success') || l.key.includes('track_rival.fail')
                );
                if (alreadyResolved) {
                    log = { key: 'log.campaign.task.track_rival.assist', turn: campaign.turn, params: { name: character.name } };
                    character.taskCompletedThisTurn = true;
                    break;
                }

                const trackers = updatedCrew.members.filter((m: Character) => m.task === 'track_rival');
                const trackersCount = trackers.length;
                const activeRivals = updatedCampaign.rivals.filter((r: Rival) => r.status === 'active');

                if (activeRivals.length === 0) {
                    log = { key: 'log.campaign.task.track_rival.no_rivals', turn: campaign.turn };
                    trackers.forEach((tracker: Character) => {
                        const charInCrew = updatedCrew.members.find((c: Character) => c.id === tracker.id);
                        if (charInCrew) charInCrew.taskCompletedThisTurn = true;
                    });
                    break;
                }

                const roll = rollD6();
                const total = roll + trackersCount;

                const logParams = {
                    name: trackers.map((f: Character) => f.name).join(' & '),
                    roll,
                    bonus: trackersCount,
                    total
                };

                if (total >= 6) {
                    const rivalToTrack = activeRivals[0];
                    updatedCampaign.locatedRivalId = rivalToTrack.id;
                    log = { 
                        key: 'log.campaign.task.track_rival.success', 
                        turn: campaign.turn, 
                        params: { ...logParams, rivalName: rivalToTrack.name } 
                    };
                } else {
                    log = { 
                        key: 'log.campaign.task.track_rival.fail', 
                        turn: campaign.turn, 
                        params: logParams
                    };
                }

                trackers.forEach((tracker: Character) => {
                    const charInCrew = updatedCrew.members.find((c: Character) => c.id === tracker.id);
                    if (charInCrew) charInCrew.taskCompletedThisTurn = true;
                });
                break;
            }
            case 'find_patron': {
                if (updatedCampaign.currentWorld?.blacklistedFromPatrons) {
                    log = { key: 'log.campaign.task.find_patron.blacklisted', turn: campaign.turn, params: { name: character.name } };
                    character.taskCompletedThisTurn = true;
                    break;
                }

                // If another character already resolved this group task this turn, just log assistance.
                const alreadyResolved = updatedCampaign.taskResultsLog.some((l: CampaignLogEntry) => l.key.includes('find_patron.success') || l.key.includes('find_patron.fail'));
                if (alreadyResolved) {
                    log = { key: 'log.campaign.task.find_patron.assist', turn: campaign.turn, params: { name: character.name } };
                    character.taskCompletedThisTurn = true;
                    break;
                }

                const finders = updatedCrew.members.filter((m: Character) => m.task === 'find_patron');
                const findersCount = finders.length;
                const patronsCount = updatedCampaign.patrons.length;
                const hasOpportunities = updatedCampaign.currentWorld?.traits.some((t: WorldTrait) => t.id === 'opportunities');
                const hasCorporateState = updatedCampaign.currentWorld?.traits.some((t: WorldTrait) => t.id === 'corporate_state');
                const opportunitiesBonus = hasOpportunities ? 1 : 0;
                const corporateStateBonus = hasCorporateState ? 2 : 0;

                const roll = rollD6();
                const bonus = findersCount + patronsCount + opportunitiesBonus + corporateStateBonus;
                const total = roll + bonus;

                let jobsFound = 0;
                if (total >= 6) {
                    jobsFound = 2;
                } else if (total >= 5) {
                    jobsFound = 1;
                }
                
                if (jobsFound > 0) {
                    updatedCampaign.patronJobsToGenerate = (updatedCampaign.patronJobsToGenerate || 0) + jobsFound;
                }

                const logParams: any = {
                    name: finders.map((f: Character) => f.name).join(' & '),
                    roll,
                    bonus: `${findersCount} finders + ${patronsCount} patrons` + (opportunitiesBonus > 0 ? ' +1' : '') + (corporateStateBonus > 0 ? ' +2' : ''),
                    total,
                    jobsFound
                };
                
                let logKey: string;
                const hasTraitBonus = hasOpportunities || hasCorporateState;
                if (jobsFound > 0) {
                    logKey = hasTraitBonus ? 'log.campaign.task.find_patron.success_trait' : 'log.campaign.task.find_patron.success';
                } else {
                    logKey = hasTraitBonus ? 'log.campaign.task.find_patron.fail_trait' : 'log.campaign.task.find_patron.fail';
                }

                if (hasCorporateState) {
                    logParams.traitId = 'corporate_state';
                } else if (hasOpportunities) {
                    logParams.traitId = 'opportunities';
                }
                
                log = { key: logKey, turn: campaign.turn, params: logParams };

                // Mark all finders as having completed their task for the turn.
                finders.forEach((finder: Character) => {
                    const charInCrew = updatedCrew.members.find((c: Character) => c.id === finder.id);
                    if (charInCrew) {
                        charInCrew.taskCompletedThisTurn = true;
                    }
                });
                break;
            }
            case 'train': {
                if (!character.noXP) {
                    character.xp = (character.xp || 0) + 1;
                    log = { key: 'log.campaign.task.train.success', turn: campaign.turn, params: { name: character.name } };
                } else {
                    log = { key: 'log.campaign.task.train.no_xp', turn: campaign.turn, params: { name: character.name } };
                }
                character.taskCompletedThisTurn = true;
                break;
            }
            default:
                character.taskCompletedThisTurn = true;
                log = { key: 'log.campaign.task.completed', params: { name: character.name, task: character.task }, turn: campaign.turn };
        }
        
        return { updatedCampaign, updatedCrew, log };
    }
    
    resolveTravelEvent(campaign: Campaign, crew: Crew, payload?: any): { updatedCampaign: Campaign; updatedCrew: Crew; battleOptions: any; logs: CampaignLogEntry[]; rerolledEvent?: boolean; } {
        const updatedCampaign = cloneDeep(campaign);
        const updatedCrew = cloneDeep(crew);

        if (!updatedCampaign.activeTravelEvent) {
            return { updatedCampaign, updatedCrew, battleOptions: null, logs: [] };
        }

        const logs: CampaignLogEntry[] = [];
        const battleOptions = null;
        let rerolledEvent = false;

        switch (updatedCampaign.activeTravelEvent.eventId) {
            case 'navigation_trouble': {
                logs.push({ key: 'log.campaign.travel.navigation_trouble', turn: updatedCampaign.turn });

                const hasNavSystem = updatedCampaign.ship?.components.includes('military_nav_system');

                if (!hasNavSystem) {
                    updatedCampaign.storyPoints = Math.max(0, updatedCampaign.storyPoints - 1);
                    logs.push({ key: 'log.campaign.travel.navigation_trouble_sp_loss', turn: updatedCampaign.turn });
                } else {
                    logs.push({ key: 'log.campaign.travel.navigation_trouble_saved', turn: updatedCampaign.turn });
                }

                const isDamaged = updatedCampaign.ship && updatedCampaign.ship.hull < updatedCampaign.ship.maxHull;
                if (isDamaged) {
                    const activeCrew = updatedCrew.members.filter(m => !m.isUnavailableForTasks && !m.injuries.some(i => i.recoveryTurns > 0));
                    if (activeCrew.length > 0) {
                        const injuredMember = activeCrew[Math.floor(Math.random() * activeCrew.length)];
                        const injuryResult = CampaignDomain.resolveInjury(injuredMember);
                        const { logs: injuryLogs, wasKilled } = CampaignDomain.applyInjuryResult(injuredMember.id, injuryResult, updatedCrew, updatedCampaign);
                        logs.push({ key: 'log.campaign.travel.navigation_trouble_injury', turn: updatedCampaign.turn, params: { name: injuredMember.name } });
                        logs.push(...injuryLogs);
                        if (wasKilled) {
                            updatedCrew.members = updatedCrew.members.filter(m => m.id !== injuredMember.id);
                        }
                    }
                }

                const newEvent = CampaignDomain.getTravelEvent(false);
                updatedCampaign.activeTravelEvent = newEvent;
                rerolledEvent = true;
                break;
            }
            default:
                // Default handling for other events or closing the modal
                updatedCampaign.activeTravelEvent = null;
                updatedCampaign.pendingTravelCompletion = { fromEvent: 'resolved' };
        }
        
        return { updatedCampaign, updatedCrew, battleOptions, logs, rerolledEvent };
    }

    resolveTradeChoice(campaign: Campaign, crew: Crew, payload: any): { updatedCampaign: Campaign; updatedCrew: Crew; log: CampaignLogEntry; } {
        const updatedCampaign = cloneDeep(campaign);
        const updatedCrew = cloneDeep(crew);

        const { traderId, roll, choice, items: payloadItems, characterId: payloadCharId, weaponInstanceId } = payload;
        const trader = updatedCrew.members.find(c => c.id === traderId);
        const tradeEntry = resolveTable(TRADE_TABLE, roll).value;
        const params: Record<string, string | number | undefined> = {};
        if (trader) {
            params.name = trader.name;
        }
    
        let logKey = tradeEntry.logKey;
        const { addItemToStash } = useShipStore.getState().actions;
    
        const addItem = (item: LootItem, targetStash: Stash) => {
            for (let i = 0; i < item.amount; i++) {
                const newItem: any = {
                    instanceId: `${item.id}_${Date.now()}_${Math.random()}`,
                    id: item.id,
                    type: item.type,
                };
                if (item.type === 'weapon') newItem.weaponId = item.id;
    
                const stashKey = `${item.type}s` as keyof Stash;
                if (stashKey in targetStash) {
                    (targetStash[stashKey] as any[]).push(newItem.type === 'weapon' ? { instanceId: newItem.instanceId, weaponId: newItem.weaponId } : newItem.id);
                }
            }
            params.itemId = item.id;
            params.itemType = item.type;
        };
    
        switch (tradeEntry.type) {
            case 'simple':
                if (tradeEntry.items) { 
tradeEntry.items.forEach(item => addItem(item as LootItem, updatedCampaign.stash)); }
                if (tradeEntry.credits) { updatedCampaign.credits += tradeEntry.credits; params.profit = tradeEntry.credits; }
                if (tradeEntry.rumors) { for (let i = 0; i < tradeEntry.rumors; i++) updatedCampaign.questRumors.push({ id: `rumor_trade_${Date.now()}_${i}`, description: 'A rumor from trade', type: 'generic' }); }
                if (tradeEntry.id === 'local_maps') { updatedCampaign.hasLocalMaps = true; }
                if (tradeEntry.id === 'basic_supplies') { updatedCampaign.canSkipUpkeep = true; }
                if (tradeEntry.id === 'trade_goods') { updatedCampaign.hasTradeGoods = true; }
                if (tradeEntry.id === 'fuel') { updatedCampaign.fuelCredits = (updatedCampaign.fuelCredits || 0) + 3; }
                if (tradeEntry.id === 'spare_parts') { addItemToStash({ type: 'onBoardItem', id: 'spare_parts' }); }
                if (tradeEntry.id === 'military_fuel_cell') { addItemToStash({ type: 'onBoardItem', id: 'military_fuel_cell' }); }
                if (tradeEntry.id === 'insider_information') { updatedCampaign.hasInsiderInformation = true; }
                break;
            case 'item_roll':
                const lootResult = getLootFromTradeTable(tradeEntry.items![0].type, tradeEntry.items![0].damaged);
                if (lootResult.items.length > 0) {
                    const item = lootResult.items[0];
                    addItem(item, updatedCampaign.stash);
                }
                break;
            case 'recruit':
                if (updatedCrew.members.length < 6) {
                    const newRecruit = generateNewRecruit() as Character;
                    updatedCrew.members.push(newRecruit);
                }
                break;
            case 'gamble':
                const gambleRoll = rollD6();
                if (gambleRoll >= tradeEntry.gambleTarget!) {
                    updatedCampaign.storyPoints += tradeEntry.storyPoints!;
                    logKey = 'dashboard.tradeResults.trinket_success';
                } else {
                    logKey = 'dashboard.tradeResults.trinket_fail';
                }
                params.roll = gambleRoll;
                break;
        }
    
        const log: CampaignLogEntry = { key: logKey, turn: campaign.turn, params };
        return { updatedCampaign, updatedCrew, log };
    }

    resolveAndApplyInjury(campaign: Campaign, crew: Crew, characterId: string) {
        const updatedCampaign = cloneDeep(campaign);
        const updatedCrew = cloneDeep(crew);
    
        const character = updatedCrew.members.find(c => c.id === characterId);
        if (!character) return { result: null, updatedCrew: crew, updatedCampaign };
    
        const result = CampaignDomain.resolveInjury(character);
        const { logs, wasKilled } = CampaignDomain.applyInjuryResult(characterId, result, updatedCrew, updatedCampaign);
        updatedCampaign.log.push(...logs);
    
        if (wasKilled) {
            updatedCrew.members = updatedCrew.members.filter(m => m.id !== characterId);
        }
        
        return { result, updatedCrew, updatedCampaign };
    }

    acceptStatPenalty(crew: Crew, characterId: string) {
        return CampaignDomain.acceptStatPenalty(crew, characterId);
    }

    generateInitialWorld() {
        return CampaignDomain.generateNewWorld();
    }

    startNewCampaignTurn(campaign: Campaign, crew: Crew) {
        return { updatedCampaign: campaign, updatedCrew: crew };
    }

    finalizeUpkeep(campaign: Campaign, crew: Crew, payments: { debt: number; repairs: number }) {
        campaign.campaignPhase = 'actions';
        campaign.debt -= payments.debt;
        campaign.credits -= payments.debt;
        campaign.credits -= payments.repairs;
        if (campaign.ship) {
            campaign.ship.hull = Math.min(campaign.ship.maxHull, campaign.ship.hull + payments.repairs + 1);
        }
        return { updatedCampaign: campaign, updatedCrew: crew };
    }

    acceptJob(campaign: Campaign, offerId: string) {
        const offer = campaign.jobOffers.find(o => o.id === offerId);
        if (offer) {
            campaign.activeMission = { ...offer, turnAccepted: campaign.turn };
            campaign.jobOffers = [];
        }
        return { updatedCampaign: campaign };
    }

    resolveRumors(campaign: Campaign) {
        const logs: CampaignLogEntry[] = [];
        return { updatedCampaign: campaign, logs };
    }

    useOnBoardItem(campaign: Campaign, crew: Crew, itemId: OnBoardItemId, payload: { characterId?: string }) {
        return { updatedCampaign: campaign, updatedCrew: crew };
    }

    resolvePostBattleActivity(activityType: string, battle: Battle, campaign: Campaign): { updatedCampaign: Campaign, log: CampaignLogEntry } {
        let log: CampaignLogEntry = { key: `postBattle.activities.results.${activityType}`, turn: campaign.turn };

        switch (activityType) {
            case 'rivals': {
                if (battle.battleType === 'invasion' || battle.enemyCategory === 'Roving Threats') {
                    log = { key: 'log.campaign.rivals.noRivalsToCheck', turn: campaign.turn };
                    break;
                }

                if (battle.isRivalBattle && battle.rivalId) {
                    if (battle.heldTheField) {
                        const rival = campaign.rivals.find(r => r.id === battle.rivalId);
                        if (rival) {
                            const roll = rollD6();
                            let bonus = 0;
                            if (battle.wasRivalTracked) bonus++;
                            if ((battle.killedUniqueIndividualIds || []).length > 0) bonus++;
                            
                            if (roll + bonus >= 4) {
                                rival.status = 'defeated';
                                log = { key: 'log.campaign.rivals.defeated', params: { rivalName: rival.name }, turn: campaign.turn };
                            } else {
                                log = { key: 'log.campaign.rivals.notDefeated', params: { rivalName: rival.name }, turn: campaign.turn };
                            }
                        }
                    } else {
                         const rival = campaign.rivals.find(r => r.id === battle.rivalId);
                         if(rival) {
                             log = { key: 'log.campaign.rivals.notDefeated', params: { rivalName: rival.name }, turn: campaign.turn };
                         }
                    }
                } else {
                    if (battle.heldTheField) {
                        const roll = rollD6();
                        const hasVendettaSystem = campaign.currentWorld?.traits.some(t => t.id === 'vendetta_system');
                        const corporateStateRivalry = campaign.currentWorld?.traits.some(t => t.id === 'corporate_state') && battle.mission.status === 'failure';
                        
                        const target = hasVendettaSystem ? 2 : 1;
                        
                        log = { key: 'log.campaign.rivals.roll', params: { rolls: roll }, turn: campaign.turn };

                        if (roll <= target || corporateStateRivalry) {
                            const enemyFaction = battle.enemyFaction || battle.enemyCategory || "An Unknown Faction";
                            const newRival: Rival = {
                                id: `rival_${Date.now()}`,
                                name: `${enemyFaction}`,
                                status: 'active',
                            };
                            campaign.rivals.push(newRival);
                            log = { key: 'log.campaign.rivals.newRival', params: { rivalName: newRival.name }, turn: campaign.turn };
                        } else {
                            log = { key: 'log.campaign.rivals.noRivalsToCheck', turn: campaign.turn };
                        }
                    } else {
                        log = { key: 'log.campaign.rivals.noRivalsToCheck', turn: campaign.turn };
                    }
                }
                break;
            }
            case 'patrons': {
                if (battle.mission.status === 'failure' && campaign.currentWorld?.traits.some(t => t.id === 'corporate_state')) {
                    campaign.currentWorld.blacklistedFromPatrons = true;
                    log = { key: 'log.campaign.patrons.blacklisted', turn: campaign.turn };
                    break;
                }
                
                if (battle.mission.status === 'success' && battle.originalActiveMission) {
                    const patronType = battle.originalActiveMission.patronType;
                    const condition = battle.originalActiveMission.condition;
                    if (condition?.id !== 'one_time_contract') {
                        if (!campaign.patrons.some(p => p.type === patronType)) {
                            campaign.patrons.push({
                                id: `patron_${Date.now()}`,
                                name: `A ${patronType} contact`,
                                type: patronType,
                                persistent: battle.originalActiveMission.benefit?.id === 'persistent'
                            });
                            log = { key: 'log.campaign.patrons.newPatron', params: { patronType }, turn: campaign.turn };
                        } else {
                            log = { key: 'log.campaign.patrons.noChange', turn: campaign.turn };
                        }
                    } else {
                        log = { key: 'log.campaign.patrons.oneTimeContract', turn: campaign.turn };
                    }
                } else {
                    log = { key: 'log.campaign.patrons.noChange', turn: campaign.turn };
                }
                break;
            }
            default:
                log = { key: `postBattle.activities.results.${activityType}`, turn: campaign.turn };
                break;
        }

        return { updatedCampaign: campaign, log };
    }

    resolveGalacticWarProgress(campaign: Campaign, planetName: string): { updatedCampaign: Campaign, logs: CampaignLogEntry[] } {
        return CampaignDomain.resolveGalacticWarProgress(campaign, planetName);
    }

    purchaseItemRoll(campaign: Campaign, table: 'military' | 'gear' | 'gadget') {
        return { updatedCampaign: campaign, item: null };
    }

    purchaseBasicWeapon(campaign: Campaign, weaponId: string) {
        return { updatedCampaign: campaign };
    }

    sellItem(campaign: Campaign, crew: Crew, sourceId: string, itemId: string, itemType: 'weapon') {
        return { updatedCampaign: campaign, updatedCrew: crew };
    }

    resolveCampaignEvent(campaign: Campaign) {
        const roll = rollD100();
        const result = resolveTable(CAMPAIGN_EVENTS_TABLE, roll).value;
        return { updatedCampaign: campaign, result: { key: result.descriptionKey } };
    }

    resolveCharacterEvent(campaign: Campaign, crew: Crew, characterId: string) {
        const character = crew.members.find(c => c.id === characterId);
        if (!character) {
            return { updatedCampaign: campaign, updatedCrew: crew, result: null };
        }

        if (character.specialAbilities?.includes('precursor_event')) {
            const roll1 = rollD100();
            let roll2 = rollD100();
            while(roll1 === roll2) {
                roll2 = rollD100();
            }
            const event1 = resolveTable(CHARACTER_EVENTS_TABLE, roll1).value;
            const event2 = resolveTable(CHARACTER_EVENTS_TABLE, roll2).value;
            campaign.pendingPrecursorEventChoice = {
                characterId,
                event1,
                event2,
            };
            return { updatedCampaign: campaign, updatedCrew: crew, result: null };
        }

        const roll = rollD100();
        const result = resolveTable(CHARACTER_EVENTS_TABLE, roll).value;
        return { updatedCampaign: campaign, updatedCrew: crew, result: { key: result.descriptionKey, params: { name: character.name } } };
    }

    initiateTravel(campaign: Campaign, crew: Crew, isFleeing: boolean, destination?: World) {
        return { updatedCampaign: campaign, updatedCrew: crew, wasShipDestroyed: false };
    }

    resolvePrecursorEventChoice(campaign: Campaign, crew: Crew, characterId: string, chosenEvent: CharacterEvent) {
        return { updatedCampaign: campaign, updatedCrew: crew, result: { key: 'log.info.generic', turn: campaign.turn } };
    }

    purchaseCommercialPassage(campaign: Campaign, crew: Crew) {
        return { updatedCampaign: campaign, updatedCrew: crew };
    }
    
    searchForNewShip(campaign: Campaign) {
        const { ship, debt } = generateStartingShip();
        campaign.pendingShipOffer = { ship, cost: debt + 20 };
        campaign.shipSearchConductedThisTurn = true;
        return { updatedCampaign: campaign };
    }

    purchaseFoundShip(campaign: Campaign, crew: Crew, useFinancing: boolean) {
        if(campaign.pendingShipOffer){
            campaign.ship = campaign.pendingShipOffer.ship;
            campaign.pendingShipOffer = null;
        }
        return { updatedCampaign: campaign, updatedCrew: crew };
    }
}