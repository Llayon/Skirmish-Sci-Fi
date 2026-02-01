import React, { useState, useMemo, Suspense, lazy, useRef, useEffect } from 'react';
import { useCampaignProgressStore, useUiStore, useMultiplayerStore } from '@/stores';
import { useTranslation } from '@/i18n';
import Button from '@/components/ui/Button';
import { Play, FilePlus, FolderOpen, Settings, Loader, Users, Calendar, Coins, User, Radio, CircleDot } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useSettingsStore } from '@/stores';
import type { SaveSlot } from '@/types';
import {
  preloadCampaignDashboard,
  preloadCrewCreator,
  preloadLoadGameModal,
  preloadMultiplayerLobby,
} from '@/services/utils/componentPreloader';
import { sanitizeToText } from '@/services/utils/sanitization';

const LoadGameModal = lazy(preloadLoadGameModal);

const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const reducedVfx = useSettingsStore((state) => state.reducedVfx);
  const { toggleReducedMotion, toggleReducedVfx } = useSettingsStore((state) => state.actions);
  return (
    <Modal onClose={onClose} title={t('app.settings')}>
      <Card className="w-full sm:max-w-md bg-surface-overlay !p-0">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-text-base">{t('app.language')}:</span>
            <div className="flex items-center gap-2">
              {availableLanguages.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 text-sm font-bold uppercase rounded-md transition-colors ${language === lang ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-base">Theme:</span>
            <ThemeSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-base">Reduced motion:</span>
            <Button className="px-3 py-1 text-sm" selected={reducedMotion} onClick={toggleReducedMotion}>
              {reducedMotion ? 'On' : 'Off'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-base">Reduced VFX:</span>
            <Button className="px-3 py-1 text-sm" selected={reducedVfx} onClick={toggleReducedVfx}>
              {reducedVfx ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        <div className="mt-6 text-right border-t border-border pt-4 px-6">
          <Button onClick={onClose}>{t('buttons.close')}</Button>
        </div>
      </Card>
    </Modal>
  );
};

const ContinuePanel: React.FC<{ slot: SaveSlot; onContinue: () => void }> = ({ slot, onContinue }) => {
    const { t } = useTranslation();
    const formattedDate = new Date(slot.metadata.savedAt).toLocaleString();

    return (
        <div className="main-menu-panel-container opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '0.6s' }}>
            <div className="main-menu-panel">
                <div className="space-y-6">
                    <h2 className="font-orbitron text-2xl text-primary">{t('buttons.continue')}</h2>
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-4">
                            <User className="w-5 h-5 text-primary/80" />
                            <span className="font-semibold text-text-base">{sanitizeToText(slot.metadata.crewName)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-primary/80" />
                            <span className="text-text-base">{t('dashboard.campaignTurn')}: {slot.metadata.turn}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Coins className="w-5 h-5 text-primary/80" />
                            <span className="text-text-base">{t('crewCreator.startingCredits')}: {slot.campaign.credits}</span>
                        </div>
                    </div>
                    <button onMouseEnter={preloadCampaignDashboard} onClick={onContinue} className="sci-fi-button w-full text-lg">
                        <Play className="w-5 h-5 mr-2" />
                        {t('buttons.continue')} Campaign
                    </button>
                    <p className="text-xs text-text-muted text-center">{t('saveSlots.lastSaved')}: {formattedDate}</p>
                </div>
                 <div className="absolute bottom-2 left-3 text-primary/20">
                    <CircleDot size={14} />
                </div>
            </div>
        </div>
    );
};

const NewGamePanel: React.FC<{ onNewGame: () => void }> = ({ onNewGame }) => {
    const { t } = useTranslation();
    return (
        <div className="main-menu-panel-container opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '0.6s' }}>
            <div className="main-menu-panel">
                 <div className="space-y-4 text-center">
                     <h2 className="font-orbitron text-2xl text-primary">{t('mainMenu.sagaAwaits')}</h2>
                     <p className="text-text-base">
                        {t('mainMenu.welcome')}
                     </p>
                     <button onMouseEnter={preloadCrewCreator} onClick={onNewGame} className="sci-fi-button w-full text-lg">
                        <FilePlus className="w-5 h-5 mr-2" />
                        {t('mainMenu.beginJourney')}
                     </button>
                </div>
                <div className="absolute bottom-2 left-3 text-primary/20">
                    <CircleDot size={14} />
                </div>
            </div>
        </div>
    );
};

const IntelPanel: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="main-menu-panel-container opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '0.8s' }}>
            <div className="main-menu-panel">
                 <div className="space-y-2 text-center">
                    <h3 className="font-orbitron text-lg text-primary/90 flex items-center justify-center gap-2"><Radio size={16}/> {t('mainMenu.fringeIntel')}</h3>
                    <p className="text-text-muted text-sm">
                        {t('mainMenu.intelMessage')}
                    </p>
                 </div>
                 <div className="absolute bottom-2 left-3 text-primary/20">
                    <CircleDot size={14} />
                </div>
            </div>
        </div>
    );
};


const MainMenu: React.FC = () => {
  const { t } = useTranslation();
  const { saveSlots, actions: campaignActions } = useCampaignProgressStore();
  const { setGameMode } = useUiStore(state => state.actions);
  const { startMultiplayer } = useMultiplayerStore(state => state.actions);

  const [isLoadModalOpen, setLoadModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xPercent = clientX / innerWidth;
      const yPercent = clientY / innerHeight;
      
      if (mainContainerRef.current) {
        mainContainerRef.current.style.setProperty('--mouse-x', `${clientX}px`);
        mainContainerRef.current.style.setProperty('--mouse-y', `${clientY}px`);
        
        const video = mainContainerRef.current.querySelector('video');
        if (video) {
            const videoXOffset = (xPercent - 0.5) * -15;
            const videoYOffset = (yPercent - 0.5) * -15;
            video.style.transform = `scale(1.1) translate(${videoXOffset}px, ${videoYOffset}px)`;
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    const existingRipple = button.querySelector(".ripple");
    if (existingRipple) {
      existingRipple.remove();
    }
    
    button.appendChild(circle);

    setTimeout(() => {
        circle.remove();
    }, 600);
    
    setTimeout(action, 200);
  };

  const lastSaveSlot = useMemo(() => {
    const slots = Object.values(saveSlots).filter((slot): slot is SaveSlot => !!slot);
    if (slots.length === 0) return null;
    slots.sort((a, b) => new Date(b.metadata.savedAt).getTime() - new Date(a.metadata.savedAt).getTime());
    return slots[0];
  }, [saveSlots]);

  const hasSaves = !!lastSaveSlot;

  const handleNewGame = () => {
    campaignActions.resetGame();
  };

  const handleContinue = () => {
    if (lastSaveSlot) {
      const slotId = Object.keys(saveSlots).find(key => saveSlots[key as keyof typeof saveSlots] === lastSaveSlot)
      if(slotId) {
        campaignActions.loadGame(slotId as any);
      }
    }
  };
  
  const handleMultiplayer = () => {
    startMultiplayer();
  };

  const menuItems = [
    { id: 'new_game', label: t('app.newGame'), icon: FilePlus, action: handleNewGame, onMouseEnter: preloadCrewCreator, condition: true },
    { id: 'load_game', label: t('buttons.loadGame'), icon: FolderOpen, action: () => setLoadModalOpen(true), onMouseEnter: preloadLoadGameModal, condition: hasSaves },
    { id: 'multiplayer', label: t('buttons.playWithFriend'), icon: Users, action: handleMultiplayer, onMouseEnter: preloadMultiplayerLobby, condition: true },
    { id: 'settings', label: t('app.settings'), icon: Settings, action: () => setSettingsModalOpen(true), onMouseEnter: () => {}, condition: true },
  ];

  return (
    <>
      <div ref={mainContainerRef} className="main-menu-container scan-lines">
        <div className="nebula" />
        <div className="grid-plane" />
        <div className="stars-container">
          <div className="star-layer" />
          <div className="star-layer" />
          <div className="star-layer" />
        </div>
        <div className="spotlight"></div>
        <div className="video-background-container">
            <video autoPlay muted loop playsInline key="background-video" className="transition-transform duration-300 ease-out">
                <source src="/assets/briefing_loop.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="video-overlay"></div>
        </div>

        {/* Decorative HUD Elements */}
        <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="main-menu-hexagons">
                <div className="hexagon" />
                <div className="hexagon" />
                <div className="hexagon" />
                <div className="hexagon" />
                <div className="hexagon" />
                <div className="hexagon" />
            </div>
            <div className="main-menu-glyphs">
                <div className="digital-glyph">0x89F2 EXEC PROTOCOL</div>
                <div className="digital-glyph">SYS.QUANTUM.INIT()</div>
                <div className="digital-glyph">
                  01011010 01000001 01010000 01010101 01010011 01001011
                </div>
                <div className="digital-glyph">HOLO-CONN INITIALIZED</div>
            </div>
        </div>
        
        <div className="relative z-20 w-full max-w-7xl p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col justify-center space-y-12 text-center lg:text-left lg:items-start">
            <div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-orbitron text-primary animate-[title-assemble_1s_ease-out_forwards]">
                FIVE PARSECS
              </h1>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-8">
              <div className="menu-decorator hidden lg:block opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '0.5s' }}>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-around items-center text-primary/50 font-mono text-[10px] pointer-events-none opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '1.2s' }}>
                  <span>3B:A1</span>
                  <span>7F:C2</span>
                  <span>D4:E9</span>
                  <span>01:FF</span>
                  <span>9C:B3</span>
                </div>
              </div>
              <nav className="space-y-3 w-full max-w-2xl mx-auto lg:mx-0 relative">
                {menuItems.filter(item => item.condition).map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className="menu-button-wrapper rounded-md opacity-0 animate-[fade-in-right_0.5s_ease-out_forwards] cursor-pointer border-0 bg-transparent p-0 text-left"
                    style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                    onMouseEnter={() => { item.onMouseEnter(); }}
                    onClick={(e) => handleMenuClick(e, item.action)}
                  >
                    <div className="menu-button w-full flex items-center p-4 text-xl justify-start font-bold border-l-4 bg-surface-base/50 text-text-base rounded-md">
                      <item.icon className="mr-4 menu-icon" /> {item.label}
                    </div>
                  </button>
                ))}
                <div className="main-menu-sound-wave">
                    <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />
                    <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />
                    <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />
                </div>
              </nav>
            </div>
            <footer className="text-text-muted text-xs opacity-0 animate-[fade-in-down_0.5s_ease-out_forwards]" style={{ animationDelay: '1.2s' }}>
              {t('mainMenu.version')}
            </footer>
          </div>

          <div className="space-y-6">
            {lastSaveSlot ? (
              <ContinuePanel slot={lastSaveSlot} onContinue={handleContinue} />
            ) : (
              <NewGamePanel onNewGame={handleNewGame} />
            )}
            <IntelPanel />
          </div>

        </div>
      </div>
      
      {isLoadModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex justify-center items-center"><Loader className="w-16 h-16 animate-spin text-primary" /></div>}>
          <LoadGameModal onClose={() => setLoadModalOpen(false)} />
        </Suspense>
      )}
      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} />
      )}
    </>
  );
};

export default MainMenu;
