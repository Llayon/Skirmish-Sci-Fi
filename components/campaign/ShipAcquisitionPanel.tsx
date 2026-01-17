import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import { Rocket, Coins } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

const ShipAcquisitionPanel: React.FC = () => {
  const { t } = useTranslation();
  const { campaign, actions } = useCampaignProgressStore();
  const [useFinancing, setUseFinancing] = useState(false);

  if (!campaign) return null;

  const { pendingShipOffer, shipSearchConductedThisTurn, credits, tasksFinalized } = campaign;
  const { searchForNewShip, purchaseFoundShip, declineFoundShip } = actions;

  const handlePurchase = () => {
    purchaseFoundShip(useFinancing);
  };
  
  const financedCost = pendingShipOffer ? Math.max(0, pendingShipOffer.cost - 70) : 0;
  const canAfford = credits >= (useFinancing ? financedCost : (pendingShipOffer?.cost || 0));

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron flex items-center gap-2'>
        <Rocket size={20} /> {t('dashboard.shipAcquisition.title')}
      </h3>
      
      {!pendingShipOffer ? (
        <div className='text-center'>
            <p className='text-text-muted mb-4'>{t('dashboard.shipAcquisition.searchPrompt')}</p>
            <Tooltip content={!tasksFinalized ? t('tooltips.actions.finalizeTasksFirst') : ''}>
                <div className='inline-block'>
                    <Button onClick={searchForNewShip} disabled={shipSearchConductedThisTurn || !tasksFinalized}>
                        {t('dashboard.shipAcquisition.searchButton')}
                    </Button>
                </div>
            </Tooltip>
            {shipSearchConductedThisTurn && <p className='text-xs text-text-muted italic mt-2'>{t('dashboard.shipAcquisition.searchedThisTurn')}</p>}
        </div>
      ) : (
        <div className='p-3 bg-surface-base/50 rounded-md space-y-4 animate-fade-in'>
            <h4 className='font-bold text-primary'>{t('dashboard.shipAcquisition.offerFound')}</h4>
            <div className='text-left space-y-2'>
                <p><span className='font-semibold'>{t('crewCreator.shipSectionTitle')}:</span> {t(pendingShipOffer.ship.nameKey)}</p>
                <p><span className='font-semibold'>{t('crewCreator.hull')}:</span> {pendingShipOffer.ship.maxHull}</p>
                <p><span className='font-semibold'>{t('crewCreator.traits')}:</span> {pendingShipOffer.ship.traits.map(trait => t(`ship_traits.${trait}`)).join(', ') || t('crewCreator.noTraits')}</p>
                <p className='font-bold text-lg text-warning mt-2'>{t('dashboard.shipAcquisition.cost')}: {pendingShipOffer.cost}cr</p>
            </div>
            
            {pendingShipOffer.cost > 70 && (
                 <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
                    <input
                      type="checkbox"
                      id="financing"
                      checked={useFinancing}
                      onChange={(e) => setUseFinancing(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-primary bg-surface-base border-border"
                    />
                    <label htmlFor="financing" className="text-sm text-text-base">
                      {t('dashboard.shipAcquisition.financeOption', { upfront: financedCost })}
                    </label>
                  </div>
            )}
           
            <div className='flex justify-center gap-4 pt-4 border-t border-border/50'>
                <Button onClick={declineFoundShip} variant='secondary'>{t('dashboard.shipAcquisition.declineButton')}</Button>
                <Button onClick={handlePurchase} variant='primary' disabled={!canAfford}>
                    <Coins size={16} /> {t('buttons.purchase')}
                </Button>
            </div>
        </div>
      )}
    </Card>
  );
};

export default ShipAcquisitionPanel;