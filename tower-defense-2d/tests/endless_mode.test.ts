// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { Game2D } from '../src/engine/Game';

/**
 * Cobre a persistência do Modo Infinito fora do Morte Certa. Antes, `initGame()`
 * só ligava `isEndlessMode` quando o modo desafio era MORTE_CERTA e resetava pra
 * `false` em qualquer restart/troca de mapa/troca de modo — o toggle de
 * Configurações "pegava" na hora mas sumia no próximo initGame().
 */
describe('Persistência do Modo Infinito entre modos de desafio', () => {
  beforeEach(() => {
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

  it('mantém o Modo Infinito ligado no modo Padrão após um restart', () => {
    const game = new Game2D();
    expect(game.waveManager.isEndlessMode).toBe(false);

    game.setEndlessMode(true);
    expect(game.waveManager.isEndlessMode).toBe(true);

    (game as any).restartGame();
    expect(game.waveManager.isEndlessMode).toBe(true);
  });

  it('mantém a preferência através de troca de mapa e de modo desafio (fora do Morte Certa)', () => {
    const game = new Game2D();
    game.setEndlessMode(true);

    game.changeMap('MAP_2');
    expect(game.waveManager.isEndlessMode).toBe(true);

    game.changeChallengeMode('TURBO_GOLD');
    expect(game.waveManager.isEndlessMode).toBe(true);
  });

  it('Morte Certa sempre força infinito, mesmo com a preferência desligada', () => {
    const game = new Game2D();
    expect(game.waveManager.isEndlessMode).toBe(false);

    game.changeChallengeMode('MORTE_CERTA');
    expect(game.waveManager.isEndlessMode).toBe(true);
  });

  it('ao sair do Morte Certa, o infinito volta a respeitar a preferência salva', () => {
    const game = new Game2D();
    game.changeChallengeMode('MORTE_CERTA');
    expect(game.waveManager.isEndlessMode).toBe(true);

    game.changeChallengeMode('NORMAL');
    expect(game.waveManager.isEndlessMode).toBe(false);

    game.setEndlessMode(true);
    game.changeChallengeMode('MORTE_CERTA');
    expect(game.waveManager.isEndlessMode).toBe(true);

    game.changeChallengeMode('NORMAL');
    expect(game.waveManager.isEndlessMode).toBe(true);
  });
});
