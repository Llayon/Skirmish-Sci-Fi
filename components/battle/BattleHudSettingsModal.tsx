import React from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useBattleStore, useHudStore } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@/i18n';

interface BattleHudSettingsModalProps {
  onClose: () => void;
  onOpenHelp: () => void;
  is3D: boolean;
}

const BattleHudSettingsModal: React.FC<BattleHudSettingsModalProps> = ({ onClose, onOpenHelp, is3D }) => {
  const { t } = useTranslation();
  const { preset, panels, density, autoHideSecondaryPanels, applyPreset, togglePanel, setDensity, setAutoHideSecondaryPanels, reset } = useHudStore(
    useShallow((state) => ({
      preset: state.preset,
      panels: state.panels,
      density: state.density,
      autoHideSecondaryPanels: state.autoHideSecondaryPanels,
      applyPreset: state.actions.applyPreset,
      togglePanel: state.actions.togglePanel,
      setDensity: state.actions.setDensity,
      setAutoHideSecondaryPanels: state.actions.setAutoHideSecondaryPanels,
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

  const {
    reducedMotion,
    reducedVfx,
    threeQuality,
    camera3dPreset,
    camera3dInvertWheel,
    camera3dZoomSpeed,
    camera3dPanSpeed,
    camera3dRotateSpeed,
    toggleReducedMotion,
    toggleReducedVfx,
    setThreeQuality,
    setCamera3dPreset,
    setCamera3dInvertWheel,
    setCamera3dZoomSpeed,
    setCamera3dPanSpeed,
    setCamera3dRotateSpeed,
    resetCamera3D,
  } = useSettingsStore(
    useShallow((state) => ({
      reducedMotion: state.reducedMotion,
      reducedVfx: state.reducedVfx,
      threeQuality: state.threeQuality,
      camera3dPreset: state.camera3dPreset,
      camera3dInvertWheel: state.camera3dInvertWheel,
      camera3dZoomSpeed: state.camera3dZoomSpeed,
      camera3dPanSpeed: state.camera3dPanSpeed,
      camera3dRotateSpeed: state.camera3dRotateSpeed,
      toggleReducedMotion: state.actions.toggleReducedMotion,
      toggleReducedVfx: state.actions.toggleReducedVfx,
      setThreeQuality: state.actions.setThreeQuality,
      setCamera3dPreset: state.actions.setCamera3dPreset,
      setCamera3dInvertWheel: state.actions.setCamera3dInvertWheel,
      setCamera3dZoomSpeed: state.actions.setCamera3dZoomSpeed,
      setCamera3dPanSpeed: state.actions.setCamera3dPanSpeed,
      setCamera3dRotateSpeed: state.actions.setCamera3dRotateSpeed,
      resetCamera3D: state.actions.resetCamera3D,
    }))
  );

  return (
    <Modal onClose={onClose} title={t('battle.hud.title')}>
      <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.presets')}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" selected={preset === 'full'} onClick={() => applyPreset('full')}>
                {t('battle.hud.presetFull')}
              </Button>
              <Button variant="secondary" selected={preset === 'tactical'} onClick={() => applyPreset('tactical')}>
                {t('battle.hud.presetTactical')}
              </Button>
              <Button variant="secondary" selected={preset === 'minimal'} onClick={() => applyPreset('minimal')}>
                {t('battle.hud.presetMinimal')}
              </Button>
              <Button variant="secondary" selected={preset === 'spectator'} onClick={() => applyPreset('spectator')}>
                {t('battle.hud.presetSpectator')}
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
            <div className="text-text-muted text-sm">{t('battle.hud.behavior')}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                selected={autoHideSecondaryPanels}
                onClick={() => setAutoHideSecondaryPanels(!autoHideSecondaryPanels)}
              >
                {t('battle.hud.autoHideSecondary')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.hotkeys')}</div>
            <div className="text-sm text-text-base">
              {t('battle.hud.hotkeysHint')}
            </div>
            <div>
              <Button variant="secondary" onClick={onOpenHelp}>
                {t('battle.help.open')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.hud.performance.title')}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" selected={reducedMotion} onClick={() => toggleReducedMotion()}>
                {t('battle.hud.performance.reducedMotion')}
              </Button>
              <Button variant="secondary" selected={reducedVfx} onClick={() => toggleReducedVfx()}>
                {t('battle.hud.performance.reducedVfx')}
              </Button>
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
              <div className="space-y-2">
                <div className="text-text-muted text-xs">{t('battle.hud.camera.quality')}</div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" selected={threeQuality === 'low'} onClick={() => setThreeQuality('low')}>
                    {t('battle.hud.camera.qualityLow')}
                  </Button>
                  <Button variant="secondary" selected={threeQuality === 'medium'} onClick={() => setThreeQuality('medium')}>
                    {t('battle.hud.camera.qualityMedium')}
                  </Button>
                  <Button variant="secondary" selected={threeQuality === 'high'} onClick={() => setThreeQuality('high')}>
                    {t('battle.hud.camera.qualityHigh')}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  selected={camera3dPreset === 'tactical'}
                  onClick={() => setCamera3dPreset('tactical')}
                >
                  {t('battle.hud.camera.presetTactical')}
                </Button>
                <Button
                  variant="secondary"
                  selected={camera3dPreset === 'cinematic'}
                  onClick={() => setCamera3dPreset('cinematic')}
                >
                  {t('battle.hud.camera.presetCinematic')}
                </Button>
                <Button
                  variant="secondary"
                  selected={camera3dInvertWheel}
                  onClick={() => setCamera3dInvertWheel(!camera3dInvertWheel)}
                >
                  {t('battle.hud.camera.invertWheel')}
                </Button>
                <Button variant="secondary" onClick={() => resetCamera3D()}>
                  {t('battle.hud.camera.resetSettings')}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.zoomSpeed')}</div>
                    <input
                      className="flex-1"
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={camera3dZoomSpeed}
                      onChange={(e) => setCamera3dZoomSpeed(parseFloat(e.target.value))}
                    />
                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dZoomSpeed.toFixed(1)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.panSpeed')}</div>
                    <input
                      className="flex-1"
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={camera3dPanSpeed}
                      onChange={(e) => setCamera3dPanSpeed(parseFloat(e.target.value))}
                    />
                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dPanSpeed.toFixed(1)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.rotateSpeed')}</div>
                    <input
                      className="flex-1"
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={camera3dRotateSpeed}
                      onChange={(e) => setCamera3dRotateSpeed(parseFloat(e.target.value))}
                    />
                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dRotateSpeed.toFixed(1)}</div>
                  </div>
                </div>
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
