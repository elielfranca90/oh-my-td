import { describe, expect, it } from 'vitest';
import { WaveManager } from '../src/engine/WaveManager';

/**
 * Cobertura da Entrega 3 do P1_BALANCE_SPEC.md — "Chamada antecipada de onda
 * com bônus". Superfície nova, sem teste prévio (confirmado na spec §"Cobertura
 * ausente"). Cobre a fórmula do getter puro (§3.2) e a mudança de comportamento
 * de `updateAutoCountdown` (§3.1): o contador decrementa nos dois modos, mas só
 * o Auto se auto-inicia.
 */

describe('Entrega 3 — WaveManager.getEarlyCallBonus() é um getter puro', () => {
  it('não muta autoCountdownMs nem qualquer outro estado ao ser chamado', () => {
    const wm = new WaveManager();
    const antes = wm.autoCountdownMs;

    wm.getEarlyCallBonus();

    expect(wm.autoCountdownMs).toBe(antes);
    expect(wm.isWaveActive).toBe(false);
    expect(wm.currentWaveIndex).toBe(-1);
  });

  it('duas chamadas seguidas devolvem exatamente o mesmo valor', () => {
    const wm = new WaveManager();
    wm.autoCountdownMs = 3200;

    const primeira = wm.getEarlyCallBonus();
    const segunda = wm.getEarlyCallBonus();

    expect(segunda).toBe(primeira);
  });

  it('devolve 0 durante uma onda ativa, independente do tempo restante no contador', () => {
    const wm = new WaveManager();
    wm.startNextWave();
    expect(wm.isWaveActive).toBe(true);
    wm.autoCountdownMs = 5000; // valor alto, para provar que isWaveActive é o que zera, não o contador

    expect(wm.getEarlyCallBonus()).toBe(0);
  });

  it('respeita o teto absoluto de 60g mesmo com secondsSaved e perSecondRate altos', () => {
    const wm = new WaveManager();
    // Força currentWaveIndex bem adiante (onda seguinte terá perSecondRate alto)
    // e o contador no máximo teórico — a fórmula bruta excederia 60 de sobra.
    wm.currentWaveIndex = 200; // nextWaveNum = 202, perSecondRate = 2 + floor(202/5) = 42
    wm.autoCountdownMs = 5000; // secondsSaved = 5

    // Bruto seria 42*5=210, muito acima do teto -> deve saturar em 60.
    expect(wm.getEarlyCallBonus()).toBe(60);
  });

  it('fórmula exata: perSecondRate = 2 + floor(nextWaveNum/5), bônus = floor(min(60, taxa*segundos))', () => {
    const wm = new WaveManager();

    // Estado inicial: currentWaveIndex = -1 -> nextWaveNum = 1 -> taxa = 2g/s
    // (linha 1 da tabela §3.6 do P1_BALANCE_SPEC.md)
    wm.autoCountdownMs = 5000; // 5s poupados, chamada instantânea
    expect(wm.getEarlyCallBonus()).toBe(10); // floor(min(60, 2*5)) = 10

    wm.autoCountdownMs = 2000; // 2s poupados
    expect(wm.getEarlyCallBonus()).toBe(4); // floor(min(60, 2*2)) = 4

    // Onda 20 como próxima: currentWaveIndex=18 -> nextWaveNum=20 -> taxa=2+floor(20/5)=6g/s
    wm.currentWaveIndex = 18;
    wm.autoCountdownMs = 5000;
    expect(wm.getEarlyCallBonus()).toBe(30); // floor(min(60, 6*5)) = 30
    wm.autoCountdownMs = 2000;
    expect(wm.getEarlyCallBonus()).toBe(12); // floor(min(60, 6*2)) = 12
  });
});

describe('Entrega 3 — updateAutoCountdown decrementa nos dois modos (§3.1)', () => {
  it('em modo Manual o contador decresce, chega a zero e FICA parado — sem auto-iniciar a onda', () => {
    const wm = new WaveManager();
    expect(wm.isAutoMode).toBe(false);

    wm.updateAutoCountdown(4000);
    expect(wm.autoCountdownMs).toBe(1000);
    expect(wm.isWaveActive).toBe(false);
    expect(wm.currentWaveIndex).toBe(-1); // nenhuma onda começou sozinha

    wm.updateAutoCountdown(1000); // chega a zero
    expect(wm.autoCountdownMs).toBe(0);
    expect(wm.isWaveActive).toBe(false);
    expect(wm.currentWaveIndex).toBe(-1);

    // Tempo extra depois de chegar a zero: continua parado em zero, não vira negativo.
    wm.updateAutoCountdown(3000);
    expect(wm.autoCountdownMs).toBe(0);
    expect(wm.isWaveActive).toBe(false);
    expect(wm.currentWaveIndex).toBe(-1);
  });

  it('em modo Auto o contador decresce igual e, ao chegar a zero, inicia a onda sozinho', () => {
    const wm = new WaveManager();
    wm.setAutoMode(true);

    wm.updateAutoCountdown(4000);
    expect(wm.autoCountdownMs).toBe(1000);
    expect(wm.isWaveActive).toBe(false);

    wm.updateAutoCountdown(1000); // chega a zero -> auto-início
    expect(wm.isWaveActive).toBe(true);
    expect(wm.currentWaveIndex).toBe(0);
    expect(wm.autoCountdownMs).toBe(5000); // updateAutoCountdown reseta explicitamente após o auto-início
  });

  it('o decremento em si é idêntico nos dois modos antes de chegar a zero (só o auto-início diverge)', () => {
    const manual = new WaveManager();
    const auto = new WaveManager();
    auto.setAutoMode(true);

    manual.updateAutoCountdown(1700);
    auto.updateAutoCountdown(1700);

    expect(manual.autoCountdownMs).toBe(auto.autoCountdownMs);
    expect(manual.isWaveActive).toBe(false);
    expect(auto.isWaveActive).toBe(false); // ainda não chegou a zero, então nenhum dos dois iniciou
  });

  it('não decrementa enquanto uma onda está ativa', () => {
    const wm = new WaveManager();
    wm.startNextWave();
    const antes = wm.autoCountdownMs;

    wm.updateAutoCountdown(2000);

    expect(wm.autoCountdownMs).toBe(antes);
  });
});

describe('Entrega 3 — contrato de ordem de chamada (§3.3)', () => {
  it('getEarlyCallBonus() ANTES de startNextWave() dá o bônus certo; depois, o valor já mudou', () => {
    const wm = new WaveManager();
    wm.autoCountdownMs = 2500; // 2.5s poupados na onda 1

    const bonusAntes = wm.getEarlyCallBonus();
    expect(bonusAntes).toBe(5); // floor(min(60, 2*2.5)) = 5

    expect(wm.startNextWave()).toBe(true);

    // Depois de startNextWave(): currentWaveIndex avançou e autoCountdownMs
    // ainda não foi resetado (só reseta em onEnemyCleared/setAutoMode) — mas
    // agora isWaveActive é true, então o getter passa a devolver 0. Chamar na
    // ordem errada (depois) sempre dá um valor diferente do que o jogador viu.
    expect(wm.getEarlyCallBonus()).toBe(0);
  });

  it('só credita quando startNextWave() de fato inicia a onda (uso correto do contrato)', () => {
    const wm = new WaveManager();
    wm.startNextWave(); // onda já ativa

    // Um clique duplo chamaria getEarlyCallBonus() de novo com a onda já ativa.
    const bonus = wm.getEarlyCallBonus();
    const iniciou = wm.startNextWave(); // false: já há onda ativa

    expect(bonus).toBe(0);
    expect(iniciou).toBe(false);
    // Nenhum ouro deveria ser creditado neste fluxo (o chamador só credita se
    // startNextWave() retornar true — aqui retornou false).
  });
});
