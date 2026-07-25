import type { ChallengeMode } from '../types';
import { UIManager } from '../ui/UIManager';
import { AchievementManager } from './AchievementManager';
import { AnalyticsManager } from './AnalyticsManager';
import { AudioManager, type BGMTrack } from './AudioManager';
import { EnemyManager2D } from './EnemyManager';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { MapManager2D, type MapId } from './MapManager';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { SpellManager } from './SpellManager';
import { TalentManager } from './TalentManager';
import { TowerManager2D } from './TowerManager';
import { WaveManager } from './WaveManager';
export class Game2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public gameState!: GameState;
  public waveManager!: WaveManager;
  public audioManager!: AudioManager;
  public talentManager!: TalentManager;
  public achievementManager!: AchievementManager;
  public analyticsManager!: AnalyticsManager;
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
  private hasAwardedStars = false;
  private currentSavedMapId: MapId = 'MAP_1';
  private currentSavedChallengeMode: ChallengeMode = 'NORMAL';

  constructor() {
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
    this.talentManager = new TalentManager();
    this.achievementManager = new AchievementManager(this.talentManager);
    this.gameState = new GameState(this.talentManager, this.currentSavedChallengeMode);
    this.waveManager = new WaveManager();
    if (this.currentSavedChallengeMode === 'MORTE_CERTA') {
      this.waveManager.setEndlessMode(true);
      this.waveManager.setAutoMode(true);
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
      this.analyticsManager
    );
    this.enemyManager = new EnemyManager2D(
      this.mapManager,
      this.gameState,
      this.waveManager,
      this.audioManager,
      this.analyticsManager,
      this.achievementManager
    );

    this.hasAwardedStars = false;

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
      e.preventDefault();
      handleMove(e);
    }, { passive: false });

    this.canvas.addEventListener('mouseleave', () => {
      this.mousePos = null;
      this.hoveredGrid = null;
    });

    // Mouse & Mobile Tap Click Handler
    const handleTap = (e: MouseEvent | TouchEvent) => {
      if (this.gameState.status !== 'PLAYING' || this.gameState.isPaused) return;

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
      e.preventDefault();
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

  public run() {
    this.lastTime = performance.now();

    const loop = (currentTime: number) => {
      const rawDelta = currentTime - this.lastTime;
      this.lastTime = currentTime;

      const deltaTimeMs = rawDelta * this.gameSpeedMultiplier;

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
        this.waveManager.updateAutoCountdown(deltaTimeMs);
        this.enemyManager.update(deltaTimeMs, this.towerManager.getTowers());
        this.towerManager.update(this.enemyManager.getEnemies());
        this.projectileManager.update(this.enemyManager.getEnemies(), this.fxManager, this.analyticsManager);
        this.spellManager.update(deltaTimeMs);
        this.particleManager.update(this.enemyManager.getEnemies(), this.fxManager);
        this.achievementManager.update();
        this.fxManager.update();

        // Check Endless Survivor Achievement
        if (this.waveManager.isEndlessMode) {
          this.achievementManager.setProgress('ENDLESS_SURVIVOR', activeWaveNum);
        }

        // Check Victory
        if (this.waveManager.isLastWaveCompleted(this.enemyManager.getEnemies().length)) {
          this.gameState.status = 'VICTORY';
        }
      }

      // Award Stars & High Score Check on Match End
      if ((this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') && !this.hasAwardedStars) {
        this.hasAwardedStars = true;
        const wavesCompleted = Math.max(1, this.waveManager.currentWaveIndex + 1);
        const starsEarned = Math.floor(wavesCompleted / 2) + (this.gameState.status === 'VICTORY' ? 5 : 0);
        this.talentManager.earnStars(starsEarned);
        this.analyticsManager.checkHighScore(wavesCompleted);
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
