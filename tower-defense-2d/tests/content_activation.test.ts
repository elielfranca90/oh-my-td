import { describe, expect, it } from 'vitest';
import { Enemy2D } from '../src/engine/Enemy';
import { Game2D } from '../src/engine/Game';
import { MapManager2D, TileType } from '../src/engine/MapManager';
import { WaveManager } from '../src/engine/WaveManager';
import type { EnemyType, Vector2D } from '../src/types';

/**
 * Cobre as mecânicas que existiam no código mas nunca chegavam ao jogador:
 * o inimigo SHIELDED, a regeneração do MOSS_GIANT junto à mata e os tiles
 * Overgrowth Sprout.
 */
describe('Ativação de conteúdo: SHIELDED, regen do Moss Giant e Sprout', () => {
  it('deve incluir SHIELDED nas ondas da campanha sem alterar a contagem de 10 ondas', () => {
    const wm = new WaveManager();

    expect(wm.waves.length).toBe(10);

    const wavesComShielded = wm.waves.filter(w =>
      w.enemies.some(e => e.type === 'SHIELDED')
    );

    expect(wavesComShielded.length).toBeGreaterThan(0);
    // A estreia precisa vir depois do Tank (onda 3) para o escudo fazer sentido
    expect(Math.min(...wavesComShielded.map(w => w.waveNumber))).toBeGreaterThan(3);
  });

  it('deve permitir SHIELDED no pool de geração do modo endless', () => {
    const wm = new WaveManager();
    wm.setEndlessMode(true);

    const tiposVistos = new Set<EnemyType>();
    for (let i = 0; i < 200; i++) {
      const wave = wm['generateEndlessWave'](15);
      for (const e of wave.enemies) tiposVistos.add(e.type);
    }

    expect(tiposVistos.has('SHIELDED')).toBe(true);
  });

  it('deve detectar folhagem adjacente ao caminho no MAP_1', () => {
    const map = new MapManager2D('MAP_1');

    // Tile de caminho (2,1) encosta na floresta (2,2) -> perto de folhagem
    expect(map.isNearFoliage(2 * 60 + 30, 1 * 60 + 30)).toBe(true);

    // Tile de caminho (12,1) não tem floresta em nenhum dos 8 vizinhos
    expect(map.isNearFoliage(12 * 60 + 30, 1 * 60 + 30)).toBe(false);
  });

  it('deve regenerar o MOSS_GIANT apenas quando estiver junto à mata', () => {
    const waypoints: Vector2D[] = [
      { x: 30, y: 30 },
      { x: 600, y: 30 },
    ];

    const perto = new Enemy2D(waypoints, 'MOSS_GIANT', 'moss-1', 1.0);
    perto.takeDamage(10, 1); // armorPenetration=1: dano cheio, para isolar a regeneração
    const hpFerido = perto.data.hp;
    expect(hpFerido).toBe(35);

    // 20 passos junto à mata -> +1 HP (~3 HP/s a 60 passos/s)
    for (let i = 0; i < 20; i++) perto.update(waypoints, true);
    expect(perto.data.hp).toBe(hpFerido + 1);
    expect(perto.isRegenerating).toBe(true);

    const longe = new Enemy2D(waypoints, 'MOSS_GIANT', 'moss-2', 1.0);
    longe.takeDamage(10, 1);
    for (let i = 0; i < 60; i++) longe.update(waypoints, false);
    expect(longe.data.hp).toBe(hpFerido);
    expect(longe.isRegenerating).toBe(false);
  });

  it('não deve regenerar outros tipos de inimigo junto à mata', () => {
    const waypoints: Vector2D[] = [
      { x: 30, y: 30 },
      { x: 600, y: 30 },
    ];

    const tank = new Enemy2D(waypoints, 'TANK', 'tank-1', 1.0);
    tank.takeDamage(10, 1);
    const hpFerido = tank.data.hp;

    for (let i = 0; i < 60; i++) tank.update(waypoints, true);

    expect(tank.data.hp).toBe(hpFerido);
    expect(tank.isRegenerating).toBe(false);
  });

  it('deve sortear tiles Sprout construíveis e adjacentes ao caminho', () => {
    const map = new MapManager2D('MAP_1');
    const sprouts = map.pickSproutTiles(4);

    expect(sprouts.length).toBe(4);

    const chaves = new Set(sprouts.map(s => `${s.x},${s.y}`));
    expect(chaves.size).toBe(sprouts.length); // sem repetição

    for (const tile of sprouts) {
      expect(map.isBuildable(tile.x, tile.y)).toBe(true);

      const vizinhos = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ];
      const encostaNoCaminho = vizinhos.some(([dx, dy]) => {
        const nx = tile.x + dx;
        const ny = tile.y + dy;
        if (nx < 0 || nx >= map.cols || ny < 0 || ny >= map.rows) return false;
        return map['mapData'][ny][nx] === TileType.PATH;
      });
      expect(encostaNoCaminho).toBe(true);
    }
  });

  it('deve sortear tiles Sprout válidos em todos os mapas', () => {
    for (const mapId of ['MAP_1', 'MAP_2', 'MAP_3'] as const) {
      const map = new MapManager2D(mapId);
      const sprouts = map.pickSproutTiles(4);

      expect(sprouts.length).toBeGreaterThan(0);
      for (const tile of sprouts) {
        expect(map.isBuildable(tile.x, tile.y)).toBe(true);
      }
    }
  });

  it('deve ativar tiles Sprout no Game2D apenas no MAP_1 (Green Valley)', () => {
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
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => fakeCtx, writable: true, configurable: true });
    document.body.innerHTML = '<div id="game-area"></div><div id="ui-container"></div>';

    const game = new Game2D();

    // Inicial por padrão em MAP_1
    expect(game.currentMapId).toBe('MAP_1');
    expect(game['towerManager'].sproutTiles.length).toBe(4);

    // Troca para MAP_2 (Death Pass)
    game.changeMap('MAP_2');
    expect(game['towerManager'].sproutTiles.length).toBe(0);

    // Troca para MAP_4 (Grave Pass)
    game.changeMap('MAP_4');
    expect(game['towerManager'].sproutTiles.length).toBe(0);

    // Retorna para MAP_1 (Green Valley)
    game.changeMap('MAP_1');
    expect(game['towerManager'].sproutTiles.length).toBe(4);
  });
});
