import React, { useState, useCallback, useMemo } from 'react';
import { Crew, Character, Weapon, Campaign, Consumable, ProtectiveDevice, Patron, Rumor, TaskType, Ship, CharacterWeapon, EquipmentPool, RaceId, Difficulty, Stash } from '@/types';
import { generateStartingEquipment, applyRaceToCharacter } from '@/services/characterService';
import { generateStartingShip } from '@/services/shipService';
import { getWeaponById, getProtectiveDeviceById } from '@/services/data/items';
import { campaignUseCases } from '@/services';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Bot, Zap, Users, Dices, ChevronRight, PackagePlus, Briefcase, Coins, BookOpen, Shield, Pill, FerrisWheel, Rocket, Cuboid, Star } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore } from '@/stores';
import Tooltip from '@/components/ui/Tooltip';
import { RACES } from '@/constants/characterCreation';
import { Select, SelectOption } from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { sanitizeToText } from '@/services/utils/sanitization';
import { preloadCampaignDashboard } from '@/services/utils/componentPreloader';
import { rollD6 } from '@/services/utils/rolls';

/**
 * A component that guides the player through the process of creating a new crew.
 * It handles character generation, race selection, equipment distribution, leader selection,
 * and starting ship generation before kicking off the campaign.
 * @returns {React.ReactElement} The rendered crew creation screen.
 */
const CrewCreator: React.FC = () => {
  const [crewName, setCrewName] = useState('The Wanderers');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingGearFor, setEditingGearFor] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'weapons' | 'consumables' | 'protective'>('weapons');
  const [campaignBonuses, setCampaignBonuses] = useState<any>({ credits: 0, storyPoints: 0, patrons: [], questRumors: 0 });
  const [equipmentPool, setEquipmentPool] = useState<EquipmentPool>({ weapons: [], armor: [], screen: [], consumables: [] });
  const [isEquipmentGenerated, setIsEquipmentGenerated] = useState(false);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [startingStoryPoints, setStartingStoryPoints] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const [shipInfo, setShipInfo] = useState<{ ship: Ship; debt: number } | null>(null);
  const { t } = useTranslation();
  const startCampaign = useCampaignProgressStore(state => state.actions.startCampaign);

  const addCharacter = useCallback(async () => {
    if (characters.length >= 6) return;
    setIsLoading(true);
    const { character, campaignBonuses: newCharBonuses, savvyIncreased } = await campaignUseCases.addSingleCharacter();

    const updatedChars = [...characters, character];
    setCharacters(updatedChars);

    setCampaignBonuses((prevBonuses: any) => ({
        ...prevBonuses,
        storyPoints: prevBonuses.storyPoints + newCharBonuses.storyPoints,
        patrons: [...prevBonuses.patrons, ...newCharBonuses.patrons],
        questRumors: prevBonuses.questRumors + newCharBonuses.questRumors,
    }));
    
    if (updatedChars.length >= 4 && !isEquipmentGenerated) {
        const savvyIncreases = updatedChars.filter(c => {
            const baseRaceSavvy = RACES[c.raceId].baseStats.savvy || 0;
            return c.stats.savvy > baseRaceSavvy;
        }).length;
        const allStartingRolls = updatedChars.flatMap(c => c.startingRolls || []);
        const newPool = generateStartingEquipment(savvyIncreases, allStartingRolls);
        setEquipmentPool(newPool);
        setIsEquipmentGenerated(true);
    }

    setIsLoading(false);
  }, [characters, isEquipmentGenerated]);
  
  const generateFullCrew = useCallback(async () => {
    setIsLoading(true);
    
    const { characters: newCharacters, campaignBonuses: totalBonuses, savvyIncreases } = await campaignUseCases.generateFullCrew();
    
    setCharacters(newCharacters);
    setCampaignBonuses(totalBonuses);

    const allStartingRolls = newCharacters.flatMap(c => c.startingRolls || []);
    const newPool = generateStartingEquipment(savvyIncreases, allStartingRolls);
    setEquipmentPool(newPool);
    setIsEquipmentGenerated(true);

    setIsLoading(false);
  }, []);

  const handleChangeRace = (charId: string, newRaceId: RaceId) => {
      setCharacters(prev => prev.map(c => {
          if (c.id === charId) {
              return applyRaceToCharacter(c, newRaceId);
          }
          return c;
      }));
  };

  const handleGenerateShip = () => {
    const newShipInfo = generateStartingShip();
    setShipInfo(newShipInfo);
  };

  const handleRollStartingSP = () => {
    setStartingStoryPoints(rollD6() + 1);
  };

  const handleStartCampaign = () => {
    if (!shipInfo || !leaderId) return;

    const finalCharacters = characters.map(char => {
        const finalChar = { ...char };
        if (char.id === leaderId) {
            finalChar.isLeader = true;
            if (char.raceId !== 'bot') {
                finalChar.stats.luck = (finalChar.stats.luck || 0) + 1;
            }
        }
        delete finalChar.startingRolls; // clean up temporary data
        return finalChar as Character;
    });

    const fullCrew: Crew = {
      name: crewName,
      members: finalCharacters,
    };
    const initialCampaign: Campaign = {
        turn: 1,
        campaignPhase: 'actions',
        difficulty: difficulty,
        log: [{ key: 'log.info.campaignStarted', turn: 1 }],
        credits: characters.length + campaignBonuses.credits,
        storyPoints: startingStoryPoints !== null ? startingStoryPoints : (rollD6() + 1),
        debt: shipInfo.debt,
        ship: shipInfo.ship,
        patrons: campaignBonuses.patrons,
        questRumors: Array.from({ length: campaignBonuses.questRumors }, (_, i): Rumor => ({
            id: `rumor_${Date.now()}_${i}`,
            description: `A mysterious rumor #${i+1}`,
            type: 'generic'
        })),
        rivals: [],
        jobOffers: [],
        activeMission: null,
        activeQuest: null,
        stash: {
            weapons: equipmentPool.weapons.map(wId => ({ instanceId: `stash_${wId}_${Math.random()}`, weaponId: wId })),
            armor: equipmentPool.armor,
            screen: equipmentPool.screen,
            consumables: equipmentPool.consumables,
            sights: [],
            gunMods: [],
            implants: [],
            utilityDevices: [],
            onBoardItems: ['purifier', 'spare_parts', 'med-patch'],
        },
        tasksFinalized: false,
        taskResultsLog: [],
        currentWorld: null,
        fuelCredits: 0,
    };
    startCampaign(fullCrew, initialCampaign);
  };

  const canStartCampaign = characters.length >= 4 && isEquipmentGenerated;
  const canGenerateShip = canStartCampaign && !!leaderId && startingStoryPoints !== null;
  const canFinalize = canGenerateShip && !!shipInfo;

  const handleOpenGearModal = (charId: string) => {
    setEditingGearFor(charId);
    setModalTab('weapons');
  };

  const handleItemChange = (charId: string, itemId: string, type: 'weapon' | 'consumable', equip: boolean) => {
      setCharacters(prev => prev.map(c => {
          if (c.id !== charId) return c;
          
          if (type === 'weapon') {
              const weapons = (c.weapons as CharacterWeapon[] | undefined) || [];
              let newWeapons: CharacterWeapon[];

              if (equip) {
                  if (weapons.length >= 3) return c;
                  const newWeapon: CharacterWeapon = {
                      instanceId: `cw_${Date.now()}_${Math.random()}`,
                      weaponId: itemId,
                  };
                  newWeapons = [...weapons, newWeapon];
              } else {
                  // This logic is currently unused but fixed for type safety
                  const itemIndex = weapons.findIndex(w => w.weaponId === itemId);
                  if (itemIndex > -1) {
                      newWeapons = [...weapons];
                      newWeapons.splice(itemIndex, 1);
                  } else {
                      newWeapons = weapons;
                  }
              }
               return { ...c, weapons: newWeapons };
          } else { // consumable
              const consumables = c.consumables || [];
              let newConsumables: string[];

              if (equip) {
                  if (consumables.length >= 3) return c;
                  newConsumables = [...consumables, itemId];
              } else {
                  const itemIndex = consumables.indexOf(itemId);
                  if (itemIndex > -1) {
                      newConsumables = [...consumables];
                      newConsumables.splice(itemIndex, 1);
                  } else {
                      newConsumables = consumables;
                  }
              }
               return { ...c, consumables: newConsumables };
          }
      }));

      setEquipmentPool(prev => {
          const newPool = { ...prev };
          const poolKey = type === 'weapon' ? 'weapons' : 'consumables';
          if (equip) {
              const itemIndex = newPool[poolKey].indexOf(itemId);
              if (itemIndex > -1) {
                  newPool[poolKey] = [...newPool[poolKey]];
                  newPool[poolKey].splice(itemIndex, 1);
              }
          } else {
              newPool[poolKey] = [...newPool[poolKey], itemId];
          }
          return newPool;
      });
  };

  const handleProtectiveDeviceChange = (charId: string, device: ProtectiveDevice) => {
      const char = characters.find(c => c.id === charId);
      if (!char) return;

      const currentlyEquippedId = device.type === 'armor' ? char.armor : char.screen;
      const equip = currentlyEquippedId !== device.id;

      setCharacters(prev => prev.map(c => {
          if (c.id !== charId) return c;
          const newChar = { ...c };
          if (equip) {
              if (device.type === 'armor') newChar.armor = device.id;
              if (device.type === 'screen') newChar.screen = device.id;
          } else {
              if (device.type === 'armor') newChar.armor = undefined;
              if (device.type === 'screen') newChar.screen = undefined;
          }
          return newChar;
      }));

      setEquipmentPool(prev => {
          const newPool = { ...prev };
          const poolKey = device.type; // 'armor' or 'screen'
          if (equip) {
              const itemIndex = newPool[poolKey].indexOf(device.id);
              if (itemIndex > -1) {
                  newPool[poolKey] = [...newPool[poolKey]];
                  newPool[poolKey].splice(itemIndex, 1);
              }
          } else {
              newPool[poolKey] = [...newPool[poolKey], device.id];
          }
          return newPool;
      });
  };

  const handleCloseGearModal = () => {
      setEditingGearFor(null);
  };
  
  const raceOptions: SelectOption[] = useMemo(() => {
    return Object.values(RACES).map(race => ({
        value: race.id,
        label: t(race.nameKey)
    }));
  }, [t]);

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 font-orbitron text-primary">{t('crewCreator.title')}</h2>
        <p className="text-center text-text-muted mb-6">{t('crewCreator.subtitle')}</p>
        
        <div className="mb-6">
          <label htmlFor="crewName" className="block text-sm font-medium text-text-base mb-2">{t('crewCreator.crewNameLabel')}</label>
          <input
            type="text"
            id="crewName"
            value={crewName}
            onChange={(e) => setCrewName(e.target.value)}
            className="w-full bg-surface-overlay border border-border rounded-md py-2 px-3 text-text-base focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-text-base mb-2">{t('crewCreator.difficultyLabel')}</label>
          <div className="flex flex-wrap gap-2">
            {(['easy', 'normal', 'challenging', 'hardcore', 'insanity'] as Difficulty[]).map(d => (
              <Button
                key={d}
                variant={difficulty === d ? 'primary' : 'secondary'}
                onClick={() => setDifficulty(d)}
              >
                {t(`crewCreator.difficulties.${d}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 justify-center">
          <Button onClick={generateFullCrew} disabled={isLoading || characters.length > 0} isLoading={isLoading}>
              <Dices size={18} /> {t('buttons.generateCrew')}
          </Button>
          <Button onClick={addCharacter} disabled={isLoading || characters.length >= 6} isLoading={isLoading}>
              <Users size={18} /> {t('buttons.addCharacter')}
          </Button>
        </div>
        
        {characters.length > 0 && (
          <Card className="mb-8 bg-surface-base/40">
            <h3 className="text-lg font-bold text-primary font-orbitron mb-3">{t('crewCreator.campaignBonusesTitle')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-2 bg-surface-overlay rounded-md">
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><Coins size={20}/> {characters.length + campaignBonuses.credits}</p>
                <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.startingCredits')}</h4>
              </div>
              <div className="p-2 bg-surface-overlay rounded-md">
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><BookOpen size={20}/> {2 + campaignBonuses.storyPoints}</p>
                <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.storyPoints')}</h4>
              </div>
              <div className="p-2 bg-surface-overlay rounded-md">
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><Briefcase size={20}/> {campaignBonuses.patrons.length}</p>
                <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.patrons')}</h4>
              </div>
              <div className="p-2 bg-surface-overlay rounded-md">
                 <p className="text-2xl font-bold text-primary flex items-center justify-center gap-2"><Dices size={20}/> {campaignBonuses.questRumors}</p>
                <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.questRumors')}</h4>
              </div>
            </div>
          </Card>
        )}

        {isEquipmentGenerated && (
            <Card className="mb-8 bg-surface-base/40">
                <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2"><Cuboid size={18} /> {t('crewCreator.equipmentPool')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <h4 className="font-bold text-text-muted uppercase tracking-wider text-xs">{t('characterCard.weapons')}</h4>
                        <ul className="list-disc list-inside marker:text-primary pl-2">
                           {equipmentPool.weapons.map((id, i) => <li key={`${id}-${i}`}>{t(`weapons.${id}`)}</li>)}
                           {equipmentPool.weapons.length === 0 && <li className="text-text-muted italic">{t('characterCard.none')}</li>}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-text-muted uppercase tracking-wider text-xs">{t('characterCard.equipment')}</h4>
                        <ul className="list-disc list-inside marker:text-primary pl-2">
                           {equipmentPool.armor.map((id, i) => <li key={`${id}-${i}`}>{t(`protective_devices.${id}`)} ({t('dashboard.shipStash.armor')})</li>)}
                           {equipmentPool.screen.map((id, i) => <li key={`${id}-${i}`}>{t(`protective_devices.${id}`)} ({t('dashboard.shipStash.screen')})</li>)}
                           {(equipmentPool.armor.length + equipmentPool.screen.length) === 0 && <li className="text-text-muted italic">{t('characterCard.none')}</li>}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-text-muted uppercase tracking-wider text-xs">{t('dashboard.shipStash.consumables')}</h4>
                        <ul className="list-disc list-inside marker:text-primary pl-2">
                           {equipmentPool.consumables.map((id, i) => <li key={`${id}-${i}`}>{t(`consumables.${id}`)}</li>)}
                           {equipmentPool.consumables.length === 0 && <li className="text-text-muted italic">{t('characterCard.none')}</li>}
                        </ul>
                    </div>
                </div>
            </Card>
        )}

        <div className="space-y-4 mb-8">
          {characters.map((char) => (
            <Card key={char.id} className="bg-surface-raised/60 flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-grow">
                  <h4 className="font-bold text-lg text-primary">{sanitizeToText(char.name) || `Member...`}</h4>
                  <p className="text-sm text-text-base">{char.strangeCharacterId ? t(`strange_characters.${char.strangeCharacterId}`) : t(`races.${char.raceId}`)} &bull; {t(`backgrounds.${char.backgroundId}`)} &bull; {t(`motivations.${char.motivationId}`)} &bull; {t(`classes.${char.classId}`)}</p>
                  {char.motivationId && <p className="text-xs text-primary/90 mt-1 italic">"{t(`crewCreator.motivations.${char.motivationId}_desc`)}"</p>}
                   <div className="mt-2 text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <div>
                        <h5 className="font-bold text-text-muted uppercase tracking-wider">{t('characterCard.weapons')}</h5>
                        <ul className="list-disc list-inside marker:text-primary pl-2">
                            {(char.weapons || []).map(w => <li key={w.instanceId}>{t(`weapons.${w.weaponId}`)}</li>)}
                            {(char.weapons || []).length === 0 && <li className="text-text-muted italic">{t('characterCard.none')}</li>}
                        </ul>
                    </div>
                     <div>
                        <h5 className="font-bold text-text-muted uppercase tracking-wider">{t('characterCard.equipment')}</h5>
                        <ul className="list-disc list-inside marker:text-primary pl-2">
                            {char.armor && <li>{t(`protective_devices.${char.armor}`)}</li>}
                            {char.screen && <li>{t(`protective_devices.${char.screen}`)}</li>}
                            {(char.consumables || []).map(cId => <li key={cId}>{t(`consumables.${cId}`)}</li>)}
                            {(!char.armor && !char.screen && (char.consumables || []).length === 0) && <li className="text-text-muted italic">{t('characterCard.none')}</li>}
                        </ul>
                    </div>
                  </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[180px] self-start sm:self-center">
                 <Select 
                    value={char.raceId}
                    onChange={(newRaceId) => handleChangeRace(char.id, newRaceId as RaceId)}
                    options={raceOptions}
                    aria-label={`Select race for ${char.name}`}
                    disabled={!!char.strangeCharacterId}
                />
                <Button onClick={() => handleOpenGearModal(char.id!)} variant="secondary" disabled={!isEquipmentGenerated}>
                    <PackagePlus size={16} /> {t('buttons.manageLoadout')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        {canStartCampaign && (
            <>
                <Card className="mb-8 bg-surface-base/40">
                    <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2">
                        <Star size={18} /> {t('crewCreator.selectLeaderTitle')}
                    </h3>
                    <p className="text-sm text-text-muted mb-4">{t('crewCreator.selectLeaderSubtitle')}</p>
                    <div className="space-y-2">
                        {characters.map(char => (
                            <label key={char.id} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border-2 ${leaderId === char.id ? 'bg-primary/20 border-primary' : 'bg-surface-overlay border-transparent hover:border-border'}`}>
                                <input
                                    type="radio"
                                    name="leaderSelection"
                                    checked={leaderId === char.id}
                                    onChange={() => setLeaderId(char.id!)}
                                    className="form-radio h-5 w-5 text-primary bg-surface-base border-border focus:ring-primary"
                                />
                                <div>
                                    <span className="font-bold text-text-base">{sanitizeToText(char.name)}</span>
                                    <span className="text-sm text-text-muted block">{char.strangeCharacterId ? t(`strange_characters.${char.strangeCharacterId}`) : t(`races.${char.raceId}`)} / {t(`classes.${char.classId}`)}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </Card>
                <Card className="mb-8 bg-surface-base/40">
                    <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2">
                        <Dices size={18} /> {t('crewCreator.storyPoints')}
                    </h3>
                    <div className="text-center">
                        {startingStoryPoints === null ? (
                            <>
                                <p className="text-text-muted mb-4">{t('crewCreator.rollStartingSP')}</p>
                                <Button onClick={handleRollStartingSP}>
                                    {t('buttons.roll')} (1D6+1)
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-text-base mb-2">{t('crewCreator.youStartWith')}</p>
                                <p className="text-5xl font-bold text-primary font-orbitron">{startingStoryPoints}</p>
                            </>
                        )}
                    </div>
                </Card>
            </>
        )}
        
        {canStartCampaign && (
            <div className="text-center border-t border-border pt-6">
                {!shipInfo ? (
                    <>
                        <h3 className="text-xl font-bold mb-2 text-primary">{t('crewCreator.shipSectionTitle')}</h3>
                        <p className="text-text-muted mb-4">{t('crewCreator.shipSectionSubtitle')}</p>
                        <Tooltip content={!canGenerateShip ? t('crewCreator.selectLeaderFirst') : ''}>
                           <div className="inline-block">
                               <Button onClick={handleGenerateShip} disabled={!canGenerateShip}>
                                   <Rocket size={18} /> {t('buttons.generateShip')}
                               </Button>
                           </div>
                        </Tooltip>
                    </>
                ) : (
                    <div className="space-y-4">
                        <Card className="text-left bg-surface-base/40">
                             <h3 className="text-xl font-bold font-orbitron text-primary mb-3 flex items-center gap-2">
                                <Rocket size={20}/> {t('crewCreator.shipSectionTitle')}
                             </h3>
                             <p className="text-lg font-bold text-primary">{t(shipInfo.ship.nameKey)}</p>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-center">
                                <div className="p-2 bg-surface-overlay rounded-md">
                                    <p className="text-2xl font-bold text-primary">{shipInfo.ship.hull}/{shipInfo.ship.maxHull}</p>
                                    <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.hull')}</h4>
                                </div>
                                <div className="p-2 bg-surface-overlay rounded-md">
                                    <p className="text-2xl font-bold text-danger">{shipInfo.debt}</p>
                                    <h4 className="text-sm text-text-muted uppercase tracking-wider">{t('crewCreator.debt')}</h4>
                                </div>
                                <div className="p-2 bg-surface-overlay rounded-md col-span-2 md:col-span-1">
                                    <h4 className="text-sm text-text-muted uppercase tracking-wider mb-1">{t('crewCreator.traits')}</h4>
                                    <div className="text-primary/90 text-sm font-semibold">
                                        {shipInfo.ship.traits.length > 0 ? shipInfo.ship.traits.map(trait => (
                                            <Tooltip key={trait} content={t(`tooltips.ship_traits.${trait}`)}>
                                                <p className="underline decoration-dotted cursor-help">{t(`ship_traits.${trait}`)}</p>
                                            </Tooltip>
                                        )) : <p className="text-text-muted italic">{t('crewCreator.noTraits')}</p>}
                                    </div>
                                </div>
                             </div>
                        </Card>
                         <h3 className="text-xl font-bold mb-2 text-success pt-4">{t('crewCreator.readyMessage')}</h3>
                         <p className="text-text-muted mb-4">{t('crewCreator.readySubtitle')}</p>
                        <Tooltip content={!canFinalize ? t('crewCreator.generateShipFirst') : ''}>
                            <div className="inline-block">
                                <Button onMouseEnter={preloadCampaignDashboard} onClick={handleStartCampaign} disabled={isLoading || !canFinalize}>
                                    {t('buttons.startCampaign')} <ChevronRight size={20} />
                                </Button>
                            </div>
                        </Tooltip>
                    </div>
                )}
            </div>
        )}
      </Card>

      {editingGearFor && (
        <Modal
          onClose={handleCloseGearModal}
          title={t('crewCreator.loadoutModalTitle')}
        >
            <Card className="w-full max-w-sm md:max-w-2xl lg:max-w-4xl bg-surface-overlay max-h-[90vh] !p-0">
                <p className="text-text-muted mb-4 px-6">{t('crewCreator.loadoutModalSubtitle', {name: sanitizeToText(characters.find(c => c.id === editingGearFor)?.name) || ''})}</p>
                
                <div className="px-6">
                    <Tabs defaultValue="weapons">
                        <TabsList>
                            <TabsTrigger value="weapons"><FerrisWheel size={16} /> {t('crewCreator.weaponsTab')}</TabsTrigger>
                            <TabsTrigger value="protective"><Shield size={16} /> {t('crewCreator.protectiveTab')}</TabsTrigger>
                            <TabsTrigger value="consumables"><Pill size={16} /> {t('crewCreator.consumablesTab')}</TabsTrigger>
                        </TabsList>

                        <div className="overflow-y-auto flex-grow pr-2 -mr-2 py-4">
                            <TabsContent value="weapons">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {equipmentPool.weapons.map((weaponId, index) => {
                                        const weapon = getWeaponById(weaponId)!;
                                        const character = characters.find(c => c.id === editingGearFor);
                                        const isDisabled = (character?.weapons?.length || 0) >= 3;

                                        return (
                                            <div key={`${weapon.id}-${index}`} className={`p-3 rounded-md border transition-all bg-secondary/50 border-border ${isDisabled ? 'opacity-50' : 'hover:border-primary'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h5 className="font-bold text-primary">{t(`weapons.${weapon.id}`)}</h5>
                                                        <p className="text-xs text-text-muted italic">{weapon.traits.join(', ') || 'No traits'}</p>
                                                    </div>
                                                    <Button onClick={() => handleItemChange(editingGearFor!, weapon.id, 'weapon', true)} disabled={isDisabled} variant='secondary' className="text-xs px-3 py-1">
                                                        {t('buttons.equip')}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                            <TabsContent value="protective">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[...equipmentPool.armor, ...equipmentPool.screen].map((deviceId, index) => {
                                        const device = getProtectiveDeviceById(deviceId)!;
                                        const character = characters.find(c => c.id === editingGearFor);
                                        let isDisabled = false;
                                        if (device.type === 'armor' && character?.armor) isDisabled = true;
                                        if (device.type === 'screen' && character?.screen) isDisabled = true;

                                        return (
                                            <div key={`${device.id}-${index}`} className={`p-3 rounded-md border transition-all bg-secondary/50 border-border ${isDisabled ? 'opacity-50' : 'hover:border-primary'}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h5 className="font-bold text-primary">{t(`protective_devices.${device.id}`)}</h5>
                                                        <p className="text-sm text-text-base capitalize">{device.type}</p>
                                                    </div>
                                                    <Button onClick={() => handleProtectiveDeviceChange(editingGearFor!, device)} disabled={isDisabled} variant='secondary' className="text-xs px-3 py-1">
                                                        {t('buttons.equip')}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                             <TabsContent value="consumables">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {equipmentPool.consumables.map((consumableId, index) => {
                                        const character = characters.find(c => c.id === editingGearFor);
                                        const isDisabled = (character?.consumables?.length || 0) >= 3 || (character?.noConsumablesOrImplants);
                                        return (
                                            <div key={`${consumableId}-${index}`} className={`p-3 rounded-md border transition-all bg-secondary/50 border-border ${isDisabled ? 'opacity-50' : 'hover:border-primary'}`}>
                                                <div className="flex justify-between items-start">
                                                    <h5 className="font-bold text-primary">{t(`consumables.${consumableId}`)}</h5>
                                                    <Button onClick={() => handleItemChange(editingGearFor!, consumableId, 'consumable', true)} disabled={isDisabled} variant='secondary' className="text-xs px-3 py-1">
                                                        {t('buttons.equip')}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <div className="mt-6 text-right border-t border-border pt-4 px-6">
                    <Button onClick={handleCloseGearModal} variant="primary">{t('buttons.done')}</Button>
                </div>
            </Card>
        </Modal>
      )}
    </>
  );
};

export default CrewCreator;