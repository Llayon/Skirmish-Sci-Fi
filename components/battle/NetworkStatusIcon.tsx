import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { useBattleStore } from '@/stores/battleStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useTranslation } from '@/i18n';

export const NetworkStatusIcon: React.FC = () => {
  const { t } = useTranslation();
  const multiplayerRole = useMultiplayerStore(s => s.multiplayerRole);
  const pendingActionId = useBattleStore(s => s.engineNetPendingClientActionId);
  
  const [showPending, setShowPending] = useState(false);
  const [showSlow, setShowSlow] = useState(false);

  useEffect(() => {
    if (!pendingActionId) {
        setShowPending(false);
        setShowSlow(false);
        return;
    }

    // Show "sending" indicator after a tiny delay to avoid flicker on fast connections
    const timer1 = setTimeout(() => setShowPending(true), 200);
    // Show "slow network" warning if no ACK for 2 seconds
    const timer2 = setTimeout(() => setShowSlow(true), 2000);

    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
    };
  }, [pendingActionId]);

  if (!multiplayerRole || !showPending) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm backdrop-blur-sm animate-fade-in transition-colors duration-300 ${
        showSlow ? 'bg-warning/20 text-warning border border-warning/50' : 'bg-surface-raised/50 text-text-muted border border-white/10'
    }`}>
      {showSlow ? (
          <AlertTriangle size={14} />
      ) : (
          <ArrowUpCircle size={14} className="animate-pulse" />
      )}
      <span className="font-orbitron text-xs select-none">
          {showSlow ? 'Slow Network' : 'Sending...'}
      </span>
    </div>
  );
};
