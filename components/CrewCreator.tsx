import React, { useState, useCallback, useMemo } from 'react';
import { Crew, Character, Campaign, RaceId, Difficulty, Stash, Background, Motivation, Class, EquipmentPool, Ship, CharacterStats, ProtectiveDevice } from '@/types';
import { generateStartingEquipment, assembleCharacterFromComponents } from '@/services/characterService';
import { generateStartingShip } from '@/services/shipService';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Users, Dices, ChevronRight, PackagePlus, Briefcase, Coins, BookOpen, Rocket, Cuboid, Star, Zap, Footprints, Target, Heart, Brain, RotateCw, UserPlus, X, UserX, ChevronLeft, Shield, Pill, FerrisWheel } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore } from '@/stores';
import Tooltip from '@/components/ui/Tooltip';
import { RACES, CHARACTER_BACKGROUNDS, MOTIVATION_TABLE, CLASS_TABLE } from '@/constants/characterCreation';
import { Select, SelectOption } from '@/components/ui/Select';
import { sanitizeToText } from '@/services/utils/sanitization';
import { preloadCampaignDashboard } from '@/services/utils/componentPreloader';
import { rollD6 } from '@/services/utils/rolls';
import Modal from './ui/Modal';
import { campaignUseCases } from '@/services';
import { getWeaponById, getProtectiveDeviceById } from '@/services/data/items';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

interface GeneratedCharacter {
    character: Character;
    bonuses: CampaignBonuses;
}

const StatBar: React.FC<{ label: string; value: number; max: number; colorClass: string; icon: React.ReactNode }> = ({ label, value, max, colorClass, icon }) => {
    const percentage = Math.min(100, (Math.abs(value) / max) * 100);
    return (
      <div className="flex items-center gap-3 text-sm group" aria-label={`${label}: ${value}`}>
        <span className="w-6 text-text-muted group-hover:text-primary transition-colors">{icon}</span>
        <span className="w-20 font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <div className="flex-grow bg-surface-base/50 h-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percentage}%` }}></div>
        </div>
        <span className={`w-8 text-right font-bold text-text-base`}>{value > 0 ? `+${value}` : value}</span>
      </div>
    );
  };

const GeneratedCharacterDisplay: React.FC<{
    data: GeneratedCharacter,
    onAdd: () => void,
    onReroll: () => void,
    onClose: () => void,
}> = ({ data, onAdd, onReroll, onClose }) => {
    const { t } = useTranslation();
    const { character, bonuses } = data;

    const STAT_CONFIG = {
        reactions: { max: 6, color: 'bg-cyan-400', icon: <Zap size={16} /> },
        speed: { max: 8, color: 'bg-green-400', icon: <Footprints size={16} /> },
        combat: { max: 5, color: 'bg-pink-400', icon: <Target size={16} /> },
        toughness: { max: 6, color: 'bg-yellow-400', icon: <Heart size={16} /> },
        savvy: { max: 5, color: 'bg-purple-400', icon: <Brain size={16} /> },
        luck: { max: 3, color: 'bg-teal-400', icon: <Dices size={16} /> },
    };

    return (
        <Modal onClose={onClose} title={`${t('crewCreator.newCharacter')}: ${sanitizeToText(character.name)}`}>
            <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
                <div className='p-6 space-y-5'>
                    <section>
                         <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.finalStats')}</h3>
                         <div className='p-4 bg-surface-base/50 rounded-lg space-y-2'>
                            <StatBar label={t('characterCard.react')} value={character.stats.reactions} max={STAT_CONFIG.reactions.max} colorClass={STAT_CONFIG.reactions.color} icon={STAT_CONFIG.reactions.icon} />
                            <StatBar label={t('characterCard.speed')} value={character.stats.speed} max={STAT_CONFIG.speed.max} colorClass={STAT_CONFIG.speed.color} icon={STAT_CONFIG.speed.icon} />
                            <StatBar label={t('characterCard.combat')} value={character.stats.combat} max={STAT_CONFIG.combat.max} colorClass={STAT_CONFIG.combat.color} icon={STAT_CONFIG.combat.icon} />
                            <StatBar label={t('characterCard.tough')} value={character.stats.toughness} max={STAT_CONFIG.toughness.max} colorClass={STAT_CONFIG.toughness.color} icon={STAT_CONFIG.toughness.icon} />
                            <StatBar label={t('characterCard.savvy')} value={character.stats.savvy} max={STAT_CONFIG.savvy.max} colorClass={STAT_CONFIG.savvy.color} icon={STAT_CONFIG.savvy.icon} />
                            <StatBar label={t('characterCard.luck')} value={character.stats.luck} max={STAT_CONFIG.luck.max} colorClass={STAT_CONFIG.luck.color} icon={STAT_CONFIG.luck.icon} />
                         </div>
                    </section>
                     <section>
                        <p className="text-sm text-text-base">{character.strangeCharacterId ? t(`strange_characters.${character.strangeCharacterId}`) : t(`races.${character.raceId}`)} &bull; {t(`backgrounds.${character.backgroundId}`)} &bull; {t(`motivations.${character.motivationId}`)} &bull; {t(`classes.${character.classId}`)}</p>
                    </section>
                    <section>
                         <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.startingResources')}</h3>
                         <Card className='bg-surface-base/50 p-3 text-xs space-y-2'>
                            <div className='flex justify-between items-center'><span className='text-text-base'>{t('crewCreator.startingCredits')}</span><span className='font-bold text-warning'>{bonuses.credits}</span></div>
                            <div className='flex justify-between items-center'><span className='text-text-base'>{t('crewCreator.experience')}</span><span className='font-bold text-warning'>{character.xp} XP</span></div>
                         </Card>
                    </section>
                </div>
                 <div className='mt-auto flex justify-between gap-4 border-t border-border pt-4 px-6'>
                    <Button onClick={onReroll} variant='secondary'><RotateCw size={16} /> {t('buttons.reroll')}</Button>
                    <Button onClick={onAdd} variant='primary'><UserPlus size={16} /> {t('buttons.addToCrew')}</Button>
                </div>
            </Card>
        </Modal>
    );
};

const StatBarLeader: React.FC<{ label: string; value: number; baseValue: number; icon: React.ReactNode }> = React.memo(({ label, value, baseValue, icon }) => {
    const change = value - baseValue;
    return (
        <div className="flex items-center gap-2 text-xs group">
            <span className="w-5 text-text-muted group-hover:text-primary transition-colors">{icon}</span>
            <span className="w-20 font-semibold text-text-muted uppercase tracking-wider">{label}</span>
            <div className="flex-grow flex items-center">
                <span className={`w-8 text-right font-bold text-lg text-text-base`}>{value}</span>
                {change !== 0 && (
                     <span className={`ml-2 text-xs font-bold ${change > 0 ? 'text-success' : 'text-danger'}`}>
                        ({change > 0 ? `+${change}` : change})
                     </span>
                )}
            </div>
        </div>
    );
});
StatBarLeader.displayName = 'StatBarLeader';

const LeaderSummaryPanel: React.FC<{
    character: Character | null,
    selections: any,
    t: (key: string, params?: any) => string;
}> = React.memo(({ character, selections, t }) => {
  if (!character) {
    return (
      <Card className="h-full bg-surface-base/50 sticky top-6">
        <div className="flex items-center justify-center h-full text-text-muted">{t('crewCreator.leader.selectOption')}</div>
      </Card>
    );
  }
  
  const STAT_CONFIG = {
    reactions: { icon: <Zap size={16} /> },
    speed: { icon: <Footprints size={16} /> },
    combat: { icon: <Target size={16} /> },
    toughness: { icon: <Heart size={16} /> },
    savvy: { icon: <Brain size={16} /> },
    luck: { icon: <Dices size={16} /> },
  };

  const baseStats = RACES[character.raceId]?.baseStats || ({} as Partial<CharacterStats>);
  
  const allBonuses = useMemo(() => {
    const bonuses: {type: string, text: string}[] = [];
    const background = CHARACTER_BACKGROUNDS.find(b => b.id === selections.backgroundId);
    if (background) {
        if (background.effect) bonuses.push({type: 'effect', text: background.effect});
        if (background.resources) bonuses.push({type: 'resource', text: background.resources});
        if (background.starting_rolls) bonuses.push(...background.starting_rolls.map(r => ({type: 'roll', text: r})));
    }
    
    const motivation = MOTIVATION_TABLE.find(m => m.value.id === selections.motivationId)?.value;
    if (motivation) {
        if (motivation.effect) bonuses.push({type: 'effect', text: motivation.effect});
        if (motivation.resources) bonuses.push({type: 'resource', text: motivation.resources});
        if (motivation.starting_rolls) bonuses.push(...motivation.starting_rolls.map(r => ({type: 'roll', text: r})));
    }

    const classInfo = CLASS_TABLE.find(c => c.value.id === selections.classId)?.value;
    if (classInfo) {
        if (classInfo.effect) bonuses.push({type: 'effect', text: classInfo.effect});
        if (classInfo.resources) bonuses.push({type: 'resource', text: classInfo.resources});
        if (classInfo.starting_rolls) bonuses.push(...classInfo.starting_rolls.map(r => ({type: 'roll', text: r})));
    }
    
    return bonuses.filter(b => b.text);
  }, [selections]);

  return (
    <Card className="h-full bg-surface-base/50 sticky top-6 animate-fade-in">
        <div className="flex gap-4 items-center mb-4">
            <img src={character.portraitUrl} alt={`Portrait of ${character.name}`} className="w-20 h-20 rounded-md object-cover border-2 border-primary/50" />
            <div>
                <h3 className='text-xl font-bold font-orbitron text-primary'>{sanitizeToText(character.name)}</h3>
                <p className='text-sm text-text-muted'>{t(`races.${character.raceId}`)}</p>
            </div>
        </div>
        
        <div className='space-y-3'>
            <div>
                <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2'>{t('crewCreator.finalStats')}</h4>
                <div className='p-3 bg-surface-overlay/50 rounded-md space-y-1.5'>
                    <StatBarLeader label={t('characterCard.react')} value={character.stats?.reactions || 0} baseValue={baseStats.reactions || 0} icon={STAT_CONFIG.reactions.icon} />
                    <StatBarLeader label={t('characterCard.speed')} value={character.stats?.speed || 0} baseValue={baseStats.speed || 0} icon={STAT_CONFIG.speed.icon} />
                    <StatBarLeader label={t('characterCard.combat')} value={character.stats?.combat || 0} baseValue={baseStats.combat || 0} icon={STAT_CONFIG.combat.icon} />
                    <StatBarLeader label={t('characterCard.tough')} value={character.stats?.toughness || 0} baseValue={baseStats.toughness || 0} icon={STAT_CONFIG.toughness.icon} />
                    <StatBarLeader label={t('characterCard.savvy')} value={character.stats?.savvy || 0} baseValue={baseStats.savvy || 0} icon={STAT_CONFIG.savvy.icon} />
                    <StatBarLeader label={t('characterCard.luck')} value={character.stats?.luck || 0} baseValue={baseStats.luck || 0} icon={STAT_CONFIG.luck.icon} />
                </div>
            </div>
            <div>
                <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2'>{t('crewCreator.leader.bonuses')}</h4>
                <div className='p-3 bg-surface-overlay/50 rounded-md space-y-1 text-xs min-h-[5rem] max-h-48 overflow-y-auto'>
                    {allBonuses.length > 0 ? allBonuses.map((bonus, i) => {
                       let color = 'text-success';
                       if (bonus.type === 'resource') color = 'text-warning';
                       if (bonus.type === 'roll') color = 'text-info';
                       return <p key={i} className={color}>+ {t(bonus.text)}</p>
                    }) : <p className="text-text-muted italic">{t('characterCard.none')}</p>}
                </div>
            </div>
        </div>
    </Card>
  );
});
LeaderSummaryPanel.displayName = 'LeaderSummaryPanel';

const SelectionDetailsPanel: React.FC<{
    item: any;
    type: 'race' | 'background' | 'motivation' | 'class';
    t: (key: string) => string;
}> = React.memo(({ item, type, t }) => {
    if (!item) {
        return (
            <Card className="h-full bg-surface-base/50">
                <div className="flex items-center justify-center h-full text-text-muted italic">{t('crewCreator.leader.selectOption')}</div>
            </Card>
        );
    }
    
    const titleKey = item.nameKey || `${type}s.${item.id}`;
    const descKey = `${type}s.${item.id}_desc`;

    return (
        <Card className="h-full bg-surface-base/50 animate-fade-in flex flex-col">
            <h3 className="text-lg font-bold text-primary font-orbitron mb-2">{t(titleKey)}</h3>
            <p className="text-sm text-text-base flex-grow">{t(descKey)}</p>

            {(item.rules || item.effect || item.resources || item.starting_rolls) && (
                <div className="mt-4 pt-4 border-t border-border/50">
                    {item.rules && (
                        <>
                         <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2'>{t('crewCreator.leader.rules')}</h4>
                         <ul className='list-disc list-inside text-xs space-y-1'>
                            {item.rules.map((ruleKey: string) => <li key={ruleKey}>{t(ruleKey)}</li>)}
                         </ul>
                        </>
                    )}
                     {(item.effect || item.resources || (item.starting_rolls && item.starting_rolls.length > 0)) && (
                         <>
                            <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2 mt-3'>{t('crewCreator.leader.bonuses')}</h4>
                             <div className='text-sm space-y-1'>
                                {item.effect && <p className='text-success'>+ {t(item.effect)}</p>}
                                {item.resources && <p className='text-warning'>+ {t(item.resources)}</p>}
                                {item.starting_rolls && item.starting_rolls.map((roll: string, i: number) => <p key={i} className='text-info'>+ {t(roll)}</p>)}
                             </div>
                         </>
                     )}
                </div>
            )}
        </Card>
    );
});
SelectionDetailsPanel.displayName = 'SelectionDetailsPanel';

interface CampaignBonuses {
    credits: number;
    storyPoints: number;
    patrons: any[];
    questRumors: number;
    rivals: number;
}

const CrewCreator: React.FC = () => {
  const [creationStep, setCreationStep] = useState<'leader' | 'assemble' | 'finalize'>('leader');
  const [leaderName, setLeaderName] = useState('Rook');
  const [leaderSelections, setLeaderSelections] = useState<{
      raceId: RaceId,
      backgroundId: string,
      motivationId: string,
      classId: string,
  }>({
      raceId: 'baseline_human',
      backgroundId: '',
      motivationId: '',
      classId: '',
  });
  const [crewName, setCrewName] = useState('The Wanderers');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignBonuses, setCampaignBonuses] = useState<CampaignBonuses>({ credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 });
  const [equipmentPool, setEquipmentPool] = useState<EquipmentPool>({ weapons: [], armor: [], screen: [], consumables: [] });
  const [isEquipmentGenerated, setIsEquipmentGenerated] = useState(false);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [startingStoryPoints, setStartingStoryPoints] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [shipInfo, setShipInfo] = useState<{ ship: Ship; debt: number } | null>(null);
  const { t } = useTranslation();
  const startCampaign = useCampaignProgressStore(state => state.actions.startCampaign);
  
  const [leaderStep, setLeaderStep] = useState<'race' | 'background' | 'motivation' | 'class' | 'review'>('race');
  const [hoveredItem, setHoveredItem] = useState<{ type: string, data: any } | null>(null);
  const [previewCharacter, setPreviewCharacter] = useState<GeneratedCharacter | null>(null);
  
  const raceOptions = useMemo(() => Object.values(RACES).filter(r => r.id !== 'bot').map(race => ({ value: race.id, label: t(race.nameKey) })), [t]);
  const backgroundOptions = useMemo(() => CHARACTER_BACKGROUNDS.map(bg => ({ value: bg.id, label: t(`backgrounds.${bg.id}`) })), [t]);
  const motivationOptions = useMemo(() => MOTIVATION_TABLE.map(m => ({ value: m.value.id, label: t(`motivations.${m.value.id}`) })), [t]);
  const classOptions = useMemo(() => CLASS_TABLE.map(c => ({ value: c.value.id, label: t(`classes.${c.value.id}`) })), [t]);

  const leaderPreview = useMemo(() => {
    const { character } = assembleCharacterFromComponents({
        raceId: leaderSelections.raceId,
        classInfo: CLASS_TABLE.find(c => c.value.id === leaderSelections.classId)?.value,
        background: CHARACTER_BACKGROUNDS.find(b => b.id === leaderSelections.backgroundId),
        motivationInfo: MOTIVATION_TABLE.find(m => m.value.id === leaderSelections.motivationId)?.value,
        pronouns: 'they/them',
        details: { name: leaderName, backstory: '' }
    });
    return character;
  }, [leaderSelections, leaderName]);

  const detailsItem = useMemo(() => {
    if (hoveredItem) return hoveredItem;

    const selectionKey = `${leaderStep}Id` as keyof typeof leaderSelections;
    const selectedValue = leaderSelections[selectionKey];
    if (!selectedValue) return null;

    let data;
    switch(leaderStep) {
        case 'race': data = RACES[selectedValue as RaceId]; break;
        case 'background': data = CHARACTER_BACKGROUNDS.find(i => i.id === selectedValue); break;
        case 'motivation': data = MOTIVATION_TABLE.find(i => i.value.id === selectedValue)?.value; break;
        case 'class': data = CLASS_TABLE.find(i => i.value.id === selectedValue)?.value; break;
        default: return null;
    }
    return { type: leaderStep, data };
  }, [hoveredItem, leaderStep, leaderSelections]);
  
  const handleLeaderSelection = (field: keyof typeof leaderSelections, value: string) => {
      setLeaderSelections(prev => ({...prev, [field]: value }));
  };

  const rollNextCharacter = useCallback(async () => {
    setIsLoading(true);
    const { character, campaignBonuses: newCharBonuses } = await campaignUseCases.addSingleCharacter();
    setPreviewCharacter({ character, bonuses: newCharBonuses });
    setIsLoading(false);
  }, [characters.length]);

  const handleAddCharacter = () => {
    if (!previewCharacter) return;
    setCharacters(prev => [...prev, previewCharacter.character]);
    setCampaignBonuses(prev => ({
        credits: prev.credits + previewCharacter.bonuses.credits,
        storyPoints: prev.storyPoints + previewCharacter.bonuses.storyPoints,
        patrons: [...prev.patrons, ...previewCharacter.bonuses.patrons],
        questRumors: prev.questRumors + previewCharacter.bonuses.questRumors,
        rivals: prev.rivals + previewCharacter.bonuses.rivals,
    }));
    
    if (characters.length + 1 < 6) {
        rollNextCharacter();
    } else {
        setPreviewCharacter(null);
    }
  };

  const handleConfirmLeader = () => {
    if (!leaderPreview) return;
    const { character: leaderChar, campaignBonuses: leaderBonuses } = assembleCharacterFromComponents({
        raceId: leaderSelections.raceId,
        classInfo: CLASS_TABLE.find(c => c.value.id === leaderSelections.classId)?.value,
        background: CHARACTER_BACKGROUNDS.find(b => b.id === leaderSelections.backgroundId),
        motivationInfo: MOTIVATION_TABLE.find(m => m.value.id === leaderSelections.motivationId)?.value,
        pronouns: 'they/them',
        details: { name: leaderName, backstory: '' }
    });

    setCharacters([leaderChar]);
    setLeaderId(leaderChar.id);
    setCampaignBonuses(leaderBonuses);
    setCreationStep('assemble');
    rollNextCharacter(); // Start rolling for the rest of the crew
  };

  const handleProceedToFinalize = () => {
    if (!isEquipmentGenerated) {
        const savvyIncreases = characters.filter(c => {
            const baseRaceSavvy = RACES[c.raceId]?.baseStats.savvy || 0;
            return c.stats.savvy > baseRaceSavvy;
        }).length;
        const allStartingRolls = characters.flatMap(c => c.startingRolls || []);
        const newPool = generateStartingEquipment(savvyIncreases, allStartingRolls);
        setEquipmentPool(newPool);
        setIsEquipmentGenerated(true);
    }
    setCreationStep('finalize');
  };
  
  const handleGenerateShip = () => setShipInfo(generateStartingShip());
  const handleRollStartingSP = () => setStartingStoryPoints(rollD6() + 1);

  const handleStartCampaign = () => {
    if (!shipInfo || !leaderId) return;

    const finalCharacters = characters.map(char => ({
        ...char,
        isLeader: char.id === leaderId,
        stats: {
            ...char.stats,
            luck: char.id === leaderId && char.raceId !== 'bot' ? char.stats.luck + 1 : char.stats.luck,
        },
        startingRolls: undefined,
    }));

    const fullCrew: Crew = { name: crewName, members: finalCharacters };
    const initialCampaign: Campaign = {
        turn: 1, campaignPhase: 'actions', difficulty,
        log: [{ key: 'log.info.campaignStarted', turn: 1 }],
        credits: characters.length + campaignBonuses.credits,
        storyPoints: startingStoryPoints!, debt: shipInfo.debt, ship: shipInfo.ship, patrons: campaignBonuses.patrons,
        questRumors: Array.from({ length: campaignBonuses.questRumors }, (_, i): any => ({ id: `rumor_${i}`, type: 'generic' })),
        rivals: [], jobOffers: [], activeMission: null, activeQuest: null,
        stash: {
            weapons: equipmentPool.weapons.map(wId => ({ instanceId: `stash_${wId}_${Math.random()}`, weaponId: wId })),
            armor: equipmentPool.armor, screen: equipmentPool.screen, consumables: equipmentPool.consumables,
            sights: [], gunMods: [], implants: [], utilityDevices: [],
            onBoardItems: ['purifier', 'spare_parts', 'med-patch'],
        },
        tasksFinalized: false, taskResultsLog: [], currentWorld: null, fuelCredits: 0,
    };
    startCampaign(fullCrew, initialCampaign);
  };
  
  const isLeaderFormComplete = leaderSelections.backgroundId && leaderSelections.classId && leaderSelections.motivationId && leaderSelections.raceId;
  const canFinalize = characters.length >= 4 && isEquipmentGenerated && leaderId && startingStoryPoints !== null && shipInfo;
  
  const renderLeaderCreationWizard = () => {
    const steps = ['race', 'background', 'motivation', 'class', 'review'];
    const currentStepIndex = steps.indexOf(leaderStep);

    const handleNext = () => {
        setHoveredItem(null);
        const nextStepIndex = currentStepIndex + 1;
        if (nextStepIndex < steps.length) {
            setLeaderStep(steps[nextStepIndex] as any);
        }
    };
    const handleBack = () => {
        setHoveredItem(null);
        const prevStepIndex = currentStepIndex - 1;
        if (prevStepIndex >= 0) {
            setLeaderStep(steps[prevStepIndex] as any);
        }
    };

    const optionsMap: any = {
      race: raceOptions.map(opt => ({...opt, data: RACES[opt.value as RaceId]})),
      background: backgroundOptions.map(opt => ({...opt, data: CHARACTER_BACKGROUNDS.find(i => i.id === opt.value)})),
      motivation: motivationOptions.map(opt => ({...opt, data: MOTIVATION_TABLE.find(i => i.value.id === opt.value)?.value})),
      class: classOptions.map(opt => ({...opt, data: CLASS_TABLE.find(i => i.value.id === opt.value)?.value})),
    };
    
    const currentOptions = optionsMap[leaderStep as keyof typeof optionsMap];
    const selectionKey = `${leaderStep}Id` as keyof typeof leaderSelections;
    const selectedValue = leaderSelections[selectionKey];
    
    if (leaderStep === 'review') {
        return (
            <Card className="max-w-2xl mx-auto bg-surface-overlay text-center">
                 <h2 className="text-xl sm:text-2xl font-bold font-orbitron text-primary">{t('crewCreator.leader.reviewTitle')}</h2>
                 <p className="text-sm text-text-muted mb-6">{t('crewCreator.leader.reviewSubtitle')}</p>
                 <LeaderSummaryPanel character={leaderPreview || null} selections={leaderSelections} t={t} />
                 <div className="mt-8 flex justify-between items-center">
                    <Button onClick={() => setLeaderStep('class')} variant='secondary'>
                        <ChevronLeft /> {t('buttons.backToEditing')}
                    </Button>
                    <Button onClick={handleConfirmLeader}>
                        {t('buttons.confirmAndAssemble')} <ChevronRight />
                    </Button>
                </div>
            </Card>
        );
    }
    
    return (
      <Card className="max-w-7xl mx-auto bg-surface-overlay">
        <div className='flex justify-between items-center mb-4'>
          <h2 className="text-xl sm:text-2xl font-bold font-orbitron text-primary">{t('crewCreator.leader.title')}</h2>
          <input
              type="text"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              placeholder="Leader Name"
              className="bg-surface-base/50 border border-border rounded-md py-1 px-3 text-text-base text-lg font-bold w-48 text-right"
          />
        </div>
        <p className="text-sm text-text-muted mb-6">{t(`crewCreator.leader.step_${leaderStep}`)}</p>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 min-h-[400px]">
          {/* Left Column: Options */}
          <div className="lg:col-span-2 space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {currentOptions.map((opt: any) => (
              <Card 
                key={opt.value}
                variant='interactive'
                onClick={() => handleLeaderSelection(selectionKey as any, opt.value)}
                onMouseEnter={() => setHoveredItem({ type: leaderStep, data: opt.data })}
                onMouseLeave={() => setHoveredItem(null)}
                className={`!p-3 ${selectedValue === opt.value ? 'border-primary ring-2 ring-primary' : 'border-border'}`}
              >
                <p className="font-semibold">{opt.label}</p>
              </Card>
            ))}
          </div>

          {/* Middle Column: Details */}
          <div className="lg:col-span-3">
            <SelectionDetailsPanel item={detailsItem?.data} type={detailsItem?.type as any} t={t} />
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-2">
            <LeaderSummaryPanel character={leaderPreview || null} selections={leaderSelections} t={t} />
          </div>
        </div>
        
        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <Button onClick={handleBack} disabled={currentStepIndex === 0} variant='secondary'>
            <ChevronLeft /> {t('buttons.back')}
          </Button>
          <Button onClick={handleNext} disabled={!selectedValue}>
            {leaderStep === 'class' ? t('buttons.review') : t('buttons.next')} <ChevronRight />
          </Button>
        </div>
      </Card>
    );
  };

  const renderAssembleStep = () => (
    <Card className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-2 font-orbitron text-primary">{t('crewCreator.assemble.title')}</h2>
      <p className="text-center text-text-muted mb-6">{t('crewCreator.subtitle')}</p>
      
      <div className="mb-6">
        <label htmlFor="crewName" className="block text-sm font-medium text-text-base mb-2">{t('crewCreator.crewNameLabel')}</label>
        <input type="text" id="crewName" value={crewName} onChange={(e) => setCrewName(e.target.value)} className="w-full bg-surface-overlay border border-border rounded-md py-2 px-3 text-text-base focus:ring-2 focus:ring-primary focus:border-primary" />
      </div>

      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <Button onClick={rollNextCharacter} disabled={isLoading || characters.length >= 6} isLoading={isLoading}>
          <UserPlus size={18} /> {t('buttons.addCharacter')}
        </Button>
        <Button onClick={() => setCharacters(characters.slice(0, 1))} disabled={characters.length <= 1}>
          <UserX size={18} /> Remove Last
        </Button>
      </div>
      
      <div className="space-y-4 mb-8">
        {characters.map(char => (
          <Card key={char.id} className="bg-surface-raised/60">
            <h4 className="font-bold text-lg text-primary">{char.isLeader && '⭐'} {sanitizeToText(char.name)}</h4>
            <p className="text-sm text-text-base">{char.strangeCharacterId ? t(`strange_characters.${char.strangeCharacterId}`) : t(`races.${char.raceId}`)} &bull; {t(`backgrounds.${char.backgroundId}`)} &bull; {t(`motivations.${char.motivationId}`)} &bull; {t(`classes.${char.classId}`)}</p>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <Button onClick={handleProceedToFinalize} disabled={characters.length < 4}>
          {t('buttons.finalizeCrew')} <ChevronRight />
        </Button>
      </div>
    </Card>
  );

  const renderFinalizeStep = () => (
    <Card className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6 font-orbitron text-primary">{t('crewCreator.readyMessage')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-surface-base/40">
                <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2"><Star size={18} /> {t('crewCreator.selectLeaderTitle')}</h3>
                <div className="space-y-2">
                    {characters.map(char => (
                        <label key={char.id} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all border-2 ${leaderId === char.id ? 'bg-primary/20 border-primary' : 'bg-surface-overlay border-transparent hover:border-border'}`}>
                            <input type="radio" name="leaderSelection" checked={leaderId === char.id} onChange={() => setLeaderId(char.id)} className="form-radio h-5 w-5 text-primary bg-surface-base border-border focus:ring-primary" />
                            <p className="font-bold text-text-base">{sanitizeToText(char.name)}</p>
                        </label>
                    ))}
                </div>
            </Card>
            <Card className="bg-surface-base/40">
                <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2"><Dices size={18} /> {t('crewCreator.storyPoints')}</h3>
                <div className="text-center">
                    {startingStoryPoints === null ? (
                        <Button onClick={handleRollStartingSP}>{t('buttons.roll')} (1D6+1)</Button>
                    ) : (
                        <p className="text-5xl font-bold text-primary font-orbitron">{startingStoryPoints}</p>
                    )}
                </div>
            </Card>
        </div>
        <div className="mt-6">
        {!shipInfo ? (
            <Card className="text-center">
                <h3 className="text-xl font-bold mb-2 text-primary">{t('crewCreator.shipSectionTitle')}</h3>
                <Button onClick={handleGenerateShip} disabled={!leaderId || startingStoryPoints === null}><Rocket size={18} /> {t('buttons.generateShip')}</Button>
            </Card>
        ) : (
            <Card className="text-left bg-surface-base/40">
                <h3 className="text-xl font-bold font-orbitron text-primary mb-3 flex items-center gap-2"><Rocket size={20}/> {t('crewCreator.shipSectionTitle')}</h3>
                <p className="text-lg font-bold text-primary">{t(shipInfo.ship.nameKey)}</p>
            </Card>
        )}
        </div>
        <div className="mt-8 text-center">
             <Button onMouseEnter={preloadCampaignDashboard} onClick={handleStartCampaign} disabled={!canFinalize} className='py-3 px-8 text-lg'>
                {t('buttons.startCampaign')} <ChevronRight size={20} />
            </Button>
        </div>
    </Card>
  );

  return (
    <>
        {previewCharacter && (
            <GeneratedCharacterDisplay
                data={previewCharacter}
                onAdd={handleAddCharacter}
                onReroll={rollNextCharacter}
                onClose={() => setPreviewCharacter(null)}
            />
        )}
        
        {(() => {
            switch (creationStep) {
                case 'leader': return renderLeaderCreationWizard();
                case 'assemble': return renderAssembleStep();
                case 'finalize': return renderFinalizeStep();
                default: return renderLeaderCreationWizard();
            }
        })()}
    </>
  );
};

export default CrewCreator;
