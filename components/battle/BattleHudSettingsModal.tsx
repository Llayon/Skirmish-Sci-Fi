import React from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useBattleStore, useHudStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@/i18n';

interface BattleHudSettingsModalProps {
  onClose: () => void;
  is3D: boolean;
}

const BattleHudSettingsModal: React.FC<BattleHudSettingsModalProps> = ({ onClose, is3D }) => {
  const { t } = useTranslation();
  const { preset, panels, density, applyPreset, togglePanel, setDensity, reset } = useHudStore(
    useShallow((state) => ({
      preset: state.preset,
      panels: state.panels,
      density: state.density,
      applyPreset: state.actions.applyPreset,
      togglePanel: state.actions.togglePanel,
      setDensity: state.actions.setDensity,
      reset: state.actions.reset,
    }))
  );

  const { battle, selectedParticipantId, activeParticipantId, followActive3D, requestCameraFocusOn, requestCameraReset, setFollowActive3D } =
    useBattleStore(
      useShallow((state) => ({
        battle: state.battle,
        selectedParticipantId: state.selectedParticipantId,
        activeParticipantId: state.battle?.activeParticipantId ?? null,
        followActive3D: state.followActive3D,
        requestCameraFocusOn: state.actions.requestCameraFocusOn,
        requestCameraReset: state.actions.requestCameraReset,
        setFollowActive3D: state.actions.setFollowActive3D,
      }))
    );

  const focusSelectedOrActive = () => {
    if (!battle) return;
    const selected = selectedParticipantId ? battle.participants.find((p) => p.id === selectedParticipantId) : null;
    const active = activeParticipantId ? battle.participants.find((p) => p.id === activeParticipantId) : null;
    const target = selected ?? active;
    if (!target) return;
    requestCameraFocusOn(target.position);
  };

  return (
    <Modal onClose={onClose} title={t('battle.hud.title')}>
      <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.presets')}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" selected={preset === 'full'} onClick={() => applyPreset('full')}>
                Full
              </Button>
              <Button variant="secondary" selected={preset === 'tactical'} onClick={() => applyPreset('tactical')}>
                Tactical
              </Button>
              <Button variant="secondary" selected={preset === 'spectator'} onClick={() => applyPreset('spectator')}>
                Spectator
              </Button>
              <Button variant="secondary" onClick={() => reset()}>
                {t('battle.hud.reset')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.density')}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" selected={density === 'normal'} onClick={() => setDensity('normal')}>
                {t('battle.hud.normal')}
              </Button>
              <Button variant="secondary" selected={density === 'compact'} onClick={() => setDensity('compact')}>
                {t('battle.hud.compact')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.panels')}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" selected={panels.queue} onClick={() => togglePanel('queue')}>
                {t('battle.hud.queue')}
              </Button>
              <Button variant="secondary" selected={panels.mission} onClick={() => togglePanel('mission')}>
                {t('battle.hud.mission')}
              </Button>
              <Button variant="secondary" selected={panels.status} onClick={() => togglePanel('status')}>
                {t('battle.hud.status')}
              </Button>
              <Button variant="secondary" selected={panels.actions} onClick={() => togglePanel('actions')}>
                {t('battle.hud.actions')}
              </Button>
              <Button variant="secondary" selected={panels.log} onClick={() => togglePanel('log')}>
                {t('battle.hud.log')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.hotkeys')}</div>
            <div className="text-sm text-text-base">
              {t('battle.hud.hotkeysHint')}
            </div>
          </div>

          {is3D && (
            <div className="space-y-2">
              <div className="text-text-muted text-sm">{t('battle.hud.camera.title')}</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setFollowActive3D(!followActive3D)} selected={followActive3D}>
                  {t('battle.hud.camera.followActive')}
                </Button>
                <Button variant="secondary" onClick={focusSelectedOrActive}>
                  {t('battle.hud.camera.focus')}
                </Button>
                <Button variant="secondary" onClick={() => requestCameraReset()}>
                  {t('battle.hud.camera.reset')}
                </Button>
              </div>
              <div className="text-sm text-text-base">
                {t('battle.hud.camera.controlsHint')}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button onClick={onClose}>{t('battle.hud.close')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default BattleHudSettingsModal;
