/**
 * Pipeline de Processamento e Auditoria de Spritesheets (Grid 4x5)
 * OH MY TD - Tower Defense 2D
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../public/assets');

export const MONSTER_ASSETS = {
  STANDARD: 'standard_spritesheet.png',
  RUNNER: 'runner_spritesheet.png',
  TANK: 'tank_spritesheet.png',
  SHIELDED: 'shielded_spritesheet.png',
  SPORE_SPRINTER: 'spore_sprinter_spritesheet.png',
  MOSS_GIANT: 'moss_giant_spritesheet.png',
  BOSS: 'boss_spritesheet.png',
  BLACK_MEGA_BOSS: 'mega_boss_spritesheet.png',
};

export function auditMonsterAssets() {
  console.log('--- Auditoria de Spritesheets dos Monstros ---');
  const results = {};
  for (const [type, file] of Object.entries(MONSTER_ASSETS)) {
    const fullPath = path.join(assetsDir, file);
    const exists = fs.existsSync(fullPath);
    results[type] = {
      file,
      exists,
      path: fullPath,
      sizeBytes: exists ? fs.statSync(fullPath).size : 0,
    };
    console.log(`[${type}] ${file}: ${exists ? `PRESENTE (${results[type].sizeBytes} bytes)` : 'PENDENTE (usando fallback vetorial)'}`);
  }
  return results;
}

if (process.argv[1] === __filename) {
  auditMonsterAssets();
}
