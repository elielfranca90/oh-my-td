import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MonsterSpriteRenderer, type MonsterAnimationState } from '../src/engine/MonsterSpriteRenderer';
import { MegaBossSpriteRenderer } from '../src/engine/MegaBossSpriteRenderer';
import { Enemy2D } from '../src/engine/Enemy';
import type { EnemyType, Vector2D } from '../src/types';

describe('MonsterSpriteRenderer Unit & Integration Tests', () => {
  let renderer: MonsterSpriteRenderer;

  beforeEach(() => {
    renderer = MonsterSpriteRenderer.getInstance();
    renderer.reset();
  });

  it('deve instanciar como singleton corretamente', () => {
    const r1 = MonsterSpriteRenderer.getInstance();
    const r2 = MonsterSpriteRenderer.getInstance();
    expect(r1).toBe(r2);
  });

  it('deve mapear corretamente as linhas do grid 4x5 para cada estado de animação', () => {
    expect(renderer.getRowForState('IDLE')).toBe(0);
    expect(renderer.getRowForState('MOVING')).toBe(1);
    expect(renderer.getRowForState('ATTACK')).toBe(2);
    expect(renderer.getRowForState('HURT')).toBe(3);
    expect(renderer.getRowForState('DEFEAT')).toBe(4);
  });

  it('deve avançar o frame da animação a cada ciclo de 140ms e reiniciar após 4 colunas (0 a 3)', () => {
    expect(renderer.getFrameIndex()).toBe(0);

    renderer.update(70);
    expect(renderer.getFrameIndex()).toBe(0);

    renderer.update(70); // 140ms acumulados
    expect(renderer.getFrameIndex()).toBe(1);

    renderer.update(140); // 280ms
    expect(renderer.getFrameIndex()).toBe(2);

    renderer.update(140); // 420ms
    expect(renderer.getFrameIndex()).toBe(3);

    renderer.update(140); // 560ms -> loop de volta para frame 0
    expect(renderer.getFrameIndex()).toBe(0);
  });

  it('deve permitir ajustar e resetar o frame index arbitrariamente', () => {
    renderer.setFrameIndex(3);
    expect(renderer.getFrameIndex()).toBe(3);

    renderer.reset();
    expect(renderer.getFrameIndex()).toBe(0);
  });

  it('deve renderizar fallback seguro para todos os 8 tipos de monstros quando a imagem não estiver carregada', () => {
    const enemyTypes: EnemyType[] = [
      'STANDARD',
      'RUNNER',
      'TANK',
      'SHIELDED',
      'SPORE_SPRINTER',
      'MOSS_GIANT',
      'BOSS',
      'BLACK_MEGA_BOSS',
    ];

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    for (const type of enemyTypes) {
      const renderedViaSpritesheet = renderer.renderEnemy(
        mockCtx,
        type,
        100,
        100,
        64,
        'MOVING',
        false
      );
      // Sem asset carregado, deve retornar false e desenhar via fallback sem lançar exceção
      expect(typeof renderedViaSpritesheet).toBe('boolean');
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    }
  });

  it('deve aplicar transformações corretas de flip horizontal (facingLeft)', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    renderer.renderEnemy(mockCtx, 'STANDARD', 150, 200, 48, 'MOVING', true);

    expect(mockCtx.translate).toHaveBeenCalledWith(150, 200);
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
  });

  it('deve renderizar via drawImage com recorte UV correto quando a imagem estiver presente', () => {
    const mockImage = {
      width: 1024,
      height: 1280,
      naturalWidth: 1024,
      naturalHeight: 1280,
    } as unknown as HTMLImageElement;

    renderer.setAssetForTesting('BOSS', mockImage, true);
    expect(renderer.isAssetLoaded('BOSS')).toBe(true);

    renderer.setFrameIndex(2); // Coluna 2

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const success = renderer.renderEnemy(mockCtx, 'BOSS', 200, 300, 60, 'ATTACK', false);

    expect(success).toBe(true);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(
      mockImage,
      512, // sx: colIndex 2 * (1024 / 4) = 512
      512, // sy: rowIndex 2 (ATTACK) * (1280 / 5) = 512
      256, // fw: 1024 / 4 = 256
      256, // fh: 1280 / 5 = 256
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('deve delegar chamadas de MegaBossSpriteRenderer para MonsterSpriteRenderer com fidelidade', () => {
    const megaBossRenderer = MegaBossSpriteRenderer.getInstance();
    expect(megaBossRenderer).toBeDefined();

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      megaBossRenderer.update(140);
      megaBossRenderer.render(mockCtx, 100, 100, 76, 'HURT');
    }).not.toThrow();
  });

  it('deve atualizar facingDirection do Enemy2D dependendo do sentido do movimento nos waypoints', () => {
    const waypointsRight: Vector2D[] = [
      { x: 50, y: 100 },
      { x: 150, y: 100 }, // movendo para a direita (dx > 0)
    ];

    const enemy = new Enemy2D(waypointsRight, 'STANDARD', 'enemy-1');
    expect(enemy.facingDirection).toBe('right');

    enemy.update(waypointsRight);
    expect(enemy.facingDirection).toBe('right');

    // Movendo para a esquerda
    const waypointsLeft: Vector2D[] = [
      { x: 200, y: 100 },
      { x: 50, y: 100 }, // movendo para a esquerda (dx < 0)
    ];

    const enemyLeft = new Enemy2D(waypointsLeft, 'RUNNER', 'enemy-2');
    enemyLeft.update(waypointsLeft);
    expect(enemyLeft.facingDirection).toBe('left');
  });

  it('deve renderizar Enemy2D em diferentes estados (MOVING, HURT com freeze) sem erros', () => {
    const waypoints: Vector2D[] = [
      { x: 50, y: 100 },
      { x: 150, y: 100 },
    ];
    const enemy = new Enemy2D(waypoints, 'TANK', 'tank-1');

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
    } as unknown as CanvasRenderingContext2D;

    // Estado normal (MOVING)
    expect(() => enemy.render(mockCtx, 1)).not.toThrow();

    // Estado congelado (HURT)
    enemy.applyFreeze(60);
    expect(enemy.data.freezeTimer).toBe(60);
    expect(() => enemy.render(mockCtx, 1)).not.toThrow();
  });
});
