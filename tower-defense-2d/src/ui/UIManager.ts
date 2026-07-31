import { AchievementManager } from '../engine/AchievementManager';
import { AnalyticsManager } from '../engine/AnalyticsManager';
import { AudioManager } from '../engine/AudioManager';
import { EventBus } from '../engine/EventBus';
import { Game2D } from '../engine/Game';
import { GameState } from '../engine/GameState';
import type { MapId } from '../engine/MapManager';
import { SpellManager, type ActiveSpell } from '../engine/SpellManager';
import { getSpecializationOption, getSpecializations } from '../engine/Specializations';
import { TalentManager, type TalentData } from '../engine/TalentManager';
import type { Tower2D } from '../engine/Tower';
import { TowerManager2D } from '../engine/TowerManager';
import { WaveManager, type EndlessArchetype, type WavePreview } from '../engine/WaveManager';
import type { ChallengeMode, EnemyType, TowerSpecialization, TowerType } from '../types';

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
    const part1 = document.getElementById('layout-part-1');
    const part2 = document.getElementById('layout-part-2');
    const part4 = document.getElementById('layout-part-4');
    const modals = document.getElementById('ui-container') || document.body;

    const part1Html = `
      <div id="game-title-bar" class="game-title-bar">
        <h1 class="game-title">OH MY TD <span class="game-version">v0.3.0</span></h1>
      </div>

      <header id="hud-top" class="hud-top pointer-events-auto">
        <button id="main-leaderboard-btn" class="hud-btn highlight-btn" title="Placar Global (🏆)" aria-label="Placar Global">
          🏆<span class="hud-btn-text"> Placar Global</span>
        </button>
        <button id="main-profile-btn" class="hud-btn highlight-btn" title="Perfil de Jogador (👤)" aria-label="Perfil">
          👤<span class="hud-btn-text"> Perfil</span>
        </button>
        <button id="changelog-btn" class="hud-btn changelog-gift-btn" title="Últimas Atualizações (🎁)" aria-label="Novidades">
          🎁<span class="changelog-btn-text"> Novidades</span>
        </button>
        <button id="settings-toggle-btn" class="hud-btn settings-btn" title="Configurações & Menus (⚙️)">
          ⚙️
        </button>
      </header>
    `;

    const part2Html = `
      <div id="hud-stats-bar" class="hud-stats-bar pointer-events-auto">
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
        </div>

        <button id="btn-next-wave" class="start-wave-main-btn">
          <span id="start-wave-label">Iniciar Onda 1</span>
        </button>
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
                    <option value="HARDCORE">Modo: Hardcore (1 HP) 💀</option>
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
                  <strong class="version-tag">v0.3.0</strong>
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
    this.talentsOverlayEl = document.getElementById('talents-modal-overlay')!;
    this.achievementsOverlayEl = document.getElementById('achievements-modal-overlay')!;
    this.changelogOverlayEl = document.getElementById('changelog-modal-overlay')!;
    this.leaderboardOverlayEl = document.getElementById('leaderboard-modal-overlay')!;
    this.profileOverlayEl = document.getElementById('profile-modal-overlay')!;


    this.storeStateEl = document.getElementById('store-state')!;
    this.inspectorStateEl = document.getElementById('inspector-state')!;

    this.setupUIEvents();
  }

  private subscribeToEvents() {
    this.cleanupEvents();
    const bus = EventBus.getInstance();

    this.unbindEvents = [
      bus.on('gold:change', (gold: number) => this.onGoldChanged(gold)),
      bus.on('hp:change', (data: { current: number; max: number }) => this.onHpChanged(data)),
      bus.on('wave:change', (data: { current: number; max: number; isEndless: boolean }) => this.onWaveChanged(data)),
      bus.on('tower:select', (tower: Tower2D | null) => this.onTowerSelected(tower)),
      bus.on('tower:buildType', (type: TowerType) => this.onBuildTypeChanged(type)),
      bus.on('spell:select', (spell: ActiveSpell) => this.onSpellSelected(spell)),
      bus.on('status:change', () => this.updateEndGameModal()),
      bus.on('pause:change', (isPaused: boolean) => this.onPauseChanged(isPaused)),
      bus.on('challenge:change', (mode: ChallengeMode) => this.onChallengeChanged(mode)),
    ];

    // Initial populate
    this.onGoldChanged(this.gameState.gold);
    this.onHpChanged({ current: this.gameState.baseHp, max: this.gameState.maxBaseHp });
    this.onWaveChanged({ current: this.waveManager.currentWaveIndex + 1, max: 10, isEndless: this.waveManager.isEndlessMode });
    this.onChallengeChanged(this.gameState.challengeMode);
  }

  public destroy() {
    this.cleanupEvents();
  }

  private cleanupEvents() {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
  }

  public closeAllModals() {
    this.overlayEl?.classList.add('hidden');
    this.settingsOverlayEl?.classList.add('hidden');
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
    document.getElementById('hud-pause-btn')?.addEventListener('click', () => {
      this.gameState.togglePause();
    });

    // Settings Toggle & Close
    document.getElementById('settings-toggle-btn')?.addEventListener('click', () => {
      this.closeAllModals();
      this.activeParentModal = null;
      this.gameState.isPaused = true;
      EventBus.getInstance().emit('pause:change', true);
      this.syncSettingsControls();
      this.settingsOverlayEl.classList.remove('hidden');
    });
    document.getElementById('settings-close-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    document.getElementById('settings-resume-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    // Settings Sub-Modals
    document.getElementById('settings-talents-btn')?.addEventListener('click', () => {
      this.updateTalentsModal();
      this.openSubModal(this.talentsOverlayEl);
    });

    document.getElementById('close-talents-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    document.getElementById('settings-badges-btn')?.addEventListener('click', () => {
      this.openAchievementsModal();
    });

    document.getElementById('close-achievements-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    document.getElementById('settings-changelog-btn')?.addEventListener('click', () => {
      this.openSubModal(this.changelogOverlayEl);
    });

    document.getElementById('changelog-btn')?.addEventListener('click', () => {
      this.openSubModal(this.changelogOverlayEl);
    });

    document.getElementById('close-changelog-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    // Profile & Leaderboard Events
    document.getElementById('main-profile-btn')?.addEventListener('click', () => {
      this.openProfileModal();
    });
    document.getElementById('settings-profile-btn')?.addEventListener('click', () => {
      this.openProfileModal();
    });
    document.getElementById('close-profile-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });
    document.getElementById('close-profile-bottom-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });
    document.getElementById('profile-save-btn')?.addEventListener('click', () => {
      this.saveProfile();
    });

    document.getElementById('main-leaderboard-btn')?.addEventListener('click', () => {
      this.openLeaderboardModal();
    });
    document.getElementById('settings-leaderboard-btn')?.addEventListener('click', () => {
      this.openLeaderboardModal();
    });
    document.getElementById('endgame-leaderboard-btn')?.addEventListener('click', () => {
      this.openLeaderboardModal();
    });
    document.getElementById('endgame-close-btn')?.addEventListener('click', () => {
      this.overlayEl.classList.add('hidden');
      this.onRestartCallback();
    });
    document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });
    document.getElementById('close-leaderboard-bottom-btn')?.addEventListener('click', () => {
      this.dismissModal();
    });

    document.getElementById('settings-restart-btn')?.addEventListener('click', () => {
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
      this.talentsOverlayEl,
      this.achievementsOverlayEl,
      this.changelogOverlayEl,
      this.leaderboardOverlayEl,
      this.profileOverlayEl,
    ];

    modalOverlays.forEach((overlay) => {
      if (!overlay) return;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.dismissModal();
        }
      });
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
        this.game.setEndlessMode((e.target as HTMLInputElement).checked);
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

    // Initial sync for speed and auto mode
    if (this.waveManager?.isAutoMode) {
      document.getElementById('btn-auto-mode')?.classList.add('active');
    }
    if (this.game?.gameSpeedMultiplier) {
      this.setGameSpeed(this.game.gameSpeedMultiplier);
    }

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

    // Delegação: os botões de especialização são recriados a cada renderInspector.
    document.getElementById('inspector-spec-choice')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest('.spec-btn') as HTMLElement | null;
      if (!btn) return;
      const spec = btn.dataset.spec as TowerSpecialization | undefined;
      if (spec) this.towerManager.upgradeSelectedTower(spec);
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
      HARDCORE: 'Hardcore (1 HP) 💀',
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
        const repairCost = tower.getRepairCost();
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

    const endlessToggle = document.getElementById('settings-endless-toggle') as HTMLInputElement;
    if (endlessToggle) {
      const isMorteCerta = this.gameState.challengeMode === 'MORTE_CERTA';
      endlessToggle.checked = this.waveManager.isEndlessMode;
      endlessToggle.disabled = isMorteCerta;
      endlessToggle.title = isMorteCerta ? 'Morte Certa é sempre infinito' : '';
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
            <td><span style="font-size:0.75rem; background:#334; padding:2px 6px; border-radius:4px;">${entry.challenge_mode}</span></td>
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
}
