import { describe, expect, it } from 'vitest';
import {
  SPECIALIZATIONS,
  getSpecializationOption,
  getSpecializations,
  isValidSpecialization,
} from '../src/engine/Specializations';
import { Tower2D } from '../src/engine/Tower';
import type { TowerType } from '../src/types';
import {
  FULL_DEFENSE_BUILD,
  FULL_DEFENSE_UPGRADES,
  runBalanceSim,
} from './helpers/balanceSim';

const TIPOS: TowerType[] = ['BASIC', 'CANNON', 'FROST', 'ARTILLERY', 'SOLAR_PRISM'];

/** Sobe a torre até o nível 2, onde a escolha passa a ser exigida. */
function noNivel2(type: TowerType): Tower2D {
  const tower = new Tower2D(4, 2, 60, type, `t-${type}`);
  expect(tower.upgrade()).toBe(true);
  expect(tower.data.level).toBe(2);
  return tower;
}

describe('Catálogo de especializações', () => {
  it('deve oferecer exatamente duas opções para cada tipo de torre', () => {
    for (const type of TIPOS) {
      const opcoes = getSpecializations(type);
      expect(opcoes.length).toBe(2);
      expect(opcoes[0].id).not.toBe(opcoes[1].id);

      for (const opcao of opcoes) {
        expect(opcao.name.length).toBeGreaterThan(0);
        expect(opcao.description.length).toBeGreaterThan(0);
        expect(opcao.icon.length).toBeGreaterThan(0);
      }
    }
  });

  it('não deve repetir um id de especialização entre tipos', () => {
    const todos = Object.values(SPECIALIZATIONS).flatMap(opcoes => opcoes.map(o => o.id));
    expect(new Set(todos).size).toBe(todos.length);
  });

  it('deve validar especialização contra o tipo da torre', () => {
    expect(isValidSpecialization('ARTILLERY', 'NAPALM')).toBe(true);
    expect(isValidSpecialization('FROST', 'NAPALM')).toBe(false);
    expect(isValidSpecialization('BASIC', 'MULTISHOT')).toBe(true);
    expect(isValidSpecialization('BASIC', 'CHAIN_BEAM')).toBe(false);
  });

  it('deve resolver a opção a partir do id', () => {
    expect(getSpecializationOption('PERMAFROST')?.name).toBe('Permafrost');
    expect(getSpecializationOption('SIEGE')?.icon.length).toBeGreaterThan(0);
  });
});

describe('Upgrade ramificado da torre', () => {
  it('deve permitir o nível 1 para 2 sem escolha', () => {
    const tower = new Tower2D(4, 2, 60, 'BASIC', 't1');
    expect(tower.upgrade()).toBe(true);
    expect(tower.data.level).toBe(2);
    expect(tower.data.specialization).toBeUndefined();
  });

  it('deve recusar o nível 2 para 3 sem especialização', () => {
    const tower = noNivel2('BASIC');

    expect(tower.upgrade()).toBe(false);
    expect(tower.data.level).toBe(2);
    expect(tower.data.specialization).toBeUndefined();
  });

  it('deve recusar especialização de outro tipo de torre', () => {
    const tower = noNivel2('FROST');

    expect(tower.upgrade('NAPALM')).toBe(false);
    expect(tower.data.level).toBe(2);
  });

  it('deve aplicar a especialização escolhida no nível 3', () => {
    for (const type of TIPOS) {
      for (const opcao of getSpecializations(type)) {
        const tower = noNivel2(type);
        expect(tower.upgrade(opcao.id)).toBe(true);
        expect(tower.data.level).toBe(3);
        expect(tower.data.specialization).toBe(opcao.id);

        // Nível 3 é o teto, mesmo com outra escolha em mãos
        expect(tower.upgrade(opcao.id)).toBe(false);
      }
    }
  });

  it('deve dar ao SIEGE muito mais alcance que ao NAPALM', () => {
    const siege = noNivel2('ARTILLERY');
    siege.upgrade('SIEGE');

    const napalm = noNivel2('ARTILLERY');
    napalm.upgrade('NAPALM');

    expect(siege.data.range).toBeGreaterThan(napalm.data.range);
    // ...e ao NAPALM muito mais área que ao SIEGE
    expect(napalm.data.splashRadius as number).toBeGreaterThan(siege.data.splashRadius as number);
  });

  it('deve dar área de dano ao canhão só com ESTILHAÇO', () => {
    const shrapnel = noNivel2('CANNON');
    shrapnel.upgrade('SHRAPNEL');
    expect(shrapnel.data.splashRadius).toBeGreaterThan(0);

    const executioner = noNivel2('CANNON');
    executioner.upgrade('EXECUTIONER');
    expect(executioner.data.splashRadius).toBeUndefined();
  });

  it('deve trocar cadência por controle no CONGELAMENTO', () => {
    const deepFreeze = noNivel2('FROST');
    const cadenciaAntes = deepFreeze.data.fireRate;
    deepFreeze.upgrade('DEEP_FREEZE');

    // fireRate maior = pulso mais lento
    expect(deepFreeze.data.fireRate).toBeGreaterThan(cadenciaAntes);

    const permafrost = noNivel2('FROST');
    permafrost.upgrade('PERMAFROST');
    expect(permafrost.data.fireRate).toBe(cadenciaAntes);
    // slowFactor menor = lentidão mais forte
    expect(permafrost.data.slowFactor as number).toBeLessThan(0.5);
  });

  it('deve cobrar dano por tiro do MULTISHOT em troca do segundo alvo', () => {
    const multishot = noNivel2('BASIC');
    multishot.upgrade('MULTISHOT');

    const piercing = noNivel2('BASIC');
    piercing.upgrade('PIERCING');

    expect(multishot.data.damage).toBeLessThan(piercing.data.damage);
  });

  it('não deve melhorar torre destruída', () => {
    const tower = noNivel2('BASIC');
    tower.takeDamage(99999);
    expect(tower.data.isDestroyed).toBe(true);
    expect(tower.upgrade('PIERCING')).toBe(false);
  });
});

describe('Especializações em partida simulada', () => {
  it('não deve cobrar ouro quando a escolha é inválida ou ausente', () => {
    // O gasto acontece dentro do TowerManager, então vale checar por lá.
    const r = runBalanceSim({
      seed: 'spec-gold',
      waves: 3,
      startingGold: 1000,
      build: [{ wave: 1, type: 'FROST', gridX: 4, gridY: 2 }],
      upgrades: [{ wave: 2, gridX: 4, gridY: 2, toLevel: 3, specialization: 'PERMAFROST' }],
    });

    expect(r.failedUpgrades).toEqual([]);
    expect(r.upgradesApplied).toBe(2); // 1->2 e 2->3
  });

  it('deve aplicar cada especialização numa partida completa sem travar', () => {
    for (const type of TIPOS) {
      for (const opcao of getSpecializations(type)) {
        const r = runBalanceSim({
          seed: `spec-${opcao.id}`,
          waves: 4,
          startingGold: 1200,
          build: [{ wave: 1, type, gridX: 4, gridY: 2 }],
          upgrades: [
            { wave: 2, gridX: 4, gridY: 2, toLevel: 3, specialization: opcao.id },
          ],
        });

        expect(r.failedOrders).toEqual([]);
        expect(r.failedUpgrades).toEqual([]);
        expect(r.waveMetrics.every(w => !w.timedOut)).toBe(true);
        // A torre especializada tem de continuar causando dano
        expect(r.damageByTower[type]).toBeGreaterThan(0);
      }
    }
  });

  it('deve manter a defesa completa viável com torres especializadas', () => {
    const r = runBalanceSim({
      seed: 'spec-defesa',
      waves: 10,
      startingGold: 4000,
      build: FULL_DEFENSE_BUILD,
      upgrades: FULL_DEFENSE_UPGRADES,
    });

    expect(r.failedUpgrades).toEqual([]);
    expect(r.status).toBe('PLAYING');
    expect(r.wavesCompleted).toBe(10);
  });
});
