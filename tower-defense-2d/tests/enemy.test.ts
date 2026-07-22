import { describe, expect, it } from 'vitest';
import { Enemy2D } from '../src/engine/Enemy';
import type { Vector2D } from '../src/types';

describe('Enemy2D Unit & Mechanics Tests', () => {
  const mockWaypoints: Vector2D[] = [
    { x: 30, y: 30 },
    { x: 90, y: 30 },
    { x: 90, y: 90 },
  ];

  it('should scale HP and reward based on hpMultiplier', () => {
    const standardBase = new Enemy2D(mockWaypoints, 'STANDARD', '1', 1.0);
    const standardScaled = new Enemy2D(mockWaypoints, 'STANDARD', '2', 2.0);

    expect(standardBase.data.maxHp).toBe(10);
    expect(standardScaled.data.maxHp).toBe(20);
    expect(standardScaled.data.goldReward).toBeGreaterThan(standardBase.data.goldReward);
  });

  it('should absorb light shot damage for Tank armor', () => {
    const tank = new Enemy2D(mockWaypoints, 'TANK', '1', 1.0);
    const initialHp = tank.data.hp; // 35

    // Tank has armorFactor 0.6 (absorbs 40%)
    const dmgDealt = tank.takeDamage(10, true); // Light shot 10 dmg
    expect(dmgDealt).toBe(6); // 10 * 0.6 = 6
    expect(tank.data.hp).toBe(initialHp - 6);
  });

  it('should absorb damage in energy shield before HP for Shielded enemy', () => {
    const shielded = new Enemy2D(mockWaypoints, 'SHIELDED', '1', 1.0);
    const initialShield = shielded.data.shieldHp; // 22
    const initialHp = shielded.data.hp; // 14

    // Hit with 10 dmg -> absorbed by shield
    shielded.takeDamage(10, false);
    expect(shielded.data.shieldHp).toBe(initialShield - 10);
    expect(shielded.data.hp).toBe(initialHp);

    // Hit with 20 dmg -> breaks shield (12 left) and damages HP by 8
    shielded.takeDamage(20, false);
    expect(shielded.data.shieldHp).toBe(0);
    expect(shielded.data.hp).toBe(initialHp - 8);
  });

  it('should move precisely along waypoints without position drift', () => {
    const enemy = new Enemy2D(mockWaypoints, 'STANDARD', '1', 1.0);
    expect(enemy.data.position).toEqual({ x: 30, y: 30 });

    // Update 30 times (speed = 2.0 -> 60px distance to next waypoint at 90, 30)
    for (let i = 0; i < 30; i++) {
      enemy.update(mockWaypoints);
    }

    expect(enemy.data.position.x).toBeCloseTo(90);
    expect(enemy.data.position.y).toBeCloseTo(30);
    expect(enemy.data.waypointIndex).toBe(1);
  });
});
