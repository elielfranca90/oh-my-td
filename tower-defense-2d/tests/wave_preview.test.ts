import { describe, expect, it } from 'vitest';
import { WaveManager } from '../src/engine/WaveManager';

describe('Preview de onda e arquétipos do endless', () => {
  it('deve prever a onda 1 antes de começar, agrupada por tipo', () => {
    const wm = new WaveManager();
    const preview = wm.getNextWavePreview();

    expect(preview).not.toBeNull();
    expect(preview?.waveNumber).toBe(1);
    expect(preview?.totalEnemies).toBe(6);
    expect(preview?.hasBoss).toBe(false);

    // Onda 1 é só STANDARD -> uma única entrada agrupada
    expect(preview?.entries).toEqual([{ type: 'STANDARD', count: 6 }]);
  });

  it('deve marcar hasBoss nas ondas de chefe da campanha', () => {
    const wm = new WaveManager();

    // Avança até a onda 5 ficar sendo a próxima
    for (let i = 0; i < 4; i++) {
      wm.startNextWave();
      wm.isWaveActive = false;
    }

    const preview = wm.getNextWavePreview();
    expect(preview?.waveNumber).toBe(5);
    expect(preview?.hasBoss).toBe(true);
    expect(preview?.entries.some(e => e.type === 'BOSS')).toBe(true);
  });

  it('não deve prever nada durante uma onda ativa', () => {
    const wm = new WaveManager();
    wm.startNextWave();

    expect(wm.isWaveActive).toBe(true);
    expect(wm.getNextWavePreview()).toBeNull();
  });

  it('não deve prever nada depois da campanha sem endless', () => {
    const wm = new WaveManager();
    for (let i = 0; i < 10; i++) {
      wm.startNextWave();
      wm.isWaveActive = false;
    }

    expect(wm.currentWaveIndex).toBe(9);
    expect(wm.getNextWavePreview()).toBeNull();
  });

  it('deve prever a onda endless exatamente como ela vai spawnar', () => {
    const wm = new WaveManager();
    wm.setEndlessMode(true);
    for (let i = 0; i < 10; i++) {
      wm.startNextWave();
      wm.isWaveActive = false;
    }

    const preview = wm.getNextWavePreview();
    expect(preview?.waveNumber).toBe(11);

    // O preview gera a config; iniciar a onda precisa consumir a MESMA config,
    // e não sortear uma composição diferente.
    wm.startNextWave();
    const config = wm.waves[wm.currentWaveIndex];

    expect(config.waveNumber).toBe(11);
    expect(preview?.totalEnemies).toBe(config.enemies.length);

    const somaPreview = preview?.entries.reduce((acc, e) => acc + e.count, 0);
    expect(somaPreview).toBe(config.enemies.length);
  });

  it('deve atribuir arquétipos deterministicamente por número de onda', () => {
    const wm = new WaveManager();

    // Múltiplos de 3 casam com o que a HUD e a BGM já tratam como onda de chefe
    expect(wm.getEndlessArchetype(12)).toBe('BOSS_RUSH');
    expect(wm.getEndlessArchetype(15)).toBe('BOSS_RUSH');
    expect(wm.getEndlessArchetype(18)).toBe('BOSS_RUSH');

    // O restante cicla, então o ritmo é aprendível em vez de sorteio puro
    expect(wm.getEndlessArchetype(11)).toBe('SWARM');
    expect(wm.getEndlessArchetype(13)).toBe('RUSH');
    expect(wm.getEndlessArchetype(14)).toBe('MIXED');
    expect(wm.getEndlessArchetype(16)).toBe('ARMORED');

    // Determinístico: mesma onda, mesmo arquétipo
    expect(wm.getEndlessArchetype(16)).toBe(wm.getEndlessArchetype(16));
  });

  it('deve dar identidade distinta a cada arquétipo na composição gerada', () => {
    const wm = new WaveManager();
    wm.setEndlessMode(true);

    const swarm = wm['generateEndlessWave'](11); // SWARM
    const armored = wm['generateEndlessWave'](16); // ARMORED

    expect(swarm.archetype).toBe('SWARM');
    expect(armored.archetype).toBe('ARMORED');

    // Enxame: mais inimigos e mais rápido; Blindada: menos e mais espaçado
    expect(swarm.enemies.length).toBeGreaterThan(armored.enemies.length);

    const delaySwarm = swarm.enemies[0].delay;
    const delayArmored = armored.enemies[0].delay;
    expect(delaySwarm).toBeLessThan(delayArmored);

    // Enxame não traz alvos blindados; Blindada é feita deles
    const tiposSwarm = new Set(swarm.enemies.map(e => e.type));
    expect(tiposSwarm.has('TANK')).toBe(false);
    expect(tiposSwarm.has('MOSS_GIANT')).toBe(false);

    const pesadosArmored = armored.enemies.filter(
      e => e.type === 'TANK' || e.type === 'MOSS_GIANT' || e.type === 'SHIELDED'
    );
    expect(pesadosArmored.length).toBeGreaterThan(0);
  });

  it('deve refletir a troca do Morte Certa no preview da onda 10', () => {
    const wm = new WaveManager();
    wm.isMorteCerta = true;

    for (let i = 0; i < 9; i++) {
      wm.startNextWave();
      wm.isWaveActive = false;
    }

    const preview = wm.getNextWavePreview();
    expect(preview?.waveNumber).toBe(10);

    // Na onda 10 do Morte Certa os BOSS viram BLACK_MEGA_BOSS no spawn real,
    // então o preview precisa mostrar isso em vez de mentir.
    expect(preview?.entries.some(e => e.type === 'BLACK_MEGA_BOSS')).toBe(true);
    expect(preview?.entries.some(e => e.type === 'BOSS')).toBe(false);
  });
});
