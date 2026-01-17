import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MultiplayerLobby from './MultiplayerLobby';

// Create mock service with callbacks
const onDataCallbacks: any[] = [];
const onConnectCallbacks: any[] = [];
const onPeerErrorCallbacks: any[] = [];
const onServerDisconnectCallbacks: any[] = [];
const onDisconnectCallbacks: any[] = [];
const onReconnectingCallbacks: any[] = [];
const onSyncRequestCallbacks: any[] = [];

const mockMultiplayerService = {
  host: vi.fn(),
  join: vi.fn(),
  send: vi.fn(),
  onData: vi.fn((cb) => { onDataCallbacks.push(cb); return () => {}; }),
  onConnect: vi.fn((cb) => { onConnectCallbacks.push(cb); return () => {}; }),
  onPeerError: vi.fn((cb) => { onPeerErrorCallbacks.push(cb); return () => {}; }),
  onServerDisconnect: vi.fn((cb) => { onServerDisconnectCallbacks.push(cb); return () => {}; }),
  onDisconnect: vi.fn((cb) => { onDisconnectCallbacks.push(cb); return () => {}; }),
  onReconnecting: vi.fn((cb) => { onReconnectingCallbacks.push(cb); return () => {}; }),
  onSyncRequest: vi.fn((cb) => { onSyncRequestCallbacks.push(cb); return () => {}; }),
  disconnect: vi.fn(),
  destroy: vi.fn(),
  // Helper to simulate events
  _simulate: {
    connect: () => {
      onConnectCallbacks.forEach(cb => cb());
    },
    data: (data: any) => onDataCallbacks.forEach(cb => cb(data)),
    peerError: (err: Error) => {
      onPeerErrorCallbacks.forEach(cb => cb(err));
    },
    serverDisconnect: () => onServerDisconnectCallbacks.forEach(cb => cb()),
    disconnect: () => onDisconnectCallbacks.forEach(cb => cb()),
    reconnecting: () => onReconnectingCallbacks.forEach(cb => cb()),
    syncRequest: () => onSyncRequestCallbacks.forEach(cb => cb()),
  }
};

vi.doMock('../services/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

vi.mock('@/services/multiplayerService', () => ({
  multiplayerService: mockMultiplayerService
}));

vi.mock('../i18n/index.tsx', () => ({
  useTranslation: () => ({ 
    t: (key: string) => {
      const translations: Record<string, string> = {
        'battle.multiplayerLobby.peerUnavailable': 'Could not find the opponent. Please check the invite link.',
        'battle.multiplayerLobby.connectionErrorTitle': 'Connection Error',
        'battle.multiplayerLobby.waitingForOpponent': 'Waiting for opponent...',
        'battle.multiplayerLobby.title': 'Multiplayer Lobby',
        'battle.multiplayerLobby.connectingToHost': 'Connecting to host...',
        'battle.multiplayerLobby.waitingForHost': 'Waiting for host...',
        'battle.multiplayerLobby.opponentCrew': 'Opponent Crew',
        'battle.multiplayerLobby.startBattle': 'Start Battle',
        'buttons.returnToCampaign': 'Return to Campaign'
      };
      return translations[key] || key;
    }
  }),
}))

vi.mock('../services/utils/errorHandler', () => ({
  handleError: vi.fn(),
}));

vi.mock('../services/uiService', () => ({
  uiService: {
    showError: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({
  useMultiplayerStore: vi.fn(),
  useCampaignProgressStore: vi.fn(),
  useBattleStore: vi.fn(),
  useCrewStore: vi.fn()
}));

const { useMultiplayerStore, useCampaignProgressStore, useBattleStore, useCrewStore } = await import('@/stores');

describe('MultiplayerLobby', () => {
  const mockCrew = { name: 'Test Crew', members: [{ id: 'char1' }] };
  const mockStartMultiplayerBattle = vi.fn();
  const mockAbortMultiplayerBattle = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset all callback arrays
    onConnectCallbacks.length = 0;
    onDisconnectCallbacks.length = 0;
    onServerDisconnectCallbacks.length = 0;
    onPeerErrorCallbacks.length = 0;
    onDataCallbacks.length = 0;
    onSyncRequestCallbacks.length = 0;
    onReconnectingCallbacks.length = 0;
    
    vi.mocked(useCrewStore).mockReturnValue({ crew: mockCrew });
    vi.mocked(useCampaignProgressStore).mockReturnValue({
      actions: {
        startMultiplayerBattle: mockStartMultiplayerBattle,
        setBattleFromLobby: vi.fn(),
      }
    } as any);
    vi.mocked(useBattleStore).mockReturnValue({ actions: { sendFullBattleSync: vi.fn() } } as any);
  });

  describe('Host View', () => {
    beforeEach(() => {
      vi.mocked(useMultiplayerStore).mockReturnValue({ multiplayerRole: 'host', joinId: null, actions: { abortMultiplayer: mockAbortMultiplayerBattle } });
      vi.mocked(mockMultiplayerService.host).mockResolvedValue('test-host-id');
    });

    it('displays loading, then the join URL', async () => {
      render(<MultiplayerLobby />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument(); // Lucide loader has role="progressbar"

      await waitFor(() => {
        expect(screen.getByDisplayValue(/join=test-host-id/)).toBeInTheDocument();
      });
      expect(screen.getByText('battle.multiplayerLobby.waitingForOpponent')).toBeInTheDocument();
    });

    it('shows opponent crew and enables start button upon connection and crew share', async () => {
      render(<MultiplayerLobby />);
      
      // Simulate guest connecting
      act(() => {
        mockMultiplayerService._simulate.connect();
      });

      await waitFor(() => {
        expect(screen.getByText('battle.multiplayerLobby.opponentCrew')).toBeInTheDocument();
      });
      
      // Start button is disabled initially
      const startButton = screen.getByText('battle.multiplayerLobby.startBattle');
      expect(startButton).toBeDisabled();
      
      // Simulate guest sending their crew data
      const opponentCrew = { name: 'Opponent Crew', members: [{ id: 'opp-char1' }] };
      act(() => {
          mockMultiplayerService._simulate.data({ type: 'CREW_SHARE', payload: opponentCrew });
      });

      // Button should now be enabled
      await waitFor(() => {
        expect(startButton).toBeEnabled();
      });
    });
  });

  describe('Guest View', () => {
    beforeEach(() => {
      vi.mocked(useMultiplayerStore).mockReturnValue({ multiplayerRole: 'guest', joinId: 'test-join-id', actions: { abortMultiplayer: mockAbortMultiplayerBattle } });
      mockMultiplayerService.join.mockResolvedValue(undefined);
    });

    it('shows connecting message and then waits for host', async () => {
      render(<MultiplayerLobby />);
      expect(screen.getByText('Connecting to host...')).toBeInTheDocument();

      // Simulate connection
      act(() => {
        (mockMultiplayerService as any)._simulate.connect();
      });
      
      await waitFor(() => {
        expect(screen.getByText('battle.multiplayerLobby.waitingForHost')).toBeInTheDocument();
      });
      expect(screen.queryByText('battle.multiplayerLobby.startBattle')).not.toBeInTheDocument();
    });
  });

  describe('Error View', () => {
    it('displays an error message on connection error', async () => {
      vi.mocked(useMultiplayerStore).mockReturnValue({ multiplayerRole: 'guest', joinId: 'test-join-id', actions: { abortMultiplayer: mockAbortMultiplayerBattle } });
      vi.mocked(mockMultiplayerService.join).mockRejectedValue(new Error('peer-unavailable'));

      render(<MultiplayerLobby />);

      await waitFor(() => {
          expect(screen.getByText('Connection Error')).toBeInTheDocument();
          expect(screen.getByText('Could not find the opponent. Please check the invite link.')).toBeInTheDocument();
      });
    });
  });
});