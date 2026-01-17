import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { useBattleStore, useUiStore, useShipStore } from '@/stores';
import { MapPinned, Users, ShieldQuestion, Dices, ChevronRight, Swords, AlertTriangle, Rocket } from 'lucide-react';
import { Enemy } from '@/types';
import { rollD6 } from '@/services/utils/rolls';

const PreBattleBriefing: React.FC = () => {
  const { t } = useTranslation();
  const battle = useBattleStore(state => state.battle);
  const { resolveNotableSight, setBattle } = useBattleStore(state => state.actions);
  const { setGameMode } = useUiStore(state => state.actions);
  const { ship } = useShipStore(state => state);
  const [dropRoll, setDropRoll] = useState<number | null>(null);

  if (!battle) return null;

  const enemies = battle.participants.filter(p => p.type === 'enemy') as Enemy[];
  const enemyGroups = enemies.reduce((acc, enemy) => {
    const isUnique = !!enemy.isUnique;
    const baseName = isUnique ? enemy.name : enemy.name.split(' #')[0];

    if (!acc[baseName]) {
      acc[baseName] = { count: 0, specialists: 0, lieutenants: 0, name: enemy.name, isUnique };
    }
    acc[baseName].count++;
    if (enemy.isSpecialist) acc[baseName].specialists++;
    if (enemy.isLieutenant) acc[baseName].lieutenants++;

    return acc;
  }, {} as Record<string, { count: number; specialists: number; lieutenants: number; name: string; isUnique: boolean }>);

  const handleProceed = () => {
    setGameMode('battle');
  };
  
  const handleDropRoll = () => {
    const roll = rollD6() + rollD6();
    setDropRoll(roll);
    setBattle(b => {
      b.dropDeploymentAvailable = roll >= 8;
    });
  };
  
  const hasDropLauncher = ship?.components.includes('drop_launcher');

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <h2 className="text-2xl sm:text-3xl font-bold font-orbitron text-center mb-6 text-primary">
          {t('preBattleBriefing.title')}
        </h2>

        {battle.rivalAttackType && (
            <Card className="bg-danger/20 border-danger/50 mb-6 text-center">
                 <h3 className="text-lg sm:text-xl font-bold font-orbitron text-danger mb-2 flex items-center justify-center gap-2">
                    <Swords /> {t('preBattleBriefing.rivalAttack')}: {battle.rivalAttackType}
                </h3>
            </Card>
        )}

        {battle.isRedZone && battle.threatCondition && (
            <Card className="bg-danger/20 border-danger/50 mb-6 text-center">
                 <h3 className="text-lg sm:text-xl font-bold font-orbitron text-danger mb-2 flex items-center justify-center gap-2">
                    <AlertTriangle /> {t('preBattleBriefing.threatCondition')}
                </h3>
                <p className='font-semibold text-text-base'>{t(battle.threatCondition.nameKey)}</p>
                <p className='text-sm text-text-muted mt-1'>{t(battle.threatCondition.descriptionKey)}</p>
            </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-surface-base/50">
            <h3 className="text-lg sm:text-xl font-bold font-orbitron text-primary mb-3 flex items-center gap-2">
              <ShieldQuestion /> {t('preBattleBriefing.objective')}
            </h3>
            <h4 className='font-bold text-text-base'>{t(battle.mission.titleKey)}</h4>
            <p className='text-sm text-text-muted mt-1'>{t(battle.mission.descriptionKey)}</p>
          </Card>
          
          <Card className="bg-surface-base/50">
            <h3 className="text-lg sm:text-xl font-bold font-orbitron text-danger mb-3 flex items-center gap-2">
              <Users /> {t('preBattleBriefing.enemyForces')}
            </h3>
            <ul className="list-disc list-inside marker:text-danger space-y-1">
              {Object.entries(enemyGroups).map(([baseName, data]) => {
                const name = data.isUnique ? t('preBattleBriefing.uniqueIndividual') : t(`enemies.${baseName}`);
                let description = `${data.count}x ${name}`;
                const details = [];
                if (data.lieutenants > 0) details.push(`${data.lieutenants} ${t('preBattleBriefing.lieutenant')}`);
                if (data.specialists > 0) details.push(`${data.specialists} ${t('preBattleBriefing.specialist')}`);
                if (details.length > 0) description += ` (${details.join(', ')})`;
                return (
                  <li key={baseName} className="text-text-base">{description}</li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="mt-6 space-y-6">
          <Card className="bg-surface-base/50">
            <h3 className="text-lg sm:text-xl font-bold font-orbitron text-warning mb-3 flex items-center gap-2">
              <MapPinned /> {t('preBattleBriefing.notableSights')}
            </h3>
            {!battle.notableSight ? (
                <>
                    <p className='text-sm text-text-muted mb-4'>{t('preBattleBriefing.rollPrompt')}</p>
                    <Button onClick={resolveNotableSight} variant='secondary'>
                        <Dices /> {t('preBattleBriefing.rollButton')}
                    </Button>
                </>
            ) : (
                <div className='text-center p-3 bg-surface-overlay rounded-md animate-fade-in'>
                    <p className='text-text-muted text-sm italic mb-2'>{t('preBattleBriefing.rollResult', { roll: battle.notableSight.roll })}</p>
                    <p className='font-semibold text-primary'>{t(battle.notableSight.descriptionKey, battle.notableSight.reward)}</p>
                </div>
            )}
          </Card>
          
          {hasDropLauncher && (
            <Card className="bg-surface-base/50">
                <h3 className="text-lg sm:text-xl font-bold font-orbitron text-accent mb-3 flex items-center gap-2">
                    <Rocket /> {t('preBattleBriefing.dropLauncher.title')}
                </h3>
                {battle.dropDeploymentAvailable === undefined ? (
                    <Button onClick={handleDropRoll} variant='secondary'>
                        <Dices /> {t('preBattleBriefing.dropLauncher.rollButton')}
                    </Button>
                ) : (
                    <div className='text-center p-3 bg-surface-overlay rounded-md animate-fade-in'>
                        <p className='font-semibold text-accent'>{t(battle.dropDeploymentAvailable ? 'preBattleBriefing.dropLauncher.success' : 'preBattleBriefing.dropLauncher.failure', { roll: dropRoll })}</p>
                    </div>
                )}
            </Card>
          )}
        </div>
        
        <div className="mt-8 text-center">
            <Button onClick={handleProceed} variant="primary" className="py-3 px-6 text-lg" disabled={!battle.notableSight}>
                {t('preBattleBriefing.proceedButton')} <ChevronRight />
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default PreBattleBriefing;
