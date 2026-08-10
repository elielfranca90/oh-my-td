import type { FloatingText } from '../types';

export class FXManager {
  private floatingTexts: FloatingText[] = [];
  public shakeIntensity = 0;

  public addDamageText(x: number, y: number, text: string, color = '#ffeb3b') {
    this.floatingTexts.push({
      id: `text-${Date.now()}-${Math.random()}`,
      text,
      x: x + (Math.random() * 16 - 8),
      y: y - 10,
      color,
      alpha: 1.0,
      life: 40, // 40 frames (~0.6s)
    });
  }

  public triggerScreenShake(intensity = 8) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public update() {
    // Screen shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.85;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.8;
      ft.life--;
      ft.alpha = Math.max(0, ft.life / 40);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public getShakeOffset(): { x: number; y: number } {
    if (this.shakeIntensity <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() * 2 - 1) * this.shakeIntensity,
      y: (Math.random() * 2 - 1) * this.shakeIntensity,
    };
  }

  /**
   * @param uiScale Ver Game2D.uiScale — sem isto, o texto de dano/"DODGED!"
   *   (~13px no canvas) encolhe a ~5px reais num telefone (E1).
   */
  public render(ctx: CanvasRenderingContext2D, uiScale = 1) {
    ctx.save();
    ctx.font = `bold ${Math.round(13 * uiScale)}px Arial`;
    ctx.textAlign = 'center';

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }
}
