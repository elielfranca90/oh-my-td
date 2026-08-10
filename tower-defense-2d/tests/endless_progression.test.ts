import { describe, expect, it } from 'vitest';
import {
  FULL_DEFENSE_BUILD,
  FULL_DEFENSE_UPGRADES,
  runBalanceSim,
} from './helpers/balanceSim';

/**
 * Cobertura complementar da Entrega 1 (ranks infinitos) no harness headless:
 * evidência de que investir ranks realmente ajuda no endless profundo — sem
 * hardcodar "em que onda a parede está", porque esse número é uma medida de
 * balanceamento (reportada separadamente ao game-designer), não um contrato
 * de comportamento a travar em teste. Estes testes travam duas propriedades
 * que SÃO contrato: (1) determinismo do harness estendido com investimento
 * automático em ranks; (2) investir em ranks nunca piora a defesa em relação
 * a ficar parado no nível 3, na mesma semente e no mesmo período jogado.
 */

describe('Harness estendido — investimento automático em ranks (autoUpgradeGold)', () => {
  it('é determinístico: mesma semente com o mesmo investimento em ranks dá o mesmo resultado', () => {
    const opcoes = {
      seed: 'ranks-determinismo',
      waves: 16,
      endless: true,
      startingGold: 4000,
      build: FULL_DEFENSE_BUILD,
      upgrades: FULL_DEFENSE_UPGRADES,
      autoUpgradeGold: true,
    };

    const primeira = runBalanceSim(opcoes);
    const segunda = runBalanceSim(opcoes);

    expect(segunda).toEqual(primeira);
  });

  it('gasta ouro de fato em ranks acima do nível 3 quando investe automaticamente', () => {
    const r = runBalanceSim({
      seed: 'ranks-gastam-ouro',
      waves: 14,
      endless: true,
      startingGold: 4000,
      build: FULL_DEFENSE_BUILD,
      upgrades: FULL_DEFENSE_UPGRADES,
      autoUpgradeGold: true,
    });

    // FULL_DEFENSE_UPGRADES já leva 6 torres ao nível 3 (6 upgrades: 1->2 e
    // 2->3 cada uma seria 12, mas o array só faz 1 upgrade por entrada —
    // ver helpers/balanceSim.ts). upgradesApplied bem maior que isso mostra
    // que os ranks 4+ estão de fato sendo comprados onda a onda.
    expect(r.upgradesApplied).toBeGreaterThan(20);
    expect(r.goldSpent).toBeGreaterThan(4000);
  });

  it('investir em ranks nunca deixa a defesa pior do que ficar parada no nível 3, na mesma semente', () => {
    const base = {
      seed: 'ranks-vs-parado',
      waves: 16,
      endless: true,
      startingGold: 4000,
      build: FULL_DEFENSE_BUILD,
      upgrades: FULL_DEFENSE_UPGRADES,
    };

    const semRanks = runBalanceSim(base);
    const comRanks = runBalanceSim({ ...base, autoUpgradeGold: true });

    // Mesmo período jogado (16 ondas), mesma build/semente: investir em ranks
    // não pode deixar a base com MENOS vida restante nem matar em onda mais cedo.
    expect(comRanks.wavesCompleted).toBeGreaterThanOrEqual(semRanks.wavesCompleted);
    expect(comRanks.baseHpRemaining).toBeGreaterThanOrEqual(semRanks.baseHpRemaining);
  });
});
