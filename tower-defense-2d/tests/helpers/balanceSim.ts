import { AnalyticsManager } from '../../src/engine/AnalyticsManager';
import { AudioManager } from '../../src/engine/AudioManager';
import { EnemyManager2D } from '../../src/engine/EnemyManager';
import { EventBus } from '../../src/engine/EventBus';
import { FXManager } from '../../src/engine/FXManager';
import { GameState, type GameStatus } from '../../src/engine/GameState';
import { MapManager2D, type MapId } from '../../src/engine/MapManager';
import { ParticleManager } from '../../src/engine/ParticleManager';
import { ProjectileManager2D } from '../../src/engine/ProjectileManager';
import { Rng } from '../../src/engine/Rng';
import { getSpecializations } from '../../src/engine/Specializations';
import { TowerManager2D } from '../../src/engine/TowerManager';
import { WaveManager } from '../../src/engine/WaveManager';
import type {
  ChallengeMode,
  EnemyType,
  TowerSpecialization,
  TowerType,
} from '../../src/types';

/**
 * Harness headless de balanceamento.
 *
 * Roda uma partida inteira sem canvas nem DOM de jogo, no mesmo passo fixo de
 * 1/60s do Game2D, com uma build roteirizada e uma semente. Serve para:
 *  - provar que a simulação é reproduzível (mesma semente -> mesmo resultado);
 *  - medir vazamento, curva de ouro e dano por torre onda a onda;
 *  - travar regressões de balanceamento em CI, já que os números do jogo estão
 *    espalhados entre Tower.getTowerConfig, Enemy.getEnemyConfig e as escalas
 *    de HP do WaveManager.
 *
 * Não instancia UIManager nem SpellManager: a build não lança magias, e manter
 * o harness fora da UI é o que permite rodá-lo em CI.
 */
const FIXED_STEP_MS = 1000 / 60;

/** Torre a erguer no início da onda indicada (1-based). */
export interface SimBuildOrder {
  wave: number;
  type: TowerType;
  gridX: number;
  gridY: number;
}

/**
 * Melhoria de uma torre já erguida, no início da onda indicada. Sem isso o
 * harness só mediria defesas de nível 1, o que é irreal: a campanha multiplica
 * o HP dos inimigos por 4,5 até a onda 10 justamente contando com upgrades.
 */
export interface SimUpgradeOrder {
  wave: number;
  gridX: number;
  gridY: number;
  toLevel: number;
  /**
   * Especialização usada no salto de nível 2 para 3. Se omitida, o harness pega
   * a primeira opção do catálogo do tipo — suficiente para exercitar o caminho,
   * mas testes de especialização devem informar explicitamente.
   */
  specialization?: TowerSpecialization;
}

export interface SimOptions {
  seed: number | string;
  waves: number;
  mapId?: MapId;
  challengeMode?: ChallengeMode;
  endless?: boolean;
  build?: SimBuildOrder[];
  upgrades?: SimUpgradeOrder[];
  /**
   * Sobrescreve o ouro inicial. Permite isolar uma torre cara sem jogar as
   * ondas necessárias para bancá-la.
   */
  startingGold?: number;
  /** Trava anti-loop-infinito: passos máximos por onda (padrão ~2 min de jogo). */
  maxStepsPerWave?: number;
}

export interface SimWaveMetrics {
  waveNumber: number;
  goldAtStart: number;
  goldAtEnd: number;
  hpAtEnd: number;
  killsAtEnd: number;
  steps: number;
  /** True se a onda estourou a trava de passos em vez de terminar sozinha. */
  timedOut: boolean;
}

/**
 * Desfecho de um BLACK_MEGA_BOSS individual, rastreado passo a passo desde o
 * spawn. Existe para responder a uma pergunta específica de gate de
 * balanceamento (docs/GAME_DESIGN_REVIEW.md A2): depois do nerf de armadura,
 * o chefe final do Morte Certa ainda morre antes de atravessar o mapa? Sem
 * isso, o harness só sabia dizer "a run terminou em GAME_OVER", não *por causa
 * de qual inimigo* nem *quão perto* a defesa chegou de falhar.
 */
export interface MegaBossEncounter {
  id: string;
  /** Passo fixo (1/60s) em que o Black Mega Boss apareceu na lista de inimigos. */
  spawnStep: number;
  /** Passo fixo em que saiu da lista (morto ou vazado); null se a simulação acabou primeiro. */
  resolvedStep: number | null;
  outcome: 'KILLED' | 'LEAKED' | 'UNRESOLVED';
  /** `resolvedStep - spawnStep`, em passos fixos de 1/60s. */
  framesToResolve: number | null;
}

export interface SimResult {
  seed: number | string;
  status: GameStatus;
  wavesStarted: number;
  wavesCompleted: number;
  /** Inimigos que alcançaram a base. */
  leaks: number;
  hpLost: number;
  baseHpRemaining: number;
  goldFinal: number;
  goldEarned: number;
  goldSpent: number;
  totalKills: number;
  totalDamage: number;
  killsByEnemy: Record<EnemyType, number>;
  damageByTower: Record<TowerType, number>;
  towersBuilt: number;
  /**
   * Ordens que não puderam ser executadas (sem ouro, tile inválido ou ocupado).
   * Reportado em vez de ignorado: uma compra que falha enfraquece a build em
   * silêncio e faz a medição de balanceamento mentir.
   */
  failedOrders: SimBuildOrder[];
  /** Melhorias que não puderam ser aplicadas (torre ausente ou ouro insuficiente). */
  failedUpgrades: SimUpgradeOrder[];
  upgradesApplied: number;
  steps: number;
  waveMetrics: SimWaveMetrics[];
  /** Todo BLACK_MEGA_BOSS que apareceu na run, na ordem em que apareceu. */
  megaBossEncounters: MegaBossEncounter[];
}

export function runBalanceSim(options: SimOptions): SimResult {
  const maxStepsPerWave = options.maxStepsPerWave ?? 7200; // ~2 min a 60 passos/s
  const rng = new Rng(options.seed);

  const analytics = new AnalyticsManager();
  const state = new GameState(undefined, options.challengeMode || 'NORMAL');
  if (options.startingGold !== undefined) state.gold = options.startingGold;
  const waveManager = new WaveManager(rng);
  if (options.endless) waveManager.setEndlessMode(true);
  if (options.challengeMode === 'MORTE_CERTA') waveManager.isMorteCerta = true;

  const map = new MapManager2D(options.mapId || 'MAP_1');
  const fx = new FXManager();
  const particles = new ParticleManager();
  const audio = new AudioManager();
  const projectiles = new ProjectileManager2D();

  const towerManager = new TowerManager2D(
    map,
    projectiles,
    state,
    audio,
    particles,
    undefined,
    analytics,
    undefined,
    rng
  );
  const enemyManager = new EnemyManager2D(
    map,
    state,
    waveManager,
    audio,
    analytics,
    undefined,
    rng
  );

  towerManager.sproutTiles = map.currentMapId === 'MAP_1' ? map.pickSproutTiles(4, rng) : [];

  // Cada vazamento gera exatamente um takeDamage -> um 'hp:change'.
  let leaks = 0;
  const unsubscribe = EventBus.getInstance().on('hp:change', () => {
    leaks++;
  });
  const unsubWaveStart = EventBus.getInstance().on('wave:start', () => {
    if (state.status === 'PREPARATION') {
      state.setStatus('PLAYING');
    }
  });


  let towersBuilt = 0;
  const failedOrders: SimBuildOrder[] = [];
  const build = options.build || [];

  const applyBuildOrders = (waveNumber: number) => {
    for (const order of build) {
      if (order.wave !== waveNumber) continue;
      towerManager.setSelectedBuildType(order.type);
      // placeTower devolve true também ao apenas selecionar uma torre existente,
      // então confere se realmente nasceu uma torre nova.
      const antes = towerManager.getTowers().length;
      towerManager.placeTower(order.gridX, order.gridY);
      if (towerManager.getTowers().length > antes) {
        towersBuilt++;
      } else {
        failedOrders.push(order);
      }
    }
  };

  const failedUpgrades: SimUpgradeOrder[] = [];
  let upgradesApplied = 0;
  const upgrades = options.upgrades || [];

  const applyUpgradeOrders = (waveNumber: number) => {
    for (const order of upgrades) {
      if (order.wave !== waveNumber) continue;

      const tower = towerManager.getTowerAt(order.gridX, order.gridY);
      if (!tower) {
        failedUpgrades.push(order);
        continue;
      }

      // upgradeSelectedTower() opera sobre a torre selecionada.
      towerManager.selectedTower = tower;
      const spec = order.specialization || getSpecializations(tower.data.type)[0].id;
      while (tower.data.level < order.toLevel) {
        if (!towerManager.upgradeSelectedTower(spec)) break;
        upgradesApplied++;
      }
      if (tower.data.level < order.toLevel) failedUpgrades.push(order);
    }
  };

  // Espelha Game2D.stepSimulation, menos magias e apresentação.
  const step = () => {
    enemyManager.update(FIXED_STEP_MS, towerManager.getTowers());
    towerManager.update(enemyManager.getEnemies(), fx);
    projectiles.update(enemyManager.getEnemies(), fx, analytics);
    particles.update(enemyManager.getEnemies(), fx);
    fx.update();
  };

  const waveMetrics: SimWaveMetrics[] = [];
  let totalSteps = 0;
  let wavesStarted = 0;
  let wavesCompleted = 0;

  // Rastreamento de BLACK_MEGA_BOSS: id -> encontro em andamento.
  const megaBossTracker = new Map<string, MegaBossEncounter>();
  let globalStep = 0;

  try {
    for (let w = 0; w < options.waves; w++) {
      const waveNumber = w + 1;
      const goldAtStart = state.gold;
      applyBuildOrders(waveNumber);
      applyUpgradeOrders(waveNumber);

      if (!waveManager.startNextWave()) break;
      wavesStarted++;

      let waveSteps = 0;
      while (waveManager.isWaveActive && state.status === 'PLAYING' && waveSteps < maxStepsPerWave) {
        const leaksBefore = leaks;
        step();
        globalStep++;
        waveSteps++;

        const liveEnemies = enemyManager.getEnemies();
        for (const enemy of liveEnemies) {
          if (enemy.data.type === 'BLACK_MEGA_BOSS' && !megaBossTracker.has(enemy.data.id)) {
            megaBossTracker.set(enemy.data.id, {
              id: enemy.data.id,
              spawnStep: globalStep,
              resolvedStep: null,
              outcome: 'UNRESOLVED',
              framesToResolve: null,
            });
          }
        }
        const liveIds = new Set(liveEnemies.map(e => e.data.id));
        for (const encounter of megaBossTracker.values()) {
          if (encounter.outcome !== 'UNRESOLVED' || liveIds.has(encounter.id)) continue;
          // Saiu da lista de inimigos neste passo: ou morreu, ou vazou (EnemyManager
          // remove o inimigo no mesmo passo em que decide a causa).
          encounter.resolvedStep = globalStep;
          encounter.outcome = leaks > leaksBefore ? 'LEAKED' : 'KILLED';
          encounter.framesToResolve = encounter.resolvedStep - encounter.spawnStep;
        }
      }
      totalSteps += waveSteps;

      const timedOut = waveSteps >= maxStepsPerWave && waveManager.isWaveActive;
      if (!timedOut && !waveManager.isWaveActive) wavesCompleted++;

      waveMetrics.push({
        waveNumber,
        goldAtStart,
        goldAtEnd: state.gold,
        hpAtEnd: state.baseHp,
        killsAtEnd: analytics.getTotalKills(),
        steps: waveSteps,
        timedOut,
      });

      if (state.status !== 'PLAYING' || timedOut) break;
    }
  } finally {
    unsubscribe();
    unsubWaveStart();
  }

  return {
    seed: options.seed,
    status: state.status,
    wavesStarted,
    wavesCompleted,
    leaks,
    hpLost: state.maxBaseHp - state.baseHp,
    baseHpRemaining: state.baseHp,
    goldFinal: state.gold,
    goldEarned: analytics.goldEarned,
    goldSpent: analytics.goldSpent,
    totalKills: analytics.getTotalKills(),
    totalDamage: analytics.getTotalDamage(),
    killsByEnemy: { ...analytics.killsByEnemy },
    damageByTower: { ...analytics.damageByTower },
    towersBuilt,
    failedOrders,
    failedUpgrades,
    upgradesApplied,
    steps: totalSteps,
    waveMetrics,
    megaBossEncounters: Array.from(megaBossTracker.values()),
  };
}

/**
 * Build de referência para o MAP_1: postos na faixa (x,2), que do corredor
 * superior alcançam também o corredor da linha 4, com reforço pesado conforme o
 * ouro entra.
 *
 * A ordem respeita o ouro disponível no início de cada onda — uma compra que
 * falha por falta de ouro silenciosamente enfraquece a build e distorce a
 * medição (o CANNON na onda 3 custava 105g com 95g em caixa).
 */
export const MAP1_REFERENCE_BUILD: SimBuildOrder[] = [
  { wave: 1, type: 'BASIC', gridX: 4, gridY: 2 },
  { wave: 2, type: 'BASIC', gridX: 9, gridY: 2 },
  { wave: 3, type: 'FROST', gridX: 5, gridY: 2 },
  { wave: 4, type: 'CANNON', gridX: 10, gridY: 2 },
  { wave: 6, type: 'ARTILLERY', gridX: 6, gridY: 2 },
  { wave: 7, type: 'SOLAR_PRISM', gridX: 11, gridY: 2 },
];

/** Build mínima: serve de piso para comparar com a de referência. */
export const MAP1_MINIMAL_BUILD: SimBuildOrder[] = [
  { wave: 1, type: 'BASIC', gridX: 4, gridY: 2 },
];

/**
 * Defesa completa cobrindo os três corredores do MAP_1. Combinada com
 * `FULL_DEFENSE_UPGRADES` e ouro inicial folgado, sustenta a campanha inteira e
 * as primeiras ondas endless — é a base para testar conteúdo tardio sem que a
 * partida morra antes de chegar lá.
 */
export const FULL_DEFENSE_BUILD: SimBuildOrder[] = [
  { wave: 1, type: 'CANNON', gridX: 4, gridY: 2 },
  { wave: 1, type: 'CANNON', gridX: 5, gridY: 2 },
  { wave: 1, type: 'ARTILLERY', gridX: 6, gridY: 2 },
  { wave: 1, type: 'FROST', gridX: 9, gridY: 2 },
  { wave: 1, type: 'CANNON', gridX: 10, gridY: 3 },
  { wave: 1, type: 'ARTILLERY', gridX: 3, gridY: 5 },
  { wave: 1, type: 'CANNON', gridX: 5, gridY: 8 },
  { wave: 1, type: 'FROST', gridX: 9, gridY: 6 },
];

export const FULL_DEFENSE_UPGRADES: SimUpgradeOrder[] = [
  { wave: 2, gridX: 4, gridY: 2, toLevel: 3 },
  { wave: 2, gridX: 5, gridY: 2, toLevel: 3 },
  { wave: 2, gridX: 6, gridY: 2, toLevel: 3 },
  { wave: 3, gridX: 10, gridY: 3, toLevel: 3 },
  { wave: 3, gridX: 3, gridY: 5, toLevel: 3 },
  { wave: 3, gridX: 5, gridY: 8, toLevel: 3 },
];
