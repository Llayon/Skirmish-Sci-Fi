import Peer, { DataConnection } from 'peerjs';
import type { PeerJSOption } from 'peerjs';
import { MultiplayerMessage, Crew, Battle, PlayerAction, Position, CharacterStats, ActiveEffect, ParticipantStatus, CharacterWeapon, Injury, TaskType, Character, Enemy, BattleParticipant, Terrain, Mission, BattlePhase, ReactionRollResult, LogEntry } from '../types';
import { logger } from './utils/logger';

// --- START: DATA VALIDATION ---
const isObject = (v: any): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: any): v is string => typeof v === 'string';
const isNumber = (v: any): v is number => typeof v === 'number';
const isBoolean = (v: any): v is boolean => typeof v === 'boolean';
const isArray = (v: any): v is any[] => Array.isArray(v);
const isStringOrUndefined = (v: any): v is string | undefined => isString(v) || v === undefined;
const isNumberOrUndefined = (v: any): v is number | undefined => isNumber(v) || v === undefined;
const isBooleanOrUndefined = (v: any): v is boolean | undefined => isBoolean(v) || v === undefined;
const isArrayOf = <T>(v: any, check: (item: any) => item is T): v is T[] => isArray(v) && v.every(check);

const isPosition = (obj: any): obj is Position => isObject(obj) && isNumber(obj.x) && isNumber(obj.y);
const isPositionOrUndefined = (v: any): v is Position | undefined => isPosition(v) || v === undefined;
const isCharacterStats = (obj: any): obj is CharacterStats => isObject(obj) && ['reactions', 'speed', 'combat', 'toughness', 'luck', 'savvy'].every(k => isNumber(obj[k]));
const isCharacterStatsOrUndefined = (v: any): v is Partial<CharacterStats> | undefined => isObject(v) || v === undefined;
const isActiveEffect = (obj: any): obj is ActiveEffect => isObject(obj) && isString(obj.sourceId) && isString(obj.sourceName) && isNumber(obj.duration) && isCharacterStatsOrUndefined(obj.statModifiers) && isPositionOrUndefined(obj.fleeFrom) && isNumberOrUndefined(obj.fleeDistance) && isBooleanOrUndefined(obj.preventMovement);
const isCharacterWeapon = (obj: any): obj is CharacterWeapon => isObject(obj) && isString(obj.instanceId) && isString(obj.weaponId) && isStringOrUndefined(obj.modId) && isStringOrUndefined(obj.sightId);
const isInjury = (obj: any): obj is Injury => isObject(obj) && isString(obj.id) && isString(obj.effect) && isNumber(obj.recoveryTurns);
const participantStatusValues = ['active', 'stunned', 'casualty', 'dazed'];
const isParticipantStatus = (v: any): v is ParticipantStatus => isString(v) && participantStatusValues.includes(v);
const taskTypeValues = ['idle', 'search_rumors', 'trade', 'train', 'heal', 'find_patron', 'recruit', 'explore', 'track_rival', 'repair', 'decoy_rival'];
const isTaskType = (v: any): v is TaskType => isString(v) && taskTypeValues.includes(v);

const isBaseParticipant = (obj: any): boolean => {
    return isObject(obj) &&
        isString(obj.id) &&
        isCharacterStats(obj.stats) &&
        isArrayOf(obj.weapons, isCharacterWeapon) &&
        isStringOrUndefined(obj.armor) &&
        isStringOrUndefined(obj.screen) &&
        isPosition(obj.position) &&
        isParticipantStatus(obj.status) &&
        isNumber(obj.actionsRemaining) &&
        isObject(obj.actionsTaken) && isBoolean(obj.actionsTaken.move) && isBoolean(obj.actionsTaken.combat) && isBoolean(obj.actionsTaken.dash) && isBoolean(obj.actionsTaken.interact) &&
        isNumber(obj.stunTokens) &&
        isNumber(obj.currentLuck) &&
        isArrayOf(obj.activeEffects, isActiveEffect) &&
        isNumber(obj.consumablesUsedThisTurn) &&
        isArrayOf(obj.consumables, isString) &&
        isBooleanOrUndefined(obj.deflectorFieldUsedThisBattle) &&
        isArrayOf(obj.utilityDevices, isString) &&
        isArrayOf(obj.utilityDevicesUsed ?? [], isString) &&
        isArrayOf(obj.inoperableWeapons ?? [], isString) &&
        isStringOrUndefined(obj.lastTargetId);
};

const isCharacter = (obj: any): obj is Character => {
    return isBaseParticipant(obj) &&
        isString(obj.name) &&
        isString(obj.pronouns) &&
        isString(obj.backgroundId) &&
        isString(obj.motivationId) &&
        isString(obj.classId) &&
        isNumber(obj.xp) &&
        isArrayOf(obj.implants, isString) &&
        isString(obj.backstory) &&
        isNumber(obj.upgradesAvailable) &&
        isArrayOf(obj.injuries, isInjury) &&
        isTaskType(obj.task) &&
        isBooleanOrUndefined(obj.isUnavailableForTasks) &&
        isBooleanOrUndefined(obj.justRecovered) &&
        isBooleanOrUndefined(obj.geneticKitDiscount) &&
        isBooleanOrUndefined(obj.nanoDocProtection);
};

const isEnemy = (obj: any): obj is Enemy => {
    return isBaseParticipant(obj) &&
        isString(obj.ai) &&
        isStringOrUndefined(obj.name) &&
        isStringOrUndefined(obj.guardedBy);
};

const isBattleParticipant = (obj: any): obj is BattleParticipant => {
    if (!isObject(obj) || !isString(obj.type)) return false;
    if (obj.type === 'character') return isCharacter(obj);
    if (obj.type === 'enemy') return isEnemy(obj);
    return false;
};

const isCrew = (obj: any): obj is Crew => {
    return isObject(obj) && isString(obj.name) && isArrayOf(obj.members, isCharacter);
};

const isTerrain = (obj: any): obj is Terrain => {
    return isObject(obj) &&
        isString(obj.id) &&
        isString(obj.type) &&
        isString(obj.name) &&
        isPosition(obj.position) &&
        isObject(obj.size) && isNumber(obj.size.width) && isNumber(obj.size.height) &&
        isBoolean(obj.isDifficult) &&
        isBoolean(obj.providesCover) &&
        isBoolean(obj.blocksLineOfSight) &&
        isBoolean(obj.isImpassable) &&
        isBooleanOrUndefined(obj.isInteractive) &&
        isStringOrUndefined(obj.parentId);
};

const isLogEntryObject = (obj: any): obj is LogEntry => {
    return isObject(obj) && isString(obj.key) && (obj.params === undefined || isObject(obj.params)) && (obj.source === undefined || isString(obj.source));
}

const isMission = (obj: any): obj is Mission => {
    return isObject(obj) &&
        isString(obj.type) &&
        isString(obj.titleKey) &&
        isString(obj.descriptionKey) &&
        isString(obj.status);
};

const isReactionRollResult = (obj: any): obj is ReactionRollResult => isObject(obj) && isNumber(obj.roll) && isBoolean(obj.success);

const isBattle = (obj: any): obj is Battle => {
    const multiplayerRoleValues = ['host', 'guest'];
    return isObject(obj) &&
        isString(obj.id) &&
        isArrayOf(obj.participants, isBattleParticipant) &&
        isObject(obj.gridSize) && isNumber(obj.gridSize.width) && isNumber(obj.gridSize.height) &&
        isArrayOf(obj.terrain, isTerrain) &&
        isMission(obj.mission) &&
        isArray(obj.log) && obj.log.every((entry: any) => isString(entry) || isLogEntryObject(entry)) &&
        isNumber(obj.round) &&
        isString(obj.phase) &&
        isArrayOf(obj.quickActionOrder, isString) &&
        isArrayOf(obj.slowActionOrder, isString) &&
        isObject(obj.reactionRolls) && Object.values(obj.reactionRolls).every(isReactionRollResult) &&
        isBoolean(obj.reactionRerollsUsed) &&
        (isString(obj.activeParticipantId) || obj.activeParticipantId === null) &&
        isNumber(obj.currentTurnIndex) &&
        isArrayOf(obj.enemyTurnOrder, isString) &&
        (isObject(obj.followUpState) || obj.followUpState === null) &&
        (obj.firstPlayerRole === undefined || (isString(obj.firstPlayerRole) && multiplayerRoleValues.includes(obj.firstPlayerRole))) &&
        (obj.activePlayerRole === undefined || obj.activePlayerRole === null || (isString(obj.activePlayerRole) && multiplayerRoleValues.includes(obj.activePlayerRole)));
};

const isPlayerActionPayload = (type: string, payload: any): boolean => {
    if (!isObject(payload)) return false;
    switch(type) {
        case 'move':
        case 'follow_up_move':
            return isString(payload.characterId) && isPosition(payload.position) && isBoolean(payload.isDash);
        case 'shoot':
            return isString(payload.characterId) && isString(payload.targetId) && isString(payload.weaponInstanceId) && isBoolean(payload.isAimed);
        case 'brawl':
            return isString(payload.characterId) && isString(payload.targetId) && isStringOrUndefined(payload.weaponInstanceId);
        case 'use_consumable':
            return isString(payload.characterId) && isString(payload.consumableId);
        case 'use_utility_device':
            return isString(payload.characterId) && isString(payload.deviceId) && isStringOrUndefined(payload.targetId) && isPositionOrUndefined(payload.position);
        case 'interact':
            return isString(payload.characterId) && isStringOrUndefined(payload.targetId) && isPositionOrUndefined(payload.position);
        case 'end_turn':
            return isString(payload.characterId);
        case 'roll_initiative':
        case 'advance_phase':
             return isObject(payload);
        default: return false;
    }
}

const isPlayerAction = (obj: any): obj is PlayerAction => {
    return isObject(obj) && isString(obj.type) && isPlayerActionPayload(obj.type, obj.payload);
}

const isMultiplayerMessage = (obj: any): obj is MultiplayerMessage => {
    if (!isObject(obj) || !isString(obj.type)) return false;
    switch (obj.type) {
        case 'CREW_SHARE': return isCrew(obj.payload);
        case 'START_BATTLE': return isBattle(obj.payload);
        case 'PLAYER_ACTION': return isPlayerAction(obj.payload);
        case 'BATTLE_UPDATE': return isBattle(obj.payload);
        case 'PING': return true;
        case 'PONG': return true;
        case 'REQUEST_SYNC': return true;
        default: return false;
    }
}
// --- END: DATA VALIDATION ---

class RobustMultiplayerService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private messageQueue: MultiplayerMessage[] = [];
  private maxQueueSize = 50;
  
  // New members for rate limiting
  private sentMessagesTimestamps: number[] = [];
  private readonly rateLimit = 10; // messages per second
  private readonly rateLimitWindow = 1000; // 1 second in ms

  private onDataCallbacks: ((data: MultiplayerMessage) => void)[] = [];
  private onConnectCallbacks: (() => void)[] = [];
  private onDisconnectCallbacks: (() => void)[] = [];
  private onPeerErrorCallbacks: ((error: Error) => void)[] = [];
  private onServerDisconnectCallbacks: (() => void)[] = [];
  private onReconnectingCallbacks: (() => void)[] = [];
  private onSyncRequestCallbacks: (() => void)[] = [];
  
  private isReconnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;

  private heartbeatInterval: any = null;
  private syncInterval: any = null;
  private lastReceivedPong = 0;
  private lastSentPing = 0;
  
  private peerId: string | null = null;
  private hostIdForGuest: string | null = null;

  constructor() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleBeforeUnload = (): void => {
    this.disconnect();
  };

  private initializePeer(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.id) {
          return resolve(this.peer.id);
        }
      } else if (this.peer) {
        this.peer.destroy();
      }

      const peerOptions = {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 2,
      };

      const newPeer = new Peer(undefined, peerOptions);
      this.peer = newPeer;
      
      const onOpen = (id: string) => {
        this.peerId = id;
        (newPeer as any).removeListener('error', onError);

        if (this.hostIdForGuest && this.isReconnecting) {
          logger.info("Reconnected to PeerJS server, now attempting to reconnect to host peer...");
          const connection = this.peer!.connect(this.hostIdForGuest, { reliable: true });
          this.setupConnection(connection);
        }
        
        (newPeer as any).on('error', (err: any) => {
            logger.error('PeerJS runtime error:', err);
            this.onPeerErrorCallbacks.forEach(cb => cb(err));
            this.startReconnecting();
        });
        
        (newPeer as any).on('disconnected', () => {
          this.onServerDisconnectCallbacks.forEach(cb => cb());
          this.startReconnecting();
        });

        resolve(id);
      };
      
      const onError = (err: Error) => {
        logger.error('PeerJS initialization error:', err);
        (newPeer as any).removeListener('open', onOpen);
        reject(err);
      };

      (newPeer as any).once('open', onOpen);
      (newPeer as any).once('error', onError);
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
        if (!this.conn || !this.conn.open) {
            this.startReconnecting();
            return;
        }
        if (this.lastSentPing > 0 && Date.now() - this.lastReceivedPong > 15000) {
             logger.warn("Heartbeat timeout. Connection might be stale. Starting reconnect.");
             this.startReconnecting();
             return;
        }
        this.send({ type: 'PING' });
        this.lastSentPing = Date.now();
    }, 5000);
  }

  private stopHeartbeat() {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.lastSentPing = 0;
  }

  private startSyncInterval() {
    this.stopSyncInterval();
    this.syncInterval = setInterval(() => {
        if (this.conn && this.conn.open) {
            this.send({ type: 'REQUEST_SYNC' });
        } else {
            this.stopSyncInterval();
        }
    }, 60000); // Every 60 seconds
  }

  private stopSyncInterval() {
    clearInterval(this.syncInterval);
    this.syncInterval = null;
  }

  private startReconnecting() {
    if (this.isReconnecting) return;

    logger.info("Starting reconnection process...");
    this.isReconnecting = true;
    this.stopHeartbeat();
    this.stopSyncInterval();
    this.onReconnectingCallbacks.forEach(cb => cb());
    
    if(this.peer) this.peer.destroy();
    this.peer = null;
    this.conn = null;
    
    this.attemptReconnect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error("Max reconnection attempts reached. Connection failed.");
        this.onPeerErrorCallbacks.forEach(cb => cb(new Error('connection-failed')));
        this.disconnect();
        return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    logger.info(`Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
        if (this.hostIdForGuest) { // Guest
            this.join(this.hostIdForGuest).catch(() => this.attemptReconnect());
        } else { // Host
            this.host().catch(() => this.attemptReconnect());
        }
    }, delay);
  }

  private onSuccessfulReconnect() {
      logger.info("Reconnection successful.");
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
  }

  private setupConnection(connection: DataConnection) {
    this.conn = connection;

    (connection as any).on('open', () => {
      this.onSuccessfulReconnect();
      
      if (this.messageQueue.length > 0) {
        logger.info(`Connection established. Sending ${this.messageQueue.length} buffered messages.`);
        this.messageQueue.forEach(msg => this.conn?.send(msg));
        this.messageQueue = [];
      }
      
      this.onConnectCallbacks.forEach(cb => cb());
      
      if (this.hostIdForGuest) { // I am a guest
        this.send({ type: 'REQUEST_SYNC' });
        this.startSyncInterval();
      } else { // I am a host
        this.lastReceivedPong = Date.now();
        this.startHeartbeat();
      }
    });

    (connection as any).on('data', (data: any) => {
      if (!isMultiplayerMessage(data)) {
        logger.warn('Received invalid multiplayer message from peer, discarding:', data);
        return;
      }

      const message = data as MultiplayerMessage;

      if (this.hostIdForGuest) { // Guest logic
        if (message.type === 'PING') {
          this.send({ type: 'PONG' });
          return;
        }
      } else { // Host logic
        if (message.type === 'PONG') {
          this.lastReceivedPong = Date.now();
          return;
        }
        if (message.type === 'REQUEST_SYNC') {
          this.onSyncRequestCallbacks.forEach(cb => cb());
          return;
        }
      }
      this.onDataCallbacks.forEach(cb => cb(message));
    });

    (connection as any).on('close', () => {
      this.onDisconnectCallbacks.forEach(cb => cb());
      this.startReconnecting();
    });

    (connection as any).on('error', (err: any) => {
      this.onPeerErrorCallbacks.forEach(cb => cb(err));
      this.startReconnecting();
    });
  }

  public async host(): Promise<string> {
    const peerId = await this.initializePeer();
    (this.peer! as any).on('connection', (connection: DataConnection) => {
      if (this.conn && this.conn.open) {
        connection.close();
        return;
      }
      this.setupConnection(connection);
    });
    return peerId;
  }

  public async join(hostId: string): Promise<void> {
    this.hostIdForGuest = hostId;
    await this.initializePeer();
    const connection = this.peer!.connect(hostId, { reliable: true });
    this.setupConnection(connection);
  }

  public send(data: MultiplayerMessage) {
    // --- Rate Limiting ---
    const now = Date.now();
    this.sentMessagesTimestamps = this.sentMessagesTimestamps.filter(
        timestamp => now - timestamp < this.rateLimitWindow
    );

    if (this.sentMessagesTimestamps.length >= this.rateLimit) {
        logger.warn('Rate limit exceeded. Message dropped:', data.type);
        return;
    }
    
    // --- Message Size Warning ---
    const messageSize = JSON.stringify(data).length;
    const sizeLimit = 1024 * 512; // 512 KB warning threshold
    if (messageSize > sizeLimit) {
        logger.warn(`Sending a large message (${(messageSize / 1024).toFixed(2)} KB). Type: ${data.type}. Consider optimizing.`);
    }

    this.sentMessagesTimestamps.push(now);
    
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } else {
      logger.warn('No active connection. Buffering message:', data.type);
      if (this.messageQueue.length >= this.maxQueueSize) {
        this.messageQueue.shift();
        logger.warn('Message queue full. Discarding oldest message.');
      }
      this.messageQueue.push(data);
    }
  }
  
  public onData(callback: (data: MultiplayerMessage) => void): () => void { this.onDataCallbacks.push(callback); return () => { this.onDataCallbacks = this.onDataCallbacks.filter(cb => cb !== callback); }; }
  public onConnect(callback: () => void): () => void { this.onConnectCallbacks.push(callback); return () => { this.onConnectCallbacks = this.onConnectCallbacks.filter(cb => cb !== callback); }; }
  public onDisconnect(callback: () => void): () => void { this.onDisconnectCallbacks.push(callback); return () => { this.onDisconnectCallbacks = this.onDisconnectCallbacks.filter(cb => cb !== callback); }; }
  public onPeerError(callback: (error: Error) => void): () => void { this.onPeerErrorCallbacks.push(callback); return () => { this.onPeerErrorCallbacks = this.onPeerErrorCallbacks.filter(cb => cb !== callback); }; }
  public onServerDisconnect(callback: () => void): () => void { this.onServerDisconnectCallbacks.push(callback); return () => { this.onServerDisconnectCallbacks = this.onServerDisconnectCallbacks.filter(cb => cb !== callback); }; }
  public onReconnecting(callback: () => void): () => void { this.onReconnectingCallbacks.push(callback); return () => { this.onReconnectingCallbacks = this.onReconnectingCallbacks.filter(cb => cb !== callback); }; }
  public onSyncRequest(callback: () => void): () => void { this.onSyncRequestCallbacks.push(callback); return () => { this.onSyncRequestCallbacks = this.onSyncRequestCallbacks.filter(cb => cb !== callback); }; }
  
  public disconnect() {
    this.stopHeartbeat();
    this.stopSyncInterval();
    clearTimeout(this.reconnectTimer);
    this.conn?.close();
    this.peer?.destroy();
    this.peer = null;
    this.conn = null;
    this.messageQueue = [];
    this.onDataCallbacks = [];
    this.onConnectCallbacks = [];
    this.onDisconnectCallbacks = [];
    this.onPeerErrorCallbacks = [];
    this.onServerDisconnectCallbacks = [];
    this.onReconnectingCallbacks = [];
    this.onSyncRequestCallbacks = [];
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
}

export const multiplayerService = new RobustMultiplayerService();
