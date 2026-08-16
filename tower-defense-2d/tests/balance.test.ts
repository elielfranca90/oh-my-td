import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/Rng';
import type { TowerType } from '../src/types';
import {
  FULL_DEFENSE_BUILD,
  FULL_DEFENSE_UPGRADES,
  MAP1_MINIMAL_BUILD,
  MAP1_REFERENCE_BUILD,
  runBalanceSim,
} from './helpers/balanceSim';

describe('Rng semeado', () => {
  it('deve reproduzir a mesma sequência para a mesma semente', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    const seqA = Array.from({ length: 32 }, () => a.next());
    const seqB = Array.from({ length: 32 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('deve gerar sequências distintas para sementes distintas', () => {
    const a = new Rng('semente-a');
    const b = new Rng('semente-b');
    const seqA = Array.from({ length: 32 }, () => a.next());
    const seqB = Array.from({ length: 32 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it('deve manter os valores dentro de [0, 1)', () => {
    const rng = new Rng('faixa');
    for (let i = 0; i < 2000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('deve tratar probabilidades degeneradas sem consumir sorte', () => {
    const rng = new Rng(7);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    expect(rng.chance(-1)).toBe(false);

    // chance(0) e chance(1) não devem mexer no estado
    const antes = rng.getState();
    rng.chance(0);
    rng.chance(1);
    expect(rng.getState()).toBe(antes);
  });

  it('deve respeitar a probabilidade dentro de uma margem estatística', () => {
    const rng = new Rng('estatistica');
    let acertos = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) {
      if (rng.chance(0.25)) acertos++;
    }
    expect(acertos / total).toBeGreaterThan(0.23);
    expect(acertos / total).toBeLessThan(0.27);
  });

  it('deve manter int() dentro do limite', () => {
    const rng = new Rng('int');
    for (let i = 0; i < 500; i++) {
      const v = rng.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(rng.int(0)).toBe(0);
  });
});

describe('Harness de balanceamento', () => {
  it('deve produzir resultado idêntico para a mesma semente', () => {
    const opcoes = { seed: 'determinismo', waves: 7, build: MAP1_REFERENCE_BUILD };
    const primeira = runBalanceSim(opcoes);
    const segunda = runBalanceSim(opcoes);

    expect(segunda).toEqual(primeira);
  });

  it('deve executar toda a build de referência sem compra falha', () => {
    for (const seed of ['s1', 's2', 's3', 's4']) {
      const r = runBalanceSim({ seed, waves: 7, build: MAP1_REFERENCE_BUILD });

      // Uma ordem que falha por falta de ouro enfraquece a build em silêncio e
      // invalida a medição — por isso é erro, não aviso.
      expect(r.failedOrders).toEqual([]);
      expect(r.towersBuilt).toBe(MAP1_REFERENCE_BUILD.length);
    }
  });

  it('deve sobreviver às 7 primeiras ondas com a build de referência', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      const r = runBalanceSim({ seed, waves: 7, build: MAP1_REFERENCE_BUILD });

      expect(r.status).toBe('PLAYING');
      expect(r.wavesCompleted).toBe(7);
      expect(r.baseHpRemaining).toBeGreaterThan(0);
      expect(r.totalKills).toBeGreaterThan(30);
    }
  });
  it('deve vencer a campanha completa de 10 ondas com a build de referência e reinvestimento de ouro em upgrades', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      const r = runBalanceSim({
        seed,
        waves: 10,
        build: MAP1_REFERENCE_BUILD,
        autoUpgradeGold: true,
      });

      expect(r.failedOrders).toEqual([]);
      expect(r.wavesCompleted).toBe(10);
      expect(r.baseHpRemaining).toBeGreaterThan(0);
      expect(r.upgradesApplied).toBeGreaterThanOrEqual(10);
      expect(r.waveMetrics.every(w => !w.timedOut)).toBe(true);
    }
  });


  it('deve encerrar toda onda por conta própria, sem estourar a trava de passos', () => {
    // Pega regressão do tipo "inimigo virou imatável" ou "onda nunca termina".
    const r = runBalanceSim({ seed: 'trava', waves: 7, build: MAP1_REFERENCE_BUILD });

    expect(r.waveMetrics.every(w => !w.timedOut)).toBe(true);
    expect(r.waveMetrics.length).toBe(7);
  });

  it('deve acumular abates a cada onda', () => {
    const r = runBalanceSim({ seed: 'progresso', waves: 7, build: MAP1_REFERENCE_BUILD });

    for (let i = 1; i < r.waveMetrics.length; i++) {
      expect(r.waveMetrics[i].killsAtEnd).toBeGreaterThan(r.waveMetrics[i - 1].killsAtEnd);
    }
  });

  it('deve mostrar a build de referência superando a build mínima na mesma semente', () => {
    const seed = 'monotonicidade';
    const referencia = runBalanceSim({ seed, waves: 7, build: MAP1_REFERENCE_BUILD });
    const minima = runBalanceSim({ seed, waves: 7, build: MAP1_MINIMAL_BUILD });

    expect(referencia.totalKills).toBeGreaterThan(minima.totalKills);
    expect(referencia.hpLost).toBeLessThan(minima.hpLost);
    expect(referencia.wavesCompleted).toBeGreaterThan(minima.wavesCompleted);
  });

  it('deve perder a partida com defesa insuficiente', () => {
    // O outro lado da moeda: se até a build mínima sobrevivesse, o jogo não
    // ofereceria desafio nenhum.
    const r = runBalanceSim({ seed: 'derrota', waves: 10, build: MAP1_MINIMAL_BUILD });

    expect(r.status).toBe('GAME_OVER');
    expect(r.baseHpRemaining).toBe(0);
  });

  it('deve registrar dano para todos os cinco tipos de torre', () => {
    // Pega a classe de bug em que uma torre para de causar dano silenciosamente
    // (foi o caso do Solar Prism, cujo texto de dano nunca aparecia).
    const tipos: TowerType[] = ['BASIC', 'CANNON', 'FROST', 'ARTILLERY', 'SOLAR_PRISM'];

    for (const tipo of tipos) {
      const r = runBalanceSim({
        seed: `isolada-${tipo}`,
        waves: 3,
        startingGold: 500,
        build: [{ wave: 1, type: tipo, gridX: 4, gridY: 2 }],
      });

      expect(r.towersBuilt).toBe(1);
      expect(r.damageByTower[tipo]).toBeGreaterThan(0);
    }
  });

  it('deve melhorar torres e refletir isso na defesa', () => {
    const seed = 'upgrades';
    const build = FULL_DEFENSE_BUILD;

    const semUpgrade = runBalanceSim({ seed, waves: 10, startingGold: 4000, build });
    const comUpgrade = runBalanceSim({
      seed,
      waves: 10,
      startingGold: 4000,
      build,
      upgrades: FULL_DEFENSE_UPGRADES,
    });

    expect(comUpgrade.failedUpgrades).toEqual([]);
    expect(comUpgrade.upgradesApplied).toBeGreaterThan(0);

    // Mesma semente e mesma build: a única diferença é o nível das torres.
    expect(comUpgrade.hpLost).toBeLessThan(semUpgrade.hpLost);
  });

  it('deve gerar ondas endless jogáveis além da campanha', () => {
    const r = runBalanceSim({
      seed: 'endless',
      waves: 12,
      endless: true,
      startingGold: 4000,
      build: FULL_DEFENSE_BUILD,
      upgrades: FULL_DEFENSE_UPGRADES,
    });

    expect(r.failedOrders).toEqual([]);
    expect(r.failedUpgrades).toEqual([]);
    expect(r.waveMetrics.every(w => !w.timedOut)).toBe(true);

    // As ondas 11 e 12 são procedurais: precisam existir, ser combatidas e
    // terminar sozinhas — não travar nem ficar vazias.
    expect(r.wavesStarted).toBe(12);
    expect(r.wavesCompleted).toBe(12);
    expect(r.waveMetrics[10].waveNumber).toBe(11);
    expect(r.waveMetrics[10].killsAtEnd).toBeGreaterThan(r.waveMetrics[9].killsAtEnd);
  });
});
