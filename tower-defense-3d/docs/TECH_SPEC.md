# ⚙️ Especificação Técnica (Tech Spec) - Engine 2D

---

## 1. Mapeamento Matemático & Algoritmos

### Coordenadas do Grid para o Tela 2D
Dado o índice do tile na grade $(col, row)$ e o tamanho do bloco $S_{tile} = 60px$, a posição central em pixels é:

$$X_{pixel} = col \cdot S_{tile} + \frac{S_{tile}}{2}$$

$$Y_{pixel} = row \cdot S_{tile} + \frac{S_{tile}}{2}$$

---

### Algoritmo de Movimentação por Waypoints Sem Perda de Quadro (*Precise Corner Turning*)
Para evitar desvios e sobreposições nas curvas mesmo em altas velocidades, o movimento consome a distância restante quadro a quadro:

$$\text{distancia} = \sqrt{(X_{alvo} - X_{atual})^2 + (Y_{alvo} - Y_{atual})^2}$$

Se $distancia \le velocidadeRestante$:
1. $Posicao_{atual} \leftarrow Posicao_{alvo}$
2. $Index_{waypoint} \leftarrow Index_{waypoint} + 1$
3. $velocidadeRestante \leftarrow velocidadeRestante - distancia$
4. Repete para o próximo segmento enquanto $velocidadeRestante > 0$.

---

### Escalonamento Procedural no Modo Infinito (*Endless Scaling*)
Após a Onda 10, a quantidade de inimigos $C_{inimigos}$ e o multiplicador de HP $M_{hp}$ escalam por:

$$C_{inimigos} = 12 + \lfloor (N_{onda} - 10) \times 2 \rfloor$$

$$M_{hp} = 1.12^{(N_{onda} - 10)}$$

$$\text{Qtd Bosses} = \lfloor \frac{N_{onda} - 10}{3} \rfloor + 1$$

---

## 2. Modelagem de Interfaces (TypeScript)

```typescript
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
  onSproutTile?: boolean;
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
  hasHit: boolean;
}

export interface TalentData {
  damageLvl: number;
  goldLvl: number;
  hpLvl: number;
  cdLvl: number;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  rewardStars: number;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  icon: string;
}
```
