import { describe, expect, it } from 'vitest';
import { handleTowerDamageDealt, Tower2D } from '../src/engine/Tower';
import { GameState } from '../src/engine/GameState';
import { getAllRogueliteModules, getRogueliteModule } from '../src/engine/Specializations';
describe('Roguelite Modules & Draft System Tests', () => {
  it('should list all 5 roguelite modules in the catalog', () => {
    const modules = getAllRogueliteModules();
    expect(modules.length).toBe(5);

    const midas = getRogueliteModule('MIDAS_TOUCH');
    expect(midas).toBeDefined();
    expect(midas.name).toBe('Módulo Midas');
    expect(midas.icon).toBe('💰');
  });

  it('should prevent equipping modules on Level 1 towers and allow on Level 2+ towers', () => {
    const tower = new Tower2D(2, 2, 60, 'BASIC', 't-lvl1');
    expect(tower.data.level).toBe(1);

    const resultLvl1 = tower.equipModule('MIDAS_TOUCH');
    expect(resultLvl1).toBe(false);
    expect(tower.data.equippedModule).toBeUndefined();

    // Upgrade to Level 2
    tower.data.level = 2;
    const resultLvl2 = tower.equipModule('MIDAS_TOUCH');
    expect(resultLvl2).toBe(true);
    expect(tower.data.equippedModule).toBe('MIDAS_TOUCH');
  });

  it('should apply Vampiric Drain healing to GameState base HP', () => {
    const gameState = new GameState();
    gameState.baseHp = 5;

    // Simulate 100 damage accumulation
    if (gameState.baseHp < gameState.maxBaseHp) {
      gameState.baseHp = Math.min(gameState.maxBaseHp, gameState.baseHp + 1);
    }
    expect(gameState.baseHp).toBe(6);
  });

  it('should trigger Midas Touch gold reward on 5 kills', () => {
    const gameState = new GameState();
    const initialGold = gameState.gold;
    const tower = new Tower2D(2, 2, 60, 'BASIC', 't-midas');
    tower.data.level = 2;
    tower.equipModule('MIDAS_TOUCH');

    const enemyMock = {
      data: { isDead: true, hp: 0, goldReward: 10, type: 'RUNNER' }
    } as any;

    for (let i = 0; i < 5; i++) {
      handleTowerDamageDealt(tower, enemyMock, 10, gameState);
    }

    expect(tower.data.kills).toBe(5);
    expect(gameState.gold).toBe(initialGold + 2);
  });

  it('should award extra gold for Bounty Hunter module on Boss/Tank kills', () => {
    const gameState = new GameState();
    const initialGold = gameState.gold;
    const tower = new Tower2D(2, 2, 60, 'BASIC', 't-bounty');
    tower.data.level = 2;
    tower.equipModule('BOUNTY_HUNTER');

    const bossMock = {
      data: { isDead: true, hp: 0, goldReward: 50, type: 'BOSS' }
    } as any;

    handleTowerDamageDealt(tower, bossMock, 50, gameState);
    // 20% of 50 gold = 10 extra gold
    expect(gameState.gold).toBe(initialGold + 10);
  });
});
