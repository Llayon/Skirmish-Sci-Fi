import React, { useState, useMemo, lazy, Suspense } from 'react';
import Card from '@/components/ui/Card';
import CharacterCard from '@/components/CharacterCard';
import { Users, CalendarPlus, Target, Briefcase, Search, Rocket, Wind, AlertTriangle, Save, LogOut, Star, Dices, Swords, Coins } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore, useCrewStore, useShipStore, useBattleStore } from '@/stores';
import UpkeepPanel from '@/components/campaign/UpkeepPanel';
import CrewTasks from '@/components/campaign/CrewTasks';
import JobBoard from '@/components/campaign/JobBoard';
import ActiveMissionCard from '@/components/campaign/ActiveMissionCard';
import Tooltip from '@/components/ui/Tooltip';
import QuestAndRumorPanel from '@/components/campaign/QuestAndRumorPanel';
import ShipStashPanel from '@/components/campaign/ShipStashPanel';
import { useCampaignActions } from '@/hooks/useCampaignActions';
import WorldInfoCard from '@/components/campaign/WorldInfoCard';
import CampaignEventModal from '@/components/campaign/CampaignEventModal';
import InventoryManagementModal from '@/components/campaign/InventoryManagementModal';
import TradeEventModal from '@/components/campaign/TradeEventModal';
import { sanitizeToText } from '@/services/utils/sanitization';
import { preloadBattleView } from '@/services/utils/componentPreloader';
import StoryPointActions from './campaign/StoryPointActions';
import ContactsPanel from './campaign/ContactsPanel';
import PrecursorEventChoiceModal from './campaign/PrecursorEventChoiceModal';
import BotUpgradeModal from './campaign/BotUpgradeModal';
import ShipDestructionModal from '@/components/campaign/ShipDestructionModal';
import SellGearForFuelModal from './campaign/SellGearForFuelModal';
import TravelModal from './campaign/TravelModal';
import ShipAcquisitionPanel from './campaign/ShipAcquisitionPanel';
import BureaucracyBribeModal from './campaign/BureaucracyBribeModal';
import FreeTradeChoiceModal from './campaign/FreeTradeChoiceModal';
import RecruitChoiceModal from './campaign/RecruitChoiceModal';
import TradeGoodsModal from './campaign/TradeGoodsModal';
import Modal from './ui/Modal';
import type { Crew, Stash } from '@/types';

const DuplicatorModal = lazy(() => import('./campaign/DuplicatorModal'));
const FixerModal = lazy(() => import('./campaign/FixerModal'));

type SellableItem = {
  charId: string | 'stash';
  instanceId: string;
  itemId: string;
  itemType: string;
  name: string;
};

type FleeItemLossModalProps = {
    crew: Crew | null;
    stash: Stash | null;
    pendingFleeItemLoss: { count: number };
    resolveFleeItemLoss: (items: SellableItem[]) => void;
};

const FleeItemLossModal: React.FC<FleeItemLossModalProps> = ({
    crew,
    stash,
    pendingFleeItemLoss,
    resolveFleeItemLoss,
}) => {
    const { t } = useTranslation();
    const [selectedItems, setSelectedItems] = useState<SellableItem[]>([]);

    const allItems: SellableItem[] = useMemo(() => {
        const items: SellableItem[] = [];
        if (!crew || !stash) return items;
        
        for (const char of crew.members) {
          const charName = sanitizeToText(char.name);
          char.weapons.forEach(w => items.push({ charId: char.id, instanceId: w.instanceId, itemId: w.weaponId, itemType: 'weapon', name: `${t(`weapons.${w.weaponId}`)} (${charName})` }));
          if (char.armor) items.push({ charId: char.id, instanceId: char.armor, itemId: char.armor, itemType: 'armor', name: `${t(`protective_devices.${char.armor}`)} (${charName})` });
          if (char.screen) items.push({ charId: char.id, instanceId: char.screen, itemId: char.screen, itemType: 'screen', name: `${t(`protective_devices.${char.screen}`)} (${charName})` });
          char.consumables.forEach(c => items.push({ charId: char.id, instanceId: c, itemId: c, itemType: 'consumable', name: `${t(`consumables.${c}`)} (${charName})` }));
        }
        
        stash.weapons.forEach(w => items.push({ charId: 'stash', instanceId: w.instanceId, itemId: w.weaponId, itemType: 'weapon', name: `${t(`weapons.${w.weaponId}`)} (Stash)` }));
        stash.armor.forEach(a => items.push({ charId: 'stash', instanceId: a, itemId: a, itemType: 'armor', name: `${t(`protective_devices.${a}`)} (Stash)` }));
        stash.screen.forEach(s => items.push({ charId: 'stash', instanceId: s, itemId: s, itemType: 'screen', name: `${t(`protective_devices.${s}`)} (Stash)` }));
        stash.consumables.forEach(c => items.push({ charId: 'stash', instanceId: c, itemId: c, itemType: 'consumable', name: `${t(`consumables.${c}`)} (Stash)` }));
        return items;
    }, [crew, stash, t]);

    const handleToggleItem = (item: SellableItem) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.instanceId === item.instanceId);
            if (isSelected) {
                return prev.filter(i => i.instanceId !== item.instanceId);
            }
            if (prev.length < pendingFleeItemLoss.count) {
                return [...prev, item];
            }
            return prev;
        });
    };
    
    const isConfirmDisabled = selectedItems.length !== pendingFleeItemLoss.count;

    return (
        <Modal onClose={() => {}} disableClose={true} title="Emergency Evacuation">
            <Card className="w-full max-w-2xl bg-surface-overlay !p-0">
                <div className='p-6'>
                    <div className='text-center mb-4'>
                        <AlertTriangle className='w-12 h-12 text-danger mx-auto mb-4' />
                        <h3 className='text-xl font-bold text-danger'>Escape without a Ship</h3>
                        <p className='text-text-muted mt-2'>You have escaped, but must leave things behind. You lose all credits. Select {pendingFleeItemLoss.count} item(s) to discard.</p>
                    </div>
                    <div className='space-y-2 max-h-64 overflow-y-auto pr-2 border-t border-b border-border/50 py-2'>
                        {allItems.map(item => (
                            <label key={item.instanceId} className='flex items-center gap-3 p-2 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80'>
                                <input
                                    type="checkbox"
                                    checked={selectedItems.some(i => i.instanceId === item.instanceId)}
                                    onChange={() => handleToggleItem(item)}
                                    className='form-checkbox h-4 w-4 text-primary bg-surface-base border-border focus:ring-primary'
                                    disabled={!selectedItems.some(i => i.instanceId === item.instanceId) && selectedItems.length >= pendingFleeItemLoss.count}
                                />
                                <span className='text-sm text-text-base'>{item.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className='mt-6 flex justify-end gap-4'>
                        <Button onClick={() => resolveFleeItemLoss(selectedItems)} disabled={isConfirmDisabled} variant='primary'>
                           Confirm and Continue
                        </Button>
                    </div>
                </div>
            </Card>
        </Modal>
    );
};

/**
 * Props for the CampaignDashboard component.
 * @property {() => void} onSaveGame - Callback function to open the save game modal.
 * @property {() => void} onExitToMenu - Callback function to save and exit to the main menu.
 */
interface CampaignDashboardProps {
  onSaveGame: () => void;
  onExitToMenu: () => void;
}

/**
 * The main hub for managing the campaign between battles.
 * It displays crew status, ship info, job offers, and provides actions for the player to take.
 * It uses a CSS Grid layout to organize its various panels.
 * @param {CampaignDashboardProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered dashboard, or null if essential data is missing.
 */
const CampaignDashboard: React.FC<CampaignDashboardProps> = ({ onSaveGame, onExitToMenu }) => {
  const { t } = useTranslation();

  const crew = useCrewStore(state => state.crew);
  const campaign = useCampaignProgressStore(state => state.campaign);
  const { stash } = useShipStore(state => state);
  const { finalizeGearChoice, resolveCharacterEvent, completeFleeSequence, updateCampaign, purchaseCommercialPassage, resolveFleeItemLoss } = useCampaignProgressStore(state => state.actions);
  const { startBattle } = useBattleStore(state => state.actions);
  const { ship } = useShipStore(state => state);
  const [editingInventoryFor, setEditingInventoryFor] = useState<string | null>(null);
  const [upgradingBotFor, setUpgradingBotFor] = useState<string | null>(null);
  const [isSellGearModalOpen, setIsSellGearModalOpen] = useState(false);
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [charForEvent, setCharForEvent] = useState('');

  const { advanceTurn, startMission, findOpportunity, confrontRival, playWithFriend, fleeInvasion, fuelCostDetails } = useCampaignActions();

  const crewMembers = crew?.members;
  const crewName = crew?.name;
  const {
    campaignPhase, turn, storyPoints, credits, debt,
    activeMission, locatedRivalId,
    currentWorld, isWorldInvaded, activeTravelEvent, tasksFinalized,
    pendingPrecursorEventChoice,
    pendingGearChoiceAfterShipDestruction,
    pendingFleeCharacterEvent,
    characterEventResult,
    pendingInvasionBattleGearUp,
    pendingBureaucracyBribe,
    pendingTradeChoice,
    pendingRecruitChoice,
    pendingTradeGoodsSale,
    pendingItemChoice,
    pendingFleeItemLoss,
  } = campaign || {};

  const characterToEdit = useMemo(() => {
    if (!editingInventoryFor || !crew) return null;
    return crew.members.find(c => c.id === editingInventoryFor);
  }, [editingInventoryFor, crew]);
  
  const botToUpgrade = useMemo(() => {
    if (!upgradingBotFor || !crew) return null;
    return crew.members.find(c => c.id === upgradingBotFor && c.canInstallBotUpgrades);
  }, [upgradingBotFor, crew]);


  if (!crewMembers || campaignPhase === undefined) {
    return null;
  }

  if (campaignPhase === 'upkeep') {
    return <UpkeepPanel />;
  }

  if (pendingInvasionBattleGearUp) {
    return (
        <div className='space-y-8'>
            <header>
                 <h2 className='text-2xl sm:text-3xl font-bold mb-4 font-orbitron text-danger text-center animate-pulse'>PREPARE FOR BATTLE!</h2>
                 <p className='text-text-muted text-center mb-6'>Your attempt to flee has failed. The enemy is upon you! You have time for one last equipment check before the fighting starts.</p>
                 <div className='text-center'>
                    <Button
                        variant='danger'
                        className='py-3 px-8 text-lg'
                        onClick={() => {
                            updateCampaign(c => { if(c) c.pendingInvasionBattleGearUp = false; });
                            startBattle({ battleType: 'invasion' });
                        }}
                    >
                       <Swords /> To Battle!
                    </Button>
                 </div>
            </header>
             <section className='campaign-roster col-span-5 mt-8'>
              <h3 className='text-xl sm:text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.rosterTitle')}</h3>
              <div className='flex gap-6 overflow-x-auto pb-4'>
                {crewMembers.map((char) => (
                  <div key={char.id} className='w-full max-w-md shrink-0'>
                    <CharacterCard
                      character={char}
                      onManageGear={() => setEditingInventoryFor(char.id)}
                      onUpgradeBot={() => setUpgradingBotFor(char.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
             {characterToEdit && (
                <InventoryManagementModal
                  character={characterToEdit}
                  onClose={() => setEditingInventoryFor(null)}
                />
            )}
        </div>
    );
  }
  
  if (pendingFleeItemLoss) {
    return <FleeItemLossModal crew={crew} stash={stash} pendingFleeItemLoss={pendingFleeItemLoss} resolveFleeItemLoss={resolveFleeItemLoss} />;
  }

  if (pendingFleeCharacterEvent) {
    const eventEligibleCrew = crewMembers.filter(char => !char.noXP && !char.isUnavailableForTasks);
    return (
        <div className='flex items-center justify-center min-h-[60vh]'>
            <Card className='max-w-2xl mx-auto text-center animate-fade-in'>
                 <h2 className='text-xl sm:text-2xl font-bold mb-2 font-orbitron text-primary'>Escape Successful</h2>
                 <p className='text-text-base mb-6'>You've successfully escaped the invasion. During the frantic jump to a new system, your crew has a moment to reflect. You may optionally resolve a Character Event.</p>
                
                {!characterEventResult ? (
                    <div className='space-y-4'>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                             <select
                                value={charForEvent}
                                onChange={(e) => setCharForEvent(e.target.value)}
                                className="bg-secondary border border-border rounded-md py-2 px-3 text-text-base focus:ring-2 focus:ring-primary"
                            >
                                <option value="">{t('postBattle.character_event.selectCharacter')}</option>
                                {eventEligibleCrew.map(char => (
                                    <option key={char.id} value={char.id}>{sanitizeToText(char.name)}</option>
                                ))}
                            </select>
                            <Button onClick={() => resolveCharacterEvent(charForEvent)} disabled={!charForEvent}>
                                <Dices /> {t('postBattle.character_event.rollButton')}
                            </Button>
                        </div>
                         <Button onClick={completeFleeSequence} variant='secondary'>Skip & Continue</Button>
                    </div>
                ) : (
                    <div className='animate-fade-in space-y-4'>
                        <div className="p-4 bg-surface-raised/50 rounded-md">
                            <p className="font-bold text-primary mb-2">{t(characterEventResult.key, characterEventResult.params)}</p>
                        </div>
                        <Button onClick={completeFleeSequence} variant='primary'>Continue to Next Turn</Button>
                    </div>
                )}
            </Card>
        </div>
    );
  }
  
  const mustLeaveWorld = campaign?.currentWorld?.interdictionTurnsRemaining === 0;
  const actionsDisabled = !tasksFinalized || mustLeaveWorld;
  const actionsTooltip = useMemo(() => {
    if (mustLeaveWorld) return t('dashboard.worldInfo.interdictionEnforced');
    if (!tasksFinalized) return t('dashboard.tooltips.actions.finalizeTasksFirst');
    return '';
  }, [mustLeaveWorld, tasksFinalized, t]);

  const commercialTravelCost = crewMembers.filter(m => !m.isUnavailableForTasks).length;

  const isShipDamaged = ship && ship.hull < ship.maxHull;
  const travelDisabled = ship ? ((campaign?.credits ?? 0) < fuelCostDetails.fromCredits || !tasksFinalized) : ((campaign?.credits ?? 0) < commercialTravelCost || !tasksFinalized);
  const fleeDisabledNoFuel = isWorldInvaded && (campaign?.credits ?? 0) < fuelCostDetails.fromCredits;
  
  const travelTooltip = () => {
    if (!tasksFinalized) return t('tooltips.actions.finalizeTasksFirst');
    if (ship) {
        if ((campaign?.credits ?? 0) < fuelCostDetails.fromCredits) return t('tooltips.actions.insufficientFuelDetailed', { 
            total: fuelCostDetails.total, 
            credits: fuelCostDetails.fromCredits, 
            fuel: fuelCostDetails.fromFuel 
        });
        if (isShipDamaged) return t('tooltips.actions.emergencyTakeoff');
    } else {
        if ((campaign?.credits ?? 0) < commercialTravelCost) return t('tooltips.actions.insufficientCreditsCommercial', { cost: commercialTravelCost });
    }
    return '';
  }

  return (
    <div className='space-y-8'>
      {isSellGearModalOpen && <SellGearForFuelModal onClose={() => setIsSellGearModalOpen(false)} fuelNeeded={fuelCostDetails.total} />}
      {isTravelModalOpen && <TravelModal onClose={() => setIsTravelModalOpen(false)} />}
      {activeTravelEvent && <CampaignEventModal />}
      {campaign?.pendingTradeResult && <TradeEventModal />}
      {pendingTradeGoodsSale && <TradeGoodsModal />}
      {pendingTradeChoice && <FreeTradeChoiceModal />}
      {pendingRecruitChoice && <RecruitChoiceModal />}
      {pendingPrecursorEventChoice && <PrecursorEventChoiceModal choice={pendingPrecursorEventChoice} />}
      {pendingGearChoiceAfterShipDestruction && (
        <ShipDestructionModal onConfirm={finalizeGearChoice} />
      )}
      {characterToEdit && (
        <InventoryManagementModal
          character={characterToEdit}
          onClose={() => setEditingInventoryFor(null)}
        />
      )}
       {botToUpgrade && (
        <BotUpgradeModal
          character={botToUpgrade}
          onClose={() => setUpgradingBotFor(null)}
        />
      )}
      {pendingBureaucracyBribe && <BureaucracyBribeModal />}

      <Suspense fallback={null}>
        {pendingItemChoice?.itemId === 'duplicator' && <DuplicatorModal />}
        {pendingItemChoice?.itemId === 'fixer' && <FixerModal />}
      </Suspense>


      <div className='campaign-dashboard-grid'>
        <header className='campaign-header'>
          <h2 className='text-2xl sm:text-3xl font-bold mb-4 font-orbitron text-primary'>{crewName ? sanitizeToText(crewName) : ''}</h2>
          <Card className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center'>
            <div className='p-2'>
              <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('dashboard.campaignTurn')}</h3>
              <p className='text-2xl sm:text-3xl font-bold text-primary'>{turn}</p>
            </div>
            <div className='p-2'>
              <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('crewCreator.storyPoints')}</h3>
              <p className='text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-2'><Star size={24} />{storyPoints}</p>
            </div>
            <div className='p-2'>
              <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('crewCreator.startingCredits')}</h3>
              <p className='text-2xl sm:text-3xl font-bold text-primary'>{credits}</p>
            </div>
             <div className='p-2'>
                <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('dashboard.fuelCredits')}</h3>
                <p className='text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-2'><Rocket size={20} />{campaign?.fuelCredits || 0}</p>
            </div>
            <div className='p-2'>
              <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('dashboard.debt')}</h3>
              <p className='text-2xl sm:text-3xl font-bold text-danger'>{debt}</p>
            </div>
            {ship ? (
              <div className='p-2'>
                <h3 className='text-sm text-text-muted uppercase tracking-wider'>{t('dashboard.shipHull')}</h3>
                <p className='text-2xl sm:text-3xl font-bold text-primary'>{ship.hull}/{ship.maxHull}</p>
              </div>
            ) : (
                <div className='p-2'>
                    <h3 className='text-sm text-text-muted uppercase tracking-wider'>Ship Status</h3>
                    <p className='text-xl sm:text-2xl font-bold text-danger'>Destroyed</p>
                </div>
            )}
          </Card>
        </header>

        <main className='campaign-main space-y-6'>
          {isWorldInvaded && (
            <Card className='bg-danger/30 border-danger/50 text-center'>
              <AlertTriangle className='mx-auto text-danger mb-2' size={32} />
              <h3 className='text-xl sm:text-2xl font-bold font-orbitron text-danger'>{t('dashboard.invasion.title')}</h3>
              <p className='text-danger/90 mt-2 mb-4 max-w-lg mx-auto'>{t('dashboard.invasion.description')}</p>
                {fleeDisabledNoFuel ? (
                    <Button onClick={() => setIsSellGearModalOpen(true)} variant='danger' className='py-3 px-6'>
                        <Coins size={20} /> Sell Gear to Flee
                    </Button>
                ) : (
                    <Button onClick={fleeInvasion} variant='danger' className='py-3 px-6' disabled={!tasksFinalized}>
                        <Wind size={20} /> {t('buttons.fleeInvasion')}
                    </Button>
                )}
            </Card>
          )}

          {mustLeaveWorld && (
             <Card className='bg-danger/30 border-danger/50 text-center'>
              <AlertTriangle className='mx-auto text-danger mb-2' size={32} />
              <h3 className='text-xl sm:text-2xl font-bold font-orbitron text-danger'>{t('dashboard.worldInfo.interdictionEnforced')}</h3>
            </Card>
          )}

          {!ship && <ShipAcquisitionPanel />}
          {activeMission ? <ActiveMissionCard mission={activeMission} /> : <JobBoard />}

          <CrewTasks />
        </main>

        <aside className='campaign-side space-y-6'>
          {currentWorld && <WorldInfoCard world={currentWorld} />}
          <ContactsPanel />
          <StoryPointActions />
          <QuestAndRumorPanel />
          <ShipStashPanel />
          <Card>
            <h3 className='text-xl sm:text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.actionsTitle')}</h3>
            <div className='flex flex-col gap-4'>
              <Tooltip content={actionsTooltip}>
                <div className='w-full'>
                  <Button onMouseEnter={preloadBattleView} onClick={() => findOpportunity()} variant='primary' className='py-3 w-full' disabled={actionsDisabled}>
                    <Search size={20} />
                    <span>{t('buttons.findOpportunity')}</span>
                  </Button>
                </div>
              </Tooltip>

              {activeMission && (
                <Tooltip content={actionsTooltip}>
                  <div className='w-full'>
                    <Button onMouseEnter={preloadBattleView} onClick={startMission} variant='primary' className='py-3 w-full' disabled={actionsDisabled} style={{backgroundColor: 'hsl(180, 100%, 50%)', color: 'black'}}>
                      <Briefcase size={20} />
                      <span>{t('buttons.startMission')}</span>
                    </Button>
                  </div>
                </Tooltip>
              )}

              {locatedRivalId && (
                <Tooltip content={actionsTooltip}>
                  <div className='w-full'>
                    <Button onMouseEnter={preloadBattleView} onClick={confrontRival} variant='danger' className='py-3 w-full' disabled={actionsDisabled}>
                      <Target size={20} />
                      <span>{t('buttons.confrontRival')}</span>
                    </Button>
                  </div>
                </Tooltip>
              )}
               <Tooltip content={actionsTooltip}>
                <div className='w-full'>
                  <Button onClick={playWithFriend} variant='secondary' className='py-3 w-full' disabled={actionsDisabled}>
                    <Users size={20} />
                    <span>{t('buttons.playWithFriend')}</span>
                  </Button>
                </div>
              </Tooltip>
              <Tooltip content={travelTooltip()}>
                <div className='w-full'>
                  <Button 
                    onClick={() => ship ? setIsTravelModalOpen(true) : purchaseCommercialPassage()} 
                    variant={isShipDamaged ? 'danger' : 'secondary'} 
                    className='py-3 w-full' 
                    disabled={travelDisabled}>
                    <Rocket size={20} />
                    {ship ? (
                         <span>{isShipDamaged ? t('buttons.emergencyJump', { cost: fuelCostDetails.total }) : t('buttons.travel')}</span>
                    ) : (
                         <span>{t('buttons.buyPassage', { cost: commercialTravelCost })}</span>
                    )}
                  </Button>
                </div>
              </Tooltip>
               <Tooltip content={t('dashboard.tooltips.actions.sellGearForFuelTooltip')}>
                <div className='w-full'>
                  <Button
                    onClick={() => setIsSellGearModalOpen(true)}
                    variant='secondary'
                    className='py-3 w-full'
                    disabled={actionsDisabled || !ship || !travelDisabled || (campaign?.credits ?? 0) >= fuelCostDetails.fromCredits}
                  >
                    <Coins size={20} />
                    <span>{t('buttons.sellGearForFuel')}</span>
                  </Button>
                </div>
              </Tooltip>
            </div>
          </Card>
          <Card>
            <h3 className='text-xl sm:text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.otherActions')}</h3>
            <div className='flex flex-col gap-4'>
              <Button onClick={onSaveGame} variant='secondary' className='py-3 w-full'>
                <Save size={20} />
                <span>{t('buttons.saveGame')}</span>
              </Button>
              <Button onClick={onExitToMenu} variant='secondary' className='py-3 w-full'>
                <LogOut size={20} />
                <span>{t('buttons.exitToMenu')}</span>
              </Button>
              <Tooltip content={actionsTooltip}>
                <div className='w-full'>
                  <Button onClick={advanceTurn} variant='secondary' className='py-3 w-full' disabled={actionsDisabled}>
                    <CalendarPlus size={20} />
                    <span>{t('buttons.advanceTurn')}</span>
                  </Button>
                </div>
              </Tooltip>
            </div>
          </Card>
        </aside>

        <section className='campaign-roster col-span-5'>
          <h3 className='text-xl sm:text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.rosterTitle')}</h3>
          <div className='flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory'>
            {crewMembers.map((char) => (
              <div key={char.id} className='w-80 sm:w-96 shrink-0 snap-start'>
                <CharacterCard
                  character={char}
                  onManageGear={() => setEditingInventoryFor(char.id)}
                  onUpgradeBot={() => setUpgradingBotFor(char.id)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CampaignDashboard;