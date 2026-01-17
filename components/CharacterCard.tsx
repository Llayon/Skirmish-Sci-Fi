import React, { useMemo } from 'react';
import { Character } from '@/types';
import Card from '@/components/ui/Card';
import { Zap, Shield, Heart, Brain, Footprints, Target, Dices, Package, BadgePercent, Star, PackagePlus, Wrench, ToyBrick, Cpu, Info, Aperture } from 'lucide-react';
import { getWeaponById } from '@/services/data/items';
import { useTranslation } from '@/i18n';
import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { sanitizeToText } from '@/services/utils/sanitization';
import { RACES } from '@/constants/characterCreation';
import { STRANGE_CHARACTERS } from '@/constants/strangeCharacters';

/**
 * Props for the CharacterCard component.
 * @property {Character} character - The character data to display.
 * @property {() => void} onManageGear - Callback function to open the inventory management modal for this character.
 * @property {() => void} [onUpgradeBot] - Callback to open the bot upgrade modal.
 */
interface CharacterCardProps {
  character: Character;
  onManageGear: () => void;
  onUpgradeBot?: () => void;
}

/**
 * A small, reusable component for displaying a character statistic with an icon and a tooltip.
 * @property {React.ReactNode} icon - The icon to display.
 * @property {string} label - The label for the stat (e.g., 'React').
 * @property {React.ReactNode} value - The value of the stat to display.
 * @property {string} tooltip - The descriptive text to show in the tooltip.
 */
export const StatDisplay: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode, tooltip: string }> = React.memo(({ icon, label, value, tooltip }) => (
  <Tooltip content={tooltip}>
    <div className='flex flex-col items-center text-center p-2 bg-surface-base/50 rounded-md' tabIndex={0} aria-label={`${label}: ${value}`}>
      <div className='text-primary'>{icon}</div>
      <span className='text-lg sm:text-xl font-bold'>{value}</span>
      <span className='text-xs text-text-muted uppercase'>{label}</span>
    </div>
  </Tooltip>
));

/**
 * A detailed card component that displays all information about a single character.
 * This includes their backstory, stats, weapons, and equipment. It is used on the campaign dashboard.
 * @param {CharacterCardProps} props - The component props.
 * @returns {React.ReactElement} The rendered character card.
 */
const CharacterCard: React.FC<CharacterCardProps> = ({ character, onManageGear, onUpgradeBot }) => {
  const { t } = useTranslation();

  const characterType = useMemo(() => {
    if (character.strangeCharacterId) {
      return STRANGE_CHARACTERS[character.strangeCharacterId];
    }
    return RACES[character.raceId];
  }, [character.raceId, character.strangeCharacterId]);
  
  const rules = useMemo(() => {
    return characterType?.rules || [];
  }, [characterType]);


  return (
    <Card className='flex flex-col h-full overflow-hidden'>
      {/* Top Section: Portrait, Info & XP */}
      <div className="flex gap-4 mb-4 items-start">
        <img src={character.portraitUrl} alt={`Portrait of ${sanitizeToText(character.name)}`} className="w-20 h-20 rounded-md object-cover border-2 border-border/50 shrink-0" />
        <div className="flex-grow flex justify-between items-start">
          <div>
            <h4 className='text-lg sm:text-xl font-bold font-orbitron text-primary'>{sanitizeToText(character.name)}</h4>
            <div className='flex items-center gap-2'>
              <p className='text-xs text-text-muted'>{character.strangeCharacterId ? t(`strange_characters.${character.strangeCharacterId}`) : t(`races.${character.raceId}`)} &bull; {t(`classes.${character.classId}`)}</p>
              {rules.length > 0 && (
                <Tooltip content={
                  <ul className='list-disc list-inside text-left'>
                    {rules.map(ruleKey => <li key={ruleKey}>{t(ruleKey)}</li>)}
                  </ul>
                }>
                  <Info size={14} className='text-info cursor-help' />
                </Tooltip>
              )}
            </div>
            {character.isLeader && (
              <div className='flex items-center gap-1 text-xs text-warning mt-1'>
                <Star size={12} /> <span>{t('characterCard.leader')}</span>
              </div>
            )}
          </div>
          <div className='text-right'>
            <p className='text-xs text-text-muted uppercase'>{t('characterCard.xp')}</p>
            <p className='text-2xl font-bold font-orbitron text-warning'>{character.xp}</p>
          </div>
        </div>
      </div>


      {/* Stats Grid */}
      <div className='grid grid-cols-3 gap-2 mb-4'>
        <StatDisplay icon={<Zap size={18} />} label={t('characterCard.react')} value={character.stats.reactions} tooltip={t('tooltips.stats.reactions')} />
        <StatDisplay icon={<Footprints size={18} />} label={t('characterCard.speed')} value={character.stats.speed} tooltip={t('tooltips.stats.speed')} />
        <StatDisplay icon={<Target size={18} />} label={t('characterCard.combat')} value={character.stats.combat} tooltip={t('tooltips.stats.combat')} />
        <StatDisplay icon={<Heart size={18} />} label={t('characterCard.tough')} value={character.stats.toughness} tooltip={t('tooltips.stats.toughness')} />
        <StatDisplay icon={<Brain size={18} />} label={t('characterCard.savvy')} value={character.stats.savvy} tooltip={t('tooltips.stats.savvy')} />
        <StatDisplay icon={<Dices size={18} />} label={t('characterCard.luck')} value={`${character.currentLuck || 0}/${character.stats.luck}`} tooltip={t('tooltips.stats.luck')} />
      </div>
      
      {/* Equipment Section */}
      <div className='flex-grow space-y-3 text-sm'>
        <div>
          <h5 className='font-bold text-text-muted uppercase tracking-wider text-xs'>{t('characterCard.weapons')}</h5>
          <div className='space-y-2 mt-1'>
            {(character.weapons || []).length > 0 ? (character.weapons || []).map(cw => {
              const w = getWeaponById(cw.weaponId); // Note: This doesn't use effective weapon as it's a campaign view.
              if (!w) return null;
              const descriptionKey = `weapons_desc.${w.id}`;
              const description = t(descriptionKey);
              
              return (
                <div key={cw.instanceId} className="p-2 bg-surface-base/50 rounded-md text-xs border border-border/50">
                    <div className="flex justify-between items-center">
                        <p className='font-semibold text-primary/90'>{t(`weapons.${w.id}`)}</p>
                        <div className='flex gap-x-2 text-text-muted font-mono'>
                            <span>R:{w.range}</span>
                            <span>S:{w.shots}</span>
                            <span>D:{w.damage > 0 ? `+${w.damage}` : w.damage}</span>
                        </div>
                    </div>
                    {(cw.modId || cw.sightId) && (
                        <div className='text-xs text-accent italic pl-2 border-l-2 border-accent/30 ml-1 mt-2 py-1'>
                          {cw.modId && <div><Wrench size={12} className='inline-block mr-1' />{t(`gun_mods.${cw.modId}`)}</div>}
                          {cw.sightId && <div className='flex justify-between items-center'>
                              <span><Aperture size={12} className='inline-block mr-1' />{t(`gun_sights.${cw.sightId}`)}</span>
                          </div>}
                        </div>
                    )}
                    {description !== descriptionKey &&
                        <p className="text-text-base/80 text-[11px] mt-1 whitespace-normal">{description}</p>
                    }
                </div>
              );
            }) : <p className='text-text-muted italic text-xs p-2'>{t('characterCard.unarmed')}</p>}
          </div>
        </div>
         <div>
          <h5 className='font-bold text-text-muted uppercase tracking-wider text-xs'>{t('characterCard.equipment')}</h5>
          <ul className='list-disc list-inside marker:text-primary pl-2'>
            {character.armor && <li><Shield size={12} className='inline-block mr-1 text-info' /> {t(`protective_devices.${character.armor}`)}</li>}
            {character.screen && <li><Shield size={12} className='inline-block mr-1 text-accent' /> {t(`protective_devices.${character.screen}`)}</li>}
            {(character.consumables || []).map((cId, i) => <li key={i}><Package size={12} className='inline-block mr-1' /> {t(`consumables.${cId}`)}</li>)}
            {(character.implants || []).map((iId, i) => <li key={i}><Cpu size={12} className='inline-block mr-1' /> {t(`implants.${iId}`)}</li>)}
            {(character.utilityDevices || []).map((dId, i) => <li key={i}><ToyBrick size={12} className='inline-block mr-1' /> {t(`utility_devices.${dId}`)}</li>)}
            {(!character.armor && !character.screen && (character.consumables || []).length === 0 && (character.implants || []).length === 0 && (character.utilityDevices || []).length === 0) && <li className='text-text-muted italic'>{t('characterCard.none')}</li>}
          </ul>
        </div>
      </div>

      {/* Action Button */}
      <div className='mt-auto pt-4'>
        {character.canInstallBotUpgrades && character.raceId === 'bot' ? (
          <Button onClick={onUpgradeBot} className='w-full'>
            <Wrench size={16} /> {t('characterCard.upgradeBot')}
          </Button>
        ) : character.canInstallBotUpgrades ? (
          <div className="flex gap-2">
            <Button onClick={onManageGear} className='w-full'>
                <PackagePlus size={16} /> {t('characterCard.manageGear')}
            </Button>
            <Button onClick={onUpgradeBot} className='w-full'>
                <Wrench size={16} /> {t('characterCard.upgradeBot')}
            </Button>
          </div>
        ) : (
          <Button onClick={onManageGear} className='w-full'>
            <PackagePlus size={16} /> {t('characterCard.manageGear')}
          </Button>
        )}
      </div>
    </Card>
  );
};
export default CharacterCard;
