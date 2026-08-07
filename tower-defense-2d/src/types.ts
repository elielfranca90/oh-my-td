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
  | 'MOSS_GIANT';

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
  splashRadius?: number;
  slowFactor?: number;
  laserTargetId?: string;
  beamDuration?: number;
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
