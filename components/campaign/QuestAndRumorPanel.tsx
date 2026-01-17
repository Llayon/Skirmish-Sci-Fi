import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore } from '../../stores';
import { BookOpen, Dices, ChevronRight } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

/**
 * A panel on the campaign dashboard that displays information about the active quest or current rumors.
 * It provides actions to start a quest or to resolve rumors to potentially generate a new quest.
 * @returns {React.ReactElement | null} The rendered panel, or null if campaign data is not available.
 */
const QuestAndRumorPanel: React.FC = () => {
  const { t } = useTranslation();
  const campaign = useCampaignProgressStore(state => state.campaign);
  const { resolveRumors } = useCampaignProgressStore(state => state.actions);

  const actionsDisabled = !campaign?.tasksFinalized;
  const actionsTooltip = actionsDisabled ? t('tooltips.actions.finalizeTasksFirst') : '';

  if (!campaign) return null;

  if (campaign.activeQuest) {
    return (
      <Card>
        <h3 className='text-2xl font-bold mb-4 font-orbitron flex items-center gap-2'>
          <BookOpen /> {t('quests.activeQuestTitle')}
        </h3>
        <Card className='bg-surface-base/50'>
          <h4 className='font-bold text-primary'>{t(campaign.activeQuest.titleKey)}</h4>
          <p className='text-sm text-text-base mt-1 mb-4'>{t(campaign.activeQuest.descriptionKey)}</p>
          <div className='text-right'>
            <Tooltip content={actionsTooltip}>
              <div className='inline-block'>
                <Button variant='primary' disabled={actionsDisabled}>
                  {t('quests.startQuest')} <ChevronRight size={16} />
                </Button>
              </div>
            </Tooltip>
          </div>
        </Card>
      </Card>
    );
  }

  const canResolve = campaign.questRumors.length > 0;

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron'>{t('quests.rumorPanelTitle')}</h3>
      {campaign.questRumors.length > 0 ? (
        <div className='space-y-4'>
          <p className='text-text-base'>{t('quests.rumorCount', { count: campaign.questRumors.length })}</p>
          <ul className='list-disc list-inside text-text-muted text-sm pl-2 space-y-1 max-h-24 overflow-y-auto'>
            {campaign.questRumors.map(rumor => (
              <li key={rumor.id} className='italic'>"{rumor.description}"</li>
            ))}
          </ul>
          <div className='text-center pt-2'>
            <Tooltip content={actionsTooltip}>
              <div className='inline-block'>
                <Button onClick={resolveRumors} disabled={!canResolve || actionsDisabled}>
                  <Dices size={16} /> {t('quests.resolveRumorsButton')}
                </Button>
              </div>
            </Tooltip>
          </div>
        </div>
      ) : (
        <p className='text-text-muted italic text-center py-4'>{t('quests.noRumors')}</p>
      )}
    </Card>
  );
};

export default QuestAndRumorPanel;