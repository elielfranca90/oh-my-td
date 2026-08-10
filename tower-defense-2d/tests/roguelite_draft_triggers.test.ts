// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game2D } from '../src/engine/Game';

/**
 * A5 (docs/GAME_DESIGN_REVIEW.md): antes o Draft Roguelite disparava nas ondas
 * 5/10/15 — a 15 nunca existe na campanha (10 ondas) e a 10 competia com o
 * modal de vitória pela tela. Agora dispara em 3/6/9 na campanha e em
 * múltiplos de 5 no endless, sempre suprimido quando a run já terminou.
 */
describe('Draft Roguelite — gatilhos de onda (A5)', () => {
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
    (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = () => fakeCtx;

    document.body.innerHTML = `
      <div id="game-area"></div>
      <div id="ui-container"></div>
    `;
  });

  /**
   * Encerra a onda corrente sem precisar simular combate: esvazia a fila de
   * spawn e a lista de inimigos e avança dois passos fixos.
   *
   * Dois passos são necessários porque `wasWaveActive` (usado para detectar
   * "a onda terminou NESTE passo") só é atualizado ao FINAL de
   * `stepSimulation`: o 1º passo registra que a onda estava ativa, o 2º
   * detecta a transição para inativa e é o que dispara vitória/draft.
   */
  function finishCurrentWave(game: Game2D) {
    game['stepSimulation'](1000 / 60);
    game['waveManager']['spawnQueue'] = [];
    (game as unknown as { enemyManager: { ['enemies']: unknown[] } })['enemyManager']['enemies'] = [];
    game['stepSimulation'](1000 / 60);
  }

  it('dispara nas ondas 3, 6 e 9 na campanha — nunca na 10ª, que é vitória', () => {
    const game = new Game2D();
    const draftSpy = vi.spyOn(game['uiManager'], 'triggerDraftModal').mockImplementation(() => {});

    const firedAtWave: number[] = [];
    for (let w = 1; w <= 10; w++) {
      const before = draftSpy.mock.calls.length;
      game.waveManager.startNextWave();
      finishCurrentWave(game);
      if (draftSpy.mock.calls.length > before) firedAtWave.push(w);
    }

    expect(firedAtWave).toEqual([3, 6, 9]);
    expect(draftSpy).toHaveBeenCalledTimes(3);
    // A vitória e o draft não competem pela tela: a campanha terminou.
    expect(game.gameState.status).toBe('VICTORY');
  });

  it('dispara em múltiplos de 5 no endless (5, 10, 15...) e não trava na 15', () => {
    const game = new Game2D();
    game.waveManager.setEndlessMode(true);
    const draftSpy = vi.spyOn(game['uiManager'], 'triggerDraftModal').mockImplementation(() => {});

    const firedAtWave: number[] = [];
    for (let w = 1; w <= 16; w++) {
      const before = draftSpy.mock.calls.length;
      game.waveManager.startNextWave();
      finishCurrentWave(game);
      if (draftSpy.mock.calls.length > before) firedAtWave.push(w);
    }

    expect(firedAtWave).toEqual([5, 10, 15]);
    // Endless nunca declara vitória.
    expect(game.gameState.status).toBe('PLAYING');
  });
});
