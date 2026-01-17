import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Crew, TaskType, StatUpgrade, Character, CharacterWeapon, BattleParticipant, Mission, Injury, Campaign, CharacterStats, Battle, AdvancedTrainingId } from '../types';
import { campaignUseCases } from '../services';
import { useCampaignProgressStore } from './campaignProgressStore';
import { useShipStore } from './shipStore';
import { CampaignDomain } from '../services/domain/campaignDomain';
import { ADVANCED_TRAINING_COURSES } from '../constants/advancedTraining';

interface CrewState {
  crew: Crew | null;
  actions: {
    setCrew: (crew: Crew | null) => void;
    updateCrew: (recipe: (crew: Crew) => void) => void;
    assignTask: (characterId: string, task: TaskType) => void;
    spendXPForUpgrade: (characterId: string, upgrade: StatUpgrade) => void;
    upgradeBot: (characterId: string, stat: keyof CharacterStats, cost: number) => void;
    sellItemForUpkeep: (characterId: string, itemId: string, itemType: 'weapon' | 'armor' | 'screen' | 'consumable') => void;
    dismissCharacter: (characterId: string, itemToKeep?: { id: string; type: 'weapon' | 'armor' | 'screen' | 'consumable'; weaponId?: string; }) => void;
    payForMedical: (characterId: string) => void;
    resolveAndApplyInjury: (characterId: string) => any;
    payForSurgery: (characterId: string, cost: number) => void;
    acceptStatPenalty: (characterId: string) => void;
    enrollInTraining: (characterId: string, courseId: AdvancedTrainingId) => void;
    equipItemFromStash: (characterId: string, item: { instanceId?: string; weaponId?: string; id?: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'utilityDevice' }) => void;
    unequipItemToStash: (characterId: string, item: { instanceId: string; weaponId?: string; id?: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'utilityDevice' }) => void;
    attachModToWeapon: (characterId: string, weaponInstanceId: string, modId: string) => void;
    attachSightToWeapon: (characterId: string, weaponInstanceId: string, sightId: string) => void;
    detachSightFromWeapon: (characterId: string, weaponInstanceId: string) => void;
    updateFromBattle: (battle: Battle) => void;
    addRecruit: (recruit: Character) => void;
    addXp: (characterId: string, amount: number) => void;
    spendStoryPointForAction: (characterId: string) => void;
    upgradeSpecialAbility: (characterId: string, ability: 'stalker_teleport') => void;
    pruneGearAfterShipDestruction: (gearToKeep: Record<string, string[]>) => void;
    removeItems: (itemsToRemove: { charId: string; instanceId: string; itemType: string }[]) => void;
  };
}

const initialState: Omit<CrewState, 'actions'> = {
  crew: null,
};

export const useCrewStore = create<CrewState>()(
  immer((set, get) => ({
    ...initialState,
    actions: {
      setCrew: (crew) => set({ crew }),
      updateCrew: (recipe) => set(state => { if (state.crew) { recipe(state.crew); } }),
      assignTask: (characterId, task) => {
        get().actions.updateCrew(crew => {
          const char = crew.members.find(c => c.id === characterId);
          if (char) char.task = task;
        });
      },
      spendXPForUpgrade: (characterId, upgrade) => {
        get().actions.updateCrew(crew => {
          const char = crew.members.find(c => c.id === characterId);
          if (char && char.xp >= upgrade.cost) {
            char.xp -= upgrade.cost;
            char.stats[upgrade.stat]++;
          }
        });
      },
      upgradeBot: (characterId, stat, cost) => {
        const campaignStore = useCampaignProgressStore.getState();
        if ((campaignStore.campaign?.credits ?? 0) < cost) return;

        get().actions.updateCrew(crew => {
            const bot = crew.members.find(c => c.id === characterId);
            if (bot && bot.canInstallBotUpgrades && !bot.upgradedStats?.includes(stat)) {
                campaignStore.actions.spendCredits(cost);
                bot.stats[stat]++;
                if (!bot.upgradedStats) {
                    bot.upgradedStats = [];
                }
                bot.upgradedStats.push(stat);
            }
        });
      },
      sellItemForUpkeep: (characterId, itemId, itemType) => {
        let itemSold = false;
        get().actions.updateCrew(crew => {
          const character = crew.members.find(c => c.id === characterId);
          if (!character) return;

          let itemRemoved = false;
          switch (itemType) {
            case 'weapon': const wepIndex = character.weapons.findIndex(w => w.instanceId === itemId); if (wepIndex > -1) { character.weapons.splice(wepIndex, 1); itemRemoved = true; } break;
            case 'armor': if (character.armor === itemId) { character.armor = undefined; itemRemoved = true; } break;
            case 'screen': if (character.screen === itemId) { character.screen = undefined; itemRemoved = true; } break;
            case 'consumable': const conIndex = character.consumables.indexOf(itemId); if (conIndex > -1) { character.consumables.splice(conIndex, 1); itemRemoved = true; } break;
          }
          if (itemRemoved) {
            itemSold = true;
          }
        });

        if (itemSold) {
          useCampaignProgressStore.getState().actions.addCredits(1);
        }
      },
      dismissCharacter: (characterId, itemToKeep) => {
        if (itemToKeep) {
          useShipStore.getState().actions.addItemToStash({ ...itemToKeep, id: itemToKeep.id! });
        }
        get().actions.updateCrew(crew => {
          crew.members = crew.members.filter(c => c.id !== characterId);
        });
      },
      payForMedical: (characterId) => {
        const campaign = useCampaignProgressStore.getState().campaign;
        if (!campaign) return;

        const hasMedicalScience = campaign.currentWorld?.traits.some(t => t.id === 'medical_science');
        const medicalCost = hasMedicalScience ? 3 : 4;
        
        if (campaign.credits < medicalCost) return;
        
        get().actions.updateCrew(crew => {
          const character = crew.members.find(c => c.id === characterId);
          if (character && character.injuries.some(i => i.recoveryTurns > 0)) {
            const injury = character.injuries.find(i => i.recoveryTurns > 0)!;
            injury.recoveryTurns--;
            useCampaignProgressStore.getState().actions.spendCredits(medicalCost);
          }
        });
      },
      resolveAndApplyInjury: (characterId) => {
        const campaignProgress = useCampaignProgressStore.getState().campaign;
        const crew = get().crew;
        const { ship, stash } = useShipStore.getState();
        if (!campaignProgress || !crew || !ship || !stash) return;
        const campaign: Campaign = { ...campaignProgress, ship, stash };
        const { result, updatedCrew, updatedCampaign } = campaignUseCases.resolveAndApplyInjury(campaign, crew, characterId);
        
        set({ crew: updatedCrew });
        
        const { ship: newShip, stash: newStash, ...newCampaignProgress } = updatedCampaign;
        useShipStore.getState().actions.setShipAndStash(newShip, newStash);
        useCampaignProgressStore.getState().actions.updateCampaign(c => {
          Object.assign(c, newCampaignProgress);
        });

        return result;
      },
      payForSurgery: (characterId, cost) => {
        useCampaignProgressStore.getState().actions.spendCredits(cost);
      },
      acceptStatPenalty: (characterId) => {
        const crew = get().crew;
        if (!crew) return;
        const { updatedCrew } = campaignUseCases.acceptStatPenalty(crew, characterId);
        set({ crew: updatedCrew });
      },
      enrollInTraining: (characterId, courseId) => {
        const { campaign, actions: campaignActions } = useCampaignProgressStore.getState();
        const course = ADVANCED_TRAINING_COURSES.find(c => c.id === courseId);
        if (!course || !campaign) return;

        const hasExpensiveEducation = campaign.currentWorld?.traits.some(t => t.id === 'expensive_education');
        const enrollmentFee = hasExpensiveEducation ? 3 : 0;

        get().actions.updateCrew(crew => {
            const char = crew.members.find(c => c.id === characterId);
            if (!char || char.advancedTraining) return;

            const isBot = char.raceId === 'bot';
            const xpToSpend = isBot ? 0 : Math.min(char.xp, course.cost);
            const creditsForXp = course.cost - xpToSpend;
            const totalCreditsNeeded = creditsForXp + enrollmentFee;

            if (campaign.credits >= totalCreditsNeeded) {
                if (!isBot) {
                    char.xp -= xpToSpend;
                }
                char.advancedTraining = courseId;
                campaignActions.spendCredits(totalCreditsNeeded);
                campaignActions.updateCampaign(c => {
                    const logParams: { name: string, course: string, traitId?: string } = {
                        name: char.name,
                        course: course.nameKey
                    };
                    let logKey = 'log.campaign.training.enrollSuccess';
                    if (hasExpensiveEducation) {
                        logKey = 'log.campaign.training.enrollSuccess_expensive';
                    }
                    c.log.push({
                        key: logKey,
                        turn: c.turn,
                        params: logParams
                    });
                });
            }
        });
      },
      equipItemFromStash: (characterId, item) => {
        let canEquip = true;
        const char = get().crew?.members.find(c => c.id === characterId);
        if (!char) return;

        if (item.type === 'implant' && (char.implants.length >= 2 || char.noConsumablesOrImplants)) canEquip = false;
        if (item.type === 'utilityDevice' && char.utilityDevices.length >= 3) canEquip = false;
        
        if (!canEquip) return;

        const itemFromStash = useShipStore.getState().actions.removeItemFromStash(item);
        if (itemFromStash) {
            get().actions.updateCrew(crew => {
                const charToUpdate = crew.members.find(c => c.id === characterId);
                if (!charToUpdate) return;
                const instanceId = item.instanceId || item.id!;
                if (item.type === 'weapon' && item.weaponId) charToUpdate.weapons.push({ instanceId, weaponId: item.weaponId });
                else if (item.type === 'armor') charToUpdate.armor = instanceId;
                else if (item.type === 'screen') charToUpdate.screen = instanceId;
                else if (item.type === 'consumable') charToUpdate.consumables.push(instanceId);
                else if (item.type === 'implant') charToUpdate.implants.push(instanceId);
                else if (item.type === 'utilityDevice') charToUpdate.utilityDevices.push(instanceId);
            });
        }
      },
      unequipItemToStash: (characterId, item) => {
        let itemFoundOnChar = false;
        get().actions.updateCrew(crew => {
            const char = crew.members.find(c => c.id === characterId);
            if (!char) return;
            const instanceId = item.instanceId || item.id!;
            if (item.type === 'weapon') {
                const index = char.weapons.findIndex(w => w.instanceId === instanceId);
                if (index > -1) { char.weapons.splice(index, 1); itemFoundOnChar = true; }
            } else if (item.type === 'armor' && char.armor === instanceId) {
                char.armor = undefined; itemFoundOnChar = true;
            } else if (item.type === 'screen' && char.screen === instanceId) {
                char.screen = undefined; itemFoundOnChar = true;
            } else if (item.type === 'consumable') {
                const index = char.consumables.indexOf(instanceId);
                if (index > -1) { char.consumables.splice(index, 1); itemFoundOnChar = true; }
            } else if (item.type === 'implant') {
                const index = char.implants.indexOf(instanceId);
                if (index > -1) { char.implants.splice(index, 1); itemFoundOnChar = true; }
            } else if (item.type === 'utilityDevice') {
                const index = char.utilityDevices.indexOf(instanceId);
                if (index > -1) { char.utilityDevices.splice(index, 1); itemFoundOnChar = true; }
            }
        });
        if (itemFoundOnChar) {
            useShipStore.getState().actions.addItemToStash({ ...item, id: item.id ?? item.instanceId });
        }
      },
      attachModToWeapon: (characterId, weaponInstanceId, modId) => {
        const { removeModFromStash } = useShipStore.getState().actions;
        if (removeModFromStash(modId)) {
            get().actions.updateCrew(crew => {
                const weapon = crew.members.find(c => c.id === characterId)?.weapons.find(w => w.instanceId === weaponInstanceId);
                if (weapon && !weapon.modId) {
                    weapon.modId = modId;
                }
            });
        }
      },
      attachSightToWeapon: (characterId, weaponInstanceId, sightId) => {
        const { removeSightFromStash, addSightToStash } = useShipStore.getState().actions;
        get().actions.updateCrew(crew => {
            const weapon = crew.members.find(c => c.id === characterId)?.weapons.find(w => w.instanceId === weaponInstanceId);
            if (weapon) {
                // Return old sight to stash if exists
                if (weapon.sightId) {
                    addSightToStash(weapon.sightId);
                }
                // Remove new sight from stash and equip
                if (removeSightFromStash(sightId)) {
                    weapon.sightId = sightId;
                }
            }
        });
      },
      detachSightFromWeapon: (characterId, weaponInstanceId) => {
        const { addSightToStash } = useShipStore.getState().actions;
        get().actions.updateCrew(crew => {
            const weapon = crew.members.find(c => c.id === characterId)?.weapons.find(w => w.instanceId === weaponInstanceId);
            if (weapon && weapon.sightId) {
                addSightToStash(weapon.sightId);
                weapon.sightId = undefined;
            }
        });
      },
      updateFromBattle: (battle) => {
        const { participants, mission, heldTheField } = battle;
        const crew = get().crew;
        const campaign = useCampaignProgressStore.getState().campaign;
        if (!crew || !campaign) return;

        const crewBeforeUpdate = JSON.parse(JSON.stringify(crew));
        const membersBefore = crewBeforeUpdate.members.length;

        const updatedCrew = JSON.parse(JSON.stringify(crew));
        updatedCrew.members.forEach((m: Character) => {
            const updatedData = participants.find(um => um.id === m.id || um.id.endsWith(m.id));
            if (updatedData) {
                 // Apply XP
                if (!m.noXP) {
                    const { total } = CampaignDomain.calculateXpGains(updatedData, battle, mission.status === 'success');
                    m.xp += total;
                }

                // Sync battle state
                const { type, ...charData } = updatedData;
                const { id, ...restOfCharData } = charData;
                (restOfCharData as Character).taskCompletedThisTurn = true;
                
                // Merge properties, ensuring we don't overwrite campaign-persistent data with battle-transient data
                Object.assign(m, restOfCharData);
            }
        });

        set({ crew: updatedCrew });

        const membersAfter = updatedCrew.members.length;
        if (campaign.difficulty !== 'insanity' && heldTheField && membersAfter < membersBefore) {
            const deaths = membersBefore - membersAfter;
            useCampaignProgressStore.getState().actions.updateCampaign(c => {
                c.storyPoints += deaths;
                c.log.push({ key: 'log.campaign.sp.bitterDay', params: { count: deaths }, turn: c.turn });
            });
        }
      },
      addRecruit: (recruit) => {
        get().actions.updateCrew(crew => {
            if (crew.members.length < 6) {
                crew.members.push(recruit);
            }
        });
      },
      addXp: (characterId, amount) => {
        get().actions.updateCrew(crew => {
            const char = crew.members.find(c => c.id === characterId);
            if (char && !char.noXP) {
                char.xp += amount;
            }
        });
      },
      spendStoryPointForAction: (characterId) => {
        const campaignStore = useCampaignProgressStore.getState();
        if (campaignStore.campaign && campaignStore.campaign.storyPoints > 0 && !campaignStore.campaign.spForActionUsedThisTurn) {
            get().actions.updateCrew(crew => {
                const char = crew.members.find(c => c.id === characterId);
                if (char && char.taskCompletedThisTurn) {
                    campaignStore.actions.updateCampaign(c => {
                        c.storyPoints--;
                        c.spForActionUsedThisTurn = true;
                        c.log.push({ key: 'log.campaign.sp.spentForAction', turn: c.turn, params: { name: char.name } });
                    });
                    char.taskCompletedThisTurn = false;
                }
            });
        }
      },
      upgradeSpecialAbility: (characterId, ability) => {
        get().actions.updateCrew(crew => {
          const char = crew.members.find(c => c.id === characterId);
          if (!char) return;

          if (ability === 'stalker_teleport') {
            const cost = 4;
            const currentLevel = char.specialAbilityUpgrades?.stalker_teleport || 0;
            if (char.xp >= cost && currentLevel < 2) {
              char.xp -= cost;
              if (!char.specialAbilityUpgrades) {
                char.specialAbilityUpgrades = {};
              }
              char.specialAbilityUpgrades.stalker_teleport = currentLevel + 1;
            }
          }
        });
      },
      pruneGearAfterShipDestruction: (gearToKeep: Record<string, string[]>) => {
        get().actions.updateCrew(crew => {
          crew.members.forEach(char => {
            const keptIds = new Set(gearToKeep[char.id] || []);
            char.weapons = char.weapons.filter(w => keptIds.has(w.instanceId));
            if (char.armor && !keptIds.has(char.armor)) char.armor = undefined;
            if (char.screen && !keptIds.has(char.screen)) char.screen = undefined;
            char.consumables = char.consumables.filter(c => keptIds.has(c));
            char.implants = char.implants.filter(i => keptIds.has(i));
            char.utilityDevices = char.utilityDevices.filter(u => keptIds.has(u));
          });
        });
      },
      removeItems: (itemsToRemove) => {
        get().actions.updateCrew(crew => {
          itemsToRemove.forEach(item => {
            const char = crew.members.find(c => c.id === item.charId);
            if (!char) return;

            switch (item.itemType) {
              case 'weapon': char.weapons = char.weapons.filter(w => w.instanceId !== item.instanceId); break;
              case 'armor': if (char.armor === item.instanceId) char.armor = undefined; break;
              case 'screen': if (char.screen === item.instanceId) char.screen = undefined; break;
              case 'consumable': char.consumables = char.consumables.filter(c => c !== item.instanceId); break;
              // Add other types if needed
            }
          });
        });
      },
    },
  }))
);