import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import { World } from '../../types';
import Modal from '../ui/Modal';
import { Globe, PlusCircle } from 'lucide-react';
import { useCampaignActions } from '@/hooks/useCampaignActions';

interface TravelModalProps {
  onClose: () => void;
}

const TravelModal: React.FC<TravelModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { campaign } = useCampaignProgressStore();
  const { initiateTravel } = useCampaignActions();

  if (!campaign) return null;

  const { visitedWorlds = [], currentWorld, galacticWar } = campaign;

  const handleTravel = (destination?: World) => {
    initiateTravel(false, destination);
    onClose();
  };

  const lostWorlds = useMemo(() => {
    return new Set(galacticWar?.trackedPlanets.filter(p => p.status === 'lost').map(p => p.name) || []);
  }, [galacticWar]);

  return (
    <Modal onClose={onClose} title="Travel Computer">
      <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
        <div className='p-6'>
          <p className='text-text-muted mb-4'>
            Select a destination for your next jump. Travel will incur fuel costs and may trigger a random event.
          </p>
          <div className='space-y-3 max-h-80 overflow-y-auto pr-2'>
            <Card
              className='bg-success/20 border-success/50'
              variant='interactive'
              onClick={() => handleTravel()}
            >
              <div className='flex items-center gap-3'>
                <PlusCircle className='text-success' />
                <div>
                  <h4 className='font-bold text-success'>Explore a New System</h4>
                  <p className='text-sm text-text-base'>Generate a new, unknown world to visit.</p>
                </div>
              </div>
            </Card>
            <h4 className='font-bold text-text-muted pt-2 border-t border-border/50'>Previously Visited Systems</h4>
            {visitedWorlds.filter(w => w.name !== currentWorld?.name && !lostWorlds.has(w.name)).map(world => (
              <Card
                key={world.name}
                className='bg-surface-base/50'
                variant='interactive'
                onClick={() => handleTravel(world)}
              >
                <div className='flex items-center gap-3'>
                  <Globe className='text-primary' />
                  <div>
                    <h4 className='font-bold text-primary'>{world.name}</h4>
                    <p className='text-xs text-text-muted'>{world.traits.map(t => t.nameKey).join(', ')}</p>
                  </div>
                </div>
              </Card>
            ))}
             {visitedWorlds.filter(w => w.name !== currentWorld?.name && !lostWorlds.has(w.name)).length === 0 && (
                <p className='text-sm text-text-muted italic text-center py-2'>No other systems logged.</p>
            )}
          </div>
        </div>

        <div className='mt-auto text-right border-t border-border pt-4 px-6'>
          <Button onClick={onClose} variant='secondary'>{t('buttons.cancel')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default TravelModal;