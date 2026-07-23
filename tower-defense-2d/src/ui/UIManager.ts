import { AchievementManager } from '../engine/AchievementManager';
import { AnalyticsManager } from '../engine/AnalyticsManager';
import { Game2D } from '../engine/Game';
import { GameState } from '../engine/GameState';
import { AudioManager } from '../engine/AudioManager';
import type { MapId } from '../engine/MapManager';
import { SpellManager } from '../engine/SpellManager';
import { TalentManager } from '../engine/TalentManager';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager } from '../engine/WaveManager';
import type { TowerType } from '../types';

export type MobileTab = 'STORE' | 'SPELLS' | 'TALENTS' | 'INSPECTOR';

export class UIManager {
  private gameState: GameState;
  private waveManager: WaveManager;
  private towerManager: TowerManager2D;
  private spellManager: SpellManager;
  private audioManager: AudioManager;
  private talentManager: TalentManager;
  public achievementManager: AchievementManager;
  private analyticsManager: AnalyticsManager;
  private game: Game2D;
  private onRestartCallback: () => void;

  public activeMobileTab: MobileTab = 'STORE';
  private lastSelectedTowerId: string | null = null;

  private overlayEl!: HTMLElement;
  private achievementsOverlayEl!: HTMLElement;

  constructor(
    gameState: GameState,
    waveManager: WaveManager,
    towerManager: TowerManager2D,
    spellManager: SpellManager,
    audioManager: AudioManager,
    talentManager: TalentManager,
    achievementManager: AchievementManager,
    analyticsManager: AnalyticsManager,
    game: Game2D,
    onRestart: () => void
  ) {
    this.gameState = gameState;
    this.waveManager = waveManager;
    this.towerManager = towerManager;
    this.spellManager = spellManager;
    this.audioManager = audioManager;
    this.talentManager = talentManager;
    this.achievementManager = achievementManager;
    this.analyticsManager = analyticsManager;
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
        <!-- ROW 0: GAME TITLE -->
        <div class="game-title-row">
          <span class="game-title-text">🏰 TOWER DEFENSE 2D <span class="game-subtitle">· Oh My TD</span></span>
        </div>

        <!-- ROW 1: STATS & MAP SELECTOR -->
        <div class="stats-row">
          <div class="stat"><span class="icon">🪙</span> <span class="stat-label">Gold:</span> <strong id="gold-val">50</strong></div>
          <div class="stat"><span class="icon">❤️</span> <span class="stat-label">HP:</span> <strong id="hp-val">20/20</strong></div>
          <div class="stat"><span class="icon">🌊</span> <span class="stat-label">Wave:</span> <strong id="wave-val">0/10</strong></div>
          <div class="stat"><span class="icon">🌟</span> <span class="stat-label">Stars:</span> <strong id="stars-val">0</strong></div>
          <div class="stat"><span class="icon">🏆</span> <span class="stat-label">Best:</span> <strong id="highscore-val">0</strong></div>

          <div class="map-selector-row">
            <span class="icon">🗺️</span>
            <select id="map-select" class="map-select">
              <option value="MAP_1">Map 1: Green Valley</option>
              <option value="MAP_2">Map 2: Death Pass (Dual Spawn)</option>
              <option value="MAP_3">Map 3: Citadel (Short Route)</option>
            </select>
          </div>
        </div>
        
        <!-- ROW 2: TOGGLES & AUDIO SLIDERS -->
        <div class="audio-toggles-row">
          <div class="toggles-group">
            <div class="auto-mode-row">
              <span>⚡ Auto</span>
              <label class="switch">
                <input type="checkbox" id="auto-mode-toggle" />
                <span class="slider round"></span>
              </label>
            </div>

            <div class="auto-mode-row endless">
              <span>♾️ Endless</span>
              <label class="switch">
                <input type="checkbox" id="endless-mode-toggle" />
                <span class="slider round"></span>
              </label>
            </div>
          </div>

          <!-- INDEPENDENT AUDIO CONTROLS -->
          <div class="audio-controls-group">
            <div class="audio-control-item" title="Music Volume (BGM)">
              <button id="bgm-mute-btn" class="btn sound-btn">🎵</button>
              <input type="range" id="bgm-vol-slider" class="vol-slider" min="0" max="100" value="60" />
            </div>
            <div class="audio-control-item" title="Sound Effects Volume (SFX)">
              <button id="sfx-mute-btn" class="btn sound-btn">🔊</button>
              <input type="range" id="sfx-vol-slider" class="vol-slider" min="0" max="100" value="80" />
            </div>
          </div>
        </div>

        <!-- ROW 3: CONTROLS & START WAVE -->
        <div class="actions-row">
          <div class="speed-controls">
            <button id="badges-btn" class="btn secondary" title="View Achievements">🏆 Badges</button>
            <button id="pause-btn" class="btn pause-btn" title="Pause/Resume">⏸️</button>
            <button id="speed-1x" class="btn speed-btn active">1x</button>
            <button id="speed-2x" class="btn speed-btn">2x</button>
            <button id="speed-4x" class="btn speed-btn">4x</button>
            <button id="reset-btn" class="btn secondary reset-btn" title="Start a New Game">🔄 New Game</button>
          </div>

          <button id="next-wave-btn" class="btn primary wave-start-btn">Start Wave 1</button>
        </div>
      </div>

      <!-- MOBILE TAB NAVIGATION BAR -->
      <div id="mobile-tabs-bar" class="mobile-tabs-bar">
        <button id="tab-store-btn" class="mobile-tab-btn active">🏗️ Build</button>
        <button id="tab-spells-btn" class="mobile-tab-btn">☄️ Spells</button>
        <button id="tab-talents-btn" class="mobile-tab-btn">🌟 Skills</button>
        <button id="tab-inspector-btn" class="mobile-tab-btn">🔍 Inspector</button>
      </div>

      <!-- BOTTOM CONTROL PANELS GRID -->
      <div class="controls-grid">
        <!-- STORE PANEL -->
        <div id="store-panel" class="ui-panel tab-panel">
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
            <button id="build-solar-btn" class="btn store-btn">
              <div class="tower-icon solar"></div>
              <div>
                <strong>Solar</strong>
                <div class="cost">🪙 80g</div>
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
        <div id="spells-panel" class="ui-panel tab-panel">
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

        <!-- SKILL TREE TALENTS PANEL -->
        <div id="talents-panel" class="ui-panel tab-panel">
          <div class="title">🌟 Skill Tree</div>
          <div class="talents-list">
            <div class="talent-item">
              <span>🏹 Archery (<span id="dmg-lvl">0/3</span>)</span>
              <button id="talent-dmg-btn" class="btn talent-btn">Upgrade (2★)</button>
            </div>
            <div class="talent-item">
              <span>💰 Economy (<span id="gold-lvl">0/2</span>)</span>
              <button id="talent-gold-btn" class="btn talent-btn">Upgrade (3★)</button>
            </div>
            <div class="talent-item">
              <span>🏰 Fortress (<span id="hp-lvl">0/2</span>)</span>
              <button id="talent-hp-btn" class="btn talent-btn">Upgrade (2★)</button>
            </div>
            <div class="talent-item">
              <span>⚡ Channeling (<span id="cd-lvl">0/2</span>)</span>
              <button id="talent-cd-btn" class="btn talent-btn">Upgrade (3★)</button>
            </div>
          </div>
        </div>

        <!-- TOWER INSPECTOR PANEL -->
        <div id="inspector-panel" class="ui-panel inspector-slot tab-panel">
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

      <!-- END GAME MODAL WITH ANALYTICS -->
      <div id="modal-overlay" class="modal-overlay hidden">
        <div class="modal-card analytics-modal">
          <h1 id="modal-title">Game Over</h1>
          <p id="modal-desc">Your base was destroyed!</p>

          <div id="analytics-details" class="analytics-details">
            <div id="record-badge" class="record-badge hidden">✨ NEW RECORD! ✨</div>
            <div class="analytics-row">
              <span>🏆 High Score:</span>
              <strong id="modal-highscore">Wave 0</strong>
            </div>
            <div class="analytics-row">
              <span>👑 MVP Tower:</span>
              <strong id="modal-mvp">Basic Tower (0 Dmg)</strong>
            </div>
            <div class="analytics-row">
              <span>⚔️ Total Kills:</span>
              <strong id="modal-kills">0 enemies</strong>
            </div>
            <div class="analytics-row">
              <span>🪙 Gold Earned / Spent:</span>
              <strong id="modal-gold">0g / 0g</strong>
            </div>
          </div>

          <button id="restart-btn" class="btn primary modal-restart-btn">Play Again</button>
        </div>
      </div>

      <!-- ACHIEVEMENTS & BADGES MODAL -->
      <div id="achievements-modal-overlay" class="modal-overlay hidden">
        <div class="modal-card achievements-modal-card">
          <h1>🏆 Badges & Achievements</h1>
          <p id="achievements-summary">Unlocked 0/7 Badges</p>

          <div id="achievements-grid" class="achievements-grid"></div>

          <button id="close-achievements-btn" class="btn primary modal-restart-btn">Close</button>
        </div>
      </div>
    `;

    this.overlayEl = document.getElementById('modal-overlay')!;
    this.achievementsOverlayEl = document.getElementById('achievements-modal-overlay')!;

    this.setupEvents();
  }

  private setupEvents() {
    const mapSelect = document.getElementById('map-select') as HTMLSelectElement;
    if (mapSelect) {
      mapSelect.value = this.game['mapManager'].currentMapId;
      mapSelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value as MapId;
        this.game.changeMap(val);
      });
    }

    // Mobile Tab Bar Buttons
    document.getElementById('tab-store-btn')?.addEventListener('click', () => this.switchMobileTab('STORE'));
    document.getElementById('tab-spells-btn')?.addEventListener('click', () => this.switchMobileTab('SPELLS'));
    document.getElementById('tab-talents-btn')?.addEventListener('click', () => this.switchMobileTab('TALENTS'));
    document.getElementById('tab-inspector-btn')?.addEventListener('click', () => this.switchMobileTab('INSPECTOR'));

    document.getElementById('badges-btn')?.addEventListener('click', () => {
      this.openAchievementsModal();
    });

    document.getElementById('close-achievements-btn')?.addEventListener('click', () => {
      this.achievementsOverlayEl.classList.add('hidden');
    });

    document.getElementById('next-wave-btn')?.addEventListener('click', () => {
      this.waveManager.startNextWave();
    });

    document.getElementById('reset-btn')?.addEventListener('click', () => {
      const confirmed = window.confirm('Tem certeza que deseja reiniciar o jogo? Todo o progresso atual será perdido.');
      if (confirmed) {
        this.onRestartCallback();
      }
    });

    // Independent Audio Controls Events
    document.getElementById('bgm-mute-btn')?.addEventListener('click', () => {
      this.audioManager.toggleBgmMute();
    });

    document.getElementById('sfx-mute-btn')?.addEventListener('click', () => {
      this.audioManager.toggleSfxMute();
    });

    const bgmSlider = document.getElementById('bgm-vol-slider') as HTMLInputElement;
    if (bgmSlider) {
      bgmSlider.value = Math.round(this.audioManager.bgmVolume * 100).toString();
      bgmSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setBgmVolume(val);
      });
    }

    const sfxSlider = document.getElementById('sfx-vol-slider') as HTMLInputElement;
    if (sfxSlider) {
      sfxSlider.value = Math.round(this.audioManager.sfxVolume * 100).toString();
      sfxSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setSfxVolume(val);
      });
    }

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
    document.getElementById('build-solar-btn')?.addEventListener('click', () => this.setBuildType('SOLAR_PRISM'));
    document.getElementById('build-cannon-btn')?.addEventListener('click', () => this.setBuildType('CANNON'));
    document.getElementById('build-artillery-btn')?.addEventListener('click', () => this.setBuildType('ARTILLERY'));

    // Spells
    document.getElementById('spell-meteor-btn')?.addEventListener('click', () => {
      this.spellManager.selectSpell('METEOR');
    });

    document.getElementById('spell-freeze-btn')?.addEventListener('click', () => {
      this.spellManager.triggerGlobalFreeze(this.game['enemyManager'].getEnemies());
    });

    // Talent Upgrades
    document.getElementById('talent-dmg-btn')?.addEventListener('click', () => {
      this.talentManager.upgradeTalent('damageLvl');
    });

    document.getElementById('talent-gold-btn')?.addEventListener('click', () => {
      this.talentManager.upgradeTalent('goldLvl');
    });

    document.getElementById('talent-hp-btn')?.addEventListener('click', () => {
      this.talentManager.upgradeTalent('hpLvl');
    });

    document.getElementById('talent-cd-btn')?.addEventListener('click', () => {
      this.talentManager.upgradeTalent('cdLvl');
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

  public switchMobileTab(tab: MobileTab) {
    this.activeMobileTab = tab;
    document.getElementById('tab-store-btn')?.classList.toggle('active', tab === 'STORE');
    document.getElementById('tab-spells-btn')?.classList.toggle('active', tab === 'SPELLS');
    document.getElementById('tab-talents-btn')?.classList.toggle('active', tab === 'TALENTS');
    document.getElementById('tab-inspector-btn')?.classList.toggle('active', tab === 'INSPECTOR');

    document.getElementById('store-panel')?.classList.toggle('mobile-active', tab === 'STORE');
    document.getElementById('spells-panel')?.classList.toggle('mobile-active', tab === 'SPELLS');
    document.getElementById('talents-panel')?.classList.toggle('mobile-active', tab === 'TALENTS');
    document.getElementById('inspector-panel')?.classList.toggle('mobile-active', tab === 'INSPECTOR');
  }

  private openAchievementsModal() {
    this.achievementsOverlayEl.classList.remove('hidden');

    const grid = document.getElementById('achievements-grid');
    const summary = document.getElementById('achievements-summary');
    if (!grid) return;

    const allAchs = Object.values(this.achievementManager.achievements);
    const unlockedCount = allAchs.filter(a => a.unlocked).length;

    if (summary) summary.innerText = `Unlocked ${unlockedCount}/${allAchs.length} Badges`;

    grid.innerHTML = allAchs.map(ach => `
      <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-title">${ach.title}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-progress">${ach.unlocked ? `COMPLETED (+${ach.rewardStars}★)` : `${ach.progress}/${ach.maxProgress} (${ach.rewardStars}★)`}</div>
        </div>
      </div>
    `).join('');
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
    document.getElementById('build-solar-btn')?.classList.toggle('active', type === 'SOLAR_PRISM');
    document.getElementById('build-cannon-btn')?.classList.toggle('active', type === 'CANNON');
    document.getElementById('build-artillery-btn')?.classList.toggle('active', type === 'ARTILLERY');
  }

  public update() {
    // Check Auto-Tab Switch to INSPECTOR on Mobile when tower is selected
    const currentTower = this.towerManager.selectedTower;
    const currentTowerId = currentTower ? currentTower.data.id : null;

    if (currentTowerId !== this.lastSelectedTowerId) {
      this.lastSelectedTowerId = currentTowerId;
      if (currentTowerId !== null) {
        this.switchMobileTab('INSPECTOR');
      } else if (this.activeMobileTab === 'INSPECTOR') {
        this.switchMobileTab('STORE');
      }
    }

    // Top Bar
    const goldVal = document.getElementById('gold-val');
    if (goldVal) goldVal.innerText = `${this.gameState.gold}`;

    const hpVal = document.getElementById('hp-val');
    if (hpVal) hpVal.innerText = `${this.gameState.baseHp}/${this.gameState.maxBaseHp}`;

    const starsVal = document.getElementById('stars-val');
    if (starsVal) starsVal.innerText = `${this.talentManager.stars}`;

    const highscoreVal = document.getElementById('highscore-val');
    if (highscoreVal) highscoreVal.innerText = `${this.analyticsManager.highScoreWave}`;

    const mapSelect = document.getElementById('map-select') as HTMLSelectElement;
    if (mapSelect && mapSelect.value !== this.game['mapManager'].currentMapId) {
      mapSelect.value = this.game['mapManager'].currentMapId;
    }

    // Audio Buttons Update
    const bgmMuteBtn = document.getElementById('bgm-mute-btn');
    if (bgmMuteBtn) {
      bgmMuteBtn.innerText = this.audioManager.isBgmMuted ? '🔇' : '🎵';
    }

    const sfxMuteBtn = document.getElementById('sfx-mute-btn');
    if (sfxMuteBtn) {
      sfxMuteBtn.innerText = this.audioManager.isSfxMuted ? '🔇' : '🔊';
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

    // Spells UI
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

    // Talents UI
    const updateTalentUI = (id: string, btnId: string, type: keyof typeof this.talentManager.talents) => {
      const lvlEl = document.getElementById(id);
      const btn = document.getElementById(btnId) as HTMLButtonElement;
      if (!lvlEl || !btn) return;

      const current = this.talentManager.talents[type];
      const max = this.talentManager.getTalentMaxLvl(type);
      lvlEl.innerText = `${current}/${max}`;

      if (current >= max) {
        btn.disabled = true;
        btn.innerText = 'MAX';
      } else {
        const cost = this.talentManager.getTalentCost(type);
        btn.disabled = this.talentManager.stars < cost;
        btn.innerText = `Upgrade (${cost}★)`;
      }
    };

    updateTalentUI('dmg-lvl', 'talent-dmg-btn', 'damageLvl');
    updateTalentUI('gold-lvl', 'talent-gold-btn', 'goldLvl');
    updateTalentUI('hp-lvl', 'talent-hp-btn', 'hpLvl');
    updateTalentUI('cd-lvl', 'talent-cd-btn', 'cdLvl');

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

    // Modal Status Check & Post-Game Analytics Display
    if (this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') {
      this.overlayEl.classList.remove('hidden');
      const title = document.getElementById('modal-title');
      const desc = document.getElementById('modal-desc');

      if (this.gameState.status === 'GAME_OVER') {
        if (title) title.innerText = '💀 Game Over';
        const survivedWave = Math.max(1, this.waveManager.currentWaveIndex + 1);
        if (desc) desc.innerText = `Enemies overwhelmed your base! You survived until Wave ${survivedWave}!`;
      } else {
        if (title) title.innerText = '🏆 Campaign Victory!';
        if (desc) desc.innerText = 'You defended the base through all 10 Campaign Waves!';
      }

      // Populate Analytics details
      const recordBadge = document.getElementById('record-badge');
      if (recordBadge) {
        if (this.analyticsManager.isNewRecord) {
          recordBadge.classList.remove('hidden');
        } else {
          recordBadge.classList.add('hidden');
        }
      }

      const modalHs = document.getElementById('modal-highscore');
      if (modalHs) modalHs.innerText = `Wave ${this.analyticsManager.highScoreWave}`;

      const mvp = this.analyticsManager.getMvpTower();
      const modalMvp = document.getElementById('modal-mvp');
      if (modalMvp) modalMvp.innerText = `${mvp.type} Tower (${mvp.damage} Dmg)`;

      const modalKills = document.getElementById('modal-kills');
      if (modalKills) modalKills.innerText = `${this.analyticsManager.getTotalKills()} enemies`;

      const modalGold = document.getElementById('modal-gold');
      if (modalGold) modalGold.innerText = `${this.analyticsManager.goldEarned}g / ${this.analyticsManager.goldSpent}g`;
    } else {
      this.overlayEl.classList.add('hidden');
    }
  }
}
