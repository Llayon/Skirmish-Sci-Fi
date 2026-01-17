import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTranslation } from '../../i18n';
import { useCampaignProgressStore, useCrewStore } from '../../stores';
import { Coins, Plus, Star } from 'lucide-react';
import { Select, SelectOption } from '../ui/Select';
import { sanitizeToText } from '@/services/utils/sanitization';

const StoryPointActions: React.FC = () => {
    const { t } = useTranslation();
    const { campaign, actions } = useCampaignProgressStore();
    const { crew } = useCrewStore();
    const [charForXp, setCharForXp] = useState('');

    if (!campaign || !crew || campaign.difficulty === 'insanity') return null;

    const { storyPoints, spForCreditsUsedThisTurn, spForXpUsedThisTurn } = campaign;

    const handleGetCredits = () => {
        actions.spendStoryPointForCredits();
    };

    const handleGetXp = () => {
        if (charForXp) {
            actions.spendStoryPointForXp(charForXp);
            setCharForXp('');
        }
    };

    const crewOptions: SelectOption[] = crew.members
        .filter(m => !m.noXP)
        .map(m => ({ value: m.id, label: sanitizeToText(m.name) }));

    return (
        <Card>
            <h3 className='text-2xl font-bold mb-4 font-orbitron flex items-center gap-2'>
                <Star size={20} /> {t('dashboard.sp_actions.title')}
            </h3>
            <div className='space-y-4'>
                <div className='p-3 bg-surface-base/50 rounded-md'>
                    <h4 className='font-bold text-text-base mb-2'>{t('dashboard.sp_actions.get_credits')}</h4>
                    {spForCreditsUsedThisTurn ? (
                        <p className='text-sm italic text-text-muted'>{t('dashboard.sp_actions.used_this_turn')}</p>
                    ) : (
                        <Button onClick={handleGetCredits} disabled={storyPoints < 1} className='w-full'>
                            <Coins size={16} /> {t('dashboard.sp_actions.get_credits_button')}
                        </Button>
                    )}
                </div>
                <div className='p-3 bg-surface-base/50 rounded-md'>
                    <h4 className='font-bold text-text-base mb-2'>{t('dashboard.sp_actions.get_xp')}</h4>
                    {spForXpUsedThisTurn ? (
                        <p className='text-sm italic text-text-muted'>{t('dashboard.sp_actions.used_this_turn')}</p>
                    ) : (
                        <div className='flex flex-col sm:flex-row items-center gap-2'>
                            <div className='flex-grow w-full sm:w-auto'>
                                <Select
                                    value={charForXp}
                                    onChange={setCharForXp}
                                    options={crewOptions}
                                    placeholder={t('dashboard.sp_actions.select_char')}
                                    disabled={storyPoints < 1}
                                />
                            </div>
                            <Button onClick={handleGetXp} disabled={!charForXp || storyPoints < 1}>
                                <Plus size={16} /> {t('dashboard.sp_actions.get_xp_button')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default StoryPointActions;