// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { ThreeRenderer } from '../src/engine/ThreeRenderer';
import { MapManager2D } from '../src/engine/MapManager';
import { SpriteManager } from '../src/engine/SpriteManager';
import { Game2D } from '../src/engine/Game';

describe('ThreeRenderer & WebGL Integration (Fase 1)', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="game-area"></div><div id="ui-container"></div>`;
  });

  it('instancia o ThreeRenderer com dimensões corretas', () => {
    const renderer = new ThreeRenderer(840, 600);
    expect(renderer.canvas).toBeDefined();
    expect(renderer.canvas.style.position).toBe('absolute');
    expect(renderer.canvas.style.pointerEvents).toBe('none');
    expect(renderer.canvas.style.zIndex).toBe('0');
  });

  it('constrói o terreno no WebGL para diferentes mapas', () => {
    const renderer = new ThreeRenderer(840, 600);
    const mapManager = new MapManager2D('MAP_1');
    const spriteManager = SpriteManager.getInstance();

    expect(() => {
      renderer.buildMap(mapManager.getMapData(), 'MAP_1', spriteManager);
      renderer.buildMap(mapManager.getMapData(), 'MAP_2', spriteManager);
      renderer.buildMap(mapManager.getMapData(), 'MAP_3', spriteManager);
    }).not.toThrow();

    expect(() => renderer.render()).not.toThrow();
    expect(() => renderer.dispose()).not.toThrow();
  });
  it('configura a OrthographicCamera com orientação Y-up e posiciona os tiles corretamente', () => {
    const renderer = new ThreeRenderer(840, 600);
    const camera = (renderer as unknown as { camera: THREE.OrthographicCamera }).camera;
    expect(camera.top).toBe(600);
    expect(camera.bottom).toBe(0);

    // Força renderer truthy para executar buildMap em ambiente happy-dom (sem WebGL nativo)
    (renderer as unknown as { renderer: unknown }).renderer = {};

    const mapManager = new MapManager2D('MAP_1');
    const spriteManager = SpriteManager.getInstance();
    renderer.buildMap(mapManager.getMapData(), 'MAP_1', spriteManager);

    const mapGroup = (renderer as unknown as { mapGroup: THREE.Group }).mapGroup;
    expect(mapGroup.children.length).toBeGreaterThan(0);

    // Primeiro tile (row 0, col 0): x = 30, y = 600 - 30 = 570
    const firstMesh = mapGroup.children[0] as THREE.Mesh;
    expect(firstMesh.position.x).toBe(30);
    expect(firstMesh.position.y).toBe(570);
  });

  it('monta a arquitetura híbrida de canvas (WebGL z:0 e Canvas 2D z:1) no Game2D', () => {
    const fakeCtx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'canvas') return document.createElement('canvas');
          if (prop === 'measureText') return () => ({ width: 10 });
          return () => {};
        },
        set: () => true,
      }
    );
    (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = () => fakeCtx;

    const game = new Game2D();
    const gameArea = document.getElementById('game-area')!;
    const canvases = gameArea.querySelectorAll('canvas');

    expect(canvases.length).toBe(2);
    expect(canvases[0]).toBe(game.threeRenderer.canvas);
    expect(canvases[1]).toBe(game.canvas);
    expect(canvases[0].style.zIndex).toBe('0');
    expect(canvases[1].style.zIndex).toBe('1');
  });
});
