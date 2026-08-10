import { describe, expect, it } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { AudioManager } from '../src/engine/AudioManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import type { TowerType } from '../src/types';

/**
 * Cobertura da Entrega 1 do P1_BALANCE_SPEC.md — "Níveis infinitos de torre".
 * Todos os números vêm da fórmula fechada do §1.2/§1.3/§1.6, calculados a
 * partir do `rankBaseline` que a própria torre captura (nunca copiados da
 * tabela de validação §1.5, que assume um baseline hipotético sem efeito de
 * especialização — impossível de reproduzir no jogo real, onde 2->3 exige
 * escolher SIEGE/NAPALM/etc.).
 */

/** Sobe até o nível 2, sem escolha ainda exigida. */
function noNivel2(type: TowerType): Tower2D {
  const tower = new Tower2D(4, 2, 60, type, `t-${type}`);
  expect(tower.upgrade()).toBe(true);
  return tower;
}

describe('Entrega 1 — níveis 1→2→3 permanecem bit-a-bit idênticos', () => {
  it('BASIC: dano, alcance, HP e custo de upgrade não mudam nos 3 primeiros níveis', () => {
    const tower = new Tower2D(4, 2, 60, 'BASIC', 't-basic');
    expect(tower.data.damage).toBe(5);
    expect(tower.data.range).toBe(150);
    expect(tower.data.maxHp).toBe(100);
    expect(tower.getUpgradeCost()).toBe(Math.floor(50 * 0.8 * 1)); // 40

    expect(tower.upgrade()).toBe(true); // nível 2
    expect(tower.data.level).toBe(2);
    expect(tower.data.damage).toBe(7); // floor(5*1.5)
    expect(tower.data.range).toBe(172); // floor(150*1.15)
    expect(tower.data.maxHp).toBe(140); // floor(100*1.4)
    expect(tower.getUpgradeCost()).toBe(Math.floor(50 * 0.8 * 2)); // 80

    expect(tower.upgrade('PIERCING')).toBe(true); // nível 3, especialização sem efeito de stats
    expect(tower.data.level).toBe(3);
    expect(tower.data.damage).toBe(10); // floor(7*1.5)
    expect(tower.data.range).toBe(197); // floor(172*1.15)
    expect(tower.data.maxHp).toBe(196); // floor(140*1.4)
    expect(tower.getUpgradeCost()).toBe(Math.floor(50 * 0.8 * 3)); // 120 (rank=0, fórmula antiga intacta)
  });

  it('getSellValue() do nível 1-3 continua igual (laço fechado, sem expoente de rank)', () => {
    const tower = new Tower2D(4, 2, 60, 'BASIC', 't-sell');
    tower.upgrade();
    tower.upgrade('PIERCING');
    // total investido = 50 (build) + 40 (1->2) + 80 (2->3) = 170; venda = floor(170*0.7).
    // 170*0.7 é 118.999...9 em ponto flutuante (não 119 exato) — floor() dá 118.
    // Comportamento pré-existente, não uma regressão desta entrega.
    expect(tower.getSellValue()).toBe(Math.floor(170 * 0.7));
  });
});

describe('Entrega 1 — armadilha do floor() recorrente (§1.3), provada na BASIC', () => {
  it('não trava em 10 para sempre: uma implementação recorrente com floor() travaria, a fechada não', () => {
    const tower = noNivel2('BASIC');
    tower.upgrade('PIERCING'); // nível 3: damage baseline = 10 (a armadilha aparece exatamente aqui)
    expect(tower.data.rankBaseline?.damage).toBe(10);

    // floor(10 * 1.08) = floor(10.8) = 10 -- IDÊNTICO ao baseline. Se a
    // implementação fosse recorrente (aplicando floor sobre o valor já
    // arredondado do rank anterior), o dano ficaria travado em 10 para
    // sempre a partir daqui. A fórmula fechada usa sempre o baseline puro
    // (10, não arredondado por rank), então ranks seguintes escapam da trava.
    tower.upgrade(); // rank 1 (nível 4)
    expect(tower.data.damage).toBe(10); // floor(10 * 1.08^1) = floor(10.8) = 10 (ainda igual — esperado)

    tower.upgrade(); // rank 2 (nível 5)
    expect(tower.data.damage).toBe(11); // floor(10 * 1.08^2) = floor(11.664) = 11 -- ESCAPOU da trava

    // Continua subindo por muitos ranks — a prova de que não há platô permanente.
    while (tower.data.level < 13) tower.upgrade(); // rank 10 (nível 13)
    expect(tower.data.level).toBe(13);
    expect(tower.data.damage).toBe(21); // floor(10 * 1.08^10) = floor(21.589) = 21
    expect(tower.data.damage).toBeGreaterThan(10);
  });

  it('o baseline nunca é reescrito depois do nível 3, mesmo após muitos ranks', () => {
    const tower = noNivel2('BASIC');
    tower.upgrade('MULTISHOT'); // nível 3 com efeito de especialização (damage *0.8)
    const baselineNoNivel3 = { ...tower.data.rankBaseline };

    for (let i = 0; i < 20; i++) tower.upgrade();

    expect(tower.data.rankBaseline).toEqual(baselineNoNivel3);
  });
});

describe('Entrega 1 — fireRate fica de fora dos ranks (§1.2)', () => {
  it('cadência não muda em nenhum rank acima do nível 3', () => {
    const tower = noNivel2('FROST');
    tower.upgrade('DEEP_FREEZE'); // nível 3, fireRate*3 aplicado pela especialização
    const fireRateApósEspecializacao = tower.data.fireRate;

    for (let i = 0; i < 15; i++) tower.upgrade();

    expect(tower.data.fireRate).toBe(fireRateApósEspecializacao);
  });
});

describe('Entrega 1 — tetos de alcance (rank 25) e splash (rank 40)', () => {
  it('alcance para de crescer a partir do rank 25', () => {
    const tower = noNivel2('BASIC');
    tower.upgrade('PIERCING'); // baseline range = 197 (sem efeito de especialização)
    const baseline = tower.data.rankBaseline!.range;

    while (tower.data.level < 3 + 25) tower.upgrade(); // rank 25
    const rangeNoRank25 = tower.data.range;
    expect(rangeNoRank25).toBe(Math.floor(baseline * Math.pow(1.02, 25)));

    tower.upgrade(); // rank 26 — deveria estar congelado
    expect(tower.data.range).toBe(rangeNoRank25);

    while (tower.data.level < 3 + 60) tower.upgrade(); // rank 60, bem acima do teto
    expect(tower.data.range).toBe(rangeNoRank25);
  });

  it('splashRadius (CANNON+SHRAPNEL) para de crescer a partir do rank 40', () => {
    const tower = noNivel2('CANNON');
    tower.upgrade('SHRAPNEL'); // splashRadius=34, atribuído pela especialização
    expect(tower.data.rankBaseline?.splashRadius).toBe(34);

    while (tower.data.level < 3 + 40) tower.upgrade(); // rank 40
    const splashNoRank40 = tower.data.splashRadius;
    expect(splashNoRank40).toBe(Math.floor(34 * Math.pow(1.01, 40)));

    tower.upgrade(); // rank 41 — congelado
    expect(tower.data.splashRadius).toBe(splashNoRank40);
  });

  it('maxHp e dano continuam crescendo sem teto muito além dos tetos de alcance/splash', () => {
    const tower = noNivel2('ARTILLERY');
    tower.upgrade('SIEGE');
    const baseline = { ...tower.data.rankBaseline! };

    while (tower.data.level < 3 + 60) tower.upgrade(); // rank 60

    expect(tower.data.damage).toBe(Math.floor(baseline.damage * Math.pow(1.08, 60)));
    expect(tower.data.maxHp).toBe(Math.floor(baseline.maxHp * Math.pow(1.05, 60)));
    // Sem teto: rank 60 é visivelmente maior que rank 40 nesses dois eixos.
    expect(tower.data.damage).toBeGreaterThan(baseline.damage * 10);
  });
});

describe('Entrega 1 — custo do rank N (§1.6)', () => {
  it('getUpgradeCost() aplica ×1.10^(level-3) só a partir do nível 3', () => {
    const tower = noNivel2('ARTILLERY'); // cost base 110
    tower.upgrade('SIEGE'); // nível 3

    // No nível 3 (rank 0): fórmula antiga, sem multiplicador de rank.
    expect(tower.getUpgradeCost()).toBe(Math.floor(110 * 0.8 * 3)); // 264 (3->4)

    tower.upgrade(); // nível 4 (rank 1)
    expect(tower.getUpgradeCost()).toBe(Math.floor(110 * 0.8 * 4 * Math.pow(1.10, 1))); // 387 (4->5)

    tower.upgrade(); // nível 5 (rank 2)
    expect(tower.getUpgradeCost()).toBe(Math.floor(110 * 0.8 * 5 * Math.pow(1.10, 2))); // 532 (5->6)
  });

  it('getSellValue() usa a mesma fórmula fechada dentro do laço, sem custo acumulado por multiplicação sucessiva', () => {
    const tower = noNivel2('BASIC');
    tower.upgrade('PIERCING'); // nível 3
    for (let i = 0; i < 5; i++) tower.upgrade(); // até nível 8

    let totalInvestido = 50; // custo de construção
    for (let l = 1; l < tower.data.level; l++) {
      const rank = Math.max(0, l - 3);
      totalInvestido += Math.floor(50 * 0.8 * l * Math.pow(1.10, rank));
    }
    expect(tower.getSellValue()).toBe(Math.floor(totalInvestido * 0.7));
  });
});

describe('Entrega 1 — ranks pelo TowerManager2D (caminho real de compra)', () => {
  it('upgradeSelectedTower() sobe além do nível 3 cobrando ouro a cada rank', () => {
    const map = new MapManager2D('MAP_1');
    const pm = new ProjectileManager2D();
    const state = new GameState();
    state.gold = 100000;
    const audio = new AudioManager();
    const tm = new TowerManager2D(map, pm, state, audio);

    tm.setSelectedBuildType('BASIC');
    tm.placeTower(4, 2);
    expect(tm.selectedTower).toBeDefined();

    expect(tm.upgradeSelectedTower()).toBe(true); // 1->2
    expect(tm.upgradeSelectedTower('PIERCING')).toBe(true); // 2->3

    const goldAntesDosRanks = state.gold;
    for (let i = 0; i < 5; i++) {
      expect(tm.upgradeSelectedTower()).toBe(true); // ranks 1-5, sem especialização
    }
    expect(tm.selectedTower!.data.level).toBe(8);
    expect(state.gold).toBeLessThan(goldAntesDosRanks);
  });

  it('não exige especialização válida em rank algum acima do nível 2', () => {
    const map = new MapManager2D('MAP_1');
    const pm = new ProjectileManager2D();
    const state = new GameState();
    state.gold = 100000;
    const audio = new AudioManager();
    const tm = new TowerManager2D(map, pm, state, audio);

    tm.setSelectedBuildType('FROST');
    tm.placeTower(4, 2);
    tm.upgradeSelectedTower();
    tm.upgradeSelectedTower('PERMAFROST');

    // Especialização inválida para FROST (NAPALM é de ARTILLERY/CANNON) — mas
    // como já passamos do nível 2, o argumento é ignorado, não recusado.
    expect(tm.upgradeSelectedTower('NAPALM')).toBe(true);
    expect(tm.selectedTower!.data.level).toBe(4);
  });
});
