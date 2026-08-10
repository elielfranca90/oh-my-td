import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { EnemyManager2D } from '../src/engine/EnemyManager';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { Rng } from '../src/engine/Rng';
import { WaveManager } from '../src/engine/WaveManager';
import type { ChallengeMode, EnemyType } from '../src/types';

/**
 * Cobertura das Entregas 2 e 4 do P1_BALANCE_SPEC.md — curva de ouro do
 * endless e densidade/corte da campanha. `EnemyManager2D.computeGoldMultiplier`
 * é privado por design (§"contrato de API"); em vez de furar o encapsulamento
 * chamando-o direto, cada teste força a ONDA a spawnar um inimigo conhecido
 * (sobrescrevendo `WaveManager.waves[i]`, que é público) e lê
 * `enemy.data.goldReward`/`maxHp` — o mesmo dado que o jogador vê na HUD.
 *
 * Sobrescrever a config da onda não maquia a fórmula de ouro nem de HP: ambas
 * continuam vindo do `currentWaveIndex` real do WaveManager, que não é tocado
 * — só a composição de inimigos daquela onda é substituída por um único
 * STANDARD, para isolar a métrica "ouro por ponto de HP" de qualquer variação
 * de tipo (RUNNER/TANK/etc. têm proporções reward/hp diferentes de 1:1).
 */

interface SpawnResult {
  goldReward: number;
  maxHp: number;
}

/** Força a onda `waveNum` (1-based) a conter um único STANDARD e o spawna de verdade. */
function spawnStandardAtWave(waveNum: number, challengeMode: ChallengeMode = 'NORMAL'): SpawnResult {
  const rng = new Rng(`gold-curve-${waveNum}-${challengeMode}`);
  const map = new MapManager2D('MAP_1');
  const state = new GameState(undefined, challengeMode);
  const audio = new AudioManager();
  const wm = new WaveManager(rng);
  const em = new EnemyManager2D(map, state, wm, audio, undefined, undefined, rng);

  // Sobrescreve só a composição da onda-alvo; hpMultiplier e goldMultiplier
  // continuam vindo do currentWaveIndex real (não tocado por este helper).
  wm.waves[waveNum - 1] = { waveNumber: waveNum, enemies: [{ type: 'STANDARD' as EnemyType, delay: 10 }] };
  wm.currentWaveIndex = waveNum - 2; // startNextWave() vai ler waves[waveNum-1]

  expect(wm.startNextWave()).toBe(true);
  em.update(50, []); // deltaTimeMs 50 > delay 10 -> spawna no primeiro update

  const enemies = em.getEnemies();
  expect(enemies.length).toBe(1);
  return { goldReward: enemies[0].data.goldReward, maxHp: enemies[0].data.maxHp };
}

describe('Entrega 4 — corte de ouro da campanha recalibrado (§4.2)', () => {
  it('onda 1: sem corte (goldMultiplier = 1.0)', () => {
    const r = spawnStandardAtWave(1);
    // hpMultiplier onda1 = 1.0 -> reward = round(10 * 1^0.4 * 1.0) = 10
    expect(r.goldReward).toBe(10);
    expect(r.maxHp).toBe(10);
  });

  it('onda 2: corte de 0.60 já entra em vigor (era onda>=4 com 0.75 antes da Entrega 4)', () => {
    const r = spawnStandardAtWave(2);
    // hpMultiplier onda2 = 1.15 -> reward = round(10 * 1.15^0.4 * 0.60)
    const esperado = Math.round(10 * Math.pow(1.15, 0.4) * 0.6);
    expect(r.goldReward).toBe(esperado);
    expect(r.goldReward).toBe(6);
  });

  it('onda 10: corte de 0.60 continua valendo (mesmo branch da onda 2)', () => {
    const r = spawnStandardAtWave(10);
    const esperado = Math.round(10 * Math.pow(4.5, 0.4) * 0.6);
    expect(r.goldReward).toBe(esperado);
    expect(r.goldReward).toBe(11);
  });

  it('MORTE_CERTA multiplica por 1.5 por cima do corte de campanha', () => {
    const normal = spawnStandardAtWave(5, 'NORMAL');
    const morteCerta = spawnStandardAtWave(5, 'MORTE_CERTA');

    expect(morteCerta.goldReward).toBe(Math.round(normal.goldReward * 1.5));
  });
});

describe('Entrega 2 — compensação de expoente e smoothCut no endless (§2.2)', () => {
  it('onda 11 (primeira do endless): reward bate com a referência absoluta do §2.4 (~29g)', () => {
    const r = spawnStandardAtWave(11);
    // hpMultiplier onda11 = 4.5*1.18^1 = 5.31 (mesmo valor de tests/wave.test.ts)
    expect(r.goldReward).toBe(29);
  });

  it('onda 20: reward bate com a referência absoluta do §2.4 (~82g)', () => {
    const r = spawnStandardAtWave(20);
    expect(r.goldReward).toBe(82);
  });

  it('onda 30: reward bate com a referência absoluta do §2.4 (~256g)', () => {
    const r = spawnStandardAtWave(30);
    expect(r.goldReward).toBe(255); // arredondamento real do código; spec dá ~256 por conta de cabeça
  });

  it('razão ouro/HP na onda 30 é ~5x maior que a fórmula antiga (expoente 0.4 fixo, corte 0.75 fixo)', () => {
    const onda30 = spawnStandardAtWave(30);
    const hpMultiplier30 = Number((4.5 * Math.pow(1.18, 30 - 10)).toFixed(2));

    const razaoNova = onda30.goldReward / onda30.maxHp;
    // §2.3 do P1_BALANCE_SPEC.md: a razão nova na onda 30 é ~0.207 — validado
    // aqui por cálculo direto do jogo real, não copiado da tabela do documento.
    expect(razaoNova).toBeCloseTo(0.207, 2);

    // Fórmula ANTIGA do endless (pré-P1): corte fixo de 25% em vez do smoothCut,
    // sem compensação de expoente — reconstruída aqui só para comparação, não
    // para reintroduzir no código.
    const rewardAntigo = Math.round(10 * Math.pow(hpMultiplier30, 0.4) * 0.75);
    const hpAntigo = Math.round(10 * hpMultiplier30);
    const razaoAntiga = rewardAntigo / hpAntigo;

    expect(razaoAntiga).toBeCloseTo(0.042, 2); // bate com a auditoria original
    expect(razaoNova).toBeGreaterThan(razaoAntiga * 4); // ganho de ~4.9x (§2.3)
  });

  it('dentro do próprio endless, a razão ouro/HP continua caindo da onda 20 para a 30 (não fica plana)', () => {
    const onda20 = spawnStandardAtWave(20);
    const onda30 = spawnStandardAtWave(30);

    const razao20 = onda20.goldReward / onda20.maxHp;
    const razao30 = onda30.goldReward / onda30.maxHp;

    // O dreno de ouro que justifica os ranks de torre (Entrega 1) continua
    // existindo — só parou de ser uma queda de precipício.
    expect(razao30).toBeLessThan(razao20);
    expect(razao30).toBeGreaterThan(razao20 * 0.4);
  });

  it('smoothCut satura no piso de 0.45 a partir da onda 60 e nunca zera', () => {
    const onda60 = spawnStandardAtWave(60);
    const onda70 = spawnStandardAtWave(70);

    // Se o smoothCut estivesse zerando ou saturando errado, o reward das duas
    // ondas divergiria só pela compensação de expoente (que continua subindo);
    // como ambas usam o mesmo piso 0.45, a proporção reward/hpMultiplier^0.75
    // (a parte "achatada" da fórmula) deve ser igual nas duas.
    const hp60 = 4.5 * Math.pow(1.18, 60 - 10);
    const hp70 = 4.5 * Math.pow(1.18, 70 - 10);
    const razaoAchatada60 = onda60.goldReward / Math.pow(hp60, 0.75);
    const razaoAchatada70 = onda70.goldReward / Math.pow(hp70, 0.75);

    expect(razaoAchatada60).toBeCloseTo(razaoAchatada70, 1);
    expect(onda70.goldReward).toBeGreaterThan(0);
  });
});
