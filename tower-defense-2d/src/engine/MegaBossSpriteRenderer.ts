export type BossState = 'IDLE' | 'MOVING' | 'ATTACK' | 'HURT' | 'DEFEAT';

export class MegaBossSpriteRenderer {
  private static instance: MegaBossSpriteRenderer;
  private image: HTMLImageElement | null = null;
  private isLoaded = false;

  private frameIndex = 0;
  private animTimer = 0;


  constructor() {
    this.loadImage();
  }

  public static getInstance(): MegaBossSpriteRenderer {
    if (!MegaBossSpriteRenderer.instance) {
      MegaBossSpriteRenderer.instance = new MegaBossSpriteRenderer();
    }
    return MegaBossSpriteRenderer.instance;
  }

  private loadImage() {
    if (typeof window === 'undefined') return;
    this.image = new Image();
    this.image.src = '/assets/mega_boss_spritesheet.png';
    this.image.onload = () => {
      this.isLoaded = true;
    };
  }

  public update(deltaTimeMs: number) {
    this.animTimer += deltaTimeMs;
    if (this.animTimer >= 140) {
      this.animTimer = 0;
      this.frameIndex = (this.frameIndex + 1) % 4;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number = 72,
    state: BossState = 'MOVING'
  ) {
    if (!this.isLoaded || !this.image) {
      // Fallback vector draw if image is loading
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#11111a';
      ctx.fill();
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }

    try {
      let rowIndex = 1; // Default MOVING
      if (state === 'IDLE') rowIndex = 0;
      if (state === 'MOVING') rowIndex = 1;
      if (state === 'ATTACK') rowIndex = 2;
      if (state === 'HURT') rowIndex = 3;
      if (state === 'DEFEAT') rowIndex = 4;

      const colIndex = this.frameIndex % 4;
      const imgWidth = this.image.naturalWidth || this.image.width || 1952;
      const imgHeight = this.image.naturalHeight || this.image.height || 2186;

      const fw = Math.floor(imgWidth / 4);
      const fh = Math.floor(imgHeight / 5);

      const sx = Math.min(imgWidth - fw, Math.floor(colIndex * fw));
      const sy = Math.min(imgHeight - fh, Math.floor(rowIndex * fh));

      const half = size / 2;

      ctx.save();
      ctx.drawImage(
        this.image,
        sx,
        sy,
        fw,
        fh,
        x - half,
        y - half,
        size,
        size
      );
      ctx.restore();
    } catch (err: unknown) {
      // Fallback if drawImage fails
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#11111a';
      ctx.fill();
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
}
