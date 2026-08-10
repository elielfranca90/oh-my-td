// @vitest-environment happy-dom
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isMobileDevice, initMobileDetection } from '../src/helpers/device';
import { Game2D } from '../src/engine/Game';
import { UIManager } from '../src/ui/UIManager';
import { GameState } from '../src/engine/GameState';
import { TalentManager } from '../src/engine/TalentManager';
import { AchievementManager } from '../src/engine/AchievementManager';

describe('Mobile UI/UX & Touch Controls Integration', () => {
  const TILE = 60;
  // (4, 2) é um tile de grama construível no MAP_1
  const TILE_X = 4 * TILE + TILE / 2;
  const TILE_Y = 2 * TILE + TILE / 2;

  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = `<div id="game-area"></div><div id="ui-container"></div>`;

    const fakeCtx = new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'measureText') return () => ({ width: 50 });
          return () => {};
        },
      }
    );
    (HTMLCanvasElement.prototype as any).getContext = () => fakeCtx;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Device Detection (isMobileDevice & initMobileDetection)', () => {
    it('deve adicionar a classe .is-mobile no body quando for dispositivo móvel', () => {
      // Mock window.matchMedia com pointer: coarse
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('(pointer: coarse)'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const isMobile = initMobileDetection();
      expect(isMobile).toBe(true);
      expect(document.body.classList.contains('is-mobile')).toBe(true);
    });

    it('deve remover a classe .is-mobile no body quando não for móvel', () => {
      document.body.classList.add('is-mobile');
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const isMobile = initMobileDetection();
      expect(isMobile).toBe(false);
      expect(document.body.classList.contains('is-mobile')).toBe(false);
    });
  });

  describe('Controles Touch no Game2D (Double Tap to Build)', () => {
    const setupMobileGame = () => {
      const game = new Game2D();
      game.isMobile = true;
      const canvas = game.canvas;
      canvas.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 840, height: 600, right: 840, bottom: 600, x: 0, y: 0 }) as DOMRect;

      const tapAt = (x: number, y: number) => {
        canvas.dispatchEvent(new MouseEvent('touchend', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
      };

      const pointer = (type: string, x: number, y: number) => {
        canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
      };

      return {
        game,
        canvas,
        tapAt,
        pointer,
        towerManager: (game as any).towerManager,
      };
    };

    it('no mobile, o 1º toque deve apenas selecionar o tile e mostrar o ghost preview, sem construir', () => {
      const { tapAt, towerManager, game } = setupMobileGame();

      tapAt(TILE_X, TILE_Y);

      // Não deve ter construído ainda
      expect(towerManager.getTowers().length).toBe(0);
      // Deve ter selecionado o tile mobile
      expect((game as any).mobileSelectedGrid).toEqual({ x: 4, y: 2 });
    });

    it('no mobile, o 2º toque no MESMO tile deve construir a torre', () => {
      const { tapAt, towerManager, game } = setupMobileGame();

      // 1º toque -> seleciona
      tapAt(TILE_X, TILE_Y);
      expect(towerManager.getTowers().length).toBe(0);

      // 2º toque no mesmo tile -> constrói
      tapAt(TILE_X, TILE_Y);
      expect(towerManager.getTowers().length).toBe(1);
      expect((game as any).mobileSelectedGrid).toBeNull();
    });

    it('no mobile, um toque num tile diferente move a seleção do ghost sem construir', () => {
      const { tapAt, towerManager, game } = setupMobileGame();

      const OTHER_X = 5 * TILE + TILE / 2;
      const OTHER_Y = 2 * TILE + TILE / 2;

      // 1º toque no tile (4, 2)
      tapAt(TILE_X, TILE_Y);
      expect((game as any).mobileSelectedGrid).toEqual({ x: 4, y: 2 });
      expect(towerManager.getTowers().length).toBe(0);

      // 1º toque no tile (5, 2)
      tapAt(OTHER_X, OTHER_Y);
      expect((game as any).mobileSelectedGrid).toEqual({ x: 5, y: 2 });
      expect(towerManager.getTowers().length).toBe(0);
    });

    it('no mobile, toque em torre existente seleciona imediatamente', () => {
      const { tapAt, towerManager, game } = setupMobileGame();

      // Primeiro constrói com 2 toques
      tapAt(TILE_X, TILE_Y);
      tapAt(TILE_X, TILE_Y);
      expect(towerManager.getTowers().length).toBe(1);

      // Desseleciona a torre
      towerManager.selectedTower = null;

      // Toque único na torre existente seleciona-a diretamente
      tapAt(TILE_X, TILE_Y);
      expect(towerManager.selectedTower).not.toBeNull();
    });

    it('no toque longo (press-and-hold), a tooltip deve permanecer visível após soltar e sumir ao tocar em outra região', async () => {
      const { pointer, game } = setupMobileGame();

      vi.useFakeTimers();

      // Pressiona e segura no tile (4, 2)
      pointer('pointerdown', TILE_X, TILE_Y);
      vi.advanceTimersByTime(Game2D.LONG_PRESS_MS + 10);

      // Tooltip deve estar ativa
      expect((game as any).tooltipGrid).toEqual({ x: 4, y: 2 });

      // Solta o toque (pointerup)
      pointer('pointerup', TILE_X, TILE_Y);

      // Tooltip DEVE continuar visível
      expect((game as any).tooltipGrid).toEqual({ x: 4, y: 2 });

      // Toca em outro tile (0, 0)
      pointer('pointerdown', 10, 10);

      // Tooltip DEVE ser fechada
      expect((game as any).tooltipGrid).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('Mobile Layout CSS Rules', () => {
    it('deve conter regras de overflow-x para a toolbar e HUD no mobile', () => {
      const indexPath = path.resolve(__dirname, '../index.html');
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      expect(htmlContent).toContain('.toolbar-items-row');
      expect(htmlContent).toMatch(/\.toolbar-items-row\s*\{[^}]*overflow-x:\s*auto;/);
      expect(htmlContent).toMatch(/\.hud-top\s*\{[^}]*overflow-x:\s*auto;/);
      expect(htmlContent).toContain('.hud-stats-bar');
    });

    // E2 (GAME_DESIGN_REVIEW.md): "Iniciar Onda" é o botão mais pressionado
    // da sessão e não pode voltar a ser o menor alvo de toque da tela.
    // O regex varre TODO bloco `.start-wave-main-btn { ... }` do arquivo —
    // em qualquer breakpoint — e falha se algum deles fixar min-height
    // abaixo de 48px (piso Apple HIG/Material). Isto é uma leitura de texto
    // bruto do CSS (o que o happy-dom consegue verificar de fato), não uma
    // avaliação de layout computado.
    it('".start-wave-main-btn" nunca deve ter min-height abaixo de 48px em nenhum breakpoint', () => {
      const indexPath = path.resolve(__dirname, '../index.html');
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      const blockMatches = [...htmlContent.matchAll(/\.start-wave-main-btn\s*\{([^}]*)\}/g)];
      expect(blockMatches.length).toBeGreaterThan(0);

      for (const [, blockBody] of blockMatches) {
        const minHeightMatch = blockBody.match(/min-height:\s*(\d+(?:\.\d+)?)px/);
        if (!minHeightMatch) continue; // bloco não redefine min-height, herda de outro seletor
        const value = Number(minHeightMatch[1]);
        expect(value).toBeGreaterThanOrEqual(48);
      }
    });

    // Guard-rail complementar: garante que nenhum OUTRO piso de alvo de
    // toque (grupo .toolbar-card/.btn/.toolbar-chip/.speed-btn) foi reduzido
    // nesta correção — a Tarefa 2 é estritamente aditiva para o botão de onda.
    it('não deve reduzir o piso de 38px do grupo .toolbar-card/.btn/.toolbar-chip/.speed-btn', () => {
      const indexPath = path.resolve(__dirname, '../index.html');
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      const groupMatch = htmlContent.match(
        /\.toolbar-card,\s*\.btn,\s*\.toolbar-chip,\s*\.speed-btn\s*\{([^}]*)\}/
      );
      expect(groupMatch).not.toBeNull();
      const minHeightMatch = groupMatch![1].match(/min-height:\s*(\d+(?:\.\d+)?)px/);
      expect(minHeightMatch).not.toBeNull();
      expect(Number(minHeightMatch![1])).toBeGreaterThanOrEqual(38);
    });
  });

  describe('A11 — Contador de badges do modal de conquistas', () => {
    it('AchievementManager.totalCount reflete o número real de conquistas (9), não um literal desatualizado', () => {
      const talentManager = new TalentManager();
      const achievementManager = new AchievementManager(talentManager);

      expect(achievementManager.totalCount).toBe(9);
      expect(Object.keys(achievementManager.achievements).length).toBe(achievementManager.totalCount);
    });

    it('o HTML inicial do modal de badges nasce com o denominador correto (9), não "0/7"', () => {
      document.body.innerHTML = `<div id="ui-container"></div>`;

      const talentManager = new TalentManager();
      const achievementManager = new AchievementManager(talentManager);
      const gameState = new GameState();

      new UIManager(
        gameState,
        {} as any,
        { getTowerCost: () => 50 } as any,
        {} as any,
        {} as any,
        talentManager,
        achievementManager,
        {} as any,
        { mapManager: { currentMapId: 'map_1' } } as any,
        () => {}
      );

      const summary = document.getElementById('achievements-summary');
      expect(summary).not.toBeNull();
      expect(summary?.textContent).toContain('0/9');
      expect(summary?.textContent).not.toContain('0/7');
    });
  });
});
