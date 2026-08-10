import { describe, expect, it } from 'vitest';
import { Enemy2D } from '../src/engine/Enemy';
import type { Vector2D } from '../src/types';

describe('Black Mega Boss & Renderer Safety Tests', () => {
  const mockWaypoints: Vector2D[] = [
    { x: 30, y: 30 },
    { x: 90, y: 30 },
  ];

  it('should initialize BLACK_MEGA_BOSS with high HP and armor', () => {
    const boss = new Enemy2D(mockWaypoints, 'BLACK_MEGA_BOSS', 'boss-1', 1.0);
    expect(boss.data.maxHp).toBe(380);
    expect(boss.data.maxShieldHp).toBe(90);
    expect(boss.data.radius).toBe(32);
    expect(boss.data.color).toBe('#11111a');
  });

  it('should absorb damage via heavy armor for BLACK_MEGA_BOSS', () => {
    const boss = new Enemy2D(mockWaypoints, 'BLACK_MEGA_BOSS', 'boss-1', 1.0);
    const initialShield = boss.data.shieldHp; // 120

    // Shield absorbs damage first (armorPenetration=1: bypass total, para isolar o escudo)
    boss.takeDamage(50, 1);
    expect(boss.data.shieldHp).toBe(initialShield - 50);

    // Armor factor 0.45 absorbs 55% of unpenetrated hits
    boss.data.shieldHp = 0;
    const initialHp = boss.data.hp;
    const dmgDealt = boss.takeDamage(20, 0);
    expect(dmgDealt).toBe(9); // 20 * 0.45 = 9
    expect(boss.data.hp).toBe(initialHp - 9);
  });
});
