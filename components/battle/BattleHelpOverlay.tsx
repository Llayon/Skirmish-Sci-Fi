import React from 'react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTranslation } from '@/i18n';

type BattleHelpOverlayProps = {
  onClose: () => void;
  is3D: boolean;
};

const BattleHelpOverlay: React.FC<BattleHelpOverlayProps> = ({ onClose, is3D }) => {
  const { t } = useTranslation();

  return (
    <Modal onClose={onClose} title={t('battle.help.title')}>
      <Card className="w-full sm:max-w-xl bg-surface-overlay !p-0">
        <div className="p-6 space-y-5">
          {is3D && (
            <div className="space-y-2">
              <div className="text-text-muted text-sm">{t('battle.help.camera.title')}</div>
              <div className="text-sm text-text-base whitespace-pre-line">{t('battle.help.camera.body')}</div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.help.hotkeys.title')}</div>
            <div className="text-sm text-text-base whitespace-pre-line">{t('battle.help.hotkeys.body')}</div>
          </div>

          <div className="space-y-2">
            <div className="text-text-muted text-sm">{t('battle.help.selection.title')}</div>
            <div className="text-sm text-text-base whitespace-pre-line">{t('battle.help.selection.body')}</div>
          </div>
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button onClick={onClose}>{t('battle.help.close')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

export default BattleHelpOverlay;

