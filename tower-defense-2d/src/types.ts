export interface Vector2D {
  x: number;
  y: number;
}

export type EnemyType = 'STANDARD' | 'RUNNER' | 'TANK' | 'BOSS';

export interface IEnemy2D {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  goldReward: number;
  waypointIndex: number;
  position: Vector2D;
  isDead: boolean;
  radius: number;
  color: string;
  // Status Effects
  slowTimer: number;
  slowFactor: number;
  freezeTimer: number;
}

export type TowerType = 'BASIC' | 'CANNON' | 'FROST' | 'ARTILLERY';
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
