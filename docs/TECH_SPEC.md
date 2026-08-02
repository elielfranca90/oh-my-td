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

### Simulação Físico-Matemática com Timestep Fixo e Sub-stepping
Para garantir determinismo e independência da taxa de atualização do monitor (ex: 60Hz, 120Hz, 144Hz) e ao acelerar a velocidade do jogo ($2\times$ ou $4\times$), a simulação divide cada frame renderizado em sub-passos fixos ($\Delta t_{fixed} = \frac{1}{60}s$):

$$N_{substeps} = \text{gameSpeed}$$

$$\Delta t_{step} = \frac{\Delta t_{fixed}}{N_{substeps}}$$

A cada sub-passo, a posição dos projéteis, colisão de hits e waypoints dos inimigos são atualizados iterativamente, evitando o efeito *tunnelling* (atravessar alvos em velocidades elevadas).

---

### Gerador de Números Pseudo-Aleatórios Semeado (Seeded RNG - Mulberry32)
Para permitir partidas determinísticas e testes headless de balanceamento, a geração de números aleatórios utiliza a fórmula de dispersão de 32 bits (*Mulberry32*):

$$a \leftarrow a + 0\text{x}6\text{D}2\text{B}7\text{9}F5$$
$$t \leftarrow (a \oplus (a \gg 15)) \times (t \mid 1)$$
$$t \leftarrow t \oplus (t + (t \oplus (t \gg 7)) \times (t \mid 61))$$
$$\text{RNG}(seed) = \frac{t \oplus (t \gg 14)}{4294967296}$$

---

### Modos de Desafio & Fatores da Campanha

| Modo Desafio | Multiplicador HP Inimigo | HP Inicial da Base | Ouro Inicial |
| :--- | :--- | :--- | :--- |
| **NORMAL** | $1.0\times$ | $20$ HP | $200$g |
| **HARDCORE** | $1.25\times$ (+25%) | $10$ HP | $150$g |
| **MORTE CERTA** | $1.50\times$ (+50%) | $1$ HP (1 erro = derrota) | $120$g |

* **Modo Campanha:** Vitória garantida ao concluir a Onda 20 (derrotando o Chefão Final `BLACK_MEGA_BOSS`), com exibição de modal de comemoração e encerramento de pontuação da campanha.

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
  slowTimer: number;
  slowFactor: number;
  freezeTimer: number;
  sporeBoostTimer?: number;
}

export type TowerType = 'BASIC' | 'CANNON' | 'FROST' | 'ARTILLERY' | 'SOLAR_PRISM';
export type SpecializationPath = 'PATH_A' | 'PATH_B';
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
  specialization?: SpecializationPath;
  specializationName?: string;
}

export type ChallengeMode = 'NORMAL' | 'HARDCORE' | 'MORTE_CERTA';

export interface GameState {
  isCampaignMode: boolean;
  challengeMode: ChallengeMode;
  wave: number;
  gold: number;
  health: number;
  maxHealth: number;
  score: number;
  gameSpeed: number;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
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

---

## 3. Modelo de Banco de Dados (Supabase Integration)

### Tabela `profiles`
* `id` (uuid, PK, ref `auth.users`)
* `display_name` (text)
* `created_at` (timestamptz)
* `total_stars` (integer)

### Tabela `leaderboard` / `high_scores`
* `id` (uuid, PK)
* `player_id` (uuid, FK `profiles.id`)
* `player_name` (text)
* `score` (integer)
* `wave` (integer)
* `map_id` (text)
* `created_at` (timestamptz)

### Tabela `player_achievements`
* `id` (uuid, PK)
* `player_id` (uuid, FK `profiles.id`)
* `achievement_id` (text)
* `unlocked_at` (timestamptz)
