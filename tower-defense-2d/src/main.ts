import { inject } from '@vercel/analytics';
import { Game2D } from './engine/Game';

// Initialize Vercel Web Analytics
inject();

const game = new Game2D();
game.run();
