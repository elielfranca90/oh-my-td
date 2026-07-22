# ⚙️ Especificação Técnica (Tech Spec)

---

## 1. Mapeamento Matemático

### Coordenadas da Grade para o Mundo 3D
Dado o índice do tile $(x, z)$ e o tamanho do bloco $S_{tile}$, a posição tridimensional é definida por:

$$X_{world} = x \cdot S_{tile}$$

$$Z_{world} = z \cdot S_{tile}$$

### Cálculo de Alcance (Targeting)
A detecção de inimigos utiliza a distância euclidiana no plano XZ:

$$d = \sqrt{(X_{inimigo} - X_{torre})^2 + (Z_{inimigo} - Z_{torre})^2}$$

---

## 2. Modelagem de Interfaces (TypeScript)

```typescript
import * as THREE from 'three';

export interface IEnemy {
  id: string;
  hp: number;
  speed: number;
  waypointIndex: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  isDead: boolean;
}

export interface ITower {
  id: string;
  gridX: number;
  gridZ: number;
  range: number;
  fireRate: number;
  cooldownTimer: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
}

export interface IProjectile {
  id: string;
  targetEnemy: IEnemy;
  damage: number;
  speed: number;
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  hasHit: boolean;
}
```
