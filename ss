warning: in the working copy of 'components/battle/BattleHUD.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/BattleView.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/BattleView3D.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/CameraCommands3D.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/GridFloor.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/MoveHighlights.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/ParticipantMesh.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/RaycastController.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/TerrainMesh.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'components/battle/three/ThreeCanvas.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'services/adapters/battle3dAdapter.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'services/engine/net/stableStringify.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'services/engine/net/stateHash.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'services/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/components/debug/EngineDevTools.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'stores/battleStore.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'stores/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'stores/uiStore.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'types/battle3d.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'types/multiplayer.ts', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/App.tsx b/App.tsx[m
[1mindex 0e41753..df774a3 100644[m
[1m--- a/App.tsx[m
[1m+++ b/App.tsx[m
[36m@@ -2,7 +2,7 @@[m
 import React, { useEffect, lazy, Suspense, useState } from 'react';[m
 import { Dna, Star, Loader } from 'lucide-react';[m
 import { useTranslation } from '@/i18n';[m
[31m-import { useUiStore, useCampaignProgressStore, useMultiplayerStore, useSettingsStore } from '@/stores';[m
[32m+[m[32mimport { useUiStore, useCampaignProgressStore, useMultiplayerStore } from '@/stores';[m
 import ThemeSwitcher from '@/components/ThemeSwitcher';[m
 import ToastContainer from '@/components/ui/ToastContainer';[m
 import {[m
[36m@@ -104,6 +104,9 @@[m [mconst GameContainer: React.FC = () => {[m
           {renderContent()}[m
         </main>[m
       </div>[m
[32m+[m[32m      <footer className="text-center mt-12 text-text-muted text-sm shrink-0">[m
[32m+[m[32m        <p>{t('app.inspiredBy')}</p>[m
[32m+[m[32m      </footer>[m
     </div>[m
   );[m
 };[m
[36m@@ -112,8 +115,6 @@[m [mconst App: React.FC = () => {[m
   const gameMode = useUiStore((state) => state.gameMode);[m
   const isHydrated = useCampaignProgressStore((state) => state.isHydrated);[m
   const setJoinIdAndRole = useMultiplayerStore((state) => state.actions.setJoinIdAndRole);[m
[31m-  const reducedMotion = useSettingsStore((state) => state.reducedMotion);[m
[31m-  const reducedVfx = useSettingsStore((state) => state.reducedVfx);[m
 [m
   useEffect(() => {[m
     if (!isHydrated) return;[m
[36m@@ -128,11 +129,6 @@[m [mconst App: React.FC = () => {[m
     document.body.classList.toggle('main-menu', gameMode === 'main_menu');[m
   }, [gameMode]);[m
 [m
[31m-  useEffect(() => {[m
[31m-    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));[m
[31m-    document.documentElement.setAttribute('data-reduced-vfx', String(reducedVfx));[m
[31m-  }, [reducedMotion, reducedVfx]);[m
[31m-[m
   if (!isHydrated) {[m
     return <LoadingFallback />;[m
   }[m
[1mdiff --git a/components/MainMenu.tsx b/components/MainMenu.tsx[m
[1mindex b8a80d5..f1d61a3 100644[m
[1m--- a/components/MainMenu.tsx[m
[1m+++ b/components/MainMenu.tsx[m
[36m@@ -6,7 +6,6 @@[m [mimport { Play, FilePlus, FolderOpen, Settings, Loader, Users, Calendar, Coins, U[m
 import Modal from '@/components/ui/Modal';[m
 import Card from '@/components/ui/Card';[m
 import ThemeSwitcher from '@/components/ThemeSwitcher';[m
[31m-import { useSettingsStore } from '@/stores';[m
 import type { SaveSlot } from '@/types';[m
 import {[m
   preloadCampaignDashboard,[m
[36m@@ -20,9 +19,6 @@[m [mconst LoadGameModal = lazy(preloadLoadGameModal);[m
 [m
 const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {[m
   const { t, language, setLanguage, availableLanguages } = useTranslation();[m
[31m-  const reducedMotion = useSettingsStore((state) => state.reducedMotion);[m
[31m-  const reducedVfx = useSettingsStore((state) => state.reducedVfx);[m
[31m-  const { toggleReducedMotion, toggleReducedVfx } = useSettingsStore((state) => state.actions);[m
   return ([m
     <Modal onClose={onClose} title={t('app.settings')}>[m
       <Card className="w-full sm:max-w-md bg-surface-overlay !p-0">[m
[36m@@ -45,18 +41,6 @@[m [mconst SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {[m
             <span className="text-text-base">Theme:</span>[m
             <ThemeSwitcher />[m
           </div>[m
[31m-          <div className="flex items-center justify-between">[m
[31m-            <span className="text-text-base">Reduced motion:</span>[m
[31m-            <Button className="px-3 py-1 text-sm" selected={reducedMotion} onClick={toggleReducedMotion}>[m
[31m-              {reducedMotion ? 'On' : 'Off'}[m
[31m-            </Button>[m
[31m-          </div>[m
[31m-          <div className="flex items-center justify-between">[m
[31m-            <span className="text-text-base">Reduced VFX:</span>[m
[31m-            <Button className="px-3 py-1 text-sm" selected={reducedVfx} onClick={toggleReducedVfx}>[m
[31m-              {reducedVfx ? 'On' : 'Off'}[m
[31m-            </Button>[m
[31m-          </div>[m
         </div>[m
         <div className="mt-6 text-right border-t border-border pt-4 px-6">[m
           <Button onClick={onClose}>{t('buttons.close')}</Button>[m
[36m@@ -299,18 +283,20 @@[m [mconst MainMenu: React.FC = () => {[m
               </div>[m
               <nav className="space-y-3 w-full max-w-2xl mx-auto lg:mx-0 relative">[m
                 {menuItems.filter(item => item.condition).map((item, index) => ([m
[31m-                  <button[m
[32m+[m[32m                   <div[m
                     key={item.id}[m
[31m-                    type="button"[m
[31m-                    className="menu-button-wrapper rounded-md opacity-0 animate-[fade-in-right_0.5s_ease-out_forwards] cursor-pointer border-0 bg-transparent p-0 text-left"[m
[32m+[m[32m                    className="menu-button-wrapper rounded-md opacity-0 animate-[fade-in-right_0.5s_ease-out_forwards] cursor-pointer"[m
                     style={{ animationDelay: `${0.6 + index * 0.1}s` }}[m
                     onMouseEnter={() => { item.onMouseEnter(); }}[m
                     onClick={(e) => handleMenuClick(e, item.action)}[m
                   >[m
[31m-                    <div className="menu-button w-full flex items-center p-4 text-xl justify-start font-bold border-l-4 bg-surface-base/50 text-text-base rounded-md">[m
[31m-                      <item.icon className="mr-4 menu-icon" /> {item.label}[m
[31m-                    </div>[m
[31m-                  </button>[m
[32m+[m[32m                      <button[m
[32m+[m[32m                        className="menu-button w-full flex items-center p-4 text-xl justify-start font-bold border-l-4 bg-surface-base/50 text-text-base rounded-md"[m
[32m+[m[32m                        tabIndex={-1} // Make the div the focusable element[m
[32m+[m[32m                      >[m
[32m+[m[32m                        <item.icon className="mr-4 menu-icon" /> {item.label}[m
[32m+[m[32m                      </button>[m
[32m+[m[32m                   </div>[m
                 ))}[m
                 <div className="main-menu-sound-wave">[m
                     <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />[m
[1mdiff --git a/components/battle/ActionControls.tsx b/components/battle/ActionControls.tsx[m
[1mindex 3fd11e0..83591a6 100644[m
[1m--- a/components/battle/ActionControls.tsx[m
[1m+++ b/components/battle/ActionControls.tsx[m
[36m@@ -11,6 +11,7 @@[m [mimport { useGameState } from '../../hooks/useGameState';[m
 import { useMultiplayerStore, useBattleStore } from '../../stores';[m
 import { BattleLogic } from '../../hooks/useBattleLogic';[m
 import { getWeaponById } from '../../services/data/items';[m
[32m+[m[32mimport { EngineV2HudControls } from './EngineV2HudControls';[m
 [m
 /**[m
  * Props for the ActionControls component.[m
[36m@@ -271,6 +272,8 @@[m [mconst ActionControls: React.FC<ActionControlsProps> = ({ participant, battleLogi[m
         {uiState.mode !== 'idle' && <ActionButton tooltip={t('buttons.cancel')} onClick={handlers.cancelAction} variant='danger'><XCircle /></ActionButton>}[m
         <Button onClick={() => handlers.endTurn()} variant='primary' className='py-2 px-6 ml-4 h-14 rounded-full'>{t('buttons.endTurn')}</Button>[m
       </div>[m
[32m+[m
[32m+[m[32m      <EngineV2HudControls />[m
     </div>[m
   );[m
 };[m
[1mdiff --git a/components/battle/ActionQueue.tsx b/components/battle/ActionQueue.tsx[m
[1mindex 8b85fe9..76b2feb 100644[m
[1m--- a/components/battle/ActionQueue.tsx[m
[1m+++ b/components/battle/ActionQueue.tsx[m
[36m@@ -6,12 +6,7 @@[m [mimport { BattleParticipant } from '@/types';[m
 import { Heart, Shield, Zap } from 'lucide-react';[m
 import Tooltip from '../ui/Tooltip';[m
 [m
[31m-type ActionQueueProps = {[m
[31m-  embedded?: boolean;[m
[31m-  compact?: boolean;[m
[31m-};[m
[31m-[m
[31m-const ActionQueue: React.FC<ActionQueueProps> = ({ embedded = false, compact = false }) => {[m
[32m+[m[32mconst ActionQueue: React.FC = () => {[m
   const { t } = useTranslation();[m
   const battle = useBattleStore(state => state.battle);[m
   if (!battle) return null;[m
[36m@@ -22,10 +17,10 @@[m [mconst ActionQueue: React.FC<ActionQueueProps> = ({ embedded = false, compact = f[m
   const isSlowPhase = phase === 'slow_actions';[m
   const isEnemyPhase = phase === 'enemy_actions';[m
 [m
[31m-  const containerHeight = compact ? 'h-[96px]' : 'h-[120px]';[m
[32m+[m[32m  const containerHeight = 'h-[120px]';[m
 [m
   if (!isQuickPhase && !isSlowPhase && !isEnemyPhase) {[m
[31m-    return embedded ? null : <div className={containerHeight} />;[m
[32m+[m[32m    return <div className={containerHeight} />; // Keep layout consistent[m
   }[m
 [m
   let order: string[] = [];[m
[36m@@ -45,8 +40,12 @@[m [mconst ActionQueue: React.FC<ActionQueueProps> = ({ embedded = false, compact = f[m
     return `${t(`enemies.${nameParts[0]}`)} #${nameParts[1]}`;[m
   };[m
 [m
[31m-  const list = ([m
[31m-    <div className='flex items-start justify-center gap-3 flex-grow'>[m
[32m+[m[32m  return ([m
[32m+[m[32m    <div className={`bg-surface-base/40 border-b border-border/50 p-2 ${containerHeight} flex flex-col`}>[m
[32m+[m[32m      <h3 className='text-center text-sm font-bold uppercase text-primary tracking-wider mb-2'>[m
[32m+[m[32m        {t(`battle.phase.${phase}`)}[m
[32m+[m[32m      </h3>[m
[32m+[m[32m      <div className='flex items-start justify-center gap-3 flex-grow'>[m
         {orderedParticipants.map(p => {[m
           const isActive = p.id === activeParticipantId;[m
           const hasActed = p.actionsRemaining <= 0;[m
[36m@@ -90,18 +89,6 @@[m [mconst ActionQueue: React.FC<ActionQueueProps> = ({ embedded = false, compact = f[m
           );[m
         })}[m
       </div>[m
[31m-  );[m
[31m-[m
[31m-  if (embedded) {[m
[31m-    return <div className={`${containerHeight} flex flex-col`}>{list}</div>;[m
[31m-  }[m
[31m-[m
[31m-  return ([m
[31m-    <div className={`bg-surface-base/40 border-b border-border/50 p-2 ${containerHeight} flex flex-col`}>[m
[31m-      <h3 className='text-center text-sm font-bold uppercase text-primary tracking-wider mb-2'>[m
[31m-        {t(`battle.phase.${phase}`)}[m
[31m-      </h3>[m
[31m-      {list}[m
     </div>[m
   );[m
 };[m
[1mdiff --git a/components/battle/BattleHUD.test.tsx b/components/battle/BattleHUD.test.tsx[m
[1mindex 5e90ee0..18fbae5 100644[m
[1m--- a/components/battle/BattleHUD.test.tsx[m
[1m+++ b/components/battle/BattleHUD.test.tsx[m
[36m@@ -10,10 +10,10 @@[m [mvi.mock('./ActionControls', () => ({ default: () => <div data-testid="action-con[m
 vi.mock('./ReactionRollPanel', () => ({ default: () => <div data-testid="reaction-roll-panel" /> }));[m
 vi.mock('./CharacterStatus', () => ({ default: () => <div data-testid="character-status" /> }));[m
 vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));[m
[31m-vi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn(), useHudStore: vi.fn() }));[m
[32m+[m[32mvi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn() }));[m
 vi.mock('../../hooks/useGameState');[m
 [m
[31m-const { useBattleStore, useMultiplayerStore, useHudStore } = await import('../../stores');[m
[32m+[m[32mconst { useBattleStore, useMultiplayerStore } = await import('../../stores');[m
 const { useGameState } = await import('../../hooks/useGameState');[m
 [m
 const mockGameState = (battleOverride: any) => ({[m
[36m@@ -35,34 +35,10 @@[m [mdescribe('BattleHUD', () => {[m
   beforeEach(() => {[m
     vi.clearAllMocks();[m
     vi.mocked(useMultiplayerStore).mockImplementation((selector: any) => selector({ multiplayerRole: null }));[m
[31m-    vi.mocked(useHudStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        preset: 'full',[m
[31m-        panels: { queue: true, mission: true, status: true, actions: true, log: true },[m
[31m-        collapsed: { queue: false, mission: false, status: false, actions: false, log: false },[m
[31m-        density: 'normal',[m
[31m-        autoHideSecondaryPanels: false,[m
[31m-        actions: {[m
[31m-          applyPreset: vi.fn(),[m
[31m-          setPanelVisible: vi.fn(),[m
[31m-          togglePanel: vi.fn(),[m
[31m-          toggleCollapsed: vi.fn(),[m
[31m-          setDensity: vi.fn(),[m
[31m-          setAutoHideSecondaryPanels: vi.fn(),[m
[31m-          reset: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
     vi.mocked(useBattleStore).mockImplementation((selector: any) =>[m
       selector({[m
         selectedParticipantId: 'char1',[m
         hoveredParticipantId: null,[m
[31m-        inspectLockedParticipantId: null,[m
[31m-        inspectLockedPointer: null,[m
[31m-        inspectLockedTile: null,[m
[31m-        inspectLockedTilePointer: null,[m
[31m-        animatingParticipantId: null,[m
[31m-        isProcessingEnemies: false,[m
         battle: { activeParticipantId: 'char1', activePlayerRole: null },[m
       })[m
     );[m
[36m@@ -70,20 +46,20 @@[m [mdescribe('BattleHUD', () => {[m
 [m
   it('renders MissionPanel and BattleLog in all phases', () => {[m
     vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'quick_actions', participants: [mockParticipant], activeParticipantId: 'char1' }));[m
[31m-    render(<BattleHUD battleLogic={{ uiState: { mode: 'idle' } } as any} />);[m
[32m+[m[32m    render(<BattleHUD battleLogic={{} as any} />);[m
     expect(screen.getByTestId('mission-panel')).toBeInTheDocument();[m
     expect(screen.getByTestId('battle-log')).toBeInTheDocument();[m
   });[m
 [m
   it('renders ReactionRollPanel during the reaction_roll phase', () => {[m
     vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'reaction_roll' }));[m
[31m-    render(<BattleHUD battleLogic={{ uiState: { mode: 'idle' } } as any} />);[m
[32m+[m[32m    render(<BattleHUD battleLogic={{} as any} />);[m
     expect(screen.getByTestId('reaction-roll-panel')).toBeInTheDocument();[m
   });[m
 [m
   it('renders ActionControls when it is a player character\'s turn', () => {[m
     vi.mocked(useGameState).mockReturnValue(mockGameState({ mission: {}, log: [], phase: 'quick_actions', participants: [mockParticipant], activeParticipantId: 'char1' }));[m
[31m-    render(<BattleHUD battleLogic={{ uiState: { mode: 'idle' } } as any} />);[m
[32m+[m[32m    render(<BattleHUD battleLogic={{} as any} />);[m
     expect(screen.getByTestId('action-controls')).toBeInTheDocument();[m
   });[m
 });[m
[1mdiff --git a/components/battle/BattleHUD.tsx b/components/battle/BattleHUD.tsx[m
[1mindex 0371c97..af7ec18 100644[m
[1m--- a/components/battle/BattleHUD.tsx[m
[1m+++ b/components/battle/BattleHUD.tsx[m
[36m@@ -1,6 +1,6 @@[m
 [m
 [m
[31m-import React, { useMemo, useRef, useState, useEffect } from 'react';[m
[32m+[m[32mimport { useMemo, useRef, useState, useEffect, type FC } from 'react';[m
 import { BattleLogic } from '../../hooks/useBattleLogic';[m
 import ActionControls from './ActionControls';[m
 import CharacterStatus from './CharacterStatus';[m
[36m@@ -13,7 +13,6 @@[m [mimport { Loader } from 'lucide-react';[m
 import { useTranslation } from '../../i18n';[m
 import ActionQueue from './ActionQueue';[m
 import TargetInspector from './TargetInspector';[m
[31m-import { shallow } from 'zustand/shallow';[m
 import { useShallow } from 'zustand/react/shallow';[m
 [m
 interface BattleHUDProps {[m
[36m@@ -21,7 +20,7 @@[m [minterface BattleHUDProps {[m
   uiMode?: 'full' | 'minimal';[m
 }[m
 [m
[31m-const BattleHUD: React.FC<BattleHUDProps> = ({ battleLogic, uiMode = 'full' }) => {[m
[32m+[m[32mconst BattleHUD: FC<BattleHUDProps> = ({ battleLogic, uiMode = 'full' }) => {[m
   const { t } = useTranslation();[m
   const { battle } = useGameState();[m
   const { selectedParticipantId, activeParticipantId, hoveredParticipantId } = useBattleStore([m
[1mdiff --git a/components/battle/BattleHudSettingsModal.test.tsx b/components/battle/BattleHudSettingsModal.test.tsx[m
[1mdeleted file mode 100644[m
[1mindex 7670261..0000000[m
[1m--- a/components/battle/BattleHudSettingsModal.test.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,110 +0,0 @@[m
[31m-import React from 'react';[m
[31m-import { render, screen, fireEvent } from '@testing-library/react';[m
[31m-import { describe, it, expect, vi, beforeEach } from 'vitest';[m
[31m-import BattleHudSettingsModal from './BattleHudSettingsModal';[m
[31m-[m
[31m-vi.mock('@/components/ui/Modal', () => ({ default: ({ children }: any) => <div>{children}</div> }));[m
[31m-vi.mock('@/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));[m
[31m-vi.mock('@/stores', () => ({ useHudStore: vi.fn(), useBattleStore: vi.fn() }));[m
[31m-vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: vi.fn() }));[m
[31m-[m
[31m-const { useHudStore, useBattleStore } = await import('@/stores');[m
[31m-const { useSettingsStore } = await import('@/stores/settingsStore');[m
[31m-[m
[31m-describe('BattleHudSettingsModal', () => {[m
[31m-  beforeEach(() => {[m
[31m-    vi.clearAllMocks();[m
[31m-[m
[31m-    vi.mocked(useHudStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        preset: 'full',[m
[31m-        panels: { queue: true, mission: true, status: true, actions: true, log: true },[m
[31m-        density: 'normal',[m
[31m-        autoHideSecondaryPanels: true,[m
[31m-        actions: {[m
[31m-          applyPreset: vi.fn(),[m
[31m-          togglePanel: vi.fn(),[m
[31m-          setDensity: vi.fn(),[m
[31m-          setAutoHideSecondaryPanels: vi.fn(),[m
[31m-          reset: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-[m
[31m-    vi.mocked(useBattleStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        battle: {[m
[31m-          participants: [{ id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' }],[m
[31m-          activeParticipantId: 'char1',[m
[31m-        },[m
[31m-        selectedParticipantId: null,[m
[31m-        followActive3D: false,[m
[31m-        actions: {[m
[31m-          requestCameraFocusOn: vi.fn(),[m
[31m-          requestCameraReset: vi.fn(),[m
[31m-          setFollowActive3D: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-[m
[31m-    vi.mocked(useSettingsStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        reducedMotion: false,[m
[31m-        reducedVfx: false,[m
[31m-        threeQuality: 'high',[m
[31m-        camera3dPreset: 'tactical',[m
[31m-        camera3dInvertWheel: false,[m
[31m-        camera3dZoomSpeed: 1,[m
[31m-        camera3dPanSpeed: 1,[m
[31m-        camera3dRotateSpeed: 1,[m
[31m-        actions: {[m
[31m-          toggleReducedMotion: vi.fn(),[m
[31m-          toggleReducedVfx: vi.fn(),[m
[31m-          setThreeQuality: vi.fn(),[m
[31m-          setCamera3dPreset: vi.fn(),[m
[31m-          setCamera3dInvertWheel: vi.fn(),[m
[31m-          setCamera3dZoomSpeed: vi.fn(),[m
[31m-          setCamera3dPanSpeed: vi.fn(),[m
[31m-          setCamera3dRotateSpeed: vi.fn(),[m
[31m-          resetCamera3D: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-  });[m
[31m-[m
[31m-  it('renders 3D camera section only in 3D', () => {[m
[31m-    const { rerender } = render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);[m
[31m-    expect(screen.getByText('battle.hud.camera.title')).toBeInTheDocument();[m
[31m-[m
[31m-    rerender(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D={false} />);[m
[31m-    expect(screen.queryByText('battle.hud.camera.title')).toBeNull();[m
[31m-  });[m
[31m-[m
[31m-  it('toggles followActive3D', () => {[m
[31m-    const setFollowActive3D = vi.fn();[m
[31m-    vi.mocked(useBattleStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        battle: {[m
[31m-          participants: [{ id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' }],[m
[31m-          activeParticipantId: 'char1',[m
[31m-        },[m
[31m-        selectedParticipantId: null,[m
[31m-        followActive3D: false,[m
[31m-        actions: {[m
[31m-          requestCameraFocusOn: vi.fn(),[m
[31m-          requestCameraReset: vi.fn(),[m
[31m-          setFollowActive3D,[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-[m
[31m-    render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);[m
[31m-    fireEvent.click(screen.getByText('battle.hud.camera.followActive'));[m
[31m-    expect(setFollowActive3D).toHaveBeenCalledWith(true);[m
[31m-  });[m
[31m-[m
[31m-  it('renders help button', () => {[m
[31m-    render(<BattleHudSettingsModal onClose={vi.fn()} onOpenHelp={vi.fn()} is3D />);[m
[31m-    expect(screen.getByText('battle.help.open')).toBeInTheDocument();[m
[31m-  });[m
[31m-});[m
[1mdiff --git a/components/battle/BattleHudSettingsModal.tsx b/components/battle/BattleHudSettingsModal.tsx[m
[1mdeleted file mode 100644[m
[1mindex e885070..0000000[m
[1m--- a/components/battle/BattleHudSettingsModal.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,300 +0,0 @@[m
[31m-import React from 'react';[m
[31m-import Modal from '@/components/ui/Modal';[m
[31m-import Card from '@/components/ui/Card';[m
[31m-import Button from '@/components/ui/Button';[m
[31m-import { useBattleStore, useHudStore } from '@/stores';[m
[31m-import { useSettingsStore } from '@/stores/settingsStore';[m
[31m-import { useShallow } from 'zustand/react/shallow';[m
[31m-import { useTranslation } from '@/i18n';[m
[31m-[m
[31m-interface BattleHudSettingsModalProps {[m
[31m-  onClose: () => void;[m
[31m-  onOpenHelp: () => void;[m
[31m-  is3D: boolean;[m
[31m-}[m
[31m-[m
[31m-const BattleHudSettingsModal: React.FC<BattleHudSettingsModalProps> = ({ onClose, onOpenHelp, is3D }) => {[m
[31m-  const { t } = useTranslation();[m
[31m-  const { preset, panels, density, autoHideSecondaryPanels, applyPreset, togglePanel, setDensity, setAutoHideSecondaryPanels, reset } = useHudStore([m
[31m-    useShallow((state) => ({[m
[31m-      preset: state.preset,[m
[31m-      panels: state.panels,[m
[31m-      density: state.density,[m
[31m-      autoHideSecondaryPanels: state.autoHideSecondaryPanels,[m
[31m-      applyPreset: state.actions.applyPreset,[m
[31m-      togglePanel: state.actions.togglePanel,[m
[31m-      setDensity: state.actions.setDensity,[m
[31m-      setAutoHideSecondaryPanels: state.actions.setAutoHideSecondaryPanels,[m
[31m-      reset: state.actions.reset,[m
[31m-    }))[m
[31m-  );[m
[31m-[m
[31m-  const { battle, selectedParticipantId, activeParticipantId, followActive3D, requestCameraFocusOn, requestCameraReset, setFollowActive3D } =[m
[31m-    useBattleStore([m
[31m-      useShallow((state) => ({[m
[31m-        battle: state.battle,[m
[31m-        selectedParticipantId: state.selectedParticipantId,[m
[31m-        activeParticipantId: state.battle?.activeParticipantId ?? null,[m
[31m-        followActive3D: state.followActive3D,[m
[31m-        requestCameraFocusOn: state.actions.requestCameraFocusOn,[m
[31m-        requestCameraReset: state.actions.requestCameraReset,[m
[31m-        setFollowActive3D: state.actions.setFollowActive3D,[m
[31m-      }))[m
[31m-    );[m
[31m-[m
[31m-  const focusSelectedOrActive = () => {[m
[31m-    if (!battle) return;[m
[31m-    const selected = selectedParticipantId ? battle.participants.find((p) => p.id === selectedParticipantId) : null;[m
[31m-    const active = activeParticipantId ? battle.participants.find((p) => p.id === activeParticipantId) : null;[m
[31m-    const target = selected ?? active;[m
[31m-    if (!target) return;[m
[31m-    requestCameraFocusOn(target.position);[m
[31m-  };[m
[31m-[m
[31m-  const {[m
[31m-    reducedMotion,[m
[31m-    reducedVfx,[m
[31m-    threeQuality,[m
[31m-    camera3dPreset,[m
[31m-    camera3dInvertWheel,[m
[31m-    camera3dZoomSpeed,[m
[31m-    camera3dPanSpeed,[m
[31m-    camera3dRotateSpeed,[m
[31m-    toggleReducedMotion,[m
[31m-    toggleReducedVfx,[m
[31m-    setThreeQuality,[m
[31m-    setCamera3dPreset,[m
[31m-    setCamera3dInvertWheel,[m
[31m-    setCamera3dZoomSpeed,[m
[31m-    setCamera3dPanSpeed,[m
[31m-    setCamera3dRotateSpeed,[m
[31m-    resetCamera3D,[m
[31m-  } = useSettingsStore([m
[31m-    useShallow((state) => ({[m
[31m-      reducedMotion: state.reducedMotion,[m
[31m-      reducedVfx: state.reducedVfx,[m
[31m-      threeQuality: state.threeQuality,[m
[31m-      camera3dPreset: state.camera3dPreset,[m
[31m-      camera3dInvertWheel: state.camera3dInvertWheel,[m
[31m-      camera3dZoomSpeed: state.camera3dZoomSpeed,[m
[31m-      camera3dPanSpeed: state.camera3dPanSpeed,[m
[31m-      camera3dRotateSpeed: state.camera3dRotateSpeed,[m
[31m-      toggleReducedMotion: state.actions.toggleReducedMotion,[m
[31m-      toggleReducedVfx: state.actions.toggleReducedVfx,[m
[31m-      setThreeQuality: state.actions.setThreeQuality,[m
[31m-      setCamera3dPreset: state.actions.setCamera3dPreset,[m
[31m-      setCamera3dInvertWheel: state.actions.setCamera3dInvertWheel,[m
[31m-      setCamera3dZoomSpeed: state.actions.setCamera3dZoomSpeed,[m
[31m-      setCamera3dPanSpeed: state.actions.setCamera3dPanSpeed,[m
[31m-      setCamera3dRotateSpeed: state.actions.setCamera3dRotateSpeed,[m
[31m-      resetCamera3D: state.actions.resetCamera3D,[m
[31m-    }))[m
[31m-  );[m
[31m-[m
[31m-  return ([m
[31m-    <Modal onClose={onClose} title={t('battle.hud.title')}>[m
[31m-      <Card className="w-full sm:max-w-lg bg-surface-overlay !p-0">[m
[31m-        <div className="p-6 space-y-6">[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.presets')}</div>[m
[31m-            <div className="flex flex-wrap gap-2">[m
[31m-              <Button variant="secondary" selected={preset === 'full'} onClick={() => applyPreset('full')}>[m
[31m-                {t('battle.hud.presetFull')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={preset === 'tactical'} onClick={() => applyPreset('tactical')}>[m
[31m-                {t('battle.hud.presetTactical')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={preset === 'minimal'} onClick={() => applyPreset('minimal')}>[m
[31m-                {t('battle.hud.presetMinimal')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={preset === 'spectator'} onClick={() => applyPreset('spectator')}>[m
[31m-                {t('battle.hud.presetSpectator')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" onClick={() => reset()}>[m
[31m-                {t('battle.hud.reset')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.density')}</div>[m
[31m-            <div className="flex flex-wrap gap-2">[m
[31m-              <Button variant="secondary" selected={density === 'normal'} onClick={() => setDensity('normal')}>[m
[31m-                {t('battle.hud.normal')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={density === 'compact'} onClick={() => setDensity('compact')}>[m
[31m-                {t('battle.hud.compact')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.panels')}</div>[m
[31m-            <div className="grid grid-cols-2 gap-2">[m
[31m-              <Button variant="secondary" selected={panels.queue} onClick={() => togglePanel('queue')}>[m
[31m-                {t('battle.hud.queue')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={panels.mission} onClick={() => togglePanel('mission')}>[m
[31m-                {t('battle.hud.mission')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={panels.status} onClick={() => togglePanel('status')}>[m
[31m-                {t('battle.hud.status')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={panels.actions} onClick={() => togglePanel('actions')}>[m
[31m-                {t('battle.hud.actions')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={panels.log} onClick={() => togglePanel('log')}>[m
[31m-                {t('battle.hud.log')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.behavior')}</div>[m
[31m-            <div className="flex flex-wrap gap-2">[m
[31m-              <Button[m
[31m-                variant="secondary"[m
[31m-                selected={autoHideSecondaryPanels}[m
[31m-                onClick={() => setAutoHideSecondaryPanels(!autoHideSecondaryPanels)}[m
[31m-              >[m
[31m-                {t('battle.hud.autoHideSecondary')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.hotkeys')}</div>[m
[31m-            <div className="text-sm text-text-base">[m
[31m-              {t('battle.hud.hotkeysHint')}[m
[31m-            </div>[m
[31m-            <div>[m
[31m-              <Button variant="secondary" onClick={onOpenHelp}>[m
[31m-                {t('battle.help.open')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          <div className="space-y-2">[m
[31m-            <div className="text-text-muted text-sm">{t('battle.hud.performance.title')}</div>[m
[31m-            <div className="flex flex-wrap gap-2">[m
[31m-              <Button variant="secondary" selected={reducedMotion} onClick={() => toggleReducedMotion()}>[m
[31m-                {t('battle.hud.performance.reducedMotion')}[m
[31m-              </Button>[m
[31m-              <Button variant="secondary" selected={reducedVfx} onClick={() => toggleReducedVfx()}>[m
[31m-                {t('battle.hud.performance.reducedVfx')}[m
[31m-              </Button>[m
[31m-            </div>[m
[31m-          </div>[m
[31m-[m
[31m-          {is3D && ([m
[31m-            <div className="space-y-2">[m
[31m-              <div className="text-text-muted text-sm">{t('battle.hud.camera.title')}</div>[m
[31m-              <div className="flex flex-wrap gap-2">[m
[31m-                <Button variant="secondary" onClick={() => setFollowActive3D(!followActive3D)} selected={followActive3D}>[m
[31m-                  {t('battle.hud.camera.followActive')}[m
[31m-                </Button>[m
[31m-                <Button variant="secondary" onClick={focusSelectedOrActive}>[m
[31m-                  {t('battle.hud.camera.focus')}[m
[31m-                </Button>[m
[31m-                <Button variant="secondary" onClick={() => requestCameraReset()}>[m
[31m-                  {t('battle.hud.camera.reset')}[m
[31m-                </Button>[m
[31m-              </div>[m
[31m-              <div className="space-y-2">[m
[31m-                <div className="text-text-muted text-xs">{t('battle.hud.camera.quality')}</div>[m
[31m-                <div className="flex flex-wrap gap-2">[m
[31m-                  <Button variant="secondary" selected={threeQuality === 'low'} onClick={() => setThreeQuality('low')}>[m
[31m-                    {t('battle.hud.camera.qualityLow')}[m
[31m-                  </Button>[m
[31m-                  <Button variant="secondary" selected={threeQuality === 'medium'} onClick={() => setThreeQuality('medium')}>[m
[31m-                    {t('battle.hud.camera.qualityMedium')}[m
[31m-                  </Button>[m
[31m-                  <Button variant="secondary" selected={threeQuality === 'high'} onClick={() => setThreeQuality('high')}>[m
[31m-                    {t('battle.hud.camera.qualityHigh')}[m
[31m-                  </Button>[m
[31m-                </div>[m
[31m-              </div>[m
[31m-              <div className="flex flex-wrap gap-2">[m
[31m-                <Button[m
[31m-                  variant="secondary"[m
[31m-                  selected={camera3dPreset === 'tactical'}[m
[31m-                  onClick={() => setCamera3dPreset('tactical')}[m
[31m-                >[m
[31m-                  {t('battle.hud.camera.presetTactical')}[m
[31m-                </Button>[m
[31m-                <Button[m
[31m-                  variant="secondary"[m
[31m-                  selected={camera3dPreset === 'cinematic'}[m
[31m-                  onClick={() => setCamera3dPreset('cinematic')}[m
[31m-                >[m
[31m-                  {t('battle.hud.camera.presetCinematic')}[m
[31m-                </Button>[m
[31m-                <Button[m
[31m-                  variant="secondary"[m
[31m-                  selected={camera3dInvertWheel}[m
[31m-                  onClick={() => setCamera3dInvertWheel(!camera3dInvertWheel)}[m
[31m-                >[m
[31m-                  {t('battle.hud.camera.invertWheel')}[m
[31m-                </Button>[m
[31m-                <Button variant="secondary" onClick={() => resetCamera3D()}>[m
[31m-                  {t('battle.hud.camera.resetSettings')}[m
[31m-                </Button>[m
[31m-              </div>[m
[31m-              <div className="space-y-2">[m
[31m-                <div className="grid grid-cols-1 gap-2">[m
[31m-                  <div className="flex items-center gap-3">[m
[31m-                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.zoomSpeed')}</div>[m
[31m-                    <input[m
[31m-                      className="flex-1"[m
[31m-                      type="range"[m
[31m-                      min={0.5}[m
[31m-                      max={3}[m
[31m-                      step={0.1}[m
[31m-                      value={camera3dZoomSpeed}[m
[31m-                      onChange={(e) => setCamera3dZoomSpeed(parseFloat(e.target.value))}[m
[31m-                    />[m
[31m-                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dZoomSpeed.toFixed(1)}</div>[m
[31m-                  </div>[m
[31m-                  <div className="flex items-center gap-3">[m
[31m-                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.panSpeed')}</div>[m
[31m-                    <input[m
[31m-                      className="flex-1"[m
[31m-                      type="range"[m
[31m-                      min={0.5}[m
[31m-                      max={3}[m
[31m-                      step={0.1}[m
[31m-                      value={camera3dPanSpeed}[m
[31m-                      onChange={(e) => setCamera3dPanSpeed(parseFloat(e.target.value))}[m
[31m-                    />[m
[31m-                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dPanSpeed.toFixed(1)}</div>[m
[31m-                  </div>[m
[31m-                  <div className="flex items-center gap-3">[m
[31m-                    <div className="w-28 text-xs text-text-muted">{t('battle.hud.camera.rotateSpeed')}</div>[m
[31m-                    <input[m
[31m-                      className="flex-1"[m
[31m-                      type="range"[m
[31m-                      min={0.5}[m
[31m-                      max={3}[m
[31m-                      step={0.1}[m
[31m-                      value={camera3dRotateSpeed}[m
[31m-                      onChange={(e) => setCamera3dRotateSpeed(parseFloat(e.target.value))}[m
[31m-                    />[m
[31m-                    <div className="w-10 text-xs text-text-base tabular-nums text-right">{camera3dRotateSpeed.toFixed(1)}</div>[m
[31m-                  </div>[m
[31m-                </div>[m
[31m-              </div>[m
[31m-              <div className="text-sm text-text-base">[m
[31m-                {t('battle.hud.camera.controlsHint')}[m
[31m-              </div>[m
[31m-            </div>[m
[31m-          )}[m
[31m-        </div>[m
[31m-        <div className="border-t border-border px-6 py-4 flex justify-end">[m
[31m-          <Button onClick={onClose}>{t('battle.hud.close')}</Button>[m
[31m-        </div>[m
[31m-      </Card>[m
[31m-    </Modal>[m
[31m-  );[m
[31m-};[m
[31m-[m
[31m-export default BattleHudSettingsModal;[m
[1mdiff --git a/components/battle/BattleLog.test.tsx b/components/battle/BattleLog.test.tsx[m
[1mindex 5352550..1aa9cbb 100644[m
[1m--- a/components/battle/BattleLog.test.tsx[m
[1m+++ b/components/battle/BattleLog.test.tsx[m
[36m@@ -1,5 +1,5 @@[m
 import React from 'react';[m
[31m-import { render, screen, fireEvent } from '@testing-library/react';[m
[32m+[m[32mimport { render, screen } from '@testing-library/react';[m
 import { describe, it, expect, vi } from 'vitest';[m
 import BattleLog from './BattleLog';[m
 [m
[36m@@ -36,28 +36,4 @@[m [mdescribe('BattleLog', () => {[m
     render(<BattleLog log={log as any} />);[m
     expect(screen.getByText('log.action.shoots')).toBeInTheDocument();[m
   });[m
[31m-[m
[31m-  it('filters entries by category', () => {[m
[31m-    const log = [[m
[31m-      '--- Round 1 ---',[m
[31m-      { key: 'log.action.shoots', params: { attacker: 'Rook' } },[m
[31m-      { key: 'log.info.hit', params: {} },[m
[31m-    ];[m
[31m-[m
[31m-    render(<BattleLog log={log as any} embedded />);[m
[31m-[m
[31m-    expect(screen.getByText('--- Round 1 ---')).toBeInTheDocument();[m
[31m-    expect(screen.getByText('log.action.shoots')).toBeInTheDocument();[m
[31m-    expect(screen.getByText('log.info.hit')).toBeInTheDocument();[m
[31m-[m
[31m-    fireEvent.click(screen.getByText('log.filters.actions'));[m
[31m-    expect(screen.getByText('log.action.shoots')).toBeInTheDocument();[m
[31m-    expect(screen.queryByText('log.info.hit')).toBeNull();[m
[31m-    expect(screen.queryByText('--- Round 1 ---')).toBeNull();[m
[31m-[m
[31m-    fireEvent.click(screen.getByText('log.filters.info'));[m
[31m-    expect(screen.queryByText('log.action.shoots')).toBeNull();[m
[31m-    expect(screen.getByText('log.info.hit')).toBeInTheDocument();[m
[31m-    expect(screen.getByText('--- Round 1 ---')).toBeInTheDocument();[m
[31m-  });[m
 });[m
[1mdiff --git a/components/battle/BattleLog.tsx b/components/battle/BattleLog.tsx[m
[1mindex 46a7a47..3cc5b55 100644[m
[1m--- a/components/battle/BattleLog.tsx[m
[1m+++ b/components/battle/BattleLog.tsx[m
[36m@@ -1,4 +1,4 @@[m
[31m-import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';[m
[32m+[m[32mimport React, { useRef, useEffect, useState } from 'react';[m
 import { useVirtualizer } from '@tanstack/react-virtual';[m
 import { LogEntry, Weapon } from '../../types';[m
 import { useTranslation } from '../../i18n';[m
[36m@@ -41,51 +41,6 @@[m [mconst WeaponTooltipContent: React.FC<{ weapon: Weapon }> = ({ weapon }) => {[m
  */[m
 type BattleLogProps = {[m
   log: (string | LogEntry)[];[m
[31m-  embedded?: boolean;[m
[31m-  heightClassName?: string;[m
[31m-};[m
[31m-[m
[31m-type BattleLogVirtualizedProps = {[m
[31m-  log: (string | LogEntry)[];[m
[31m-  isExpanded: boolean;[m
[31m-  renderLogMessage: (logEntry: string | LogEntry, index: number) => React.ReactNode;[m
[31m-  scrollElement: HTMLDivElement;[m
[31m-};[m
[31m-[m
[31m-const BattleLogVirtualized: React.FC<BattleLogVirtualizedProps> = ({ log, isExpanded, renderLogMessage, scrollElement }) => {[m
[31m-  const rowVirtualizer = useVirtualizer({[m
[31m-    count: log.length,[m
[31m-    getScrollElement: () => scrollElement,[m
[31m-    estimateSize: () => 22,[m
[31m-    overscan: 10,[m
[31m-  });[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (log.length > 0) {[m
[31m-      rowVirtualizer.scrollToIndex(log.length - 1, { align: 'end', behavior: 'auto' });[m
[31m-    }[m
[31m-  }, [log.length, rowVirtualizer, isExpanded]);[m
[31m-[m
[31m-  return ([m
[31m-    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>[m
[31m-      {rowVirtualizer.getVirtualItems().map((virtualItem) => ([m
[31m-        <div[m
[31m-          key={virtualItem.key}[m
[31m-          data-index={virtualItem.index}[m
[31m-          ref={rowVirtualizer.measureElement}[m
[31m-          style={{[m
[31m-            position: 'absolute',[m
[31m-            top: 0,[m
[31m-            left: 0,[m
[31m-            width: '100%',[m
[31m-            transform: `translateY(${virtualItem.start}px)`,[m
[31m-          }}[m
[31m-        >[m
[31m-          {renderLogMessage(log[virtualItem.index], virtualItem.index)}[m
[31m-        </div>[m
[31m-      ))}[m
[31m-    </div>[m
[31m-  );[m
 };[m
 [m
 /**[m
[36m@@ -95,36 +50,27 @@[m [mconst BattleLogVirtualized: React.FC<BattleLogVirtualizedProps> = ({ log, isExpa[m
  * @param {BattleLogProps} props - The component props.[m
  * @returns {React.ReactElement} The rendered battle log.[m
  */[m
[31m-const BattleLog: React.FC<BattleLogProps> = ({ log, embedded = false, heightClassName }) => {[m
[32m+[m[32mconst BattleLog: React.FC<BattleLogProps> = ({ log }) => {[m
   const { t } = useTranslation();[m
   const parentRef = useRef<HTMLDivElement>(null);[m
[31m-  const scrollElementRef = useRef<HTMLDivElement | null>(null);[m
[31m-  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);[m
   const [isExpanded, setIsExpanded] = useState(false);[m
[31m-  const [filter, setFilter] = useState<'all' | 'actions' | 'info'>('all');[m
 [m
   // Get required state from stores[m
   const participants = useBattleStore(state => state.battle?.participants) || [];[m
   const { setSelectedParticipantId } = useBattleStore(state => state.actions);[m
 [m
[31m-  const setParentRef = useCallback((element: HTMLDivElement | null) => {[m
[31m-    parentRef.current = element;[m
[31m-    if (scrollElementRef.current !== element) {[m
[31m-      scrollElementRef.current = element;[m
[31m-      setScrollElement(element);[m
[31m-    }[m
[31m-  }, []);[m
[32m+[m[32m  const rowVirtualizer = useVirtualizer({[m
[32m+[m[32m    count: log.length,[m
[32m+[m[32m    getScrollElement: () => parentRef.current,[m
[32m+[m[32m    estimateSize: () => 22, // Estimated height of a single-line log entry[m
[32m+[m[32m    overscan: 10,[m
[32m+[m[32m  });[m
 [m
[31m-  const filteredLog = useMemo(() => {[m
[31m-    if (filter === 'all') return log;[m
[31m-    return log.filter((entry) => {[m
[31m-      if (typeof entry === 'string') return filter === 'info';[m
[31m-      const key = entry?.key || '';[m
[31m-      const isAction = key.startsWith('log.action.');[m
[31m-      if (filter === 'actions') return isAction;[m
[31m-      return !isAction;[m
[31m-    });[m
[31m-  }, [filter, log]);[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    if (log.length > 0) {[m
[32m+[m[32m      rowVirtualizer.scrollToIndex(log.length - 1, { align: 'end', behavior: 'auto' });[m
[32m+[m[32m    }[m
[32m+[m[32m  }, [log, rowVirtualizer, isExpanded]);[m
 [m
   // Create a memoized map of names to IDs for performance[m
   const nameToIdMap = React.useMemo(() => {[m
[36m@@ -280,48 +226,6 @@[m [mconst BattleLog: React.FC<BattleLogProps> = ({ log, embedded = false, heightClas[m
     );[m
   };[m
 [m
[31m-  const body = ([m
[31m-    <div[m
[31m-      ref={setParentRef}[m
[31m-      className={`flex-grow overflow-y-auto pr-2 text-sm transition-all duration-300 ${heightClassName || (isExpanded ? 'h-96' : 'h-32')}`}[m
[31m-    >[m
[31m-      {scrollElement ? ([m
[31m-        <BattleLogVirtualized log={filteredLog} isExpanded={isExpanded} renderLogMessage={renderLogMessage} scrollElement={scrollElement} />[m
[31m-      ) : null}[m
[31m-    </div>[m
[31m-  );[m
[31m-[m
[31m-  if (embedded) {[m
[31m-    return ([m
[31m-      <div className="flex flex-col gap-2">[m
[31m-        <div className="flex gap-1">[m
[31m-          <button[m
[31m-            type="button"[m
[31m-            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'all' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-            onClick={() => setFilter('all')}[m
[31m-          >[m
[31m-            {t('log.filters.all')}[m
[31m-          </button>[m
[31m-          <button[m
[31m-            type="button"[m
[31m-            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'actions' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-            onClick={() => setFilter('actions')}[m
[31m-          >[m
[31m-            {t('log.filters.actions')}[m
[31m-          </button>[m
[31m-          <button[m
[31m-            type="button"[m
[31m-            className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'info' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-            onClick={() => setFilter('info')}[m
[31m-          >[m
[31m-            {t('log.filters.info')}[m
[31m-          </button>[m
[31m-        </div>[m
[31m-        {body}[m
[31m-      </div>[m
[31m-    );[m
[31m-  }[m
[31m-[m
   return ([m
     <div className={`flex flex-col bg-surface-base/50 rounded-md p-2 mt-auto transition-all duration-300 ${isExpanded ? 'max-h-[30rem]' : 'max-h-48'}`}>[m
       <div className='flex justify-between items-center p-2 border-b border-border mb-2'>[m
[36m@@ -332,30 +236,26 @@[m [mconst BattleLog: React.FC<BattleLogProps> = ({ log, embedded = false, heightClas[m
           </button>[m
         </Tooltip>[m
       </div>[m
[31m-      <div className="flex gap-1 px-2 pb-2">[m
[31m-        <button[m
[31m-          type="button"[m
[31m-          className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'all' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-          onClick={() => setFilter('all')}[m
[31m-        >[m
[31m-          {t('log.filters.all')}[m
[31m-        </button>[m
[31m-        <button[m
[31m-          type="button"[m
[31m-          className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'actions' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-          onClick={() => setFilter('actions')}[m
[31m-        >[m
[31m-          {t('log.filters.actions')}[m
[31m-        </button>[m
[31m-        <button[m
[31m-          type="button"[m
[31m-          className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${filter === 'info' ? 'bg-primary text-text-inverted' : 'bg-secondary hover:bg-secondary/80 text-text-base'}`}[m
[31m-          onClick={() => setFilter('info')}[m
[31m-        >[m
[31m-          {t('log.filters.info')}[m
[31m-        </button>[m
[32m+[m[32m      <div ref={parentRef} className={`flex-grow overflow-y-auto pr-2 text-sm transition-all duration-300 ${isExpanded ? 'h-96' : 'h-32'}`}>[m
[32m+[m[32m        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>[m
[32m+[m[32m          {rowVirtualizer.getVirtualItems().map(virtualItem => ([m
[32m+[m[32m            <div[m
[32m+[m[32m              key={virtualItem.key}[m
[32m+[m[32m              data-index={virtualItem.index}[m
[32m+[m[32m              ref={rowVirtualizer.measureElement}[m
[32m+[m[32m              style={{[m
[32m+[m[32m                position: 'absolute',[m
[32m+[m[32m                top: 0,[m
[32m+[m[32m                left: 0,[m
[32m+[m[32m                width: '100%',[m
[32m+[m[32m                transform: `translateY(${virtualItem.start}px)`,[m
[32m+[m[32m              }}[m
[32m+[m[32m            >[m
[32m+[m[32m              {renderLogMessage(log[virtualItem.index], virtualItem.index)}[m
[32m+[m[32m            </div>[m
[32m+[m[32m          ))}[m
[32m+[m[32m        </div>[m
       </div>[m
[31m-      {body}[m
     </div>[m
   );[m
 };[m
[1mdiff --git a/components/battle/BattleView.test.tsx b/components/battle/BattleView.test.tsx[m
[1mindex cd69b32..69eddf2 100644[m
[1m--- a/components/battle/BattleView.test.tsx[m
[1m+++ b/components/battle/BattleView.test.tsx[m
[36m@@ -1,5 +1,5 @@[m
 import React from 'react';[m
[31m-import { render, screen, fireEvent } from '@testing-library/react';[m
[32m+[m[32mimport { render, screen } from '@testing-library/react';[m
 import { describe, it, expect, vi, beforeEach } from 'vitest';[m
 import BattleView from './BattleView';[m
 import { GameMode } from '@/stores';[m
[36m@@ -7,20 +7,15 @@[m [mimport { GameMode } from '@/stores';[m
 vi.mock('./BattleGrid', () => ({ default: () => <div data-testid="battle-grid" /> }));[m
 vi.mock('./AnimationLayer', () => ({ default: () => <div data-testid="animation-layer" /> }));[m
 vi.mock('./BattleHUD', () => ({ default: () => <div data-testid="battle-hud" /> }));[m
[31m-vi.mock('./BattleHudSettingsModal', () => ({ default: () => <div data-testid="hud-modal" /> }));[m
[31m-vi.mock('./BattleHelpOverlay', () => ({ default: () => <div data-testid="help-overlay" /> }));[m
 vi.mock('../../i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));[m
[31m-vi.mock('@/stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn(), useHudStore: vi.fn() }));[m
[31m-vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: vi.fn() }));[m
[32m+[m[32mvi.mock('../../stores', () => ({ useMultiplayerStore: vi.fn(), useBattleStore: vi.fn() }));[m
 vi.mock('../../hooks/useGameState');[m
 vi.mock('../../hooks/useMultiplayer');[m
[31m-vi.mock('../../hooks/useBattleLogic', () => ({ useBattleLogic: vi.fn(() => ({ uiState: { mode: 'idle' }, handlers: { cancelAction: vi.fn() } })) }));[m
[32m+[m[32mvi.mock('../../hooks/useBattleLogic', () => ({ useBattleLogic: vi.fn(() => ({})) }));[m
 [m
[31m-const { useBattleStore, useHudStore, useMultiplayerStore } = await import('@/stores');[m
[31m-const { useSettingsStore } = await import('@/stores/settingsStore');[m
[32m+[m[32mconst { useBattleStore } = await import('../../stores');[m
 const { useGameState } = await import('../../hooks/useGameState');[m
 const { useMultiplayer } = await import('../../hooks/useMultiplayer');[m
[31m-const { useBattleLogic } = await import('../../hooks/useBattleLogic');[m
 [m
 const mockGameState = (battleOverride: any) => ({[m
     battle: battleOverride ? { participants: [], ...battleOverride } : null,[m
[36m@@ -40,40 +35,7 @@[m [mdescribe('BattleView', () => {[m
     vi.clearAllMocks();[m
     vi.mocked(useMultiplayer).mockReturnValue({ isReconnecting: false, connectionStatus: 'connected', isHost: false, isGuest: false, multiplayerRole: null });[m
     vi.mocked(useGameState).mockReturnValue(mockGameState({ id: 'test-battle', phase: 'quick_actions' }));[m
[31m-    const battleStoreState: any = {[m
[31m-      showEnemyTurnBanner: false,[m
[31m-      animatingParticipantId: null,[m
[31m-      selectedParticipantId: null,[m
[31m-      hoveredParticipantId: null,[m
[31m-      battle: {[m
[31m-        id: 'test-battle',[m
[31m-        phase: 'quick_actions',[m
[31m-        activeParticipantId: 'char1',[m
[31m-        activePlayerRole: null,[m
[31m-        participants: [[m
[31m-          { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },[m
[31m-          { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },[m
[31m-        ],[m
[31m-        mission: { status: 'in_progress', type: 'FightOff' },[m
[31m-        log: [],[m
[31m-      },[m
[31m-      actions: {[m
[31m-        endBattle: vi.fn(),[m
[31m-        setSelectedParticipantId: vi.fn(),[m
[31m-        requestCameraFocusOn: vi.fn(),[m
[31m-        requestCameraReset: vi.fn(),[m
[31m-      },[m
[31m-    };[m
[31m-[m
[31m-    vi.mocked(useBattleStore).mockImplementation((selector: any) => selector(battleStoreState));[m
[31m-    vi.mocked(useMultiplayerStore).mockImplementation((selector: any) => selector({ multiplayerRole: null }));[m
[31m-    vi.mocked(useHudStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        preset: 'full',[m
[31m-        actions: { togglePanel: vi.fn(), toggleCollapsed: vi.fn(), setDensity: vi.fn(), applyPreset: vi.fn(), reset: vi.fn() },[m
[31m-      })[m
[31m-    );[m
[31m-    vi.mocked(useSettingsStore).mockImplementation((selector: any) => selector({ reducedVfx: false }));[m
[32m+[m[32m    vi.mocked(useBattleStore).mockReturnValue({ showEnemyTurnBanner: false, actions: { endBattle: vi.fn(), endTurn: vi.fn() } });[m
   });[m
 [m
   it('renders loading text if battle is not available', () => {[m
[36m@@ -94,117 +56,4 @@[m [mdescribe('BattleView', () => {[m
     render(<BattleView />);[m
     expect(screen.getByText('battle.victory')).toBeInTheDocument();[m
   });[m
[31m-[m
[31m-  it('opens HUD modal on H hotkey', () => {[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: 'h' });[m
[31m-    expect(screen.getByTestId('hud-modal')).toBeInTheDocument();[m
[31m-  });[m
[31m-[m
[31m-  it('opens help overlay on ? hotkey', () => {[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: '?' });[m
[31m-    expect(screen.getByTestId('help-overlay')).toBeInTheDocument();[m
[31m-  });[m
[31m-[m
[31m-  it('calls cancelAction on Escape', () => {[m
[31m-    const cancelAction = vi.fn();[m
[31m-    vi.mocked(useBattleLogic).mockReturnValue({ uiState: { mode: 'move' }, handlers: { cancelAction } } as any);[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: 'Escape' });[m
[31m-    expect(cancelAction).toHaveBeenCalled();[m
[31m-  });[m
[31m-[m
[31m-  it('cycles selected participant on Tab', () => {[m
[31m-    const setSelectedParticipantId = vi.fn();[m
[31m-    vi.mocked(useBattleStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        showEnemyTurnBanner: false,[m
[31m-        animatingParticipantId: null,[m
[31m-        selectedParticipantId: null,[m
[31m-        hoveredParticipantId: null,[m
[31m-        battle: {[m
[31m-          id: 'test-battle',[m
[31m-          phase: 'quick_actions',[m
[31m-          activeParticipantId: 'char1',[m
[31m-          activePlayerRole: null,[m
[31m-          participants: [[m
[31m-            { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },[m
[31m-            { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },[m
[31m-          ],[m
[31m-          mission: { status: 'in_progress', type: 'FightOff' },[m
[31m-          log: [],[m
[31m-        },[m
[31m-        actions: {[m
[31m-          endBattle: vi.fn(),[m
[31m-          setSelectedParticipantId,[m
[31m-          requestCameraFocusOn: vi.fn(),[m
[31m-          requestCameraReset: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: 'Tab' });[m
[31m-    expect(setSelectedParticipantId).toHaveBeenCalledWith('char2');[m
[31m-  });[m
[31m-[m
[31m-  it('cycles selected participant backwards on Shift+Tab', () => {[m
[31m-    const setSelectedParticipantId = vi.fn();[m
[31m-    vi.mocked(useBattleStore).mockImplementation((selector: any) =>[m
[31m-      selector({[m
[31m-        showEnemyTurnBanner: false,[m
[31m-        animatingParticipantId: null,[m
[31m-        selectedParticipantId: null,[m
[31m-        hoveredParticipantId: null,[m
[31m-        battle: {[m
[31m-          id: 'test-battle',[m
[31m-          phase: 'quick_actions',[m
[31m-          activeParticipantId: 'char1',[m
[31m-          activePlayerRole: null,[m
[31m-          participants: [[m
[31m-            { id: 'char1', type: 'character', name: 'Rook', position: { x: 0, y: 0 }, status: 'active' },[m
[31m-            { id: 'char2', type: 'character', name: 'Vale', position: { x: 1, y: 0 }, status: 'active' },[m
[31m-          ],[m
[31m-          mission: { status: 'in_progress', type: 'FightOff' },[m
[31m-          log: [],[m
[31m-        },[m
[31m-        actions: {[m
[31m-          endBattle: vi.fn(),[m
[31m-          setSelectedParticipantId,[m
[31m-          requestCameraFocusOn: vi.fn(),[m
[31m-          requestCameraReset: vi.fn(),[m
[31m-        },[m
[31m-      })[m
[31m-    );[m
[31m-[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });[m
[31m-    expect(setSelectedParticipantId).toHaveBeenCalledWith('char2');[m
[31m-  });[m
[31m-[m
[31m-  it('does not trigger panel hotkeys while a modal is open', () => {[m
[31m-    const togglePanel = vi.fn();[m
[31m-    vi.mocked(useHudStore).mockImplementation((selector: any) =>[m
[31m-      selector({ preset: 'full', actions: { togglePanel, applyPreset: vi.fn() } })[m
[31m-    );[m
[31m-    const dialog = document.createElement('div');[m
[31m-    dialog.setAttribute('role', 'dialog');[m
[31m-    dialog.setAttribute('aria-modal', 'true');[m
[31m-    document.body.appendChild(dialog);[m
[31m-[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.keyDown(window, { key: 'l' });[m
[31m-    expect(togglePanel).not.toHaveBeenCalled();[m
[31m-[m
[31m-    document.body.removeChild(dialog);[m
[31m-  });[m
[31m-[m
[31m-  it('cancels action on right click while not idle', () => {[m
[31m-    const cancelAction = vi.fn();[m
[31m-    vi.mocked(useBattleLogic).mockReturnValue({ uiState: { mode: 'move' }, handlers: { cancelAction } } as any);[m
[31m-    render(<BattleView />);[m
[31m-    fireEvent.contextMenu(screen.getByTestId('battlefield'));[m
[31m-    expect(cancelAction).toHaveBeenCalled();[m
[31m-  });[m
[31m-});[m
[32m+[m[32m});[m
\ No newline at end of file[m
[1mdiff --git a/components/battle/BattleView.tsx b/components/battle/BattleView.tsx[m
[1mindex 8e566b3..48de145 100644[m
[1m--- a/components/battle/BattleView.tsx[m
[1m+++ b/components/battle/BattleView.tsx[m
[36m@@ -1,11 +1,11 @@[m
[31m-import { lazy, Suspense, useRef, useState } from 'react';[m
[32m+[m[32mimport { lazy, Suspense, useRef } from 'react';[m
 import Card from '../ui/Card';[m
 import { useTranslation } from '../../i18n';[m
 import BattleGrid from './BattleGrid';[m
 import AnimationLayer from './AnimationLayer';[m
 import BattleHUD from './BattleHUD';[m
[31m-import { useBattleStore } from '@/stores';[m
[31m-import { Loader, SlidersHorizontal } from 'lucide-react';[m
[32m+[m[32mimport { useBattleStore } from '../../stores';[m
[32m+[m[32mimport { Loader } from 'lucide-react';[m
 import { useGameState } from '../../hooks/useGameState';[m
 import { useMultiplayer } from '../../hooks/useMultiplayer';[m
 import { useBattleLogic } from '../../hooks/useBattleLogic';[m
[36m@@ -14,12 +14,8 @@[m [mimport { useLocalStorage } from '../../hooks/useLocalStorage';[m
 import ViewModeToggle from './ViewModeToggle';[m
 import BattleLoadingScreen from './BattleLoadingScreen';[m
 import Button from '../ui/Button';[m
[31m-import BattleHudSettingsModal from './BattleHudSettingsModal';[m
[31m-import { useBattleHotkeys } from '@/hooks/battle/useBattleHotkeys';[m
[31m-import BattleHelpOverlay from './BattleHelpOverlay';[m
[31m-import { useSettingsStore } from '@/stores/settingsStore';[m
[31m-import { useHudStore } from '@/stores';[m
[31m-import { useShallow } from 'zustand/react/shallow';[m
[32m+[m[32mimport { useBattleEventConsumer } from '@/src/hooks/battle/useBattleEventConsumer';[m
[32m+[m[32mimport { EngineDevTools } from '@/src/components/debug/EngineDevTools';[m
 [m
 const BattleView3D = lazy(() => import('./BattleView3D'));[m
 [m
[36m@@ -42,52 +38,14 @@[m [mconst BattleView = () => {[m
   [m
   const battleLogic = useBattleLogic();[m
   useBattleAutomations(scrollContainerRef);[m
[32m+[m[32m  useBattleEventConsumer();[m
   const [is3D, setIs3D] = useLocalStorage('battleViewMode', false);[m
[31m-  const [isHudModalOpen, setHudModalOpen] = useState(false);[m
[31m-  const [isHelpOpen, setHelpOpen] = useState(false);[m
[31m-  const { reducedVfx } = useSettingsStore(useShallow((s) => ({ reducedVfx: s.reducedVfx })));[m
[31m-  const { hudPreset, applyHudPreset } = useHudStore([m
[31m-    useShallow((s) => ({[m
[31m-      hudPreset: s.preset,[m
[31m-      applyHudPreset: s.actions.applyPreset,[m
[31m-    }))[m
[31m-  );[m
[32m+[m[32m  const [is3DMinimalUI, setIs3DMinimalUI] = useLocalStorage('battle3dMinimalUI', false);[m
 [m
   if (!battle) {[m
     return <div>Loading battle...</div>;[m
   }[m
 [m
[31m-  useBattleHotkeys({[m
[31m-    battleLogic,[m
[31m-    is3D,[m
[31m-    toggleHudModal: () => setHudModalOpen((v) => !v),[m
[31m-    toggleHelp: () => setHelpOpen((v) => !v),[m
[31m-  });[m
[31m-[m
[31m-  const cycleHudPreset = () => {[m
[31m-    const order = ['full', 'tactical', 'minimal'] as const;[m
[31m-    const idx = order.indexOf(hudPreset as any);[m
[31m-    const next = idx === -1 ? order[0] : order[(idx + 1) % order.length];[m
[31m-    applyHudPreset(next);[m
[31m-  };[m
[31m-[m
[31m-  const hudPresetLabel =[m
[31m-    hudPreset === 'full'[m
[31m-      ? t('battle.hud.presetFull')[m
[31m-      : hudPreset === 'tactical'[m
[31m-        ? t('battle.hud.presetTactical')[m
[31m-        : hudPreset === 'minimal'[m
[31m-          ? t('battle.hud.presetMinimal')[m
[31m-          : hudPreset === 'spectator'[m
[31m-            ? t('battle.hud.presetSpectator')[m
[31m-            : t('battle.hud.presetCustom');[m
[31m-[m
[31m-  const onBattlefieldContextMenu = (e: any) => {[m
[31m-    e.preventDefault();[m
[31m-    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;[m
[31m-    if (battleLogic.uiState.mode !== 'idle') battleLogic.handlers.cancelAction();[m
[31m-  };[m
[31m-[m
   const BattleEndScreen = () => {[m
     if (battle.phase !== 'battle_over' || (battle.mission.status !== 'success' && battle.mission.status !== 'failure')) {[m
       return null;[m
[36m@@ -124,14 +82,16 @@[m [mconst BattleView = () => {[m
       )}[m
 [m
       <div className="flex items-center justify-end px-2 py-2">[m
[31m-        <Button className="mr-2 px-3 py-1 text-sm" onClick={() => setHudModalOpen(true)}>[m
[31m-          <SlidersHorizontal className="w-4 h-4" />[m
[31m-          HUD[m
[31m-        </Button>[m
         <ViewModeToggle is3D={is3D} setIs3D={setIs3D} disabled={isAnimating} />[m
[31m-        <Button className="ml-2 px-3 py-1 text-sm" onClick={() => cycleHudPreset()}>[m
[31m-          UI: {hudPresetLabel}[m
[31m-        </Button>[m
[32m+[m[32m        {is3D && ([m
[32m+[m[32m          <Button[m
[32m+[m[32m            className="ml-2 px-3 py-1 text-sm"[m
[32m+[m[32m            selected={is3DMinimalUI}[m
[32m+[m[32m            onClick={() => setIs3DMinimalUI(!is3DMinimalUI)}[m
[32m+[m[32m          >[m
[32m+[m[32m            UI[m
[32m+[m[32m          </Button>[m
[32m+[m[32m        )}[m
       </div>[m
 [m
       <div[m
[36m@@ -141,8 +101,6 @@[m [mconst BattleView = () => {[m
         <div[m
           ref={gridContainerRef}[m
           className={is3D ? 'relative w-full h-full min-h-[520px]' : 'relative inline-block min-w-full'}[m
[31m-          data-testid="battlefield"[m
[31m-          onContextMenu={onBattlefieldContextMenu}[m
         >[m
           {is3D ? ([m
             <Suspense fallback={<BattleLoadingScreen />}>[m
[36m@@ -154,32 +112,15 @@[m [mconst BattleView = () => {[m
               <AnimationLayer gridRef={gridContainerRef} />[m
             </>[m
           )}[m
[31m-          {is3D && !isHelpOpen && ([m
[31m-            <div[m
[31m-              className={`absolute bottom-3 left-3 pointer-events-none z-10 text-xs text-text-base bg-surface-overlay/70 ${reducedVfx ? '' : 'backdrop-blur-sm'} border border-border rounded-md px-2 py-1`}[m
[31m-            >[m
[31m-              {t('battle.help.miniHint')}[m
[31m-            </div>[m
[31m-          )}[m
         </div>[m
       </div>[m
 [m
       <div className="lg:absolute lg:inset-0 lg:pointer-events-none">[m
[31m-        <BattleHUD battleLogic={battleLogic} />[m
[32m+[m[32m        <BattleHUD battleLogic={battleLogic} uiMode={is3D && is3DMinimalUI ? 'minimal' : 'full'} />[m
       </div>[m
 [m
[31m-      {isHudModalOpen && ([m
[31m-        <BattleHudSettingsModal[m
[31m-          onClose={() => setHudModalOpen(false)}[m
[31m-          onOpenHelp={() => {[m
[31m-            setHudModalOpen(false);[m
[31m-            setHelpOpen(true);[m
[31m-          }}[m
[31m-          is3D={is3D}[m
[31m-        />[m
[31m-      )}[m
[31m-      {isHelpOpen && <BattleHelpOverlay onClose={() => setHelpOpen(false)} is3D={is3D} />}[m
       {battle.phase === 'battle_over' && <BattleEndScreen />}[m
[32m+[m[32m      <EngineDevTools />[m
     </div>[m
   );[m
 };[m
[1mdiff --git a/components/battle/BattleView3D.tsx b/components/battle/BattleView3D.tsx[m
[1mindex cbce109..6e470b5 100644[m
[1m--- a/components/battle/BattleView3D.tsx[m
[1m+++ b/components/battle/BattleView3D.tsx[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { useCallback, useMemo } from 'react';[m
[32m+[m[32mimport { useCallback, useEffect, useMemo } from 'react';[m
 import { useBattleStore } from '@/stores';[m
 import type { BattleLogic } from '@/hooks/useBattleLogic';[m
 import type { Position } from '@/types/battle';[m
[36m@@ -13,9 +13,8 @@[m [mimport { ThreeCanvas } from './three/ThreeCanvas';[m
 import { AnimationSystem3D } from './three/AnimationSystem3D';[m
 import { ParticipantMeshProvider } from './three/contexts/ParticipantMeshContext';[m
 import { TerrainMeshProvider } from './three/contexts/TerrainMeshContext';[m
[32m+[m[32mimport Button from '../ui/Button';[m
 import { CameraCommands3D } from './three/CameraCommands3D';[m
[31m-import { AimingLine3D } from './three/AimingLine3D';[m
[31m-import { TargetTooltip3D } from './three/TargetTooltip3D';[m
 [m
 interface BattleView3DProps {[m
   battleLogic: BattleLogic;[m
[36m@@ -27,9 +26,7 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
   const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);[m
   const animatingParticipantId = useBattleStore((s) => s.animatingParticipantId);[m
   const hoveredParticipantId = useBattleStore((s) => s.hoveredParticipantId);[m
[31m-  const inspectLockedParticipantId = useBattleStore((s) => s.inspectLockedParticipantId);[m
[31m-  const inspectLockedTile = useBattleStore((s) => s.inspectLockedTile);[m
[31m-  const { setSelectedParticipantId, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer } = useBattleStore((s) => s.actions);[m
[32m+[m[32m  const { setSelectedParticipantId, setHoveredParticipantId, requestCameraFocusOn, requestCameraReset } = useBattleStore((s) => s.actions);[m
 [m
   const participantsByPosition = useMemo(() => {[m
     const map = new Map<string, string>();[m
[36m@@ -51,47 +48,9 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
     return result;[m
   }, [battleLogic.derivedData.reachableCells]);[m
 [m
[31m-  const coverMovePositions = useMemo(() => {[m
[31m-    const cover = battleLogic.derivedData.coverStatus;[m
[31m-    if (!cover || cover.size === 0) return [];[m
[31m-    const result: Position[] = [];[m
[31m-    for (const [posKey, providesCover] of cover.entries()) {[m
[31m-      if (!providesCover) continue;[m
[31m-      const [xStr, yStr] = posKey.split(',');[m
[31m-      result.push({ x: Number(xStr), y: Number(yStr) });[m
[31m-    }[m
[31m-    return result;[m
[31m-  }, [battleLogic.derivedData.coverStatus]);[m
[31m-[m
[31m-  const coverArrows = useMemo(() => {[m
[31m-    const dirs = battleLogic.derivedData.coverDirections as Map<string, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }> | undefined;[m
[31m-    if (!dirs || dirs.size === 0) return [];[m
[31m-    const result: { pos: Position; angle: number }[] = [];[m
[31m-    for (const [posKey, dir] of dirs.entries()) {[m
[31m-      const [xStr, yStr] = posKey.split(',');[m
[31m-      const pos = { x: Number(xStr), y: Number(yStr) };[m
[31m-      const angle = Math.atan2(dir.dx, dir.dy);[m
[31m-      result.push({ pos, angle });[m
[31m-    }[m
[31m-    return result;[m
[31m-  }, [battleLogic.derivedData.coverDirections]);[m
[31m-[m
[31m-  const hoveredPath = useMemo(() => {[m
[31m-    return battleLogic.derivedData.hoveredPath ?? null;[m
[31m-  }, [battleLogic.derivedData.hoveredPath]);[m
[31m-[m
[31m-  const validShootTargetIds = battleLogic.derivedData.validShootTargetIds;[m
[31m-  const attacker = battleLogic.characterPerformingAction;[m
[31m-  const aimTarget = useMemo(() => {[m
[31m-    if (!battle || battleLogic.uiState.mode !== 'shoot' || !hoveredParticipantId) return null;[m
[31m-    return battle.participants.find((p) => p.id === hoveredParticipantId) ?? null;[m
[31m-  }, [battle, battleLogic.uiState.mode, hoveredParticipantId]);[m
[31m-  const isAimTargetValid = aimTarget ? validShootTargetIds.has(aimTarget.id) : false;[m
[31m-[m
   const onCellHover = useCallback([m
     (pos: Position | null) => {[m
       battleLogic.handlers.setHoveredPos(pos);[m
[31m-      if (inspectLockedParticipantId || inspectLockedTile) return;[m
       if (pos) {[m
         const participantId = participantsByPosition.get(`${pos.x},${pos.y}`) ?? null;[m
         setHoveredParticipantId(participantId);[m
[36m@@ -99,18 +58,11 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
         setHoveredParticipantId(null);[m
       }[m
     },[m
[31m-    [battleLogic.handlers, inspectLockedParticipantId, inspectLockedTile, participantsByPosition, setHoveredParticipantId][m
[32m+[m[32m    [battleLogic.handlers, participantsByPosition, setHoveredParticipantId][m
   );[m
 [m
   const onCellClick = useCallback([m
     (pos: Position) => {[m
[31m-      if (inspectLockedParticipantId) {[m
[31m-        setInspectLockedParticipantId(null);[m
[31m-        setHoveredParticipantId(null);[m
[31m-        setInspectLockedPointer(null);[m
[31m-      }[m
[31m-      setInspectLockedTile(null);[m
[31m-      setInspectLockedTilePointer(null);[m
       if (battleLogic.uiState.mode !== 'idle') {[m
         battleLogic.handlers.handleGridClick(pos);[m
         return;[m
[36m@@ -120,30 +72,13 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
       if (participantId) {[m
         setSelectedParticipantId(participantId);[m
         battleLogic.handlers.cancelAction();[m
[31m-      } else {[m
[31m-        setSelectedParticipantId(null);[m
       }[m
     },[m
[31m-    [battleLogic.handlers, battleLogic.uiState.mode, inspectLockedParticipantId, participantsByPosition, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer, setSelectedParticipantId][m
[31m-  );[m
[31m-[m
[31m-  const onCellInspect = useCallback([m
[31m-    (pos: Position, screen: { x: number; y: number }) => {[m
[31m-      setInspectLockedTile(pos);[m
[31m-      setInspectLockedTilePointer(screen);[m
[31m-    },[m
[31m-    [setInspectLockedTile, setInspectLockedTilePointer][m
[32m+[m[32m    [battleLogic.handlers, battleLogic.uiState.mode, participantsByPosition, setSelectedParticipantId][m
   );[m
 [m
   const onUnitClick = useCallback([m
     (id: string, pos: Position) => {[m
[31m-      if (inspectLockedParticipantId) {[m
[31m-        setInspectLockedParticipantId(null);[m
[31m-        setHoveredParticipantId(null);[m
[31m-        setInspectLockedPointer(null);[m
[31m-      }[m
[31m-      setInspectLockedTile(null);[m
[31m-      setInspectLockedTilePointer(null);[m
       if (battleLogic.uiState.mode !== 'idle') {[m
         battleLogic.handlers.handleGridClick(pos);[m
         return;[m
[36m@@ -151,19 +86,7 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
       setSelectedParticipantId(id);[m
       battleLogic.handlers.cancelAction();[m
     },[m
[31m-    [battleLogic.handlers, battleLogic.uiState.mode, inspectLockedParticipantId, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer, setSelectedParticipantId][m
[31m-  );[m
[31m-[m
[31m-  const onUnitInspect = useCallback([m
[31m-    (id: string, pos: Position, screen: { x: number; y: number }) => {[m
[31m-      setInspectLockedTile(null);[m
[31m-      setInspectLockedTilePointer(null);[m
[31m-      setInspectLockedParticipantId(id);[m
[31m-      setInspectLockedPointer(screen);[m
[31m-      battleLogic.handlers.setHoveredPos(pos);[m
[31m-      setHoveredParticipantId(id);[m
[31m-    },[m
[31m-    [battleLogic.handlers, setHoveredParticipantId, setInspectLockedParticipantId, setInspectLockedPointer, setInspectLockedTile, setInspectLockedTilePointer][m
[32m+[m[32m    [battleLogic.handlers, battleLogic.uiState.mode, setSelectedParticipantId][m
   );[m
 [m
   const battleView3D = useMemo(() => {[m
[36m@@ -174,59 +97,60 @@[m [mconst BattleView3D = ({ battleLogic }: BattleView3DProps) => {[m
   if (!battleView3D) return null;[m
 [m
   const { gridSize, terrain, units } = battleView3D;[m
[32m+[m[32m  const focusSelectedOrActive = useCallback(() => {[m
[32m+[m[32m    if (!battle) return;[m
[32m+[m[32m    const selected = selectedParticipantId ? battle.participants.find((p) => p.id === selectedParticipantId) : null;[m
[32m+[m[32m    const active = activeParticipantId ? battle.participants.find((p) => p.id === activeParticipantId) : null;[m
[32m+[m[32m    const target = selected ?? active;[m
[32m+[m[32m    if (!target) return;[m
[32m+[m[32m    requestCameraFocusOn(target.position);[m
[32m+[m[32m  }, [activeParticipantId, battle, requestCameraFocusOn, selectedParticipantId]);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const onKeyDown = (e: KeyboardEvent) => {[m
[32m+[m[32m      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();[m
[32m+[m[32m      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;[m
[32m+[m[32m      if (e.key === 'r' || e.key === 'R') requestCameraReset();[m
[32m+[m[32m      if (e.key === 'f' || e.key === 'F') focusSelectedOrActive();[m
[32m+[m[32m    };[m
[32m+[m[32m    window.addEventListener('keydown', onKeyDown);[m
[32m+[m[32m    return () => window.removeEventListener('keydown', onKeyDown);[m
[32m+[m[32m  }, [focusSelectedOrActive, requestCameraReset]);[m
 [m
   return ([m
     <div className="relative w-full h-full">[m
[32m+[m[32m      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">[m
[32m+[m[32m        <div className="pointer-events-none rounded bg-surface-base/60 px-2 py-1 text-xs text-text-muted backdrop-blur-sm">[m
[32m+[m[32m          ЛКМ: вращать • Колесо: зум • ПКМ: панорама • F: фокус • R: сброс[m
[32m+[m[32m        </div>[m
[32m+[m[32m        <div className="flex gap-2 pointer-events-auto">[m
[32m+[m[32m          <Button className="px-3 py-1 text-sm" onClick={focusSelectedOrActive}>[m
[32m+[m[32m            Фокус[m
[32m+[m[32m          </Button>[m
[32m+[m[32m          <Button className="px-3 py-1 text-sm" onClick={() => requestCameraReset()}>[m
[32m+[m[32m            Сброс[m
[32m+[m[32m          </Button>[m
[32m+[m[32m        </div>[m
[32m+[m[32m      </div>[m
       <TerrainMeshProvider>[m
         <ParticipantMeshProvider>[m
           <ThreeCanvas gridSize={gridSize}>[m
             <GridFloor gridSize={gridSize} />[m
             <CameraCommands3D gridSize={gridSize} />[m
 [m
[31m-            {battle && attacker && battleLogic.uiState.mode === 'shoot' && ([m
[31m-              <AimingLine3D battle={battle as any} attacker={attacker as any} target={aimTarget as any} />[m
[31m-            )}[m
[31m-            {battle &&[m
[31m-              attacker &&[m
[31m-              battleLogic.uiState.mode === 'shoot' &&[m
[31m-              aimTarget &&[m
[31m-              isAimTargetValid &&[m
[31m-              battleLogic.uiState.weaponInstanceId && ([m
[31m-                <TargetTooltip3D[m
[31m-                  battle={battle as any}[m
[31m-                  attacker={attacker as any}[m
[31m-                  target={aimTarget as any}[m
[31m-                  weaponInstanceId={battleLogic.uiState.weaponInstanceId}[m
[31m-                />[m
[31m-              )}[m
[31m-[m
             {terrain.map((t) => ([m
               <TerrainMesh key={t.id} terrain={t} gridSize={gridSize} />[m
             ))}[m
 [m
             {units.map((u) => ([m
[31m-              <ParticipantMesh[m
[31m-                key={u.id}[m
[31m-                unit={u}[m
[31m-                gridSize={gridSize}[m
[31m-                onClick={onUnitClick}[m
[31m-                onInspect={onUnitInspect}[m
[31m-                onHover={onCellHover}[m
[31m-                isValidTarget={validShootTargetIds.has(u.id)}[m
[31m-              />[m
[32m+[m[32m              <ParticipantMesh key={u.id} unit={u} gridSize={gridSize} onClick={onUnitClick} onHover={onCellHover} />[m
             ))}[m
 [m
[31m-            <MoveHighlights[m
[31m-              positions={availableMoves}[m
[31m-              coverPositions={coverMovePositions}[m
[31m-              coverArrows={coverArrows}[m
[31m-              pathPositions={hoveredPath}[m
[31m-              gridSize={gridSize}[m
[31m-            />[m
[32m+[m[32m            <MoveHighlights positions={availableMoves} gridSize={gridSize} />[m
             <HPBars3D units={units} gridSize={gridSize} />[m
             <AnimationSystem3D gridSize={gridSize} />[m
 [m
[31m-            <RaycastController gridSize={gridSize} onCellHover={onCellHover} onCellClick={onCellClick} onCellInspect={onCellInspect} />[m
[32m+[m[32m            <RaycastController gridSize={gridSize} onCellHover={onCellHover} onCellClick={onCellClick} />[m
           </ThreeCanvas>[m
         </ParticipantMeshProvider>[m
       </TerrainMeshProvider>[m
[1mdiff --git a/components/battle/CharacterStatus.test.tsx b/components/battle/CharacterStatus.test.tsx[m
[1mindex 498394d..4a4c22f 100644[m
[1m--- a/components/battle/CharacterStatus.test.tsx[m
[1m+++ b/components/battle/CharacterStatus.test.tsx[m
[36m@@ -37,7 +37,7 @@[m [mdescribe('CharacterStatus', () => {[m
 [m
   it('displays the correct number of action icons', () => {[m
     render(<CharacterStatus participant={mockParticipant} />);[m
[31m-    const iconsContainer = screen.getByText('battle.hud.actions').nextElementSibling;[m
[32m+[m[32m    const iconsContainer = screen.getByText('Actions:').nextElementSibling;[m
     expect(iconsContainer!.querySelectorAll('svg')).toHaveLength(2);[m
     expect(iconsContainer!.querySelectorAll('.text-warning.fill-current')).toHaveLength(1);[m
   });[m
[1mdiff --git a/components/battle/CharacterStatus.tsx b/components/battle/CharacterStatus.tsx[m
[1mindex 71d4272..472856a 100644[m
[1m--- a/components/battle/CharacterStatus.tsx[m
[1m+++ b/components/battle/CharacterStatus.tsx[m
[36m@@ -5,15 +5,12 @@[m [mimport { Heart, Shield, Zap, Crosshair } from 'lucide-react';[m
 import { sanitizeToText } from '@/services/utils/sanitization';[m
 import { getWeaponById } from '@/services/data/items';[m
 import { useBattleInteractionState } from '@/hooks/battle/useBattleInteractionState';[m
[31m-import { HudDensity } from '@/stores';[m
 [m
 interface CharacterStatusProps {[m
   participant: BattleParticipant;[m
[31m-  embedded?: boolean;[m
[31m-  density?: HudDensity;[m
 }[m
 [m
[31m-const CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded = false, density = 'normal' }) => {[m
[32m+[m[32mconst CharacterStatus: React.FC<CharacterStatusProps> = ({ participant }) => {[m
   const { t } = useTranslation();[m
   const { rangeDisplayWeaponInstanceId, setRangeDisplayWeapon } = useBattleInteractionState();[m
 [m
[36m@@ -21,8 +18,8 @@[m [mconst CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded[m
 [m
   let name = participant.type === 'character' ? sanitizeToText(participant.name) : t(`enemies.${participant.name.split(' #')[0]}`) + ` #${participant.name.split(' #')[1]}`;[m
 [m
[31m-  const content = ([m
[31m-    <div className={`${embedded ? '' : 'bg-surface-raised/80 backdrop-blur-sm p-3 rounded-lg border border-border/50 w-full animate-slide-up shadow-lg'}`}>[m
[32m+[m[32m  return ([m
[32m+[m[32m    <div className='bg-surface-raised/80 backdrop-blur-sm p-3 rounded-lg border border-border/50 w-full animate-slide-up shadow-lg'>[m
       <div className='text-center'>[m
         <img src={participant.portraitUrl} alt={name} className='w-16 h-16 rounded-full mx-auto mb-2 border-2 border-border object-cover shadow-md' />[m
         <h4 className={`font-bold text-lg font-orbitron truncate ${isOpponent ? 'text-danger' : 'text-primary'}`}>{name}</h4>[m
[36m@@ -39,7 +36,7 @@[m [mconst CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded[m
           )}[m
         </div>[m
         <div className='flex items-center justify-center gap-2 mt-3'>[m
[31m-          <span className='text-xs text-text-muted uppercase font-bold'>{t('battle.hud.actions')}</span>[m
[32m+[m[32m          <span className='text-xs text-text-muted uppercase font-bold'>Actions:</span>[m
           <div className='flex gap-1.5'>[m
             {[...Array(participant.actionsRemaining)].map((_, i) => ([m
               <Zap key={i} size={18} className='text-warning fill-current' />[m
[36m@@ -51,7 +48,7 @@[m [mconst CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded[m
         </div>[m
       </div>[m
       <div className='mt-3 pt-3 border-t border-border/50'>[m
[31m-        <h5 className='text-xs text-text-muted uppercase font-bold mb-2 text-left'>{t('battle.hud.weapons')}</h5>[m
[32m+[m[32m        <h5 className='text-xs text-text-muted uppercase font-bold mb-2 text-left'>Weapons</h5>[m
         <div className='space-y-1'>[m
           {(participant.weapons || []).map(cw => {[m
             const weapon = getWeaponById(cw.weaponId);[m
[36m@@ -80,10 +77,6 @@[m [mconst CharacterStatus: React.FC<CharacterStatusProps> = ({ participant, embedded[m
       </div>[m
     </div>[m
   );[m
[31m-[m
[31m-  if (!embedded) return content;[m
[31m-[m
[31m-  return <div className={`${density === 'compact' ? 'text-sm' : ''}`}>{content}</div>;[m
 };[m
 [m
 export default CharacterStatus;[m
[1mdiff --git a/components/battle/FloatingTargetInspector.tsx b/components/battle/FloatingTargetInspector.tsx[m
[1mdeleted file mode 100644[m
[1mindex 9e94a60..0000000[m
[1m--- a/components/battle/FloatingTargetInspector.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,66 +0,0 @@[m
[31m-import React, { useEffect, useRef } from 'react';[m
[31m-import type { BattleParticipant } from '@/types';[m
[31m-import TargetInspector from './TargetInspector';[m
[31m-[m
[31m-type FloatingTargetInspectorProps = {[m
[31m-  participant: BattleParticipant;[m
[31m-  pinned?: boolean;[m
[31m-  pinnedPosition?: { x: number; y: number } | null;[m
[31m-  offsetX?: number;[m
[31m-  offsetY?: number;[m
[31m-};[m
[31m-[m
[31m-const FloatingTargetInspector: React.FC<FloatingTargetInspectorProps> = ({[m
[31m-  participant,[m
[31m-  pinned,[m
[31m-  pinnedPosition,[m
[31m-  offsetX = 20,[m
[31m-  offsetY = 20,[m
[31m-}) => {[m
[31m-  const containerRef = useRef<HTMLDivElement>(null);[m
[31m-  const rafRef = useRef<number | null>(null);[m
[31m-  const lastXRef = useRef(0);[m
[31m-  const lastYRef = useRef(0);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    const el = containerRef.current;[m
[31m-    if (!el) return;[m
[31m-[m
[31m-    if (pinned && pinnedPosition) {[m
[31m-      el.style.transform = `translate3d(${pinnedPosition.x + offsetX}px, ${pinnedPosition.y + offsetY}px, 0)`;[m
[31m-      return;[m
[31m-    }[m
[31m-[m
[31m-    const updatePosition = () => {[m
[31m-      rafRef.current = null;[m
[31m-      el.style.transform = `translate3d(${lastXRef.current + offsetX}px, ${lastYRef.current + offsetY}px, 0)`;[m
[31m-    };[m
[31m-[m
[31m-    const onPointerMove = (event: PointerEvent) => {[m
[31m-      lastXRef.current = event.clientX;[m
[31m-      lastYRef.current = event.clientY;[m
[31m-      if (rafRef.current != null) return;[m
[31m-      rafRef.current = window.requestAnimationFrame(updatePosition);[m
[31m-    };[m
[31m-[m
[31m-    window.addEventListener('pointermove', onPointerMove, { passive: true });[m
[31m-[m
[31m-    return () => {[m
[31m-      window.removeEventListener('pointermove', onPointerMove);[m
[31m-      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);[m
[31m-      rafRef.current = null;[m
[31m-    };[m
[31m-  }, [offsetX, offsetY, pinned, pinnedPosition]);[m
[31m-[m
[31m-  return ([m
[31m-    <div[m
[31m-      ref={containerRef}[m
[31m-      className="fixed pointer-events-none z-50 will-change-transform"[m
[31m-      style={{ top: 0, left: 0, transform: 'translate3d(-9999px, -9999px, 0)' }}[m
[31m-    >[m
[31m-      <TargetInspector participant={participant} pinned={pinned} />[m
[31m-    </div>[m
[31m-  );[m
[31m-};[m
[31m-[m
[31m-export default FloatingTargetInspector;[m
[1mdiff --git a/components/battle/FloatingTileInspector.tsx b/components/battle/FloatingTileInspector.tsx[m
[1mdeleted file mode 100644[m
[1mindex a5c4d5c..0000000[m
[1m--- a/components/battle/FloatingTileInspector.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,47 +0,0 @@[m
[31m-import React, { useEffect, useRef } from 'react';[m
[31m-import type { BattleParticipant } from '@/types';[m
[31m-import type { Position, Terrain } from '@/types/battle';[m
[31m-import TileInspector from './TileInspector';[m
[31m-[m
[31m-type FloatingTileInspectorProps = {[m
[31m-  pos: Position;[m
[31m-  terrain: Terrain | null;[m
[31m-  occupiedBy: BattleParticipant | null;[m
[31m-  isReachable: boolean;[m
[31m-  isCoverSpot: boolean;[m
[31m-  pinnedPosition: { x: number; y: number } | null;[m
[31m-  offsetX?: number;[m
[31m-  offsetY?: number;[m
[31m-};[m
[31m-[m
[31m-const FloatingTileInspector: React.FC<FloatingTileInspectorProps> = ({[m
[31m-  pos,[m
[31m-  terrain,[m
[31m-  occupiedBy,[m
[31m-  isReachable,[m
[31m-  isCoverSpot,[m
[31m-  pinnedPosition,[m
[31m-  offsetX = 20,[m
[31m-  offsetY = 20,[m
[31m-}) => {[m
[31m-  const containerRef = useRef<HTMLDivElement>(null);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    const el = containerRef.current;[m
[31m-    if (!el) return;[m
[31m-    if (!pinnedPosition) {[m
[31m-      el.style.transform = 'translate3d(-9999px, -9999px, 0)';[m
[31m-      return;[m
[31m-    }[m
[31m-    el.style.transform = `translate3d(${pinnedPosition.x + offsetX}px, ${pinnedPosition.y + offsetY}px, 0)`;[m
[31m-  }, [offsetX, offsetY, pinnedPosition]);[m
[31m-[m
[31m-  return ([m
[31m-    <div ref={containerRef} className="fixed pointer-events-none z-50 will-change-transform" style={{ top: 0, left: 0 }}>[m
[31m-      <TileInspector pos={pos} terrain={terrain} occupiedBy={occupiedBy} isReachable={isReachable} isCoverSpot={isCoverSpot} />[m
[31m-    </div>[m
[31m-  );[m
[31m-};[m
[31m-[m
[31m-export default FloatingTileInspector;[m
[31m-[m
[1mdiff --git a/components/battle/MissionPanel.tsx b/components/battle/MissionPanel.tsx[m
[1mindex 8a38963..8a45132 100644[m
[1m--- a/components/battle/MissionPanel.tsx[m
[1m+++ b/components/battle/MissionPanel.tsx[m
[36m@@ -12,7 +12,6 @@[m [mimport { useBattleStore } from '../../stores';[m
  */[m
 interface MissionPanelProps {[m
   mission: Mission;[m
[31m-  embedded?: boolean;[m
 }[m
 [m
 /**[m
[36m@@ -20,7 +19,7 @@[m [minterface MissionPanelProps {[m
  * @param {MissionPanelProps} props - The component props.[m
  * @returns {React.ReactElement} The rendered mission panel.[m
  */[m
[31m-const MissionPanel: React.FC<MissionPanelProps> = ({ mission, embedded = false }) => {[m
[32m+[m[32mconst MissionPanel: React.FC<MissionPanelProps> = ({ mission }) => {[m
   const { t } = useTranslation();[m
   const deploymentCondition = useBattleStore(state => state.battle?.deploymentCondition);[m
 [m
[36m@@ -53,8 +52,8 @@[m [mconst MissionPanel: React.FC<MissionPanelProps> = ({ mission, embedded = false }[m
     }[m
   }[m
 [m
[31m-  const content = ([m
[31m-    <>[m
[32m+[m[32m  return ([m
[32m+[m[32m    <Card className='bg-surface-base/40 border border-border/50 mb-4'>[m
       <div className='flex items-start gap-4'>[m
         <div className='flex-shrink-0 pt-1'>[m
           <Icon />[m
[36m@@ -73,12 +72,8 @@[m [mconst MissionPanel: React.FC<MissionPanelProps> = ({ mission, embedded = false }[m
           </div>[m
         </Tooltip>[m
       )}[m
[31m-    </>[m
[32m+[m[32m    </Card>[m
   );[m
[31m-[m
[31m-  if (embedded) return <div className="space-y-3">{content}</div>;[m
[31m-[m
[31m-  return <Card className='bg-surface-base/40 border border-border/50 mb-4'>{content}</Card>;[m
 };[m
 [m
 export default MissionPanel;[m
[1mdiff --git a/components/battle/TargetInspector.tsx b/components/battle/TargetInspector.tsx[m
[1mindex 8660c3e..948cbb8 100644[m
[1m--- a/components/battle/TargetInspector.tsx[m
[1m+++ b/components/battle/TargetInspector.tsx[m
[36m@@ -9,10 +9,9 @@[m [mimport { getProtectiveDeviceById } from '@/services/data/items';[m
 [m
 interface TargetInspectorProps {[m
   participant: BattleParticipant;[m
[31m-  pinned?: boolean;[m
 }[m
 [m
[31m-const TargetInspector: React.FC<TargetInspectorProps> = ({ participant, pinned }) => {[m
[32m+[m[32mconst TargetInspector: React.FC<TargetInspectorProps> = ({ participant }) => {[m
   const { t } = useTranslation();[m
   const isOpponent = participant.type === 'enemy';[m
 [m
[36m@@ -33,14 +32,7 @@[m [mconst TargetInspector: React.FC<TargetInspectorProps> = ({ participant, pinned }[m
 [m
   return ([m
     <Card className="w-48 p-2 bg-surface-overlay/90 backdrop-blur-md border-border/70 shadow-2xl animate-fade-in text-xs">[m
[31m-      <div className="flex items-center justify-between gap-2">[m
[31m-        <h5 className={`font-bold font-orbitron truncate ${isOpponent ? 'text-danger' : 'text-primary'}`}>{name}</h5>[m
[31m-        {pinned && ([m
[31m-          <span className="px-1.5 py-0.5 rounded border border-border/70 bg-surface-raised/70 text-[10px] font-bold text-text-muted">[m
[31m-            {t('battle.hud.inspectPinned')}[m
[31m-          </span>[m
[31m-        )}[m
[31m-      </div>[m
[32m+[m[32m      <h5 className={`font-bold font-orbitron truncate ${isOpponent ? 'text-danger' : 'text-primary'}`}>{name}</h5>[m
       <div className="flex items-center justify-between gap-2 mt-2">[m
         <Tooltip content={t('characterCard.tough')}>[m
           <div className="flex items-center gap-1.5" aria-label={t('characterCard.tough')}>[m
[1mdiff --git a/components/battle/TileInspector.tsx b/components/battle/TileInspector.tsx[m
[1mdeleted file mode 100644[m
[1mindex ec816db..0000000[m
[1m--- a/components/battle/TileInspector.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,80 +0,0 @@[m
[31m-import React, { useMemo } from 'react';[m
[31m-import type { BattleParticipant } from '@/types';[m
[31m-import type { Position, Terrain } from '@/types/battle';[m
[31m-import { useTranslation } from '@/i18n';[m
[31m-import Card from '../ui/Card';[m
[31m-import { sanitizeToText } from '@/services/utils/sanitization';[m
[31m-[m
[31m-type TileInspectorProps = {[m
[31m-  pos: Position;[m
[31m-  terrain: Terrain | null;[m
[31m-  occupiedBy: BattleParticipant | null;[m
[31m-  isReachable: boolean;[m
[31m-  isCoverSpot: boolean;[m
[31m-};[m
[31m-[m
[31m-const TileInspector: React.FC<TileInspectorProps> = ({ pos, terrain, occupiedBy, isReachable, isCoverSpot }) => {[m
[31m-  const { t } = useTranslation();[m
[31m-[m
[31m-  const occupiedLabel = useMemo(() => {[m
[31m-    if (!occupiedBy) return null;[m
[31m-    if (occupiedBy.type === 'character') return sanitizeToText(occupiedBy.name);[m
[31m-    const nameParts = occupiedBy.name.split(' #');[m
[31m-    return `${t(`enemies.${nameParts[0]}`)} #${nameParts[1]}`;[m
[31m-  }, [occupiedBy, t]);[m
[31m-[m
[31m-  return ([m
[31m-    <Card className="w-56 p-2 bg-surface-overlay/90 backdrop-blur-md border-border/70 shadow-2xl animate-fade-in text-xs">[m
[31m-      <div className="flex items-center justify-between gap-2">[m
[31m-        <div className="font-bold font-orbitron text-text-base">[m
[31m-          {t('battle.hud.tile')} {pos.x},{pos.y}[m
[31m-        </div>[m
[31m-        <span className="px-1.5 py-0.5 rounded border border-border/70 bg-surface-raised/70 text-[10px] font-bold text-text-muted">[m
[31m-          {t('battle.hud.inspectPinned')}[m
[31m-        </span>[m
[31m-      </div>[m
[31m-[m
[31m-      <div className="mt-2 space-y-1 text-text-base">[m
[31m-        {terrain && ([m
[31m-          <div className="flex items-center justify-between gap-2">[m
[31m-            <span className="text-text-muted">{t('battle.hud.terrain')}</span>[m
[31m-            <span className="font-bold truncate">{terrain.name}</span>[m
[31m-          </div>[m
[31m-        )}[m
[31m-[m
[31m-        {occupiedLabel && ([m
[31m-          <div className="flex items-center justify-between gap-2">[m
[31m-            <span className="text-text-muted">{t('battle.hud.occupied')}</span>[m
[31m-            <span className="font-bold truncate">{occupiedLabel}</span>[m
[31m-          </div>[m
[31m-        )}[m
[31m-[m
[31m-        <div className="flex items-center justify-between gap-2">[m
[31m-          <span className="text-text-muted">{t('battle.hud.reachable')}</span>[m
[31m-          <span className={`font-bold ${isReachable ? 'text-success' : 'text-text-base'}`}>{isReachable ? t('battle.hud.yes') : t('battle.hud.no')}</span>[m
[31m-        </div>[m
[31m-[m
[31m-        <div className="flex items-center justify-between gap-2">[m
[31m-          <span className="text-text-muted">{t('battle.hud.cover')}</span>[m
[31m-          <span className={`font-bold ${isCoverSpot ? 'text-info' : 'text-text-base'}`}>{isCoverSpot ? t('battle.hud.yes') : t('battle.hud.no')}</span>[m
[31m-        </div>[m
[31m-[m
[31m-        {terrain && ([m
[31m-          <>[m
[31m-            <div className="flex items-center justify-between gap-2">[m
[31m-              <span className="text-text-muted">{t('battle.hud.blocksLos')}</span>[m
[31m-              <span className={`font-bold ${terrain.blocksLineOfSight ? 'text-warning' : 'text-text-base'}`}>{terrain.blocksLineOfSight ? t('battle.hud.yes') : t('battle.hud.no')}</span>[m
[31m-            </div>[m
[31m-            <div className="flex items-center justify-between gap-2">[m
[31m-              <span className="text-text-muted">{t('battle.hud.impassable')}</span>[m
[31m-              <span className={`font-bold ${terrain.isImpassable ? 'text-danger' : 'text-text-base'}`}>{terrain.isImpassable ? t('battle.hud.yes') : t('battle.hud.no')}</span>[m
[31m-            </div>[m
[31m-          </>[m
[31m-        )}[m
[31m-      </div>[m
[31m-    </Card>[m
[31m-  );[m
[31m-};[m
[31m-[m
[31m-export default TileInspector;[m
[31m-[m
[1mdiff --git a/components/battle/three/AimingLine3D.tsx b/components/battle/three/AimingLine3D.tsx[m
[1mdeleted file mode 100644[m
[1mindex d72cead..0000000[m
[1m--- a/components/battle/three/AimingLine3D.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,49 +0,0 @@[m
[31m-import { useMemo } from 'react';[m
[31m-import { Line } from '@react-three/drei';[m
[31m-import type { BattleParticipant } from '@/types';[m
[31m-import type { Battle } from '@/types/battle';[m
[31m-import { CHARACTER_HEIGHT } from '@/constants/three';[m
[31m-import { gridToWorld } from '@/services/three/coordinates';[m
[31m-import { calculateCover, hasLineOfSight } from '@/services/rules/visibility';[m
[31m-[m
[31m-type AimingLine3DProps = {[m
[31m-  battle: Battle;[m
[31m-  attacker: BattleParticipant;[m
[31m-  target: BattleParticipant | null;[m
[31m-};[m
[31m-[m
[31m-export const AimingLine3D = ({ battle, attacker, target }: AimingLine3DProps) => {[m
[31m-  const data = useMemo(() => {[m
[31m-    if (!target) return null;[m
[31m-    if (target.status === 'casualty') return null;[m
[31m-[m
[31m-    const start = gridToWorld(attacker.position, battle.gridSize, CHARACTER_HEIGHT * 0.9);[m
[31m-    const end = gridToWorld(target.position, battle.gridSize, CHARACTER_HEIGHT * 0.9);[m
[31m-[m
[31m-    const hasLos = hasLineOfSight(attacker, target, battle as any);[m
[31m-    const hasCover = hasLos ? calculateCover(attacker, target, battle as any) : false;[m
[31m-[m
[31m-    const color = !hasLos ? '#ef4444' : hasCover ? '#38bdf8' : '#22c55e';[m
[31m-    return { start, end, color, dashed: !hasLos };[m
[31m-  }, [attacker, battle, target]);[m
[31m-[m
[31m-  if (!data) return null;[m
[31m-[m
[31m-  return ([m
[31m-    <Line[m
[31m-      points={[[m
[31m-        [data.start.x, data.start.y, data.start.z],[m
[31m-        [data.end.x, data.end.y, data.end.z],[m
[31m-      ]}[m
[31m-      color={data.color}[m
[31m-      lineWidth={2}[m
[31m-      dashed={data.dashed}[m
[31m-      dashSize={0.25}[m
[31m-      gapSize={0.18}[m
[31m-      transparent[m
[31m-      opacity={0.85}[m
[31m-      raycast={() => null}[m
[31m-    />[m
[31m-  );[m
[31m-};[m
[31m-[m
[1mdiff --git a/components/battle/three/CameraCommands3D.tsx b/components/battle/three/CameraCommands3D.tsx[m
[1mindex 3a14565..6b586e1 100644[m
[1m--- a/components/battle/three/CameraCommands3D.tsx[m
[1m+++ b/components/battle/three/CameraCommands3D.tsx[m
[36m@@ -13,9 +13,6 @@[m [minterface CameraCommands3DProps {[m
 export const CameraCommands3D = ({ gridSize }: CameraCommands3DProps) => {[m
   const command = useBattleStore((s) => s.camera3dCommand);[m
   const { clearCameraCommand } = useBattleStore((s) => s.actions);[m
[31m-  const followActive3D = useBattleStore((s) => s.followActive3D);[m
[31m-  const activeParticipantId = useBattleStore((s) => s.battle?.activeParticipantId ?? null);[m
[31m-  const participants = useBattleStore((s) => s.battle?.participants ?? []);[m
 [m
   const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | undefined;[m
   const camera = useThree((s) => s.camera);[m
[36m@@ -51,19 +48,6 @@[m [mexport const CameraCommands3D = ({ gridSize }: CameraCommands3DProps) => {[m
     }[m
   }, [camera, clearCameraCommand, command, controls, defaultOffset.x, defaultOffset.y, defaultOffset.z, gridSize]);[m
 [m
[31m-  useEffect(() => {[m
[31m-    if (!followActive3D) return;[m
[31m-    if (!activeParticipantId) return;[m
[31m-    const active = participants.find((p) => p.id === activeParticipantId);[m
[31m-    if (!active) return;[m
[31m-[m
[31m-    const target = gridToWorld(active.position, gridSize, 0);[m
[31m-    if (controls) {[m
[31m-      controls.target.set(target.x, target.y, target.z);[m
[31m-      controls.update();[m
[31m-    }[m
[31m-    camera.position.set(target.x + defaultOffset.x, target.y + defaultOffset.y, target.z + defaultOffset.z);[m
[31m-  }, [activeParticipantId, camera, controls, defaultOffset.x, defaultOffset.y, defaultOffset.z, followActive3D, gridSize, participants]);[m
[31m-[m
   return null;[m
 };[m
[41m+[m
[1mdiff --git a/components/battle/three/GridFloor.tsx b/components/battle/three/GridFloor.tsx[m
[1mindex 7197baa..5a215b0 100644[m
[1m--- a/components/battle/three/GridFloor.tsx[m
[1m+++ b/components/battle/three/GridFloor.tsx[m
[36m@@ -15,40 +15,17 @@[m [mexport const GridFloor = ({ gridSize }: GridFloorProps) => {[m
     const ctx = canvas.getContext('2d');[m
     if (!ctx) return null;[m
 [m
[31m-    const grad = ctx.createLinearGradient(0, 0, size, size);[m
[31m-    grad.addColorStop(0, '#0f172a');[m
[31m-    grad.addColorStop(1, '#0b1220');[m
[31m-    ctx.fillStyle = grad;[m
[32m+[m[32m    ctx.fillStyle = '#182237';[m
     ctx.fillRect(0, 0, size, size);[m
 [m
[31m-    const noise = ctx.getImageData(0, 0, size, size);[m
[31m-    for (let i = 0; i < noise.data.length; i += 4) {[m
[31m-      const v = (Math.random() - 0.5) * 10;[m
[31m-      noise.data[i] = Math.min(255, Math.max(0, noise.data[i] + v));[m
[31m-      noise.data[i + 1] = Math.min(255, Math.max(0, noise.data[i + 1] + v));[m
[31m-      noise.data[i + 2] = Math.min(255, Math.max(0, noise.data[i + 2] + v));[m
[31m-    }[m
[31m-    ctx.putImageData(noise, 0, 0);[m
[31m-[m
[31m-    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';[m
[32m+[m[32m    ctx.strokeStyle = '#2f3f66';[m
     ctx.lineWidth = 2;[m
     ctx.strokeRect(0, 0, size, size);[m
 [m
[31m-    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';[m
[31m-    ctx.lineWidth = 1;[m
[31m-    ctx.beginPath();[m
[31m-    ctx.moveTo(size / 2, 0);[m
[31m-    ctx.lineTo(size / 2, size);[m
[31m-    ctx.moveTo(0, size / 2);[m
[31m-    ctx.lineTo(size, size / 2);[m
[31m-    ctx.stroke();[m
[31m-[m
     const texture = new THREE.CanvasTexture(canvas);[m
     texture.wrapS = THREE.RepeatWrapping;[m
     texture.wrapT = THREE.RepeatWrapping;[m
     texture.repeat.set(gridSize.width, gridSize.height);[m
[31m-    texture.anisotropy = 4;[m
[31m-    texture.colorSpace = THREE.SRGBColorSpace;[m
 [m
     return texture;[m
   }, [gridSize.width, gridSize.height]);[m
[36m@@ -64,7 +41,7 @@[m [mexport const GridFloor = ({ gridSize }: GridFloorProps) => {[m
   return ([m
     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow raycast={() => null}>[m
       <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />[m
[31m-      <meshStandardMaterial map={gridTexture} roughness={0.95} metalness={0.05} />[m
[32m+[m[32m      <meshStandardMaterial map={gridTexture} />[m
     </mesh>[m
   );[m
 };[m
[1mdiff --git a/components/battle/three/MoveHighlights.tsx b/components/battle/three/MoveHighlights.tsx[m
[1mindex cd09edb..aa16c79 100644[m
[1m--- a/components/battle/three/MoveHighlights.tsx[m
[1m+++ b/components/battle/three/MoveHighlights.tsx[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { useEffect, useMemo, useRef } from 'react';[m
[32m+[m[32mimport { useEffect, useRef } from 'react';[m
 import * as THREE from 'three';[m
 import { TILE_SIZE } from '@/constants/three';[m
 import { gridToWorld } from '@/services/three/coordinates';[m
[36m@@ -6,160 +6,32 @@[m [mimport type { GridSize, Position } from '@/types/battle';[m
 [m
 interface MoveHighlightsProps {[m
   positions: Position[];[m
[31m-  coverPositions?: Position[];[m
[31m-  coverArrows?: { pos: Position; angle: number }[];[m
[31m-  pathPositions?: Position[] | null;[m
   gridSize: GridSize;[m
 }[m
 [m
[31m-export const MoveHighlights = ({ positions, coverPositions, coverArrows, pathPositions, gridSize }: MoveHighlightsProps) => {[m
[31m-  const normalMeshRef = useRef<THREE.InstancedMesh>(null);[m
[31m-  const coverMeshRef = useRef<THREE.InstancedMesh>(null);[m
[31m-  const coverArrowMeshRef = useRef<THREE.InstancedMesh>(null);[m
[31m-  const pathMeshRef = useRef<THREE.InstancedMesh>(null);[m
[31m-  const pathRibbonMeshRef = useRef<THREE.InstancedMesh>(null);[m
[31m-[m
[31m-  const coverKeySet = useMemo(() => {[m
[31m-    if (!coverPositions || coverPositions.length === 0) return new Set<string>();[m
[31m-    return new Set(coverPositions.map((p) => `${p.x},${p.y}`));[m
[31m-  }, [coverPositions]);[m
[31m-[m
[31m-  const normalPositions = useMemo(() => {[m
[31m-    if (positions.length === 0) return [];[m
[31m-    if (coverKeySet.size === 0) return positions;[m
[31m-    return positions.filter((p) => !coverKeySet.has(`${p.x},${p.y}`));[m
[31m-  }, [coverKeySet, positions]);[m
[31m-[m
[31m-  const coverOnlyPositions = useMemo(() => {[m
[31m-    if (!coverPositions || coverPositions.length === 0) return [];[m
[31m-    const allowed = new Set(positions.map((p) => `${p.x},${p.y}`));[m
[31m-    return coverPositions.filter((p) => allowed.has(`${p.x},${p.y}`));[m
[31m-  }, [coverPositions, positions]);[m
[32m+[m[32mexport const MoveHighlights = ({ positions, gridSize }: MoveHighlightsProps) => {[m
[32m+[m[32m  const meshRef = useRef<THREE.InstancedMesh>(null);[m
 [m
   useEffect(() => {[m
[31m-    if (!normalMeshRef.current || normalPositions.length === 0) return;[m
[32m+[m[32m    if (!meshRef.current || positions.length === 0) return;[m
 [m
     const dummy = new THREE.Object3D();[m
[31m-    normalPositions.forEach((pos, i) => {[m
[32m+[m[32m    positions.forEach((pos, i) => {[m
       const world = gridToWorld(pos, gridSize, 0.02);[m
       dummy.position.set(world.x, world.y, world.z);[m
       dummy.rotation.x = -Math.PI / 2;[m
       dummy.updateMatrix();[m
[31m-      normalMeshRef.current!.setMatrixAt(i, dummy.matrix);[m
[31m-    });[m
[31m-    normalMeshRef.current.instanceMatrix.needsUpdate = true;[m
[31m-  }, [gridSize, normalPositions]);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (!coverMeshRef.current || coverOnlyPositions.length === 0) return;[m
[31m-[m
[31m-    const dummy = new THREE.Object3D();[m
[31m-    coverOnlyPositions.forEach((pos, i) => {[m
[31m-      const world = gridToWorld(pos, gridSize, 0.021);[m
[31m-      dummy.position.set(world.x, world.y, world.z);[m
[31m-      dummy.rotation.x = -Math.PI / 2;[m
[31m-      dummy.updateMatrix();[m
[31m-      coverMeshRef.current!.setMatrixAt(i, dummy.matrix);[m
[31m-    });[m
[31m-    coverMeshRef.current.instanceMatrix.needsUpdate = true;[m
[31m-  }, [coverOnlyPositions, gridSize]);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (!coverArrowMeshRef.current || !coverArrows || coverArrows.length === 0) return;[m
[31m-[m
[31m-    const dummy = new THREE.Object3D();[m
[31m-    coverArrows.forEach(({ pos, angle }, i) => {[m
[31m-      const world = gridToWorld(pos, gridSize, 0.031);[m
[31m-      dummy.position.set(world.x, world.y, world.z);[m
[31m-      dummy.rotation.set(-Math.PI / 2, angle, 0);[m
[31m-      dummy.updateMatrix();[m
[31m-      coverArrowMeshRef.current!.setMatrixAt(i, dummy.matrix);[m
[31m-    });[m
[31m-    coverArrowMeshRef.current.instanceMatrix.needsUpdate = true;[m
[31m-  }, [coverArrows, gridSize]);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (!pathMeshRef.current || !pathPositions || pathPositions.length === 0) return;[m
[31m-[m
[31m-    const dummy = new THREE.Object3D();[m
[31m-    pathPositions.forEach((pos, i) => {[m
[31m-      const world = gridToWorld(pos, gridSize, 0.03);[m
[31m-      dummy.position.set(world.x, world.y, world.z);[m
[31m-      dummy.rotation.x = -Math.PI / 2;[m
[31m-      dummy.updateMatrix();[m
[31m-      pathMeshRef.current!.setMatrixAt(i, dummy.matrix);[m
[31m-    });[m
[31m-    pathMeshRef.current.instanceMatrix.needsUpdate = true;[m
[31m-  }, [gridSize, pathPositions]);[m
[31m-[m
[31m-  const pathSegments = useMemo(() => {[m
[31m-    if (!pathPositions || pathPositions.length < 2) return [];[m
[31m-    const segs: { mid: THREE.Vector3; angle: number; length: number }[] = [];[m
[31m-    for (let i = 0; i < pathPositions.length - 1; i++) {[m
[31m-      const a = gridToWorld(pathPositions[i], gridSize, 0.032);[m
[31m-      const b = gridToWorld(pathPositions[i + 1], gridSize, 0.032);[m
[31m-      const dx = b.x - a.x;[m
[31m-      const dz = b.z - a.z;[m
[31m-      const length = Math.sqrt(dx * dx + dz * dz);[m
[31m-      if (length <= 0.0001) continue;[m
[31m-      const mid = new THREE.Vector3((a.x + b.x) / 2, a.y, (a.z + b.z) / 2);[m
[31m-      const angle = Math.atan2(dx, dz);[m
[31m-      segs.push({ mid, angle, length });[m
[31m-    }[m
[31m-    return segs;[m
[31m-  }, [gridSize, pathPositions]);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    if (!pathRibbonMeshRef.current || pathSegments.length === 0) return;[m
[31m-    const dummy = new THREE.Object3D();[m
[31m-    pathSegments.forEach((seg, i) => {[m
[31m-      dummy.position.copy(seg.mid);[m
[31m-      dummy.rotation.set(-Math.PI / 2, seg.angle, 0);[m
[31m-      dummy.scale.set(1, seg.length, 1);[m
[31m-      dummy.updateMatrix();[m
[31m-      pathRibbonMeshRef.current!.setMatrixAt(i, dummy.matrix);[m
[32m+[m[32m      meshRef.current!.setMatrixAt(i, dummy.matrix);[m
     });[m
[31m-    pathRibbonMeshRef.current.instanceMatrix.needsUpdate = true;[m
[31m-  }, [pathSegments]);[m
[32m+[m[32m    meshRef.current.instanceMatrix.needsUpdate = true;[m
[32m+[m[32m  }, [gridSize, positions]);[m
 [m
[31m-  if (positions.length === 0 && (!pathPositions || pathPositions.length === 0)) return null;[m
[32m+[m[32m  if (positions.length === 0) return null;[m
 [m
   return ([m
[31m-    <group raycast={() => null}>[m
[31m-      {normalPositions.length > 0 && ([m
[31m-        <instancedMesh ref={normalMeshRef} args={[null!, null!, normalPositions.length]} raycast={() => null}>[m
[31m-          <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />[m
[31m-          <meshBasicMaterial color="#22c55e" transparent opacity={0.16} side={THREE.DoubleSide} toneMapped={false} />[m
[31m-        </instancedMesh>[m
[31m-      )}[m
[31m-[m
[31m-      {coverOnlyPositions.length > 0 && ([m
[31m-        <instancedMesh ref={coverMeshRef} args={[null!, null!, coverOnlyPositions.length]} raycast={() => null}>[m
[31m-          <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />[m
[31m-          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} side={THREE.DoubleSide} toneMapped={false} />[m
[31m-        </instancedMesh>[m
[31m-      )}[m
[31m-[m
[31m-      {coverArrows && coverArrows.length > 0 && ([m
[31m-        <instancedMesh ref={coverArrowMeshRef} args={[null!, null!, coverArrows.length]} raycast={() => null}>[m
[31m-          <coneGeometry args={[0.16, 0.26, 3]} />[m
[31m-          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} toneMapped={false} />[m
[31m-        </instancedMesh>[m
[31m-      )}[m
[31m-[m
[31m-      {pathSegments.length > 0 && ([m
[31m-        <instancedMesh ref={pathRibbonMeshRef} args={[null!, null!, pathSegments.length]} raycast={() => null}>[m
[31m-          <planeGeometry args={[TILE_SIZE * 0.22, 1]} />[m
[31m-          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />[m
[31m-        </instancedMesh>[m
[31m-      )}[m
[31m-[m
[31m-      {pathPositions && pathPositions.length > 0 && ([m
[31m-        <instancedMesh ref={pathMeshRef} args={[null!, null!, pathPositions.length]} raycast={() => null}>[m
[31m-          <planeGeometry args={[TILE_SIZE * 0.55, TILE_SIZE * 0.55]} />[m
[31m-          <meshBasicMaterial color="#fbbf24" transparent opacity={0.3} side={THREE.DoubleSide} toneMapped={false} />[m
[31m-        </instancedMesh>[m
[31m-      )}[m
[31m-    </group>[m
[32m+[m[32m    <instancedMesh ref={meshRef} args={[null!, null!, positions.length]} raycast={() => null}>[m
[32m+[m[32m      <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />[m
[32m+[m[32m      <meshBasicMaterial color="#22c55e" transparent opacity={0.18} side={THREE.DoubleSide} toneMapped={false} />[m
[32m+[m[32m    </instancedMesh>[m
   );[m
 };[m
[1mdiff --git a/components/battle/three/ParticipantMesh.tsx b/components/battle/three/ParticipantMesh.tsx[m
[1mindex 54b048c..558b8ab 100644[m
[1m--- a/components/battle/three/ParticipantMesh.tsx[m
[1m+++ b/components/battle/three/ParticipantMesh.tsx[m
[36m@@ -1,5 +1,5 @@[m
 import { useCallback, useEffect, useRef } from 'react';[m
[31m-import * as THREE from 'three';[m
[32m+[m[32mimport type * as THREE from 'three';[m
 import type { ThreeEvent } from '@react-three/fiber';[m
 import { CHARACTER_HEIGHT } from '@/constants/three';[m
 import { gridToWorld } from '@/services/three/coordinates';[m
[36m@@ -11,21 +11,12 @@[m [minterface ParticipantMeshProps {[m
   unit: Unit3D;[m
   gridSize: GridSize;[m
   onClick: (id: string, pos: Position) => void;[m
[31m-  onInspect: (id: string, pos: Position, screen: { x: number; y: number }) => void;[m
   onHover: (pos: Position | null) => void;[m
[31m-  isValidTarget: boolean;[m
 }[m
 [m
[31m-export const ParticipantMesh = ({ unit, gridSize, onClick, onInspect, onHover, isValidTarget }: ParticipantMeshProps) => {[m
[32m+[m[32mexport const ParticipantMesh = ({ unit, gridSize, onClick, onHover }: ParticipantMeshProps) => {[m
   const groupRef = useRef<THREE.Group>(null);[m
   const { register, unregister } = useParticipantMeshContext();[m
[31m-  const gestureRef = useRef<{[m
[31m-    pointerId: number | null;[m
[31m-    startX: number;[m
[31m-    startY: number;[m
[31m-    longPressed: boolean;[m
[31m-    timer: ReturnType<typeof setTimeout> | null;[m
[31m-  }>({ pointerId: null, startX: 0, startY: 0, longPressed: false, timer: null });[m
 [m
   useEffect(() => {[m
     if (groupRef.current) {[m
[36m@@ -40,67 +31,12 @@[m [mexport const ParticipantMesh = ({ unit, gridSize, onClick, onInspect, onHover, i[m
     groupRef.current.position.set(position.x, position.y, position.z);[m
   }, [gridSize, unit.isAnimating, unit.position]);[m
 [m
[31m-  const clearGestureTimer = useCallback(() => {[m
[31m-    if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);[m
[31m-    gestureRef.current.timer = null;[m
[31m-  }, []);[m
[31m-[m
[31m-  useEffect(() => {[m
[31m-    return () => {[m
[31m-      clearGestureTimer();[m
[31m-    };[m
[31m-  }, [clearGestureTimer]);[m
[31m-[m
[31m-  const handlePointerDown = useCallback([m
[31m-    (e: ThreeEvent<PointerEvent>) => {[m
[31m-      if (unit.status === 'casualty') return;[m
[31m-      gestureRef.current.pointerId = e.pointerId;[m
[31m-      gestureRef.current.startX = e.clientX;[m
[31m-      gestureRef.current.startY = e.clientY;[m
[31m-      gestureRef.current.longPressed = false;[m
[31m-      clearGestureTimer();[m
[31m-      gestureRef.current.timer = setTimeout(() => {[m
[31m-        gestureRef.current.longPressed = true;[m
[31m-        onInspect(unit.id, unit.position, { x: gestureRef.current.startX, y: gestureRef.current.startY });[m
[31m-      }, 450);[m
[31m-    },[m
[31m-    [clearGestureTimer, onInspect, unit.id, unit.position, unit.status][m
[31m-  );[m
[31m-[m
[31m-  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {[m
[31m-    if (gestureRef.current.pointerId !== e.pointerId) return;[m
[31m-    const dx = e.clientX - gestureRef.current.startX;[m
[31m-    const dy = e.clientY - gestureRef.current.startY;[m
[31m-    if (dx * dx + dy * dy > 64) {[m
[31m-      clearGestureTimer();[m
[31m-    }[m
[31m-  }, [clearGestureTimer]);[m
[31m-[m
[31m-  const handlePointerUp = useCallback([m
[31m-    (e: ThreeEvent<PointerEvent>) => {[m
[31m-      if (gestureRef.current.pointerId !== e.pointerId) return;[m
[31m-      clearGestureTimer();[m
[32m+[m[32m  const handleClick = useCallback([m
[32m+[m[32m    (e: ThreeEvent<MouseEvent>) => {[m
       e.stopPropagation();[m
[31m-      if (gestureRef.current.longPressed) {[m
[31m-        gestureRef.current.pointerId = null;[m
[31m-        gestureRef.current.longPressed = false;[m
[31m-        return;[m
[31m-      }[m
       onClick(unit.id, unit.position);[m
[31m-      gestureRef.current.pointerId = null;[m
[31m-      gestureRef.current.longPressed = false;[m
     },[m
[31m-    [clearGestureTimer, onClick, unit.id, unit.position][m
[31m-  );[m
[31m-[m
[31m-  const handlePointerCancel = useCallback([m
[31m-    (e: ThreeEvent<PointerEvent>) => {[m
[31m-      if (gestureRef.current.pointerId !== e.pointerId) return;[m
[31m-      clearGestureTimer();[m
[31m-      gestureRef.current.pointerId = null;[m
[31m-      gestureRef.current.longPressed = false;[m
[31m-    },[m
[31m-    [clearGestureTimer][m
[32m+[m[32m    [onClick, unit.id, unit.position][m
   );[m
 [m
   const isCasualty = unit.status === 'casualty';[m
[36m@@ -108,36 +44,11 @@[m [mexport const ParticipantMesh = ({ unit, gridSize, onClick, onInspect, onHover, i[m
   return ([m
     <group[m
       ref={groupRef}[m
[31m-      onPointerDown={handlePointerDown}[m
[31m-      onPointerMove={handlePointerMove}[m
[31m-      onPointerUp={handlePointerUp}[m
[31m-      onPointerCancel={handlePointerCancel}[m
[32m+[m[32m      onClick={handleClick}[m
       onPointerEnter={() => onHover(unit.position)}[m
       onPointerLeave={() => onHover(null)}[m
       rotation={isCasualty ? [Math.PI / 2, 0, 0] : [0, 0, 0]}[m
     >[m
[31m-      {!isCasualty && (unit.isHovered || unit.isSelected || unit.isActive || isValidTarget) && ([m
[31m-        <mesh castShadow={false} position={[0, CHARACTER_HEIGHT / 2, 0]} scale={[1.12, 1.06, 1.12]} renderOrder={10}>[m
[31m-          <capsuleGeometry args={[0.3, 0.8, 4, 8]} />[m
[31m-          <meshBasicMaterial[m
[31m-            color={[m
[31m-              unit.isSelected[m
[31m-                ? '#22c55e'[m
[31m-                : isValidTarget[m
[31m-                  ? '#ef4444'[m
[31m-                  : unit.isActive[m
[31m-                    ? '#f59e0b'[m
[31m-                    : '#38bdf8'[m
[31m-            }[m
[31m-            transparent[m
[31m-            opacity={unit.isSelected ? 0.55 : isValidTarget ? 0.38 : unit.isActive ? 0.32 : 0.28}[m
[31m-            side={THREE.BackSide}[m
[31m-            depthWrite={false}[m
[31m-            toneMapped={false}[m
[31m-          />[m
[31m-        </mesh>[m
[31m-      )}[m
[31m-[m
       <mesh castShadow position={[0, CHARACTER_HEIGHT / 2, 0]}>[m
         <capsuleGeometry args={[0.3, 0.8, 4, 8]} />[m
         <meshStandardMaterial[m
[36m@@ -169,13 +80,6 @@[m [mexport const ParticipantMesh = ({ unit, gridSize, onClick, onInspect, onHover, i[m
           <meshBasicMaterial color="#f59e0b" transparent opacity={0.55} toneMapped={false} />[m
         </mesh>[m
       )}[m
[31m-[m
[31m-      {isValidTarget && !isCasualty && ([m
[31m-        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>[m
[31m-          <ringGeometry args={[0.72, 0.82, 56]} />[m
[31m-          <meshBasicMaterial color="#ef4444" transparent opacity={0.35} toneMapped={false} />[m
[31m-        </mesh>[m
[31m-      )}[m
     </group>[m
   );[m
 };[m
[1mdiff --git a/components/battle/three/RaycastController.tsx b/components/battle/three/RaycastController.tsx[m
[1mindex caba608..f510c23 100644[m
[1m--- a/components/battle/three/RaycastController.tsx[m
[1m+++ b/components/battle/three/RaycastController.tsx[m
[36m@@ -9,7 +9,6 @@[m [minterface RaycastControllerProps {[m
   gridSize: GridSize;[m
   onCellHover: (pos: Position | null) => void;[m
   onCellClick: (pos: Position) => void;[m
[31m-  onCellInspect: (pos: Position, screen: { x: number; y: number }) => void;[m
 }[m
 [m
 function useThrottle<T extends (...args: any[]) => any>(func: T, delay: number): [T, () => void] {[m
[36m@@ -36,16 +35,9 @@[m [mfunction useThrottle<T extends (...args: any[]) => any>(func: T, delay: number):[m
   return [throttled, cleanup];[m
 }[m
 [m
[31m-export const RaycastController = ({ gridSize, onCellHover, onCellClick, onCellInspect }: RaycastControllerProps) => {[m
[32m+[m[32mexport const RaycastController = ({ gridSize, onCellHover, onCellClick }: RaycastControllerProps) => {[m
   const { camera, raycaster } = useThree();[m
   const intersectionRef = useRef(new Vector3());[m
[31m-  const gestureRef = useRef<{[m
[31m-    pointerId: number | null;[m
[31m-    startX: number;[m
[31m-    startY: number;[m
[31m-    longPressed: boolean;[m
[31m-    timer: ReturnType<typeof setTimeout> | null;[m
[31m-  }>({ pointerId: null, startX: 0, startY: 0, longPressed: false, timer: null });[m
 [m
   const onCellHoverRef = useRef(onCellHover);[m
   useEffect(() => {[m
[36m@@ -59,8 +51,6 @@[m [mexport const RaycastController = ({ gridSize, onCellHover, onCellClick, onCellIn[m
   useEffect(() => {[m
     return () => {[m
       cleanupThrottle();[m
[31m-      if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);[m
[31m-      gestureRef.current.timer = null;[m
     };[m
   }, [cleanupThrottle]);[m
 [m
[36m@@ -93,91 +83,28 @@[m [mexport const RaycastController = ({ gridSize, onCellHover, onCellClick, onCellIn[m
     onCellHoverRef.current(null);[m
   }, [cleanupThrottle]);[m
 [m
[31m-  const clearGestureTimer = useCallback(() => {[m
[31m-    if (gestureRef.current.timer) clearTimeout(gestureRef.current.timer);[m
[31m-    gestureRef.current.timer = null;[m
[31m-  }, []);[m
[31m-[m
[31m-  const pickCell = useCallback([m
[31m-    (event: ThreeEvent<PointerEvent | MouseEvent>) => {[m
[31m-      raycaster.setFromCamera((event as any).pointer, camera);[m
[32m+[m[32m  const handleClick = useCallback([m
[32m+[m[32m    (event: ThreeEvent<MouseEvent>) => {[m
[32m+[m[32m      raycaster.setFromCamera(event.pointer, camera);[m
       const hit = raycaster.ray.intersectPlane(pickingPlane, intersectionRef.current);[m
[31m-      if (!hit) return null;[m
[31m-      const gridPos = worldToGrid(intersectionRef.current, gridSize);[m
[31m-      if (!isValidGridPos(gridPos, gridSize)) return null;[m
[31m-      return gridPos;[m
[31m-    },[m
[31m-    [camera, gridSize, pickingPlane, raycaster][m
[31m-  );[m
 [m
[31m-  const handlePointerDown = useCallback([m
[31m-    (event: ThreeEvent<PointerEvent>) => {[m
[31m-      const pos = pickCell(event);[m
[31m-      if (!pos) return;[m
[31m-      gestureRef.current.pointerId = event.pointerId;[m
[31m-      gestureRef.current.startX = event.clientX;[m
[31m-      gestureRef.current.startY = event.clientY;[m
[31m-      gestureRef.current.longPressed = false;[m
[31m-      clearGestureTimer();[m
[31m-      gestureRef.current.timer = setTimeout(() => {[m
[31m-        gestureRef.current.longPressed = true;[m
[31m-        onCellInspect(pos, { x: gestureRef.current.startX, y: gestureRef.current.startY });[m
[31m-      }, 450);[m
[31m-    },[m
[31m-    [clearGestureTimer, onCellInspect, pickCell][m
[31m-  );[m
[31m-[m
[31m-  const handlePointerMoveWithCancel = useCallback([m
[31m-    (event: ThreeEvent<PointerEvent>) => {[m
[31m-      if (gestureRef.current.pointerId === event.pointerId) {[m
[31m-        const dx = event.clientX - gestureRef.current.startX;[m
[31m-        const dy = event.clientY - gestureRef.current.startY;[m
[31m-        if (dx * dx + dy * dy > 64) {[m
[31m-          clearGestureTimer();[m
[31m-        }[m
[31m-      }[m
[31m-      handlePointerMove(event);[m
[31m-    },[m
[31m-    [clearGestureTimer, handlePointerMove][m
[31m-  );[m
[32m+[m[32m      if (!hit) return;[m
 [m
[31m-  const handlePointerUp = useCallback([m
[31m-    (event: ThreeEvent<PointerEvent>) => {[m
[31m-      if (gestureRef.current.pointerId !== event.pointerId) return;[m
[31m-      clearGestureTimer();[m
[31m-      event.stopPropagation();[m
[31m-      if (gestureRef.current.longPressed) {[m
[31m-        gestureRef.current.pointerId = null;[m
[31m-        gestureRef.current.longPressed = false;[m
[31m-        return;[m
[32m+[m[32m      const gridPos = worldToGrid(intersectionRef.current, gridSize);[m
[32m+[m[32m      if (isValidGridPos(gridPos, gridSize)) {[m
[32m+[m[32m        onCellClick(gridPos);[m
       }[m
[31m-      const pos = pickCell(event);[m
[31m-      if (pos) onCellClick(pos);[m
[31m-      gestureRef.current.pointerId = null;[m
[31m-      gestureRef.current.longPressed = false;[m
[31m-    },[m
[31m-    [clearGestureTimer, onCellClick, pickCell][m
[31m-  );[m
[31m-[m
[31m-  const handlePointerCancel = useCallback([m
[31m-    (event: ThreeEvent<PointerEvent>) => {[m
[31m-      if (gestureRef.current.pointerId !== event.pointerId) return;[m
[31m-      clearGestureTimer();[m
[31m-      gestureRef.current.pointerId = null;[m
[31m-      gestureRef.current.longPressed = false;[m
     },[m
[31m-    [clearGestureTimer][m
[32m+[m[32m    [camera, gridSize, onCellClick, pickingPlane, raycaster][m
   );[m
 [m
   return ([m
     <mesh[m
       position={[0, 0, 0]}[m
       rotation={[-Math.PI / 2, 0, 0]}[m
[31m-      onPointerMove={handlePointerMoveWithCancel}[m
[32m+[m[32m      onPointerMove={handlePointerMove}[m
       onPointerOut={handlePointerOut}[m
[31m-      onPointerDown={handlePointerDown}[m
[31m-      onPointerUp={handlePointerUp}[m
[31m-      onPointerCancel={handlePointerCancel}[m
[32m+[m[32m      onClick={handleClick}[m
     >[m
       <planeGeometry args={[gridSize.width * TILE_SIZE, gridSize.height * TILE_SIZE]} />[m
       <meshBasicMaterial transparent opacity={0} />[m
[1mdiff --git a/components/battle/three/TargetTooltip3D.tsx b/components/battle/three/TargetTooltip3D.tsx[m
[1mdeleted file mode 100644[m
[1mindex da471b5..0000000[m
[1m--- a/components/battle/three/TargetTooltip3D.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,55 +0,0 @@[m
[31m-import { useMemo } from 'react';[m
[31m-import { Html } from '@react-three/drei';[m
[31m-import type { BattleParticipant } from '@/types';[m
[31m-import type { Battle } from '@/types/battle';[m
[31m-import { CHARACTER_HEIGHT } from '@/constants/three';[m
[31m-import { gridToWorld } from '@/services/three/coordinates';[m
[31m-import { getWeaponById } from '@/services/data/items';[m
[31m-import { BattleDomain } from '@/services/domain/battleDomain';[m
[31m-[m
[31m-type TargetTooltip3DProps = {[m
[31m-  battle: Battle;[m
[31m-  attacker: BattleParticipant;[m
[31m-  target: BattleParticipant;[m
[31m-  weaponInstanceId: string;[m
[31m-};[m
[31m-[m
[31m-export const TargetTooltip3D = ({ battle, attacker, target, weaponInstanceId }: TargetTooltip3DProps) => {[m
[31m-  const view = useMemo(() => {[m
[31m-    const weaponInstance = attacker.weapons.find((w) => w.instanceId === weaponInstanceId);[m
[31m-    if (!weaponInstance) return null;[m
[31m-[m
[31m-    const weapon = getWeaponById(weaponInstance.weaponId);[m
[31m-    if (!weapon) return null;[m
[31m-[m
[31m-    const { targetNumber } = BattleDomain.calculateHitTargetNumber(attacker as any, target as any, weapon as any, battle as any);[m
[31m-    const attackerEffectiveStats = BattleDomain.calculateEffectiveStats(attacker as any);[m
[31m-    const requiredBase = targetNumber - attackerEffectiveStats.combat;[m
[31m-[m
[31m-    const chance =[m
[31m-      targetNumber >= 99[m
[31m-        ? 0[m
[31m-        : requiredBase <= 1[m
[31m-          ? 100[m
[31m-          : requiredBase > 6[m
[31m-            ? 0[m
[31m-            : Math.round(((7 - requiredBase) / 6) * 100);[m
[31m-[m
[31m-    const label = targetNumber >= 99 ? 'OOR' : `TN ${targetNumber}`;[m
[31m-    return { label, chance };[m
[31m-  }, [attacker, battle, target, weaponInstanceId]);[m
[31m-[m
[31m-  const pos = useMemo(() => gridToWorld(target.position, battle.gridSize, CHARACTER_HEIGHT + 0.9), [battle.gridSize, target.position]);[m
[31m-[m
[31m-  if (!view) return null;[m
[31m-[m
[31m-  return ([m
[31m-    <Html position={[pos.x, pos.y, pos.z]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>[m
[31m-      <div className="bg-surface-overlay/85 backdrop-blur-sm border border-border/70 rounded px-2 py-1 text-[11px] leading-tight shadow-lg">[m
[31m-        <div className="font-bold text-text-base">{view.label}</div>[m
[31m-        <div className="text-text-muted">{view.chance}%</div>[m
[31m-      </div>[m
[31m-    </Html>[m
[31m-  );[m
[31m-};[m
[31m-[m
[1mdiff --git a/components/battle/three/TerrainMesh.tsx b/components/battle/three/TerrainMesh.tsx[m
[1mindex 8be46b8..875df05 100644[m
[1m--- a/components/battle/three/TerrainMesh.tsx[m
[1m+++ b/components/battle/three/TerrainMesh.tsx[m
[36m@@ -25,18 +25,17 @@[m [mexport const TerrainMesh = ({ terrain, gridSize }: TerrainMeshProps) => {[m
   const position = gridToWorld(terrain.position, gridSize, terrain.height / 2);[m
 [m
   return ([m
[31m-    <group position={[position.x, position.y, position.z]} userData={{ terrainId: terrain.id, terrainType: terrain.type }}>[m
[31m-      <mesh ref={meshRef} raycast={() => null} castShadow receiveShadow>[m
[31m-        {getTerrainGeometry(terrain)}[m
[31m-        {getTerrainMaterial(terrain)}[m
[31m-      </mesh>[m
[31m-      {terrain.providesCover && ([m
[31m-        <mesh raycast={() => null} scale={[1.03, 1.03, 1.03]}>[m
[31m-          {getTerrainGeometry(terrain)}[m
[31m-          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} wireframe toneMapped={false} />[m
[31m-        </mesh>[m
[31m-      )}[m
[31m-    </group>[m
[32m+[m[32m    <mesh[m
[32m+[m[32m      ref={meshRef}[m
[32m+[m[32m      raycast={() => null}[m
[32m+[m[32m      position={[position.x, position.y, position.z]}[m
[32m+[m[32m      castShadow[m
[32m+[m[32m      receiveShadow[m
[32m+[m[32m      userData={{ terrainId: terrain.id, terrainType: terrain.type }}[m
[32m+[m[32m    >[m
[32m+[m[32m      {getTerrainGeometry(terrain)}[m
[32m+[m[32m      {getTerrainMaterial(terrain)}[m
[32m+[m[32m    </mesh>[m
   );[m
 };[m
 [m
[36m@@ -58,39 +57,12 @@[m [mfunction getTerrainGeometry(terrain: Terrain3D) {[m
 [m
 function getTerrainMaterial(terrain: Terrain3D) {[m
   const colors: Record<string, string> = {[m
[31m-    Wall: '#64748b',[m
[31m-    Barrel: '#a16207',[m
[31m-    Container: '#2563eb',[m
[31m-    Obstacle: '#475569',[m
[31m-    Floor: '#111827',[m
[32m+[m[32m    Wall: '#666666',[m
[32m+[m[32m    Barrel: '#8B4513',[m
[32m+[m[32m    Container: '#2E5090',[m
[32m+[m[32m    Obstacle: '#555555',[m
[32m+[m[32m    Floor: '#1a1a2e',[m
   };[m
 [m
[31m-  const roughness: Record<string, number> = {[m
[31m-    Wall: 0.85,[m
[31m-    Barrel: 0.7,[m
[31m-    Container: 0.55,[m
[31m-    Obstacle: 0.9,[m
[31m-    Floor: 0.95,[m
[31m-  };[m
[31m-[m
[31m-  const metalness: Record<string, number> = {[m
[31m-    Wall: 0.15,[m
[31m-    Barrel: 0.25,[m
[31m-    Container: 0.5,[m
[31m-    Obstacle: 0.1,[m
[31m-    Floor: 0.05,[m
[31m-  };[m
[31m-[m
[31m-  const emissive = terrain.type === 'Container' ? '#1d4ed8' : '#000000';[m
[31m-  const emissiveIntensity = terrain.type === 'Container' ? 0.12 : 0;[m
[31m-[m
[31m-  return ([m
[31m-    <meshStandardMaterial[m
[31m-      color={colors[terrain.type] || colors.Obstacle}[m
[31m-      roughness={roughness[terrain.type] ?? 0.9}[m
[31m-      metalness={metalness[terrain.type] ?? 0.1}[m
[31m-      emissive={emissive}[m
[31m-      emissiveIntensity={emissiveIntensity}[m
[31m-    />[m
[31m-  );[m
[32m+[m[32m  return <meshStandardMaterial color={colors[terrain.type] || colors.Obstacle} />;[m
 }[m
[1mdiff --git a/components/battle/three/ThreeCanvas.tsx b/components/battle/three/ThreeCanvas.tsx[m
[1mindex 73019d7..accbd47 100644[m
[1m--- a/components/battle/three/ThreeCanvas.tsx[m
[1m+++ b/components/battle/three/ThreeCanvas.tsx[m
[36m@@ -1,11 +1,8 @@[m
 import { useMemo, type ReactNode } from 'react';[m
 import { Canvas } from '@react-three/fiber';[m
 import { OrbitControls } from '@react-three/drei';[m
[31m-import * as THREE from 'three';[m
 import { TILE_SIZE } from '@/constants/three';[m
 import type { GridSize } from '@/types/battle';[m
[31m-import { useSettingsStore } from '@/stores/settingsStore';[m
[31m-import { useShallow } from 'zustand/react/shallow';[m
 [m
 interface ThreeCanvasProps {[m
   gridSize: GridSize;[m
[36m@@ -13,80 +10,25 @@[m [minterface ThreeCanvasProps {[m
 }[m
 [m
 export const ThreeCanvas = ({ gridSize, children }: ThreeCanvasProps) => {[m
[31m-  const { reducedMotion, threeQuality, camera3dPreset, camera3dInvertWheel, camera3dZoomSpeed, camera3dPanSpeed, camera3dRotateSpeed } =[m
[31m-    useSettingsStore([m
[31m-      useShallow((s) => ({[m
[31m-        reducedMotion: s.reducedMotion,[m
[31m-        threeQuality: s.threeQuality,[m
[31m-        camera3dPreset: s.camera3dPreset,[m
[31m-        camera3dInvertWheel: s.camera3dInvertWheel,[m
[31m-        camera3dZoomSpeed: s.camera3dZoomSpeed,[m
[31m-        camera3dPanSpeed: s.camera3dPanSpeed,[m
[31m-        camera3dRotateSpeed: s.camera3dRotateSpeed,[m
[31m-      }))[m
[31m-    );[m
[31m-[m
   const cameraPosition = useMemo(() => {[m
     const maxDim = Math.max(gridSize.width, gridSize.height) * TILE_SIZE;[m
     const y = Math.max(6, maxDim * 1.2);[m
     return [0, y, y] as const;[m
   }, [gridSize.height, gridSize.width]);[m
 [m
[31m-  const controlsConfig = useMemo(() => {[m
[31m-    const presetMult = camera3dPreset === 'cinematic' ? 0.75 : 1;[m
[31m-    const absZoom = Math.max(0.1, Math.min(5, camera3dZoomSpeed)) * presetMult;[m
[31m-    return {[m
[31m-      zoomSpeed: (camera3dInvertWheel ? -absZoom : absZoom) as number,[m
[31m-      panSpeed: Math.max(0.1, Math.min(5, camera3dPanSpeed)) * presetMult,[m
[31m-      rotateSpeed: Math.max(0.1, Math.min(5, camera3dRotateSpeed)) * presetMult,[m
[31m-      enableDamping: !reducedMotion,[m
[31m-      dampingFactor: camera3dPreset === 'cinematic' ? 0.18 : 0.12,[m
[31m-      minPolarAngle: camera3dPreset === 'cinematic' ? Math.PI / 4 : Math.PI / 6,[m
[31m-      maxPolarAngle: Math.PI / 2.05,[m
[31m-    };[m
[31m-  }, [camera3dInvertWheel, camera3dPanSpeed, camera3dPreset, camera3dRotateSpeed, camera3dZoomSpeed, reducedMotion]);[m
[31m-[m
   return ([m
[31m-    <Canvas[m
[31m-      className="w-full h-full"[m
[31m-      shadows={threeQuality !== 'low'}[m
[31m-      camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 4000 }}[m
[31m-      gl={{ antialias: true, powerPreference: 'high-performance' }}[m
[31m-      style={{ touchAction: 'none' }}[m
[31m-    >[m
[32m+[m[32m    <Canvas className="w-full h-full" camera={{ position: cameraPosition, fov: 50, near: 0.1, far: 4000 }}>[m
       <color attach="background" args={['#0b1220']} />[m
[31m-      <fog attach="fog" args={['#0b1220', 12, threeQuality === 'low' ? 40 : 55]} />[m
[31m-      <ambientLight intensity={0.45} />[m
[31m-      <hemisphereLight intensity={0.32} groundColor="#070b14" />[m
[31m-      <directionalLight[m
[31m-        position={[26, 46, 18]}[m
[31m-        intensity={1.28}[m
[31m-        color="#cfe2ff"[m
[31m-        castShadow={threeQuality !== 'low'}[m
[31m-        shadow-mapSize-width={threeQuality === 'high' ? 1024 : 512}[m
[31m-        shadow-mapSize-height={threeQuality === 'high' ? 1024 : 512}[m
[31m-        shadow-camera-near={1}[m
[31m-        shadow-camera-far={120}[m
[31m-        shadow-camera-left={-40}[m
[31m-        shadow-camera-right={40}[m
[31m-        shadow-camera-top={40}[m
[31m-        shadow-camera-bottom={-40}[m
[31m-        shadow-bias={-0.0002}[m
[31m-      />[m
[31m-      <directionalLight position={[-22, 18, -26]} intensity={0.6} color="#7dd3fc" />[m
[32m+[m[32m      <ambientLight intensi