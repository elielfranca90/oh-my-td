// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { Game2D } from '../src/engine/Game';

/**
 * Cobre o roteamento do clique no canvas — seleção/construção de torre e a
 * interação com magia armada. Era a única parte do input sem nenhum teste.
 */
describe('Roteamento do clique no canvas', () => {
  const TILE = 60;
  // (4,2) é grama construível no MAP_1, encostada no corredor superior.
  const TORRE_X = 4 * TILE + TILE / 2;
  const TORRE_Y = 2 * TILE + TILE / 2;

  beforeEach(() => {
    // happy-dom não implementa canvas 2D; o que está sob teste é o roteamento
    // do clique, não o desenho.
    const fakeCtx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'canvas') return document.createElement('canvas');
          if (prop === 'measureText') return () => ({ width: 10 });
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
            return () => ({ addColorStop: () => {} });
          }
          if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
          return () => {};
        },
        set: () => true,
      }
    );
    (HTMLCanvasElement.prototype as any).getContext = () => fakeCtx;

    document.body.innerHTML = `<div id="game-area"></div><div id="ui-container"></div>`;
  });

  const setup = () => {
    const game = new Game2D();
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    // happy-dom devolve rect zerado; forja o rect real de 840x600.
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 840, height: 600, right: 840, bottom: 600, x: 0, y: 0 }) as DOMRect;

    const clickAt = (x: number, y: number) =>
      canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));

    return {
      game,
      clickAt,
      towerManager: (game as any).towerManager,
      spellManager: game.spellManager,
      gameState: game.gameState,
      inspector: () => document.getElementById('inspector-state')!,
    };
  };

  it('deve construir a torre e abrir o inspetor num único clique', () => {
    const { clickAt, towerManager, inspector } = setup();

    clickAt(TORRE_X, TORRE_Y);

    expect(towerManager.getTowers().length).toBe(1);
    expect(towerManager.selectedTower).not.toBeNull();
    expect(inspector().classList.contains('hidden')).toBe(false);
  });

  it('deve reabrir o inspetor no PRIMEIRO clique sobre torre já existente', () => {
    const { clickAt, towerManager, inspector } = setup();

    clickAt(TORRE_X, TORRE_Y); // constrói
    document.getElementById('inspector-close-btn')!.click(); // desseleciona
    expect(towerManager.selectedTower).toBeNull();
    expect(inspector().classList.contains('hidden')).toBe(true);

    clickAt(TORRE_X, TORRE_Y); // um único clique na torre

    expect(towerManager.selectedTower).not.toBeNull();
    expect(inspector().classList.contains('hidden')).toBe(false);
  });

  it('não deve deixar magia impossível engolir os cliques seguintes', () => {
    const { clickAt, towerManager, spellManager, gameState } = setup();

    // Meteoro custa 150g e a partida começa com 70g: o lançamento é impossível.
    spellManager.selectSpell('METEOR');
    expect(spellManager.activeSpell).toBe('METEOR');
    const ouroAntes = gameState.gold;

    // 1º clique: cancela a magia sem gastar ouro nem construir
    clickAt(TORRE_X, TORRE_Y);
    expect(spellManager.activeSpell).toBeNull();
    expect(gameState.gold).toBe(ouroAntes);
    expect(towerManager.getTowers().length).toBe(0);

    // 2º clique: volta a funcionar normalmente. Antes da correção METEOR
    // continuava armado e NENHUM clique no canvas voltava a funcionar.
    clickAt(TORRE_X, TORRE_Y);
    expect(towerManager.getTowers().length).toBe(1);
  });

  it('deve consumir o clique e desarmar quando o meteoro realmente sai', () => {
    const { clickAt, towerManager, spellManager, gameState } = setup();

    gameState.gold = 1000; // agora o meteoro é pagável
    spellManager.selectSpell('METEOR');

    clickAt(TORRE_X, TORRE_Y);

    // A magia saiu: cobrou, desarmou e não construiu torre nenhuma
    expect(spellManager.activeSpell).toBeNull();
    expect(gameState.gold).toBeLessThan(1000);
    expect(towerManager.getTowers().length).toBe(0);
  });

  it('não deve reagir a clique com o jogo pausado', () => {
    const { clickAt, towerManager, gameState } = setup();

    gameState.togglePause();
    expect(gameState.isPaused).toBe(true);

    clickAt(TORRE_X, TORRE_Y);
    expect(towerManager.getTowers().length).toBe(0);

    gameState.togglePause();
    clickAt(TORRE_X, TORRE_Y);
    expect(towerManager.getTowers().length).toBe(1);
  });
});
