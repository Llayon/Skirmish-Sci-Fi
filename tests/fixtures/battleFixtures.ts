
import { Battle, BattleParticipant, Terrain, Mission } from '@/types/battle';
import { Character, Enemy, CharacterStats, Position } from '@/types/character';

const DEFAULT_STATS: CharacterStats = {
  reactions: 1,
  speed: 4,
  combat: 1,
  toughness: 4,
  savvy: 0,
  luck: 0,
};

type CharacterOverrides = { id: string; position: Position } & Omit<Partial<Character>, 'type' | 'stats'> & { stats?: Partial<CharacterStats> };
type EnemyOverrides = { id: string; position: Position } & Omit<Partial<Enemy>, 'type' | 'stats'> & { stats?: Partial<CharacterStats> };

export const createTestCharacter = (overrides: CharacterOverrides): BattleParticipant => {
  const base: Omit<Character, 'type'> = {
    id: overrides.id,
    name: 'Test Char',
    pronouns: 'they/them',
    raceId: 'baseline_human',
    backgroundId: 'industrial',
    motivationId: 'survival',
    classId: 'ganger',
    xp: 0,
    consumables: [],
    weapons: [],
    implants: [],
    utilityDevices: [],
    backstory: 'Fixture',
    injuries: [],
    task: 'idle',
    status: 'active',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    stunTokens: 0,
    currentLuck: 0,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    position: overrides.position,
    stats: {
      ...DEFAULT_STATS,
      ...(overrides.stats ?? {}),
    },
  };

  return {
    ...base,
    ...overrides,
    stats: {
      ...DEFAULT_STATS,
      ...(overrides.stats ?? {}),
    },
    type: 'character',
  };
};

export const createTestEnemy = (overrides: EnemyOverrides): BattleParticipant => {
  const base: Omit<Enemy, 'type'> = {
    id: overrides.id,
    name: 'Test Enemy',
    ai: 'Aggressive',
    weapons: [],
    consumables: [],
    utilityDevices: [],
    panicRange: [0, 0],
    isFearless: false,
    status: 'active',
    actionsRemaining: 2,
    actionsTaken: { move: false, combat: false, dash: false, interact: false },
    stunTokens: 0,
    currentLuck: 0,
    activeEffects: [],
    consumablesUsedThisTurn: 0,
    position: overrides.position,
    stats: {
      ...DEFAULT_STATS,
      ...(overrides.stats ?? {}),
    },
  };

  return {
    ...base,
    ...overrides,
    stats: {
      ...DEFAULT_STATS,
      ...(overrides.stats ?? {}),
    },
    type: 'enemy',
  };
};

export const createCoverTerrain = (position: Position, size = { width: 1, height: 1 }): Terrain => ({
  id: `cover_${position.x}_${position.y}`,
  name: 'Cover',
  type: 'Individual',
  position,
  size,
  isDifficult: false,
  providesCover: true,
  blocksLineOfSight: false,
  isImpassable: false,
});

export const createMinimalBattle = (config: {
  participants: BattleParticipant[];
  terrain?: Terrain[];
  gridSize?: { width: number; height: number };
  missionType?: Mission['type'];
}): Battle => {
  const characterIds = config.participants.filter(p => p.type === 'character').map(p => p.id);

  return {
    id: 'test_battle',
    participants: config.participants,
    gridSize: config.gridSize ?? { width: 20, height: 20 },
    terrain: config.terrain ?? [],
    mission: {
      type: config.missionType ?? 'Patrol',
      titleKey: 'mission.test',
      descriptionKey: 'mission.desc',
      status: 'in_progress',
    } as unknown as Mission,
    log: [],
    round: 1,
    phase: 'quick_actions',
    difficulty: 'normal',
    reactionRolls: {},
    reactionRerollsUsed: false,
    quickActionOrder: characterIds,
    slowActionOrder: characterIds,
    enemyTurnOrder: config.participants.filter(p => p.type === 'enemy').map(p => p.id),
    activeParticipantId: config.participants[0]?.id ?? null,
    currentTurnIndex: 0,
    followUpState: null,
    enemiesLostThisRound: 0,
    heldTheField: false,
  };
};
