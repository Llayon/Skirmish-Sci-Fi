import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Crew, Character, Campaign, RaceId, Difficulty, Stash, Background, Motivation, Class, EquipmentPool, Ship, CharacterStats } from '@/types';
import { generateStartingEquipment } from '@/services/characterService';
import { generateStartingShip } from '@/services/shipService';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Users, Dices, ChevronRight, PackagePlus, Briefcase, Coins, BookOpen, Rocket, Cuboid, Star, Zap, Footprints, Target, Heart, Brain, RotateCw, UserPlus, X, UserX, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore } from '@/stores';
import Tooltip from '@/components/ui/Tooltip';
import { RACES, CHARACTER_BACKGROUNDS, MOTIVATION_TABLE, CLASS_TABLE, CREW_TYPE_TABLE, PRIMARY_ALIEN_TABLE, STRANGE_CHARACTER_TABLE } from '@/constants/characterCreation';
import { STRANGE_CHARACTERS } from '@/constants/strangeCharacters';
import { Select, SelectOption } from '@/components/ui/Select';
import { sanitizeToText } from '@/services/utils/sanitization';
import { preloadCampaignDashboard } from '@/services/utils/componentPreloader';
import { rollD6, rollD100 } from '@/services/utils/rolls';
import { resolveTable } from '../services/utils/tables';
import Modal from './ui/Modal';

const getNextPortrait = () => {
    return '/assets/portraits/human_veteran_01.webp';
};

const assembleCharacter = (
    components: { raceId: RaceId, strangeCharacterId?: string, classInfo?: Class, background?: Background, motivationInfo?: Motivation, pronouns: string, details: Pick<Character, 'name' | 'backstory'> }
): { character: Character, campaignBonuses: any, savvyIncreased: boolean } => {
    const { raceId, strangeCharacterId, classInfo, background, motivationInfo, pronouns, details } = components;
    
    if (raceId === 'bot') {
        const botRaceData = RACES['bot'];
        const botCharacter: Character = {
            id: `char_${Date.now()}_${Math.random()}`,
            ...details,
            raceId: 'bot',
            classId: 'bot',
            backgroundId: 'N/A',
            motivationId: 'N/A',
            pronouns,
            stats: { ...botRaceData.baseStats, luck: 0 } as CharacterStats,
            xp: 0,
            consumables: [], weapons: [], implants: [], utilityDevices: [], injuries: [],
            task: 'idle', portraitUrl: getNextPortrait(),
            innateArmorSave: botRaceData.innateArmorSave,
            noXP: botRaceData.noXP,
            noConsumablesOrImplants: botRaceData.noConsumablesOrImplants,
            usesBotInjuryTable: botRaceData.usesBotInjuryTable,
            canInstallBotUpgrades: botRaceData.canInstallBotUpgrades,
            specialAbilities: botRaceData.specialAbilities,
            startingRolls: [],
            position: { x: -1, y: -1 }, status: 'active', actionsRemaining: 0,
            actionsTaken: { move: false, combat: false, dash: false, interact: false },
            stunTokens: 0, currentLuck: 0, activeEffects: [], consumablesUsedThisTurn: 0,
        };
        return { character: botCharacter, campaignBonuses: { credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 }, savvyIncreased: false };
    }

    const strangeData = strangeCharacterId ? STRANGE_CHARACTERS[strangeCharacterId] : null;
    const baseRaceId = strangeData?.baseRaceId || raceId;
    const raceData = RACES[baseRaceId];
    
    const baseStats = { reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0, luck: 1 };
    Object.assign(baseStats, raceData.baseStats);
    if (strangeData) Object.assign(baseStats, strangeData.baseStats);

    const campaignBonuses = { credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 };
    let savvyIncreased = false;
    const startingRolls: string[] = [];
    let xp = 0;

    if (background && classInfo && motivationInfo) {
        const effects = `${background.effect}, ${classInfo.effect}, ${motivationInfo.effect}`.toLowerCase();
        if (effects.includes('+1 savvy')) { baseStats.savvy++; savvyIncreased = true; }
        if (effects.includes('+1 speed')) baseStats.speed++;
        if (effects.includes('+1 toughness')) baseStats.toughness++;
        if (effects.includes('+1 combat skill')) baseStats.combat++;
        if (effects.includes('+1 reactions')) baseStats.reactions++;
        if (effects.includes('+1 luck')) baseStats.luck++;
        if (effects.includes('+2 xp')) xp += 2;

        const resources = `${background.resources}, ${classInfo.resources}, ${motivationInfo.resources}`.toLowerCase();
        if (resources.includes('patron')) campaignBonuses.patrons.push({ id: `patron_${Date.now()}`, name: `A mysterious patron`, type: 'mysterious' });
        if (resources.includes('story point') && !strangeData?.creationOverrides?.ignoreSPCreation) campaignBonuses.storyPoints++;
        if (resources.includes('1 rumor')) campaignBonuses.questRumors++;
        if (resources.includes('2 quest rumors')) campaignBonuses.questRumors += 2;
        if (resources.includes('rival')) campaignBonuses.rivals++;
        if (resources.includes('1d6 credits')) campaignBonuses.credits += rollD6();
        if (resources.includes('2d6 credits')) campaignBonuses.credits += rollD6() + rollD6();

        startingRolls.push(...background.starting_rolls, ...classInfo.starting_rolls, ...motivationInfo.starting_rolls);
    }
     
    if (raceId !== 'baseline_human') baseStats.luck = Math.min(1, baseStats.luck);

    const character: Character = {
        id: `char_${Date.now()}_${Math.random()}`, ...details, raceId: baseRaceId, strangeCharacterId,
        classId: classInfo?.id || 'bot', backgroundId: background?.id || 'N/A', motivationId: motivationInfo?.id || 'N/A', pronouns,
        stats: baseStats, xp, consumables: [], weapons: [], implants: [], utilityDevices: [], injuries: [],
        task: 'idle', portraitUrl: getNextPortrait(),
        innateArmorSave: strangeData?.innateArmorSave || raceData.innateArmorSave,
        noXP: strangeData?.noXP || raceData.noXP,
        noConsumablesOrImplants: raceData.noConsumablesOrImplants,
        usesBotInjuryTable: raceData.usesBotInjuryTable,
        canInstallBotUpgrades: raceData.canInstallBotUpgrades,
        specialAbilities: strangeData?.specialAbilities || raceData.specialAbilities,
        startingRolls,
        position: { x: -1, y: -1 }, status: 'active', actionsRemaining: 0,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        stunTokens: 0, currentLuck: baseStats.luck, activeEffects: [], consumablesUsedThisTurn: 0,
    };
    return { character, campaignBonuses, savvyIncreased };
};

interface GeneratedCharacter {
    character: Character;
    equipment: EquipmentPool;
    bonuses: { credits: number, storyPoints: number, xp: number };
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

const BonusDisplay: React.FC<{
    effect?: string;
    resources?: string;
    starting_rolls?: string[];
    t: (key: string, params?: any) => string;
}> = React.memo(({ effect = '', resources = '', starting_rolls = [], t }) => {
    const bonuses = useMemo(() => {
        const parsed: { icon: React.ReactNode; text: string }[] = [];
        const allBonuses = [effect, resources, ...(starting_rolls || [])].join(', ');

        const mappings = [
            { keyword: 'Savvy', icon: <Brain size={14} />, label: t('characterCard.savvy') },
            { keyword: 'Luck', icon: <Dices size={14} />, label: t('characterCard.luck') },
            { keyword: 'Speed', icon: <Footprints size={14} />, label: t('characterCard.speed') },
            { keyword: 'Toughness', icon: <Heart size={14} />, label: t('characterCard.tough') },
            { keyword: 'Combat Skill', icon: <Target size={14} />, label: t('characterCard.combat') },
            { keyword: 'Reactions', icon: <Zap size={14} />, label: t('characterCard.react') },
            { keyword: 'credits', icon: <Coins size={14} />, label: t('crewCreator.startingCredits') },
            { keyword: 'story point', icon: <Star size={14} />, label: t('crewCreator.storyPoints') },
            { keyword: 'Patron', icon: <Briefcase size={14} />, label: t('crewCreator.patrons') },
            { keyword: 'Rival', icon: <UserX size={14} />, label: t('dashboard.contacts.rivals') },
            { keyword: 'Rumor', icon: <BookOpen size={14} />, label: t('crewCreator.questRumors') },
            { keyword: 'Military Weapon', icon: <Rocket size={14} />, label: t('dashboard.shipStash.weapons') },
            { keyword: 'Low-tech Weapon', icon: <Rocket size={14} />, label: t('dashboard.shipStash.weapons') },
            { keyword: 'High-tech Weapon', icon: <Rocket size={14} />, label: t('dashboard.shipStash.weapons') },
            { keyword: 'Gear', icon: <PackagePlus size={14} />, label: t('characterCard.equipment') },
            { keyword: 'Gadget', icon: <Cuboid size={14} />, label: t('characterCard.equipment') },
            { keyword: 'XP', icon: <Star size={14} />, label: t('characterCard.xp') },
        ];

        const parts = allBonuses.split(/, | and /).map(p => p.trim()).filter(Boolean);

        parts.forEach(part => {
            let found = false;
            for (const mapping of mappings) {
                if (part.toLowerCase().includes(mapping.keyword.toLowerCase())) {
                    const modifiedPart = part.replace(new RegExp(mapping.keyword, 'i'), mapping.label);
                    parsed.push({ icon: mapping.icon, text: modifiedPart });
                    found = true;
                    break;
                }
            }
            if (!found && part) {
                parsed.push({ icon: <Star size={14} />, text: part });
            }
        });

        return parsed;
    }, [effect, resources, starting_rolls, t]);

    if (bonuses.length === 0) {
        return null;
    }

    return (
        <div className='space-y-2 text-sm'>
            {bonuses.map((bonus, i) => (
                <div key={i} className='flex items-center gap-2 text-text-base'>
                    <span className='text-primary'>{bonus.icon}</span>
                    <span>{bonus.text}</span>
                </div>
            ))}
        </div>
    );
});
BonusDisplay.displayName = 'BonusDisplay';


const GeneratedCharacterDisplay: React.FC<{
    data: GeneratedCharacter,
    onAdd: () => void,
    onReroll: () => void,
    onClose: () => void,
}> = ({ data, onAdd, onReroll, onClose }) => {
    const { t } = useTranslation();
    const { character, equipment, bonuses } = data;

    const STAT_CONFIG = {
        reactions: { max: 6, color: 'bg-cyan-400', icon: <Zap size={16} /> },
        speed: { max: 8, color: 'bg-green-400', icon: <Footprints size={16} /> },
        combat: { max: 5, color: 'bg-pink-400', icon: <Target size={16} /> },
        toughness: { max: 6, color: 'bg-yellow-400', icon: <Heart size={16} /> },
        savvy: { max: 5, color: 'bg-purple-400', icon: <Brain size={16} /> },
        luck: { max: 3, color: 'bg-teal-400', icon: <Dices size={16} /> },
    };

    return (
        <Modal onClose={onClose} title={t('crewCreator.newCharacter')}>
            <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
                <div className='p-6 space-y-5'>
                    <div className="flex gap-4 items-center">
                        <img src={character.portraitUrl} alt={`Portrait of ${character.name}`} className="w-24 h-24 rounded-full object-cover border-4 border-primary" />
                        <div>
                            <h2 className="text-2xl font-bold font-orbitron text-primary">{sanitizeToText(character.name)}</h2>
                            <p className="text-sm text-text-muted">{character.strangeCharacterId ? t(`strange_characters.${character.strangeCharacterId}`) : t(`races.${character.raceId}`)}</p>
                        </div>
                    </div>

                    <section>
                        <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('races.species')}</h3>
                        <Card className='bg-surface-base/50'>
                             <span className='absolute top-2 right-2 text-xs font-bold uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full'>{character.strangeCharacterId ? t(`strange_characters.${character.strangeCharacterId}`) : t(`races.${character.raceId}`)}</span>
                             <p className='font-semibold text-primary'>{character.strangeCharacterId ? t(`strange_characters.${character.strangeCharacterId}`) : t(`races.${character.raceId}_desc.title`)}</p>
                             <ul className='list-disc list-inside text-xs text-text-base/80 mt-2 space-y-1'>
                                {(character.strangeCharacterId ? STRANGE_CHARACTERS[character.strangeCharacterId]?.rules : RACES[character.raceId]?.rules)?.map(ruleKey => <li key={ruleKey}>{t(ruleKey)}</li>)}
                             </ul>
                        </Card>
                    </section>

                    <section className='grid grid-cols-3 gap-3'>
                        {(['background', 'motivation', 'class'] as const).map(type => (
                             <Card key={type} className='bg-surface-base/50 text-center p-3'>
                                <h4 className='text-sm font-bold text-primary mb-1'>{t(`crewCreator.attributes.${type}`)}</h4>
                                <p className='text-xs font-semibold text-text-base'>{t(`${type === 'class' ? 'classes' : type + 's'}.${character[`${type}Id` as const]}`)}</p>
                             </Card>
                        ))}
                    </section>

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

                    <section className='grid grid-cols-2 gap-4'>
                        <div>
                            <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('characterCard.equipment')}</h3>
                            <Card className='bg-surface-base/50 p-3 text-xs'>
                                <ul className='list-disc list-inside marker:text-primary space-y-1'>
                                    {equipment.weapons.map((item, i) => <li key={`w-${i}`}>{t(`weapons.${item}`)}</li>)}
                                    {equipment.armor.map((item, i) => <li key={`a-${i}`}>{t(`protective_devices.${item}`)}</li>)}
                                    {equipment.screen.map((item, i) => <li key={`s-${i}`}>{t(`protective_devices.${item}`)}</li>)}
                                    {equipment.consumables.map((item, i) => <li key={`c-${i}`}>{t(`consumables.${item}`)}</li>)}
                                    {equipment.weapons.length === 0 && equipment.armor.length === 0 && equipment.screen.length === 0 && equipment.consumables.length === 0 && (
                                        <li className='text-text-muted italic list-none'>{t('characterCard.none')}</li>
                                    )}
                                </ul>
                                <p className='text-[10px] text-text-muted/70 mt-3 italic'>{t('crewCreator.equipmentNote')}</p>
                            </Card>
                        </div>
                        <div>
                             <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.startingResources')}</h3>
                             <Card className='bg-surface-base/50 p-3 text-xs space-y-2'>
                                <div className='flex justify-between items-center'><span className='text-text-base'>{t('crewCreator.startingCredits')}</span><span className='font-bold text-warning'>{bonuses.credits}</span></div>
                                <div className='flex justify-between items-center'><span className='text-text-base'>{t('crewCreator.luckPoints')}</span><span className='font-bold text-warning'>{character.stats?.luck || 0}</span></div>
                                <div className='flex justify-between items-center'><span className='text-text-base'>{t('crewCreator.experience')}</span><span className='font-bold text-warning'>{bonuses.xp} XP</span></div>
                             </Card>
                        </div>
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

const CrewCreator: React.FC = () => {
  const [creationStep, setCreationStep] = useState<'leader' | 'assemble' | 'finalize'>('leader');
  const [leaderName, setLeaderName] = useState('Leader');
  const [leaderSelections, setLeaderSelections] = useState({
      raceId: 'baseline_human' as RaceId,
      backgroundId: '',
      motivationId: '',
      classId: '',
  });
  const [leaderPreview, setLeaderPreview] = useState<Character | null>(null);

  const [crewName, setCrewName] = useState('The Wanderers');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignBonuses, setCampaignBonuses] = useState<any>({ credits: 0, storyPoints: 0, patrons: [], questRumors: 0, rivals: 0 });
  const [equipmentPool, setEquipmentPool] = useState<EquipmentPool>({ weapons: [], armor: [], screen: [], consumables: [] });
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const [startingStoryPoints, setStartingStoryPoints] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [shipInfo, setShipInfo] = useState<{ ship: Ship; debt: number } | null>(null);
  
  const [previewCharacter, setPreviewCharacter] = useState<GeneratedCharacter | null>(null);

  const { t } = useTranslation();
  const startCampaign = useCampaignProgressStore(state => state.actions.startCampaign);

  const raceOptions = useMemo(() => Object.values(RACES).filter(r => r.id !== 'bot').map(race => ({ value: race.id, label: t(race.nameKey) })), [t]);
  const backgroundOptions = useMemo(() => CHARACTER_BACKGROUNDS.map(bg => ({ value: bg.id, label: t(`backgrounds.${bg.id}`) })), [t]);
  const motivationOptions = useMemo(() => MOTIVATION_TABLE.map(m => ({ value: m.value.id, label: t(`motivations.${m.value.id}`) })), [t]);
  const classOptions = useMemo(() => CLASS_TABLE.map(c => ({ value: c.value.id, label: t(`classes.${c.value.id}`) })), [t]);

  const STAT_CONFIG = {
    reactions: { max: 6, color: 'bg-cyan-400', icon: <Zap size={16} /> },
    speed: { max: 8, color: 'bg-green-400', icon: <Footprints size={16} /> },
    combat: { max: 5, color: 'bg-pink-400', icon: <Target size={16} /> },
    toughness: { max: 6, color: 'bg-yellow-400', icon: <Heart size={16} /> },
    savvy: { max: 5, color: 'bg-purple-400', icon: <Brain size={16} /> },
    luck: { max: 3, color: 'bg-teal-400', icon: <Dices size={16} /> },
  };

  useEffect(() => {
    const race = RACES[leaderSelections.raceId];
    const background = CHARACTER_BACKGROUNDS.find(bg => bg.id === leaderSelections.backgroundId);
    const motivation = MOTIVATION_TABLE.find(m => m.value.id === leaderSelections.motivationId)?.value;
    const classInfo = CLASS_TABLE.find(c => c.value.id === leaderSelections.classId)?.value;

    if (!race) return;

    const baseStats: CharacterStats = {
        reactions: 1, speed: 4, combat: 0, toughness: 3, savvy: 0, luck: 1,
        ...race.baseStats
    };

    const applyEffect = (effect?: string) => {
        if (!effect) return;
        const lowerEffect = effect.toLowerCase();
        if (lowerEffect.includes('+1 savvy')) baseStats.savvy++;
        if (lowerEffect.includes('+1 speed')) baseStats.speed++;
        if (lowerEffect.includes('+1 toughness')) baseStats.toughness++;
        if (lowerEffect.includes('+1 combat skill')) baseStats.combat++;
        if (lowerEffect.includes('+1 reactions')) baseStats.reactions++;
        if (lowerEffect.includes('+1 luck')) baseStats.luck++;
    };

    applyEffect(background?.effect);
    applyEffect(motivation?.effect);
    applyEffect(classInfo?.effect);

    if (race.id !== 'baseline_human') {
        baseStats.luck = Math.min(1, baseStats.luck);
    }
    if (race.id === 'engineer') {
        baseStats.toughness = Math.min(4, baseStats.toughness);
    }

    setLeaderPreview({
        id: 'leader-preview', name: leaderName, raceId: leaderSelections.raceId,
        backgroundId: leaderSelections.backgroundId, motivationId: leaderSelections.motivationId, classId: leaderSelections.classId,
        stats: baseStats,
        pronouns: 'they/them', backstory: '', xp: 0, weapons: [], consumables: [], implants: [], utilityDevices: [], injuries: [],
        task: 'idle', portraitUrl: '', position: { x: -1, y: -1 }, status: 'active', actionsRemaining: 0,
        actionsTaken: { move: false, combat: false, dash: false, interact: false },
        stunTokens: 0, currentLuck: baseStats.luck, activeEffects: [], consumablesUsedThisTurn: 0,
    });
  }, [leaderSelections, leaderName]);


  const rollNextCharacter = useCallback(() => {
    setIsLoading(true);
    
    const crewTypeRoll = rollD100();
    const crewType = resolveTable(CREW_TYPE_TABLE, crewTypeRoll).value;
    
    let raceId: RaceId = 'baseline_human';
    let strangeCharacterId: string | undefined = undefined;

    switch (crewType) {
        case 'primary_alien':
            raceId = resolveTable(PRIMARY_ALIEN_TABLE, rollD100()).value;
            break;
        case 'bot':
            raceId = 'bot';
            break;
        case 'strange_character':
            strangeCharacterId = resolveTable(STRANGE_CHARACTER_TABLE, rollD100()).value;
            break;
        case 'baseline_human':
        default:
            raceId = 'baseline_human';
            break;
    }
    
    const details = { name: `Guardian-${characters.length + 1}`, backstory: 'Another soul seeking fortune.' };
    
    if (raceId === 'bot') {
        const { character } = assembleCharacter({
            raceId: 'bot',
            classInfo: {} as Class, background: {} as Background, motivationInfo: {} as Motivation,
            pronouns: 'they/them',
            details: { name: `Unit-${characters.length + 1}`, backstory: 'A new bot joins the crew.' }
        });
        const equipment = generateStartingEquipment(0, []);
        const bonuses = { credits: 0, storyPoints: 0, xp: 0 };
        setPreviewCharacter({ character, equipment, bonuses });
        setIsLoading(false);
        return;
    }

    const strangeData = strangeCharacterId ? STRANGE_CHARACTERS[strangeCharacterId] : null;

    let background: Background;
    if (strangeData?.creationOverrides?.rollTwiceBackground) {
        const roll1 = rollD100();
        let roll2 = rollD100();
        while (roll1 === roll2) roll2 = rollD100();
        const bg1 = resolveTable(CHARACTER_BACKGROUNDS, roll1);
        const bg2 = resolveTable(CHARACTER_BACKGROUNDS, roll2);
        background = {
            ...bg1,
            effect: `${bg1.effect}, ${bg2.effect}`,
            resources: `${bg1.resources}, ${bg2.resources}`,
            starting_rolls: [...bg1.starting_rolls, ...bg2.starting_rolls],
        };
    } else if (strangeData?.creationOverrides?.fixedBackground) {
        background = CHARACTER_BACKGROUNDS.find(b => b.id === strangeData!.creationOverrides!.fixedBackground)!;
    } else {
        background = resolveTable(CHARACTER_BACKGROUNDS, rollD100());
    }

    let motivationInfo: Motivation;
    if (strangeData?.creationOverrides?.fixedMotivation) {
        motivationInfo = MOTIVATION_TABLE.find(m => m.value.id === strangeData!.creationOverrides!.fixedMotivation)!.value;
    } else {
        motivationInfo = resolveTable(MOTIVATION_TABLE, rollD100()).value;
    }

    let classInfo: Class;
    const classRoll = rollD100();
    const initialClass = resolveTable(CLASS_TABLE, classRoll).value;
    if (strangeData?.creationOverrides?.classRestrictions && strangeData.creationOverrides.classRestrictions[initialClass.id]) {
        const newClassId = strangeData.creationOverrides.classRestrictions[initialClass.id];
        classInfo = CLASS_TABLE.find(c => c.value.id === newClassId)!.value;
    } else {
        classInfo = initialClass;
    }

    const { character, campaignBonuses: newBonuses } = assembleCharacter({
        raceId: strangeData?.baseRaceId || raceId,
        strangeCharacterId,
        classInfo,
        background,
        motivationInfo,
        pronouns: 'they/them',
        details
    });

    const equipment = generateStartingEquipment(character.stats.savvy > 0 ? 1 : 0, character.startingRolls || []);
    const bonuses = { credits: newBonuses.credits, storyPoints: newBonuses.storyPoints, xp: character.xp };
    
    setPreviewCharacter({ character, equipment, bonuses });
    setIsLoading(false);
  }, [characters.length]);

  const handleLeaderSelection = (field: keyof typeof leaderSelections, value: string) => {
      setLeaderSelections(prev => ({...prev, [field]: value }));
  };
  
  const isLeaderFormComplete = leaderSelections.backgroundId && leaderSelections.classId && leaderSelections.motivationId && leaderSelections.raceId;

  const handleConfirmLeader = () => {
    if (!isLeaderFormComplete || !leaderPreview) return;
    setIsLoading(true);

    const background = CHARACTER_BACKGROUNDS.find(bg => bg.id === leaderSelections.backgroundId)!;
    const motivationInfo = MOTIVATION_TABLE.find(m => m.value.id === leaderSelections.motivationId)!.value;
    const classInfo = CLASS_TABLE.find(c => c.value.id === leaderSelections.classId)!.value;

    const result = assembleCharacter({
        raceId: leaderSelections.raceId,
        classInfo,
        background,
        motivationInfo,
        pronouns: 'they/them',
        details: { name: leaderName, backstory: 'A leader forged in the Fringe.' }
    });

    const leader = { ...result.character, isLeader: true };
    setCharacters([leader]);
    setLeaderId(leader.id);
    setCampaignBonuses(result.campaignBonuses);
    rollNextCharacter();
    setCreationStep('assemble');
    setIsLoading(false);
  };

  const handleAddCharacter = () => {
    if (!previewCharacter) return;
    
    setCharacters(prev => [...prev, previewCharacter.character]);
    setCampaignBonuses(prev => ({
        ...prev,
        credits: prev.credits + previewCharacter.bonuses.credits,
        storyPoints: prev.storyPoints + previewCharacter.bonuses.storyPoints,
    }));
    setEquipmentPool(prev => ({
        weapons: [...prev.weapons, ...previewCharacter.equipment.weapons],
        armor: [...prev.armor, ...previewCharacter.equipment.armor],
        screen: [...prev.screen, ...previewCharacter.equipment.screen],
        consumables: [...prev.consumables, ...previewCharacter.equipment.consumables],
    }));

    if (characters.length + 1 < 6) {
        rollNextCharacter();
    } else {
        setPreviewCharacter(null);
    }
  };
  
  const handleProceedToFinalize = () => setCreationStep('finalize');
  
  const handleGenerateShip = () => setShipInfo(generateStartingShip());
  const handleRollStartingSP = () => setStartingStoryPoints(rollD6() + 1);

  const handleStartCampaign = () => {
    if (!shipInfo || !leaderId) return;
    
    const finalCharacters = characters.map(char => ({ ...char, startingRolls: undefined }));

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
  
  const canFinalize = leaderId && startingStoryPoints !== null && shipInfo;

  if (creationStep === 'leader') {
      return (
          <Card className="max-w-3xl mx-auto bg-surface-overlay">
            <div className='flex justify-between items-start'>
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-orbitron text-primary">{t('crewCreator.leader.title')}</h2>
                    <p className="text-sm text-text-muted mt-1">{t('crewCreator.leader.subtitle')}</p>
                </div>
                <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="Leader Name"
                    className="bg-surface-base/50 border border-border rounded-md py-1 px-3 text-text-base text-lg font-bold w-48 text-right"
                />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className='space-y-4'>
                    <section>
                        <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('races.species')}</h3>
                        <Select options={raceOptions} value={leaderSelections.raceId} onChange={val => handleLeaderSelection('raceId', val)} />
                    </section>
                    <section className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div>
                            <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.attributes.background')}</h3>
                            <Select options={backgroundOptions} value={leaderSelections.backgroundId} onChange={val => handleLeaderSelection('backgroundId', val)} />
                        </div>
                        <div>
                            <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.attributes.motivation')}</h3>
                            <Select options={motivationOptions} value={leaderSelections.motivationId} onChange={val => handleLeaderSelection('motivationId', val)} />
                        </div>
                    </section>
                    <section>
                        <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.attributes.class')}</h3>
                         <Select options={classOptions} value={leaderSelections.classId} onChange={val => handleLeaderSelection('classId', val)} />
                    </section>
                </div>

                <div className='space-y-4'>
                    <h3 className='text-sm font-bold text-text-muted uppercase tracking-wider mb-2'>{t('crewCreator.finalStats')}</h3>
                    <Card className='bg-surface-base/50 p-4 flex gap-4 items-center'>
                        <img src="/assets/portraits/human_veteran_01.webp" alt="Leader Portrait Preview" className="w-20 h-20 rounded-md object-cover border-2 border-border/50 shrink-0" />
                        <div className="flex-grow">
                            {leaderPreview ? (
                                <div className='space-y-2 animate-fade-in'>
                                    <StatBar label={t('characterCard.react')} value={leaderPreview.stats.reactions} max={STAT_CONFIG.reactions.max} colorClass={STAT_CONFIG.reactions.color} icon={STAT_CONFIG.reactions.icon} />
                                    <StatBar label={t('characterCard.speed')} value={leaderPreview.stats.speed} max={STAT_CONFIG.speed.max} colorClass={STAT_CONFIG.speed.color} icon={STAT_CONFIG.speed.icon} />
                                    <StatBar label={t('characterCard.combat')} value={leaderPreview.stats.combat} max={STAT_CONFIG.combat.max} colorClass={STAT_CONFIG.combat.color} icon={STAT_CONFIG.combat.icon} />
                                    <StatBar label={t('characterCard.tough')} value={leaderPreview.stats.toughness} max={STAT_CONFIG.toughness.max} colorClass={STAT_CONFIG.toughness.color} icon={STAT_CONFIG.toughness.icon} />
                                    <StatBar label={t('characterCard.savvy')} value={leaderPreview.stats.savvy} max={STAT_CONFIG.savvy.max} colorClass={STAT_CONFIG.savvy.color} icon={STAT_CONFIG.savvy.icon} />
                                    <StatBar label={t('characterCard.luck')} value={leaderPreview.stats.luck} max={STAT_CONFIG.luck.max} colorClass={STAT_CONFIG.luck.color} icon={STAT_CONFIG.luck.icon} />
                                </div>
                            ) : (
                                <div className='text-center text-text-muted italic py-10'>{t('crewCreator.selectAttributes')}</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Button onClick={handleConfirmLeader} disabled={!isLeaderFormComplete || isLoading} isLoading={isLoading}>
                    {t('buttons.confirm')} <ChevronRight />
                </Button>
            </div>
          </Card>
      );
  }

  if (creationStep === 'assemble') {
      return (
        <Card className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 font-orbitron text-primary">{t('crewCreator.assemble.title')}</h2>
            <div className='flex justify-between items-center mb-4 p-2 bg-surface-base/50 rounded-lg'>
                <h3 className='text-lg font-semibold text-primary'>{t('crewCreator.currentCrew')} ({characters.length}/6)</h3>
                {characters.length >= 4 && (
                    <Button onClick={handleProceedToFinalize} variant="primary">
                        {t('buttons.finalizeCrew')} <ChevronRight />
                    </Button>
                )}
            </div>
            <div className='grid grid-cols-2 md:grid-cols-3 gap-2 mb-6'>
                {characters.map(char => (
                    <div key={char.id} className='p-2 bg-surface-raised rounded-md text-xs flex items-center gap-2'>
                        <img src={char.portraitUrl} alt={sanitizeToText(char.name)} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div>
                            <p className='font-bold text-primary truncate'>{char.isLeader ? `⭐ ${sanitizeToText(char.name)}` : sanitizeToText(char.name)}</p>
                            <p className='text-text-muted truncate'>{char.strangeCharacterId ? t(`strange_characters.${char.strangeCharacterId}`) : t(`races.${char.raceId}`)} {t(`classes.${char.classId}`)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {previewCharacter && (
                <GeneratedCharacterDisplay
                    data={previewCharacter}
                    onAdd={handleAddCharacter}
                    onReroll={rollNextCharacter}
                    onClose={() => setPreviewCharacter(null)}
                />
            )}
            
            {!previewCharacter && characters.length < 6 && (
                <div className='text-center p-8 border-2 border-dashed border-border/50 rounded-lg'>
                    <Button onClick={rollNextCharacter} isLoading={isLoading}>
                        <Dices /> {t('buttons.rollForMember')}
                    </Button>
                </div>
            )}

            {!previewCharacter && characters.length >= 6 && (
                 <div className='text-center p-8 border-2 border-dashed border-success/50 rounded-lg bg-success/10'>
                    <p className='font-bold text-success'>{t('crewCreator.crewComplete')}</p>
                    <p className='text-sm text-text-muted mt-2'>{t('crewCreator.proceedToFinalize')}</p>
                 </div>
            )}
        </Card>
      );
  }

  return (
    <Card className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 font-orbitron text-primary">{t('crewCreator.title')}</h2>
        <p className="text-center text-text-muted mb-6">{t('crewCreator.subtitle')}</p>
        <div className="mb-6">
            <label htmlFor="crewName" className="block text-sm font-medium text-text-base mb-2">{t('crewCreator.crewNameLabel')}</label>
            <input type="text" id="crewName" value={crewName} onChange={(e) => setCrewName(e.target.value)} className="w-full bg-surface-overlay border border-border rounded-md py-2 px-3 text-text-base focus:ring-2 focus:ring-primary focus:border-primary" />
        </div>
          <Card className="mb-8 bg-surface-base/40">
              <h3 className="text-lg font-bold text-primary font-orbitron mb-3 flex items-center gap-2"><Dices size={18} /> {t('crewCreator.storyPoints')}</h3>
              <div className="text-center">
                  {startingStoryPoints === null ? (
                        <Button onClick={handleRollStartingSP}>{t('buttons.roll')} (1D6+1)</Button>
                  ) : (
                      <p className="text-5xl font-bold text-primary font-orbitron">{startingStoryPoints}</p>
                  )}
              </div>
          </Card>
          <div className="text-center border-t border-border pt-6">
            {!shipInfo ? (
                <>
                    <h3 className="text-xl font-bold mb-2 text-primary">{t('crewCreator.shipSectionTitle')}</h3>
                    <p className="text-text-muted mb-4">{t('crewCreator.shipSectionSubtitle')}</p>
                    <Tooltip content={startingStoryPoints === null ? 'Roll for Story Points first' : ''}>
                       <div className="inline-block">
                           <Button onClick={handleGenerateShip} disabled={startingStoryPoints === null}>
                               <Rocket size={18} /> {t('buttons.generateShip')}
                           </Button>
                       </div>
                    </Tooltip>
                </>
            ) : (
                <div className="space-y-4">
                    <Card className="text-left bg-surface-base/40">
                         <h3 className="text-xl font-bold font-orbitron text-primary mb-3 flex items-center gap-2"><Rocket size={20}/> {t('crewCreator.shipSectionTitle')}</h3>
                         <p className="text-lg font-bold text-primary">{t(shipInfo.ship.nameKey)}</p>
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
    </Card>
  );
};

export default CrewCreator;