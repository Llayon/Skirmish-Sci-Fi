import React from "react";
import { useTranslation } from "@/i18n";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { MissionType } from "@/types";

interface QuickBattleModalProps {
  onClose: () => void;
  onStart: (missionType: MissionType) => void;
}

const MISSIONS: { type: MissionType; labelKey: string }[] = [
  { type: "Eliminate", labelKey: "missions.eliminate" },
  { type: "Protect", labelKey: "missions.protect" },
];

export const QuickBattleModal: React.FC<QuickBattleModalProps> = ({
  onClose,
  onStart,
}) => {
  const { t } = useTranslation();

  const handleRandom = () => {
    const random = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
    onStart(random.type);
  };

  return (
    <Modal onClose={onClose} title={t("quickBattle.title")}>
      <Card className="w-full sm:max-w-md bg-surface-overlay !p-0">
        <div className="p-6 space-y-4">
          <p className="text-text-muted text-sm">
            {t("quickBattle.description")}
          </p>
          <div className="space-y-2">
            {MISSIONS.map((mission) => (
              <Button
                key={mission.type}
                onClick={() => onStart(mission.type)}
                className="w-full justify-start"
              >
                {t(mission.labelKey)}
              </Button>
            ))}
            <Button
              onClick={handleRandom}
              variant="secondary"
              className="w-full justify-start"
            >
              🎲 {t("quickBattle.random")}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-right border-t border-border pt-4 px-6">
          <Button onClick={onClose} variant="ghost">
            {t("buttons.cancel")}
          </Button>
        </div>
      </Card>
    </Modal>
  );
};
