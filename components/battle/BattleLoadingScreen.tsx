import { Loader } from 'lucide-react';

const BattleLoadingScreen = () => (
  <div className="flex items-center justify-center h-full bg-surface-base">
    <div className="text-center">
      <Loader className="animate-spin mx-auto mb-4" size={48} />
      <p className="text-text-muted">Loading 3D battle view...</p>
    </div>
  </div>
);

export default BattleLoadingScreen;
