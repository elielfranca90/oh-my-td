import type { ChallengeMode, TowerType } from '../types';
import { UIManager, type IGame2D } from '../ui/UIManager';
import { AchievementManager } from './AchievementManager';
import { AnalyticsManager } from './AnalyticsManager';
import { DatabaseManager } from './DatabaseManager';
import { AudioManager, type BGMTrack } from './AudioManager';
import { EventBus } from './EventBus';
import { EnemyManager2D } from './EnemyManager';
import { FXManager } from './FXManager';
import { GameState } from './GameState';
import { MapManager2D, type MapId } from './MapManager';
import { MegaBossSpriteRenderer } from './MegaBossSpriteRenderer';
import { ParticleManager } from './ParticleManager';
import { ProjectileManager2D } from './ProjectileManager';
import { Rng } from './Rng';
import { SpellManager } from './SpellManager';
import { getSpecializationOption } from './Specializations';
import { TalentManager } from './TalentManager';
import { Tower2D } from './Tower';
import { TowerManager2D } from './TowerManager';
import { WaveManager } from './WaveManager';
import { ThreeRenderer } from './ThreeRenderer';
import { SpriteManager } from './SpriteManager';
import { ReplayEngine } from './ReplayEngine';
import { initMobileDetection } from '../helpers/device';
export class Game2D implements IGame2D {
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

  /**
   * Tempo de pressão para abrir o tip de informação do tile. No toque não existe
   * hover, então press-and-hold é a única forma de "olhar sem agir".
   */
  private static readonly LONG_PRESS_MS = 420;

  /**
   * Quanto o dedo/cursor pode escorregar (em px da grade interna) antes de
   * cancelar a pressão. Sem tolerância, o tremor natural do toque cancelaria.
   */
  private static readonly LONG_PRESS_MOVE_TOLERANCE = 14;

  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public threeRenderer!: ThreeRenderer;

  public gameState!: GameState;
  public waveManager!: WaveManager;
  public audioManager!: AudioManager;
  public talentManager!: TalentManager;
  public achievementManager!: AchievementManager;
  public analyticsManager!: AnalyticsManager;
  public databaseManager!: DatabaseManager;
  public mapManager!: MapManager2D;
  public enemyManager!: EnemyManager2D;
  private projectileManager!: ProjectileManager2D;
  private towerManager!: TowerManager2D;
  private fxManager!: FXManager;
  private particleManager!: ParticleManager;
  public spellManager!: SpellManager;
  private uiManager!: UIManager;
  public replayEngine!: ReplayEngine;
  private wasWaveActive = false;

  public gameSpeedMultiplier = 1; // 1x, 2x, 4x

  /**
   * Semente da partida atual. Toda a aleatoriedade que decide o jogo (esquiva,
   * crítico, composição endless, tiles Sprout) sai deste RNG, então informar a
   * mesma semente reproduz a partida — base para depurar um bug relatado e para
   * o harness de balanceamento comparar builds.
   */
  public runSeed = 0;
  public rng!: Rng;
  public isMobile: boolean;
  private mobileSelectedGrid: { x: number; y: number } | null = null;
  private mousePos: { x: number; y: number } | null = null;
  private hoveredGrid: { x: number; y: number } | null = null;
  private lastTime = 0;
  /**
   * Fator de escala aplicado a fontes/espessuras de barra desenhadas no
   * canvas (tip de tile, texto de dano, toast de conquista, barra de vida).
   * O canvas interno é fixo em 840×600; num telefone de ~360px CSS o fator
   * de escala do CSS é ~0.43, então um "11px" desenhado no espaço interno
   * viraria ~5px reais. `uiScale = 840 / larguraRenderizadaCSS`, sempre >=1
   * (nunca encolhe abaixo do tamanho atual em telas grandes — só amplia em
   * telas pequenas). Recalculado em `syncCanvasWidth()`. Ver GAME_DESIGN_REVIEW.md (E1).
   */
  private uiScale = 1;
  /** `#game-area`: pai do canvas, usado para posicionar o hint de construção mobile (E5) sobre o tile certo. */
  private gameAreaEl!: HTMLElement;
  /** Hint DOM "toque de novo para construir · Xg" + botão ✖, mostrado sobre o ghost no mobile (E5). */
  private buildHintEl!: HTMLElement;
  /** Tempo real acumulado ainda não consumido pela simulação (escalado pela velocidade). */
  private simAccumulatorMs = 0;
  /** Idem para FX/toasts, mas sem escala de velocidade (duram o mesmo em 1x e 4x). */
  private fxAccumulatorMs = 0;
  /**
   * Espelho de `WaveManager.getEarlyCallBonus()`, recalculado a cada passo fixo
   * de simulação (ver `stepSimulation`). O botão "Iniciar Onda" é clicado dentro
   * do `UIManager` e chama `waveManager.startNextWave()` diretamente — não passa
   * por este arquivo —, então não há como ler o getter "antes" do clique de
   * forma síncrona sem tocar em `UIManager.ts` (fora do escopo desta rodada).
   * Mantendo o valor sempre atualizado ("antes" no sentido de "o mais recente
   * possível antes de qualquer clique"), o listener de `wave:start` abaixo
   * consegue creditar o ouro certo assim que a onda de fato começa, com atraso
   * de no máximo um passo fixo (~16,7ms) — imperceptível frente ao segundo
   * inteiro que a fórmula do bônus já arredonda em `Math.floor`.
   */
  private cachedEarlyCallBonus = 0;

  // --- Press-and-hold ---
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  /** Marca que a pressão virou tip, para o clique seguinte não construir. */
  private longPressFired = false;
  private pressOrigin: { x: number; y: number } | null = null;
  /** Tile cujo tip está aberto, ou null. */
  private tooltipGrid: { x: number; y: number } | null = null;
  private hasAwardedStars = false;
  private currentSavedMapId: MapId = 'MAP_1';
  private currentSavedChallengeMode: ChallengeMode = 'NORMAL';
  /**
   * Preferência do jogador para o Modo Infinito, independente do modo desafio.
   * Sem isto, `initGame()` recriava o WaveManager a cada restart/troca de mapa
   * e o infinito voltava a `false` — parecia que só existia no Morte Certa.
   */
  private currentSavedEndlessMode = false;
  public currentSavedAutoMode = false;

  constructor() {
    try {
      const savedSpeed = parseInt(localStorage.getItem('oh_my_td_game_speed') || '1', 10);
      if (savedSpeed === 1 || savedSpeed === 2 || savedSpeed === 4) {
        this.gameSpeedMultiplier = savedSpeed;
      }
      const savedAuto = localStorage.getItem('oh_my_td_auto_mode');
      this.currentSavedAutoMode = savedAuto === 'true';
    } catch {
      // ignore
    }
    this.isMobile = initMobileDetection();
    this.databaseManager = DatabaseManager.getInstance();
    const gameArea = document.getElementById('game-area');
    if (!gameArea) throw new Error('Game area container not found');
    this.gameAreaEl = gameArea;

    this.threeRenderer = new ThreeRenderer(840, 600);
    gameArea.appendChild(this.threeRenderer.canvas);
    this.canvas = document.createElement('canvas');
    this.canvas.width = 840;
    this.canvas.height = 600;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '50%';
    this.canvas.style.top = '50%';
    this.canvas.style.transform = 'translate(-50%, -50%)';
    this.canvas.style.zIndex = '1';
    gameArea.appendChild(this.canvas);

    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    this.buildHintEl = this.createBuildHintElement();
    gameArea.appendChild(this.buildHintEl);

    this.initGame();
    this.setupListeners();
  }

  /**
   * Hint DOM (não canvas) para o gesto de construir no mobile (E5): o
   * primeiro toque só seleciona o tile e mostra o ghost — nada na tela dizia
   * isso antes. É DOM, não canvas, pelo mesmo motivo do tip de tile (E1):
   * texto desenhado no espaço interno 840×600 fica ilegível em telas
   * pequenas, e aqui ainda precisamos de um botão ✖ clicável de verdade.
   */
  private createBuildHintElement(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'build-hint';
    el.className = 'build-hint hidden pointer-events-auto';
    el.innerHTML = `
      <span id="build-hint-label"></span>
      <button id="build-hint-cancel" type="button" class="build-hint-cancel-btn" aria-label="Cancelar seleção da torre">✖</button>
    `;
    const cancelBtn = el.querySelector('#build-hint-cancel');
    cancelBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelMobileTileSelection();
    });
    return el;
  }

  /** Cancela a seleção de tile pendente no mobile (2º toque construiria). Usado pelo botão ✖ e pelo Esc. */
  private cancelMobileTileSelection() {
    this.mobileSelectedGrid = null;
    this.hoveredGrid = null;
  }

  private initGame() {
    if (this.audioManager) {
      this.audioManager.dispose();
    }

    // Uma semente por partida, compartilhada por todos os managers.
    this.runSeed = Date.now() >>> 0;
    this.rng = new Rng(this.runSeed);

    this.analyticsManager = new AnalyticsManager();
    this.talentManager = new TalentManager(this.databaseManager);
    this.achievementManager = new AchievementManager(this.talentManager, this.databaseManager);
    const wasCampaignMode = this.gameState ? this.gameState.isCampaignMode : false;
    this.gameState = new GameState(this.talentManager, this.currentSavedChallengeMode);
    this.gameState.isCampaignMode = wasCampaignMode;
    this.gameState.setStatus('PREPARATION');
    this.waveManager = new WaveManager(this.rng);
    this.waveManager.isMorteCerta = this.currentSavedChallengeMode === 'MORTE_CERTA';
    // Morte Certa é sempre infinito; nos demais modos vale a preferência salva do jogador.
    this.waveManager.setEndlessMode(this.currentSavedEndlessMode || this.waveManager.isMorteCerta);
    if (this.waveManager.isMorteCerta) {
      this.waveManager.setAutoMode(true);
    } else if (this.currentSavedAutoMode) {
      this.waveManager.setAutoMode(true);
    }
    this.mapManager = new MapManager2D(this.currentSavedMapId);
    this.threeRenderer.buildMap(this.mapManager.getMapData(), this.currentSavedMapId, SpriteManager.getInstance());
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
      this.achievementManager,
      this.rng
    );
    this.replayEngine = new ReplayEngine(this.runSeed, this.currentSavedMapId, this.currentSavedChallengeMode);
    this.towerManager.setReplayEngine(this.replayEngine);
    this.enemyManager = new EnemyManager2D(
      this.mapManager,
      this.gameState,
      this.waveManager,
      this.audioManager,
      this.analyticsManager,
      this.achievementManager,
      this.rng
    );

    // Overgrowth Sprout (Broto Selvagem): recurso exclusivo do Green Valley (MAP_1)
    this.towerManager.sproutTiles = this.currentSavedMapId === 'MAP_1'
      ? this.mapManager.pickSproutTiles(4, this.rng)
      : [];

    // Altar Obscuro (Dark Altar): recurso exclusivo do Grave Pass (MAP_4)
    this.towerManager.darkAltarTiles = this.currentSavedMapId === 'MAP_4'
      ? this.mapManager.pickDarkAltarTiles(3, this.rng)
      : [];
    if (this.uiManager) {
      this.uiManager.destroy();
    }

    this.hasAwardedStars = false;
    // Managers foram recriados: descarta tempo acumulado da partida anterior.
    this.simAccumulatorMs = 0;
    this.fxAccumulatorMs = 0;
    this.cachedEarlyCallBonus = 0;
    this.tooltipGrid = null;
    this.longPressFired = false;

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

  public get currentMapId(): MapId {
    return this.currentSavedMapId;
  }

  public changeMap(mapId: MapId) {
    this.currentSavedMapId = mapId;
    this.initGame();
  }
  public changeChallengeMode(mode: ChallengeMode) {
    this.currentSavedChallengeMode = mode;
    this.initGame();
  }

  /**
   * Liga/desliga o Modo Infinito na partida atual e persiste a preferência
   * para sobreviver a restart/troca de mapa/troca de modo (exceto Morte
   * Certa, que sempre força infinito independente disto).
   */
  public setEndlessMode(enabled: boolean) {
    this.currentSavedEndlessMode = enabled;
    this.waveManager.setEndlessMode(enabled || this.waveManager.isMorteCerta);
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

    const canvasRatio = this.canvas.width / this.canvas.height;
    const contentRatio = contentWidth / contentHeight;

    let renderedWidth = contentWidth;
    let renderedHeight = contentHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (contentRatio > canvasRatio) {
      renderedWidth = contentHeight * canvasRatio;
      offsetX = (contentWidth - renderedWidth) / 2;
    } else {
      renderedHeight = contentWidth / canvasRatio;
      offsetY = (contentHeight - renderedHeight) / 2;
    }

    const scaleX = this.canvas.width / (renderedWidth || 1);
    const scaleY = this.canvas.height / (renderedHeight || 1);

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

    const rawX = (clientX - rect.left - borderLeft - offsetX) * scaleX;
    const rawY = (clientY - rect.top - borderTop - offsetY) * scaleY;

    const x = Math.max(0, Math.min(this.canvas.width - 1, rawX));
    const y = Math.max(0, Math.min(this.canvas.height - 1, rawY));

    return { x, y };
  }

  /**
   * Tamanho, em pixels CSS, da imagem 840×600 de fato desenhada dentro da
   * caixa do canvas — considera o letterboxing do `object-fit: contain`
   * (a caixa do elemento pode ser maior que a imagem quando a proporção da
   * tela não bate 14:10). Mesma matemática de `getCanvasMousePosition`,
   * reaproveitada aqui só para calcular `uiScale` (E1).
   */
  private computeCanvasRenderedSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    const borderLeft = this.canvas.clientLeft || 0;
    const borderTop = this.canvas.clientTop || 0;
    const contentWidth = rect.width - borderLeft * 2;
    const contentHeight = rect.height - borderTop * 2;

    const canvasRatio = this.canvas.width / this.canvas.height;
    const contentRatio = contentWidth / (contentHeight || 1);

    let renderedWidth = contentWidth;
    let renderedHeight = contentHeight;
    if (contentRatio > canvasRatio) {
      renderedWidth = contentHeight * canvasRatio;
    } else {
      renderedHeight = contentWidth / (canvasRatio || 1);
    }
    return { width: renderedWidth, height: renderedHeight };
  }

  /**
   * Recalcula `uiScale` a partir da largura CSS real do canvas. Chamado
   * sempre que `syncCanvasWidth()` roda (resize/orientationchange/
   * ResizeObserver), então some assim que o layout muda de novo.
   */
  private updateUiScale() {
    const { width } = this.computeCanvasRenderedSize();
    if (width > 0) {
      this.uiScale = Math.max(1, Math.min(3, 840 / width));
    }
  }

  private setupListeners() {
    // Global User Interaction Listener to Unlock Web Audio API in Browsers
    const unlockAudio = () => {
      this.audioManager.unlockAudio();
      if (!this.audioManager.isBGMPlaying && !this.audioManager.isBgmMuted && (this.gameState.status === 'PLAYING' || this.gameState.status === 'PREPARATION')) {
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
      if (rect.width <= 0 || rect.height <= 0) return;
      document.documentElement.style.setProperty('--canvas-width', `${Math.round(rect.width)}px`);
      document.documentElement.style.setProperty('--canvas-height', `${Math.round(rect.height)}px`);
      this.updateUiScale();
    };
    syncCanvasWidth();
    window.addEventListener('resize', syncCanvasWidth);
    window.addEventListener('orientationchange', syncCanvasWidth);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncCanvasWidth);
      ro.observe(this.canvas);
    }

    // Keyboard Hotkeys (D2): 1-5 seleciona torre, Q/W arma Meteoro/Congelamento,
    // Enter inicia a próxima onda, Esc cancela magia armada/desseleciona torre,
    // U/S upgrade/vende a torre selecionada, R alterna todos os alcances,
    // Shift+1/2/3 troca a velocidade do jogo.
    const digitToTower: Record<string, TowerType> = {
      Digit1: 'BASIC',
      Digit2: 'FROST',
      Digit3: 'SOLAR_PRISM',
      Digit4: 'CANNON',
      Digit5: 'ARTILLERY',
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'KeyP') {
        e.preventDefault();
        this.gameState.togglePause();
        return;
      }

      // Suprimido com um modal aberto (configurações, talentos, placar,
      // perfil, draft roguelite...) ou com o foco num campo de texto/select —
      // digitar "S" no nome de perfil não deveria vender uma torre.
      const target = e.target as HTMLElement | null;
      const isTypingTarget = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      const isModalOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
      if (isTypingTarget || isModalOpen) return;
      if (this.gameState.status !== 'PLAYING' && this.gameState.status !== 'PREPARATION') return;

      if (e.shiftKey && (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3')) {
        e.preventDefault();
        const speed = e.code === 'Digit1' ? 1 : e.code === 'Digit2' ? 2 : 4;
        this.uiManager.setGameSpeed(speed);
        return;
      }

      const towerType = digitToTower[e.code];
      if (towerType) {
        e.preventDefault();
        this.towerManager.setSelectedBuildType(towerType);
        return;
      }

      switch (e.code) {
        case 'KeyQ':
          e.preventDefault();
          this.spellManager.selectSpell('METEOR');
          break;
        case 'KeyW':
          e.preventDefault();
          this.spellManager.triggerGlobalFreeze(this.enemyManager.getEnemies());
          break;
        case 'Enter':
          e.preventDefault();
          this.waveManager.startNextWave();
          break;
        case 'Escape':
          e.preventDefault();
          // Sem este atalho o Meteoro armado não tinha como ser desarmado pelo
          // teclado — o comentário em handleTap() sobre o clique com ouro
          // insuficiente documenta um travamento real causado por isso. Esc
          // sempre desarma a magia primeiro; só então desfaz seleção de tile
          // (mobile) ou de torre (inspector).
          if (this.spellManager.activeSpell !== null) {
            this.spellManager.selectSpell(null);
          } else if (this.isMobile && this.mobileSelectedGrid) {
            this.cancelMobileTileSelection();
          } else if (this.towerManager.selectedTower) {
            this.towerManager.selectedTower = null;
            EventBus.getInstance().emit('tower:select', null);
          }
          break;
        case 'KeyU':
          e.preventDefault();
          this.towerManager.upgradeSelectedTower();
          break;
        case 'KeyS':
          e.preventDefault();
          // Passa pela confirmação da UIManager (D4): o mesmo atalho não pode
          // vender uma torre nível 3 com upgrades caros de primeira.
          this.uiManager.requestSellSelectedTower();
          break;
        case 'KeyR':
          e.preventDefault();
          this.towerManager.toggleShowAllRanges();
          break;
        default:
          break;
      }
    });
    EventBus.getInstance().on('wave:start', () => {
      if (this.gameState.status === 'PREPARATION') {
        this.gameState.setStatus('PLAYING');
      }
      // Chamada antecipada de onda (P1_BALANCE_SPEC.md §3.3): o evento só
      // dispara quando `startNextWave()` de fato retornou `true`, então o
      // bônus cacheado (última leitura de `getEarlyCallBonus()` antes deste
      // clique) é sempre relativo a uma onda que começou — nunca a um clique
      // que falhou (onda já ativa, duplo clique etc.).
      if (this.cachedEarlyCallBonus > 0) {
        this.gameState.addGold(this.cachedEarlyCallBonus);
        this.cachedEarlyCallBonus = 0;
      }
    });
    EventBus.getInstance().on('wave:end', () => {
      // Decaimento de custo das magias por ondas sem uso (P1_BALANCE_SPEC.md §5.4).
      this.spellManager.onWaveCompleted();
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

    // --- Press-and-hold: abre o tip do tile sem executar a ação ---
    // Pointer Events unificam mouse, toque e caneta; a ação em si continua no
    // click/touchend existente, e o flag longPressFired impede que a mesma
    // pressão também construa ou selecione.
    const cancelLongPress = () => {
      if (this.longPressTimer !== null) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
      this.pressOrigin = null;
    };

    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.gameState.status !== 'PLAYING' && this.gameState.status !== 'PREPARATION') return;
      cancelLongPress();
      this.longPressFired = false;

      const { x, y } = this.getCanvasMousePosition(e);
      const currentGridX = Math.floor(x / this.mapManager.tileSize);
      const currentGridY = Math.floor(y / this.mapManager.tileSize);

      // Dismiss tooltip if pointer down on a different tile
      if (this.tooltipGrid && (this.tooltipGrid.x !== currentGridX || this.tooltipGrid.y !== currentGridY)) {
        this.tooltipGrid = null;
      }

      this.pressOrigin = { x, y };

      this.longPressTimer = setTimeout(() => {
        this.longPressTimer = null;
        if (!this.pressOrigin) return;
        this.longPressFired = true;
        this.tooltipGrid = {
          x: Math.floor(this.pressOrigin.x / this.mapManager.tileSize),
          y: Math.floor(this.pressOrigin.y / this.mapManager.tileSize),
        };
      }, Game2D.LONG_PRESS_MS);
    });

    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.pressOrigin) return;
      const { x, y } = this.getCanvasMousePosition(e);
      const moved = Math.hypot(x - this.pressOrigin.x, y - this.pressOrigin.y);
      if (moved > Game2D.LONG_PRESS_MOVE_TOLERANCE) cancelLongPress();
    });
    const endPress = () => {
      cancelLongPress();
      if (!this.isMobile) {
        this.tooltipGrid = null;
      }
    };
    this.canvas.addEventListener('pointerup', endPress);
    this.canvas.addEventListener('pointercancel', endPress);
    this.canvas.addEventListener('pointerleave', endPress);
    // Long-press no toque abriria o menu de contexto / lupa do sistema.
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const handleTap = (e: MouseEvent | TouchEvent) => {
      if ((this.gameState.status !== 'PLAYING' && this.gameState.status !== 'PREPARATION') || this.gameState.isPaused) return;

      // A pressão já foi consumida pelo tip: não constrói nem seleciona.
      if (this.longPressFired) {
        this.longPressFired = false;
        return;
      }

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
        const casted = this.spellManager.castMeteorAt(x, y, this.enemyManager.getEnemies());
        if (!casted) {
          // castMeteorAt() só desarma a magia quando ela sai. Um lançamento
          // impossível (sem ouro, em cooldown, modo sem magias) deixava METEOR
          // armado e este return engolia TODO clique no canvas depois disso —
          // o jogador não conseguia mais selecionar nem construir torre.
          // Desarma e trata o clique como cancelamento, para não gastar ouro
          // construindo onde ele estava mirando.
          this.spellManager.selectSpell(null);
        }
        return;
      }

      // Handle Tower Placement / Selection
      const gridX = Math.floor(x / this.mapManager.tileSize);
      const gridY = Math.floor(y / this.mapManager.tileSize);

      if (this.isMobile) {
        const existingTower = this.towerManager.getTowerAt(gridX, gridY);
        if (existingTower) {
          this.mobileSelectedGrid = null;
          this.hoveredGrid = null;
          this.towerManager.placeTower(gridX, gridY);
          return;
        }

        const isSameTile = this.mobileSelectedGrid && this.mobileSelectedGrid.x === gridX && this.mobileSelectedGrid.y === gridY;
        if (isSameTile) {
          this.mobileSelectedGrid = null;
          this.hoveredGrid = null;
          this.towerManager.placeTower(gridX, gridY);
        } else {
          this.mobileSelectedGrid = { x: gridX, y: gridY };
          this.hoveredGrid = { x: gridX, y: gridY };
        }
      } else {
        this.towerManager.placeTower(gridX, gridY);
      }
    };

    this.canvas.addEventListener('click', handleTap);
    this.canvas.addEventListener('touchend', (e) => {
      if (e.cancelable) e.preventDefault();
      handleTap(e);
    }, { passive: false });
  }

  private renderGhostPlacement() {
    const gridToDraw = this.hoveredGrid || (this.isMobile ? this.mobileSelectedGrid : null);
    if (!gridToDraw || (this.gameState.status !== 'PLAYING' && this.gameState.status !== 'PREPARATION') || this.gameState.isPaused || this.spellManager.activeSpell !== null) return;

    const { x, y } = gridToDraw;
    const existing = this.towerManager.getTowerAt(x, y);
    if (existing) return;

    const isBuildable = this.mapManager.isBuildable(x, y);
    const cost = this.towerManager.getTowerCost(this.towerManager.selectedBuildType);
    const canAfford = this.gameState.gold >= cost;

    const size = this.mapManager.tileSize;
    const isValid = isBuildable && canAfford;

    // Range visualizer for ghost placement
    const config = Tower2D.getTowerConfig(this.towerManager.selectedBuildType);
    let range = config.range;
    const isSproutTile = this.towerManager.sproutTiles.some(s => s.x === x && s.y === y);
    if (isSproutTile) {
      range = Math.round(range * 1.25);
    }
    const centerX = (x + 0.5) * size;
    const centerY = (y + 0.5) * size;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, range, 0, Math.PI * 2);
    this.ctx.fillStyle = isValid ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)';
    this.ctx.fill();
    this.ctx.strokeStyle = isValid ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Tile preview box
    this.ctx.fillStyle = isValid ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)';
    this.ctx.fillRect(x * size, y * size, size, size);
    this.ctx.strokeStyle = isValid ? '#4caf50' : '#f44336';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x * size, y * size, size, size);
    this.ctx.restore();
  }

  /**
   * Sincroniza o hint DOM "toque de novo para construir · Xg" (E5) com o tile
   * selecionado no mobile — o ghost em si continua desenhado no canvas por
   * `renderGhostPlacement()`; este hint só existe como DOM (não canvas) para
   * poder ter um botão ✖ clicável de verdade e não ficar ilegível em telas
   * pequenas (mesmo motivo do tip de tile em E1).
   */
  private updateBuildHint() {
    if (!this.isMobile) {
      this.buildHintEl.classList.add('hidden');
      return;
    }

    const grid = this.mobileSelectedGrid;
    const isActiveState = this.gameState.status === 'PLAYING' || this.gameState.status === 'PREPARATION';
    if (!grid || !isActiveState || this.gameState.isPaused || this.spellManager.activeSpell !== null) {
      this.buildHintEl.classList.add('hidden');
      return;
    }

    const { x, y } = grid;
    // Toque num tile com torre existente seleciona na hora (ver handleTap) —
    // não passa pelo fluxo de "selecionar tile vazio, tocar de novo".
    if (this.towerManager.getTowerAt(x, y)) {
      this.buildHintEl.classList.add('hidden');
      return;
    }

    const isBuildable = this.mapManager.isBuildable(x, y);
    const cost = this.towerManager.getTowerCost(this.towerManager.selectedBuildType);
    const canAfford = this.gameState.gold >= cost;

    const label = this.buildHintEl.querySelector('#build-hint-label');
    if (label) {
      label.textContent = !isBuildable
        ? 'Terreno não construível'
        : !canAfford
        ? `Ouro insuficiente · ${cost}g`
        : `Toque de novo para construir · ${cost}g`;
    }
    this.buildHintEl.classList.toggle('build-hint-invalid', !isBuildable || !canAfford);
    this.buildHintEl.classList.remove('hidden');

    // Posição em pixels CSS relativos a `#game-area` (mesmo ancestral
    // `position: relative` do canvas), considerando o letterboxing.
    const size = this.mapManager.tileSize;
    const gameAreaRect = this.gameAreaEl.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const { width: renderedWidth, height: renderedHeight } = this.computeCanvasRenderedSize();
    const scaleCss = renderedWidth / this.canvas.width;
    const offsetXCss = (canvasRect.width - renderedWidth) / 2;
    const offsetYCss = (canvasRect.height - renderedHeight) / 2;

    const tileTopCss = canvasRect.top - gameAreaRect.top + offsetYCss + y * size * scaleCss;
    const tileCenterXCss = canvasRect.left - gameAreaRect.left + offsetXCss + (x + 0.5) * size * scaleCss;

    this.buildHintEl.style.left = `${tileCenterXCss}px`;
    this.buildHintEl.style.top = `${tileTopCss}px`;
  }

  private renderAchievementToasts() {
    // Todas as medidas escaladas por uiScale (E1): num telefone pequeno o
    // toast de 12-14px de fonte ficava com ~6px reais — ilegível bem no
    // momento em que o jogo está tentando comemorar algo com o jogador.
    const s = this.uiScale;
    for (let i = 0; i < this.achievementManager.activeToasts.length; i++) {
      const toast = this.achievementManager.activeToasts[i];
      const width = 280 * s;
      const height = 48 * s;
      const x = this.canvas.width - width - 16 * s;
      const y = 16 * s + i * (56 * s);

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(30, 30, 30, 0.92)';
      this.ctx.fillRect(x, y, width, height);

      this.ctx.strokeStyle = '#f57f17';
      this.ctx.lineWidth = 2 * s;
      this.ctx.strokeRect(x, y, width, height);

      this.ctx.fillStyle = '#ffeb3b';
      this.ctx.font = `bold ${Math.round(14 * s)}px Arial`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`${toast.icon} Achievement Unlocked!`, x + 10 * s, y + 20 * s);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${Math.round(12 * s)}px Arial`;
      this.ctx.fillText(`${toast.title} (+${toast.reward} ★)`, x + 10 * s, y + 38 * s);
      this.ctx.restore();
    }
  }

  /**
   * Conteúdo do tip de um tile. Separado do desenho para poder ser testado sem
   * canvas.
   */
  public getTileTipLines(gridX: number, gridY: number): { text: string; color: string }[] {
    const linhas: { text: string; color: string }[] = [];
    const tower = this.towerManager.getTowerAt(gridX, gridY);
    const isDarkAltar = this.towerManager.isDarkAltarTile(gridX, gridY);

    const isSprout = this.towerManager.isSproutTile(gridX, gridY);

    if (tower) {
      const spec = tower.data.specialization
        ? getSpecializationOption(tower.data.specialization)
        : undefined;
      linhas.push({
        text: spec
          ? `${tower.data.type} · ${spec.icon} ${spec.name}`
          : `${tower.data.type} — Nível ${tower.data.level}`,
        color: '#ffffff',
      });
      if (spec) linhas.push({ text: spec.description, color: '#b0bec5' });
      linhas.push({
        text: `⚔️ ${tower.data.damage}   📏 ${tower.data.range}   ❤️ ${tower.data.hp}/${tower.data.maxHp}`,
        color: '#eceff1',
      });
      if (tower.data.onSproutTile) {
        linhas.push({ text: '🌱 Broto: +25% alcance · cadência 2x', color: '#aed581' });
      }
      if (tower.data.onDarkAltarTile) {
        linhas.push({ text: '💀 Altar Obscuro: +25% de dano necrótico', color: '#ce93d8' });
      }
      if (tower.data.isPowerSurged) {
        linhas.push({ text: '⚡ Power Surge: +20% cadência · +10% dano', color: '#80deea' });
      }
      if (tower.data.overheatTimer && tower.data.overheatTimer > 0) {
        linhas.push({ text: '🔥 Superaquecida por Lava! Ataques suspensos', color: '#ff8a80' });
      }
      return linhas;
    }

    if (isSprout) {
      linhas.push({ text: '🌱 Broto de Vegetação', color: '#c5e1a5' });
      linhas.push({ text: 'Torre construída aqui recebe:', color: '#b0bec5' });
      linhas.push({ text: '+25% de alcance', color: '#aed581' });
      linhas.push({ text: 'Cadência de tiro dobrada', color: '#aed581' });
    } else if (isDarkAltar) {
      linhas.push({ text: '💀 Altar Obscuro', color: '#ce93d8' });
      linhas.push({ text: 'Torre construída aqui recebe:', color: '#b0bec5' });
      linhas.push({ text: '+25% de Dano Necrótico', color: '#ba68c8' });
    } else if (this.mapManager.isBuildable(gridX, gridY)) {
      if (this.mapManager.isPowerSurgeTile(gridX, gridY)) {
        linhas.push({ text: '⚡ Conector Energizado', color: '#80deea' });
        linhas.push({ text: 'Torre aqui ganha +20% cadência e +10% dano', color: '#80deea' });
      } else {
        linhas.push({ text: 'Terreno livre', color: '#ffffff' });
      }
    } else {
      if (this.mapManager.isGeyserEruptingAt(gridX, gridY)) {
        linhas.push({ text: '🌋 Fissura de Lava Ativa!', color: '#ff8a80' });
        linhas.push({ text: 'Dano de fogo na rota · Superaquece torres ao lado', color: '#ff8a80' });
      } else {
        linhas.push({ text: 'Não construível', color: '#ff8a80' });
        linhas.push({ text: 'Caminho ou obstáculo', color: '#b0bec5' });
      }
      return linhas;
    }

    const tipo = this.towerManager.selectedBuildType;
    const custo = this.towerManager.getTowerCost(tipo);
    const podePagar = this.gameState.gold >= custo;
    linhas.push({
      text: `Construir ${tipo}: ${custo}g`,
      color: podePagar ? '#ffe082' : '#ff8a80',
    });

    return linhas;
  }

  /** Tip aberto por press-and-hold, desenhado junto ao tile pressionado. */
  private renderTileTooltip() {
    if (!this.tooltipGrid) return;

    const { x: gx, y: gy } = this.tooltipGrid;
    if (gx < 0 || gx >= this.mapManager.cols || gy < 0 || gy >= this.mapManager.rows) return;

    const linhas = this.getTileTipLines(gx, gy);
    if (linhas.length === 0) return;

    const ctx = this.ctx;
    ctx.save();

    // Todas as medidas escaladas por uiScale (E1): num telefone de ~360px o
    // fator de escala do CSS é ~0.43, e 11-12px no espaço interno do canvas
    // viravam ~5px reais — o press-and-hold abria uma caixa ilegível
    // justamente no aparelho para o qual o gesto foi pensado.
    const s = this.uiScale;
    const padding = 9 * s;
    const lineHeight = 15 * s;
    const titleFont = `bold ${Math.round(12 * s)}px Arial`;
    const bodyFont = `${Math.round(11 * s)}px Arial`;

    let largura = 0;
    linhas.forEach((linha, i) => {
      ctx.font = i === 0 ? titleFont : bodyFont;
      largura = Math.max(largura, ctx.measureText(linha.text).width);
    });

    const boxW = largura + padding * 2;
    const boxH = linhas.length * lineHeight + padding * 2 - 3 * s;
    const tile = this.mapManager.tileSize;

    // Acima do tile por padrão; abaixo se não couber. Sempre dentro do canvas.
    let boxX = gx * tile + tile / 2 - boxW / 2;
    let boxY = gy * tile - boxH - 8 * s;
    if (boxY < 4) boxY = gy * tile + tile + 8 * s;
    boxX = Math.max(4, Math.min(this.canvas.width - boxW - 4, boxX));
    boxY = Math.max(4, Math.min(this.canvas.height - boxH - 4, boxY));

    // Realce do tile sob pressão
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(12, 16, 20, 0.94)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    linhas.forEach((linha, i) => {
      ctx.font = i === 0 ? titleFont : bodyFont;
      ctx.fillStyle = linha.color;
      ctx.fillText(linha.text, boxX + padding, boxY + padding + 10 * s + i * lineHeight);
    });

    ctx.restore();
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
    this.mapManager.updateHazards(stepMs / 16.66);

    // Simulação do Hazard de Lava (MAP_2)
    if (this.mapManager.hazardState?.type === 'LAVA_GEYSER') {
      const tileSize = this.mapManager.tileSize;
      for (const g of this.mapManager.hazardState.geysers) {
        if (!g.isActive) continue;
        const gWorldX = g.gridX * tileSize + tileSize / 2;
        const gWorldY = g.gridY * tileSize + tileSize / 2;

        for (const enemy of this.enemyManager.getEnemies()) {
          if (enemy.data.isDead) continue;
          const dx = Math.abs(enemy.data.position.x - gWorldX);
          const dy = Math.abs(enemy.data.position.y - gWorldY);
          if (dx <= tileSize / 2 && dy <= tileSize / 2) {
            // Dano ambiental do gêiser: ignora armadura e não é esquivável.
            enemy.takeDamage(1, 1, false);
            this.particleManager.spawnEmber(enemy.data.position.x, enemy.data.position.y);
          }
        }

        for (const tower of this.towerManager.getTowers()) {
          const dx = Math.abs(tower.data.gridX - g.gridX);
          const dy = Math.abs(tower.data.gridY - g.gridY);
          if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
            tower.data.overheatTimer = 180;
          }
        }
      }
    }
    // Simulação do Hazard do Cemitério Obscuro (MAP_4)
    if (this.mapManager.hazardState?.type === 'GRAVEYARD_SOULS') {
      const tileSize = this.mapManager.tileSize;
      for (const g of this.mapManager.hazardState.geysers) {
        if (!g.isActive) continue;
        const gWorldX = g.gridX * tileSize + tileSize / 2;
        const gWorldY = g.gridY * tileSize + tileSize / 2;

        for (const enemy of this.enemyManager.getEnemies()) {
          if (enemy.data.isDead) continue;
          const dx = Math.abs(enemy.data.position.x - gWorldX);
          const dy = Math.abs(enemy.data.position.y - gWorldY);
          if (dx <= tileSize && dy <= tileSize) {
            enemy.applySlow(0.7, 30);
            this.particleManager.spawnEmber(enemy.data.position.x, enemy.data.position.y, 2, '#00e676');
          }
        }
      }
    }

    this.replayEngine.advanceTick();
    // Lido ANTES de updateAutoCountdown decrementar o contador deste passo —
    // é o snapshot que o listener de 'wave:start' vai usar para creditar o
    // bônus da chamada antecipada (ver `cachedEarlyCallBonus` acima).
    this.cachedEarlyCallBonus = this.waveManager.getEarlyCallBonus();
    this.waveManager.updateAutoCountdown(stepMs);
    this.enemyManager.update(stepMs, this.towerManager.getTowers());
    this.towerManager.update(this.enemyManager.getEnemies(), this.fxManager);
    this.projectileManager.update(this.enemyManager.getEnemies(), this.fxManager, this.analyticsManager, this.gameState);
    this.spellManager.update(stepMs);
    this.particleManager.update(this.enemyManager.getEnemies(), this.fxManager);

    const isWaveActiveNow = this.waveManager.isWaveActive;
    // Onda que terminou exatamente neste passo (null se nenhuma acabou agora).
    // Capturado antes de decidir vitória/draft, para os dois lerem o mesmo valor.
    const completedWave = this.wasWaveActive && !isWaveActiveNow
      ? this.waveManager.currentWaveIndex + 1
      : null;
    this.wasWaveActive = isWaveActiveNow;

    if (this.waveManager.isEndlessMode) {
      this.achievementManager.setProgress('ENDLESS_SURVIVOR', this.waveManager.currentWaveIndex + 1);
    }

    if (this.gameState.status !== 'PLAYING' && this.gameState.status !== 'PREPARATION') return false;

    // Check Victory — checado ANTES do Draft Roguelite de propósito: os dois
    // podiam disparar no mesmo passo quando a campanha (10 ondas) terminava,
    // fazendo o modal de vitória competir com o de draft pela tela. Retornar
    // aqui primeiro suprime o draft implicitamente em qualquer run que já acabou.
    if (this.waveManager.isLastWaveCompleted(this.enemyManager.getEnemies().length)) {
      this.gameState.setStatus('VICTORY');
      return false;
    }

    // Draft Roguelite: exclusivo do modo MORTE_CERTA.
    // Na campanha (10 ondas) dispara nas ondas 3/6/9 — a 10ª
    // nunca chega aqui porque a vitória já retornou acima. No endless, sem
    // linha de chegada, mantém o ritmo original de 5 em 5 (5/10/15/20...).
    if (completedWave !== null && this.gameState.challengeMode === 'MORTE_CERTA') {
      const isDraftWave = this.waveManager.isEndlessMode
        ? completedWave % 5 === 0
        : completedWave === 3 || completedWave === 6 || completedWave === 9;
      if (isDraftWave) {
        this.uiManager.triggerDraftModal(undefined, this.rng);
      }
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
    this.achievementManager.update(stepMs);
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

      // Update BGM Tension Level & WebGL Vignette Shaders
      const isCriticalHp = this.gameState.baseHp <= 3;
      const enemyCount = enemies.filter(e => !e.data.isDead).length;
      // Limiar recalibrado pela Entrega 4 (P1_BALANCE_SPEC.md §4.1): a densidade
      // nova de onda (§4.4) cruza 8 inimigos simultâneos com folga a partir da
      // onda 3; o limiar antigo (20) quase nunca disparava com a onda antiga.
      const tension = isCriticalHp ? 1.0 : (hasBossOnScreen ? 0.85 : (enemyCount > 8 ? 0.5 : 0.0));
      this.audioManager.setTensionLevel(tension);
      this.threeRenderer.setVignetteIntensity(isCriticalHp ? 0.7 : 0.0);

      // Manage BGM state & tempo
      if ((this.gameState.status === 'PLAYING' || this.gameState.status === 'PREPARATION') && !this.gameState.isPaused) {
        if (!this.audioManager.isBGMPlaying && !this.audioManager.isBgmMuted) {
          this.audioManager.startBGM(this.gameSpeedMultiplier, targetTrack);
        } else {
          this.audioManager.updateBGMTempo(this.gameSpeedMultiplier, targetTrack);
        }
      } else {
        this.audioManager.stopBGM();
      }

      // 1. Update logic (only if active and NOT paused)
      if ((this.gameState.status === 'PLAYING' || this.gameState.status === 'PREPARATION') && !this.gameState.isPaused) {
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

      // 1. Render WebGL background (terrain)
      this.threeRenderer.render();

      // 2. Render frame
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const shake = this.fxManager.getShakeOffset();
      this.ctx.save();
      this.ctx.translate(shake.x, shake.y);

      this.mapManager.render(this.ctx);
      this.mapManager.renderHazards(this.ctx);
      this.towerManager.renderSproutTiles(this.ctx, this.mapManager.tileSize);
      this.towerManager.renderDarkAltarTiles(this.ctx, this.mapManager.tileSize);
      this.particleManager.render(this.ctx);
      this.renderGhostPlacement();
      this.updateBuildHint();
      this.towerManager.render(this.ctx, this.mousePos);
      this.enemyManager.render(this.ctx, this.uiScale);
      this.projectileManager.render(this.ctx);
      this.spellManager.renderSpellTargeting(this.ctx, this.mousePos);
      this.fxManager.render(this.ctx, this.uiScale);

      this.renderAchievementToasts();
      this.renderPauseOverlay();
      // Depois do overlay de pause: inspecionar tile com o jogo pausado é útil.
      this.renderTileTooltip();
      this.renderVignetteOverlay();

      this.ctx.restore();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
  private renderVignetteOverlay() {
    if (!this.threeRenderer || this.threeRenderer.vignetteIntensity <= 0) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerRadius = Math.max(w, h) / 1.2;

    const gradient = this.ctx.createRadialGradient(cx, cy, outerRadius * 0.4, cx, cy, outerRadius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(180, 0, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(230, 0, 0, 0.55)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }
}
