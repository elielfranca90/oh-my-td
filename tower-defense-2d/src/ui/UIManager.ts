import { AchievementManager } from '../engine/AchievementManager';
import { AnalyticsManager } from '../engine/AnalyticsManager';
import { AudioManager } from '../engine/AudioManager';
import { EventBus } from '../engine/EventBus';
import type { DatabaseManager } from '../engine/DatabaseManager';
import { GameState } from '../engine/GameState';
import { isHapticsEnabled, setHapticsEnabled } from '../helpers/haptics';
import type { MapId } from '../engine/MapManager';
import { SpellManager, type ActiveSpell } from '../engine/SpellManager';
import { getAllRogueliteModules, getRogueliteModule, getSpecializationOption, getSpecializations } from '../engine/Specializations';
import { TalentManager } from '../engine/TalentManager';
import type { Tower2D } from '../engine/Tower';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager, type EndlessArchetype, type WavePreview } from '../engine/WaveManager';
import type { ChallengeMode, EnemyType, RogueliteModuleId, TalentData, TowerSpecialization, TowerType } from '../types';

export interface IGame2D {
  currentMapId: MapId;
  gameSpeedMultiplier: number;
  databaseManager: DatabaseManager | null;
  changeMap(mapId: MapId): void;
  changeChallengeMode(mode: ChallengeMode): void;
  setEndlessMode(enabled: boolean): void;
  [key: string]: any;
}

export class UIManager {
  private gameState: GameState;
  private waveManager: WaveManager;
  private towerManager: TowerManager2D;
  private spellManager: SpellManager;
  private audioManager: AudioManager;
  private talentManager: TalentManager;
  public achievementManager: AchievementManager;
  private analyticsManager: AnalyticsManager;
  private game: IGame2D;
  private onRestartCallback: () => void;
  public playerModules: RogueliteModuleId[] = [];

  private currentGold = -1;
  private currentHp = -1;
  private currentWave = -1;
  // DOM Overlay Elements
  private overlayEl!: HTMLElement;
  private settingsOverlayEl!: HTMLElement;
  private mechanicsOverlayEl!: HTMLElement;
  private talentsOverlayEl!: HTMLElement;
  private achievementsOverlayEl!: HTMLElement;
  private changelogOverlayEl!: HTMLElement;
  private leaderboardOverlayEl!: HTMLElement;
  private profileOverlayEl!: HTMLElement;
  private storeStateEl!: HTMLElement;
  private inspectorStateEl!: HTMLElement;
  // Cached DOM Elements for 60fps Loop Optimization
  private waveBtnEl: HTMLButtonElement | null = null;
  private waveBtnLabelEl: HTMLElement | null = null;
  private bossBadgeEl: HTMLElement | null = null;
  private wavePreviewEl: HTMLElement | null = null;
  private meteorCdEl: HTMLElement | null = null;
  private freezeCdEl: HTMLElement | null = null;

  private lastWaveDisabled: boolean | null = null;
  private lastWaveLabelText = '';
  private lastWaveClassName = '';
  private lastWavePreviewKey = '';
  private lastBossBadgeHidden: boolean | null = null;
  private lastMeteorCdText = '';
  private lastMeteorCdHidden: boolean | null = null;
  private lastFreezeCdText = '';
  private lastFreezeCdHidden: boolean | null = null;
  private unbindEvents: Array<() => void> = [];
  private activeParentModal: HTMLElement | null = null;
  private waveIndNumEl: HTMLElement | null = null;
  private waveIndEnemiesEl: HTMLElement | null = null;
  private lastWaveIndEnemies = '';
  private waveIndEl: HTMLElement | null = null;
  private waveIndLabelEl: HTMLElement | null = null;
  private lastWaveIndHidden: boolean | null = null;

  // --- Confirmação de venda (D4) ---
  /** Id da torre "armada" para venda; um 2º clique/tecla dentro da janela confirma. */
  private sellConfirmTowerId: string | null = null;
  private sellConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly SELL_CONFIRM_WINDOW_MS = 3000;


  constructor(
    gameState: GameState,
    waveManager: WaveManager,
    towerManager: TowerManager2D,
    spellManager: SpellManager,
    audioManager: AudioManager,
    talentManager: TalentManager,
    achievementManager: AchievementManager,
    analyticsManager: AnalyticsManager,
    game: IGame2D,
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
    this.setupUIEvents();
  }

  private createUI() {
    const part1 = document.getElementById('layout-part-1');
    const part2 = document.getElementById('layout-part-2');
    const part4 = document.getElementById('layout-part-4');
    const modals = document.getElementById('ui-container') || document.body;

    const part1Html = `
      <div id="game-title-bar" class="game-title-bar">
        <h1 class="game-title">OH MY TD <span class="game-version">v0.4.0</span></h1>
      </div>

      <header id="hud-top" class="hud-top pointer-events-auto">
        <button id="main-home-btn" class="hud-btn highlight-btn" title="Voltar ao Menu Inicial (🏠)" aria-label="Menu Inicial">
          🏠<span class="hud-btn-text"> Início</span>
        </button>
        <button id="main-leaderboard-btn" class="hud-btn highlight-btn" title="Placar Global (🏆)" aria-label="Placar Global">
          🏆<span class="hud-btn-text"> Placar Global</span>
        </button>
        <button id="main-profile-btn" class="hud-btn highlight-btn" title="Perfil de Jogador (👤)" aria-label="Perfil">
          👤<span class="hud-btn-text"> Perfil</span>
        </button>
        <button id="changelog-btn" class="hud-btn changelog-gift-btn" title="Últimas Atualizações (🎁)" aria-label="Novidades">
          🎁<span class="changelog-btn-text"> Novidades</span>
        </button>
        <button id="map-mechanics-btn" class="hud-btn mechanics-btn" title="Guia de Mecânicas & Perigos (❓)" aria-label="Mecânicas">
          ❓
        </button>
        <button id="settings-toggle-btn" class="hud-btn settings-btn" title="Configurações & Menus (⚙️)">
          ⚙️
        </button>
      </header>
    `;

    const part2Html = `
      <div id="hud-stats-bar" class="hud-stats-bar pointer-events-auto">
        <div id="hud-challenge-badge" class="hud-stat-badge challenge ${this.gameState.isCampaignMode ? 'hidden' : ''}" title="Selecionar Modo Desafio">
          <span class="icon">⚔️</span>
          <select id="hud-challenge-select" class="hud-challenge-select challenge-select">
            <option value="NORMAL">Padrão</option>
            <option value="HARDCORE">Hardcore 💀</option>
            <option value="MORTE_CERTA">Morte Certa ☠️</option>
          </select>
        </div>
        <div id="hud-map-badge" class="hud-stat-badge map ${this.gameState.isCampaignMode ? 'hidden' : ''}" title="Selecionar Mapa">
          <span class="icon">🗺️</span>
          <select id="hud-map-select" class="hud-map-select map-select">
            <option value="MAP_1">Green Valley</option>
            <option value="MAP_2">Death Pass</option>
            <option value="MAP_3">Cidadela</option>
            <option value="MAP_4">Grave Pass</option>
          </select>
        </div>
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
          <span class="wave-title hud-label-text">ONDA</span>
          <strong id="hud-wave-val">0/10</strong>
          <span id="hud-boss-badge" class="boss-badge hidden">⚠️ BOSS</span>
        </div>
        <button id="hud-endless-btn" class="hud-btn endless-btn" title="Alternar Modo Infinito">
          ♾️
        </button>
        <button id="hud-ranges-btn" class="hud-btn ranges-btn" title="Mostrar alcance de todas as torres (R)" aria-label="Alternar alcance de todas as torres">
          🎯
        </button>
        <button id="hud-pause-btn" class="hud-btn pause-btn" title="Pausar / Retomar Jogo">
          ⏸️
        </button>
      </div>

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

          <!-- Escolha de especialização (nível 2 -> 3) -->
          <div id="inspector-spec-choice" class="spec-choice hidden"></div>
        </div>
      </nav>
    `;

    const part4Html = `
      <!-- 3. FLOATING TIME & WAVE CONTROLS (Bottom Right) -->
      <div id="time-controls" class="time-controls pointer-events-auto">
        <div id="active-mode-badge" class="active-mode-badge" title="Modo de Jogo Ativo">
          <span id="active-mode-name" class="mode-name">Modo Padrão</span>
        </div>

        <div class="speed-buttons">
          <button id="btn-speed-1x" class="hud-btn speed-btn active">1x</button>
          <button id="btn-speed-2x" class="hud-btn speed-btn">2x</button>
          <button id="btn-speed-4x" class="hud-btn speed-btn">4x</button>
          <button id="btn-auto-mode" class="hud-btn auto-toggle-btn" title="Avanço Automático">Auto</button>
          <button id="btn-next-wave" class="start-wave-main-btn">
            <span id="start-wave-label">Iniciar Onda 1</span>
          </button>
        </div>
      </div>
    `;

    if (part1) part1.innerHTML = part1Html;
    if (part2) part2.innerHTML = part2Html;
    if (part4) part4.innerHTML = part4Html;

    const fallbackHtml = (part1 ? '' : part1Html) + (part2 ? '' : part2Html) + (part4 ? '' : part4Html);

    if (modals) {
      modals.innerHTML = fallbackHtml + `
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

              <!-- Game Options -->
              <div class="settings-section">
                <h3>🎮 Modo Infinito</h3>
                <div class="setting-item">
                  <span>Modo Infinito:</span>
                  <label class="switch">
                    <input type="checkbox" id="settings-endless-toggle" />
                    <span class="slider round"></span>
                  </label>
                </div>
              </div>

              <!-- Haptic Feedback (E4) -->
              <div class="settings-section">
                <h3>📳 Retorno Tátil</h3>
                <div class="setting-item">
                  <span>Vibração (construir, upgrade, dano, chefe):</span>
                  <label class="switch">
                    <input type="checkbox" id="settings-haptics-toggle" />
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
                  <button id="settings-profile-btn" class="btn secondary">👤 Perfil</button>
                  <button id="settings-leaderboard-btn" class="btn secondary">🏆 Placar Global</button>
                  <button id="settings-restart-btn" class="btn danger" style="grid-column: span 2;">🔄 Novo Jogo</button>
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
            <p id="achievements-summary">Unlocked 0/${this.achievementManager.totalCount} Badges</p>
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
                  <strong class="version-tag">v0.4.0</strong>
                  <span class="changelog-title">Oh My TD — Nova Interface</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Rebrand:</strong> O jogo agora se chama "Oh My TD" com título e versão exibidos no topo da tela.</li>
                  <li><strong>Novo Layout:</strong> Botões informativos no canto superior direito, dados de jogo em barra dedicada, e indicador de onda/inimigos na barra inferior.</li>
                </ul>
              </div>
              <div class="changelog-item">
                <div class="changelog-item-header">
                  <span class="badge-tag new">NOVO</span>
                  <strong class="version-tag">v2.3</strong>
                  <span class="changelog-title">Especializações de Torres & Efeito Glacial</span>
                </div>
                <ul class="changelog-bullets">
                  <li><strong>Especialização Nível 3:</strong> Escolha entre 2 rotas exclusivas de upgrade para cada classe de torre no nível 3.</li>
                  <li><strong>Pulso Glacial Visual:</strong> Onda de choque visível na Torre de Gelo indicando desaceleração de área.</li>
                  <li><strong>Preview de Ondas:</strong> Visualização da composição da próxima horda diretamente na HUD.</li>
                  <li><strong>Modo Infinito Inteligente:</strong> Hordas estruturadas por arquétipos e salvamento automático da preferência do jogador.</li>
                  <li><strong>Dicas de Terreno:</strong> Toque longo ou hover em tiles especiais (como o Broto) para visualizar bônus de terreno.</li>
                  <li><strong>Novos Inimigos:</strong> Inimigo com Escudo e Espectro ativados com suporte a conquistas.</li>
                </ul>
              </div>
              <div class="changelog-item">
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

        <!-- LEADERBOARD MODAL -->
        <div id="leaderboard-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card leaderboard-modal-card">
            <div class="modal-header">
              <h1>🏆 Placar Global Top 20</h1>
              <button id="close-leaderboard-btn" class="close-icon-btn">✖</button>
            </div>
            <div id="leaderboard-content">
              <p>Carregando placar...</p>
            </div>
            <button id="close-leaderboard-bottom-btn" class="btn primary modal-restart-btn" style="margin-top: 12px;">Fechar</button>
          </div>
        </div>

        <!-- PROFILE MODAL -->
        <div id="profile-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card profile-modal-card">
            <div class="modal-header">
              <h1>👤 Perfil do Jogador</h1>
              <button id="close-profile-btn" class="close-icon-btn">✖</button>
            </div>
            <div class="profile-content">
              <div class="setting-item">
                <span>Nome de Jogador:</span>
                <input type="text" id="profile-username-input" class="profile-input" placeholder="Digite seu nome..." maxlength="20" />
              </div>
              <div class="setting-item">
                <span>Avatar:</span>
                <select id="profile-avatar-select" class="profile-select">
                  <option value="default_avatar">🛡️ Guerreiro</option>
                  <option value="solar_prism">☀️ Mago Solar</option>
                  <option value="mega_boss">👹 Mega Boss</option>
                  <option value="frost_wizard">❄️ Mago de Gelo</option>
                </select>
              </div>
              <div id="profile-status-msg" class="profile-status-msg"></div>
              <button id="profile-save-btn" class="btn success" style="width: 100%; padding: 10px; font-weight: bold;">Salvar Alterações</button>
            </div>
            <button id="close-profile-bottom-btn" class="btn secondary modal-restart-btn">Fechar</button>
          </div>
        </div>

        <!-- MAP MECHANICS INFO MODAL (❓) -->
        <div id="mechanics-modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card mechanics-modal-card" style="max-width: 520px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
              <h1>🗺️ Guia de Mecânicas & Perigos</h1>
              <button id="close-mechanics-btn" class="close-icon-btn">✖</button>
            </div>
            <div class="mechanics-content" style="display: flex; flex-direction: column; gap: 12px; font-size: 14px; text-align: left; color: #eceff1; margin-top: 12px;">
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #4caf50;">
                <h3 style="margin: 0 0 4px 0; color: #81c784;">🌿 Green Valley</h3>
                <p style="margin: 0; color: #b0bec5;">Torres erguidas sobre brotos selvagens (Overgrowth Sprout) ganham +25% de alcance e 50% de redução no tempo de recarga.</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #ff5722;">
                <h3 style="margin: 0 0 4px 0; color: #ff7043;">🌋 Death Pass</h3>
                <p style="margin: 0; color: #b0bec5;">Gêiseres de lava entram em erupção periodicamente no mapa, superaquecendo torres próximas e reduzindo temporariamente sua eficiência.</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #00e5ff;">
                <h3 style="margin: 0 0 4px 0; color: #4dd0e1;">⚡ Cidadela (Power Surge)</h3>
                <p style="margin: 0; color: #b0bec5;">Linhas energizadas alimentam o terreno. Torres posicionadas nesses nós ganham +20% de velocidade de ataque.</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #00e676;">
                <h3 style="margin: 0 0 4px 0; color: #69f0ae;">💀 Grave Pass (Altar Obscuro)</h3>
                <p style="margin: 0; color: #b0bec5;">Alcança o poder com Altares Obscuros no solo (+25% de dano necrótico) e Erupções Espirituais que aplicam 30% de desaceleração nos inimigos.</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #ffeb3b;">
                <h3 style="margin: 0 0 4px 0; color: #ffd54f;">🃏 Módulos Roguelite</h3>
                <p style="margin: 0; color: #b0bec5;">Recompensas oferecidas ao completar as ondas 5, 10 e 15. Podem ser equipados em torres para conceder habilidades passivas poderosas (Ex: Toque de Midas, Dreno Vampírico, Núcleo Perfurante e Caçador de Recompensas).</p>
              </div>
            </div>
            <button id="close-mechanics-bottom-btn" class="btn primary modal-restart-btn" style="margin-top: 14px;">Entendido!</button>
          </div>
        </div>

        <!-- END GAME ANALYTICS MODAL -->
        <div id="modal-overlay" class="modal-overlay hidden pointer-events-auto">
          <div class="modal-card analytics-modal" style="position: relative;">
            <button id="endgame-close-btn" class="close-icon-btn" title="Encerrar" style="position: absolute; top: 16px; right: 16px;">✖</button>
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
            <div class="endgame-btns-row" style="display: flex; gap: 8px; margin-top: 12px;">
              <button id="endgame-leaderboard-btn" class="btn secondary" style="flex: 1;">🏆 Placar Global</button>
              <button id="restart-btn" class="btn primary" style="flex: 1;">Jogar Novamente</button>
            </div>
          </div>
        </div>
      `;
    }

    this.overlayEl = document.getElementById('modal-overlay')!;
    this.settingsOverlayEl = document.getElementById('settings-modal-overlay')!;
    this.mechanicsOverlayEl = document.getElementById('mechanics-modal-overlay')!;
    this.talentsOverlayEl = document.getElementById('talents-modal-overlay')!;
    this.achievementsOverlayEl = document.getElementById('achievements-modal-overlay')!;
    this.changelogOverlayEl = document.getElementById('changelog-modal-overlay')!;
    this.leaderboardOverlayEl = document.getElementById('leaderboard-modal-overlay')!;
    this.profileOverlayEl = document.getElementById('profile-modal-overlay')!;

    this.storeStateEl = document.getElementById('store-state')!;
    this.inspectorStateEl = document.getElementById('inspector-state')!;
  }

  private subscribeToEvents() {
    this.cleanupEvents();
    const bus = EventBus.getInstance();

    this.unbindEvents = [
      bus.on('gold:change', (gold: number) => this.onGoldChanged(gold)),
      bus.on('hp:change', (data: { current: number; max: number }) => this.onHpChanged(data)),
      bus.on('wave:change', (data: { current: number; max: number; isEndless: boolean }) => this.onWaveChanged(data)),
      bus.on('wave:endlessMode', (isEndless: boolean) => this.syncEndlessButton(isEndless)),
      bus.on('tower:select', (tower: Tower2D | null) => this.onTowerSelected(tower)),
      bus.on('tower:buildType', (type: TowerType) => this.onBuildTypeChanged(type)),
      bus.on('spell:select', (spell: ActiveSpell) => this.onSpellSelected(spell)),
      bus.on('status:change', () => this.updateEndGameModal()),
      bus.on('pause:change', (isPaused: boolean) => this.onPauseChanged(isPaused)),
      bus.on('challenge:change', (mode: ChallengeMode) => this.onChallengeChanged(mode)),
      bus.on('ranges:toggle', (isShowingAll: boolean) => this.onRangesToggled(isShowingAll)),
    ];

    // Initial populate
    this.onGoldChanged(this.gameState.gold);
    this.onHpChanged({ current: this.gameState.baseHp, max: this.gameState.maxBaseHp });
    this.onWaveChanged({ current: this.waveManager.currentWaveIndex + 1, max: 10, isEndless: this.waveManager.isEndlessMode });
    this.onChallengeChanged(this.gameState.challengeMode);
  }

  public destroy() {
    this.cleanupEvents();
    this.clearSellConfirm();
  }

  private cleanupEvents() {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
  }

  private addDomListener<K extends keyof HTMLElementEventMap>(
    elementIdOrEl: string | HTMLElement | null,
    type: K,
    listener: (ev: HTMLElementEventMap[K]) => void
  ) {
    const el = typeof elementIdOrEl === 'string' ? document.getElementById(elementIdOrEl) : elementIdOrEl;
    if (!el) return;
    el.addEventListener(type, listener as EventListener);
    this.unbindEvents.push(() => {
      el.removeEventListener(type, listener as EventListener);
    });
  }

  public closeAllModals() {
    this.overlayEl?.classList.add('hidden');
    this.settingsOverlayEl?.classList.add('hidden');
    this.mechanicsOverlayEl?.classList.add('hidden');
    this.talentsOverlayEl?.classList.add('hidden');
    this.achievementsOverlayEl?.classList.add('hidden');
    this.changelogOverlayEl?.classList.add('hidden');
    this.leaderboardOverlayEl?.classList.add('hidden');
    this.profileOverlayEl?.classList.add('hidden');
  }

  private openSubModal(targetModal: HTMLElement) {
    let parent: HTMLElement | null = null;
    if (!this.settingsOverlayEl.classList.contains('hidden')) {
      parent = this.settingsOverlayEl;
    } else if (!this.overlayEl.classList.contains('hidden')) {
      parent = this.overlayEl;
    }
    this.closeAllModals();
    this.activeParentModal = parent;
    targetModal.classList.remove('hidden');
  }

  public dismissModal() {
    const parent = this.activeParentModal;
    this.closeAllModals();
    this.activeParentModal = null;
    if (parent) {
      parent.classList.remove('hidden');
    } else {
      if (this.gameState.isPaused) {
        this.gameState.isPaused = false;
        EventBus.getInstance().emit('pause:change', false);
      }
    }
  }

  private setupUIEvents() {
    this.addDomListener('hud-pause-btn', 'click', () => {
      this.gameState.togglePause();
    });
    this.addDomListener('hud-endless-btn', 'click', () => {
      if (this.gameState.isCampaignMode || this.gameState.challengeMode === 'MORTE_CERTA') return;
      this.game.setEndlessMode(!this.waveManager.isEndlessMode);
    });

    // Settings Toggle & Close
    this.addDomListener('settings-toggle-btn', 'click', () => {
      this.closeAllModals();
      this.activeParentModal = null;
      this.gameState.isPaused = true;
      EventBus.getInstance().emit('pause:change', true);
      this.syncSettingsControls();
      this.settingsOverlayEl.classList.remove('hidden');
    });

    this.addDomListener('settings-close-btn', 'click', () => {
      this.dismissModal();
    });

    this.addDomListener('settings-resume-btn', 'click', () => {
      this.dismissModal();
    });
    // Map Mechanics Guide
    const mechanicsBtn = document.getElementById('map-mechanics-btn');
    if (mechanicsBtn && localStorage.getItem('has_seen_map_mechanics') !== 'true') {
      mechanicsBtn.classList.add('mechanics-btn-highlight');
    }

    this.addDomListener('map-mechanics-btn', 'click', () => {
      localStorage.setItem('has_seen_map_mechanics', 'true');
      const btn = document.getElementById('map-mechanics-btn');
      if (btn) btn.classList.remove('mechanics-btn-highlight');

      this.closeAllModals();
      this.activeParentModal = null;
      this.gameState.isPaused = true;
      EventBus.getInstance().emit('pause:change', true);
      this.mechanicsOverlayEl.classList.remove('hidden');
    });
    this.addDomListener('close-mechanics-btn', 'click', () => {
      this.dismissModal();
    });

    this.addDomListener('close-mechanics-bottom-btn', 'click', () => {
      this.dismissModal();
    });

    // Settings Sub-Modals
    // Settings Sub-Modals
    this.addDomListener('settings-talents-btn', 'click', () => {
      this.updateTalentsModal();
      this.openSubModal(this.talentsOverlayEl);
    });

    this.addDomListener('close-talents-btn', 'click', () => {
      this.dismissModal();
    });

    this.addDomListener('settings-badges-btn', 'click', () => {
      this.openAchievementsModal();
    });

    this.addDomListener('close-achievements-btn', 'click', () => {
      this.dismissModal();
    });

    this.addDomListener('settings-changelog-btn', 'click', () => {
      this.openSubModal(this.changelogOverlayEl);
    });

    this.addDomListener('changelog-btn', 'click', () => {
      this.openSubModal(this.changelogOverlayEl);
    });

    this.addDomListener('close-changelog-btn', 'click', () => {
      this.dismissModal();
    });

    // Profile & Leaderboard Events
    this.addDomListener('main-profile-btn', 'click', () => {
      this.openProfileModal();
    });
    this.addDomListener('settings-profile-btn', 'click', () => {
      this.openProfileModal();
    });
    this.addDomListener('close-profile-btn', 'click', () => {
      this.dismissModal();
    });
    this.addDomListener('close-profile-bottom-btn', 'click', () => {
      this.dismissModal();
    });
    this.addDomListener('profile-save-btn', 'click', () => {
      this.saveProfile();
    });

    this.addDomListener('main-home-btn', 'click', () => {
      if (this.gameState.status === 'PREPARATION' || window.confirm('Deseja voltar para a tela inicial? O progresso da partida será perdido.')) {
        window.location.reload();
      }
    });

    this.addDomListener('main-leaderboard-btn', 'click', () => {
      this.openLeaderboardModal();
    });
    this.addDomListener('settings-leaderboard-btn', 'click', () => {
      this.openLeaderboardModal();
    });
    this.addDomListener('endgame-leaderboard-btn', 'click', () => {
      this.openLeaderboardModal();
    });
    this.addDomListener('endgame-close-btn', 'click', () => {
      this.overlayEl.classList.add('hidden');
      this.onRestartCallback();
    });
    this.addDomListener('close-leaderboard-btn', 'click', () => {
      this.dismissModal();
    });
    this.addDomListener('close-leaderboard-bottom-btn', 'click', () => {
      this.dismissModal();
    });

    this.addDomListener('settings-restart-btn', 'click', () => {
      if (window.confirm('Reiniciar a partida atual? Todo o progresso da onda será perdido.')) {
        this.closeAllModals();
        this.activeParentModal = null;
        this.onRestartCallback();
      }
    });

    // Backdrop Click Listeners for all modal overlays
    const modalOverlays = [
      this.overlayEl,
      this.settingsOverlayEl,
      this.mechanicsOverlayEl,
      this.talentsOverlayEl,
      this.achievementsOverlayEl,
      this.changelogOverlayEl,
      this.leaderboardOverlayEl,
      this.profileOverlayEl,
    ];

    modalOverlays.forEach((overlay) => {
      if (!overlay) return;
      this.addDomListener(overlay, 'click', (e) => {
        if (e.target === overlay) {
          this.dismissModal();
        }
      });
    });

    // Audio & Settings Sliders
    const hudMapSelect = document.getElementById('hud-map-select') as HTMLSelectElement;
    if (hudMapSelect) {
      hudMapSelect.value = this.game.currentMapId;
      this.addDomListener(hudMapSelect, 'change', (e) => {
        const val = (e.target as HTMLSelectElement).value as MapId;
        this.game.changeMap(val);
      });
    }

    const challengeSelect = (document.getElementById('hud-challenge-select') || document.getElementById('settings-challenge-select')) as HTMLSelectElement;
    if (challengeSelect) {
      challengeSelect.value = this.gameState.challengeMode;
      this.addDomListener(challengeSelect, 'change', (e) => {
        const val = (e.target as HTMLSelectElement).value as ChallengeMode;
        this.game.changeChallengeMode(val);
      });
    }

    const endlessToggle = document.getElementById('settings-endless-toggle') as HTMLInputElement;
    if (endlessToggle) {
      endlessToggle.checked = this.waveManager.isEndlessMode;
      this.addDomListener(endlessToggle, 'change', (e) => {
        this.game.setEndlessMode((e.target as HTMLInputElement).checked);
      });
    }

    // Interruptor de háptico (E4): a checagem de prefers-reduced-motion já
    // acontece dentro de vibrate() em todo chamador; este switch é só a
    // preferência manual do jogador, persistida em localStorage.
    const hapticsToggle = document.getElementById('settings-haptics-toggle') as HTMLInputElement;
    if (hapticsToggle) {
      hapticsToggle.checked = isHapticsEnabled();
      this.addDomListener(hapticsToggle, 'change', (e) => {
        setHapticsEnabled((e.target as HTMLInputElement).checked);
      });
    }

    // Leitura de campo (D5): alterna o alcance de todas as torres. O evento
    // 'ranges:toggle' mantém este botão sincronizado quando o atalho de
    // teclado (R), não o clique, foi a origem da mudança.
    this.addDomListener('hud-ranges-btn', 'click', () => {
      this.towerManager.toggleShowAllRanges();
    });

    this.addDomListener('settings-bgm-mute-btn', 'click', () => {
      this.audioManager.toggleBgmMute();
      this.syncSettingsControls();
    });

    this.addDomListener('settings-sfx-mute-btn', 'click', () => {
      this.audioManager.toggleSfxMute();
      this.syncSettingsControls();
    });

    const bgmSlider = document.getElementById('settings-bgm-slider') as HTMLInputElement;
    if (bgmSlider) {
      bgmSlider.value = Math.round(this.audioManager.bgmVolume * 100).toString();
      this.addDomListener(bgmSlider, 'input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setBgmVolume(val);
      });
    }

    this.addDomListener('changelog-btn', 'click', () => {
      this.changelogOverlayEl.classList.remove('hidden');
    });

    const sfxSlider = document.getElementById('settings-sfx-slider') as HTMLInputElement;
    if (sfxSlider) {
      sfxSlider.value = Math.round(this.audioManager.sfxVolume * 100).toString();
      this.addDomListener(sfxSlider, 'input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
        this.audioManager.setSfxVolume(val);
      });
    }

    // Tower Cards
    const towerCards = document.querySelectorAll<HTMLButtonElement>('.toolbar-card');
    towerCards.forEach((card) => {
      this.addDomListener(card, 'click', () => {
        const type = card.getAttribute('data-type') as TowerType;
        if (type) {
          this.setBuildType(type);
        }
      });
    });

    // Spells Chips
    this.addDomListener('chip-meteor', 'click', () => {
      this.spellManager.selectSpell('METEOR');
    });

    this.addDomListener('chip-freeze', 'click', () => {
      this.spellManager.triggerGlobalFreeze(this.game['enemyManager'].getEnemies());
    });

    this.addDomListener('btn-speed-1x', 'click', () => this.setGameSpeed(1));
    this.addDomListener('btn-speed-2x', 'click', () => this.setGameSpeed(2));
    this.addDomListener('btn-speed-4x', 'click', () => this.setGameSpeed(4));

    this.addDomListener('btn-auto-mode', 'click', () => {
      const isAuto = !this.waveManager.isAutoMode;
      this.waveManager.setAutoMode(isAuto);
      document.getElementById('btn-auto-mode')?.classList.toggle('active', isAuto);
    });

    // Initial sync for speed and auto mode
    if (this.waveManager?.isAutoMode) {
      document.getElementById('btn-auto-mode')?.classList.add('active');
    }
    if (this.game?.gameSpeedMultiplier) {
      this.setGameSpeed(this.game.gameSpeedMultiplier);
    }

    this.addDomListener('btn-next-wave', 'click', () => {
      this.waveManager.startNextWave();
    });

    // Inspector Actions
    this.addDomListener('inspector-close-btn', 'click', () => {
      this.towerManager.selectedTower = null;
      EventBus.getInstance().emit('tower:select', null);
    });

    this.addDomListener('btn-inspect-target', 'click', () => {
      this.towerManager.cycleSelectedTowerTargeting();
    });

    this.addDomListener('btn-inspect-repair', 'click', () => {
      this.towerManager.repairSelectedTower();
    });

    this.addDomListener('btn-inspect-upgrade', 'click', () => {
      this.towerManager.upgradeSelectedTower();
    });

    // Delegação: os botões de especialização são recriados a cada renderInspector.
    this.addDomListener('inspector-spec-choice', 'click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest('.spec-btn') as HTMLElement | null;
      if (!btn) return;
      const spec = btn.dataset.spec as TowerSpecialization | undefined;
      if (spec) this.towerManager.upgradeSelectedTower(spec);
    });

    this.addDomListener('btn-inspect-sell', 'click', () => {
      this.requestSellSelectedTower();
    });

    this.addDomListener('restart-btn', 'click', () => {
      this.overlayEl.classList.add('hidden');
      if (this.gameState.isCampaignMode && this.gameState.status === 'VICTORY') {
        const currentMap = this.game.currentMapId;
        if (currentMap === 'MAP_1') {
          this.game.changeMap('MAP_2');
          return;
        } else if (currentMap === 'MAP_2') {
          this.game.changeMap('MAP_3');
          return;
        } else if (currentMap === 'MAP_3') {
          this.game.changeMap('MAP_4');
          return;
        } else if (currentMap === 'MAP_4') {
          window.location.reload();
          return;
        }
      }
      this.onRestartCallback();
    });

    // Skill Tree Upgrade Buttons
    this.addDomListener('talent-dmg-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('damageLvl')) {
        this.updateTalentsModal();
      }
    });

    this.addDomListener('talent-gold-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('goldLvl')) {
        this.updateTalentsModal();
      }
    });

    this.addDomListener('talent-hp-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('hpLvl')) {
        this.updateTalentsModal();
      }
    });

    this.addDomListener('talent-cd-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('cdLvl')) {
        this.updateTalentsModal();
      }
    });

    this.addDomListener('talent-repair-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('repairLvl')) {
        this.updateTalentsModal();
      }
    });

    this.addDomListener('talent-crit-btn', 'click', () => {
      if (this.talentManager.upgradeTalent('critLvl')) {
        this.updateTalentsModal();
      }
    });

    this.syncEndlessButton(this.waveManager.isEndlessMode);
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
      this.clearSellConfirm();
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

  /** D5: sincroniza o botão 🎯 com o estado real (o atalho "R" também dispara). */
  private onRangesToggled(isShowingAll: boolean) {
    const rangesBtn = document.getElementById('hud-ranges-btn');
    if (rangesBtn) {
      rangesBtn.classList.toggle('active', isShowingAll);
      rangesBtn.title = isShowingAll
        ? 'Ocultar alcance de todas as torres (R)'
        : 'Mostrar alcance de todas as torres (R)';
    }
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
      HARDCORE: 'Hardcore (1 HP) 💀',
      MORTE_CERTA: '☠️ Morte Certa (Insano!)',
    };
    if (badgeName) badgeName.innerText = modeLabels[mode] || 'Modo Padrão';
    if (badgeEl) {
      badgeEl.classList.toggle('morte-certa', mode === 'MORTE_CERTA');
    }
    this.updateTowerAffordability();
    this.syncEndlessButton(this.waveManager.isEndlessMode);
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

  /** Público: também chamado pelo atalho de teclado Shift+1/2/3 (D2), fora do clique nos botões. */
  public setGameSpeed(speed: number) {
    this.game.gameSpeedMultiplier = speed;
    document.getElementById('btn-speed-1x')?.classList.toggle('active', speed === 1);
    document.getElementById('btn-speed-2x')?.classList.toggle('active', speed === 2);
    document.getElementById('btn-speed-4x')?.classList.toggle('active', speed === 4);
  }

  /**
   * Confirmação de venda (D4): o botão/atalho não vende de primeira — arma um
   * estado de "confirmar?" por alguns segundos. Um 2º clique/tecla dentro da
   * janela vende de fato; passado o tempo, ou ao selecionar outra torre, a
   * armação expira e volta ao rótulo normal. Evita apagar sem querer uma
   * torre nível 3 com upgrades caros, sem precisar de um modal separado.
   */
  public requestSellSelectedTower() {
    const tower = this.towerManager.selectedTower;
    if (!tower) return;

    if (this.sellConfirmTowerId === tower.data.id) {
      // 2ª confirmação dentro da janela: vende de fato.
      if (this.sellConfirmTimer !== null) {
        clearTimeout(this.sellConfirmTimer);
        this.sellConfirmTimer = null;
      }
      this.sellConfirmTowerId = null;
      this.towerManager.sellSelectedTower();
      return;
    }

    this.sellConfirmTowerId = tower.data.id;
    this.updateSellButtonLabel(tower);
    if (this.sellConfirmTimer !== null) clearTimeout(this.sellConfirmTimer);
    this.sellConfirmTimer = setTimeout(() => {
      this.sellConfirmTimer = null;
      this.sellConfirmTowerId = null;
      // A torre pode ter sido vendida/desselecionada durante a espera.
      if (this.towerManager.selectedTower) {
        this.updateSellButtonLabel(this.towerManager.selectedTower);
      }
    }, UIManager.SELL_CONFIRM_WINDOW_MS);
  }

  /** Descarta uma armação de venda pendente (ex.: trocou a torre selecionada). */
  private clearSellConfirm() {
    if (this.sellConfirmTimer !== null) {
      clearTimeout(this.sellConfirmTimer);
      this.sellConfirmTimer = null;
    }
    this.sellConfirmTowerId = null;
  }

  private updateSellButtonLabel(tower: Tower2D) {
    const sellBtn = document.getElementById('btn-inspect-sell') as HTMLButtonElement | null;
    if (!sellBtn) return;
    const isArmed = this.sellConfirmTowerId === tower.data.id;
    sellBtn.classList.toggle('confirm-pending', isArmed);
    sellBtn.innerText = isArmed ? `⚠️ Confirmar venda? +${tower.getSellValue()}g` : `💰 ${tower.getSellValue()}g`;
    sellBtn.title = isArmed ? 'Toque novamente para confirmar a venda' : 'Vender torre';
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

    const isNoSpells = this.gameState.challengeMode === 'MORTE_CERTA';

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
    // Trocou de torre (ou reselecionou depois de um upgrade/reparo): uma
    // armação de venda pendente de OUTRA torre não deve continuar valendo.
    if (this.sellConfirmTowerId !== null && this.sellConfirmTowerId !== tower.data.id) {
      this.clearSellConfirm();
    }

    const title = document.getElementById('inspector-title');
    if (title) {
      const spec = tower.data.specialization
        ? getSpecializationOption(tower.data.specialization)
        : undefined;
      title.innerText = spec
        ? `${tower.data.type} · ${spec.icon} ${spec.name}`
        : `${tower.data.type} (Nível ${tower.data.level})`;
    }

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
        const repairCost = tower.getRepairCost(undefined, this.gameState.challengeMode);
        repairBtn.innerText = `🔧 Reparo (${repairCost}g)`;
        repairBtn.disabled = this.gameState.gold < repairCost;
      }
    }

    // No nível 2 o upgrade deixa de ser um botão só: é a escolha entre as duas
    // especializações do tipo, cada uma com seu efeito.
    const isSpecializing = tower.data.level === 2 && !tower.data.isDestroyed;
    const cost = tower.getUpgradeCost();

    const upgradeBtn = document.getElementById('btn-inspect-upgrade') as HTMLButtonElement;
    if (upgradeBtn) {
      if (tower.data.level >= 3) {
        upgradeBtn.innerText = '⭐ Máximo';
        upgradeBtn.disabled = true;
        upgradeBtn.classList.remove('hidden');
      } else if (isSpecializing) {
        // A escolha vive no painel abaixo; o botão genérico sairia sobrando.
        upgradeBtn.classList.add('hidden');
      } else {
        upgradeBtn.classList.remove('hidden');
        upgradeBtn.innerText = `⬆️ ${cost}g`;
        upgradeBtn.disabled = this.gameState.gold < cost;
      }
    }

    const specBox = document.getElementById('inspector-spec-choice');
    if (specBox) {
      if (isSpecializing) {
        const canAfford = this.gameState.gold >= cost;
        const opcoes = getSpecializations(tower.data.type)
          .map(
            option => `
            <button class="spec-btn" data-spec="${option.id}" ${canAfford ? '' : 'disabled'}
                    title="${option.description}">
              <span class="spec-btn-title">${option.icon} ${option.name}</span>
              <span class="spec-btn-desc">${option.description}</span>
            </button>`
          )
          .join('');

        specBox.className = 'spec-choice';
        specBox.innerHTML = `
          <span class="spec-choice-label">
            ⬆️ Nível 3 — escolha a especialização (${cost}g)
          </span>
          <div class="spec-choice-options">${opcoes}</div>
        `;
      } else {
        specBox.className = 'spec-choice hidden';
        specBox.innerHTML = '';
      }
    }

    // render Inspector Module Socket
    const modBox = document.getElementById('inspector-module-choice');
    if (modBox || specBox) {
      let container = modBox;
      if (!container && specBox?.parentElement) {
        container = document.createElement('div');
        container.id = 'inspector-module-choice';
        specBox.parentElement.appendChild(container);
      }
      if (container && tower.data.level >= 2) {
        if (tower.data.equippedModule) {
          const mod = getRogueliteModule(tower.data.equippedModule);
          container.innerHTML = `<div style="font-size:12px; color:#ffd54f; margin-top:6px;">🧩 Módulo: ${mod.icon} ${mod.name}</div>`;
        } else if (this.playerModules.length > 0) {
          const options = this.playerModules.map(mId => {
            const mod = getRogueliteModule(mId);
            return `<button class="equip-mod-btn" data-mod="${mId}" style="margin:2px; padding:4px 8px; font-size:11px; background:#283593; color:white; border:1px solid #5c6bc0; border-radius:4px; cursor:pointer;">Equipar ${mod.icon} ${mod.name}</button>`;
          }).join(' ');
          container.innerHTML = `<div style="font-size:11px; color:#b0bec5; margin-top:6px;">Sockets de Módulo Disponíveis:<br>${options}</div>`;
          container.querySelectorAll('.equip-mod-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const mId = (e.currentTarget as HTMLElement).dataset.mod as RogueliteModuleId;
              if (mId && tower.equipModule(mId)) {
                const idx = this.playerModules.indexOf(mId);
                if (idx >= 0) this.playerModules.splice(idx, 1);
                this.renderInspector(tower);
              }
            });
          });
        } else {
          container.innerHTML = `<div style="font-size:11px; color:#78909c; margin-top:4px;">🧩 Slot de Módulo Vazio (Ganha no Draft das ondas 5, 10, 15)</div>`;
        }
      } else if (container) {
        container.innerHTML = '';
      }
    }

    this.updateSellButtonLabel(tower);
  }

  private syncSettingsControls() {
    const bgmMuteBtn = document.getElementById('settings-bgm-mute-btn');
    if (bgmMuteBtn) bgmMuteBtn.innerText = this.audioManager.isBgmMuted ? '🔇' : '🎵';

    const sfxMuteBtn = document.getElementById('settings-sfx-mute-btn');
    if (sfxMuteBtn) sfxMuteBtn.innerText = this.audioManager.isSfxMuted ? '🔇' : '🔊';

    const isCampaign = this.gameState.isCampaignMode;

    const hudMapBadge = document.getElementById('hud-map-badge');
    if (hudMapBadge) {
      hudMapBadge.classList.toggle('hidden', isCampaign);
    }

    const hudMapSelect = document.getElementById('hud-map-select') as HTMLSelectElement;
    if (hudMapSelect) {
      hudMapSelect.value = this.game.currentMapId;
    }

    const hudChallengeBadge = document.getElementById('hud-challenge-badge');
    if (hudChallengeBadge) {
      hudChallengeBadge.classList.toggle('hidden', isCampaign);
    }

    const challengeSelect = (document.getElementById('hud-challenge-select') || document.getElementById('settings-challenge-select')) as HTMLSelectElement;
    if (challengeSelect) {
      challengeSelect.value = this.gameState.challengeMode;
      challengeSelect.disabled = isCampaign;
      challengeSelect.title = isCampaign ? 'Modo de desafio desabilitado no Modo Campanha' : '';
    }

    this.syncEndlessButton(this.waveManager.isEndlessMode);
  }

  private syncEndlessButton(isEndless: boolean) {
    const endlessBtn = document.getElementById('hud-endless-btn') as HTMLButtonElement;
    const endlessToggle = document.getElementById('settings-endless-toggle') as HTMLInputElement;
    const isCampaign = this.gameState.isCampaignMode;
    const isMorteCerta = this.gameState.challengeMode === 'MORTE_CERTA';
    const isDisabled = isCampaign || isMorteCerta;

    const title = isCampaign
      ? 'Modo Infinito desabilitado no Modo Campanha'
      : isMorteCerta
      ? 'Morte Certa é sempre infinito'
      : 'Alternar Modo Infinito';

    if (endlessBtn) {
      endlessBtn.classList.toggle('active', isEndless);
      endlessBtn.disabled = isDisabled;
      endlessBtn.title = title;
    }

    if (endlessToggle) {
      endlessToggle.checked = isEndless;
      endlessToggle.disabled = isDisabled;
      endlessToggle.title = title;
    }

    const waveVal = document.getElementById('hud-wave-val');
    if (waveVal) {
      const waveNum = this.currentWave > 0 ? this.currentWave : (this.waveManager ? this.waveManager.currentWaveIndex + 1 : 1);
      waveVal.innerText = isEndless ? `${waveNum}/♾️` : `${waveNum}/10`;
    }
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
    this.openSubModal(this.achievementsOverlayEl);
    const grid = document.getElementById('achievements-grid');
    const summary = document.getElementById('achievements-summary');
    if (!grid || !summary) return;

    const achievements = Object.values(this.achievementManager.achievements);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    summary.innerText = `Desbloqueadas ${unlockedCount}/${achievements.length} Badges`;

    grid.innerHTML = '';
    achievements.forEach((ach) => {
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
      progress.textContent = ach.unlocked ? '✅ Desbloqueado' : `${ach.progress}/${ach.maxProgress}`;

      info.appendChild(title);
      info.appendChild(desc);
      info.appendChild(progress);

      card.appendChild(icon);
      card.appendChild(info);

      grid.appendChild(card);
    });

    this.achievementsOverlayEl.classList.remove('hidden');
  }

  private updateEndGameModal() {
    if (this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') {
      this.overlayEl.classList.remove('hidden');
      const title = document.getElementById('modal-title');
      const desc = document.getElementById('modal-desc');
      const restartBtn = document.getElementById('restart-btn');

      if (this.gameState.status === 'GAME_OVER') {
        if (title) title.innerText = '💀 Game Over';
        const survivedWave = Math.max(1, this.waveManager.currentWaveIndex + 1);
        if (desc) desc.innerText = `Inimigos invadiram a base na Onda ${survivedWave}!`;
        if (restartBtn) restartBtn.innerText = 'Jogar Novamente';
      } else {
        if (title) title.innerText = '🏆 Vitória!';
        if (desc) desc.innerText = 'Você defendeu a base em todas as 10 Ondas!';
        if (restartBtn) restartBtn.innerText = 'Jogar Novamente';

        if (this.gameState.isCampaignMode) {
          const currentMap = this.game.currentMapId;
          if (currentMap === 'MAP_1') {
            if (title) title.innerText = 'Green Valley Concluído!';
            if (desc) desc.innerText = 'Prepare-se para o Vale da Morte.';
            if (restartBtn) restartBtn.innerText = 'Próxima Fase (Death Pass)';
          } else if (currentMap === 'MAP_2') {
            if (title) title.innerText = 'Death Pass Concluído!';
            if (desc) desc.innerText = 'O último desafio aguarda na Cidadela.';
            if (restartBtn) restartBtn.innerText = 'Batalha Final (Cidadela)';
          } else if (currentMap === 'MAP_3') {
            if (title) title.innerText = 'Cidadela Concluída!';
            if (desc) desc.innerText = 'O desafio obscuro final aguarda na Passagem dos Túmulos.';
            if (restartBtn) restartBtn.innerText = 'Desafio Final (Grave Pass)';
          } else if (currentMap === 'MAP_4') {
            if (title) title.innerText = 'Campanha Concluída!';
            if (desc) desc.innerText = 'Você purificou as almas e salvou o mundo de Oh My TD!';
            if (restartBtn) restartBtn.innerText = 'Voltar ao Menu';
          }
        }
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
          HARDCORE: 'Hardcore (1 HP) 💀',
          MORTE_CERTA: '☠️ Morte Certa (Insano!)',
        };
        modalChallenge.innerText = modeLabels[this.gameState.challengeMode] || 'Padrão';
      }
    }
  }

  /** Ícone de cada tipo na faixa de preview, alinhado à cor do inimigo em jogo. */
  private static readonly ENEMY_ICONS: Record<EnemyType, string> = {
    STANDARD: '🔴',
    RUNNER: '🟠',
    SPORE_SPRINTER: '🟢',
    SHIELDED: '🔵',
    TANK: '🟣',
    MOSS_GIANT: '🌲',
    BOSS: '💀',
    BLACK_MEGA_BOSS: '☠️',
  };

  private static readonly ARCHETYPE_LABELS: Record<EndlessArchetype, string> = {
    SWARM: 'Enxame',
    ARMORED: 'Blindada',
    RUSH: 'Investida',
    MIXED: 'Mista',
    BOSS_RUSH: 'Chefes',
  };

  /**
   * Faixa compacta com a composição da próxima onda. Sem isso o jogador só sabe
   * o número da onda, e num TD planejar a defesa é o jogo — a única estratégia
   * possível passava a ser morrer e reiniciar.
   */
  private renderWavePreview(preview: WavePreview) {
    if (!this.wavePreviewEl) return;

    const titulo = preview.archetype
      ? `Ameaças · ${UIManager.ARCHETYPE_LABELS[preview.archetype]}`
      : `Ameaças:`;

    const chips = preview.entries
      .map(entry => {
        const isBoss = entry.type === 'BOSS' || entry.type === 'BLACK_MEGA_BOSS';
        const icon = UIManager.ENEMY_ICONS[entry.type] || '❔';
        return `<span class="wave-preview-chip${isBoss ? ' boss' : ''}">${icon} ${entry.count}</span>`;
      })
      .join('');

    this.wavePreviewEl.className = `wave-preview${preview.hasBoss ? ' danger' : ''}`;
    this.wavePreviewEl.innerHTML = `<span class="wave-preview-title">${titulo}</span>${chips}`;
  }

  public update() {
    if (!this.waveBtnEl) {
      this.waveBtnEl = document.getElementById('btn-next-wave') as HTMLButtonElement;
      this.waveBtnLabelEl = document.getElementById('start-wave-label');
    }
    if (!this.wavePreviewEl) {
      this.wavePreviewEl = document.getElementById('hud-wave-preview');
    }

    // Preview da próxima onda: só recalcula quando a onda alvo muda, para não
    // remontar HTML a 60fps.
    if (this.wavePreviewEl) {
      const previewKey = this.waveManager.isWaveActive
        ? 'active'
        : `w${this.waveManager.currentWaveIndex + 1}`;

      if (this.lastWavePreviewKey !== previewKey) {
        this.lastWavePreviewKey = previewKey;
        const preview = this.waveManager.isWaveActive ? null : this.waveManager.getNextWavePreview();
        if (preview) {
          this.renderWavePreview(preview);
        } else {
          this.wavePreviewEl.className = 'wave-preview hidden';
          this.wavePreviewEl.innerHTML = '';
        }
      }
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

    // 2b. Wave indicator in bottom bar
    if (!this.waveIndEl) {
      this.waveIndEl = document.getElementById('wave-indicator');
      this.waveIndLabelEl = this.waveIndEl?.querySelector('.wave-indicator-label') as HTMLElement | null;
    }
    if (!this.waveIndNumEl || !this.waveIndEnemiesEl) {
      this.waveIndNumEl = document.getElementById('wave-indicator-num');
      this.waveIndEnemiesEl = document.getElementById('wave-indicator-enemies');
    }

    if (this.waveIndEl) {
      const isHidden = !this.waveManager.isWaveActive;
      if (this.lastWaveIndHidden !== isHidden) {
        this.waveIndEl.classList.toggle('hidden', isHidden);
        this.lastWaveIndHidden = isHidden;
        
        if (!isHidden && this.waveIndLabelEl) {
          this.waveIndLabelEl.innerText = "RESTANTES";
          if (this.waveIndNumEl) this.waveIndNumEl.style.display = 'none';
        }
      }
    }

    if (this.waveIndEnemiesEl && this.waveManager.isWaveActive) {
      // Remaining enemies = spawn queue + alive enemies on screen
      const aliveEnemies = (this.game as any)['enemyManager'].getEnemies().filter(
        (e: any) => !e.data.isDead
      ).length;
      const remaining = this.waveManager.spawnQueueLength + aliveEnemies;
      const newWaveIndEnemiesText = `${remaining}`;
      if (this.lastWaveIndEnemies !== newWaveIndEnemiesText) {
        this.waveIndEnemiesEl.innerText = newWaveIndEnemiesText;
        this.lastWaveIndEnemies = newWaveIndEnemiesText;
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
    // Safety check for End Game modal display (skip while a sub-modal opened from it, like the leaderboard, is active)
    if ((this.gameState.status === 'GAME_OVER' || this.gameState.status === 'VICTORY') && this.activeParentModal !== this.overlayEl) {
      this.updateEndGameModal();
    }
  }

  /** Escreve na faixa de status do modal de perfil. `kind` vazio = neutro. */
  private setProfileStatus(text: string, kind: '' | 'success' | 'error' = '') {
    const statusMsg = document.getElementById('profile-status-msg');
    if (!statusMsg) return;
    statusMsg.innerText = text;
    statusMsg.className = kind ? `profile-status-msg ${kind}` : 'profile-status-msg';
  }

  private async openProfileModal() {
    this.openSubModal(this.profileOverlayEl);
    const usernameInput = document.getElementById('profile-username-input') as HTMLInputElement | null;
    const avatarSelect = document.getElementById('profile-avatar-select') as HTMLSelectElement | null;

    const db = this.game?.databaseManager;
    if (!db) {
      this.setProfileStatus('Modo offline: as alterações ficam salvas neste dispositivo.');
      return;
    }

    // Preenche na hora com o perfil local, sem esperar a rede.
    const local = db.loadLocalProfile();
    if (usernameInput) usernameInput.value = local?.username ?? '';
    if (avatarSelect) avatarSelect.value = local?.avatarId ?? 'default_avatar';

    if (!db.isConnected()) {
      this.setProfileStatus('Modo offline: as alterações ficam salvas neste dispositivo.');
      return;
    }
    this.setProfileStatus('⌛ Sincronizando...');
    const res = await db.syncProfileWithRemote();

    // O modal pode ter sido fechado enquanto a rede respondia.
    if (this.profileOverlayEl.classList.contains('hidden')) return;

    if (res.profile) {
      // Nao sobrescreve o campo se o jogador ja comecou a digitar.
      if (usernameInput && document.activeElement !== usernameInput) {
        usernameInput.value = res.profile.username;
      }
      if (avatarSelect && document.activeElement !== avatarSelect) {
        avatarSelect.value = res.profile.avatarId;
      }
    }

    if (!res.remoteOk) {
      this.setProfileStatus(
        '⚠️ Não foi possível ler o perfil no servidor. Exibindo os dados deste dispositivo.',
        'error'
      );
    } else if (res.pending) {
      this.setProfileStatus('Alterações locais aguardando envio ao servidor.');
    } else {
      this.setProfileStatus('');
    }
  }

  private async saveProfile() {
    const usernameInput = document.getElementById('profile-username-input') as HTMLInputElement;
    const avatarSelect = document.getElementById('profile-avatar-select') as HTMLSelectElement;

    if (!usernameInput || !avatarSelect) return;
    const username = usernameInput.value.trim();
    const avatarId = avatarSelect.value;

    if (!username) {
      this.setProfileStatus('Digite um nome de usuário válido.', 'error');
      return;
    }

    const db = this.game.databaseManager;
    if (!db) return;

    this.setProfileStatus('Salvando...');

    const res = await db.updateProfile(username, avatarId);
    if (this.profileOverlayEl.classList.contains('hidden')) return;

    if (res.success) {
      this.setProfileStatus(
        res.pending
          ? 'Salvo neste dispositivo. Será enviado ao servidor assim que possível.'
          : 'Perfil atualizado com sucesso!',
        'success'
      );
    } else {
      this.setProfileStatus(res.error || 'Erro ao salvar perfil.', 'error');
    }
  }
  private async openLeaderboardModal() {
    this.openSubModal(this.leaderboardOverlayEl);
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    content.innerHTML = '<p style="text-align: center; padding: 20px;">⌛ Carregando placar global...</p>';

    const db = this.game?.databaseManager;
    if (!db || !db.isConnected()) {
      content.innerHTML = '<p style="text-align: center; color: #ff5252; padding: 20px;">⚠️ Placar indisponível no modo offline. Conecte-se ao Supabase para visualizar o ranking.</p>';
      return;
    }

    const list = await db.getTop20Leaderboard();
    if (list.length === 0) {
      content.innerHTML = '<p style="text-align: center; color: #aaa; padding: 20px;">Nenhum registro encontrado no placar ainda. Seja o primeiro!</p>';
      return;
    }

    const avatarIcons: Record<string, string> = {
      default_avatar: '🛡️',
      solar_prism: '☀️',
      mega_boss: '👹',
      frost_wizard: '❄️',
    };

    const rowsHtml = list
      .map((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const icon = avatarIcons[entry.avatar_id] || '🛡️';
        return `
          <tr>
            <td class="rank-col ${rankClass}">${medal}</td>
            <td><strong>${icon} ${entry.username || 'Anônimo'}</strong></td>
            <td><span style="font-size:0.675rem; background:#334; padding:2px 6px; border-radius:4px;">${entry.challenge_mode}</span></td>
            <td style="color:#ffca28; font-weight:bold;">Onda ${entry.wave_reached}</td>
            <td>⚔️ ${entry.total_kills}</td>
            <td>🪙 ${entry.gold_earned}g</td>
          </tr>
        `;
      })
      .join('');

    content.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Jogador</th>
            <th>Modo</th>
            <th>Maior Onda</th>
            <th>Kills</th>
            <th>Ouro</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  public triggerDraftModal(onSelect?: (moduleId: RogueliteModuleId) => void) {
    this.gameState.isPaused = true;
    EventBus.getInstance().emit('pause:change', true);
    const all = getAllRogueliteModules();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10, 15, 30, 0.92); z-index: 10000;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; color: #ffeb3b; font-family: sans-serif;">
        <h2 style="font-size: 24px; margin: 0;">🃏 DRAFT DE CARTAS ROGUELITE</h2>
        <p style="color: #b0bec5; font-size: 14px; margin: 5px 0 0 0;">Escolha 1 módulo para adicionar ao seu inventário de combate:</p>
      </div>
      <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; max-width: 750px;">
        ${choices
          .map(
            c => `
          <button class="draft-card-btn" data-id="${c.id}" style="
            background: #1a237e; border: 2px solid #3f51b5; border-radius: 12px; padding: 20px;
            width: 210px; text-align: center; cursor: pointer; color: white; transition: transform 0.2s;
          ">
            <div style="font-size: 42px; margin-bottom: 10px;">${c.icon}</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffd54f; margin-bottom: 8px;">${c.name}</div>
            <div style="font-size: 12px; color: #e0e0e0; line-height: 1.4;">${c.description}</div>
          </button>
        `
          )
          .join('')}
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.draft-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id as RogueliteModuleId;
        if (id) {
          this.playerModules.push(id);
          if (onSelect) onSelect(id);
        }
        overlay.remove();
        if (this.gameState.isPaused) {
          this.gameState.isPaused = false;
          EventBus.getInstance().emit('pause:change', false);
        }
      });
    });
  }
}
