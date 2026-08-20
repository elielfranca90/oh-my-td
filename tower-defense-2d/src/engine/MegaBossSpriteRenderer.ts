import { MonsterSpriteRenderer, type MonsterAnimationState } from './MonsterSpriteRenderer';

export type BossState = MonsterAnimationState;

/**
 * Adaptador retrocompatível do renderizador de spritesheet do Mega Boss.
 * Delega internamente para o MonsterSpriteRenderer unificado.
 */
export class MegaBossSpriteRenderer {
  private static instance: MegaBossSpriteRenderer;

  public static getInstance(): MegaBossSpriteRenderer {
    if (!MegaBossSpriteRenderer.instance) {
      MegaBossSpriteRenderer.instance = new MegaBossSpriteRenderer();
    }
    return MegaBossSpriteRenderer.instance;
  }

  public update(deltaTimeMs: number) {
    MonsterSpriteRenderer.getInstance().update(deltaTimeMs);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number = 76,
    state: BossState = 'MOVING'
  ) {
    MonsterSpriteRenderer.getInstance().renderEnemy(ctx, 'BLACK_MEGA_BOSS', x, y, size, state);
  }
}
