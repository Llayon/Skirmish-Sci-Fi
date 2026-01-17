import { describe, it, expect, vi, beforeEach } from 'vitest';
import Peer from 'peerjs';
import { multiplayerService as serviceInstance } from './multiplayerService';

// Mock the PeerJS library
vi.mock('peerjs');
const PeerMock = vi.mocked(Peer);

describe('RobustMultiplayerService', () => {
    let multiplayerService: typeof serviceInstance;

    beforeEach(async () => {
        // Since multiplayerService is a singleton, we need to ensure it's reset.
        multiplayerService = (await import('./multiplayerService')).multiplayerService;
        multiplayerService.disconnect(); // Ensure clean state
        vi.clearAllMocks();
    });

    it('should buffer messages when send is called while disconnected', () => {
        // @ts-expect-error - accessing private member for test
        expect(multiplayerService.messageQueue).toHaveLength(0);

        multiplayerService.send({ type: 'PING' });
        
        // @ts-expect-error - accessing private member for test
        expect(multiplayerService.messageQueue).toHaveLength(1);
        // @ts-expect-error - accessing private member for test
        expect(multiplayerService.messageQueue[0].type).toBe('PING');
    });

    it('should flush the message queue upon successful connection', () => {
        const mockConn = {
            on: vi.fn((event, cb) => {
                if (event === 'open') {
                    // Manually trigger open to simulate connection
                    setTimeout(cb, 0);
                }
            }),
            send: vi.fn(),
            open: true, // Simulate it's open after 'open' event
            close: vi.fn(), // Add mock for close to prevent errors in subsequent cleanup
        };

        // Buffer a message first
        multiplayerService.send({ type: 'PLAYER_ACTION', payload: {} as any });
        
        // @ts-expect-error - private method access
        multiplayerService.setupConnection(mockConn);

        return new Promise(resolve => {
            setTimeout(() => {
                expect(mockConn.send).toHaveBeenCalledWith({ type: 'PLAYER_ACTION', payload: {} });
                // @ts-expect-error - accessing private member for test
                expect(multiplayerService.messageQueue).toHaveLength(0);
                resolve(null);
            }, 10);
        });
    });
    
    it('should not let the message queue exceed the max size', () => {
        // @ts-expect-error - private member access
        const maxSize = multiplayerService.maxQueueSize;
        
        for (let i = 0; i < maxSize + 5; i++) {
            multiplayerService.send({ type: 'PING', payload: i } as any);
        }

        // @ts-expect-error - accessing private member for test
        expect(multiplayerService.messageQueue).toHaveLength(maxSize);
        // Check that the first 5 messages were discarded
        // @ts-expect-error - accessing private member for test
        expect(multiplayerService.messageQueue[0].payload).toBe(5);
    });
});