
// This file centralizes preloading logic for lazy-loaded components.

export const preloadMainMenu = () => import('@/components/MainMenu');
export const preloadCrewCreator = () => import('@/components/CrewCreator');
export const preloadCampaignDashboard = () => import('@/components/CampaignDashboard');
export const preloadBattleView = () => import('@/components/battle/BattleView');
export const preloadMultiplayerLobby = () => import('@/components/MultiplayerLobby');
export const preloadPostBattleSequence = () => import('@/components/PostBattleSequence');
export const preloadSaveGameModal = () => import('@/components/modals/SaveGameModal');
export const preloadLoadGameModal = () => import('@/components/modals/LoadGameModal');
export const preloadPreBattleBriefing = () => import('@/components/PreBattleBriefing');
