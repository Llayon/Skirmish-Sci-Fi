import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCrewStore } from '../../stores';
import { Character } from '../../types';
import Modal from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';
import { sanitizeToText } from '@/services/utils/sanitization';

interface ShipDestructionModalProps {
  onConfirm: (gearToKeep: Record<string, string[]>) => void;
}

type Item = {
  id: string; // instanceId for weapons, id for others
  name: string;
  type: string;
};

const ShipDestructionModal: React.FC<ShipDestructionModalProps> = ({ onConfirm }) => {
  const { t } = useTranslation();
  const crew = useCrewStore(state => state.crew);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  if (!crew) return null;

  const getCharacterItems = (character: Character): Item[] => {
    const items: Item[] = [];
    character.weapons.forEach(w => items.push({ id: w.instanceId, name: t(`weapons.${w.weaponId}`), type: 'weapon' }));
    if (character.armor) items.push({ id: character.armor, name: t(`protective_devices.${character.armor}`), type: 'armor' });
    if (character.screen) items.push({ id: character.screen, name: t(`protective_devices.${character.screen}`), type: 'screen' });
    character.consumables.forEach(c => items.push({ id: c, name: t(`consumables.${c}`), type: 'consumable' }));
    character.implants.forEach(i => items.push({ id: i, name: t(`implants.${i}`), type: 'implant' }));
    character.utilityDevices.forEach(u => items.push({ id: u, name: t(`utility_devices.${u}`), type: 'utilityDevice' }));
    return items;
  };

  const handleSelect = (charId: string, itemId: string) => {
    setSelections(prev => {
      const charSelections = prev[charId] || [];
      const newSelections = { ...prev };
      if (charSelections.includes(itemId)) {
        newSelections[charId] = charSelections.filter(id => id !== itemId);
      } else if (charSelections.length < 2) {
        newSelections[charId] = [...charSelections, itemId];
      }
      return newSelections;
    });
  };

  const allChoicesMade = crew.members.every(char => (selections[char.id] || []).length <= 2);

  return (
    <Modal onClose={() => {}} disableClose={true} title="Ship Destroyed!">
      <Card className="w-full sm:max-w-2xl bg-surface-overlay text-center !p-0">
        <div className='p-6'>
          <AlertTriangle className='w-12 h-12 text-danger mx-auto mb-4' />
          <p className='text-text-muted mb-6'>
            Your ship has been destroyed! You managed to escape, but you can only retain 2 items per crew member. All credits and stashed items are lost.
          </p>
          <div className='space-y-4 text-left max-h-96 overflow-y-auto pr-2'>
            {crew.members.map(char => (
              <Card key={char.id} className='bg-surface-base/50'>
                <h4 className='font-bold text-primary mb-2'>{sanitizeToText(char.name)} - ({(selections[char.id] || []).length}/2 selected)</h4>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {getCharacterItems(char).map(item => (
                    <label key={item.id} className='flex items-center gap-2 p-2 bg-secondary rounded-md cursor-pointer hover:bg-secondary/80'>
                      <input
                        type="checkbox"
                        checked={(selections[char.id] || []).includes(item.id)}
                        onChange={() => handleSelect(char.id, item.id)}
                        className='form-checkbox h-4 w-4 text-primary bg-surface-base border-border focus:ring-primary'
                      />
                      <span className='text-sm text-text-base'>{item.name}</span>
                    </label>
                  ))}
                  {getCharacterItems(char).length === 0 && <p className='text-sm text-text-muted italic'>No items to save.</p>}
                </div>
              </Card>
            ))}
          </div>
          <div className='mt-6'>
            <Button onClick={() => onConfirm(selections)} disabled={!allChoicesMade} variant='primary'>
              Confirm Salvage
            </Button>
          </div>
        </div>
      </Card>
    </Modal>
  );
};

export default ShipDestructionModal;