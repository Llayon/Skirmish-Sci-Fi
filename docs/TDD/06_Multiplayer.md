# 06. Multiplayer

[← Назад](./README.md)

---

## Архитектура

Мультиплеер реализован через **WebRTC** с использованием **PeerJS**.

```mermaid
sequenceDiagram
    participant H as Host
    participant P as PeerJS Server
    participant G as Guest
    
    H->>P: Create Peer (get ID)
    H-->>G: Share Peer ID
    G->>P: Connect to Host ID
    P->>H: Connection established
    
    loop Game Loop
        H->>G: Battle state update
        G->>H: Player action
        H->>H: Process action
        H->>G: New state
    end
```

---

## MultiplayerStore

```typescript
// stores/multiplayerStore.ts
interface MultiplayerState {
  peer: Peer | null;
  connection: DataConnection | null;
  role: 'host' | 'guest' | null;
  peerId: string | null;
  isConnected: boolean;
  
  actions: {
    initAsHost: () => Promise<string>;
    connectAsGuest: (hostId: string) => Promise<void>;
    sendAction: (action: PlayerAction) => void;
    disconnect: () => void;
  };
}
```

---

## Синхронизация

### Host → Guest
- Отправляет полное состояние `Battle`
- После каждого действия

### Guest → Host
- Отправляет только `PlayerAction`
- Host валидирует и применяет

```typescript
type MultiplayerMessage =
  | { type: 'battle_state'; payload: Battle }
  | { type: 'player_action'; payload: PlayerAction }
  | { type: 'sync_request' }
  | { type: 'game_over'; winner: 'host' | 'guest' };
```

---

## Turn Management

```mermaid
graph LR
    A[Host Phase] --> B{Guest's turn?}
    B -->|Yes| C[Wait for Guest action]
    B -->|No| D[Host acts]
    C --> E[Apply action]
    D --> E
    E --> F[Send state to Guest]
    F --> A
```

---

[← Components](./05_Components.md) | [Далее: Testing →](./07_Testing.md)
