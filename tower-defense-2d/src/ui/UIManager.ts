import { AchievementManager } from '../engine/AchievementManager';
import { AnalyticsManager } from '../engine/AnalyticsManager';
import { AudioManager } from '../engine/AudioManager';
import { EventBus } from '../engine/EventBus';
import { Game2D } from '../engine/Game';
import { GameState } from '../engine/GameState';
import type { MapId } from '../engine/MapManager';
import { SpellManager, type ActiveSpell } from '../engine/SpellManager';
import { TalentManager, type TalentData } from '../engine/TalentManager';
import type { Tower2D } from '../engine/Tower';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager } from '../engine/WaveManager';
import type { ChallengeMode, TowerType } from '../types';

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

  private currentGold = -1;
  private currentHp = -1;
  private currentWave = -1;

  // DOM Overlay Elements
  private overlayEl!: HTMLElement;
  private settingsOverlayEl!: HTMLElement;
  private talentsOverlayEl!: HTMLElement;
  private achievementsOverlayEl!: HTMLElement;
  private changelogOverlayEl!: HTMLElement;
  private storeStateEl!: HTMLElement;
  private inspectorStateEl!: HTMLElement;
  // Cached DOM Elements for 60fps Loop Optimization
  private waveBtnEl: HTMLButtonElement | null = null;
  private waveBtnLabelEl: HTMLElement | null = null;
  private bossBadgeEl: HTMLElement | null = null;
  private meteorCdEl: HTMLElement | null = null;
  private freezeCdEl: HTMLElement | null = null;

  private lastWaveDisabled: boolean | null = null;
  private lastWaveLabelText = '';
  private lastWaveClassName = '';
  private lastBossBadgeHidden: boolean | null = null;
  private lastMeteorCdText = '';
  private lastMeteorCdHidden: boolean | null = null;
  private lastFreezeCdText = '';
  private lastFreezeCdHidden: boolean | null = null;

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
    this.subscribeToEvents();
  }

  private createUI() {
    const container = document.getElementById('ui-container');
    if (!container) return;

    container.innerHTML = `
      <!-- UI OVERLAY CONTAINER (Fixed Fullscreen, pointer-events: none) -->
      <div id="ui-wrapper" class="ui-wrapper">
        
        <!-- 1. TOP HUD STATUS BAR -->
        <header id="hud-top" class="hud-top pointer-events-auto">
          <div class="hud-left-stats">
            <div class="hud-stat-badge hp" title="Vida da Base">
              <span class="icon">❤️</span>
              <strong id="hud-hp-val">${this.gameState.baseHp}/${this.gameState.maxBaseHp}</strong>
            </div>
            <div class="hud-stat-badge gold" title="Ouro Disponível">
              <span class="icon">🪙</span>
              <strong id="hud-gold-val">${this.gameState.gold}</strong>
            </div>
            <div class="hud-stat-badge wave" title="Onda Atual">
              <span class="icon">🌊</span>
              <span class="wave-title hud-label-text">WAVE</span>
              <strong id="hud-wave-val">0/10</strong>
              <span id="hud-boss-badge" class="boss-badge hidden">⚠️ BOSS</span>
            </div>
            <button id="hud-pause-btn" class="hud-btn pause-btn" title="Pausar / Retomar Jogo">
              ⏸️
            </button>
          </div>
          <div class="hud-right-controls">
            <button id="changelog-btn" class="hud-btn changelog-gift-btn" title="Últimas Atualizações (🎁)" aria-label="Novidades">
              🎁<span class="changelog-btn-text"> Novidades</span>
            </button>
            <button id="settings-toggle-btn" class="hud-btn settings-btn" title="Configurações & Menus (⚙️)">
              ⚙️
            </button>
          </div>
        </header>

        <!-- 2. FIXED RED ZONE ACTION TOOLBAR (Just below top bar, above map) -->
        <nav id="action-toolbar" class="action-toolbar pointer-events-auto">
          <!-- STORE STATE -->
          <div id="store-state" class="toolbar-state active">
            <!-- ROW 1: TOWERS -->
            <div class="toolbar-row">
              <span class="toolbar-label">🏗️ TORRES:</span>
              <div class="toolbar-items-row">
                <button id="card-basic" class="toolbar-card active" data-type="BASIC" title="Torre Básica (50g)">
                  <img class="tower-card-icon" src="/assets/basic_tower_icon.svg" alt="Básica" />
                  <span class="name">Básica</span>
                  <span class="cost">🪙 50g</span>
                </button>
                <button id="card-frost" class="toolbar-card" data-type="FROST" title="Torre de Gelo (70g)">
                  <img class="tower-card-icon" src="/assets/frost_tower_icon.svg" alt="Gelo" />
                  <span class="name">Gelo</span>
                  <span class="cost">🪙 70g</span>
                </button>
                <button id="card-solar" class="toolbar-card" data-type="SOLAR_PRISM" title="Prisma Solar (100g)">
                  <img class="tower-card-icon" src="/assets/solar_prism_icon.svg" alt="Prisma" />
                  <span class="name">Prisma</span>
                  <span class="cost">🪙 100g</span>
                </button>
                <button id="card-cannon" class="toolbar-card" data-type="CANNON" title="Canhão (105g)">
                  <img class="tower-card-icon" src="/assets/cannon_tower_icon.svg" alt="Canhão" />
                  <span class="name">Canhão</span>
                  <span class="cost">🪙 105g</span>
                </button>
                <button id="card-artillery" class="toolbar-card" data-type="ARTILLERY" title="Artilharia (110g)">
                  <img class="tower-card-icon" src="/assets/artillery_tower_icon.svg" alt="Artilharia" />
                  <span class="name">Artilharia</span>
                  <span class="cost">🪙 110g</span>
                </button>
              </div>
            </div>

            <!-- ROW 2: POWERS (BELOW TOWERS) -->
            <div class="toolbar-row">
              <span class="toolbar-label">☄️ PODERES:</span>
              <div class="toolbar-items-row">
                <button id="chip-meteor" class="toolbar-chip" title="Invocar Meteoro (150g)">
                  <span>☄️ Meteoro</span>
                  <span id="meteor-chip-cost" class="cost">150g</span>
                  <span id="meteor-chip-cd" class="cd hidden"></span>
                </button>
                <button id="chip-freeze" class="toolbar-chip" title="Congelamento Global (120g)">
                  <span>❄️ Congelar</span>
                  <span id="freeze-chip-cost" class="cost">120g</span>
                  <span id="freeze-chip-cd" class="cd hidden"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- INSPECTOR STATE -->
          <div id="inspector-state" class="toolbar-state hidden">
            <div class="inspector-toolbar-row">
              <div class="inspector-info-group">
                <strong id="inspector-title">Torre Nível 1</strong>
                <div id="inspector-stats-summary" class="stats-summary-inline"></div>
              </div>

              <div class="inspector-toolbar-actions">
                <button id="btn-inspect-target" class="btn secondary btn-inspect-action">🎯 FIRST</button>
                <button id="btn-inspect-repair" class="btn success btn-inspect-action">🔧 Reparo</button>
                <button id="btn-inspect-upgrade" class="btn success btn-inspect-action">⬆️ Upgrade (40g)</button>
                <button id="btn-inspect-sell" class="btn danger btn-inspect-action">💰 Vender (35g)</button>
                <button id="inspector-close-btn" class="close-icon-btn" title="Fechar Inspeção">✖</button>
              </div>
            </div>
          </div>
        </nav>

        <!-- 3. FLOATING TIME & WAVE CONTROLS (Bottom Right) -->
        <div id="time-controls" class="time-controls pointer-events-auto">
          <div id="active-mode-badge" class="active-mode-badge" title="Modo de Jogo Ativo">
            <span id="active-mode-name" class="mode-name">Modo Padrão</span>
          </div>

          <div class="speed-btns-group">
            <button id="btn-speed-1x" class="speed-btn active">1x</button>
            <button id="btn-speed-2x" class="speed-btn">2x</button>
            <button id="btn-speed-4x" class="speed-btn">4x</button>
            <button id="btn-auto-mode" class="auto-toggle-btn">⚡ Auto</button>
          </div>

          <button id="btn-next-wave" class="start-wave-main-btn">
            <span id="start-wave-label">Iniciar Onda 1</span>
          </button>
        </div>

        <!-- SETTINGS & META-GAME MODAL (⚙️) -->
        <div id="settings-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card settings-modal-card">
            <div class="modal-header">
              <h1>⚙️ Configurações & Menus</h1>
              <button id="settings-close-btn" class="close-icon-btn">✖</button>
            </div>

            <div class="settings-content">
              <!-- Audio Controls -->
              <div class="settings-section">
                <h3>🎵 Som & Música</h3>
                <div class="setting-item">
                  <span>Música BGM:</span>
                  <button id="settings-bgm-mute-btn" class="btn sound-btn">🎵</button>
                  <input type="range" id="settings-bgm-slider" class="vol-slider" min="0" max="100" value="60" />
                </div>
                <div class="setting-item">
                  <span>Efeitos SFX:</span>
                  <button id="settings-sfx-mute-btn" class="btn sound-btn">🔊</button>
                  <input type="range" id="settings-sfx-slider" class="vol-slider" min="0" max="100" value="80" />
                </div>
              </div>

              <!-- Map & Challenge Selection -->
              <div class="settings-section">
                <h3>🗺️ Mapa & Modo Desafio</h3>
                <div class="setting-item">
                  <span>Selecione o Mapa:</span>
                  <select id="settings-map-select" class="map-select">
                    <option value="MAP_1">Green Valley</option>
                    <option value="MAP_2">Death Pass (Dual Spawn)</option>
                    <option value="MAP_3">Citadel (Short Route)</option>
                  </select>
                </div>
                <div class="setting-item">
                  <span>Modo Desafio:</span>
                  <select id="settings-challenge-select" class="challenge-select">
                    <option value="NORMAL">Modo: Padrão</option>
                    <option value="NO_SPELLS">Modo: Sem Magias 🚫</option>
                    <option value="FAST_ENEMIES">Modo: Invasão Veloz ⚡</option>
                    <option value="HARDCORE">Modo: Hardcore (1 HP) 💀</option>
                    <option value="TURBO_GOLD">Modo: Corrida do Ouro 🪙</option>
                    <option value="MORTE_CERTA">Modo: ☠️ Morte Certa (Insano!)</option>
                  </select>
                </div>
                <div class="setting-item">
                  <span>Modo Infinito:</span>
                  <label class="switch">
                    <input type="checkbox" id="settings-endless-toggle" />
                    <span class="slider round"></span>
                  </label>
                </div>
              </div>

              <!-- Meta-Game Quick Actions -->
              <div class="settings-section">
                <h3>🌟 Meta-Jogo & Extras</h3>
                <div class="meta-game-grid">
                  <button id="settings-talents-btn" class="btn secondary">🌟 Skill Tree</button>
                  <button id="settings-badges-btn" class="btn secondary">🏆 Badges</button>
                  <button id="settings-restart-btn" class="btn danger">🔄 Novo Jogo</button>
                </div>
              </div>
            </div>

            <button id="settings-resume-btn" class="btn primary modal-restart-btn">▶️ Retomar Jogo</button>
          </div>
        </div>

        <!-- SKILL TREE MODAL -->
        <div id="talents-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card talents-modal-card">
            <h1>🌟 Skill Tree (Talentos)</h1>
            <p>Estrelas Disponíveis: <strong id="modal-stars-val" class="highlight-star">0★</strong></p>
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
              <div class="talent-item">
                <span>🔧 Repair Eng. (<span id="repair-lvl">0/2</span>)</span>
                <button id="talent-repair-btn" class="btn talent-btn">Upgrade (3★)</button>
              </div>
              <div class="talent-item">
                <span>🎯 Critical Focus (<span id="crit-lvl">0/2</span>)</span>
                <button id="talent-crit-btn" class="btn talent-btn">Upgrade (3★)</button>
              </div>
            </div>
            <button id="close-talents-btn" class="btn primary modal-restart-btn">Fechar</button>
          </div>
        </div>

        <!-- ACHIEVEMENTS & BADGES MODAL -->
        <div id="achievements-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card achievements-modal-card">
            <h1>🏆 Badges & Achievements</h1>
            <p id="achievements-summary">Unlocked 0/7 Badges</p>
            <div id="achievements-grid" class="achievements-grid"></div>
            <button id="close-achievements-btn" class="btn primary modal-restart-btn">Fechar</button>
          </div>
        </div>

        <!-- CHANGELOG MODAL -->
        <div id="changelog-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card changelog-modal-card">
            <div class="changelog-header">
              <h1>🎁 ÚLTIMAS 5 ATUALIZAÇÕES</h1>
              <p>Confira o histórico recente de novos recursos, ajustes e melhorias do jogo.</p>
            </div>
            <div id="changelog-list" class="changelog-list">
              <div class="changelog-item latest">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v2.2</strong>
                  <span class="changelog-title">Árvore de Talentos & Novas Conquistas</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Novos Talentos:</strong> Engenharia de Reparo (até 50% de desconto nos reparos) e Foco Crítico (até +20% de chance crítica).</li>
                  <li><strong>4 Novas Badges:</strong> Engenheiro de Campo, Matador do Pesadelo, Mestre da Guerra e Puro Talento (+20★ em recompensas).</li>
                </ul>
              </div>
              <div class="changelog-item">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v2.1</strong>
                  <span class="changelog-title">Interface Responsiva Mobile</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Layout Adaptado para Telas Pequenas:</strong> Compatibilidade completa para smartphones (Galaxy, iPhone) e tablets (iPad).</li>
                  <li><strong>Otimização de Espaço sem Colisão:</strong> Distribuição inteligente dos menus e controles nas áreas livres acima e abaixo do mapa.</li>
                  <li><strong>Navegação por Toque:</strong> Scroll horizontal fluido para seleção de torres e poderes.</li>
                </ul>
              </div>
              <div class="changelog-item">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v2.0</strong>
                  <span class="changelog-title">Sistema de Reparo & Modo Morte Certa</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Reparo de Torres:</strong> Opção de reparar a vida das torres danificadas diretamente pelo menu de inspeção.</li>
                  <li><strong>Modo Morte Certa:</strong> Desafio de altíssima dificuldade com a presença exclusiva do chefe Black Mega Boss.</li>
                  <li><strong>Interface Overlay 2.0:</strong> Interface reformulada com alto desempenho e clareza visual.</li>
                </ul>
              </div>
              <div class="changelog-item">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v1.9</strong>
                  <span class="changelog-title">Visual & Animações de Sprites</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Sprites de Torres:</strong> Ilustrações customizadas para as torres Básica, Gelo, Prisma Solar, Canhão e Artilharia.</li>
                  <li><strong>Animações de Inimigos:</strong> Sprites detalhados para tropas terrestres, corredores, tanques e chefes.</li>
                </ul>
              </div>
              <div class="changelog-item">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v1.8</strong>
                  <span class="changelog-title">Poderes Arcanos & Rebalanceamento</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Poderes de Apogeu:</strong> Invocação de Meteoro e Congelamento Global integrados com indicador visual de recarga.</li>
                  <li><strong>Ajustes de Economia:</strong> Rebalanceamento de ouro inicial (70g) e progressão de upgrades.</li>
                </ul>
              </div>
            </div>
            <button id="close-changelog-btn" class="btn primary modal-restart-btn">Fechar</button>
          </div>
        </div>

        <!-- END GAME ANALYTICS MODAL -->
        <div id="modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card analytics-modal">
            <h1 id="modal-title">Game Over</h1>
            <p id="modal-desc">Sua base foi destruída!</p>
            <div id="analytics-details" class="analytics-details">
              <div id="record-badge" class="record-badge hidden">✨ NOVO RECORDE! ✨</div>
              <div class="analytics-row"><span>🏆 High Score:</span><strong id="modal-highscore">Wave 0</strong></div>
              <div class="analytics-row"><span>👑 MVP Tower:</span><strong id="modal-mvp">Basic Tower (0 Dmg)</strong></div>
              <div class="analytics-row"><span>⚔️ Total Kills:</span><strong id="modal-kills">0 inimigos</strong></div>
              <div class="analytics-row"><span>🪙 Gold Earned / Spent:</span><strong id="modal-gold">0g / 0g</strong></div>
              <div class="analytics-row"><span>⚔️ Modo:</span><strong id="modal-challenge">Padrão</strong></div>
            </div>
            <button id="restart-btn" class="btn primary modal-restart-btn">Jogar Novamente</button>
          </div>
        </div>
      </div>
    `;

    this.overlayEl = document.getElementById('modal-overlay')!;
    this.settingsOverlayEl = document.getElementById('settings-modal-overlay')!;
    this.talentsOverlayEl = document.getElementById('talents-modal-overlay')!;
    this.achievementsOverlayEl = document.getElementById('achievements-modal-overlay')!;
    this.changelogOverlayEl = document.getElementById('changelog-modal-overlay')!;

    this.storeStateEl = document.getElementById('store-state')!;
    this.inspectorStateEl = document.getElementById('inspector-state')!;

    this.setupUIEvents();
  }

  private subscribeToEvents() {
    const bus = EventBus.getInstance();

    bus.on('gold:change', (gold: number) => this.onGoldChanged(gold));
    bus.on('hp:change', (data: { current: number; max: number }) => this.onHpChanged(data));
    bus.on('wave:change', (data: { current: number; max: number; isEndless: boolean }) => this.onWaveChanged(data));
    bus.on('tower:select', (tower: Tower2D | null) => this.onTowerSelected(tower));
    bus.on('tower:buildType', (type: TowerType) => this.onBuildTypeChanged(type));
    bus.on('spell:select', (spell: ActiveSpell) => this.onSpellSelected(spell));
    bus.on('status:change', () => this.updateEndGameModal());
    bus.on('pause:change', (isPaused: boolean) => this.onPauseChanged(isPaused));
    bus.on('challenge:change', (mode: ChallengeMode) => this.onChallengeChanged(mode));

    // Initial populate
    this.onGoldChanged(this.gameState.gold);
    this.onHpChanged({ current: this.gameState.baseHp, max: this.gameState.maxBaseHp });
    this.onWaveChanged({ current: this.waveManager.currentWaveIndex + 1, max: 10, isEndless: this.waveManager.isEndlessMode });
    this.onChallengeChanged(this.gameState.challengeMode);
  }

  private setupUIEvents() {
    document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
      this.gameState.togglePause();
    });

    // Settings Toggle & Close
    document.getElementById('settings-toggle-btn')?.addEventListener('click', () => {
      this.gameState.isPaused = true;
      EventBus.getInstance().emit('pause:change', true);
      this.syncSettingsControls();
      this.settingsOverlayEl.classList.remove('hidden');
    });
    document.getElementById('settings-close-btn')?.addEventListener('click', () => {
      this.settingsOverlayEl.classList.add('hidden');
      this.gameState.isPaused = false;
      EventBus.getInstance().emit('pause:change', false);
    });

    document.getElementById('settings-resume-btn')?.addEventListener('click', () => {
      this.settingsOverlayEl.classList.add('hidden');
      this.gameState.isPaused = false;
      EventBus.getInstance().emit('pause:change', false);
    });

    // Settings Sub-Modals
    document.getElementById('settings-talents-btn')?.addEventListener('click', () => {
      this.updateTalentsModal();
      this.talentsOverlayEl.classList.remove('hidden');
    });

    document.getElementById('close-talents-btn')?.addEventListener('click', () => {
      this.talentsOverlayEl.classList.add('hidden');
    });

    document.getElementById('settings-badges-btn')?.addEventListener('click', () => {
      this.openAchievementsModal();
    });

    document.getElementById('close-achievements-btn')?.addEventListener('click', () => {
      this.achievementsOverlayEl.classList.add('hidden');
    });

    document.getElementById('settings-changelog-btn')?.addEventListener('click', () => {
      this.changelogOverlayEl.classList.remove('hidden');
    });

    document.getElementById('close-changelog-btn')?.addEventListener('click', () => {
      this.changelogOverlayEl.classList.add('hidden');
    });

    document.getElementById('settings-restart-btn')?.addEventListener('click', () => {
      if (window.confirm('Reiniciar a partida atual? Todo o progresso da onda será perdido.')) {
        this.settingsOverlayEl.classList.add('hidden');
        this.onRestartCallback();
      }
    });

    // Audio & Settings Sliders
    const mapSelect = document.getElementById('settings-map-select') as HTMLSelectElement;
    if (mapSelect) {
      mapSelect.value = this.game['mapManager'].currentMapId;
      mapSelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value as MapId;
        this.game.changeMap(val);
      });
    }

    const challengeSelect = document.getElementById('settings-challenge-select') as HTMLSelectElement;
    if (challengeSelect) {
      challengeSelect.value = this.gameState.challengeMode;
      challengeSelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value as ChallengeMode;
        this.game.changeChallengeMode(val);
      });
    }

    const endlessToggle = document.getElementById('settings-endless-toggle') as HTMLInputElement;
    if (endlessToggle) {
      endlessToggle.checked = this.waveManager.isEndlessMode;
      endlessToggle.addEventListener('change', (e) => {
        this.waveManager.setEndlessMode((e.target as HTMLInputElement).checked);
      });
    }

    document.getElementById('settings-bgm-mute-btn')?.addEventListener('click', () => {
      this.audioManager.toggleBgmMute();
      this.syncSettingsControls();
    });

    document.getElementById('settings-sfx-mute-btn')?.addEventListener('click', () => {
      this.audioManager.toggleSfxMute();
      this.syncSettingsControls();
    });

    const bgmSlider = document.getElementById('settings-bgm-slider') as HTMLInputElement;
    if (bgmSlider) {
      bgmSlider.value = Math.round(this.audioManager.bgmVolume * 100).toString();
      bgmSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setBgmVolume(val);
      });
    }

    document.getElementById('changelog-btn')?.addEventListener('click', () => {
      this.changelogOverlayEl.classList.remove('hidden');
    });
    const sfxSlider = document.getElementById('settings-sfx-slider') as HTMLInputElement;
    if (sfxSlider) {
      sfxSlider.value = Math.round(this.audioManager.sfxVolume * 100).toString();
      sfxSlider.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setSfxVolume(val);
      });
    }

    // Tower Cards
    const towerCards = document.querySelectorAll<HTMLButtonElement>('.toolbar-card');
    towerCards.forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type') as TowerType;
        if (type) {
          this.setBuildType(type);
        }
      });
    });

    // Spells Chips
    document.getElementById('chip-meteor')?.addEventListener('click', () => {
      this.spellManager.selectSpell('METEOR');
    });

    document.getElementById('chip-freeze')?.addEventListener('click', () => {
      this.spellManager.triggerGlobalFreeze(this.game['enemyManager'].getEnemies());
    });


    document.getElementById('btn-speed-1x')?.addEventListener('click', () => this.setGameSpeed(1));
    document.getElementById('btn-speed-2x')?.addEventListener('click', () => this.setGameSpeed(2));
    document.getElementById('btn-speed-4x')?.addEventListener('click', () => this.setGameSpeed(4));

    document.getElementById('btn-auto-mode')?.addEventListener('click', () => {
      const isAuto = !this.waveManager.isAutoMode;
      this.waveManager.setAutoMode(isAuto);
      document.getElementById('btn-auto-mode')?.classList.toggle('active', isAuto);
    });

    document.getElementById('btn-next-wave')?.addEventListener('click', () => {
      this.waveManager.startNextWave();
    });

    // Inspector Actions
    document.getElementById('inspector-close-btn')?.addEventListener('click', () => {
      this.towerManager.selectedTower = null;
      EventBus.getInstance().emit('tower:select', null);
    });

    document.getElementById('btn-inspect-target')?.addEventListener('click', () => {
      this.towerManager.cycleSelectedTowerTargeting();
    });

    document.getElementById('btn-inspect-repair')?.addEventListener('click', () => {
      this.towerManager.repairSelectedTower();
    });

    document.getElementById('btn-inspect-upgrade')?.addEventListener('click', () => {
      this.towerManager.upgradeSelectedTower();
    });

    document.getElementById('btn-inspect-sell')?.addEventListener('click', () => {
      this.towerManager.sellSelectedTower();
    });

    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.overlayEl.classList.add('hidden');
      this.onRestartCallback();
    });

    // Skill Tree Upgrade Buttons
    document.getElementById('talent-dmg-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('damageLvl')) {
        this.updateTalentsModal();
      }
    });

    document.getElementById('talent-gold-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('goldLvl')) {
        this.updateTalentsModal();
      }
    });

    document.getElementById('talent-hp-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('hpLvl')) {
        this.updateTalentsModal();
      }
    });

    document.getElementById('talent-cd-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('cdLvl')) {
        this.updateTalentsModal();
      }
    });

    document.getElementById('talent-repair-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('repairLvl')) {
        this.updateTalentsModal();
      }
    });

    document.getElementById('talent-crit-btn')?.addEventListener('click', () => {
      if (this.talentManager.upgradeTalent('critLvl')) {
        this.updateTalentsModal();
      }
    });
  }

  // --- REACTION HANDLERS ---

  private onGoldChanged(gold: number) {
    if (this.currentGold === gold) return;
    this.currentGold = gold;
    const goldVal = document.getElementById('hud-gold-val');
    if (goldVal) goldVal.innerText = `${gold}`;
    this.updateTowerAffordability();
  }

  private onHpChanged(data: { current: number; max: number }) {
    if (this.currentHp === data.current) return;
    this.currentHp = data.current;
    const hpVal = document.getElementById('hud-hp-val');
    if (hpVal) hpVal.innerText = `${data.current}/${data.max}`;
  }

  private onWaveChanged(data: { current: number; max: number; isEndless: boolean }) {
    if (this.currentWave === data.current) return;
    this.currentWave = data.current;
    const waveVal = document.getElementById('hud-wave-val');
    if (waveVal) {
      waveVal.innerText = data.isEndless ? `${data.current}/♾️` : `${data.current}/${data.max}`;
    }
  }

  private onTowerSelected(tower: Tower2D | null) {
    if (tower) {
      this.renderInspector(tower);
      this.switchContextState('INSPECTOR');
    } else {
      this.switchContextState('STORE');
    }
  }

  private onBuildTypeChanged(type: TowerType) {
    const cards = document.querySelectorAll<HTMLButtonElement>('.toolbar-card');
    cards.forEach((card) => {
      const cardType = card.getAttribute('data-type');
      card.classList.toggle('active', cardType === type);
    });
  }

  private onSpellSelected(spell: ActiveSpell) {
    const meteorChip = document.getElementById('chip-meteor');
    const freezeChip = document.getElementById('chip-freeze');
    if (meteorChip) meteorChip.classList.toggle('active', spell === 'METEOR');
    if (freezeChip) freezeChip.classList.toggle('active', spell === 'FREEZE');
  }

  private onPauseChanged(isPaused: boolean) {
    const settingsBtn = document.getElementById('settings-toggle-btn');
    if (settingsBtn) {
      settingsBtn.classList.toggle('active', isPaused);
    }
    const hudPauseBtn = document.getElementById('hud-pause-btn');
    if (hudPauseBtn) {
      hudPauseBtn.innerText = isPaused ? '▶️' : '⏸️';
      hudPauseBtn.classList.toggle('active', isPaused);
    }
  }

  private onChallengeChanged(mode: ChallengeMode) {
    const badgeName = document.getElementById('active-mode-name');
    const badgeEl = document.getElementById('active-mode-badge');
    const modeLabels: Record<ChallengeMode, string> = {
      NORMAL: 'Modo Padrão',
      NO_SPELLS: 'Modo Sem Magias 🚫',
      FAST_ENEMIES: 'Invasão Veloz ⚡',
      HARDCORE: 'Hardcore (1 HP) 💀',
      TURBO_GOLD: 'Corrida do Ouro 🪙',
      MORTE_CERTA: '☠️ Morte Certa (Insano!)',
    };
    if (badgeName) badgeName.innerText = modeLabels[mode] || 'Modo Padrão';
    if (badgeEl) {
      badgeEl.classList.toggle('morte-certa', mode === 'MORTE_CERTA');
    }
    this.updateTowerAffordability();
  }

  private switchContextState(state: 'STORE' | 'INSPECTOR') {
    if (state === 'INSPECTOR') {
      this.storeStateEl.classList.remove('active');
      this.storeStateEl.classList.add('hidden');
      this.inspectorStateEl.classList.remove('hidden');
      this.inspectorStateEl.classList.add('active');
    } else {
      this.inspectorStateEl.classList.remove('active');
      this.inspectorStateEl.classList.add('hidden');
      this.storeStateEl.classList.remove('hidden');
      this.storeStateEl.classList.add('active');
    }
  }

  private setBuildType(type: TowerType) {
    this.towerManager.setSelectedBuildType(type);
  }

  private setGameSpeed(speed: number) {
    this.game.gameSpeedMultiplier = speed;
    document.getElementById('btn-speed-1x')?.classList.toggle('active', speed === 1);
    document.getElementById('btn-speed-2x')?.classList.toggle('active', speed === 2);
    document.getElementById('btn-speed-4x')?.classList.toggle('active', speed === 4);
  }

  private updateTowerAffordability() {
    const cards = document.querySelectorAll<HTMLButtonElement>('.toolbar-card');
    cards.forEach((card) => {
      const type = card.getAttribute('data-type') as TowerType;
      if (type) {
        const cost = this.towerManager.getTowerCost(type);
        const canAfford = this.gameState.gold >= cost;
        card.disabled = !canAfford;
        card.classList.toggle('disabled', !canAfford);
      }
    });

    const isNoSpells = this.gameState.challengeMode === 'NO_SPELLS' || this.gameState.challengeMode === 'MORTE_CERTA';

    const meteorChip = document.getElementById('chip-meteor') as HTMLButtonElement;
    const meteorCostEl = document.getElementById('meteor-chip-cost');
    if (meteorChip) {
      const canAfford = this.gameState.gold >= this.spellManager.meteorCost && !isNoSpells && this.spellManager.meteorCooldownMs <= 0;
      meteorChip.disabled = !canAfford;
      meteorChip.classList.toggle('mode-blocked', isNoSpells);
      if (isNoSpells) {
        meteorChip.title = 'Poderes bloqueados neste modo de jogo!';
        if (meteorCostEl) meteorCostEl.innerText = '🚫 Desativado';
      } else if (meteorCostEl) {
        meteorCostEl.innerText = `${this.spellManager.meteorCost}g`;
      }
    }

    const freezeChip = document.getElementById('chip-freeze') as HTMLButtonElement;
    const freezeCostEl = document.getElementById('freeze-chip-cost');
    if (freezeChip) {
      const canAfford = this.gameState.gold >= this.spellManager.freezeCost && !isNoSpells && this.spellManager.freezeCooldownMs <= 0;
      freezeChip.disabled = !canAfford;
      freezeChip.classList.toggle('mode-blocked', isNoSpells);
      if (isNoSpells) {
        freezeChip.title = 'Poderes bloqueados neste modo de jogo!';
        if (freezeCostEl) freezeCostEl.innerText = '🚫 Desativado';
      } else if (freezeCostEl) {
        freezeCostEl.innerText = `${this.spellManager.freezeCost}g`;
      }
    }
  }

  private renderInspector(tower: Tower2D) {
    const title = document.getElementById('inspector-title');
    if (title) title.innerText = `${tower.data.type} (Nível ${tower.data.level})`;

    const statsBox = document.getElementById('inspector-stats-summary');
    if (statsBox) {
      statsBox.innerHTML = `
        <span>❤️ ${tower.data.hp}/${tower.data.maxHp}</span>
        <span>⚔️ ${tower.data.damage}</span>
        <span>📏 ${tower.data.range}px</span>
        <span>⚡ ${(1000 / tower.data.fireRate).toFixed(1)}/s</span>
      `;
    }

    const targetBtn = document.getElementById('btn-inspect-target');
    if (targetBtn) targetBtn.innerText = `🎯 ${tower.data.targeting}`;

    const repairBtn = document.getElementById('btn-inspect-repair') as HTMLButtonElement;
    if (repairBtn) {
      if (tower.data.hp >= tower.data.maxHp && !tower.data.isDestroyed) {
        repairBtn.innerText = '🔧 100% OK';
        repairBtn.disabled = true;
      } else {
        const repairCost = tower.getRepairCost();
        repairBtn.innerText = `🔧 Reparo (${repairCost}g)`;
        repairBtn.disabled = this.gameState.gold < repairCost;
      }
    }

    const upgradeBtn = document.getElementById('btn-inspect-upgrade') as HTMLButtonElement;
    if (upgradeBtn) {
      if (tower.data.level >= 3) {
        upgradeBtn.innerText = '⭐ Máximo';
        upgradeBtn.disabled = true;
      } else {
        const cost = tower.getUpgradeCost();
        upgradeBtn.innerText = `⬆️ ${cost}g`;
        upgradeBtn.disabled = this.gameState.gold < cost;
      }
    }

    const sellBtn = document.getElementById('btn-inspect-sell');
    if (sellBtn) {
      sellBtn.innerText = `💰 ${tower.getSellValue()}g`;
    }
  }

  private syncSettingsControls() {
    const bgmMuteBtn = document.getElementById('settings-bgm-mute-btn');
    if (bgmMuteBtn) bgmMuteBtn.innerText = this.audioManager.isBgmMuted ? '🔇' : '🎵';

    const sfxMuteBtn = document.getElementById('settings-sfx-mute-btn');
    if (sfxMuteBtn) sfxMuteBtn.innerText = this.audioManager.isSfxMuted ? '🔇' : '🔊';

    const mapSelect = document.getElementById('settings-map-select') as HTMLSelectElement;
    if (mapSelect) mapSelect.value = this.game['mapManager'].currentMapId;

    const challengeSelect = document.getElementById('settings-challenge-select') as HTMLSelectElement;
    if (challengeSelect) challengeSelect.value = this.gameState.challengeMode;
  }

  private updateTalentsModal() {
    const starsVal = document.getElementById('modal-stars-val');
    if (starsVal) starsVal.innerText = `${this.talentManager.stars}★`;

    const updateItem = (type: keyof TalentData, idPrefix: string) => {
      const maxLvl = this.talentManager.getTalentMaxLvl(type);
      const currentLvl = this.talentManager.talents[type];

      const lvlEl = document.getElementById(`${idPrefix}-lvl`);
      if (lvlEl) lvlEl.innerText = `${currentLvl}/${maxLvl}`;

      const btnEl = document.getElementById(`talent-${idPrefix}-btn`) as HTMLButtonElement;
      if (btnEl) {
        if (currentLvl >= maxLvl) {
          btnEl.innerText = 'MAX';
          btnEl.disabled = true;
        } else {
          const cost = this.talentManager.getTalentCost(type);
          btnEl.innerText = `Upgrade (${cost}★)`;
          btnEl.disabled = this.talentManager.stars < cost;
        }
      }
    };

    updateItem('damageLvl', 'dmg');
    updateItem('goldLvl', 'gold');
    updateItem('hpLvl', 'hp');
    updateItem('cdLvl', 'cd');
    updateItem('repairLvl', 'repair');
    updateItem('critLvl', 'crit');
  }

  private openAchievementsModal() {
    const grid = document.getElementById('achievements-grid');
    const summary = document.getElementById('achievements-summary');
    if (!grid || !summary) return;

    const achievements = Object.values(this.achievementManager.achievements);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    summary.innerText = `Desbloqueadas ${unlockedCount}/${achievements.length} Badges`;

    grid.innerHTML = achievements
      .map(
        (ach) => `
      <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-title">${ach.title}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-progress">${ach.unlocked ? '✅ Desbloqueado' : `${ach.progress}/${ach.maxProgress}`}</div>
        </div>
      </div>
    `
      )
      .join('');

    this.achievementsOverlayEl.classList.remove('hidden');
  }

  private updateEndGameModal() {
    if (this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') {
      this.overlayEl.classList.remove('hidden');
      const title = document.getElementById('modal-title');
      const desc = document.getElementById('modal-desc');

      if (this.gameState.status === 'GAME_OVER') {
        if (title) title.innerText = '💀 Game Over';
        const survivedWave = Math.max(1, this.waveManager.currentWaveIndex + 1);
        if (desc) desc.innerText = `Inimigos invadiram a base na Onda ${survivedWave}!`;
      } else {
        if (title) title.innerText = '🏆 Vitória!';
        if (desc) desc.innerText = 'Você defendeu a base em todas as 10 Ondas!';
      }

      const recordBadge = document.getElementById('record-badge');
      if (recordBadge) recordBadge.classList.toggle('hidden', !this.analyticsManager.isNewRecord);

      const modalHs = document.getElementById('modal-highscore');
      if (modalHs) modalHs.innerText = `Wave ${this.analyticsManager.highScoreWave}`;

      const mvp = this.analyticsManager.getMvpTower();
      const modalMvp = document.getElementById('modal-mvp');
      if (modalMvp) modalMvp.innerText = `${mvp.type} Tower (${mvp.damage} Dmg)`;

      const modalKills = document.getElementById('modal-kills');
      if (modalKills) modalKills.innerText = `${this.analyticsManager.getTotalKills()} inimigos`;

      const modalGold = document.getElementById('modal-gold');
      if (modalGold) modalGold.innerText = `${this.analyticsManager.goldEarned}g / ${this.analyticsManager.goldSpent}g`;

      const modalChallenge = document.getElementById('modal-challenge');
      if (modalChallenge) {
        const modeLabels: Record<ChallengeMode, string> = {
          NORMAL: 'Padrão',
          NO_SPELLS: 'Sem Magias 🚫',
          FAST_ENEMIES: 'Invasão Veloz ⚡',
          HARDCORE: 'Hardcore (1 HP) 💀',
          TURBO_GOLD: 'Corrida do Ouro 🪙',
          MORTE_CERTA: '☠️ Morte Certa (Insano!)',
        };
        modalChallenge.innerText = modeLabels[this.gameState.challengeMode] || 'Padrão';
      }
    }
  }

  public update() {
    if (!this.waveBtnEl) {
      this.waveBtnEl = document.getElementById('btn-next-wave') as HTMLButtonElement;
      this.waveBtnLabelEl = document.getElementById('start-wave-label');
    }

    if (this.waveBtnEl && this.waveBtnLabelEl) {
      const nextWaveNum = this.waveManager.currentWaveIndex + 2;
      const isNextBoss = nextWaveNum === 5 || nextWaveNum === 8 || nextWaveNum === 10 || (nextWaveNum > 10 && nextWaveNum % 3 === 0);

      let disabled = false;
      let labelText = '';
      let className = '';

      if (this.waveManager.isWaveActive) {
        disabled = true;
        const activeWaveNum = this.waveManager.currentWaveIndex + 1;
        const isCurrentBoss = activeWaveNum === 5 || activeWaveNum === 8 || activeWaveNum === 10 || (activeWaveNum > 10 && activeWaveNum % 3 === 0);
        labelText = isCurrentBoss ? '⚠️ BOSS EM ANDAMENTO' : 'Onda em Andamento...';
        className = isCurrentBoss ? 'start-wave-main-btn danger' : 'start-wave-main-btn active';
      } else if (this.waveManager.isAutoMode) {
        disabled = true;
        const countdownSec = this.waveManager.getAutoCountdownSeconds();
        labelText = isNextBoss ? `⚠️ BOSS EM ${countdownSec}s` : `Auto em ${countdownSec}s...`;
        className = isNextBoss ? 'start-wave-main-btn danger' : 'start-wave-main-btn primary';
      } else {
        disabled = false;
        labelText = isNextBoss ? `⚠️ Iniciar BOSS Onda ${nextWaveNum}` : `Iniciar Onda ${nextWaveNum}`;
        className = isNextBoss ? 'start-wave-main-btn danger' : 'start-wave-main-btn primary';
      }

      if (this.lastWaveDisabled !== disabled) {
        this.waveBtnEl.disabled = disabled;
        this.lastWaveDisabled = disabled;
      }
      if (this.lastWaveLabelText !== labelText) {
        this.waveBtnLabelEl.innerText = labelText;
        this.lastWaveLabelText = labelText;
      }
      if (this.lastWaveClassName !== className) {
        this.waveBtnEl.className = className;
        this.lastWaveClassName = className;
      }
    }

    // 2. Boss warning badge
    if (!this.bossBadgeEl) {
      this.bossBadgeEl = document.getElementById('hud-boss-badge');
    }
    if (this.bossBadgeEl) {
      const activeWaveNum = this.waveManager.currentWaveIndex + 1;
      const isCurrentBoss = activeWaveNum === 5 || activeWaveNum === 8 || activeWaveNum === 10 || (activeWaveNum > 10 && activeWaveNum % 3 === 0);
      const isHidden = !(this.waveManager.isWaveActive && isCurrentBoss);
      if (this.lastBossBadgeHidden !== isHidden) {
        this.bossBadgeEl.classList.toggle('hidden', isHidden);
        this.lastBossBadgeHidden = isHidden;
      }
    }

    // 3. Spells Cooldown text
    if (!this.meteorCdEl) {
      this.meteorCdEl = document.getElementById('meteor-chip-cd');
    }
    if (this.meteorCdEl) {
      if (this.spellManager.meteorCooldownMs > 0) {
        const sec = Math.ceil(this.spellManager.meteorCooldownMs / 1000);
        const text = `${sec}s`;
        if (this.lastMeteorCdText !== text) {
          this.meteorCdEl.innerText = text;
          this.lastMeteorCdText = text;
        }
        if (this.lastMeteorCdHidden !== false) {
          this.meteorCdEl.classList.remove('hidden');
          this.lastMeteorCdHidden = false;
        }
      } else {
        if (this.lastMeteorCdHidden !== true) {
          this.meteorCdEl.classList.add('hidden');
          this.lastMeteorCdHidden = true;
        }
      }
    }

    if (!this.freezeCdEl) {
      this.freezeCdEl = document.getElementById('freeze-chip-cd');
    }
    if (this.freezeCdEl) {
      if (this.spellManager.freezeCooldownMs > 0) {
        const sec = Math.ceil(this.spellManager.freezeCooldownMs / 1000);
        const text = `${sec}s`;
        if (this.lastFreezeCdText !== text) {
          this.freezeCdEl.innerText = text;
          this.lastFreezeCdText = text;
        }
        if (this.lastFreezeCdHidden !== false) {
          this.freezeCdEl.classList.remove('hidden');
          this.lastFreezeCdHidden = false;
        }
      } else {
        if (this.lastFreezeCdHidden !== true) {
          this.freezeCdEl.classList.add('hidden');
          this.lastFreezeCdHidden = true;
        }
      }
    }
    // Safety check for End Game modal display
    if (this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') {
      this.updateEndGameModal();
    }
  }
}
