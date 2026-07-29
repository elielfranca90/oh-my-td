import { EventBus } from './EventBus';

import type { EnemyType } from '../types';

/**
 * Identidade de uma onda do modo endless. Antes toda onda acima da 10 era um
 * sorteio uniforme entre os mesmos tipos com delay constante, então
 * estatisticamente todas eram a mesma onda — sem pico, sem alívio, sem leitura.
 */
export type EndlessArchetype = 'SWARM' | 'ARMORED' | 'RUSH' | 'MIXED' | 'BOSS_RUSH';

interface ArchetypeSpec {
  pool: { type: EnemyType; weight: number }[];
  countScale: number;
  delayScale: number;
  extraBosses: number;
}

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; delay: number }[];
  archetype?: EndlessArchetype;
}

export interface WavePreviewEntry {
  type: EnemyType;
  count: number;
}

export interface WavePreview {
  waveNumber: number;
  entries: WavePreviewEntry[];
  totalEnemies: number;
  hasBoss: boolean;
  archetype?: EndlessArchetype;
}

export class WaveManager {
  public waves: WaveConfig[] = [
    // Wave 1
    {
      waveNumber: 1,
      enemies: [
        { type: 'STANDARD', delay: 1000 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
        { type: 'STANDARD', delay: 1200 },
      ],
    },
    // Wave 2
    {
      waveNumber: 2,
      enemies: [
        { type: 'STANDARD', delay: 1000 },
        { type: 'RUNNER', delay: 700 },
        { type: 'RUNNER', delay: 700 },
        { type: 'STANDARD', delay: 1000 },
        { type: 'RUNNER', delay: 700 },
        { type: 'RUNNER', delay: 700 },
        { type: 'STANDARD', delay: 1000 },
      ],
    },
    // Wave 3
    {
      waveNumber: 3,
      enemies: [
        { type: 'STANDARD', delay: 900 },
        { type: 'SPORE_SPRINTER', delay: 1000 },
        { type: 'TANK', delay: 1800 },
        { type: 'STANDARD', delay: 900 },
        { type: 'SPORE_SPRINTER', delay: 1000 },
        { type: 'TANK', delay: 1800 },
      ],
    },
    // Wave 4
    {
      waveNumber: 4,
      enemies: [
        { type: 'RUNNER', delay: 500 },
        { type: 'SPORE_SPRINTER', delay: 600 },
        { type: 'RUNNER', delay: 500 },
        { type: 'TANK', delay: 1400 },
        { type: 'MOSS_GIANT', delay: 2000 },
        { type: 'RUNNER', delay: 500 },
      ],
    },
    // Wave 5 - MID-GAME BOSS
    {
      waveNumber: 5,
      enemies: [
        { type: 'STANDARD', delay: 800 },
        { type: 'TANK', delay: 1200 },
        { type: 'TANK', delay: 1200 },
        { type: 'BOSS', delay: 2500 },
        { type: 'RUNNER', delay: 600 },
        { type: 'RUNNER', delay: 600 },
      ],
    },
    // Wave 6
    {
      waveNumber: 6,
      enemies: [
        { type: 'MOSS_GIANT', delay: 1800 },
        { type: 'RUNNER', delay: 450 },
        // Estreia do SHIELDED: ensina escudo vs tiro leve antes das ondas finais
        { type: 'SHIELDED', delay: 1100 },
        { type: 'TANK', delay: 1200 },
        { type: 'MOSS_GIANT', delay: 1800 },
        { type: 'RUNNER', delay: 450 },
      ],
    },
    // Wave 7 - SWARM
    {
      waveNumber: 7,
      enemies: [
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'SPORE_SPRINTER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'STANDARD', delay: 400 },
        { type: 'RUNNER', delay: 400 },
        { type: 'SPORE_SPRINTER', delay: 400 },
        { type: 'RUNNER', delay: 400 },
      ],
    },
    // Wave 8 - BOSS + ESCORT
    {
      waveNumber: 8,
      enemies: [
        { type: 'TANK', delay: 1000 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'BOSS', delay: 2000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'SHIELDED', delay: 1000 },
        { type: 'TANK', delay: 1000 },
      ],
    },
    // Wave 9 - CHAOS
    {
      waveNumber: 9,
      enemies: [
        { type: 'RUNNER', delay: 350 },
        { type: 'SPORE_SPRINTER', delay: 350 },
        { type: 'SHIELDED', delay: 950 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'TANK', delay: 900 },
        { type: 'RUNNER', delay: 350 },
      ],
    },
    // Wave 10 - ULTIMATE BOSS WAVE
    {
      waveNumber: 10,
      enemies: [
        { type: 'TANK', delay: 800 },
        { type: 'MOSS_GIANT', delay: 1600 },
        { type: 'BOSS', delay: 2000 },
        { type: 'SHIELDED', delay: 1000 },
        { type: 'BOSS', delay: 3000 },
        { type: 'RUNNER', delay: 400 },
        { type: 'TANK', delay: 800 },
      ],
    },
  ];

  /**
   * Pesos e ritmo de cada arquétipo. `countScale`/`delayScale` são aplicados
   * sobre a curva base da onda, então a progressão de dificuldade continua
   * vindo do número da onda — o arquétipo só muda a *forma* da pressão.
   */
  private static readonly ARCHETYPES: Record<EndlessArchetype, ArchetypeSpec> = {
    // Muitos inimigos baratos e rápidos: pressiona cobertura de área.
    SWARM: {
      pool: [
        { type: 'STANDARD', weight: 5 },
        { type: 'RUNNER', weight: 4 },
        { type: 'SPORE_SPRINTER', weight: 3 },
      ],
      countScale: 1.45,
      delayScale: 0.7,
      extraBosses: 0,
    },
    // Poucos alvos muito duros: pressiona dano concentrado e anti-armadura.
    ARMORED: {
      pool: [
        { type: 'TANK', weight: 4 },
        { type: 'MOSS_GIANT', weight: 3 },
        { type: 'SHIELDED', weight: 3 },
        { type: 'STANDARD', weight: 1 },
      ],
      countScale: 0.7,
      delayScale: 1.35,
      extraBosses: 0,
    },
    // Fila apertada de inimigos velozes: pressiona lentidão e alcance.
    RUSH: {
      pool: [
        { type: 'RUNNER', weight: 6 },
        { type: 'SPORE_SPRINTER', weight: 4 },
        { type: 'STANDARD', weight: 1 },
      ],
      countScale: 1.15,
      delayScale: 0.55,
      extraBosses: 0,
    },
    MIXED: {
      pool: [
        { type: 'STANDARD', weight: 1 },
        { type: 'RUNNER', weight: 1 },
        { type: 'TANK', weight: 1 },
        { type: 'SHIELDED', weight: 1 },
        { type: 'SPORE_SPRINTER', weight: 1 },
        { type: 'MOSS_GIANT', weight: 1 },
      ],
      countScale: 1.0,
      delayScale: 1.0,
      extraBosses: 0,
    },
    BOSS_RUSH: {
      pool: [
        { type: 'TANK', weight: 3 },
        { type: 'MOSS_GIANT', weight: 2 },
        { type: 'SHIELDED', weight: 2 },
        { type: 'RUNNER', weight: 2 },
        { type: 'STANDARD', weight: 1 },
      ],
      countScale: 0.8,
      delayScale: 1.1,
      extraBosses: 1,
    },
  };

  /** Ordem canônica do preview: mantém a faixa de ícones estável entre ondas. */
  private static readonly PREVIEW_ORDER: EnemyType[] = [
    'STANDARD',
    'RUNNER',
    'SPORE_SPRINTER',
    'SHIELDED',
    'TANK',
    'MOSS_GIANT',
    'BOSS',
    'BLACK_MEGA_BOSS',
  ];

  public currentWaveIndex = -1;
  public isWaveActive = false;

  // Auto Mode & Endless Mode
  public isAutoMode = false;
  public isEndlessMode = false;
  public autoCountdownMs = 5000;
  public isMorteCerta = false;
  private spawnQueue: { type: EnemyType; delay: number }[] = [];
  private timer = 0;

  public setAutoMode(enabled: boolean) {
    this.isAutoMode = enabled;
    if (enabled && !this.isWaveActive) {
      this.autoCountdownMs = 5000;
    }
    EventBus.getInstance().emit('wave:autoMode', this.isAutoMode);
  }

  public setEndlessMode(enabled: boolean) {
    this.isEndlessMode = enabled;
    EventBus.getInstance().emit('wave:endlessMode', this.isEndlessMode);
  }

  /**
   * Garante que a config da onda `index` exista, gerando as ondas endless que
   * faltarem. Deixar a geração aqui (em vez de dentro do startNextWave) permite
   * ao preview mostrar exatamente a onda que vai ser jogada, sem sortear duas
   * vezes composições diferentes.
   */
  private ensureWaveConfig(index: number): WaveConfig | null {
    if (index < 0) return null;
    if (index < this.waves.length) return this.waves[index];
    if (!this.isEndlessMode) return null;

    while (this.waves.length <= index) {
      this.waves.push(this.generateEndlessWave(this.waves.length + 1));
    }
    return this.waves[index];
  }

  public startNextWave(): boolean {
    if (this.isWaveActive) return false;

    const nextIndex = this.currentWaveIndex + 1;
    const config = this.ensureWaveConfig(nextIndex);
    if (!config) return false;

    this.currentWaveIndex = nextIndex;
    this.spawnQueue = [...config.enemies];
    this.isWaveActive = true;
    this.timer = 0;
    EventBus.getInstance().emit('wave:start', { currentWave: this.currentWaveIndex + 1, isEndless: this.isEndlessMode });
    EventBus.getInstance().emit('wave:change', { current: this.currentWaveIndex + 1, max: 10, isEndless: this.isEndlessMode });
    return true;
  }

  /**
   * Arquétipo da onda endless. É função pura do número da onda, então o jogador
   * consegue aprender o ritmo em vez de reagir a sorteio puro. Múltiplos de 3
   * caem em BOSS_RUSH para casar com o que a HUD e a BGM já tratam como onda de
   * chefe (`waveNum % 3 === 0`).
   */
  public getEndlessArchetype(waveNum: number): EndlessArchetype {
    if (waveNum % 3 === 0) return 'BOSS_RUSH';
    const cycle: EndlessArchetype[] = ['SWARM', 'ARMORED', 'RUSH', 'MIXED'];
    return cycle[Math.max(0, waveNum - 11) % cycle.length];
  }

  private pickWeighted(pool: { type: EnemyType; weight: number }[]): EnemyType {
    let total = 0;
    for (const entry of pool) total += entry.weight;

    let roll = Math.random() * total;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll < 0) return entry.type;
    }
    return pool[pool.length - 1].type;
  }

  private generateEndlessWave(waveNum: number): WaveConfig {
    const archetype = this.getEndlessArchetype(waveNum);
    const spec = WaveManager.ARCHETYPES[archetype];

    // A curva base continua vindo do número da onda; o arquétipo só a modula.
    const baseCount = 12 + Math.floor((waveNum - 10) * 2);
    const count = Math.max(4, Math.round(baseCount * spec.countScale));
    const baseDelay = Math.max(250, 750 - (waveNum - 10) * 25);
    const delay = Math.max(160, Math.round(baseDelay * spec.delayScale));

    const enemies: { type: EnemyType; delay: number }[] = [];
    for (let i = 0; i < count; i++) {
      enemies.push({ type: this.pickWeighted(spec.pool), delay });
    }

    const bossCount = Math.floor((waveNum - 10) / 3) + 1 + spec.extraBosses;
    for (let b = 0; b < bossCount; b++) {
      enemies.push({ type: 'BOSS', delay: 1800 });
    }
    if (waveNum % 10 === 0 && this.isMorteCerta) {
      enemies.push({ type: 'BLACK_MEGA_BOSS', delay: 3000 });
    }
    return {
      waveNumber: waveNum,
      enemies,
      archetype,
    };
  }

  /**
   * Aplica as trocas de tipo do modo Morte Certa. Extraído para que spawn e
   * preview usem exatamente a mesma regra — um preview que mente é pior que
   * nenhum preview.
   */
  private resolveSpawnType(type: EnemyType, waveNum: number): EnemyType {
    if (type === 'BLACK_MEGA_BOSS' && !this.isMorteCerta) return 'BOSS';
    if (waveNum === 10 && this.isMorteCerta && type === 'BOSS') return 'BLACK_MEGA_BOSS';
    return type;
  }

  /**
   * Composição da próxima onda agrupada por tipo, para a HUD. Retorna `null`
   * durante uma onda ativa ou quando a campanha acabou sem endless.
   */
  public getNextWavePreview(): WavePreview | null {
    if (this.isWaveActive) return null;
    const config = this.ensureWaveConfig(this.currentWaveIndex + 1);
    if (!config) return null;

    const counts = new Map<EnemyType, number>();
    for (const enemy of config.enemies) {
      const type = this.resolveSpawnType(enemy.type, config.waveNumber);
      counts.set(type, (counts.get(type) || 0) + 1);
    }

    const entries: WavePreviewEntry[] = [];
    for (const type of WaveManager.PREVIEW_ORDER) {
      const count = counts.get(type);
      if (count) entries.push({ type, count });
    }

    return {
      waveNumber: config.waveNumber,
      entries,
      totalEnemies: config.enemies.length,
      hasBoss: (counts.get('BOSS') || 0) + (counts.get('BLACK_MEGA_BOSS') || 0) > 0,
      archetype: config.archetype,
    };
  }

  public updateAutoCountdown(deltaTimeMs: number) {
    if (!this.isAutoMode || this.isWaveActive) return;

    // Stop auto countdown if campaign is over and endless mode is off
    if (this.currentWaveIndex >= 9 && !this.isEndlessMode && this.spawnQueue.length === 0) return;

    this.autoCountdownMs -= deltaTimeMs;
    if (this.autoCountdownMs <= 0) {
      this.startNextWave();
      this.autoCountdownMs = 5000;
    }
  }

  public getNextEnemyToSpawn(deltaTimeMs: number): { type: EnemyType; hpMultiplier: number } | null {
    if (!this.isWaveActive || this.spawnQueue.length === 0) return null;

    this.timer += deltaTimeMs;
    if (this.timer >= this.spawnQueue[0].delay) {
      this.timer = 0;
      const enemy = this.spawnQueue.shift();
      if (!enemy) return null;

      const currentWaveNum = this.currentWaveIndex + 1;
      const spawnType = this.resolveSpawnType(enemy.type, currentWaveNum);

      let hpMultiplier = 1.0;
      const campaignHpScales: Record<number, number> = {
        1: 1.0,
        2: 1.15,
        3: 1.3,
        4: 1.5,
        5: 1.85,
        6: 2.2,
        7: 2.6,
        8: 3.1,
        9: 3.7,
        10: 4.5,
      };
      if (currentWaveNum <= 10) {
        hpMultiplier = campaignHpScales[currentWaveNum] || 1.0;
      } else {
        hpMultiplier = Number((4.5 * Math.pow(1.18, currentWaveNum - 10)).toFixed(2));
      }
      return { type: spawnType, hpMultiplier };
    }

    return null;
  }

  public onEnemyCleared(remainingEnemiesCount: number): boolean {
    if (this.isWaveActive && this.spawnQueue.length === 0 && remainingEnemiesCount === 0) {
      this.isWaveActive = false;
      this.autoCountdownMs = 5000;
      EventBus.getInstance().emit('wave:end', { currentWave: this.currentWaveIndex + 1, isEndless: this.isEndlessMode });
      EventBus.getInstance().emit('wave:change', { current: this.currentWaveIndex + 1, max: 10, isEndless: this.isEndlessMode });
      return true;
    }
    return false;
  }

  public isLastWaveCompleted(remainingEnemiesCount: number): boolean {
    // If endless mode is on, the game NEVER ends on victory!
    if (this.isEndlessMode) return false;

    return (
      this.currentWaveIndex === 9 &&
      this.spawnQueue.length === 0 &&
      remainingEnemiesCount === 0 &&
      !this.isWaveActive
    );
  }

  public getAutoCountdownSeconds(): number {
    return Math.max(0, Math.ceil(this.autoCountdownMs / 1000));
  }
}
