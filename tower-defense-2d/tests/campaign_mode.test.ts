// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameState } from '../src/engine/GameState';
import { Game2D } from '../src/engine/Game';
import { WelcomeScreen } from '../src/ui/WelcomeScreen';
import { UIManager } from '../src/ui/UIManager';

describe('Modo Campanha - Testes de Integração e UI', () => {
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

  it('GameState deve possuir flag isCampaignMode por padrão false', () => {
    const state = new GameState();
    expect(state.isCampaignMode).toBe(false);
    state.isCampaignMode = true;
    expect(state.isCampaignMode).toBe(true);
  });

  it('Game2D deve expor getter currentMapId e manter isCampaignMode entre trocas de mapa', () => {
    const game = new Game2D();
    expect(game.currentMapId).toBe('MAP_1');
    game.gameState.isCampaignMode = true;

    game.changeMap('MAP_2');
    expect(game.currentMapId).toBe('MAP_2');
    expect(game.gameState.isCampaignMode).toBe(true);
  });

  it('WelcomeScreen deve propagar o modo selecionado no callback', () => {
    const onStart = vi.fn();
    new WelcomeScreen(onStart);

    const campaignBtn = document.querySelector('.retro-btn-campaign') as HTMLButtonElement;
    expect(campaignBtn).not.toBeNull();
    campaignBtn.click();
    expect(onStart).toHaveBeenCalledWith('CAMPAIGN');

    document.body.innerHTML = '';
    const onStart2 = vi.fn();
    new WelcomeScreen(onStart2);

    const traditionalBtn = document.querySelector('.retro-btn-traditional') as HTMLButtonElement;
    expect(traditionalBtn).not.toBeNull();
    traditionalBtn.click();
    expect(onStart2).toHaveBeenCalledWith('TRADITIONAL');
  });

  it('UIManager deve restringir seletores no Modo Campanha', () => {
    const game = new Game2D();
    game.gameState.isCampaignMode = true;

    // Abrir modal de configurações aciona syncSettingsControls
    game['uiManager']['syncSettingsControls']();

    const hudChallengeBadge = document.getElementById('hud-challenge-badge');
    const hudMapBadge = document.getElementById('hud-map-badge');
    const challengeSelect = (document.getElementById('hud-challenge-select') || document.getElementById('settings-challenge-select')) as HTMLSelectElement;
    const endlessToggle = document.getElementById('settings-endless-toggle') as HTMLInputElement;

    expect(hudChallengeBadge?.classList.contains('hidden')).toBe(true);
    expect(hudMapBadge?.classList.contains('hidden')).toBe(true);
    expect(challengeSelect.disabled).toBe(true);
    expect(endlessToggle.disabled).toBe(true);
  });

  it('UIManager deve atualizar modal de vitória conforme o progresso da campanha', () => {
    const game = new Game2D();
    game.gameState.isCampaignMode = true;

    // MAP_1 Victory
    game.gameState.setStatus('VICTORY');
    let title = document.getElementById('modal-title');
    let desc = document.getElementById('modal-desc');
    let restartBtn = document.getElementById('restart-btn');

    expect(title?.innerText).toBe('Green Valley Concluído!');
    expect(desc?.innerText).toBe('Prepare-se para o Vale da Morte.');
    expect(restartBtn?.innerText).toBe('Próxima Fase (Death Pass)');

    // Simular clique no botão de restart no MAP_1 para ir ao MAP_2
    restartBtn?.click();
    expect(game.currentMapId).toBe('MAP_2');
    // Re-query após troca de mapa
    title = document.getElementById('modal-title');
    desc = document.getElementById('modal-desc');
    restartBtn = document.getElementById('restart-btn');

    // MAP_2 Victory
    game.gameState.setStatus('VICTORY');
    expect(title?.innerText).toBe('Death Pass Concluído!');
    expect(desc?.innerText).toBe('O último desafio aguarda na Cidadela.');
    expect(restartBtn?.innerText).toBe('Batalha Final (Cidadela)');

    // Simular clique no botão de restart no MAP_2 para ir ao MAP_3
    restartBtn?.click();
    expect(game.currentMapId).toBe('MAP_3');

    // Re-query após troca de mapa
    title = document.getElementById('modal-title');
    desc = document.getElementById('modal-desc');
    restartBtn = document.getElementById('restart-btn');

    // MAP_3 Victory
    game.gameState.setStatus('VICTORY');
    expect(title?.innerText).toBe('Cidadela Concluída!');
    expect(desc?.innerText).toBe('O desafio obscuro final aguarda na Passagem dos Túmulos.');
    expect(restartBtn?.innerText).toBe('Desafio Final (Grave Pass)');

    // Simular clique no botão de restart no MAP_3 para ir ao MAP_4
    restartBtn?.click();
    expect(game.currentMapId).toBe('MAP_4');

    // Re-query após troca de mapa
    title = document.getElementById('modal-title');
    desc = document.getElementById('modal-desc');
    restartBtn = document.getElementById('restart-btn');

    // MAP_4 Victory
    game.gameState.setStatus('VICTORY');
    expect(title?.innerText).toBe('Campanha Concluída!');
    expect(desc?.innerText).toBe('Você purificou as almas e salvou o mundo de Oh My TD!');
    expect(restartBtn?.innerText).toBe('Voltar ao Menu');
  });
});
