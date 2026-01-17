import React, { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore, useShipStore } from '../../stores';
import { Character, CharacterWeapon, Weapon } from '../../types';
import { Shield, Pill, FerrisWheel, Aperture, Wrench, Cpu, ToyBrick } from 'lucide-react';
import Modal from '../ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { getWeaponById } from '@/services/data/items';
import { Select, SelectOption } from '../ui/Select';
import Tooltip from '../ui/Tooltip';


interface InventoryManagementModalProps {
  character: Character;
  onClose: () => void;
}

const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({ character, onClose }) => {
  const { t } = useTranslation();
  const { equipItemFromStash, unequipItemToStash, attachModToWeapon, attachSightToWeapon, detachSightFromWeapon } = useCrewStore(state => state.actions);
  const { ship, stash } = useShipStore(state => state);
  const [selectedWeaponsForMods, setSelectedWeaponsForMods] = useState<Record<string, string>>({});
  const [selectedWeaponForSight, setSelectedWeaponForSight] = useState('');

  if (!stash) return null;
  
  const stashCount = useMemo(() => {
      if (!stash) return 0;
      return stash.weapons.length + stash.armor.length + stash.screen.length + stash.consumables.length + stash.implants.length + stash.utilityDevices.length;
  }, [stash]);

  const stashIsFull = !ship && stashCount >= 5;
  const unequipDisabledTooltip = stashIsFull ? "Cannot unequip, stash is full (max 5 items without a ship)." : "";

  const handleEquip = (item: { instanceId?: string; weaponId?: string; id: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'utilityDevice' }) => {
    equipItemFromStash(character.id, item);
  };

  const handleUnequip = (item: { instanceId: string; weaponId?: string; id?: string; type: 'weapon' | 'armor' | 'screen' | 'consumable' | 'implant' | 'utilityDevice' }) => {
    unequipItemToStash(character.id, item);
  };
  
  const compatibleWeaponsForSights = useMemo(() => {
    return character.weapons
        .filter(cw => {
            const w = getWeaponById(cw.weaponId);
            return w && !w.traits.includes('melee') && w.shots > 0;
        })
        .map(cw => ({ value: cw.instanceId, label: t(`weapons.${cw.weaponId}`) }));
  }, [character.weapons, t]);

  const renderWeapons = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.equipped')} ({character.weapons.length}/3)</h4>
        <div className='space-y-2'>
          {character.weapons.length > 0 ? character.weapons.map(cw => (
            <div key={cw.instanceId} className='p-2 bg-surface-base/50 rounded-md text-sm border border-border/50'>
              <div className='flex justify-between items-center'>
                <span>{t(`weapons.${cw.weaponId}`)}</span>
                <Tooltip content={unequipDisabledTooltip}>
                    <div className='inline-block'>
                        <Button onClick={() => handleUnequip({ ...cw, type: 'weapon' })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button>
                    </div>
                </Tooltip>
              </div>
               {(cw.modId || cw.sightId) && (
                  <div className='text-xs text-accent italic pl-2 border-l-2 border-accent/30 ml-1 mt-2 py-1'>
                    {cw.modId && <div><Wrench size={12} className='inline-block mr-1' />{t(`gun_mods.${cw.modId}`)}</div>}
                    {cw.sightId && <div className='flex justify-between items-center'>
                        <span><Aperture size={12} className='inline-block mr-1' />{t(`gun_sights.${cw.sightId}`)}</span>
                        <Button onClick={() => detachSightFromWeapon(character.id, cw.instanceId)} variant='danger' className='text-[10px] h-5 px-1.5'>{t('buttons.detach')}</Button>
                    </div>}
                  </div>
              )}
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.stash')}</h4>
        <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
          {stash.weapons.length > 0 ? stash.weapons.map(cw => (
            <div key={cw.instanceId} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`weapons.${cw.weaponId}`)}</span>
              <Button onClick={() => handleEquip({ ...cw, type: 'weapon', id: cw.weaponId })} disabled={character.weapons.length >= 3} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
    </div>
  );

  const renderProtective = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.equipped')} ({t('labels.armor')}: {character.armor ? 1 : 0}/1, {t('labels.screen')}: {character.screen ? 1 : 0}/1)</h4>
        <div className='space-y-2'>
          {character.armor && <div className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'><span>{t(`protective_devices.${character.armor}`)} ({t('labels.armor')})</span><Tooltip content={unequipDisabledTooltip}><div className='inline-block'><Button onClick={() => handleUnequip({ instanceId: character.armor!, type: 'armor', id: character.armor! })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button></div></Tooltip></div>}
          {character.screen && <div className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'><span>{t(`protective_devices.${character.screen}`)} ({t('labels.screen')})</span><Tooltip content={unequipDisabledTooltip}><div className='inline-block'><Button onClick={() => handleUnequip({ instanceId: character.screen!, type: 'screen', id: character.screen! })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button></div></Tooltip></div>}
          {!character.armor && !character.screen && <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.stash')}</h4>
        <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
          {stash.armor.map((id, i) => <div key={`armor-${id}-${i}`} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'><span>{t(`protective_devices.${id}`)} ({t('labels.armor')})</span><Button onClick={() => handleEquip({ instanceId: id, id, type: 'armor' })} disabled={!!character.armor} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button></div>)}
          {stash.screen.map((id, i) => <div key={`screen-${id}-${i}`} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'><span>{t(`protective_devices.${id}`)} ({t('labels.screen')})</span><Button onClick={() => handleEquip({ instanceId: id, id, type: 'screen' })} disabled={!!character.screen} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button></div>)}
          {stash.armor.length === 0 && stash.screen.length === 0 && <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
    </div>
  );

  const renderConsumables = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.equipped')} ({character.consumables.length}/3)</h4>
        <div className='space-y-2'>
          {character.consumables.length > 0 ? character.consumables.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`consumables.${id}`)}</span>
              <Tooltip content={unequipDisabledTooltip}><div className='inline-block'><Button onClick={() => handleUnequip({ instanceId: id, id, type: 'consumable' })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button></div></Tooltip>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.stash')}</h4>
        <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
          {stash.consumables.length > 0 ? stash.consumables.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`consumables.${id}`)}</span>
              <Button onClick={() => handleEquip({ instanceId: id, id, type: 'consumable' })} disabled={character.consumables.length >= 3} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
    </div>
  );
  
  const renderMods = () => (
     <div className='space-y-2 max-h-80 overflow-y-auto pr-2'>
        {stash.gunMods.map(modId => {
            const modCompatibleWeapons = character.weapons
                .filter(cw => {
                    const w = getWeaponById(cw.weaponId);
                    if (!w || w.traits.includes('melee') || w.shots <= 0 || cw.modId) {
                        return false;
                    }
                    if (modId === 'assault_blade' || modId === 'bipod') {
                        return !w.traits.includes('pistol');
                    }
                    return true;
                })
                .map(cw => ({ value: cw.instanceId, label: t(`weapons.${cw.weaponId}`) }));

            const selectedWeapon = selectedWeaponsForMods[modId] || '';

            const handleSelectWeapon = (weaponInstanceId: string) => {
                setSelectedWeaponsForMods(prev => ({
                    ...prev,
                    [modId]: weaponInstanceId
                }));
            };

            const handleAttach = () => {
                if (selectedWeapon) {
                    attachModToWeapon(character.id, selectedWeapon, modId);
                    // Clear selection after attaching
                    setSelectedWeaponsForMods(prev => {
                        const newState = {...prev};
                        delete newState[modId];
                        return newState;
                    });
                }
            };

            return (
                <div key={modId} className='p-2 bg-secondary/50 rounded-md flex flex-col sm:flex-row justify-between items-center text-sm gap-2'>
                    <span className='font-semibold'>{t(`gun_mods.${modId}`)}</span>
                    <div className='flex items-center gap-2 w-full sm:w-auto'>
                        <div className='flex-grow'>
                            <Select
                                value={selectedWeapon}
                                onChange={handleSelectWeapon}
                                options={modCompatibleWeapons}
                                placeholder={modCompatibleWeapons.length > 0 ? t('inventory.selectWeapon') : t('inventory.noCompatibleWeapons')}
                                disabled={modCompatibleWeapons.length === 0}
                            />
                        </div>
                        <Button onClick={handleAttach} disabled={!selectedWeapon} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.attach')}</Button>
                    </div>
                </div>
            );
        })}
        {stash.gunMods.length === 0 && <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
    </div>
  );

  const renderSights = () => (
     <div className='space-y-2 max-h-80 overflow-y-auto pr-2'>
        {stash.sights.map(sightId => {
            const sightWeapons = sightId === 'laser_sight'
                ? compatibleWeaponsForSights.filter(opt => {
                    const weapon = character.weapons.find(cw => cw.instanceId === opt.value);
                    if (!weapon) return false;
                    const weaponData = getWeaponById(weapon.weaponId);
                    return weaponData?.traits.includes('pistol');
                })
                : compatibleWeaponsForSights;
            
            return (
                <div key={sightId} className='p-2 bg-secondary/50 rounded-md flex flex-col sm:flex-row justify-between items-center text-sm gap-2'>
                    <span className='font-semibold'>{t(`gun_sights.${sightId}`)}</span>
                    <div className='flex items-center gap-2 w-full sm:w-auto'>
                        <div className='flex-grow'>
                             <Select
                                value={selectedWeaponForSight}
                                onChange={(val) => setSelectedWeaponForSight(val)}
                                options={sightWeapons}
                                placeholder={sightWeapons.length > 0 ? t('inventory.selectWeapon') : t('inventory.noCompatibleWeapons')}
                                disabled={sightWeapons.length === 0}
                            />
                        </div>
                        <Button onClick={() => attachSightToWeapon(character.id, selectedWeaponForSight, sightId)} disabled={!selectedWeaponForSight} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.attach')}</Button>
                    </div>
                </div>
            );
        })}
        {stash.sights.length === 0 && <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
    </div>
  );
  
  const renderImplants = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.equipped')} ({character.implants.length}/2)</h4>
        <div className='space-y-2'>
          {character.implants.length > 0 ? character.implants.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`implants.${id}`)}</span>
              <Tooltip content={unequipDisabledTooltip}><div className='inline-block'><Button onClick={() => handleUnequip({ instanceId: id, id, type: 'implant' })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button></div></Tooltip>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.stash')}</h4>
        <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
          {stash.implants.length > 0 ? stash.implants.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`implants.${id}`)}</span>
              <Button onClick={() => handleEquip({ instanceId: id, id, type: 'implant' })} disabled={character.implants.length >= 2 || character.noConsumablesOrImplants} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
    </div>
  );

  const renderUtilityDevices = () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.equipped')} ({character.utilityDevices.length}/3)</h4>
        <div className='space-y-2'>
          {character.utilityDevices.length > 0 ? character.utilityDevices.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-surface-base/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`utility_devices.${id}`)}</span>
              <Tooltip content={unequipDisabledTooltip}><div className='inline-block'><Button onClick={() => handleUnequip({ instanceId: id, id, type: 'utilityDevice' })} disabled={stashIsFull} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.unequip')}</Button></div></Tooltip>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
      <div>
        <h4 className='font-bold text-text-base mb-2'>{t('labels.stash')}</h4>
        <div className='space-y-2 max-h-60 overflow-y-auto pr-2'>
          {stash.utilityDevices.length > 0 ? stash.utilityDevices.map((id, i) => (
            <div key={`${id}-${i}`} className='p-2 bg-secondary/50 rounded-md flex justify-between items-center text-sm'>
              <span>{t(`utility_devices.${id}`)}</span>
              <Button onClick={() => handleEquip({ instanceId: id, id, type: 'utilityDevice' })} disabled={character.utilityDevices.length >= 3} variant='secondary' className='text-xs py-1 px-2'>{t('buttons.equip')}</Button>
            </div>
          )) : <p className='text-text-muted italic text-xs text-center py-2'>{t('characterCard.none')}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose} title={t('characterCard.manageGear')}>
      <Card className='w-full sm:max-w-4xl bg-surface-overlay max-h-[90vh] !p-0'>
        <div className='p-6'>
          <p className='text-text-muted mb-4'>{t('crewCreator.loadoutModalSubtitle', { name: character.name })}</p>

          <Tabs defaultValue='weapons'>
            <TabsList>
              <TabsTrigger value='weapons'><FerrisWheel size={16} /> {t('crewCreator.weaponsTab')}</TabsTrigger>
              <TabsTrigger value='protective'><Shield size={16} /> {t('crewCreator.protectiveTab')}</TabsTrigger>
              <TabsTrigger value='consumables'><Pill size={16} /> {t('crewCreator.consumablesTab')}</TabsTrigger>
              <TabsTrigger value='implants'><Cpu size={16} /> {t('labels.implants')}</TabsTrigger>
              <TabsTrigger value='utilityDevices'><ToyBrick size={16} /> {t('labels.utilityDevices')}</TabsTrigger>
              <TabsTrigger value='mods'><Wrench size={16} /> {t('inventory.modsTab')}</TabsTrigger>
              <TabsTrigger value='sights'><Aperture size={16} /> {t('inventory.sightsTab')}</TabsTrigger>
            </TabsList>
            <div className='py-4 min-h-[200px]'>
              <TabsContent value='weapons'>{renderWeapons()}</TabsContent>
              <TabsContent value='protective'>{renderProtective()}</TabsContent>
              <TabsContent value='consumables'>{renderConsumables()}</TabsContent>
              <TabsContent value='implants'>{renderImplants()}</TabsContent>
              <TabsContent value='utilityDevices'>{renderUtilityDevices()}</TabsContent>
              <TabsContent value='mods'>{renderMods()}</TabsContent>
              <TabsContent value='sights'>{renderSights()}</TabsContent>
            </div>
          </Tabs>
        </div>

        <div className='mt-auto text-right border-t border-border pt-4 px-6'>
          <Button onClick={onClose} variant='primary'>{t('buttons.done')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default InventoryManagementModal;