/**
 * Contains pure, stateless business logic related to the campaign.
 * No side effects, no state mutations.
 */
import { Campaign, CampaignLogEntry, Ship, TravelEvent, World, Battle, BattleParticipant, Rival, Character, InjuryResultData, Crew, LootItem, CharacterStats, WorldTrait, RaceId, Stash, LootResult } from '../../types';
import { rollD6, rollD100, rollD10 } from '../utils/rolls';
import { resolveTable } from '../utils/tables';
import { STARSHIP_TRAVEL_EVENTS_TABLE, WORLD_TRAITS_TABLE } from '../../constants/travel';
import { INJURY_TABLE, BOT_INJURY_TABLE } from '../../constants/injuries';
import { getLootFromTradeTable, rollOnLootTable } from '../lootService';
import { generateNewRecruit } from '../characterService';
import { getWeaponById } from '../data/items';
import { useShipStore } from '../../stores/shipStore';
import { cloneDeep } from '../utils/cloneDeep';

const _triggerShipDestructionSequence = (campaign: Campaign, logKey: string): void => {
    campaign.log.push({ key: logKey, turn: campaign.turn });
    campaign.ship = null;
    campaign.credits = 0;
    campaign.stash = { weapons: [], armor: [], screen: [], consumables: [], sights: [], gunMods: [], implants: [], utilityDevices: [], onBoardItems: [] };
    campaign.pendingGearChoiceAfterShipDestruction = true;
    campaign.activeTravelEvent = null;
    campaign.pendingTravelCompletion = null;
};

export class CampaignDomain {

    static generateNewWorld(isRedZone: boolean = false): World {
        const world: World = {
            name: `Sector ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${rollD100()}`,
            traits: [],
            isRedZone,
        };

        const trait1 = { ...resolveTable(WORLD_TRAITS_TABLE, rollD100()).value };
        let trait2 = { ...resolveTable(WORLD_TRAITS_TABLE, rollD100()).value };
        while(trait1.id === trait2.id) {
            trait2 = { ...resolveTable(WORLD_TRAITS_TABLE, rollD100()).value };
        }

        world.traits.push(trait1, trait2);

        world.traits.forEach(trait => {
            if (trait.id === 'alien_species_restricted') {
                const roll = rollD10();
                let restricted: RaceId;
                if (roll <= 1) restricted = 'engineer';
                else if (roll <= 4) restricted = 'kerin';
                else if (roll <= 5) restricted = 'soulless';
                else if (roll <= 6) restricted = 'precursor';
                else if (roll <= 9) restricted = 'feral';
                else restricted = 'swift';
                trait.restrictedAlienSpecies = restricted;
            }
        });

        if (world.traits.some(t => t.id === 'interdiction')) {
            world.interdictionTurnsRemaining = Math.ceil(rollD6() / 2); // 1D3
            world.interdictionLicenseAttempted = false;
        }

        const licenseRoll = rollD6();
        if (licenseRoll >= 5) {
            world.licenseRequired = true;
            world.licenseCost = rollD6();
            world.licenseOwned = false;
        }

        return world;
    }

    static calculateUpkeepCost(activeCrewCount: number, hasRationPacks: boolean, hasBasicSupplies: boolean, ship: Ship | null, world: World | null): number {
        if (hasRationPacks || hasBasicSupplies) return 0;
        
        let effectiveCrewCount = activeCrewCount;

        if (world?.traits.some(t => t.id === 'high_cost')) {
            effectiveCrewCount += 2;
        }

        if (ship?.components.includes('living_quarters')) {
            effectiveCrewCount = Math.max(0, effectiveCrewCount - 2);
        }
        if (effectiveCrewCount < 4) return 0;
        if (effectiveCrewCount <= 6) return 1;
        return 1 + (effectiveCrewCount - 6);
    }

    static calculateFuelCost(ship: Ship | null, campaign: Campaign | null): { cost: number, logs: Omit<CampaignLogEntry, 'turn'>[] } {
        const logs: Omit<CampaignLogEntry, 'turn'>[] = [];
        let baseCost = 5;
        let finalCost = baseCost;

        if (campaign?.currentWorld?.traits.some(t => t.id === 'fuel_refinery')) {
            const cost = 3;
            logs.push({ key: 'log.campaign.travel.fuelRefinery', params: { trait: 'worldtraits.fuel_refinery.name', cost } });
            return { cost, logs };
        }
        if (!ship) return { cost: baseCost, logs };

        finalCost = baseCost;

        if (ship.traits.includes('fuel_efficient')) {
            finalCost -= 1;
            logs.push({ key: 'log.trait.shipTraitFuelReduced', params: { trait: 'ship_traits.fuel_efficient', amount: 1 } });
        }
        if (ship.traits.includes('fuel_hog')) {
            finalCost += 1;
            logs.push({ key: 'log.trait.shipTraitFuelIncreased', params: { trait: 'ship_traits.fuel_hog', amount: 1 } });
        }
        if (ship.components.includes('military_fuel_converters')) {
            finalCost -= 2;
            logs.push({ key: 'log.trait.shipComponentFuelReduced', params: { component: 'ship_components.military_fuel_converters', amount: 2 } });
        }
        const componentPenalty = Math.floor(ship.components.length / 3);
        if (componentPenalty > 0) {
            finalCost += componentPenalty;
            logs.push({ key: 'log.campaign.travel.fuelComponentPenalty', params: { amount: componentPenalty } });
        }

        if (campaign?.currentWorld?.traits.some(t => t.id === 'fuel_shortage') && campaign.currentWorld.fuelShortageCost) {
            const extraCost = campaign.currentWorld.fuelShortageCost;
            finalCost += extraCost;
            logs.push({ key: 'log.campaign.travel.fuelWorldTrait', params: { trait: 'worldtraits.fuel_shortage.name', cost: `+${extraCost}` } });
        }
        
        return { cost: Math.max(0, finalCost), logs };
    }

    static calculateHullDamage(ship: Ship, baseDamage: number, isEmergencyTakeoff: boolean = false): { finalDamage: number; logs: Omit<CampaignLogEntry, 'turn'>[] } {
        const logs: Omit<CampaignLogEntry, 'turn'>[] = [];
        let damageSustained = baseDamage;

        if (ship.traits.includes('dodgy_drive') && baseDamage > 0) {
            const dodgyRoll = rollD6() + rollD6();
            if (dodgyRoll <= baseDamage) {
                damageSustained += 2;
                logs.push({ key: 'log.trait.dodgyDriveTriggered', params: { roll: dodgyRoll, damage: baseDamage } });
            }
        }

        if (isEmergencyTakeoff && ship.traits.includes('emergency_drives')) {
            const reduction = Math.min(damageSustained, 3);
            damageSustained = Math.max(0, damageSustained - 3);
            if (reduction > 0) {
                logs.push({ key: 'log.trait.shipTraitDamageReduction', params: { trait: 'ship_traits.emergency_drives', reduction } });
            }
        }

        if (ship.traits.includes('armored')) {
            const reduction = Math.min(damageSustained, 1);
            damageSustained = Math.max(0, damageSustained - 1);
            if (reduction > 0) {
                logs.push({ key: 'log.trait.shipTraitDamageReduction', params: { trait: 'ship_traits.armored', reduction } });
            }
        }
        if (ship.components.includes('improved_shielding')) {
            const reduction = Math.min(damageSustained, 1);
            damageSustained = Math.max(0, damageSustained - 1);
            if (reduction > 0) {
                 logs.push({ key: 'log.trait.shipComponentDamageReduction', params: { component: 'ship_components.improved_shielding', reduction } });
            }
        }
        
        return { finalDamage: damageSustained, logs };
    }
    
    static getTravelEvent(isFleeing: boolean): TravelEvent {
        const roll = rollD100();
        const eventEntry = resolveTable(STARSHIP_TRAVEL_EVENTS_TABLE, roll).value;
        const event: TravelEvent = { eventId: eventEntry.id };

        if (event.eventId === 'locked_in_library') {
            event.data = {
                worlds: [this.generateNewWorld(), this.generateNewWorld(), this.generateNewWorld()]
            };
        }
        return event;
    }

    static setupRaidedBattle(crew: Crew): { battleOptions: any } {
        return {
            battleOptions: {
                missionType: 'FightOff' as const,
                isOutOfSequence: true,
                sourceTravelEventId: 'raided' as const,
                forceEnemyCategory: 'Criminal Elements' as const,
            }
        };
    }

    static resolveInjury(character: Character): InjuryResultData & { roll: number } {
        const roll = rollD100();
        const table = character.usesBotInjuryTable ? BOT_INJURY_TABLE : INJURY_TABLE;
        const result = resolveTable(table, roll).value;
        return { ...result, roll };
    }
    
    static applyInjuryResult(characterId: string, injuryResult: InjuryResultData, crew: Crew, campaign: Campaign): { logs: CampaignLogEntry[], wasKilled: boolean } {
        const logs: CampaignLogEntry[] = [];
        let wasKilled = false;
        
        const character = crew.members.find(c => c.id === characterId);
        if (!character) return { logs, wasKilled };

        logs.push({ key: injuryResult.descriptionKey, turn: campaign.turn, params: { name: character.name, xp: injuryResult.xpGain } });

        if (injuryResult.isDead) {
            wasKilled = true;
            // Equipment damage/loss on death is handled outside by the caller
            return { logs, wasKilled };
        }
    
        if (injuryResult.xpGain) {
            character.xp += injuryResult.xpGain;
        }
    
        if (injuryResult.recoveryTurns) {
            let turns = 0;
            if (typeof injuryResult.recoveryTurns === 'number') turns = injuryResult.recoveryTurns;
            else if (injuryResult.recoveryTurns === '1d3') turns = Math.ceil(rollD6() / 2);
            else if (injuryResult.recoveryTurns === '1d6') turns = rollD6();
            else if (injuryResult.recoveryTurns === '1d3+1') turns = Math.ceil(rollD6() / 2) + 1;
            
            if (turns > 0) {
                character.injuries.push({ id: injuryResult.id, effect: injuryResult.descriptionKey, recoveryTurns: turns });
            }
        }
    
        if (injuryResult.surgeryCost) {
            const cost = typeof injuryResult.surgeryCost === 'number' ? injuryResult.surgeryCost : rollD6();
            if (campaign.credits >= cost) {
                campaign.credits -= cost;
                logs.push({ key: 'log.info.surgeryPaid', turn: campaign.turn, params: { name: character.name, cost } });
            } else {
                const stats: (keyof CharacterStats)[] = ['speed', 'toughness'];
                const statToPenalize = stats[Math.floor(Math.random() * stats.length)];
                character.stats[statToPenalize] = Math.max(1, character.stats[statToPenalize] - 1);
                logs.push({ key: 'log.info.statPenaltyTaken', turn: campaign.turn, params: { name: character.name, stat: statToPenalize } });
            }
        }

        if (injuryResult.equipmentEffect) {
            const allItems = [
                ...character.weapons,
                ...(character.armor ? [{ instanceId: character.armor, type: 'armor' }] : []),
                ...(character.screen ? [{ instanceId: character.screen, type: 'screen' }] : []),
            ];
            if (allItems.length > 0) {
                const itemToAffect = allItems[Math.floor(Math.random() * allItems.length)];
                if (injuryResult.equipmentEffect === 'damaged') {
                    if (!character.damagedEquipment) character.damagedEquipment = [];
                    character.damagedEquipment.push({ instanceId: itemToAffect.instanceId, type: (itemToAffect as any).type, weaponId: (itemToAffect as any).weaponId });
                }
                
                character.weapons = character.weapons.filter(w => w.instanceId !== itemToAffect.instanceId);
                if (character.armor === itemToAffect.instanceId) character.armor = undefined;
                if (character.screen === itemToAffect.instanceId) character.screen = undefined;
                logs.push({ key: 'log.info.equipmentLost', turn: campaign.turn, params: { name: character.name, effect: injuryResult.equipmentEffect } });
            }
        }
        return { logs, wasKilled };
    }

    static acceptStatPenalty(crew: Crew, characterId: string): { updatedCrew: Crew } {
        const updatedCrew = cloneDeep(crew);
        const character = updatedCrew.members.find(c => c.id === characterId);
        if (character) {
            const speed = character.stats.speed;
            const toughness = character.stats.toughness;
            let statToPenalize: 'speed' | 'toughness';
    
            if (speed > toughness) {
                statToPenalize = 'speed';
            } else if (toughness > speed) {
                statToPenalize = 'toughness';
            } else {
                statToPenalize = Math.random() < 0.5 ? 'speed' : 'toughness';
            }
            
            character.stats[statToPenalize] = Math.max(1, character.stats[statToPenalize] - 1);
        }
        return { updatedCrew };
    }

    static calculateXpGains(
        participant: BattleParticipant,
        battle: Battle,
        isVictory: boolean
    ): { total: number; breakdown: { amount: number; reasonKey: string }[] } {
        if (participant.type !== 'character' || participant.noXP) {
            return { total: 0, breakdown: [] };
        }

        const breakdown: { amount: number; reasonKey: string }[] = [];
        let total = 0;

        // 1. Survived the battle
        breakdown.push({ amount: 1, reasonKey: 'postBattle.xp.reasons.survived' });
        total += 1;

        // 2. Was on the winning side
        if (isVictory) {
            breakdown.push({ amount: 1, reasonKey: 'postBattle.xp.reasons.victory' });
            total += 1;
        }

        // 3. Inflicted first casualty
        if (battle.firstCasualtyInflictedById === participant.id) {
            breakdown.push({ amount: 1, reasonKey: 'postBattle.xp.reasons.firstCasualty' });
            total += 1;
        }

        // 4. Killed unique individuals
        const uniqueKills = battle.killedUniqueIndividualIds?.filter(id => id === participant.id).length || 0;
        if (uniqueKills > 0) {
            breakdown.push({ amount: uniqueKills, reasonKey: 'postBattle.xp.reasons.killedUnique' });
            total += uniqueKills;
        }

        return { total, breakdown };
    }

    static resolveInvasionCheck(campaign: Campaign, battle: Battle): { wasInvaded: boolean; logs: CampaignLogEntry[] } {
        const logs: CampaignLogEntry[] = [];
        if (campaign.currentWorld?.traits.some(t => t.id === 'unity_safe_sector')) {
            logs.push({ key: 'log.campaign.invasion.safe_sector', turn: campaign.turn });
            return { wasInvaded: false, logs };
        }
    
        const roll = rollD6() + rollD6();
        let modifier = 0;
        const modifierLogs: Omit<CampaignLogEntry, 'turn'>[] = [];
    
        if (battle.heldTheField) {
            modifier = -1;
            modifierLogs.push({ key: 'log.campaign.invasion.heldFieldBonus' });
        }
    
        if (campaign.difficulty === 'hardcore') {
            modifier += 2;
            modifierLogs.push({ key: 'log.campaign.invasion.difficultyBonus', params: { difficulty: campaign.difficulty, bonus: 2 } });
        } else if (campaign.difficulty === 'insanity') {
            modifier += 3;
            modifierLogs.push({ key: 'log.campaign.invasion.difficultyBonus', params: { difficulty: campaign.difficulty, bonus: 3 } });
        }
    
        if (campaign.invasionCheckModifier && campaign.invasionCheckModifier > 0) {
            modifier += campaign.invasionCheckModifier;
            modifierLogs.push({ key: 'log.campaign.invasion.evidenceBonus', params: { bonus: campaign.invasionCheckModifier } });
        }
    
        const worldTraits = campaign.currentWorld?.traits || [];
        const invasionRisk = worldTraits.find(t => t.id === 'invasion_risk');
        const imminentInvasion = worldTraits.find(t => t.id === 'imminent_invasion');
        const militaryOutpost = worldTraits.find(t => t.id === 'military_outpost');
    
        if (invasionRisk) {
            modifier += 1;
            modifierLogs.push({ key: 'log.campaign.invasion.worldTraitBonus', params: { trait: invasionRisk.nameKey, bonus: 1 } });
        }
        if (imminentInvasion) {
            modifier += 2;
            modifierLogs.push({ key: 'log.campaign.invasion.worldTraitBonus', params: { trait: imminentInvasion.nameKey, bonus: 2 } });
        }
        if (militaryOutpost) {
            modifier += 2;
            modifierLogs.push({ key: 'log.campaign.invasion.worldTraitBonus', params: { trait: militaryOutpost.nameKey, bonus: 2 } });
        }
    
        const finalRoll = roll + modifier;
        logs.push(...modifierLogs.map(l => ({ ...l, turn: campaign.turn })));
        logs.push({ key: 'log.campaign.invasion.finalRoll', params: { roll, modifier, total: finalRoll }, turn: campaign.turn });
    
        return { wasInvaded: finalRoll >= 9, logs };
    }

    static resolveGalacticWarProgress(campaign: Campaign, planetName: string): { updatedCampaign: Campaign, logs: CampaignLogEntry[] } {
        const logs: CampaignLogEntry[] = [];
        const planet = campaign.galacticWar?.trackedPlanets.find(p => p.name === planetName);
        if (!planet) {
            logs.push({ key: 'log.error.generic', turn: campaign.turn });
            return { updatedCampaign: campaign, logs };
        }

        let modifier = planet.rollModifier;
        if (modifier > 0) {
            logs.push({ key: 'log.campaign.war.modifier', turn: campaign.turn, params: { reason: 'Existing Progress', mod: `+${modifier}` } });
        }

        const militaryOutpost = campaign.currentWorld?.traits.some(t => t.id === 'military_outpost');
        if (militaryOutpost) {
            modifier += 2;
            logs.push({ key: 'log.campaign.war.modifier', turn: campaign.turn, params: { reason: 'worldtraits.military_outpost.name', mod: '+2' } });
        }

        const imminentInvasion = campaign.currentWorld?.traits.some(t => t.id === 'imminent_invasion');
        if (campaign.isWorldInvaded && imminentInvasion) {
            modifier -= 1;
            logs.push({ key: 'log.campaign.war.modifier', turn: campaign.turn, params: { reason: 'worldtraits.imminent_invasion.name', mod: '-1' } });
        }

        const roll = rollD6() + rollD6();
        const total = roll + modifier;

        logs.push({ key: 'log.campaign.war.roll', turn: campaign.turn, params: { planetName, roll, modifier, total } });

        if (total <= 4) {
            planet.status = 'lost';
            logs.push({ key: 'log.campaign.war.lost', turn: campaign.turn, params: { planetName } });
        } else if (total >= 5 && total <= 7) {
            planet.status = 'contested';
            logs.push({ key: 'log.campaign.war.contested', turn: campaign.turn, params: { planetName } });
        } else if (total >= 8 && total <= 9) {
            planet.status = 'contested';
            planet.rollModifier++;
            logs.push({ key: 'log.campaign.war.makingGround', turn: campaign.turn, params: { planetName } });
        } else { // 10+
            planet.status = 'liberated';
            logs.push({ key: 'log.campaign.war.liberated', turn: campaign.turn, params: { planetName } });
        }

        return { updatedCampaign: campaign, logs };
    }

    static resolveRivalActivity(decoys: number, rivals: Rival[]): { 
        tracked: boolean; 
        rivalId: string | null;
        roll: number;
        rivalsCount: number;
    } {
        const activeRivals = rivals.filter(r => r.status === 'active');
        const rivalsCount = activeRivals.length;

        if (rivalsCount === 0) {
            return { tracked: false, rivalId: null, roll: 0, rivalsCount: 0 };
        }

        const roll = rollD6();
        
        // Per rulebook (p.85): tracked if roll <= number of rivals.
        // Per rulebook (p.78): Decoy adds +1 to the roll.
        // This makes the roll's value higher, and thus LESS likely to be <= rivalsCount.
        // A decoy correctly helps the player avoid detection.
        if (roll + decoys <= rivalsCount) {
            // Failure! Tracked.
            const trackedRival = activeRivals[Math.floor(Math.random() * activeRivals.length)];
            return { tracked: true, rivalId: trackedRival.id, roll, rivalsCount };
        } else {
            // Success! Not tracked.
            return { tracked: false, rivalId: null, roll, rivalsCount };
        }
    }
}