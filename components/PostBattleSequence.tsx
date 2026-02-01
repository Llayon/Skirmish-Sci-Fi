import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useBattleStore, useCampaignProgressStore, useCrewStore, useShipStore } from '@/stores';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ChevronRight, ChevronsRight, Award, HeartCrack, TrendingUp, BookOpen, Dices, ShieldCheck, Zap, Footprints, Target, Heart, Brain, Coins, UserPlus, ShoppingCart, Calendar, UserCog, Globe } from 'lucide-react';
import { Character, Injury, BattleParticipant, StatUpgrade, Campaign, Crew, CharacterStats, AdvancedTrainingId, CampaignLogEntry } from '@/types';
import { CampaignDomain } from '@/services/domain/campaignDomain';
import Tooltip from '@/components/ui/Tooltip';
import { sanitizeToText } from '@/services/utils/sanitization';
import { rollD6 } from '@/services/utils/rolls';
import { ADVANCED_TRAINING_COURSES } from '../constants/advancedTraining';
import { Select, SelectOption } from './ui/Select';
import PrecursorEventChoiceModal from './campaign/PrecursorEventChoiceModal';

type InjuryResult = ReturnType<typeof CampaignDomain.resolveInjury>;

type InjuryResultWithUIState = InjuryResult & {
    roll?: number;
    xpGained?: number;
    surgeryPaid?: boolean;
    penaltyAccepted?: boolean;
};

/**
 * Props for the CharacterUpgradePanel component.
 * @property {Character} character - The character for whom to display upgrade options.
 */
interface CharacterUpgradePanelProps {
    character: Character;
}

/**
 * A panel nested within the PostBattleSequence screen that allows players
 * to spend XP on stat upgrades for a specific character.
 * @param {CharacterUpgradePanelProps} props - The component props.
 */
const CharacterUpgradePanel: React.FC<CharacterUpgradePanelProps> = React.memo(({ character }) => {
    const { t } = useTranslation();
    const { spendXPForUpgrade, upgradeSpecialAbility } = useCrewStore(state => state.actions);

    const upgrades: { stat: Extract<keyof CharacterStats, string>, cost: number, max: number, icon: React.ReactNode }[] = [
        { stat: 'reactions', cost: 7, max: 6, icon: <Zap size={14} /> },
        { stat: 'combat', cost: 7, max: 5, icon: <Target size={14} /> },
        { stat: 'speed', cost: 5, max: 8, icon: <Footprints size={14} /> },
        { stat: 'savvy', cost: 5, max: 5, icon: <Brain size={14} /> },
        { stat: 'toughness', cost: 6, max: 6, icon: <Heart size={14} /> },
        { stat: 'luck', cost: 10, max: (character.raceId === 'baseline_human' ? 3 : 1), icon: <Dices size={14} /> },
    ];
    
    const canUpgrade = (upgrade: typeof upgrades[0]): boolean => {
        if (character.xp < upgrade.cost) return false;
        
        const currentStat = character.stats[upgrade.stat];
        
        if (character.raceId === 'engineer' && upgrade.stat === 'toughness' && currentStat >= 4) {
            return false;
        }
        
        return currentStat < upgrade.max;
    };
    
    const handleUpgrade = (stat: keyof Character['stats'], cost: number) => {
        spendXPForUpgrade(character.id, { stat, cost });
    };

    const isStalker = character.specialAbilities?.includes('stalker_teleport');
    const stalkerUpgradeLevel = character.specialAbilityUpgrades?.stalker_teleport || 0;
    const stalkerUpgradeCost = 4;
    const canUpgradeStalker = isStalker && stalkerUpgradeLevel < 2 && character.xp >= stalkerUpgradeCost;

    return (
        <div className="mt-3 p-3 bg-surface-base/50 rounded-md border border-border/50">
            <div className="flex justify-between items-center text-sm">
                <p className="text-text-base">{t('postBattle.xp.totalXP', { xp: character.xp })}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                 {upgrades.map(u => (
                     <Tooltip key={u.stat} content={`${t(`characterCard.${u.stat}`)} - ${t('postBattle.xp.cost', { cost: u.cost })}`}>
                        <Button
                            onClick={() => handleUpgrade(u.stat, u.cost)}
                            disabled={!canUpgrade(u)}
                            variant="secondary"
                            className="w-full text-xs py-1.5"
                        >
                            {u.icon} +1 {character.stats[u.stat]}/{u.max} ({u.cost} XP)
                        </Button>
                     </Tooltip>
                 ))}
             </div>
            {isStalker && (
                <div className="mt-2 pt-2 border-t border-border/50">
                    <Tooltip content={t('postBattle.upgrades.stalkerTeleportTooltip', { cost: stalkerUpgradeCost })}>
                        <div className='inline-block w-full'>
                            <Button
                                onClick={() => upgradeSpecialAbility(character.id, 'stalker_teleport')}
                                disabled={!canUpgradeStalker}
                                variant="secondary"
                                className="w-full text-xs py-1.5"
                            >
                                <Zap size={14} /> {t('postBattle.upgrades.stalkerTeleport')} +1" ({stalkerUpgradeLevel}/2)
                            </Button>
                        </div>
                    </Tooltip>
                </div>
            )}
        </div>
    );
});
CharacterUpgradePanel.displayName = 'CharacterUpgradePanel';


const AdvancedTrainingPanel: React.FC = () => {
    const { t } = useTranslation();
    const { campaign, actions } = useCampaignProgressStore();
    const { crew, actions: crewActions } = useCrewStore();
    
    if (!campaign || !crew) return null;

    const { trainingApplicationStatus, credits, currentWorld } = campaign;
    const hasExpensiveEducation = currentWorld?.traits.some(t => t.id === 'expensive_education');
    const enrollmentFee = hasExpensiveEducation ? 3 : 0;

    const handleApply = () => {
        actions.applyForTraining();
    };

    const handleEnroll = (charId: string, courseId: AdvancedTrainingId) => {
        crewActions.enrollInTraining(charId, courseId);
    };

    if (!trainingApplicationStatus || trainingApplicationStatus === 'none') {
        return (
            <div className='text-center'>
                <p className="text-text-base mb-4">{t('postBattle.training.description')}</p>
                <Button onClick={handleApply} disabled={credits < 1}>
                    {t('postBattle.training.apply')} ({t('postBattle.training.applicationFee', { cost: 1 })})
                </Button>
            </div>
        );
    }
    
    if (trainingApplicationStatus === 'pending') {
        return <p className='italic text-text-muted'>{t('postBattle.training.applicationPending')}</p>;
    }

    if (trainingApplicationStatus === 'denied') {
        return <p className='text-warning'>{t('postBattle.training.denied')}</p>;
    }
    
    // Status is 'approved'
    return (
        <div className="w-full max-w-2xl mx-auto text-left space-y-4">
            <p className='text-success text-center font-semibold'>{t('postBattle.training.approved')}</p>
            {crew.members.map(char => {
                if (char.advancedTraining) {
                    return (
                        <div key={char.id} className="p-3 bg-surface-raised/80 rounded-md opacity-60">
                            <h5 className="font-bold text-text-base">{sanitizeToText(char.name)}</h5>
                            <p className='text-sm text-text-muted italic'>{t('postBattle.training.alreadyTrained')}: {t(`dashboard.training.${char.advancedTraining}.name`)}</p>
                        </div>
                    );
                }

                return (
                    <div key={char.id} className="p-3 bg-surface-raised/50 rounded-md">
                        <h5 className="font-bold text-primary">{sanitizeToText(char.name)} <span className='text-sm text-text-muted font-normal'>(XP: {char.xp})</span></h5>
                        <div className='mt-2 space-y-2'>
                            {ADVANCED_TRAINING_COURSES.map(course => {
                                const xpContribution = char.raceId === 'bot' ? 0 : Math.min(char.xp, course.cost);
                                const creditsForXp = course.cost - xpContribution;
                                const totalCreditCost = creditsForXp + enrollmentFee;
                                const canAfford = credits >= totalCreditCost;
                                
                                return (
                                    <div key={course.id} className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'>
                                        <div>
                                            <Tooltip content={t(course.effectKey)}>
                                                <p className='font-semibold text-text-base underline decoration-dotted cursor-help'>{t(course.nameKey)}</p>
                                            </Tooltip>
                                            <p className='text-xs text-warning'>
                                                {t('postBattle.xp.cost', { cost: course.cost })} {' '}
                                                {hasExpensiveEducation
                                                    ? t('postBattle.training.costDetails_expensive', { xpPaid: xpContribution, creditCost: creditsForXp, fee: enrollmentFee })
                                                    : t('postBattle.training.costDetails', { xpPaid: xpContribution, creditCost: creditsForXp })
                                                }
                                            </p>
                                        </div>
                                        <Button onClick={() => handleEnroll(char.id, course.id)} disabled={!canAfford} variant='secondary' className='text-xs py-1 px-2'>
                                            {t('postBattle.training.enroll')}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

/**
 * A multi-step component that guides the player through all post-battle procedures.
 * This includes resolving activities, handling injuries, awarding experience,
 * purchasing items, and rolling for random events.
 * @returns {React.ReactElement | null} The rendered post-battle sequence screen, or null if data is missing.
 */
const PostBattleSequence: React.FC = () => {
    const [step, setStep] = useState(0);
    const { t } = useTranslation();

    const { finalizeBattleResults } = useBattleStore(state => state.actions);
    const battle = useBattleStore(state => state.battle);
    const campaign = useCampaignProgressStore(state => state.campaign as Campaign);
    const crew = useCrewStore(state => state.crew as Crew);
    const { ship } = useShipStore(state => state);
    const campaignActions = useCampaignProgressStore(state => state.actions);
    const crewActions = useCrewStore(state => state.actions);

    const [injuryResults, setInjuryResults] = useState<Record<string, InjuryResultWithUIState>>({});
    const [activityResults, setActivityResults] = useState<Record<string, { key: string, params?: any }>>({});
    const [warResults, setWarResults] = useState<Record<string, CampaignLogEntry[]>>({});
    const [purchaseRollResult, setPurchaseRollResult] = useState<{name: string, type: string} | null>(null);
    const [campaignEventResult, setCampaignEventResult] = useState<{key: string, params?: any} | null>(null);
    const [charEventCharacterId, setCharEventCharacterId] = useState<string>('');
    const [charEventResult, setCharEventResult] = useState<{ key: string, params?: any } | null>(null);

    useEffect(() => {
        if (!battle || !crew || !campaign) {
            finalizeBattleResults();
        }
    }, [battle, crew, campaign, finalizeBattleResults]);

    const casualties = useMemo(() => {
        return battle?.participants.filter(p => p.type === 'character' && p.status === 'casualty' && !p.knockedOut) as Character[] | undefined;
    }, [battle]);

    const participants = useMemo(() => {
        return battle?.participants.filter(p => p.type === 'character' && p.id.includes('char_')) as Character[] | undefined;
    }, [battle]);

    if (!battle || !crew || !campaign) {
        return null;
    }
    
    const outcome = battle.mission.status;
    const heldTheField = battle.heldTheField;

    const steps = [
        { key: 'activities', titleKey: 'postBattle.activities.title', icon: <BookOpen size={24} /> },
        { key: 'injuries', titleKey: 'postBattle.injuries.title', icon: <HeartCrack size={24} /> },
        { key: 'experience', titleKey: 'postBattle.experience.title', icon: <TrendingUp size={24} /> },
        { key: 'training', titleKey: 'postBattle.training.title', icon: <UserPlus size={24} /> },
        { key: 'purchase', titleKey: 'postBattle.purchase.title', icon: <ShoppingCart size={24} /> },
        { key: 'event', titleKey: 'postBattle.event.title', icon: <Calendar size={24} /> },
        { key: 'character_event', titleKey: 'postBattle.character_event.title', icon: <UserCog size={24} /> },
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step === 2) { // After experience step
            crewActions.updateFromBattle(battle);
        }

        if (step < steps.length - 1) {
            setStep(s => s + 1);
        } else {
            finalizeBattleResults();
        }
    };
    
    const handleInjuryRoll = (charId: string) => {
        const result = crewActions.resolveAndApplyInjury(charId);
        // Roll for surgery cost and store it in state to prevent re-rolling
        if (result.surgeryCost === '1d6') {
            result.surgeryCost = rollD6();
        }
        setInjuryResults(prev => ({...prev, [charId]: result }));
    };

    const handleSurgeryPayment = (charId: string, cost: number) => {
        crewActions.payForSurgery(charId, cost);
        setInjuryResults(prev => ({...prev, [charId]: { ...prev[charId], surgeryPaid: true }}));
    };
    
    const handleStatPenalty = (charId: string) => {
        crewActions.acceptStatPenalty(charId);
        setInjuryResults(prev => ({...prev, [charId]: { ...prev[charId], penaltyAccepted: true }}));
    };

    const handleResolveActivity = (activityType: string) => {
        const result = campaignActions.resolvePostBattleActivity(activityType, battle);
        setActivityResults(prev => ({...prev, [activityType]: result }));
    }
    
    const handleResolveWarProgress = (planetName: string) => {
        const results = campaignActions.resolveGalacticWarProgress(planetName);
        setWarResults(prev => ({ ...prev, [planetName]: results }));
    };
    
    const handlePurchaseRoll = (table: 'military' | 'gear' | 'gadget') => {
        const item = campaignActions.purchaseItemRoll(table);
        if (item) {
            const itemTypeMap: Record<string, string> = {
                weapon: 'weapons',
                armor: 'protective_devices',
                screen: 'protective_devices',
                consumable: 'consumables'
            }
            const translationKey = `${itemTypeMap[item.type]}.${item.id}`;
            setPurchaseRollResult({ name: t(translationKey), type: item.type });
        }
    };
    
    const handleCampaignEventRoll = () => {
        const result = campaignActions.resolveCampaignEvent();
        if (result) {
            setCampaignEventResult(result);
        }
    }
    
    const handleCharacterEventRoll = () => {
        if (charEventCharacterId) {
            const result = campaignActions.resolveCharacterEvent(charEventCharacterId);
            if (result) {
                setCharEventResult(result);
            }
        }
    }

    const allCasualtiesHandled = casualties?.every(c => {
        const result = injuryResults[c.id];
        if (!result) return false;
        if (result.surgeryCost && !result.surgeryPaid && !result.penaltyAccepted) return false;
        return true;
    }) ?? true;

    const potentialActivities = useMemo(() => [
        { id: 'rivals', labelKey: 'postBattle.activities.rivalStatus', condition: true },
        { id: 'patrons', labelKey: 'postBattle.activities.patronStatus', condition: outcome === 'success' },
        { id: 'quest', labelKey: 'postBattle.activities.questProgress', condition: !!battle.isQuestBattle },
        { id: 'payment', labelKey: 'postBattle.activities.getPaid', condition: true },
        { id: 'finds', labelKey: 'postBattle.activities.battlefieldFinds', condition: heldTheField && battle.battleType !== 'invasion' },
        { id: 'loot', labelKey: 'postBattle.activities.gatherLoot', condition: true },
        { id: 'invasion', labelKey: 'postBattle.activities.checkInvasion', condition: battle.enemyFaction === 'InvasionThreat' },
    ], [outcome, heldTheField, battle.isQuestBattle, battle.enemyFaction, battle.battleType]);

    const allActivitiesResolved = useMemo(() => {
        const displayedActivities = potentialActivities.filter(a => a.condition);
        return displayedActivities.every(act => activityResults[act.id]);
    }, [activityResults, potentialActivities]);

    const contestedPlanets = useMemo(() => campaign.galacticWar?.trackedPlanets.filter(p => p.status === 'contested') || [], [campaign.galacticWar]);
    const allWarResolved = useMemo(() => contestedPlanets.every(p => warResults[p.name]), [contestedPlanets, warResults]);
    
    const renderStepContent = () => {
        switch(currentStep.key) {
            case 'activities':
                return (
                    <div className="w-full max-w-lg mx-auto text-left space-y-3">
                        {potentialActivities.filter(a => a.condition).map(activity => (
                             <div key={activity.id} className="p-3 bg-surface-raised/50 rounded-md">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-text-base">{t(activity.labelKey)}</span>
                                    <Button onClick={() => handleResolveActivity(activity.id)} disabled={!!activityResults[activity.id]} variant="secondary" className="text-xs py-1 px-2"><Dices size={14}/> {t('postBattle.activities.resolve')}</Button>
                                </div>
                                {activityResults[activity.id] && (
                                    <p className="mt-2 text-sm text-primary italic text-center animate-fade-in">
                                        {t(activityResults[activity.id].key, activityResults[activity.id].params)}
                                    </p>
                                )}
                            </div>
                        ))}
                        {contestedPlanets.length > 0 && (
                             <div className="p-3 bg-surface-raised/50 rounded-md">
                                <h5 className="font-bold text-text-base mb-2 flex items-center gap-2"><Globe size={16}/> {t('postBattle.activities.galacticWar')}</h5>
                                <div className="space-y-2">
                                {contestedPlanets.map(planet => (
                                    <div key={planet.name} className="p-2 bg-surface-base/50 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-primary">{planet.name}</span>
                                            <Button onClick={() => handleResolveWarProgress(planet.name)} disabled={!!warResults[planet.name]} variant="secondary" className="text-xs py-1 px-2"><Dices size={14}/> {t('postBattle.activities.resolve')}</Button>
                                        </div>
                                        {warResults[planet.name] && (
                                            <div className="mt-2 text-sm text-primary italic text-center animate-fade-in space-y-1">
                                                {warResults[planet.name].map((log, index) => (
                                                    <p key={index}>
                                                        {t(log.key, log.params)}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'injuries': {
                const medic = crew.members.find(m => m.advancedTraining === 'medical');
                const medicInBattle = medic && battle.participants.find(p => p.id === medic.id);
                const medicSurvived = medicInBattle && medicInBattle.status !== 'casualty';
                const hasShuttle = ship?.components.includes('shuttle');
                
                return (
                    <div className="w-full max-w-md mx-auto">
                        <p className="text-text-base mb-4">{t('postBattle.injuries.description')}</p>
                        {casualties && casualties.length > 0 ? (
                            <div className="space-y-3">
                                {casualties.map(char => {
                                    const injuryResult = injuryResults[char.id];
                                    const isDeadInState = !crew.members.some(m => m.id === char.id);
                                    const canReroll = medic && (medicSurvived || (!medicInBattle && hasShuttle)) && injuryResult && !injuryResult.isDead && !injuryResult.surgeryCost;
                                    
                                    return (
                                        <div key={char.id} className="p-3 bg-surface-raised/50 rounded-md text-left">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-text-base">{sanitizeToText(char.name)}</span>
                                                {!injuryResult && (
                                                    <Button onClick={() => handleInjuryRoll(char.id)} variant="danger" className="text-xs py-1 px-2"><Dices size={14}/> {t('postBattle.injuries.rollButton')}</Button>
                                                )}
                                            </div>
                                            {injuryResult && (
                                                <div className="mt-2 text-sm text-center">
                                                    <p className="text-text-base italic mb-2">{t('postBattle.injuries.rollResult', { roll: injuryResult.roll })}</p>
                                                    <p className={`font-semibold ${isDeadInState ? 'text-danger' : 'text-warning'}`}>
                                                        {t(injuryResult.descriptionKey, {xp: injuryResult.xpGained})}
                                                    </p>
                                                    {canReroll && (
                                                        <Button onClick={() => handleInjuryRoll(char.id)} variant='secondary' className='text-xs mt-2'>
                                                            {t('postBattle.injuries.medicReroll')}
                                                        </Button>
                                                    )}
                                                     {injuryResult.surgeryCost && !injuryResult.surgeryPaid && !injuryResult.penaltyAccepted && (
                                                        <div className="mt-3 p-2 bg-danger/30 rounded-md">
                                                            <p className="text-danger mb-2">{t('postBattle.injuries.cripplingWoundPrompt', { cost: injuryResult.surgeryCost })}</p>
                                                            <div className="flex gap-2 justify-center">
                                                                <Button onClick={() => handleSurgeryPayment(char.id, injuryResult.surgeryCost! as number)} disabled={campaign.credits < (injuryResult.surgeryCost! as number)} variant="secondary" className="text-xs py-1"><Coins size={12}/> {t('buttons.pay')}</Button>
                                                                <Button onClick={() => handleStatPenalty(char.id)} variant="danger" className="text-xs py-1">{t('buttons.acceptPenalty')}</Button>
                                                            </div>
                                                        </div>
                                                     )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-text-muted italic">{t('postBattle.injuries.noCasualties')}</p>
                        )}
                    </div>
                );
            }
            case 'experience':
                 return (
                     <div className="w-full max-w-2xl mx-auto text-left space-y-4">
                         {participants?.map(p => {
                            const charInCrew = crew.members.find(m => m.id === p.id);
                            if (!charInCrew) return null; // Don't show dead characters

                            const { total, breakdown } = CampaignDomain.calculateXpGains({ ...p, type: 'character' }, battle, outcome === 'success');
                            
                            return (
                                <div key={p.id} className="p-3 bg-surface-raised/50 rounded-md">
                                    <h5 className="font-bold text-primary">{sanitizeToText(p.name)}</h5>
                                    <div className="text-xs text-text-base mt-1 space-y-0.5">
                                        {breakdown.map((b, i) => <p key={i}>+ {b.amount} XP <span className="text-text-muted">({t(b.reasonKey)})</span></p>)}
                                    </div>
                                    <p className="font-bold text-sm text-text-base mt-1">{t('postBattle.xp.totalGain', { total })}</p>
                                    <CharacterUpgradePanel character={charInCrew} />
                                </div>
                            );
                         })}
                     </div>
                 );
            case 'training':
                 return <AdvancedTrainingPanel />;
            case 'purchase': {
                const itemsSold = campaign.itemsSoldThisTurn || 0;
                const basicWeaponsToSell = ['hand_gun', 'blade', 'colony_rifle', 'shotgun'];
                const allItems = [
                    ...campaign.stash.weapons.map(w => ({...w, source: 'stash', type: 'weapon'})),
                    ...crew.members.flatMap(c => c.weapons.map(w => ({...w, source: c.id, type: 'weapon'})))
                ];

                const hasWeaponLicensing = campaign.currentWorld?.traits.some(t => t.id === 'weapon_licensing');
                const purchaseRollCost = 3 + (hasWeaponLicensing ? 1 : 0);
                const basicWeaponCost = 1 + (hasWeaponLicensing ? 1 : 0);
                const hasImportRestrictions = campaign.currentWorld?.traits.some(t => t.id === 'import_restrictions');
                
                return (
                    <div className="w-full max-w-2xl mx-auto text-left space-y-4">
                        <div className="text-right font-bold text-warning">{t('crewCreator.startingCredits')}: {campaign.credits}</div>
                        
                        {/* Purchase Roll */}
                        <div className="p-3 bg-surface-raised/50 rounded-md">
                            <h4 className="font-bold text-text-base mb-2">{t('postBattle.purchase.purchaseRollTitle')}</h4>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => handlePurchaseRoll('military')} disabled={campaign.credits < purchaseRollCost}>{t('postBattle.purchase.militaryWeapon')} ({purchaseRollCost}cr)</Button>
                                <Button onClick={() => handlePurchaseRoll('gear')} disabled={campaign.credits < purchaseRollCost}>{t('postBattle.purchase.gear')} ({purchaseRollCost}cr)</Button>
                                <Button onClick={() => handlePurchaseRoll('gadget')} disabled={campaign.credits < purchaseRollCost}>{t('postBattle.purchase.gadget')} ({purchaseRollCost}cr)</Button>
                            </div>
                            {purchaseRollResult && <p className="mt-2 text-sm text-primary italic text-center animate-fade-in">{t('postBattle.purchase.youFound', { item: purchaseRollResult.name })}</p>}
                        </div>

                        {/* Direct Purchase */}
                        <div className="p-3 bg-surface-raised/50 rounded-md">
                             <h4 className="font-bold text-text-base mb-2">{t('postBattle.purchase.directPurchaseTitle')}</h4>
                             <div className="flex flex-wrap gap-2">
                                {basicWeaponsToSell.map(wId => (
                                    <Button key={wId} onClick={() => campaignActions.purchaseBasicWeapon(wId)} disabled={campaign.credits < basicWeaponCost}>
                                        {t(`weapons.${wId}`)} ({basicWeaponCost}cr)
                                    </Button>
                                ))}
                             </div>
                        </div>

                        {/* Sell Items */}
                        <div className="p-3 bg-surface-raised/50 rounded-md">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-text-base">{t('postBattle.purchase.sellItemsTitle')}</h4>
                                <span className="text-sm text-text-base">{t('postBattle.purchase.itemsSold', { count: itemsSold })}</span>
                            </div>
                            {hasImportRestrictions ? (
                                <p className="text-warning text-sm italic text-center py-4">{t('worldtraits.import_restrictions.desc')}</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                    {allItems.map(item => (
                                        <div key={item.instanceId} className="flex justify-between items-center text-sm p-1.5 bg-surface-base/50 rounded-md">
                                            <span>{t(`weapons.${item.weaponId}`)} <span className="text-xs text-text-muted italic">({item.source === 'stash' ? t('labels.stash') : sanitizeToText(crew.members.find(c=>c.id === item.source)?.name)})</span></span>
                                            <Button onClick={() => campaignActions.sellItem(item.source, item.instanceId, 'weapon')} disabled={itemsSold >= 3} className="text-xs py-1 px-2">{t('buttons.sell')} (1cr)</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            case 'event':
                 return (
                    <div className="w-full max-w-lg mx-auto">
                        {!campaignEventResult ? (
                            <Button onClick={handleCampaignEventRoll} variant="primary" className="mx-auto">
                                <Dices /> {t('postBattle.event.rollButton')}
                            </Button>
                        ) : (
                            <div className="p-4 bg-surface-raised/50 rounded-md text-center animate-fade-in">
                                <p className="font-bold text-primary mb-2">{t(campaignEventResult.key, campaignEventResult.params)}</p>
                                <p className="text-sm text-text-base italic">{t(`${campaignEventResult.key}_effect`, campaignEventResult.params)}</p>
                            </div>
                        )}
                    </div>
                 );
            case 'character_event':
                 return (
                    <div className="w-full max-w-lg mx-auto">
                         {campaign.pendingPrecursorEventChoice && <PrecursorEventChoiceModal choice={campaign.pendingPrecursorEventChoice} />}
                        <p className="text-text-base mb-4">{t('postBattle.character_event.description')}</p>
                        {!charEventResult && !campaign.pendingPrecursorEventChoice ? (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <select
                                    value={charEventCharacterId}
                                    onChange={(e) => setCharEventCharacterId(e.target.value)}
                                    className="bg-secondary border border-border rounded-md py-2 px-3 text-text-base focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">{t('postBattle.character_event.selectCharacter')}</option>
                                    {crew.members.filter(char => !char.noXP && !char.isUnavailableForTasks).map(char => (
                                        <option key={char.id} value={char.id}>{sanitizeToText(char.name)}</option>
                                    ))}
                                </select>
                                <Button onClick={handleCharacterEventRoll} disabled={!charEventCharacterId}>
                                    <Dices /> {t('postBattle.character_event.rollButton')}
                                </Button>
                            </div>
                        ) : charEventResult && (
                            <div className="p-4 bg-surface-raised/50 rounded-md text-center animate-fade-in">
                                <p className="font-bold text-primary mb-2">{t(charEventResult.key, charEventResult.params)}</p>
                            </div>
                        )}
                    </div>
                 );
            default:
                return null;
        }
    }

    const isNextDisabled = (currentStep.key === 'activities' && (!allActivitiesResolved || !allWarResolved)) || 
                           (currentStep.key === 'injuries' && !allCasualtiesHandled) ||
                           (currentStep.key === 'event' && !campaignEventResult) ||
                           (currentStep.key === 'character_event' && !charEventResult && !campaign.pendingPrecursorEventChoice);


    return (
        <div className="max-w-3xl mx-auto">
            <Card>
                <h2 className="text-2xl sm:text-3xl font-bold font-orbitron text-center mb-2 text-primary">
                    {t('postBattle.title')}
                </h2>
                <p className={`text-center font-bold text-lg mb-6 ${outcome === 'success' ? 'text-success' : 'text-danger'}`}>
                    {outcome === 'success' ? t('battle.victory') : t('battle.defeat')}
                </p>
                
                <div className="flex justify-between items-center mb-8">
                    {steps.map((s, index) => (
                        <React.Fragment key={s.key}>
                            <div className="flex flex-col items-center text-center w-20">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${step >= index ? 'bg-primary border-primary' : 'bg-secondary border-border'}`}>
                                    {s.icon}
                                </div>
                                <p className={`mt-2 text-xs font-bold uppercase transition-colors duration-500 ${step >= index ? 'text-primary' : 'text-text-muted'}`}>
                                    {t(s.titleKey)}
                                </p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 rounded-full transition-colors duration-500 ${step > index ? 'bg-primary' : 'bg-secondary'}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <Card className="bg-surface-base/50 min-h-[200px] flex items-center justify-center p-4">
                    <div className="text-center w-full">
                        <h3 className="text-lg sm:text-xl font-bold font-orbitron text-primary mb-4">{t(currentStep.titleKey)}</h3>
                        {renderStepContent()}
                    </div>
                </Card>

                <div className="mt-8 text-center">
                    <Button onClick={handleNext} variant="primary" className="py-3 px-6 text-lg" disabled={isNextDisabled}>
                        {step < steps.length - 1 ? t('postBattle.next') : t('postBattle.finish')}
                        {step < steps.length - 1 ? <ChevronRight size={20} /> : <ChevronsRight size={20} />}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default PostBattleSequence;
