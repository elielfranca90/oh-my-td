export interface Vector2D {
  x: number;
  y: number;
}

export type EnemyType =
  | 'STANDARD'
  | 'RUNNER'
  | 'TANK'
  | 'SHIELDED'
  | 'BOSS'
  | 'SPORE_SPRINTER'
  | 'MOSS_GIANT'
  | 'BLACK_MEGA_BOSS';

export interface IEnemy2D {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;
  speed: number;
  goldReward: number;
  waypointIndex: number;
  pathIndex: number;
  position: Vector2D;
  isDead: boolean;
  radius: number;
  color: string;
  armorFactor: number;
  dodgeChance: number;
  // Status Effects
  slowTimer: number;
  slowFactor: number;
  freezeTimer: number;
  sporeBoostTimer?: number;
}

export type TowerType = 'BASIC' | 'CANNON' | 'FROST' | 'ARTILLERY' | 'SOLAR_PRISM';
export type TargetingStrategy = 'FIRST' | 'STRONGEST' | 'WEAKEST' | 'LAST';

/**
 * Especializações escolhidas no salto de nível 2 para 3. Antes toda torre
 * evoluía igual (dano x1.5, alcance x1.15, três níveis), então não existia
 * nenhuma decisão depois de escolher onde construir.
 */
export type TowerSpecialization =
  | 'MULTISHOT'
  | 'PIERCING'
  | 'EXECUTIONER'
  | 'SHRAPNEL'
  | 'DEEP_FREEZE'
  | 'PERMAFROST'
  | 'NAPALM'
  | 'SIEGE'
  | 'FOCUS_LENS'
  | 'CHAIN_BEAM';

export type MapId = 'MAP_1' | 'MAP_2' | 'MAP_3' | 'MAP_4';

export type RogueliteModuleId =
  | 'MIDAS_TOUCH'
  | 'PIERCING_CORE'
  | 'VOLTAIC_OVERCHARGE'
  | 'VAMPIRIC_DRAIN'
  | 'BOUNTY_HUNTER';

export interface IRogueliteModule {
  id: RogueliteModuleId;
  name: string;
  description: string;
  icon: string;
}

export type BiomeHazardType = 'NONE' | 'LAVA_GEYSER' | 'POWER_SURGE' | 'MIST' | 'GRAVEYARD_SOULS';

export interface GeyserTile {
  gridX: number;
  gridY: number;
  isActive: boolean;
  timer: number;
}

export interface BiomeHazardState {
  type: BiomeHazardType;
  geysers: GeyserTile[];
  powerSurgeTiles: { gridX: number; gridY: number }[];
  isMistActive: boolean;
  mistTimer: number;
}

export interface ITower2D {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  range: number;
  damage: number;
  fireRate: number;
  cooldownTimer: number;
  cost: number;
  level: number;
  position: Vector2D;
  targeting: TargetingStrategy;
  specialization?: TowerSpecialization;
  splashRadius?: number;
  slowFactor?: number;
  laserTargetId?: string;
  /** Posição do alvo no último tiro do Solar Prism, para o feixe apontar certo. */
  laserTargetPos?: Vector2D;
  beamDuration?: number;
  onSproutTile?: boolean;
  onDarkAltarTile?: boolean;
  hp: number;
  maxHp: number;
  isDestroyed?: boolean;
  overheatTimer?: number;
  isPowerSurged?: boolean;
  equippedModule?: RogueliteModuleId;
  kills: number;
  /**
   * Snapshot de damage/range/maxHp/splashRadius capturado no instante em que
   * `level` chega a 3, DEPOIS da especialização aplicada (P1_BALANCE_SPEC §1.4).
   * Ranks 4+ recalculam sempre a partir daqui em forma fechada — nunca a
   * partir do valor arredondado do rank anterior (armadilha do floor(), §1.3).
   * Ausente para torres que nunca passaram do nível 3.
   */
  rankBaseline?: { damage: number; range: number; maxHp: number; splashRadius?: number };
}

export interface IProjectile2D {
  id: string;
  targetEnemy?: IEnemy2D;
  targetPosition?: Vector2D;
  damage: number;
  speed: number;
  position: Vector2D;
  color: string;
  radius: number;
  splashRadius?: number;
  slowFactor?: number;
  isCrit?: boolean;
  /**
   * 0..1 — quanto da armadura do alvo o disparo ignora (ver Enemy2D.takeDamage).
   * Era um booleano "isLightShot"; virou contínuo para o Canhão (0.5) e PIERCING
   * (1) terem penetração parcial/total em vez de só ligado/desligado.
   */
  armorPenetration?: number;
  hasHit: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
}

export interface FirePatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  damage: number;
}

export type PlayerActionType =
  | 'BUILD_TOWER'
  | 'UPGRADE_TOWER'
  | 'SELL_TOWER'
  | 'REPAIR_TOWER'
  | 'TARGET_TOWER'
  | 'CAST_METEOR'
  | 'CAST_FREEZE'
  | 'EQUIP_MODULE'
  | 'START_WAVE';

export interface PlayerActionInput {
  tick: number;
  type: PlayerActionType;
  gridX?: number;
  gridY?: number;
  towerType?: TowerType;
  specialization?: TowerSpecialization;
  moduleId?: RogueliteModuleId;
}

export interface MatchReplayData {
  seed: number;
  mapId: MapId;
  challengeMode: ChallengeMode;
  actions: PlayerActionInput[];
  finalWave: number;
  finalScore: number;
}
export type ChallengeMode = 'NORMAL' | 'HARDCORE' | 'MORTE_CERTA';

export interface IChangelogItem {
  version: string;
  title: string;
  date: string;
  badge?: string;
  changes: string[];
}

export interface TalentData {
  damageLvl: number;
  goldLvl: number;
  hpLvl: number;
  cdLvl: number;
  repairLvl: number;
  critLvl: number;
}

export const TileType = {
  BUILDABLE: 0,
  PATH: 1,
  OBSTACLE_MOUNTAIN: 2,
  OBSTACLE_FOREST: 3,
} as const;
export type TileType = typeof TileType[keyof typeof TileType];
