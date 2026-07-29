import type { ChallengeMode } from '../types';
import { UIManager } from '../ui/UIManager';
import { AchievementManager } from './AchievementManager';
import { AnalyticsManager } from './AnalyticsManager';
import { DatabaseManager } from './DatabaseManager';
import { AudioManager, type BGMTrack } from './AudioManager';
import { EnemyManager2D } from './EnemyManager';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { MapManager2D, type MapId } from './MapManager';
import { MegaBossSpriteRenderer } from './MegaBossSpriteRenderer';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { SpellManager } from './SpellManager';
import { TalentManager } from './TalentManager';
import { TowerManager2D } from './TowerManager';
import { WaveManager } from './WaveManager';
export class Game2D {
  /**
   * Duração de um passo de simulação. A simulação SEMPRE avança em passos de
   * 1/60s, independente do refresh rate do monitor.
   *
   * Motivo: todos os timers das entidades são contados em frames
   * (`Tower.cooldownTimer`, `Enemy.slowTimer`, `Enemy.speed` em px/frame...),
   * enquanto spawn de onda e cooldown de magia usam ms reais. Sem passo fixo,
   * um monitor de 144Hz roda movimento e tiro ~2,4x mais rápido que um de 60Hz
   * enquanto o spawn continua igual — o balanceamento mudaria por hardware.
   */
  private static readonly FIXED_STEP_MS = 1000 / 60;

  /**
   * Delta máximo processado num único frame. Sem o clamp, voltar de uma aba
   * inativa entregaria segundos de delta de uma vez, teleportando inimigos e
   * zerando cooldowns de magia instantaneamente.
   */
  private static readonly MAX_FRAME_MS = 100;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public gameState!: GameState;
  public waveManager!: WaveManager;
  public audioManager!: AudioManager;
  public talentManager!: TalentManager;
  public achievementManager!: AchievementManager;
  public analyticsManager!: AnalyticsManager;
  public databaseManager!: DatabaseManager;
  public mapManager!: MapManager2D;
  private enemyManager!: EnemyManager2D;
  private projectileManager!: ProjectileManager2D;
  private towerManager!: TowerManager2D;
  private fxManager!: FXManager;
  private particleManager!: ParticleManager;
  public spellManager!: SpellManager;
  private uiManager!: UIManager;

  public gameSpeedMultiplier = 1; // 1x, 2x, 4x

  private mousePos: { x: number; y: number } | null = null;
  private hoveredGrid: { x: number; y: number } | null = null;
  private lastTime = 0;
  /** Tempo real acumulado ainda não consumido pela simulação (escalado pela velocidade). */
  private simAccumulatorMs = 0;
  /** Idem para FX/toasts, mas sem escala de velocidade (duram o mesmo em 1x e 4x). */
  private fxAccumulatorMs = 0;
  private hasAwardedStars = false;
  private currentSavedMapId: MapId = 'MAP_1';
  private currentSavedChallengeMode: ChallengeMode = 'NORMAL';

  constructor() {
    this.databaseManager = new DatabaseManager();
    const gameArea = document.getElementById('game-area');
    if (!gameArea) throw new Error('Game area container not found');

    this.canvas = document.createElement('canvas');
    this.canvas.width = 840;
    this.canvas.height = 600;
    gameArea.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    this.initGame();
    this.setupListeners();
  }

  private initGame() {
    if (this.audioManager) {
      this.audioManager.stopBGM();
    }

    this.analyticsManager = new AnalyticsManager();
    this.talentManager = new TalentManager(this.databaseManager);
    this.achievementManager = new AchievementManager(this.talentManager, this.databaseManager);
    this.gameState = new GameState(this.talentManager, this.currentSavedChallengeMode);
    this.gameState.setStatus('PLAYING');
    this.waveManager = new WaveManager();
    if (this.currentSavedChallengeMode === 'MORTE_CERTA') {
      this.waveManager.isMorteCerta = true;
      this.waveManager.setEndlessMode(true);
      this.waveManager.setAutoMode(true);
    } else {
      this.waveManager.isMorteCerta = false;
    }
    this.mapManager = new MapManager2D(this.currentSavedMapId);
    this.fxManager = new FXManager();
    this.particleManager = new ParticleManager();
    this.audioManager = new AudioManager();

    this.spellManager = new SpellManager(
      this.gameState,
      this.fxManager,
      this.audioManager,
      this.particleManager,
      this.talentManager,
      this.achievementManager
    );
    this.projectileManager = new ProjectileManager2D();
    this.towerManager = new TowerManager2D(
      this.mapManager,
      this.projectileManager,
      this.gameState,
      this.audioManager,
      this.particleManager,
      this.talentManager,
      this.analyticsManager,
      this.achievementManager
    );
    this.enemyManager = new EnemyManager2D(
      this.mapManager,
      this.gameState,
      this.waveManager,
      this.audioManager,
      this.analyticsManager,
      this.achievementManager
    );

    if (this.uiManager) {
      this.uiManager.destroy();
    }

    this.hasAwardedStars = false;
    // Managers foram recriados: descarta tempo acumulado da partida anterior.
    this.simAccumulatorMs = 0;
    this.fxAccumulatorMs = 0;

    this.uiManager = new UIManager(
      this.gameState,
      this.waveManager,
      this.towerManager,
      this.spellManager,
      this.audioManager,
      this.talentManager,
      this.achievementManager,
      this.analyticsManager,
      this,
      this.restartGame.bind(this)
    );
  }

  public changeMap(mapId: MapId) {
    this.currentSavedMapId = mapId;
    this.initGame();
  }
  public changeChallengeMode(mode: ChallengeMode) {
    this.currentSavedChallengeMode = mode;
    this.initGame();
  }

  private restartGame() {
    this.initGame();
  }

  private getCanvasMousePosition(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const borderLeft = this.canvas.clientLeft || 0;
    const borderTop = this.canvas.clientTop || 0;

    const contentWidth = rect.width - borderLeft * 2;
    const contentHeight = rect.height - borderTop * 2;

    const scaleX = this.canvas.width / (contentWidth || 1);
    const scaleY = this.canvas.height / (contentHeight || 1);

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rawX = (clientX - rect.left - borderLeft) * scaleX;
    const rawY = (clientY - rect.top - borderTop) * scaleY;

    const x = Math.max(0, Math.min(this.canvas.width - 1, rawX));
    const y = Math.max(0, Math.min(this.canvas.height - 1, rawY));

    return { x, y };
  }

  private setupListeners() {
    // Global User Interaction Listener to Unlock Web Audio API in Browsers
    const unlockAudio = () => {
      this.audioManager.unlockAudio();
      if (!this.audioManager.isBGMPlaying && !this.audioManager.isBgmMuted && this.gameState.status === 'PLAYING') {
        const initialTrack: BGMTrack = (this.mapManager.currentMapId as BGMTrack) || 'MAP_1';
        this.audioManager.startBGM(this.gameSpeedMultiplier, initialTrack);
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    // Sync UI Top Bar & Action Toolbar width & height with canvas DOM element size
    const syncCanvasWidth = () => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0) {
        document.documentElement.style.setProperty('--canvas-width', `${Math.round(rect.width)}px`);
      }
      if (rect.height > 0) {
        document.documentElement.style.setProperty('--canvas-height', `${Math.round(rect.height)}px`);
      }
    };
    syncCanvasWidth();
    window.addEventListener('resize', syncCanvasWidth);
    window.addEventListener('orientationchange', syncCanvasWidth);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncCanvasWidth);
      ro.observe(this.canvas);
    }

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'KeyP') {
        e.preventDefault();
        this.gameState.togglePause();
      }
    });

    // Mouse & Touch Move
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const { x, y } = this.getCanvasMousePosition(e);
      this.mousePos = { x, y };

      const gridX = Math.floor(x / this.mapManager.tileSize);
      const gridY = Math.floor(y / this.mapManager.tileSize);
      this.hoveredGrid = { x: gridX, y: gridY };
    };

    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      handleMove(e);
    }, { passive: false });

    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos = null;
      this.hoveredGrid = null;
    });

    // Mouse & Mobile Tap Click Handler
    let lastTouchTime = 0;

    // Global touch listener to record DOM UI taps and prevent synthetic click bleed-through to canvas
    window.addEventListener(
      'touchend',
      (e) => {
        if (e.target !== this.canvas) {
          lastTouchTime = Date.now();
        }
      },
      { passive: true }
    );

    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (this.gameState.status !== 'PLAYING' || this.gameState.isPaused) return;

      // Prevent duplicate synthetic click event right after a touch event on UI or canvas
      if (e.type === 'click' && Date.now() - lastTouchTime < 400) {
        return;
      }
      if (e.type === 'touchend') {
        lastTouchTime = Date.now();
      }
      const { x, y } = this.getCanvasMousePosition(e);

      // Handle Meteor Spell Casting
      if (this.spellManager.activeSpell === 'METEOR') {
        this.spellManager.castMeteorAt(x, y, this.enemyManager.getEnemies());
        return;
      }

      // Handle Tower Placement / Selection
      const gridX = Math.floor(x / this.mapManager.tileSize);
      const gridY = Math.floor(y / this.mapManager.tileSize);
      this.towerManager.placeTower(gridX, gridY);
    };

    this.canvas.addEventListener('click', handleTap);
    this.canvas.addEventListener('touchend', (e) => {
      if (e.cancelable) e.preventDefault();
      handleTap(e);
    }, { passive: false });
  }

  private renderGhostPlacement() {
    if (!this.hoveredGrid || this.gameState.status !== 'PLAYING' || this.gameState.isPaused || this.spellManager.activeSpell !== null) return;

    const { x, y } = this.hoveredGrid;
    const existing = this.towerManager.getTowerAt(x, y);
    if (existing) return;

    const isBuildable = this.mapManager.isBuildable(x, y);
    const cost = this.towerManager.getTowerCost(this.towerManager.selectedBuildType);
    const canAfford = this.gameState.gold >= cost;

    const size = this.mapManager.tileSize;
    const isValid = isBuildable && canAfford;

    this.ctx.fillStyle = isValid ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)';
    this.ctx.fillRect(x * size, y * size, size, size);
    this.ctx.strokeStyle = isValid ? '#4caf50' : '#f44336';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x * size, y * size, size, size);
  }

  private renderAchievementToasts() {
    for (let i = 0; i < this.achievementManager.activeToasts.length; i++) {
      const toast = this.achievementManager.activeToasts[i];
      const width = 280;
      const height = 48;
      const x = this.canvas.width - width - 16;
      const y = 16 + i * 56;

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(30, 30, 30, 0.92)';
      this.ctx.fillRect(x, y, width, height);

      this.ctx.strokeStyle = '#f57f17';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);

      this.ctx.fillStyle = '#ffeb3b';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${toast.icon} Achievement Unlocked!`, x + 10, y + 20);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`${toast.title} (+${toast.reward} ★)`, x + 10, y + 38);
      this.ctx.restore();
    }
  }

  private renderPauseOverlay() {
    if (!this.gameState.isPaused) return;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⏸️ GAME PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 10);

    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#ffb74d';
    this.ctx.fillText('Press SPACE, P or click Resume to continue', this.canvas.width / 2, this.canvas.height / 2 + 30);
    this.ctx.restore();
  }

  /**
   * Um passo de simulação de duração fixa. Tudo que afeta o estado do jogo
   * (ondas, inimigos, torres, projéteis, magias, partículas) roda aqui.
   * Retorna `false` quando a partida terminou e o loop deve parar de avançar.
   */
  private stepSimulation(stepMs: number): boolean {
    this.waveManager.updateAutoCountdown(stepMs);
    this.enemyManager.update(stepMs, this.towerManager.getTowers());
    this.towerManager.update(this.enemyManager.getEnemies());
    this.projectileManager.update(this.enemyManager.getEnemies(), this.fxManager, this.analyticsManager);
    this.spellManager.update(stepMs);
    this.particleManager.update(this.enemyManager.getEnemies(), this.fxManager);

    // Check Endless Survivor Achievement
    if (this.waveManager.isEndlessMode) {
      this.achievementManager.setProgress('ENDLESS_SURVIVOR', this.waveManager.currentWaveIndex + 1);
    }

    if (this.gameState.status !== 'PLAYING') return false;

    // Check Victory
    if (this.waveManager.isLastWaveCompleted(this.enemyManager.getEnemies().length)) {
      this.gameState.setStatus('VICTORY');
      return false;
    }

    return true;
  }

  /**
   * Passo de apresentação: texto flutuante, screen-shake, toasts e animação do
   * mega boss. Roda em tempo real e NÃO é escalado pela velocidade do jogo, para
   * que um toast dure os mesmos segundos em 1x e em 4x.
   */
  private stepPresentation(stepMs: number) {
    this.fxManager.update();
    this.achievementManager.update();
    MegaBossSpriteRenderer.getInstance().update(stepMs);
  }

  public run() {
    this.lastTime = performance.now();

    const loop = (currentTime: number) => {
      const rawDelta = currentTime - this.lastTime;
      this.lastTime = currentTime;

      const frameMs = Math.min(Math.max(0, rawDelta), Game2D.MAX_FRAME_MS);
      // Teto de passos por frame: válvula de segurança para um frame patológico
      // não travar o requestAnimationFrame tentando recuperar o atraso todo.
      // O "+1" cobre o resto acumulado, então um frame já clampado sempre é
      // drenado por inteiro e o teto nunca limita jogo normal.
      const maxStepsPerFrame = Math.ceil(Game2D.MAX_FRAME_MS / Game2D.FIXED_STEP_MS) + 1;

      // Determine BGM track: BOSS vs MAP-SPECIFIC TRACK
      const enemies = this.enemyManager.getEnemies();
      const hasBossOnScreen = enemies.some(e => !e.data.isDead && e.data.type === 'BOSS');
      const activeWaveNum = this.waveManager.currentWaveIndex + 1;
      const isBossWave = activeWaveNum === 5 || activeWaveNum === 8 || activeWaveNum === 10 || (activeWaveNum > 10 && activeWaveNum % 3 === 0);

      const mapTrack: BGMTrack = (this.mapManager.currentMapId as BGMTrack) || 'MAP_1';
      const targetTrack: BGMTrack = (hasBossOnScreen || (isBossWave && this.waveManager.isWaveActive)) ? 'BOSS' : mapTrack;

      this.audioManager.setTrack(targetTrack);

      // Manage BGM state & tempo
      if (this.gameState.status === 'PLAYING' && !this.gameState.isPaused) {
        if (!this.audioManager.isBGMPlaying && !this.audioManager.isBgmMuted) {
          this.audioManager.startBGM(this.gameSpeedMultiplier, targetTrack);
        } else {
          this.audioManager.updateBGMTempo(this.gameSpeedMultiplier, targetTrack);
        }
      } else {
        this.audioManager.stopBGM();
      }

      // 1. Update logic (only if active and NOT paused)
      if (this.gameState.status === 'PLAYING' && !this.gameState.isPaused) {
        // A velocidade (1x/2x/4x) não escala o delta: ela faz o acumulador
        // encher N vezes mais rápido, logo N vezes mais passos fixos por frame.
        const speed = Math.max(1, Math.min(4, this.gameSpeedMultiplier));
        this.simAccumulatorMs += frameMs * speed;

        let simBudget = maxStepsPerFrame * speed;
        while (this.simAccumulatorMs >= Game2D.FIXED_STEP_MS && simBudget > 0) {
          this.simAccumulatorMs -= Game2D.FIXED_STEP_MS;
          simBudget--;
          if (!this.stepSimulation(Game2D.FIXED_STEP_MS)) break;
        }
        // Estourou o teto: descarta o atraso em vez de acumular dívida.
        if (simBudget <= 0) this.simAccumulatorMs = 0;

        this.fxAccumulatorMs += frameMs;
        let fxBudget = maxStepsPerFrame;
        while (this.fxAccumulatorMs >= Game2D.FIXED_STEP_MS && fxBudget > 0) {
          this.fxAccumulatorMs -= Game2D.FIXED_STEP_MS;
          fxBudget--;
          this.stepPresentation(Game2D.FIXED_STEP_MS);
        }
        if (fxBudget <= 0) this.fxAccumulatorMs = 0;
      }

      // Award Stars & High Score Check on Match End
      if ((this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') && !this.hasAwardedStars) {
        this.hasAwardedStars = true;
        if (this.gameState.status === 'VICTORY') {
          if (this.currentSavedChallengeMode === 'TURBO_GOLD') {
            this.achievementManager.addProgress('WAR_ECONOMY_MASTER', 1);
          } else if (this.currentSavedChallengeMode === 'NO_SPELLS') {
            this.achievementManager.addProgress('NO_POWERS_CHALLENGER', 1);
          }
        }
        const wavesCompleted = Math.max(1, this.waveManager.currentWaveIndex + 1);
        const starsEarned = Math.floor(wavesCompleted / 2) + (this.gameState.status === 'VICTORY' ? 5 : 0);
        this.talentManager.earnStars(starsEarned);
        this.analyticsManager.checkHighScore(wavesCompleted);
        if (this.databaseManager) {
          const mapId = this.mapManager?.currentMapId || 'MAP_1';
          const challengeMode = this.currentSavedChallengeMode;
          const goldEarned = this.analyticsManager.goldEarned;
          const totalKills = this.analyticsManager.getTotalKills();
          this.databaseManager.queueRunRecord(
            mapId,
            challengeMode,
            wavesCompleted,
            goldEarned,
            totalKills
          );
        }
      }

      // Update UI
      this.uiManager.update();

      // 2. Render frame
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const shake = this.fxManager.getShakeOffset();
      this.ctx.save();
      this.ctx.translate(shake.x, shake.y);

      this.mapManager.render(this.ctx);
      this.particleManager.render(this.ctx);
      this.renderGhostPlacement();
      this.towerManager.render(this.ctx, this.mousePos);
      this.enemyManager.render(this.ctx);
      this.projectileManager.render(this.ctx);
      this.spellManager.renderSpellTargeting(this.ctx, this.mousePos);
      this.fxManager.render(this.ctx);

      this.renderAchievementToasts();
      this.renderPauseOverlay();

      this.ctx.restore();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
