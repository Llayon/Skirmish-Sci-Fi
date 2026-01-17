

import React from 'react';
import Card from '@/components/ui/Card';
import { useTranslation } from '@/i18n';
import { useCampaignProgressStore } from '@/stores';
import { Briefcase, UserX } from 'lucide-react';

const ContactsPanel: React.FC = () => {
  const { t } = useTranslation();
  const campaign = useCampaignProgressStore(state => state.campaign);
  const patrons = campaign?.patrons || [];
  const rivals = campaign?.rivals || [];

  return (
    <Card>
      <h3 className='text-2xl font-bold mb-4 font-orbitron'>{t('dashboard.contacts.title')}</h3>
      <div className='space-y-4'>
        <div>
          <h4 className='font-bold text-primary flex items-center gap-2 mb-2'>
            <Briefcase size={16} /> {t('dashboard.contacts.patrons')}
          </h4>
          <div className='pl-4 text-sm space-y-1'>
            {patrons.length > 0 ? (
              patrons.map(patron => (
                <div key={patron.id}>
                  <p className='text-text-base'>{t(`patrons.${patron.type}`)}</p>
                </div>
              ))
            ) : (
              <p className='text-text-muted italic'>{t('dashboard.contacts.noPatrons')}</p>
            )}
          </div>
        </div>
        <div>
          <h4 className='font-bold text-danger flex items-center gap-2 mb-2'>
            <UserX size={16} /> {t('dashboard.contacts.rivals')}
          </h4>
          <div className='pl-4 text-sm space-y-1'>
            {rivals.length > 0 ? (
              rivals.map(rival => (
                <div key={rival.id} className='flex justify-between items-center'>
                  <p className='text-text-base'>{rival.name}</p>
                  <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${rival.status === 'active' ? 'bg-success/20 text-success' : 'bg-secondary text-text-muted'}`}>
                    {t(`rivals.status.${rival.status}`)}
                  </span>
                </div>
              ))
            ) : (
              <p className='text-text-muted italic'>{t('dashboard.contacts.noRivals')}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ContactsPanel;