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
