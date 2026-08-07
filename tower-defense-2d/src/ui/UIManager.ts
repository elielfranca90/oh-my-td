import { AchievementManager } from '../engine/AchievementManager';
import { AnalyticsManager } from '../engine/AnalyticsManager';
import type { Game2D } from '../engine/Game';
import { GameState } from '../engine/GameState';
import { AudioManager } from '../engine/AudioManager';
import type { MapId } from '../engine/MapManager';
import { SpellManager } from '../engine/SpellManager';
import { TalentManager } from '../engine/TalentManager';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager } from '../engine/WaveManager';
import type { TowerType } from '../types';

export type MobileTab = 'STORE' | 'SPELLS' | 'TALENTS' | 'INSPECTOR';

/** Every id read by `update()`, cached once so the hot path does no lookups. */
const CACHED_IDS = [
  'gold-val', 'hp-val', 'wave-val', 'stars-val', 'highscore-val', 'map-select',
  'bgm-mute-btn', 'sfx-mute-btn', 'pause-btn', 'next-wave-btn',
  'speed-1x', 'speed-2x', 'speed-4x',
  'spell-meteor-btn', 'meteor-info', 'meteor-cd-overlay',
  'spell-freeze-btn', 'freeze-info', 'freeze-cd-overlay',
  'dmg-lvl', 'talent-dmg-btn', 'gold-lvl', 'talent-gold-btn',
  'hp-lvl', 'talent-hp-btn', 'cd-lvl', 'talent-cd-btn',
  'inspector-content', 'inspector-placeholder', 'inspector-title',
  'stat-damage', 'stat-range', 'stat-firerate', 'stat-extra', 'stat-extra-label', 'stat-extra-value',
  'targeting-btn', 'upgrade-btn', 'sell-btn',
  'modal-overlay', 'modal-title', 'modal-desc', 'record-badge',
  'modal-highscore', 'modal-mvp', 'modal-kills', 'modal-gold',
  'achievements-modal-overlay', 'achievements-grid', 'achievements-summary',
  'store-panel', 'spells-panel', 'talents-panel', 'inspector-panel',
  'tab-store-btn', 'tab-spells-btn', 'tab-talents-btn', 'tab-inspector-btn',
  'build-basic-btn', 'build-frost-btn', 'build-solar-btn', 'build-cannon-btn', 'build-artillery-btn',
] as const;

type CachedId = typeof CACHED_IDS[number];

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

  private els = new Map<CachedId, HTMLElement | null>();
  /** True when #ui-container is absent: the whole UI degrades to a no-op. */
  private isDetached = true;

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

  // --- DOM helpers (cache + dirty-checking) -------------------------------------------

  private el(id: CachedId): HTMLElement | null {
    return this.els.get(id) ?? null;
  }

  private button(id: CachedId): HTMLButtonElement | null {
    return this.el(id) as HTMLButtonElement | null;
  }

  /** Writes only when the value really changed — textContent avoids innerText reflows. */
  private setText(id: CachedId, value: string) {
    const el = this.el(id);
    if (el && el.textContent !== value) el.textContent = value;
  }

  private setDisabled(btn: HTMLButtonElement | null, disabled: boolean) {
    if (btn && btn.disabled !== disabled) btn.disabled = disabled;
  }

  private setClass(id: CachedId, className: string, on: boolean) {
    const el = this.el(id);
    if (!el) return;
    if (el.classList.contains(className) !== on) el.classList.toggle(className, on);
  }

  /** Gameplay actions are only legal while a match is actually running. */
  private canAct(): boolean {
    return this.gameState.status === 'PLAYING' && !this.gameState.isPaused;
  }

  private createUI() {
    const container = document.getElementById('ui-container');
    if (!container) return;

    container.innerHTML = `
      <!-- TOP STATUS & WAVE CONTROL BAR -->
      <div id="top-bar" class="ui-panel">
        <!-- ROW 1: STATS & MAP SELECTOR -->
        <div class="stats-row">
          <div class="stat"><span class="icon">🪙</span> Gold: <strong id="gold-val">50</strong></div>
          <div class="stat"><span class="icon">❤️</span> Base HP: <strong id="hp-val">20/20</strong></div>
          <div class="stat"><span class="icon">🌊</span> Wave: <strong id="wave-val">0/10</strong></div>
          <div class="stat"><span class="icon">🌟</span> Stars: <strong id="stars-val">0</strong></div>
          <div class="stat"><span class="icon">🏆</span> Best: <strong id="highscore-val">0</strong></div>

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
            <div id="inspector-stats" class="inspector-details">
              <div><strong>Damage:</strong> <span id="stat-damage">0</span></div>
              <div><strong>Range:</strong> <span id="stat-range">0px</span></div>
              <div><strong>Fire Rate:</strong> <span id="stat-firerate">0 shots/sec</span></div>
              <div id="stat-extra" class="hidden"><strong id="stat-extra-label"></strong> <span id="stat-extra-value"></span></div>
            </div>
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

    for (const id of CACHED_IDS) {
      this.els.set(id, document.getElementById(id));
    }
    this.isDetached = false;

    this.setupEvents();
  }

  private setupEvents() {
    const mapSelect = this.el('map-select') as HTMLSelectElement | null;
    if (mapSelect) {
      mapSelect.value = this.game.currentMapId;
      mapSelect.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        const val = select.value as MapId;
        // Changing the map restarts the match, so ask first (it used to silently discard
        // all progress).
        const confirmed = window.confirm('Trocar de mapa reinicia a partida. Todo o progresso atual será perdido. Continuar?');
        if (!confirmed) {
          select.value = this.game.currentMapId;
          return;
        }
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
      this.el('achievements-modal-overlay')?.classList.add('hidden');
    });

    document.getElementById('next-wave-btn')?.addEventListener('click', () => {
      if (!this.canAct()) return;
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

    const bgmSlider = document.getElementById('bgm-vol-slider') as HTMLInputElement | null;
    if (bgmSlider) {
      bgmSlider.value = Math.round(this.audioManager.bgmVolume * 100).toString();
      bgmSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setBgmVolume(val);
      });
    }

    const sfxSlider = document.getElementById('sfx-vol-slider') as HTMLInputElement | null;
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

    const autoToggle = document.getElementById('auto-mode-toggle') as HTMLInputElement | null;
    autoToggle?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.waveManager.setAutoMode(checked);
    });

    const endlessToggle = document.getElementById('endless-mode-toggle') as HTMLInputElement | null;
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
      if (!this.canAct()) return;
      this.spellManager.selectSpell('METEOR');
    });

    document.getElementById('spell-freeze-btn')?.addEventListener('click', () => {
      if (!this.canAct()) return;
      this.spellManager.triggerGlobalFreeze(this.game.getEnemies());
    });

    // Talent Upgrades — allowed while paused (meta-progression planning) but not after the
    // match has already ended.
    const canSpendStars = () => this.gameState.status === 'PLAYING';

    document.getElementById('talent-dmg-btn')?.addEventListener('click', () => {
      if (canSpendStars()) this.talentManager.upgradeTalent('damageLvl');
    });

    document.getElementById('talent-gold-btn')?.addEventListener('click', () => {
      if (canSpendStars()) this.talentManager.upgradeTalent('goldLvl');
    });

    document.getElementById('talent-hp-btn')?.addEventListener('click', () => {
      if (canSpendStars()) this.talentManager.upgradeTalent('hpLvl');
    });

    document.getElementById('talent-cd-btn')?.addEventListener('click', () => {
      if (canSpendStars()) this.talentManager.upgradeTalent('cdLvl');
    });

    // Inspector
    document.getElementById('targeting-btn')?.addEventListener('click', () => {
      if (!this.canAct()) return;
      this.towerManager.cycleSelectedTowerTargeting();
    });

    document.getElementById('upgrade-btn')?.addEventListener('click', () => {
      if (!this.canAct()) return;
      this.towerManager.upgradeSelectedTower();
    });

    document.getElementById('sell-btn')?.addEventListener('click', () => {
      if (!this.canAct()) return;
      this.towerManager.sellSelectedTower();
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.onRestartCallback();
    });
  }

  public switchMobileTab(tab: MobileTab) {
    this.activeMobileTab = tab;
    this.setClass('tab-store-btn', 'active', tab === 'STORE');
    this.setClass('tab-spells-btn', 'active', tab === 'SPELLS');
    this.setClass('tab-talents-btn', 'active', tab === 'TALENTS');
    this.setClass('tab-inspector-btn', 'active', tab === 'INSPECTOR');

    this.setClass('store-panel', 'mobile-active', tab === 'STORE');
    this.setClass('spells-panel', 'mobile-active', tab === 'SPELLS');
    this.setClass('talents-panel', 'mobile-active', tab === 'TALENTS');
    this.setClass('inspector-panel', 'mobile-active', tab === 'INSPECTOR');
  }

  /**
   * Built with DOM nodes + textContent instead of an innerHTML template: `progress` comes
   * from localStorage and must never be able to inject markup.
   */
  private openAchievementsModal() {
    this.el('achievements-modal-overlay')?.classList.remove('hidden');

    const grid = this.el('achievements-grid');
    if (!grid) return;

    const allAchs = Object.values(this.achievementManager.achievements);
    const unlockedCount = allAchs.filter(a => a.unlocked).length;
    this.setText('achievements-summary', `Unlocked ${unlockedCount}/${allAchs.length} Badges`);

    grid.textContent = '';
    for (const ach of allAchs) {
      const card = document.createElement('div');
      card.className = `achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`;

      const icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = ach.icon;

      const info = document.createElement('div');
      info.className = 'ach-info';

      const title = document.createElement('div');
      title.className = 'ach-title';
      title.textContent = ach.title;

      const desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = ach.desc;

      const progress = document.createElement('div');
      progress.className = 'ach-progress';
      progress.textContent = ach.unlocked
        ? `COMPLETED (+${ach.rewardStars}★)`
        : `${ach.progress}/${ach.maxProgress} (${ach.rewardStars}★)`;

      info.append(title, desc, progress);
      card.append(icon, info);
      grid.appendChild(card);
    }
  }

  private setGameSpeed(speed: number) {
    this.game.gameSpeedMultiplier = speed;
    this.syncSpeedButtons();
  }

  /** Derived from the engine state, so a restart can never desynchronise the buttons. */
  private syncSpeedButtons() {
    const speed = this.game.gameSpeedMultiplier;
    this.setClass('speed-1x', 'active', speed === 1);
    this.setClass('speed-2x', 'active', speed === 2);
    this.setClass('speed-4x', 'active', speed === 4);
  }

  private setBuildType(type: TowerType) {
    this.towerManager.selectedBuildType = type;
    this.setClass('build-basic-btn', 'active', type === 'BASIC');
    this.setClass('build-frost-btn', 'active', type === 'FROST');
    this.setClass('build-solar-btn', 'active', type === 'SOLAR_PRISM');
    this.setClass('build-cannon-btn', 'active', type === 'CANNON');
    this.setClass('build-artillery-btn', 'active', type === 'ARTILLERY');
  }

  public update() {
    if (this.isDetached) return;

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

    const canAct = this.canAct();

    // Top Bar
    this.setText('gold-val', `${this.gameState.gold}`);
    this.setText('hp-val', `${this.gameState.baseHp}/${this.gameState.maxBaseHp}`);
    this.setText('stars-val', `${this.talentManager.stars}`);
    this.setText('highscore-val', `${this.analyticsManager.highScoreWave}`);

    const mapSelect = this.el('map-select') as HTMLSelectElement | null;
    if (mapSelect && mapSelect.value !== this.game.currentMapId) {
      mapSelect.value = this.game.currentMapId;
    }

    // Audio Buttons Update
    this.setText('bgm-mute-btn', this.audioManager.isBgmMuted ? '🔇' : '🎵');
    this.setText('sfx-mute-btn', this.audioManager.isSfxMuted ? '🔇' : '🔊');

    this.setText('pause-btn', this.gameState.isPaused ? '▶️' : '⏸️');
    this.setClass('pause-btn', 'active', this.gameState.isPaused);

    this.syncSpeedButtons();

    const currentNum = Math.max(0, this.waveManager.currentWaveIndex + 1);
    if (this.waveManager.isEndlessMode) {
      this.setText('wave-val', `${currentNum}/♾️`);
    } else {
      this.setText('wave-val', `${currentNum}/${Math.max(this.waveManager.campaignWaveCount, currentNum)}`);
    }

    const nextWaveNum = this.waveManager.currentWaveIndex + 2;
    const isNextBoss = this.waveManager.isBossWave(nextWaveNum);

    const waveBtn = this.button('next-wave-btn');
    if (waveBtn) {
      if (this.waveManager.isWaveActive) {
        this.setDisabled(waveBtn, true);
        const activeWaveNum = this.waveManager.currentWaveIndex + 1;
        const isCurrentBoss = this.waveManager.isBossWave(activeWaveNum);
        this.setText('next-wave-btn', isCurrentBoss ? '⚠️ BOSS WAVE IN PROGRESS! ⚠️' : 'Wave in Progress...');
        this.setWaveBtnClass(waveBtn, isCurrentBoss);
      } else if (this.waveManager.isAutoMode) {
        this.setDisabled(waveBtn, true);
        const countdownSec = this.waveManager.getAutoCountdownSeconds();
        this.setText('next-wave-btn', isNextBoss ? `⚠️ BOSS IN ${countdownSec}s! ⚠️` : `Auto Wave in ${countdownSec}s...`);
        this.setWaveBtnClass(waveBtn, isNextBoss);
      } else {
        this.setDisabled(waveBtn, !canAct);
        this.setText('next-wave-btn', isNextBoss ? `⚠️ Start BOSS Wave ${nextWaveNum} ⚠️` : `Start Wave ${nextWaveNum}`);
        this.setWaveBtnClass(waveBtn, isNextBoss);
      }
    }

    // Spells UI
    const meteorBtn = this.button('spell-meteor-btn');
    if (meteorBtn) {
      this.setClass('spell-meteor-btn', 'active', this.spellManager.activeSpell === 'METEOR');
      const isCd = this.spellManager.meteorCooldownMs > 0;
      const canAfford = this.gameState.gold >= this.spellManager.meteorCost;
      this.setDisabled(meteorBtn, isCd || !canAfford || !canAct);

      this.setText('meteor-info', `${this.spellManager.meteorCost}g • 30s CD`);
      this.updateCooldownOverlay('meteor-cd-overlay', isCd, this.spellManager.meteorCooldownMs);
    }

    const freezeBtn = this.button('spell-freeze-btn');
    if (freezeBtn) {
      const isCd = this.spellManager.freezeCooldownMs > 0;
      const canAfford = this.gameState.gold >= this.spellManager.freezeCost;
      this.setDisabled(freezeBtn, isCd || !canAfford || !canAct);

      this.setText('freeze-info', `${this.spellManager.freezeCost}g • 40s CD`);
      this.updateCooldownOverlay('freeze-cd-overlay', isCd, this.spellManager.freezeCooldownMs);
    }

    // Talents UI
    this.updateTalentUI('dmg-lvl', 'talent-dmg-btn', 'damageLvl');
    this.updateTalentUI('gold-lvl', 'talent-gold-btn', 'goldLvl');
    this.updateTalentUI('hp-lvl', 'talent-hp-btn', 'hpLvl');
    this.updateTalentUI('cd-lvl', 'talent-cd-btn', 'cdLvl');

    this.updateInspector(canAct);
    this.updateEndGameModal();
  }

  private setWaveBtnClass(btn: HTMLButtonElement, isBoss: boolean) {
    const className = isBoss ? 'btn danger wave-start-btn' : 'btn primary wave-start-btn';
    if (btn.className !== className) btn.className = className;
  }

  private updateCooldownOverlay(id: CachedId, isCd: boolean, cooldownMs: number) {
    const overlay = this.el(id);
    if (!overlay) return;

    if (isCd) {
      const sec = Math.ceil(cooldownMs / 1000);
      const text = `${sec}s`;
      if (overlay.textContent !== text) overlay.textContent = text;
      this.setClass(id, 'hidden', false);
    } else {
      this.setClass(id, 'hidden', true);
    }
  }

  private updateTalentUI(lvlId: CachedId, btnId: CachedId, type: keyof TalentManager['talents']) {
    const btn = this.button(btnId);
    if (!this.el(lvlId) || !btn) return;

    const current = this.talentManager.talents[type];
    const max = this.talentManager.getTalentMaxLvl(type);
    this.setText(lvlId, `${current}/${max}`);

    if (current >= max) {
      this.setDisabled(btn, true);
      this.setText(btnId, 'MAX');
    } else {
      const cost = this.talentManager.getTalentCost(type);
      this.setDisabled(btn, this.talentManager.stars < cost || this.gameState.status !== 'PLAYING');
      this.setText(btnId, `Upgrade (${cost}★)`);
    }
  }

  private updateInspector(canAct: boolean) {
    const tower = this.towerManager.selectedTower;

    if (!tower) {
      this.setClass('inspector-content', 'hidden', true);
      this.setClass('inspector-placeholder', 'hidden', false);
      return;
    }

    this.setClass('inspector-content', 'hidden', false);
    this.setClass('inspector-placeholder', 'hidden', true);

    this.setText('inspector-title', `${tower.data.type} Tower (Lvl ${tower.data.level})`);
    this.setText('stat-damage', `${tower.data.damage}`);
    this.setText('stat-range', `${tower.data.range}px`);
    this.setText('stat-firerate', `${(60 / tower.getEffectiveFireRate()).toFixed(1)} shots/sec`);

    if (tower.data.splashRadius) {
      this.setClass('stat-extra', 'hidden', false);
      this.setText('stat-extra-label', 'Splash Radius:');
      this.setText('stat-extra-value', `${tower.data.splashRadius}px`);
    } else if (tower.data.slowFactor) {
      this.setClass('stat-extra', 'hidden', false);
      this.setText('stat-extra-label', 'Slow:');
      this.setText('stat-extra-value', `${(tower.data.slowFactor * 100).toFixed(0)}%`);
    } else {
      this.setClass('stat-extra', 'hidden', true);
    }

    this.setText('targeting-btn', `🎯 Target: ${tower.data.targeting}`);
    this.setDisabled(this.button('targeting-btn'), !canAct);

    const upgradeBtn = this.button('upgrade-btn');
    if (upgradeBtn) {
      if (tower.data.level >= 3) {
        this.setDisabled(upgradeBtn, true);
        this.setText('upgrade-btn', 'Max Level Reached');
      } else {
        const cost = tower.getUpgradeCost();
        this.setDisabled(upgradeBtn, this.gameState.gold < cost || !canAct);
        this.setText('upgrade-btn', `⬆️ Upgrade (${cost}g)`);
      }
    }

    this.setText('sell-btn', `💰 Sell (+${tower.getSellValue()}g)`);
    this.setDisabled(this.button('sell-btn'), !canAct);
  }

  private updateEndGameModal() {
    const overlay = this.el('modal-overlay');
    const isOver = this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY';

    if (!isOver) {
      overlay?.classList.add('hidden');
      return;
    }

    overlay?.classList.remove('hidden');

    if (this.gameState.status === 'GAME_OVER') {
      this.setText('modal-title', '💀 Game Over');
      const survivedWave = Math.max(1, this.waveManager.currentWaveIndex + 1);
      this.setText('modal-desc', `Enemies overwhelmed your base! You survived until Wave ${survivedWave}!`);
    } else {
      this.setText('modal-title', '🏆 Campaign Victory!');
      this.setText('modal-desc', `You defended the base through all ${this.waveManager.campaignWaveCount} Campaign Waves!`);
    }

    this.setClass('record-badge', 'hidden', !this.analyticsManager.isNewRecord);

    this.setText('modal-highscore', `Wave ${this.analyticsManager.highScoreWave}`);

    const mvp = this.analyticsManager.getMvpTower();
    this.setText('modal-mvp', `${mvp.type} Tower (${mvp.damage} Dmg)`);
    this.setText('modal-kills', `${this.analyticsManager.getTotalKills()} enemies`);
    this.setText('modal-gold', `${this.analyticsManager.goldEarned}g / ${this.analyticsManager.goldSpent}g`);
  }
}
