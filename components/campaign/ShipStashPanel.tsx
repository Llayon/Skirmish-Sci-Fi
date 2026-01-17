
import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore, useShipStore } from '../../stores';
import { getOnBoardItemById, getShipComponentById } from '../../services/data/items';
import { OnBoardItemId, Character, ShipComponentId } from '../../types';
import Tooltip from '../ui/Tooltip';
import { Rocket, Cog, Package, Wrench, Coins } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Select, SelectOption } from '../ui/Select';
import { SHIP_COMPONENTS } from '../../constants/shipComponents';

/**
 * A panel on the campaign dashboard for viewing and interacting with the ship's stash.
 * It includes tabs for on-board systems, gear locker, and ship upgrades.
 * @returns {React.ReactElement | null} The rendered ship stash panel, or null if data is not available.
 */
const ShipStashPanel: React.FC = () => {
  const { t } = useTranslation();
  const campaign = useCampaignProgressStore(state => state.campaign);
  const crew = useCrewStore(state => state.crew);
  const { ship, stash } = useShipStore(state => state);
  const { useOnBoardItem, purchaseShipComponent } = useCampaignProgressStore(state => state.actions);
  const [targetChar, setTargetChar] = React.useState<string>('');

  if (!campaign || !crew || !stash) return null;
  
  const hasStandardIssue = ship?.traits.includes('standard_issue');
  const hasShipyards = useMemo(() => campaign?.currentWorld?.traits.some(t => t.id === 'shipyards'), [campaign]);

  const onBoardItems = stash.onBoardItems.map(getOnBoardItemById).filter(Boolean);
  const installedComponents = ship?.components.map(getShipComponentById).filter(Boolean) || [];
  const availableComponents = SHIP_COMPONENTS.filter(c => !ship?.components.includes(c.id));
  
  const stashCount = useMemo(() => {
    return stash.weapons.length + stash.armor.length + stash.screen.length + stash.consumables.length + stash.implants.length + stash.utilityDevices.length;
  }, [stash]);
  const stashLimit = ship ? Infinity : 5;
  const gearLockerLabel = ship ? t('dashboard.shipStash.gearLocker') : `${t('dashboard.shipStash.gearLocker')} (${stashCount}/${stashLimit} Items)`;

  const handleUseItem = (itemId: OnBoardItemId) => {
    useOnBoardItem(itemId, { characterId: targetChar });
    setTargetChar('');
  };

  const needsCharacter = (itemId: OnBoardItemId) => {
    return ['genetic_reconfiguration_kit', 'loaded_dice', 'lucky_dice', 'novelty_stuffed_animal', 'transcender'].includes(itemId);
  };

  const actionsDisabled = !campaign.tasksFinalized;
  const actionsTooltip = actionsDisabled ? t('tooltips.actions.finalizeTasksFirst') : '';
  const componentPurchaseDisabled = actionsDisabled || campaign.componentPurchasedThisTurn;
  const componentPurchaseTooltip = () => {
    if (actionsDisabled) return actionsTooltip;
    if (campaign.componentPurchasedThisTurn) return t('tooltips.actions.componentPurchased');
    return '';
  }

  const crewOptions: SelectOption[] = crew.members.map((m: Character) => ({ value: m.id, label: m.name }));

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron flex items-center gap-2'><Rocket size={20} /> {t('dashboard.shipStash.title')}</h3>

      <Tabs defaultValue='on-board'>
        <TabsList>
          <TabsTrigger value='on-board'><Cog size={16} /> {t('dashboard.shipStash.onBoardSystems')}</TabsTrigger>
          {ship && <TabsTrigger value='upgrades'><Wrench size={16} /> {t('dashboard.shipStash.shipUpgrades')}</TabsTrigger>}
          <TabsTrigger value='gear'><Package size={16} /> {gearLockerLabel}</TabsTrigger>
        </TabsList>

        <TabsContent value='on-board'>
          <div className='space-y-3 max-h-96 overflow-y-auto pr-2'>
            {onBoardItems.length > 0 ? onBoardItems.map(item => item && (
              <Tooltip key={item.id} content={t(`tooltips.on_board_items.${item.id}`)}>
                <div className='p-3 bg-surface-base/50 rounded-md border border-border/50'>
                  <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-2'>
                    <p className='font-bold text-primary'>{t(`on_board_items.${item.id}`)}</p>
                    {(item.type === 'manual_consumable' || (item.type === 'active' && needsCharacter(item.id))) && (
                      <Tooltip content={actionsTooltip}>
                        <div className='flex gap-2 items-center'>
                          {needsCharacter(item.id) && (
                            <div className='w-40'>
                              <Select
                                value={targetChar}
                                onChange={setTargetChar}
                                options={crewOptions}
                                placeholder={t('dashboard.shipStash.selectCrew')}
                                disabled={actionsDisabled}
                              />
                            </div>
                          )}
                          <Button
                            onClick={() => handleUseItem(item.id)}
                            variant='secondary'
                            className='text-xs py-1 px-2'
                            disabled={actionsDisabled || (needsCharacter(item.id) && !targetChar)}
                          >
                            {t('buttons.use')}
                          </Button>
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Tooltip>
            )) : (
              <p className='text-text-muted italic text-center py-4'>{t('dashboard.shipStash.noOnBoardItems')}</p>
            )}
          </div>
        </TabsContent>

        {ship && <TabsContent value='upgrades'>
            <div className='space-y-4 max-h-96 overflow-y-auto pr-2'>
                <div>
                    <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2'>{t('dashboard.shipStash.installedComponents')}</h4>
                    {installedComponents.length > 0 ? (
                        <ul className='list-disc list-inside marker:text-primary pl-2 text-sm'>
                            {installedComponents.map(c => <li key={c.id}>{t(c.nameKey)}</li>)}
                        </ul>
                    ) : <p className='text-text-muted italic text-xs'>{t('dashboard.shipStash.none')}</p>}
                </div>
                 <div>
                    <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs mb-2'>{t('dashboard.shipStash.availableUpgrades')}</h4>
                    <div className='space-y-2'>
                        {availableComponents.map(c => {
                          let finalCost = c.cost;
                          if (hasStandardIssue) finalCost -= 1;
                          if (hasShipyards) finalCost -= 2;
                          finalCost = Math.max(0, finalCost);
                          
                          return (
                             <Tooltip key={c.id} content={t(c.effectKey)}>
                                <div className='p-3 bg-surface-base/50 rounded-md border border-border/50'>
                                    <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-2'>
                                        <div>
                                            <p className='font-bold text-primary'>{t(c.nameKey)}</p>
                                            <p className='text-xs text-warning flex items-center gap-1'><Coins size={12} /> {finalCost} Credits</p>
                                        </div>
                                        <Tooltip content={componentPurchaseTooltip()}>
                                            <div className='inline-block'>
                                                <Button
                                                  onClick={() => purchaseShipComponent(c.id)}
                                                  variant='secondary'
                                                  className='text-xs py-1 px-3'
                                                  disabled={componentPurchaseDisabled || campaign.credits < finalCost}
                                                >
                                                  {t('buttons.purchase')}
                                                </Button>
                                            </div>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Tooltip>
                          );
                        })}
                    </div>
                 </div>
            </div>
        </TabsContent>}

        <TabsContent value='gear'>
          <div className='space-y-3 max-h-96 overflow-y-auto pr-2 text-sm'>
            <div>
              <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs'>{t('dashboard.shipStash.weapons')}</h4>
              <ul className='list-disc list-inside marker:text-primary pl-2'>
                {stash.weapons.map((cw) => <li key={cw.instanceId}>{t(`weapons.${cw.weaponId}`)}</li>)}
                {stash.weapons.length === 0 && <li className='text-text-muted italic'>{t('dashboard.shipStash.none')}</li>}
              </ul>
            </div>
            <div>
              <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs'>{t('dashboard.shipStash.protectiveGear')}</h4>
              <ul className='list-disc list-inside marker:text-primary pl-2'>
                {stash.armor.map((id, i) => <li key={`${id}-${i}`}>{t(`protective_devices.${id}`)} ({t('dashboard.shipStash.armor')})</li>)}
                {stash.screen.map((id, i) => <li key={`${id}-${i}`}>{t(`protective_devices.${id}`)} ({t('dashboard.shipStash.screen')})</li>)}
                {(stash.armor.length + stash.screen.length) === 0 && <li className='text-text-muted italic'>{t('dashboard.shipStash.none')}</li>}
              </ul>
            </div>
            <div>
              <h4 className='font-bold text-text-muted uppercase tracking-wider text-xs'>{t('dashboard.shipStash.consumables')}</h4>
              <ul className='list-disc list-inside marker:text-primary pl-2'>
                {stash.consumables.map((id, i) => <li key={`${id}-${i}`}>{t(`consumables.${id}`)}</li>)}
                {stash.consumables.length === 0 && <li className='text-text-muted italic'>{t('dashboard.shipStash.none')}</li>}
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ShipStashPanel;
