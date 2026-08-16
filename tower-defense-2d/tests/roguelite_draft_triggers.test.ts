// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game2D } from '../src/engine/Game';
import { Rng } from '../src/engine/Rng';
import { UIManager } from '../src/ui/UIManager';

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

  it('NÃO dispara no modo NORMAL nem no HARDCORE', () => {
    const gameNormal = new Game2D();
    const draftSpyNormal = vi.spyOn(gameNormal['uiManager'], 'triggerDraftModal').mockImplementation(() => {});

    for (let w = 1; w <= 10; w++) {
      gameNormal.waveManager.startNextWave();
      finishCurrentWave(gameNormal);
    }
    expect(draftSpyNormal).not.toHaveBeenCalled();

    const gameHardcore = new Game2D();
    gameHardcore.changeChallengeMode('HARDCORE');
    const draftSpyHardcore = vi.spyOn(gameHardcore['uiManager'], 'triggerDraftModal').mockImplementation(() => {});

    for (let w = 1; w <= 10; w++) {
      gameHardcore.waveManager.startNextWave();
      finishCurrentWave(gameHardcore);
    }
    expect(draftSpyHardcore).not.toHaveBeenCalled();
  });

  it('dispara exclusivamente no modo MORTE_CERTA a cada 5 ondas (5, 10, 15...)', () => {
    const game = new Game2D();
    game.changeChallengeMode('MORTE_CERTA');
    const draftSpy = vi.spyOn(game['uiManager'], 'triggerDraftModal').mockImplementation(() => {});

    const firedAtWave: number[] = [];
    for (let w = 1; w <= 16; w++) {
      const before = draftSpy.mock.calls.length;
      game.waveManager.startNextWave();
      finishCurrentWave(game);
      if (draftSpy.mock.calls.length > before) firedAtWave.push(w);
    }

    expect(firedAtWave).toEqual([5, 10, 15]);
    expect(draftSpy).toHaveBeenCalledTimes(3);
  });

  it('se MORTE_CERTA for configurado em modo campanha com teto de ondas, dispara em 3, 6 e 9', () => {
    const game = new Game2D();
    game.changeChallengeMode('MORTE_CERTA');
    game.waveManager.setEndlessMode(false);
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
    expect(game.gameState.status).toBe('VICTORY');
  });

  it('deve gerar escolhas de módulos determinísticas com Rng', () => {
    const game1 = new Game2D();
    const rng1 = new Rng(42);
    game1['uiManager'].triggerDraftModal(undefined, rng1);
    const cards1 = Array.from(document.querySelectorAll('.draft-card-btn')).map(
      el => (el as HTMLElement).dataset.id
    );
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    const game2 = new Game2D();
    const rng2 = new Rng(42);
    game2['uiManager'].triggerDraftModal(undefined, rng2);
    const cards2 = Array.from(document.querySelectorAll('.draft-card-btn')).map(
      el => (el as HTMLElement).dataset.id
    );
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    expect(cards1).toEqual(cards2);
    expect(cards1.length).toBe(3);
  });
});
