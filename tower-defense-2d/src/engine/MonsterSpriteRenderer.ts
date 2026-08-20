import { SpriteManager } from './SpriteManager';

import type { EnemyType } from '../types';

export type MonsterAnimationState = 'IDLE' | 'MOVING' | 'ATTACK' | 'HURT' | 'DEFEAT';
export type BossState = MonsterAnimationState; // Alias retrocompatível

export interface MonsterAssetEntry {
  image: HTMLImageElement | null;
  isLoaded: boolean;
  src: string;
  scaleModifier: number;
}

export class MonsterSpriteRenderer {
  private static instance: MonsterSpriteRenderer;

  private assets: Map<EnemyType, MonsterAssetEntry> = new Map();
  private frameIndex = 0;
  private animTimer = 0;
  public readonly frameDurationMs = 140;
  public readonly cols = 4;
  public readonly rows = 5;

  private static readonly SPRITESHEET_PATHS: Record<EnemyType, { path: string; scaleModifier: number }> = {
    STANDARD: { path: '/assets/standard_spritesheet.png', scaleModifier: 1.0 },
    RUNNER: { path: '/assets/runner_spritesheet.png', scaleModifier: 1.0 },
    TANK: { path: '/assets/tank_spritesheet.png', scaleModifier: 1.15 },
    SHIELDED: { path: '/assets/shielded_spritesheet.png', scaleModifier: 1.05 },
    SPORE_SPRINTER: { path: '/assets/spore_sprinter_spritesheet.png', scaleModifier: 1.0 },
    MOSS_GIANT: { path: '/assets/moss_giant_spritesheet.png', scaleModifier: 1.25 },
    BOSS: { path: '/assets/boss_spritesheet.png', scaleModifier: 1.3 },
    BLACK_MEGA_BOSS: { path: '/assets/mega_boss_spritesheet.png', scaleModifier: 1.35 },
  };

  private static readonly STATE_ROW_MAP: Record<MonsterAnimationState, number> = {
    IDLE: 0,
    MOVING: 1,
    ATTACK: 2,
    HURT: 3,
    DEFEAT: 4,
  };

  constructor() {
    this.initAssets();
  }

  public static getInstance(): MonsterSpriteRenderer {
    if (!MonsterSpriteRenderer.instance) {
      MonsterSpriteRenderer.instance = new MonsterSpriteRenderer();
    }
    return MonsterSpriteRenderer.instance;
  }

  /**
   * Inicializa o mapa de assets e carrega as imagens caso esteja em ambiente com DOM (browser).
   */
  private initAssets() {
    for (const [typeKey, config] of Object.entries(MonsterSpriteRenderer.SPRITESHEET_PATHS)) {
      const type = typeKey as EnemyType;
      const entry: MonsterAssetEntry = {
        image: null,
        isLoaded: false,
        src: config.path,
        scaleModifier: config.scaleModifier,
      };

      if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = config.path;
        img.onload = () => {
          entry.isLoaded = true;
        };
        img.onerror = () => {
          entry.isLoaded = false;
        };
        entry.image = img;
      }

      this.assets.set(type, entry);
    }
  }

  /**
   * Atualiza o temporizador da animação dos monstros.
   * Executado centralizadamente pelo loop de tick de apresentação.
   */
  public update(deltaTimeMs: number) {
    this.animTimer += deltaTimeMs;
    if (this.animTimer >= this.frameDurationMs) {
      const advancedFrames = Math.floor(this.animTimer / this.frameDurationMs);
      this.animTimer %= this.frameDurationMs;
      this.frameIndex = (this.frameIndex + advancedFrames) % this.cols;
    }
  }

  /**
   * Retorna o índice de frame atual (0 a 3).
   */
  public getFrameIndex(): number {
    return this.frameIndex;
  }

  /**
   * Força um índice de frame (útil para testes ou sincronização).
   */
  public setFrameIndex(index: number) {
    this.frameIndex = ((index % this.cols) + this.cols) % this.cols;
  }

  /**
   * Retorna se o asset de spritesheet do tipo especificado está carregado.
   */
  public isAssetLoaded(type: EnemyType): boolean {
    const entry = this.assets.get(type);
    return Boolean(entry?.isLoaded && entry?.image);
  }

  /**
   * Obtém a linha correspondente ao estado de animação informado.
   */
  public getRowForState(state: MonsterAnimationState): number {
    return MonsterSpriteRenderer.STATE_ROW_MAP[state] ?? 1;
  }

  /**
   * Renderiza o sprite animado do monstro com suporte a flip horizontal e fallback vetorial.
   *
   * @param ctx Contexto 2D do Canvas
   * @param type Tipo do monstro (EnemyType)
   * @param x Posição central X
   * @param y Posição central Y
   * @param size Diâmetro/tamanho do sprite a ser desenhado
   * @param state Estado de animação atual (IDLE, MOVING, ATTACK, HURT, DEFEAT)
   * @param facingLeft Se true, espelha o sprite horizontalmente
   * @returns true se desenhado via spritesheet, false se utilizou fallback
   */
  public renderEnemy(
    ctx: CanvasRenderingContext2D,
    type: EnemyType,
    x: number,
    y: number,
    size: number = 64,
    state: MonsterAnimationState = 'MOVING',
    facingLeft: boolean = false
  ): boolean {
    const entry = this.assets.get(type);
    const renderSize = size * (entry?.scaleModifier ?? 1.0);

    if (!entry || !entry.isLoaded || !entry.image) {
      this.renderFallback(ctx, type, x, y, size, facingLeft);
      return false;
    }

    try {
      const img = entry.image;
      const rowIndex = this.getRowForState(state);
      const colIndex = this.frameIndex % this.cols;

      const imgWidth = img.naturalWidth || img.width || 1024;
      const imgHeight = img.naturalHeight || img.height || 1280;

      const fw = Math.floor(imgWidth / this.cols);
      const fh = Math.floor(imgHeight / this.rows);

      const sx = Math.min(imgWidth - fw, Math.floor(colIndex * fw));
      const sy = Math.min(imgHeight - fh, Math.floor(rowIndex * fh));

      const half = renderSize / 2;

      ctx.save();

      if (facingLeft) {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, fw, fh, -half, -half, renderSize, renderSize);
      } else {
        ctx.drawImage(img, sx, sy, fw, fh, x - half, y - half, renderSize, renderSize);
      }

      ctx.restore();
      return true;
    } catch {
      this.renderFallback(ctx, type, x, y, size, facingLeft);
      return false;
    }
  }

  /**
   * Fallback visual seguro quando a imagem do spritesheet ainda não foi carregada.
   */
  private renderFallback(
    ctx: CanvasRenderingContext2D,
    type: EnemyType,
    x: number,
    y: number,
    size: number,
    facingLeft: boolean
  ) {
    ctx.save();
    if (facingLeft) {
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.translate(-x, -y);
    }

    const drawn = SpriteManager.getInstance().drawSpriteAsset(ctx, type, x, y, size);

    if (!drawn) {
      const radius = size / 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.getFallbackColor(type);
      ctx.fill();

      ctx.strokeStyle = type === 'BOSS' ? '#ffd700' : type === 'MOSS_GIANT' ? '#aed581' : '#ffffff';
      ctx.lineWidth = type === 'BOSS' || type === 'BLACK_MEGA_BOSS' ? 3.5 : 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Cores canônicas dos inimigos para o fallback de contingência.
   */
  private getFallbackColor(type: EnemyType): string {
    switch (type) {
      case 'STANDARD':
        return '#e53935';
      case 'RUNNER':
        return '#ff9800';
      case 'TANK':
        return '#8e24aa';
      case 'SHIELDED':
        return '#0288d1';
      case 'SPORE_SPRINTER':
        return '#7cb342';
      case 'MOSS_GIANT':
        return '#33691e';
      case 'BOSS':
        return '#b71c1c';
      case 'BLACK_MEGA_BOSS':
        return '#11111a';
      default:
        return '#e53935';
    }
  }

  /**
   * Injeta manualmente uma imagem de asset (útil para testes unitários e mocks).
   */
  public setAssetForTesting(type: EnemyType, image: HTMLImageElement | null, isLoaded: boolean) {
    const existing = this.assets.get(type);
    if (existing) {
      existing.image = image;
      existing.isLoaded = isLoaded;
    } else {
      this.assets.set(type, {
        image,
        isLoaded,
        src: MonsterSpriteRenderer.SPRITESHEET_PATHS[type]?.path || '',
        scaleModifier: MonsterSpriteRenderer.SPRITESHEET_PATHS[type]?.scaleModifier || 1.0,
      });
    }
  }

  /**
   * Reseta o estado do renderizador (útil em testes).
   */
  public reset() {
    this.frameIndex = 0;
    this.animTimer = 0;
  }
}
