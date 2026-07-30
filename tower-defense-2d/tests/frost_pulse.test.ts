import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { GameState } from '../src/engine/GameState';
import { MapManager2D } from '../src/engine/MapManager';
import { ParticleManager } from '../src/engine/ParticleManager';
import { ProjectileManager2D } from '../src/engine/ProjectileManager';
import { Tower2D } from '../src/engine/Tower';
import { TowerManager2D } from '../src/engine/TowerManager';
import type { Vector2D } from '../src/types';

interface StrokedArc {
  x: number;
  y: number;
  radius: number;
  strokeStyle: string;
}

/**
 * Contexto de canvas mínimo que registra só os arcos efetivamente traçados.
 * O pulso da torre de Gelo é puramente visual, então o único jeito de testá-lo
 * é observar o que chega ao contexto de desenho.
 */
class RecordingCtx {
  public canvas = { width: 840, height: 600 };
  public strokeStyle = '';
  public fillStyle = '';
  public lineWidth = 0;
  public globalAlpha = 1;
  public strokedArcs: StrokedArc[] = [];
  private pending: { x: number; y: number; radius: number } | null = null;

  save() {}
  restore() {}
  beginPath() {}
  fill() {}
  fillRect() {}
  strokeRect() {}

  arc(x: number, y: number, radius: number) {
    this.pending = { x, y, radius };
  }

  stroke() {
    if (!this.pending) return;
    this.strokedArcs.push({ ...this.pending, strokeStyle: String(this.strokeStyle) });
    this.pending = null;
  }

  public asCanvasCtx(): CanvasRenderingContext2D {
    return this as unknown as CanvasRenderingContext2D;
  }
}

describe('Pulso Glacial da torre FROST', () => {
  it('desenha um anel ciano no centro da torre', () => {
    const particles = new ParticleManager();
    particles.triggerFrostPulse(150, 210, 130);

    const rec = new RecordingCtx();
    particles.render(rec.asCanvasCtx());

    expect(rec.strokedArcs).toHaveLength(1);
    expect(rec.strokedArcs[0].strokeStyle).toBe('#80deea');
    expect(rec.strokedArcs[0].x).toBe(150);
    expect(rec.strokedArcs[0].y).toBe(210);
  });

  it('expande o anel até o alcance da torre e depois o descarta', () => {
    const particles = new ParticleManager();
    particles.triggerFrostPulse(150, 210, 130);

    const inicial = new RecordingCtx();
    particles.render(inicial.asCanvasCtx());
    const raioInicial = inicial.strokedArcs[0].radius;

    particles.update();
    particles.update();

    const meio = new RecordingCtx();
    particles.render(meio.asCanvasCtx());
    expect(meio.strokedArcs[0].radius).toBeGreaterThan(raioInicial);
    expect(meio.strokedArcs[0].radius).toBeLessThanOrEqual(130);

    // O anel tem de morrer antes do próximo pulso (fireRate 40) para não acumular.
    for (let i = 0; i < 38; i++) particles.update();

    const final = new RecordingCtx();
    particles.render(final.asCanvasCtx());
    expect(final.strokedArcs).toHaveLength(0);
  });

  it('respeita a cor de cada anel em vez do laranja fixo antigo', () => {
    const particles = new ParticleManager();
    particles.triggerImpactExplosion(100, 100, true);

    const rec = new RecordingCtx();
    particles.render(rec.asCanvasCtx());

    const anel = rec.strokedArcs.find(a => a.radius < 20);
    expect(anel?.strokeStyle).toBe('#e65100');
  });

  it('emite o pulso quando a torre atinge inimigos em alcance', () => {
    const map = new MapManager2D('MAP_1');
    const particles = new ParticleManager();
    const tm = new TowerManager2D(
      map,
      new ProjectileManager2D(),
      new GameState(),
      new AudioManager(),
      particles
    );

    // Torre no tile (2,2) -> centro (150,150), alcance 130.
    const tower = new Tower2D(2, 2, 60, 'FROST', 'frost-1');
    tm['towers'].push(tower);

    const waypoints: Vector2D[] = [
      { x: 150, y: 170 },
      { x: 200, y: 170 },
    ];
    const enemy = new Enemy2D(waypoints, 'STANDARD', 'inimigo-1', 1.0);

    tm.update([enemy]);

    const rec = new RecordingCtx();
    particles.render(rec.asCanvasCtx());

    const anel = rec.strokedArcs.find(a => a.strokeStyle === '#80deea');
    expect(anel).toBeDefined();
    expect(anel?.x).toBe(150);
    expect(anel?.y).toBe(150);
    // O inimigo também precisa ter sido lentificado pelo mesmo pulso.
    expect(enemy.data.slowTimer).toBeGreaterThan(0);
  });
});
