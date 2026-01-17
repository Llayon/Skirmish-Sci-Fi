import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore, useShipStore } from '../../stores';
import { Coins, AlertTriangle, UserMinus, Wrench, HeartPulse, Pill, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Character } from '../../types';
import { CampaignDomain } from '../../services/domain/campaignDomain';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { sanitizeToText } from '../../services/utils/sanitization';
import Tooltip from '../ui/Tooltip';

/**
 * Defines a specific type for dismissable items to ensure type safety.
 * @property {string} id - The unique instance ID or type ID of the item.
 * @property {'weapon' | 'armor' | 'screen' | 'consumable'} type - The category of the item.
 * @property {string} name - The display name of the item.
 * @property {string} [weaponId] - The base weapon ID, if the item is a weapon.
 */
type DismissableItem = {
  id: string;
  type: 'weapon' | 'armor' | 'screen' | 'consumable';
  name: string;
  weaponId?: string;
};

/**
 * A full-screen component that guides the player through the campaign's upkeep phase.
 * This includes paying crew salaries, managing debt, repairing the ship, and tending to injured members.
 * @returns {React.ReactElement | null} The rendered upkeep panel, or null if data is not available.
 */
const UpkeepPanel: React.FC = () => {
  const { t } = useTranslation();
  const crew = useCrewStore(state => state.crew);
  const crewActions = useCrewStore(state => state.actions);
  const { ship, stash } = useShipStore(state => state);
  const campaign = useCampaignProgressStore(state => state.campaign);
  const { finalizeUpkeep, skipUpkeep } = useCampaignProgressStore(state => state.actions);
  const { addToast } = useToast();

  const [debtPayment, setDebtPayment] = useState('');
  const [repairPayment, setRepairPayment] = useState('');
  const [dismissingChar, setDismissingChar] = useState<Character | null>(null);
  const [itemToKeep, setItemToKeep] = useState<DismissableItem | null>(null);
  const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
  const [medicalBayTarget, setMedicalBayTarget] = useState<string | null>(null);

  const activeCrew = useMemo(() => crew?.members.filter(m => !m.isUnavailableForTasks) || [], [crew]);
  const hasRationPacks = stash?.onBoardItems.includes('colonist_ration_packs');
  const hasMedicalBay = ship?.components.includes('medical_bay');
  const hasLacksFacilities = useMemo(() => campaign?.currentWorld?.traits.some(t => t.id === 'lacks_starship_facilities'), [campaign]);
  const hasImportRestrictions = useMemo(() => campaign?.currentWorld?.traits.some(t => t.id === 'import_restrictions'), [campaign]);
  const sellDisabledTooltip = hasImportRestrictions ? t('worldtraits.import_restrictions.desc') : '';

  const hasHighCostOfLiving = useMemo(() => {
    return campaign?.currentWorld?.traits.some(t => t.id === 'high_cost');
  }, [campaign?.currentWorld]);

  const medicalCost = useMemo(() => {
    return campaign?.currentWorld?.traits.some(t => t.id === 'medical_science') ? 3 : 4;
  }, [campaign]);

  const upkeepCost = useMemo(() => {
    if (!ship) return 0;
    return CampaignDomain.calculateUpkeepCost(activeCrew.length, false, false, ship, campaign?.currentWorld ?? null);
  }, [activeCrew, ship, campaign?.currentWorld]);

  const finalUpkeepCost = useMemo(() => {
    if (!ship) return 0;
    return CampaignDomain.calculateUpkeepCost(activeCrew.length, !!hasRationPacks, !!campaign?.canSkipUpkeep, ship, campaign?.currentWorld ?? null);
  }, [activeCrew, hasRationPacks, campaign?.canSkipUpkeep, ship, campaign?.currentWorld]);


  const healingCrew = useMemo(() => crew?.members.filter(m => m.injuries.some(i => i.recoveryTurns > 0)) || [], [crew]);

  const canAffordUpkeep = (campaign?.credits || 0) >= finalUpkeepCost;

  const maxRepairCredits = useMemo(() => (campaign?.credits || 0) - (parseInt(debtPayment, 10) || 0) + (campaign?.starshipParts || 0), [campaign, debtPayment]);
  const repairLimit = hasLacksFacilities ? 3 : Infinity;
  const finalMaxRepair = useMemo(() => Math.min(maxRepairCredits, repairLimit), [maxRepairCredits, repairLimit]);

  const handleRepairChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setRepairPayment('');
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= finalMaxRepair) {
      setRepairPayment(value);
    }
  };


  if (!crew || !campaign || !ship || !stash) return null;

  const handleSellItem = (characterId: string, itemId: string, itemType: 'weapon' | 'armor' | 'screen' | 'consumable') => {
    crewActions.sellItemForUpkeep(characterId, itemId, itemType);
    addToast({ message: t('upkeep.itemSold'), type: 'success' });
  };

  const handleFinalize = () => {
    finalizeUpkeep({
      debt: parseInt(debtPayment, 10) || 0,
      repairs: parseInt(repairPayment, 10) || 0,
      medicalBayTarget: medicalBayTarget,
    });
  };

  const handleDismissConfirm = () => {
    if (!dismissingChar) return;
    crewActions.dismissCharacter(dismissingChar.id, itemToKeep ?? undefined);
    setDismissingChar(null);
    setItemToKeep(null);
  };

  const getDismissableItems = (char: Character): DismissableItem[] => {
    const items: DismissableItem[] = [];
    (char.weapons || []).forEach(cw => items.push({ id: cw.instanceId, type: 'weapon', name: t(`weapons.${cw.weaponId}`), weaponId: cw.weaponId }));
    if (char.armor) items.push({ id: char.armor, type: 'armor', name: t(`protective_devices.${char.armor}`) });
    if (char.screen) items.push({ id: char.screen, type: 'screen', name: t(`protective_devices.${char.screen}`) });
    (char.consumables || []).forEach(id => items.push({ id: id, type: 'consumable', name: t(`consumables.${id}`) }));
    return items;
  }

  if (campaign.canSkipUpkeep) {
    return (
        <div className='max-w-4xl mx-auto space-y-6'>
            <Card>
                <h2 className='text-2xl font-bold font-orbitron text-primary mb-2'>{t('upkeep.title')}</h2>
                <div className='p-4 bg-success/20 rounded-lg mb-6 text-center'>
                    <CheckCircle className='w-12 h-12 text-success mx-auto mb-3' />
                    <h3 className='text-lg font-bold font-orbitron text-success mb-2'>{t('upkeep.basicSupplies.prompt')}</h3>
                    <p className='text-text-base mb-4'>{t('upkeep.basicSupplies.description')}</p>
                    <Button onClick={() => skipUpkeep()} variant='primary' className='py-3 px-6 text-lg'>
                        {t('upkeep.basicSupplies.button')}
                    </Button>
                </div>
            </Card>
        </div>
    )
  }

  return (
    <>
      <div className='max-w-4xl mx-auto space-y-6'>
        <Card>
          <h2 className='text-2xl font-bold font-orbitron text-primary mb-2'>{t('upkeep.title')}</h2>
          <p className='text-text-muted mb-6'>{t('upkeep.description')}</p>

          {/* Crew Upkeep & Roster */}
          <div className='p-4 bg-surface-base/50 rounded-lg mb-6'>
            <h3 className='text-lg font-bold font-orbitron text-primary mb-3'>{t('upkeep.crewManagementTitle')}</h3>
            <div className='flex justify-between items-center mb-4 p-3 bg-surface-overlay/50 rounded-md'>
              <div>
                <p className='font-bold text-text-base'>{t('upkeep.activeCrew', { count: activeCrew.length })}</p>
                {hasHighCostOfLiving && (
                    <Tooltip content={t('worldtraits.high_cost.desc')}>
                        <p className="text-xs text-warning cursor-help flex items-center gap-1"><AlertTriangle size={12} /> {t('worldtraits.high_cost.name')}</p>
                    </Tooltip>
                )}
                <p className={`text-lg font-bold flex items-center gap-2 ${hasRationPacks ? 'line-through text-text-muted' : ''}`}>
                  <Coins className='text-warning' size={20} />
                  <span>{t('upkeep.cost', { cost: upkeepCost })}</span>
                </p>
                {hasRationPacks && <p className='text-success font-bold text-sm mt-1'>{t('upkeep.rationsApplied')}</p>}
              </div>
              <div className='text-right'>
                <p className='text-sm text-text-muted'>Current Balance</p>
                <p className='text-lg font-bold text-text-base'>{campaign.credits} Credits</p>
              </div>
            </div>

            {!canAffordUpkeep && (
              <div className='p-3 bg-danger/30 text-danger rounded-md mb-4 flex items-start gap-3 text-sm'>
                <AlertTriangle size={24} className='flex-shrink-0 mt-0.5' />
                <p>{t('upkeep.insufficientFunds')}<br />{t('upkeep.sellGearPrompt')}</p>
              </div>
            )}

            <div className='space-y-2'>
              {crew.members.map(char => (
                <div key={char.id} className='bg-surface-overlay/70 rounded-md'>
                  <div className='p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2'>
                    <span className='font-bold text-text-base'>{sanitizeToText(char.name)}</span>
                    <div className='flex items-center gap-2 self-end sm:self-center'>
                      <Button onClick={() => setDismissingChar(char)} variant='danger' className='text-xs py-1 px-2'>
                        <UserMinus size={14} /> <span className='hidden sm:inline'>{t('upkeep.dismiss')}</span>
                      </Button>
                      <Tooltip content={sellDisabledTooltip}>
                        <div className="inline-block">
                          <Button onClick={() => setExpandedCharId(expandedCharId === char.id ? null : char.id)} variant='secondary' className='text-xs py-1 px-2' disabled={hasImportRestrictions}>
                            {expandedCharId === char.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} <span className='hidden sm:inline'>{t('upkeep.sellGearPrompt')}</span>
                          </Button>
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                  {expandedCharId === char.id && (
                    <div className='px-3 pb-3 border-t border-border/50 space-y-2'>
                      {getDismissableItems(char).length > 0 ? getDismissableItems(char).map(item => (
                        <div key={item.id + item.type} className='flex justify-between items-center text-sm p-1'>
                          <span className='text-text-muted'>{item.name}</span>
                          <Tooltip content={sellDisabledTooltip}>
                            <div className="inline-block">
                              <Button onClick={() => handleSellItem(char.id, item.id, item.type)} className='text-xs py-1 px-2' disabled={hasImportRestrictions}>
                                <Coins size={12} /> {t('upkeep.sell')} {t('upkeep.sellPrice')}
                              </Button>
                            </div>
                          </Tooltip>
                        </div>
                      )) : <p className='text-text-muted text-xs italic text-center py-2'>{t('upkeep.dismissModalNoItems')}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ship Management */}
          {ship && (
            <div className='p-4 bg-surface-base/50 rounded-lg mb-6'>
              <h3 className='text-lg font-bold font-orbitron text-primary mb-3'>{t('upkeep.shipMaintenanceTitle')}</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-3 bg-surface-overlay/50 rounded-md'>
                  <label className='block text-sm font-bold text-text-base mb-1'>{t('upkeep.debtPayment')}: {campaign.debt}</label>
                  <input type='number' min='0' max={campaign.credits} value={debtPayment} onChange={(e) => setDebtPayment(e.target.value)} className='w-full bg-surface-overlay p-2 rounded-md border border-border' />
                </div>
                <div className='p-3 bg-surface-overlay/50 rounded-md'>
                  <label className='block text-sm font-bold text-text-base mb-1'>{t('upkeep.hullRepairs')}: {ship.hull}/{ship.maxHull}</label>
                  <p className='text-xs text-text-muted mb-1'>{t('upkeep.freeRepair')} {t('upkeep.repairCost')}.</p>
                  {(campaign.starshipParts || 0) > 0 && (
                    <p className='text-xs text-info mb-1'>{t('upkeep.repairPartsAvailable', { amount: campaign.starshipParts })}</p>
                  )}
                  {hasLacksFacilities && <p className='text-xs text-warning mb-1'>{t('upkeep.lacksFacilitiesWarning')}</p>}
                  <input
                    type='number'
                    min='0'
                    max={finalMaxRepair}
                    value={repairPayment}
                    onChange={handleRepairChange}
                    className='w-full bg-surface-overlay p-2 rounded-md border border-border'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Medical Bay */}
          <div className='p-4 bg-surface-base/50 rounded-lg mb-6'>
            <h3 className='text-lg font-bold font-orbitron text-primary mb-3'>{t('upkeep.medicalBayTitle')}</h3>
            {hasMedicalBay && (
              <div className='mb-4 p-3 bg-info/20 text-info rounded-md text-sm'>
                <p>{t('upkeep.medicalBayBenefit')}</p>
              </div>
            )}
            {healingCrew.length > 0 ? (
              <div className='space-y-2'>
                {healingCrew.map(char => {
                  const injury = char.injuries.find(i => i.recoveryTurns > 0)!;
                  const canBenefitFromBay = hasMedicalBay && injury.recoveryTurns > 1;
                  return (
                    <div key={char.id} className='p-3 bg-surface-overlay/50 rounded-md flex flex-col sm:flex-row justify-between items-center gap-2'>
                      <div className='flex items-center gap-3 flex-grow'>
                        {hasMedicalBay && (
                          <input
                            type="radio"
                            name="medical-bay-target"
                            value={char.id}
                            checked={medicalBayTarget === char.id}
                            onChange={() => setMedicalBayTarget(char.id)}
                            disabled={!canBenefitFromBay}
                            className='form-radio h-5 w-5 text-primary bg-surface-base border-border focus:ring-primary disabled:opacity-50'
                          />
                        )}
                        <div>
                          <p className='font-bold text-text-base'>{sanitizeToText(char.name)}</p>
                          <p className='text-sm text-text-muted'>{t('upkeep.remaining', { turns: injury.recoveryTurns })}</p>
                        </div>
                      </div>
                      <Button onClick={() => crewActions.payForMedical(char.id)} disabled={campaign.credits < medicalCost} variant='secondary' className='text-xs py-1 px-2'>
                        <HeartPulse size={14} /> {t('upkeep.medicalCare')} ({medicalCost}cr)
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className='text-text-muted italic text-center py-2'>{t('upkeep.noInjured')}</p>
            )}
          </div>

          <div className='text-center mt-6 pt-6 border-t border-border'>
            <Button onClick={handleFinalize} disabled={!canAffordUpkeep} variant='primary' className='py-3 px-6 text-lg'>
              {t('buttons.finalizeUpkeep')}
            </Button>
          </div>
        </Card>
      </div>
      {dismissingChar && (
        <Modal onClose={() => setDismissingChar(null)} title={t('upkeep.dismissModalTitle')}>
          <Card className='w-full sm:max-w-sm bg-surface-overlay text-center !p-0'>
            <div className='p-6'>
                <p className='text-text-muted mb-4'>{t('upkeep.dismissModalPrompt', { name: dismissingChar.name })}</p>
                {getDismissableItems(dismissingChar).length > 0 && (
                    <div className='text-left mb-4'>
                        <label htmlFor="itemToKeep" className='block text-sm font-medium text-text-base mb-2'>{t('upkeep.dismissModalKeepItem')}</label>
                        <select
                            id="itemToKeep"
                            onChange={(e) => setItemToKeep(JSON.parse(e.target.value))}
                            className='w-full bg-surface-overlay p-2 rounded-md border border-border'
                        >
                            <option value="">{t('upkeep.dismissModalKeepNothing')}</option>
                            {getDismissableItems(dismissingChar).map(item => (
                                <option key={item.id + item.type} value={JSON.stringify(item)}>{item.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className='flex justify-center gap-4'>
                    <Button onClick={() => setDismissingChar(null)} variant='secondary'>{t('buttons.cancel')}</Button>
                    <Button onClick={handleDismissConfirm} variant='danger'>{t('buttons.dismiss')}</Button>
                </div>
            </div>
          </Card>
        </Modal>
      )}
    </>
  );
};

export default UpkeepPanel;