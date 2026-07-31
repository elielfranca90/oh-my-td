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
  hp: number;
  maxHp: number;
  isDestroyed?: boolean;
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
   * Se o disparo é "leve" (sofre o armorFactor do alvo). Era inferido da cor do
   * projétil, o que quebrava ao introduzir variações de cor por especialização.
   */
  isLightShot?: boolean;
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
export type ChallengeMode = 'NORMAL' | 'HARDCORE' | 'MORTE_CERTA';

export interface IChangelogItem {
  version: string;
  title: string;
  date: string;
  badge?: string;
  changes: string[];
}
