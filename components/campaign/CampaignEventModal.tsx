

import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore, useShipStore } from '../../stores';
import Modal from '../ui/Modal';
import { TravelEvent, World, Character, CharacterWeapon, Crew, Stash } from '../../types';
import { sanitizeToText } from '@/services/utils/sanitization';
import { Select } from '../ui/Select';
import { Rocket } from 'lucide-react';
import { logger } from '@/services/utils/logger';
import { rollD6 } from '@/services/utils/rolls';

type SelectableItem = {
    charId: string;
    instanceId: string;
    itemType: string;
    itemName: string;
};

// New component to handle the patrol ship confiscation logic, fixing a Rules of Hooks violation.
const PatrolShipConfiscation: React.FC<{
  confiscateCount: number;
  crew: Crew;
  stash: Stash;
  onConfirm: (items: SelectableItem[]) => void;
}> = ({ confiscateCount, crew, stash, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<SelectableItem[]>([]);

  const allItems = useMemo(() => {
    const items: SelectableItem[] = [];
    const addItem = (charId: string, item: { instanceId: string, weaponId?: string, type: string, id: string }) => {
      let nameKey: string;
      const itemType: string = item.type;
      const itemId: string = item.weaponId || item.id;
      switch (itemType) {
        case 'weapon': nameKey = `weapons.${itemId}`; break;
        case 'armor': case 'screen': nameKey = `protective_devices.${itemId}`; break;
        case 'consumable': nameKey = `consumables.${itemId}`; break;
        default: nameKey = 'unknown';
      }
      items.push({ charId, instanceId: item.instanceId, itemType, itemName: t(nameKey) });
    };

    stash.weapons.forEach(w => addItem('stash', { ...w, type: 'weapon', id: w.weaponId }));
    stash.armor.forEach(id => addItem('stash', { instanceId: id, type: 'armor', id }));
    stash.screen.forEach(id => addItem('stash', { instanceId: id, type: 'screen', id }));
    stash.consumables.forEach(id => addItem('stash', { instanceId: id, type: 'consumable', id }));

    crew.members.forEach(char => {
      char.weapons.forEach(w => addItem(char.id, { ...w, type: 'weapon', id: w.weaponId }));
      if (char.armor) addItem(char.id, { instanceId: char.armor, type: 'armor', id: char.armor });
      if (char.screen) addItem(char.id, { instanceId: char.screen, type: 'screen', id: char.screen });
      char.consumables.forEach(id => addItem(char.id, { instanceId: id, type: 'consumable', id }));
    });
    return items;
  }, [crew, stash, t]);

  const handleSelectItem = (item: SelectableItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.instanceId === item.instanceId);
      if (isSelected) {
        return prev.filter(i => i.instanceId !== item.instanceId);
      }
      if (prev.length < confiscateCount) {
        return [...prev, item];
      }
      return prev;
    });
  };

  const isConfirmDisabled = selectedItems.length !== confiscateCount;

  return (
    <div>
      <p className="mb-4">{t('travelEvents.patrol_ship.select_items_prompt', { count: confiscateCount })}</p>
      <div className="max-h-60 overflow-y-auto space-y-2 border-y border-border/50 py-2 my-4">
        {allItems.length > 0 ? allItems.map(item => (
          <label key={item.instanceId} className="flex items-center gap-2 p-2 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80">
            <input
              type="checkbox"
              checked={selectedItems.some(i => i.instanceId === item.instanceId)}
              onChange={() => handleSelectItem(item)}
              className="form-checkbox h-4 w-4 text-primary bg-surface-base border-border rounded-md"
            />
            <span className="text-sm">{t('travelEvents.patrol_ship.item_from', {
              item: item.itemName,
              location: item.charId === 'stash'
                ? t('travelEvents.patrol_ship.location_stash')
                : sanitizeToText(crew.members.find(c => c.id === item.charId)?.name) || 'Unknown'
            })}</span>
          </label>
        )) : <p className='text-sm italic text-text-muted'>No items to confiscate.</p>}
      </div>
      <Button onClick={() => onConfirm(selectedItems)} disabled={isConfirmDisabled}>
        {t('travelEvents.patrol_ship.confirm_confiscation')}
      </Button>
    </div>
  );
};


const CampaignEventModal: React.FC = () => {
  const { t } = useTranslation();
  const { campaign: campaignProgress, actions } = useCampaignProgressStore();
  const { ship, stash } = useShipStore();
  const { crew } = useCrewStore();
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  
  const campaign = useMemo(() => {
    if (!campaignProgress) return null;
    return { ...campaignProgress, ship, stash };
  }, [campaignProgress, ship, stash]);


  const event = campaign?.activeTravelEvent;
  if (!event) return null;

  const handleClose = (payload?: any) => {
    actions.resolveTravelEvent(payload);
    // Reset local state for next event
    setSelectedCharIds([]);
    setSelectedItemId('');
  };
  
  const handleSelectChar = (charId: string) => {
    setSelectedCharIds(prev => {
        if (prev.includes(charId)) {
            return prev.filter(id => id !== charId);
        }
        return [...prev, charId];
    });
  };

  const renderEventContent = () => {
    if (!crew || !campaign || !ship || !stash) return null;

    const eventData = event.data || {};
    const titleKey = `travelEvents.${event.eventId}.title`;
    const descKey = `travelEvents.${event.eventId}.desc`;

    switch (event.eventId) {
        case 'asteroids': {
            const { stage = 'initial', roll, checksMade = 0 } = eventData;
            switch(stage) {
                case 'initial':
                    return (
                        <div className='space-y-3'>
                            <Button onClick={() => handleClose({ choice: 'avoid' })} variant="primary">{t('travelEvents.asteroids.avoid')}</Button>
                            <Button onClick={() => handleClose({ choice: 'through' })} variant="secondary">{t('travelEvents.asteroids.through')}</Button>
                        </div>
                    );
                case 'reroll_choice':
                    return (
                         <div>
                            <p className="text-text-base mb-6">{t('travelEvents.asteroids.avoid_fail_desc', { roll })}</p>
                            <div className='space-y-3'>
                                <Button onClick={() => handleClose({ choice: 'reroll' })} variant="primary">{t('travelEvents.asteroids.reroll')}</Button>
                                <Button onClick={() => handleClose({ choice: 'through' })} variant="secondary">{t('travelEvents.asteroids.through')}</Button>
                            </div>
                        </div>
                    );
                case 'savvy_checks':
                    const availableCrew = crew.members.filter(m => !m.isUnavailableForTasks);
                    return (
                        <div className='space-y-4'>
                            <p>{t('travelEvents.asteroids.savvy_prompt', { current: checksMade + 1, total: 3 })}</p>
                            <Select
                                value={selectedCharIds[0] || ''}
                                onChange={(val) => setSelectedCharIds([val])}
                                options={availableCrew.map(c => ({ value: c.id, label: `${sanitizeToText(c.name)} (Savvy: ${c.stats.savvy})` }))}
                                placeholder="Select Crew Member"
                            />
                            <Button onClick={() => handleClose({ choice: 'savvy_check', characterId: selectedCharIds[0] })} disabled={!selectedCharIds[0]}>
                                {t('travelEvents.asteroids.savvy_button')}
                            </Button>
                        </div>
                    );
            }
            return null;
        }
        case 'patrol_ship': {
            const confiscateCount = eventData.confiscateCount || 0;
            if (confiscateCount === 0) {
                return <Button onClick={() => handleClose({ choice: 'continue' })}>{t('buttons.continue')}</Button>;
            }

            return <PatrolShipConfiscation 
                        confiscateCount={confiscateCount} 
                        crew={crew} 
                        stash={stash} 
                        onConfirm={(items) => handleClose({ choice: 'confiscate', items })} 
                    />
        }
        case 'distress_call': {
            const { stage, roll } = eventData;
            if (stage === 'savvy_check') {
                const availableCrew = crew.members.filter(m => !m.isUnavailableForTasks);
                return (
                    <div className='space-y-4'>
                        <p>{t('travelEvents.distress_call.selectCrewPrompt')}</p>
                        <Select
                            value={selectedCharIds[0] || ''}
                            onChange={(val) => setSelectedCharIds([val])}
                            options={availableCrew.map(c => ({ value: c.id, label: `${sanitizeToText(c.name)} (Savvy: ${c.stats.savvy})` }))}
                            placeholder="Select Crew Member"
                        />
                        <Button onClick={() => handleClose({ choice: 'savvy_check', characterId: selectedCharIds[0] })} disabled={!selectedCharIds[0]}>
                            {t('travelEvents.distress_call.confirmButton')}
                        </Button>
                    </div>
                );
            }
            if(roll) {
                 return <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>;
            }
            return (
                <div className='space-y-3'>
                    <Button onClick={() => handleClose({ choice: 'aid' })} variant="primary">{t('travelEvents.distress_call.aid')}</Button>
                    <Button onClick={() => handleClose({ choice: 'ignore' })} variant="secondary">{t('travelEvents.distress_call.ignore')}</Button>
                </div>
            );
        }
        case 'escape_pod': {
            const { outcome } = eventData;
            if (!outcome) {
                return (
                    <div className='space-y-3'>
                        <Button onClick={() => handleClose({ choice: 'rescue' })} variant="primary">{t('travelEvents.escape_pod.rescue')}</Button>
                        <Button onClick={() => handleClose({ choice: 'ignore' })} variant="secondary">{t('travelEvents.escape_pod.ignore')}</Button>
                    </div>
                );
            }
            switch(outcome) {
                case 'criminal':
                    return (
                        <div>
                            <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.escape_pod_criminal.title')}</h3>
                            <p className="text-text-base mb-6">{t('travelEvents.escape_pod_criminal.desc')}</p>
                            <div className='space-y-3'>
                                <Button onClick={() => handleClose({ choice: 'let_go' })} variant="primary">{t('travelEvents.escape_pod_criminal.let_go')}</Button>
                                <Button onClick={() => handleClose({ choice: 'turn_in' })} variant="secondary">{t('travelEvents.escape_pod_criminal.turn_in')}</Button>
                            </div>
                        </div>
                    );
                case 'reward':
                     return (
                        <div>
                            <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.escape_pod_reward.title')}</h3>
                            <p className="text-text-base mb-6">{t('travelEvents.escape_pod_reward.desc', { credits: eventData.roll })}</p>
                            <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>
                        </div>
                    );
                case 'info':
                     return (
                        <div>
                            <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.escape_pod_info.title')}</h3>
                            <p className="text-text-base mb-6">{t('travelEvents.escape_pod_info.desc')}</p>
                            <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>
                        </div>
                    );
                case 'recruit':
                    const canRecruit = crew.members.length < 6;
                    if (!canRecruit) {
                         return (
                            <div>
                                <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.escape_pod_recruit_full.title')}</h3>
                                <p className="text-text-base mb-6">{t('travelEvents.escape_pod_recruit_full.desc')}</p>
                                <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>
                            </div>
                        );
                    }
                    return (
                         <div>
                            <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.escape_pod_recruit.title')}</h3>
                            <p className="text-text-base mb-6">{t('travelEvents.escape_pod_recruit.desc')}</p>
                            <div className='space-y-3'>
                                <Button onClick={() => handleClose({ choice: 'hire' })} variant="primary">{t('travelEvents.escape_pod_recruit.hire')}</Button>
                                <Button onClick={() => handleClose({ choice: 'decline' })} variant="secondary">{t('travelEvents.escape_pod_recruit.decline')}</Button>
                            </div>
                        </div>
                    );
                default:
                    return <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>;
            }
        }
        case 'locked_in_library': {
            const worlds = eventData.worlds as World[];
            return (
                <div>
                    <h3 className="text-xl font-bold font-orbitron text-primary mb-4">{t('travelEvents.choose_destination.title')}</h3>
                    <p className="text-text-base mb-6">{t('travelEvents.choose_destination.desc')}</p>
                    <div className='space-y-3'>
                        {worlds.map((world, index) => (
                            <Card key={index} className='bg-surface-base/50' variant='interactive' onClick={() => handleClose({ choice: 'destination', destination: world })}>
                                <h4 className='font-bold text-primary'>{world.name}</h4>
                                <p className='text-xs text-text-muted'>{world.traits.map(t => t.nameKey).join(', ')}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            );
        }
        default:
            return <Button onClick={() => handleClose()}>{t('buttons.continue')}</Button>;
    }
  };

  return (
    <Modal onClose={() => {}} disableClose={true} title={t(`travelEvents.${event.eventId}.title`)}>
      <Card className="w-full sm:max-w-md bg-surface-overlay flex flex-col text-center animate-fade-in !p-0">
         <div className="p-6">
            <div className='mx-auto bg-secondary p-3 rounded-full mb-4 w-fit'>
              <Rocket className='w-8 h-8 text-primary' />
            </div>
            <p className="text-text-base mb-6">{t(`travelEvents.${event.eventId}.desc`, {count: event.data?.confiscateCount})}</p>
            {renderEventContent()}
         </div>
      </Card>
    </Modal>
  );
};

export default CampaignEventModal;
