import { inject } from '@vercel/analytics';
import { Game2D } from './engine/Game';
import { WelcomeScreen } from './ui/WelcomeScreen';
import { initMobileDetection } from './helpers/device';

// Initialize mobile detection & Vercel Web Analytics
initMobileDetection();
inject();

new WelcomeScreen((mode) => {
  const game = new Game2D();
  if (mode === 'CAMPAIGN') {
    game.gameState.isCampaignMode = true;
    game.changeMap('MAP_1');
  } else {
    game.gameState.isCampaignMode = false;
  }
  game.run();
});
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
