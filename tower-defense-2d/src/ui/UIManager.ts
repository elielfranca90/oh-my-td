import { Game2D } from '../engine/Game';
import { GameState } from '../engine/GameState';
import { AudioManager } from '../engine/AudioManager';
import { SpellManager } from '../engine/SpellManager';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager } from '../engine/WaveManager';
import type { TowerType } from '../types';

export class UIManager {
  private gameState: GameState;
  private waveManager: WaveManager;
  private towerManager: TowerManager2D;
  private spellManager: SpellManager;
  private audioManager: AudioManager;
  private game: Game2D;
  private onRestartCallback: () => void;

  private overlayEl!: HTMLElement;

  constructor(
    gameState: GameState,
    waveManager: WaveManager,
    towerManager: TowerManager2D,
    spellManager: SpellManager,
    audioManager: AudioManager,
    game: Game2D,
    onRestart: () => void
  ) {
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.towerManager = towerManager;
    this.spellManager = spellManager;
    this.audioManager = audioManager;
    this.game = game;
    this.onRestartCallback = onRestart;

    this.createUI();
  }

  private createUI() {
    const container = document.getElementById('ui-container');
    if (!container) return;

    container.innerHTML = `
      <!-- TOP STATUS & WAVE CONTROL BAR -->
      <div id="top-bar" class="ui-panel">
        <div class="stats-header">
          <div class="stat"><span class="icon">🪙</span> Gold: <strong id="gold-val">50</strong></div>
          <div class="stat"><span class="icon">❤️</span> Base HP: <strong id="hp-val">20/20</strong></div>
          <div class="stat"><span class="icon">🌊</span> Wave: <strong id="wave-val">0/10</strong></div>
          
          <div class="speed-controls">
            <button id="sound-btn" class="btn sound-btn" title="Toggle Sound">🔊</button>
            <button id="pause-btn" class="btn pause-btn" title="Pause/Resume">⏸️</button>
            <button id="speed-1x" class="btn speed-btn active">1x</button>
            <button id="speed-2x" class="btn speed-btn">2x</button>
            <button id="speed-4x" class="btn speed-btn">4x</button>
            <button id="reset-btn" class="btn secondary reset-btn" title="Start a New Game">🔄 New Game</button>
          </div>
        </div>
        
        <div class="toggles-header">
          <div class="auto-mode-row">
            <span>⚡ Auto Waves</span>
            <label class="switch">
              <input type="checkbox" id="auto-mode-toggle" />
              <span class="slider round"></span>
            </label>
          </div>

          <div class="auto-mode-row endless">
            <span>♾️ Endless Mode</span>
            <label class="switch">
              <input type="checkbox" id="endless-mode-toggle" />
              <span class="slider round"></span>
            </label>
          </div>

          <button id="next-wave-btn" class="btn primary wave-start-btn">Start Wave 1</button>
        </div>
      </div>

      <!-- BOTTOM CONTROL PANELS GRID -->
      <div class="controls-grid">
        <!-- STORE PANEL -->
        <div id="store-panel" class="ui-panel">
          <div class="title">Build Towers</div>
          <div class="store-grid">
            <button id="build-basic-btn" class="btn store-btn active">
              <div class="tower-icon basic"></div>
              <div>
                <strong>Basic</strong>
                <div class="cost">🪙 50g</div>
              </div>
            </button>
            <button id="build-frost-btn" class="btn store-btn">
              <div class="tower-icon frost"></div>
              <div>
                <strong>Frost</strong>
                <div class="cost">🪙 70g</div>
              </div>
            </button>
            <button id="build-cannon-btn" class="btn store-btn">
              <div class="tower-icon cannon"></div>
              <div>
                <strong>Cannon</strong>
                <div class="cost">🪙 90g</div>
              </div>
            </button>
            <button id="build-artillery-btn" class="btn store-btn">
              <div class="tower-icon artillery"></div>
              <div>
                <strong>Artillery</strong>
                <div class="cost">🪙 110g</div>
              </div>
            </button>
          </div>
        </div>

        <!-- SPELLS PANEL -->
        <div id="spells-panel" class="ui-panel">
          <div class="title">Ultimate Spells</div>
          <div class="spell-buttons">
            <button id="spell-meteor-btn" class="btn spell-btn">
              <div class="spell-title">☄️ Meteor</div>
              <div id="meteor-info" class="spell-info">150g • 30s CD</div>
              <div id="meteor-cd-overlay" class="cd-overlay"></div>
            </button>
            <button id="spell-freeze-btn" class="btn spell-btn">
              <div class="spell-title">❄️ Freeze</div>
              <div id="freeze-info" class="spell-info">120g • 40s CD</div>
              <div id="freeze-cd-overlay" class="cd-overlay"></div>
            </button>
          </div>
        </div>

        <!-- TOWER INSPECTOR PANEL -->
        <div id="inspector-panel" class="ui-panel inspector-slot">
          <div id="inspector-content" class="hidden">
            <div class="title" id="inspector-title">Tower Level 1</div>
            <div id="inspector-stats" class="inspector-details"></div>
            <div class="action-buttons">
              <button id="targeting-btn" class="btn secondary">🎯 Target: FIRST</button>
              <button id="upgrade-btn" class="btn success">⬆️ Upgrade (40g)</button>
              <button id="sell-btn" class="btn danger">💰 Sell (35g)</button>
            </div>
          </div>
          <div id="inspector-placeholder" class="inspector-placeholder-text">
            <span>🔍 Click a tower on the grid to inspect, upgrade or sell.</span>
          </div>
        </div>
      </div>

      <!-- END GAME MODAL -->
      <div id="modal-overlay" class="modal-overlay hidden">
        <div class="modal-card">
          <h1 id="modal-title">Game Over</h1>
          <p id="modal-desc">Your base was destroyed!</p>
          <button id="restart-btn" class="btn primary">Play Again</button>
        </div>
      </div>
    `;

    this.overlayEl = document.getElementById('modal-overlay')!;

    this.setupEvents();
  }

  private setupEvents() {
    document.getElementById('next-wave-btn')?.addEventListener('click', () => {
      this.waveManager.startNextWave();
    });

    document.getElementById('reset-btn')?.addEventListener('click', () => {
      const confirmed = window.confirm('Tem certeza que deseja reiniciar o jogo? Todo o progresso atual será perdido.');
      if (confirmed) {
        this.onRestartCallback();
      }
    });

    document.getElementById('sound-btn')?.addEventListener('click', () => {
      this.audioManager.toggleMute();
    });

    document.getElementById('pause-btn')?.addEventListener('click', () => {
      this.gameState.togglePause();
    });

    const autoToggle = document.getElementById('auto-mode-toggle') as HTMLInputElement;
    autoToggle?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.waveManager.setAutoMode(checked);
    });

    const endlessToggle = document.getElementById('endless-mode-toggle') as HTMLInputElement;
    endlessToggle?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.waveManager.setEndlessMode(checked);
    });

    // Speed Controls
    document.getElementById('speed-1x')?.addEventListener('click', () => this.setGameSpeed(1));
    document.getElementById('speed-2x')?.addEventListener('click', () => this.setGameSpeed(2));
    document.getElementById('speed-4x')?.addEventListener('click', () => this.setGameSpeed(4));

    // Store Buttons
    document.getElementById('build-basic-btn')?.addEventListener('click', () => this.setBuildType('BASIC'));
    document.getElementById('build-frost-btn')?.addEventListener('click', () => this.setBuildType('FROST'));
    document.getElementById('build-cannon-btn')?.addEventListener('click', () => this.setBuildType('CANNON'));
    document.getElementById('build-artillery-btn')?.addEventListener('click', () => this.setBuildType('ARTILLERY'));

    // Spells
    document.getElementById('spell-meteor-btn')?.addEventListener('click', () => {
      this.spellManager.selectSpell('METEOR');
    });

    document.getElementById('spell-freeze-btn')?.addEventListener('click', () => {
      this.spellManager.triggerGlobalFreeze(this.game['enemyManager'].getEnemies());
    });

    // Inspector
    document.getElementById('targeting-btn')?.addEventListener('click', () => {
      this.towerManager.cycleSelectedTowerTargeting();
    });

    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      this.towerManager.upgradeSelectedTower();
    });

    document.getElementById('sell-btn')?.addEventListener('click', () => {
      this.towerManager.sellSelectedTower();
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.onRestartCallback();
    });
  }

  private setGameSpeed(speed: number) {
    this.game.gameSpeedMultiplier = speed;
    document.getElementById('speed-1x')?.classList.toggle('active', speed === 1);
    document.getElementById('speed-2x')?.classList.toggle('active', speed === 2);
    document.getElementById('speed-4x')?.classList.toggle('active', speed === 4);
  }

  private setBuildType(type: TowerType) {
    this.towerManager.selectedBuildType = type;
    document.getElementById('build-basic-btn')?.classList.toggle('active', type === 'BASIC');
    document.getElementById('build-frost-btn')?.classList.toggle('active', type === 'FROST');
    document.getElementById('build-cannon-btn')?.classList.toggle('active', type === 'CANNON');
    document.getElementById('build-artillery-btn')?.classList.toggle('active', type === 'ARTILLERY');
  }

  public update() {
    // Top Bar
    const goldVal = document.getElementById('gold-val');
    if (goldVal) goldVal.innerText = `${this.gameState.gold}`;

    const hpVal = document.getElementById('hp-val');
    if (hpVal) hpVal.innerText = `${this.gameState.baseHp}/${this.gameState.maxBaseHp}`;

    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
      soundBtn.innerText = this.audioManager.isMuted ? '🔇' : '🔊';
    }

    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
      pauseBtn.innerText = this.gameState.isPaused ? '▶️' : '⏸️';
      pauseBtn.classList.toggle('active', this.gameState.isPaused);
    }

    const totalWaves = this.waveManager.waves.length;
    const currentNum = Math.max(0, this.waveManager.currentWaveIndex + 1);

    const waveVal = document.getElementById('wave-val');
    if (waveVal) {
      if (this.waveManager.isEndlessMode) {
        waveVal.innerText = `${currentNum}/♾️`;
      } else {
        waveVal.innerText = `${currentNum}/${Math.max(10, totalWaves)}`;
      }
    }

    const nextWaveNum = this.waveManager.currentWaveIndex + 2;
    const isNextBoss = nextWaveNum === 5 || nextWaveNum === 8 || nextWaveNum === 10 || (nextWaveNum > 10 && nextWaveNum % 3 === 0);

    const waveBtn = document.getElementById('next-wave-btn') as HTMLButtonElement;
    if (waveBtn) {
      if (this.waveManager.isWaveActive) {
        waveBtn.disabled = true;
        const activeWaveNum = this.waveManager.currentWaveIndex + 1;
        const isCurrentBoss = activeWaveNum === 5 || activeWaveNum === 8 || activeWaveNum === 10 || (activeWaveNum > 10 && activeWaveNum % 3 === 0);
        waveBtn.innerText = isCurrentBoss ? '⚠️ BOSS WAVE IN PROGRESS! ⚠️' : 'Wave in Progress...';
        waveBtn.className = isCurrentBoss ? 'btn danger wave-start-btn' : 'btn primary wave-start-btn';
      } else if (this.waveManager.isAutoMode) {
        waveBtn.disabled = true;
        const countdownSec = this.waveManager.getAutoCountdownSeconds();
        waveBtn.innerText = isNextBoss ? `⚠️ BOSS IN ${countdownSec}s! ⚠️` : `Auto Wave in ${countdownSec}s...`;
        waveBtn.className = isNextBoss ? `btn danger wave-start-btn` : `btn primary wave-start-btn`;
      } else {
        waveBtn.disabled = false;
        waveBtn.innerText = isNextBoss ? `⚠️ Start BOSS Wave ${nextWaveNum} ⚠️` : `Start Wave ${nextWaveNum}`;
        waveBtn.className = isNextBoss ? `btn danger wave-start-btn` : `btn primary wave-start-btn`;
      }
    }

    // Spells UI - Dynamic Costs and Cooldowns
    const meteorBtn = document.getElementById('spell-meteor-btn') as HTMLButtonElement;
    if (meteorBtn) {
      const isMeteorActive = this.spellManager.activeSpell === 'METEOR';
      meteorBtn.classList.toggle('active', isMeteorActive);
      const isCd = this.spellManager.meteorCooldownMs > 0;
      const canAfford = this.gameState.gold >= this.spellManager.meteorCost;
      meteorBtn.disabled = isCd || !canAfford;

      const meteorInfo = document.getElementById('meteor-info');
      if (meteorInfo) {
        meteorInfo.innerText = `${this.spellManager.meteorCost}g • 30s CD`;
      }

      const cdOverlay = document.getElementById('meteor-cd-overlay');
      if (cdOverlay) {
        if (isCd) {
          const sec = Math.ceil(this.spellManager.meteorCooldownMs / 1000);
          cdOverlay.innerText = `${sec}s`;
          cdOverlay.classList.remove('hidden');
        } else {
          cdOverlay.classList.add('hidden');
        }
      }
    }

    const freezeBtn = document.getElementById('spell-freeze-btn') as HTMLButtonElement;
    if (freezeBtn) {
      const isCd = this.spellManager.freezeCooldownMs > 0;
      const canAfford = this.gameState.gold >= this.spellManager.freezeCost;
      freezeBtn.disabled = isCd || !canAfford;

      const freezeInfo = document.getElementById('freeze-info');
      if (freezeInfo) {
        freezeInfo.innerText = `${this.spellManager.freezeCost}g • 40s CD`;
      }

      const cdOverlay = document.getElementById('freeze-cd-overlay');
      if (cdOverlay) {
        if (isCd) {
          const sec = Math.ceil(this.spellManager.freezeCooldownMs / 1000);
          cdOverlay.innerText = `${sec}s`;
          cdOverlay.classList.remove('hidden');
        } else {
          cdOverlay.classList.add('hidden');
        }
      }
    }

    // Inspector
    const tower = this.towerManager.selectedTower;
    const inspectorContent = document.getElementById('inspector-content');
    const inspectorPlaceholder = document.getElementById('inspector-placeholder');

    if (tower) {
      if (inspectorContent) inspectorContent.classList.remove('hidden');
      if (inspectorPlaceholder) inspectorPlaceholder.classList.add('hidden');

      const title = document.getElementById('inspector-title');
      if (title) title.innerText = `${tower.data.type} Tower (Lvl ${tower.data.level})`;

      const stats = document.getElementById('inspector-stats');
      if (stats) {
        let extraInfo = '';
        if (tower.data.slowFactor) extraInfo = `<div><strong>Slow:</strong> ${(tower.data.slowFactor * 100).toFixed(0)}%</div>`;
        if (tower.data.splashRadius) extraInfo = `<div><strong>Splash Radius:</strong> ${tower.data.splashRadius}px</div>`;

        stats.innerHTML = `
          <div><strong>Damage:</strong> ${tower.data.damage}</div>
          <div><strong>Range:</strong> ${tower.data.range}px</div>
          <div><strong>Fire Rate:</strong> ${(60 / tower.data.fireRate).toFixed(1)} shots/sec</div>
          ${extraInfo}
        `;
      }

      const targetingBtn = document.getElementById('targeting-btn') as HTMLButtonElement;
      if (targetingBtn) {
        targetingBtn.innerText = `🎯 Target: ${tower.data.targeting}`;
      }

      const upgradeBtn = document.getElementById('upgrade-btn') as HTMLButtonElement;
      if (upgradeBtn) {
        if (tower.data.level >= 3) {
          upgradeBtn.disabled = true;
          upgradeBtn.innerText = 'Max Level Reached';
        } else {
          const cost = tower.getUpgradeCost();
          upgradeBtn.disabled = this.gameState.gold < cost;
          upgradeBtn.innerText = `⬆️ Upgrade (${cost}g)`;
        }
      }

      const sellBtn = document.getElementById('sell-btn') as HTMLButtonElement;
      if (sellBtn) {
        sellBtn.innerText = `💰 Sell (+${tower.getSellValue()}g)`;
      }
    } else {
      if (inspectorContent) inspectorContent.classList.add('hidden');
      if (inspectorPlaceholder) inspectorPlaceholder.classList.remove('hidden');
    }

    // Modal Status Check
    if (this.gameState.status === 'GAME_OVER') {
      this.overlayEl.classList.remove('hidden');
      const title = document.getElementById('modal-title');
      if (title) title.innerText = '💀 Game Over';
      const desc = document.getElementById('modal-desc');
      if (desc) {
        const survivedWave = Math.max(1, this.waveManager.currentWaveIndex + 1);
        desc.innerText = `Enemies overwhelmed your base! You survived until Wave ${survivedWave}!`;
      }
    } else if (this.gameState.status === 'VICTORY') {
      this.overlayEl.classList.remove('hidden');
      const title = document.getElementById('modal-title');
      if (title) title.innerText = '🏆 Campaign Victory!';
      const desc = document.getElementById('modal-desc');
      if (desc) desc.innerText = 'You defended the base through all 10 Campaign Waves!';
    } else {
      this.overlayEl.classList.add('hidden');
    }
  }
}
