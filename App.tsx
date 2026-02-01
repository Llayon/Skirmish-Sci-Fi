
import React, { useEffect, lazy, Suspense, useState } from 'react';
import { Dna, Star, Loader } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useUiStore, useCampaignProgressStore, useMultiplayerStore } from '@/stores';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import ToastContainer from '@/components/ui/ToastContainer';
import {
  preloadMainMenu,
  preloadCrewCreator,
  preloadCampaignDashboard,
  preloadBattleView,
  preloadMultiplayerLobby,
  preloadPostBattleSequence,
  preloadSaveGameModal,
  preloadPreBattleBriefing,
} from '@/services/utils/componentPreloader';

const MainMenu = lazy(preloadMainMenu);
const CrewCreator = lazy(preloadCrewCreator);
const CampaignDashboard = lazy(preloadCampaignDashboard);
const BattleView = lazy(preloadBattleView);
const MultiplayerLobby = lazy(preloadMultiplayerLobby);
const PostBattleSequence = lazy(() => import('@/components/PostBattleSequence'));
const SaveGameModal = lazy(preloadSaveGameModal);
const PreBattleBriefing = lazy(preloadPreBattleBriefing);

const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen" aria-label="Loading content...">
    <Loader className="w-16 h-16 text-primary animate-spin" />
  </div>
);

const GameContainer: React.FC = () => {
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const gameMode = useUiStore((state) => state.gameMode);
  const { resetGame, autosave } = useCampaignProgressStore((state) => state.actions);
  const { setGameMode } = useUiStore((state) => state.actions);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);

  const handleExitToMenu = () => {
    autosave();
    setGameMode('main_menu');
  };

  const renderContent = () => {
    switch (gameMode) {
      case 'lobby':
        return <MultiplayerLobby />;
      case 'pre_battle_briefing':
        return <PreBattleBriefing />;
      case 'battle':
        return <BattleView />;
      case 'post_battle':
        return <PostBattleSequence />;
      case 'dashboard':
        return <CampaignDashboard onSaveGame={() => setSaveModalOpen(true)} onExitToMenu={handleExitToMenu} />;
      case 'crew_creation':
      default:
        return <CrewCreator />;
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pt-10 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
        <header className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-primary/20 shrink-0">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-orbitron">{t('app.title')}</h1>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-center flex-wrap justify-end">
            <ThemeSwitcher />
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{t('app.language')}:</span>
              {availableLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 text-sm font-bold uppercase rounded-md transition-colors ${
                    language === lang ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <button
              onClick={() => resetGame(true)}
              className="bg-danger hover:bg-danger/80 text-text-inverted font-bold py-2 px-4 rounded-md transition-colors duration-300 flex items-center gap-2"
              title={t('app.newGame')}
            >
              <Dna size={18} />
              <span className="hidden sm:inline">{t('app.newGame')}</span>
            </button>
          </div>
        </header>
        <main className="flex-grow">
          {isSaveModalOpen && (
            <Suspense fallback={null}>
              <SaveGameModal onClose={() => setSaveModalOpen(false)} />
            </Suspense>
          )}
          {renderContent()}
        </main>
      </div>
      <footer className="text-center mt-12 text-text-muted text-sm shrink-0">
        <p>{t('app.inspiredBy')}</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const gameMode = useUiStore((state) => state.gameMode);
  const isHydrated = useCampaignProgressStore((state) => state.isHydrated);
  const setJoinIdAndRole = useMultiplayerStore((state) => state.actions.setJoinIdAndRole);

  useEffect(() => {
    if (!isHydrated) return;
    const urlParams = new URLSearchParams(window.location.search);
    const peerId = urlParams.get('join');
    if (peerId) {
      setJoinIdAndRole(peerId);
    }
  }, [isHydrated, setJoinIdAndRole]);

  useEffect(() => {
    document.body.classList.toggle('main-menu', gameMode === 'main_menu');
  }, [gameMode]);

  if (!isHydrated) {
    return <LoadingFallback />;
  }

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <ToastContainer />
        {gameMode === 'main_menu' ? <MainMenu /> : <GameContainer />}
      </Suspense>
    </>
  );
};

export default App;
