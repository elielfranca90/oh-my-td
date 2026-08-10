import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { EnemyManager2D } from '../src/engine/EnemyManager';
import { FXManager } from '../src/engine/FXManager';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ParticleManager } from '../src/engine/ParticleManager';
import { SpellManager } from '../src/engine/SpellManager';
import { Tower2D } from '../src/engine/Tower';
import { WaveManager } from '../src/engine/WaveManager';
import type { Vector2D } from '../src/types';

describe('Challenge Mode Mechanics Tests', () => {
  const mockWaypoints: Vector2D[] = [
    { x: 30, y: 30 },
    { x: 90, y: 30 },
  ];

  it('should initialize HARDCORE mode with exactly 1 base HP', () => {
    const normalState = new GameState(undefined, 'NORMAL');
    const hardcoreState = new GameState(undefined, 'HARDCORE');

    expect(normalState.baseHp).toBe(10);
    expect(hardcoreState.baseHp).toBe(1);
    expect(hardcoreState.maxBaseHp).toBe(1);
  });

  it('should combine all challenge and special rules in MORTE_CERTA mode', () => {
    const morteCertaState = new GameState(undefined, 'MORTE_CERTA');
    morteCertaState.gold = 1000;

    expect(morteCertaState.baseHp).toBe(1);
    expect(morteCertaState.maxBaseHp).toBe(1);

    const fx = new FXManager();
    const audio = new AudioManager();
    const particles = new ParticleManager();
    const spellManager = new SpellManager(morteCertaState, fx, audio, particles);

    spellManager.selectSpell('METEOR');
    expect(spellManager.activeSpell).toBeNull();
  });

  // A6 (docs/GAME_DESIGN_REVIEW.md): HARDCORE ganhou velocidade 1.25x e reparo
  // 1.5x; MORTE_CERTA reparo 2x. Antes, a única diferença de HARDCORE para
  // NORMAL era baseHp=1 — estes testes travam a regressão descrita no
  // relatório ("HARDCORE não tem nada do que promete").
  describe('A6 — HARDCORE e MORTE_CERTA aceleram e encarecem o reparo', () => {
    it('NORMAL spawna inimigos na velocidade base (sem multiplicador)', () => {
      const map = new MapManager2D('MAP_1');
      const state = new GameState(undefined, 'NORMAL');
      const waveManager = new WaveManager();
      const audio = new AudioManager();
      const enemyManager = new EnemyManager2D(map, state, waveManager, audio);

      waveManager.startNextWave();
      enemyManager.update(1200); // onda 1, 1º inimigo: STANDARD, delay 1000ms

      const spawned = enemyManager.getEnemies();
      expect(spawned.length).toBe(1);
      expect(spawned[0].data.speed).toBe(2.0); // velocidade base do STANDARD (config default)
    });

    it('HARDCORE spawna inimigos 1.25x mais rápido que NORMAL', () => {
      const map = new MapManager2D('MAP_1');
      const state = new GameState(undefined, 'HARDCORE');
      const waveManager = new WaveManager();
      const audio = new AudioManager();
      const enemyManager = new EnemyManager2D(map, state, waveManager, audio);

      waveManager.startNextWave();
      enemyManager.update(1200);

      const spawned = enemyManager.getEnemies();
      expect(spawned.length).toBe(1);
      // Number((2.0 * 1.25).toFixed(2)) — mesmo arredondamento do construtor de Enemy2D.
      expect(spawned[0].data.speed).toBe(2.5);
    });

    it('HARDCORE cobra 1.5x no reparo; MORTE_CERTA cobra 2x; NORMAL não altera', () => {
      const tower = new Tower2D(2, 2, 60, 'BASIC', 't-repair');
      tower.data.hp = 0;
      tower.data.isDestroyed = true;

      // Custo base de torre destruída: ceil(cost * 0.7) = ceil(50 * 0.7) = 35.
      expect(tower.getRepairCost(undefined, 'NORMAL')).toBe(35);
      expect(tower.getRepairCost(undefined, 'HARDCORE')).toBe(53); // ceil(35 * 1.5) = 52.5 -> 53
      expect(tower.getRepairCost(undefined, 'MORTE_CERTA')).toBe(70); // ceil(35 * 2) = 70
    });
  });
});
