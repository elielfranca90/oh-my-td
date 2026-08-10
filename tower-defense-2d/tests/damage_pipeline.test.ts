import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { FXManager } from '../src/engine/FXManager';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ParticleManager } from '../src/engine/ParticleManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Rng } from '../src/engine/Rng';
import { handleTowerDamageDealt, Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import type { EnemyType, TowerType, Vector2D } from '../src/types';

/**
 * Cobertura de regressão da fase 2b (A1/A2/A3/A7 do docs/GAME_DESIGN_REVIEW.md).
 * Todos os números abaixo vêm da fórmula documentada em `Enemy2D.takeDamage`
 * (efetivo = armorFactor + (1 - armorFactor) * penetração) combinada com o
 * `armorPenetration` que cada torre realmente envia em `TowerManager.ts`/
 * `Projectile.ts` — não são valores calibrados para o teste passar.
 */

function makeEnemyAt(type: EnemyType, pos: Vector2D, id = `e-${type}-${pos.x}-${pos.y}`): Enemy2D {
  const waypoints: Vector2D[] = [pos, { x: pos.x + 999, y: pos.y }];
  return new Enemy2D(waypoints, type, id, 1.0);
}

/** Dano total absorvido (escudo + HP), para não perder o débito do BLACK_MEGA_BOSS no escudo. */
function damageTaken(enemy: Enemy2D, before: { hp: number; shieldHp: number }): number {
  return (before.shieldHp - enemy.data.shieldHp) + (before.hp - enemy.data.hp);
}

describe('A1 — Módulo Voltaic Overcharge', () => {
  it('descarrega 8 de dano em vizinhos a até 40px quando o alvo primário está lento', () => {
    const gameState = new GameState();
    const tower = new Tower2D(2, 2, 60, 'FROST', 't-voltaic');
    tower.upgrade(); // nível 2, requisito para equipar módulo
    tower.equipModule('VOLTAIC_OVERCHARGE');

    const primary = makeEnemyAt('RUNNER', { x: 100, y: 100 }, 'primary');
    primary.applySlow(0.5, 60);

    const closeNeighbor = makeEnemyAt('TANK', { x: 130, y: 100 }, 'close'); // dist 30 < 40
    const farNeighbor = makeEnemyAt('TANK', { x: 200, y: 100 }, 'far'); // dist 100 > 40

    const closeBefore = { hp: closeNeighbor.data.hp, shieldHp: closeNeighbor.data.shieldHp };
    const farBefore = { hp: farNeighbor.data.hp, shieldHp: farNeighbor.data.shieldHp };

    handleTowerDamageDealt(tower, primary, 5, gameState, [primary, closeNeighbor, farNeighbor]);

    // Faísca ignora armadura (penetração 1) e não é esquivável: sempre 8 cheio.
    expect(damageTaken(closeNeighbor, closeBefore)).toBe(8);
    expect(damageTaken(farNeighbor, farBefore)).toBe(0);
  });

  it('também dispara quando o alvo primário está congelado (não só lento)', () => {
    const gameState = new GameState();
    const tower = new Tower2D(2, 2, 60, 'FROST', 't-voltaic-freeze');
    tower.upgrade();
    tower.equipModule('VOLTAIC_OVERCHARGE');

    const primary = makeEnemyAt('RUNNER', { x: 100, y: 100 }, 'primary');
    primary.applyFreeze(30);

    const neighbor = makeEnemyAt('TANK', { x: 120, y: 100 }, 'neighbor'); // dist 20 < 40
    const before = { hp: neighbor.data.hp, shieldHp: neighbor.data.shieldHp };

    handleTowerDamageDealt(tower, primary, 5, gameState, [primary, neighbor]);

    expect(damageTaken(neighbor, before)).toBe(8);
  });

  it('não dispara quando o alvo primário não está lento nem congelado', () => {
    const gameState = new GameState();
    const tower = new Tower2D(2, 2, 60, 'FROST', 't-voltaic-off');
    tower.upgrade();
    tower.equipModule('VOLTAIC_OVERCHARGE');

    const primary = makeEnemyAt('RUNNER', { x: 100, y: 100 }, 'primary');
    const neighbor = makeEnemyAt('TANK', { x: 120, y: 100 }, 'neighbor');
    const before = { hp: neighbor.data.hp, shieldHp: neighbor.data.shieldHp };

    handleTowerDamageDealt(tower, primary, 5, gameState, [primary, neighbor]);

    expect(damageTaken(neighbor, before)).toBe(0);
  });

  it('não atinge o próprio alvo primário duas vezes', () => {
    const gameState = new GameState();
    const tower = new Tower2D(2, 2, 60, 'FROST', 't-voltaic-self');
    tower.upgrade();
    tower.equipModule('VOLTAIC_OVERCHARGE');

    const primary = makeEnemyAt('RUNNER', { x: 100, y: 100 }, 'primary');
    primary.applySlow(0.5, 60);
    const hpBefore = primary.data.hp;

    // O próprio alvo primário está na lista de "vizinhos" (como ocorre na
    // chamada real, que passa `enemies` completo) — não deve se autoferir.
    handleTowerDamageDealt(tower, primary, 5, gameState, [primary]);

    expect(primary.data.hp).toBe(hpBefore);
  });

  it('não cascateia: um vizinho lento atingido pela faísca não dispara outra faísca', () => {
    const gameState = new GameState();
    const tower = new Tower2D(2, 2, 60, 'FROST', 't-voltaic-cascade');
    tower.upgrade();
    tower.equipModule('VOLTAIC_OVERCHARGE');

    const primary = makeEnemyAt('RUNNER', { x: 100, y: 100 }, 'primary');
    primary.applySlow(0.5, 60);

    // closeNeighbor já está lento e fica a 30px do primário (recebe a faísca).
    const closeNeighbor = makeEnemyAt('TANK', { x: 130, y: 100 }, 'close');
    closeNeighbor.applySlow(0.5, 60);

    // chainVictim está a 60px do primário (fora do raio) mas a só 30px do
    // closeNeighbor — se a faísca cascateasse, seria atingido por uma "segunda
    // explosão" originada em closeNeighbor. Não deve ser atingido nenhuma vez.
    const chainVictim = makeEnemyAt('TANK', { x: 160, y: 100 }, 'chain');
    const chainBefore = { hp: chainVictim.data.hp, shieldHp: chainVictim.data.shieldHp };

    handleTowerDamageDealt(tower, primary, 5, gameState, [primary, closeNeighbor, chainVictim]);

    expect(damageTaken(chainVictim, chainBefore)).toBe(0);
  });
});

describe('A3 — esquiva do Runner não cancela dano em área/hazard', () => {
  // Semente 7 faz o primeiro draw do Rng valer ~0.0117 — abaixo dos 25% de
  // dodgeChance do Runner. Se a esquiva fosse avaliada, ela ocorreria.
  const DODGE_SEED = 7;

  it('esquiva normalmente quando o dano É evitável (tiro direto)', () => {
    const waypoints: Vector2D[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const runner = new Enemy2D(waypoints, 'RUNNER', 'r1', 1.0, 0, 1.0, 1.0, new Rng(DODGE_SEED));

    const result = runner.takeDamage(10, 0, true);

    expect(result).toBe(-1); // Dodged!
    expect(runner.data.hp).toBe(runner.data.maxHp);
  });

  it('NUNCA esquiva quando isAvoidable=false, mesmo com a mesma semente que causaria dodge', () => {
    const waypoints: Vector2D[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const runner = new Enemy2D(waypoints, 'RUNNER', 'r2', 1.0, 0, 1.0, 1.0, new Rng(DODGE_SEED));

    // Mesma semente do teste anterior (mesmo primeiro draw), mas dano de área.
    const result = runner.takeDamage(10, 0, false);

    // RUNNER tem armorFactor 1.0 (sem armadura): efetivo = 1.0, dano cheio = 10.
    // RUNNER só tem 6 HP (maxHp), então o dano de 10 mata (clampado em 0).
    expect(result).toBe(10);
    expect(runner.data.hp).toBe(0);
    expect(runner.data.isDead).toBe(true);
  });
});

describe('A2 — armadura vale para todas as torres (dano efetivo por tipo)', () => {
  const TOWER_RANGE_CENTER: Vector2D = { x: 150, y: 150 }; // centro do tile (2,2), tileSize 60

  /** Roda uma torre nível 1 contra um único inimigo em cima do canhão da torre
   * (distância 0, sempre dentro de alcance e sob a velocidade de qualquer
   * projétil) e devolve o dano total absorvido (escudo + HP). */
  function fireAt(type: TowerType, enemyType: EnemyType, rngSeed: number | string = 1): number {
    const map = new MapManager2D('MAP_1');
    const projectiles = new ProjectileManager2D();
    const state = new GameState();
    const audio = new AudioManager();
    const particles = new ParticleManager();
    const fx = new FXManager();
    const rng = new Rng(rngSeed);
    const tm = new TowerManager2D(map, projectiles, state, audio, particles, undefined, undefined, undefined, rng);

    const tower = new Tower2D(2, 2, 60, type, `t-${type}`);
    tm.getTowers().push(tower);

    const enemy = makeEnemyAt(enemyType, { ...TOWER_RANGE_CENTER });
    const before = { hp: enemy.data.hp, shieldHp: enemy.data.shieldHp };

    tm.update([enemy], fx);
    // Resolve o projétil (BASIC/CANNON/ARTILLERY): a distância é 0, sempre
    // menor que qualquer velocidade de tiro, então resolve num único passo.
    // FROST e SOLAR_PRISM já aplicam dano dentro de tm.update() — chamar
    // update() aqui é inofensivo (não há projétil na fila).
    projectiles.update([enemy], fx, undefined, state);

    return damageTaken(enemy, before);
  }

  // Semente 1: primeiro draw do Rng é ~0.627, acima do crítico base de 20% da
  // BASIC — isola a fórmula de armadura do crítico aleatório.
  const SEED_NO_CRIT = 1;

  it('BASIC (penetração 0): efetivo = armorFactor puro', () => {
    expect(fireAt('BASIC', 'TANK', SEED_NO_CRIT)).toBe(3); // round(5 * 0.6)
    expect(fireAt('BASIC', 'BOSS', SEED_NO_CRIT)).toBe(4); // round(5 * 0.8)
    expect(fireAt('BASIC', 'BLACK_MEGA_BOSS', SEED_NO_CRIT)).toBe(2); // round(5 * 0.45)
  });

  it('BASIC + PIERCING (penetração 1): ignora armadura por completo', () => {
    const map = new MapManager2D('MAP_1');
    const projectiles = new ProjectileManager2D();
    const state = new GameState();
    const audio = new AudioManager();
    const particles = new ParticleManager();
    const fx = new FXManager();
    const rng = new Rng(SEED_NO_CRIT);
    const tm = new TowerManager2D(map, projectiles, state, audio, particles, undefined, undefined, undefined, rng);

    const tower = new Tower2D(2, 2, 60, 'BASIC', 't-piercing');
    tower.upgrade(); // nível 2
    tower.upgrade('PIERCING'); // nível 3 -> damage = floor(floor(5*1.5)*1.5) = 10
    tm.getTowers().push(tower);
    expect(tower.data.damage).toBe(10);

    const enemy = makeEnemyAt('TANK', { ...TOWER_RANGE_CENTER });
    const before = { hp: enemy.data.hp, shieldHp: enemy.data.shieldHp };
    tm.update([enemy], fx);
    projectiles.update([enemy], fx, undefined, state);

    // Sem crítico (semente escolhida), sem redução de armadura: dano cheio.
    expect(damageTaken(enemy, before)).toBe(10);
  });

  it('CANNON (penetração 0.5 sempre, além do bônus 2x contra Tank/Boss/Black Mega Boss em cheio HP)', () => {
    // damage base 14, dobrado por isExecutionTarget+hpGateOk (HP cheio) = 28.
    expect(fireAt('CANNON', 'TANK', SEED_NO_CRIT)).toBe(22); // round(28 * (0.6+0.4*0.5))
    expect(fireAt('CANNON', 'BOSS', SEED_NO_CRIT)).toBe(25); // round(28 * (0.8+0.2*0.5))
    expect(fireAt('CANNON', 'BLACK_MEGA_BOSS', SEED_NO_CRIT)).toBe(20); // round(28 * (0.45+0.55*0.5))
  });

  it('SOLAR_PRISM (penetração 0): efetivo = armorFactor puro', () => {
    expect(fireAt('SOLAR_PRISM', 'TANK', SEED_NO_CRIT)).toBe(4); // round(6 * 0.6)
    expect(fireAt('SOLAR_PRISM', 'BOSS', SEED_NO_CRIT)).toBe(5); // round(6 * 0.8)
    expect(fireAt('SOLAR_PRISM', 'BLACK_MEGA_BOSS', SEED_NO_CRIT)).toBe(3); // round(6 * 0.45)
  });

  it('FROST (pulso, penetração 0): efetivo = armorFactor puro', () => {
    expect(fireAt('FROST', 'TANK', SEED_NO_CRIT)).toBe(1); // round(2 * 0.6) = 1.2 -> 1
    expect(fireAt('FROST', 'BOSS', SEED_NO_CRIT)).toBe(2); // round(2 * 0.8) = 1.6 -> 2
    expect(fireAt('FROST', 'BLACK_MEGA_BOSS', SEED_NO_CRIT)).toBe(1); // round(2 * 0.45) = 0.9 -> 1
  });

  // Corrigido: a Artilharia nasce com splashRadius > 0, então todo tiro dela
  // resolve pelo ramo de respingo de `Projectile2D.update`, mas esse ramo agora
  // distingue o alvo primário (sofre `armorPenetration` do projétil — aqui 0,
  // vindo de `TowerManager.ts`) das vítimas secundárias do estouro (penetração
  // 1 fixa, dano em área). Antes o ramo de respingo tratava todo mundo —
  // inclusive o alvo primário — como vítima secundária, apagando a armadura
  // por completo para a Artilharia.
  it('ARTILLERY (penetração 0 no alvo primário): efetivo = armorFactor puro', () => {
    expect(fireAt('ARTILLERY', 'TANK', SEED_NO_CRIT)).toBe(15); // round(25 * 0.6)
    expect(fireAt('ARTILLERY', 'BOSS', SEED_NO_CRIT)).toBe(20); // round(25 * 0.8)
    expect(fireAt('ARTILLERY', 'BLACK_MEGA_BOSS', SEED_NO_CRIT)).toBe(11); // round(25 * 0.45)
  });
});

describe('A7 — Executor do CANNON aceita o chefe final e rejeita o Moss Giant', () => {
  function fireCannonAt(enemyType: EnemyType): number {
    const map = new MapManager2D('MAP_1');
    const projectiles = new ProjectileManager2D();
    const state = new GameState();
    const audio = new AudioManager();
    const tm = new TowerManager2D(map, projectiles, state, audio);

    const tower = new Tower2D(2, 2, 60, 'CANNON', `t-cannon-${enemyType}`);
    tm.getTowers().push(tower);

    const enemy = makeEnemyAt(enemyType, { x: 150, y: 150 });
    const before = { hp: enemy.data.hp, shieldHp: enemy.data.shieldHp };
    const fx = new FXManager();
    tm.update([enemy], fx);
    projectiles.update([enemy], fx);

    return damageTaken(enemy, before);
  }

  it('dobra o dano contra TANK, BOSS e BLACK_MEGA_BOSS (alvos de execução em HP cheio)', () => {
    expect(fireCannonAt('TANK')).toBe(22); // dobrado: ver teste de armadura acima
    expect(fireCannonAt('BOSS')).toBe(25);
    expect(fireCannonAt('BLACK_MEGA_BOSS')).toBe(20);
  });

  it('NÃO dobra o dano contra MOSS_GIANT — exclusão deliberada, não esquecimento', () => {
    // damage base 14 (sem dobrar), penetração 0.5: efetivo = 0.7+0.3*0.5 = 0.85
    expect(fireCannonAt('MOSS_GIANT')).toBe(12); // round(14 * 0.85) = 11.9 -> 12
  });
});
