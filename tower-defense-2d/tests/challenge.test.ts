import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { FXManager } from '../src/engine/FXManager';
import { GameState } from '../src/engine/GameState';
import { ParticleManager } from '../src/engine/ParticleManager';
import { SpellManager } from '../src/engine/SpellManager';
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

  it('should increase enemy speed by +40% in FAST_ENEMIES mode', () => {
    const standardNormal = new Enemy2D(mockWaypoints, 'STANDARD', '1', 1.0, 0, 1.0, 1.0);
    const standardFast = new Enemy2D(mockWaypoints, 'STANDARD', '2', 1.0, 0, 1.4, 1.0);

    expect(standardNormal.data.speed).toBe(2.0);
    expect(standardFast.data.speed).toBe(2.8);
  });

  it('should increase enemy gold reward by +50% in TURBO_GOLD mode', () => {
    const normalEnemy = new Enemy2D(mockWaypoints, 'STANDARD', '1', 1.0, 0, 1.0, 1.0);
    const turboEnemy = new Enemy2D(mockWaypoints, 'STANDARD', '2', 1.0, 0, 1.0, 1.5);

    expect(normalEnemy.data.goldReward).toBe(10);
    expect(turboEnemy.data.goldReward).toBe(15);
  });

  it('should prevent casting spells when in NO_SPELLS mode', () => {
    const noSpellsState = new GameState(undefined, 'NO_SPELLS');
    noSpellsState.gold = 1000;

    const fx = new FXManager();
    const audio = new AudioManager();
    const particles = new ParticleManager();
    const spellManager = new SpellManager(noSpellsState, fx, audio, particles);

    spellManager.selectSpell('METEOR');
    expect(spellManager.activeSpell).toBeNull();

    const enemy = new Enemy2D(mockWaypoints, 'STANDARD', '1', 1.0);
    const freezeCasted = spellManager.triggerGlobalFreeze([enemy]);
    expect(freezeCasted).toBe(false);

    const meteorCasted = spellManager.castMeteorAt(50, 50, [enemy]);
    expect(meteorCasted).toBe(false);
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
});
