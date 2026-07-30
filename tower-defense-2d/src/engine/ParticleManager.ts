import type { FirePatch } from '../types';
import { Enemy2D } from './Enemy';

export interface MeteorAnim {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  progress: number; // 0 to 1
  speed: number;
  onImpact: () => void;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}

export interface ScorchMark {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
}

export class ParticleManager {
  private meteors: MeteorAnim[] = [];
  private shockwaves: Shockwave[] = [];
  private embers: EmberParticle[] = [];
  private scorchMarks: ScorchMark[] = [];
  private firePatches: FirePatch[] = [];

  public freezeOverlayAlpha = 0;

  public spawnMeteor(targetX: number, targetY: number, onImpact: () => void) {
    const startX = targetX - 220;
    const startY = targetY - 350;

    this.meteors.push({
      id: `meteor-${Date.now()}-${Math.random()}`,
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      progress: 0,
      speed: 0.05, // ~20 frames descent
      onImpact,
    });
  }

  public triggerImpactExplosion(x: number, y: number, isArtillery = false) {
    // 1. Shockwave ring
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: isArtillery ? 50 : 90,
      alpha: 1.0,
      color: isArtillery ? '#e65100' : '#ff6d00',
    });

    // 2. Ember explosion particles
    const emberCount = isArtillery ? 12 : 25;
    for (let i = 0; i < emberCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      const colors = ['#ff3d00', '#ff9100', '#ffea00', '#ffffff'];
      this.embers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.floor(Math.random() * 15 + 15),
      });
    }

    // 3. Scorch mark / Napalm Fire Patch
    if (isArtillery) {
      this.firePatches.push({
        id: `fire-${Date.now()}-${Math.random()}`,
        x,
        y,
        radius: 40,
        duration: 150, // 2.5s at 60fps
        damage: 3, // DoT damage per tick
      });
    } else {
      this.scorchMarks.push({
        x,
        y,
        radius: 40,
        alpha: 0.8,
        life: 180, // 3 seconds at 60fps
      });
    }
  }

  /**
   * Pulso Glacial da torre FROST. O dano em área já era aplicado, mas sem
   * nenhum visual: como essa torre não dispara projétil algum, o jogador via
   * uma torre parada e concluía que estava quebrada.
   */
  public triggerFrostPulse(x: number, y: number, radius: number) {
    // Anel que se expande até o alcance real da torre (nível + tile Sprout).
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: radius,
      alpha: 0.9,
      color: '#80deea',
    });

    // Estilhaços de gelo, reaproveitando as partículas de brasa.
    const shardColors = ['#e0f7fa', '#80deea', '#00b8d4'];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;
      this.embers.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2.5 + 1,
        alpha: 1.0,
        color: shardColors[Math.floor(Math.random() * shardColors.length)],
        life: Math.floor(Math.random() * 10 + 12),
      });
    }
  }

  public triggerFreezeEffect() {
    this.freezeOverlayAlpha = 0.45;
  }

  public update(allEnemies: Enemy2D[] = [], fxManager?: unknown) {
    // 1. Update Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.progress += m.speed;

      m.currentX = m.startX + (m.targetX - m.startX) * m.progress;
      m.currentY = m.startY + (m.targetY - m.startY) * m.progress;

      // Spawn tail embers
      this.embers.push({
        x: m.currentX + (Math.random() * 10 - 5),
        y: m.currentY + (Math.random() * 10 - 5),
        vx: (Math.random() * 2 - 1) * -1,
        vy: -Math.random() * 3 - 2,
        size: Math.random() * 5 + 3,
        alpha: 0.8,
        color: '#ffab00',
        life: 15,
      });

      if (m.progress >= 1) {
        m.onImpact();
        this.triggerImpactExplosion(m.targetX, m.targetY);
        this.meteors.splice(i, 1);
      }
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.2;
      s.alpha -= 0.04;
      if (s.alpha <= 0 || s.radius >= s.maxRadius - 2) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.x += e.vx;
      e.y += e.vy;
      e.life--;
      e.alpha = Math.max(0, e.life / 30);
      if (e.life <= 0) {
        this.embers.splice(i, 1);
      }
    }

    // 4. Update Scorch Marks
    for (let i = this.scorchMarks.length - 1; i >= 0; i--) {
      const sm = this.scorchMarks[i];
      sm.life--;
      sm.alpha = Math.max(0, sm.life / 180) * 0.8;
      if (sm.life <= 0) {
        this.scorchMarks.splice(i, 1);
      }
    }

    // 5. Update Napalm Fire Patches (DoT on passing enemies)
    for (let i = this.firePatches.length - 1; i >= 0; i--) {
      const fp = this.firePatches[i];
      fp.duration--;

      // Apply DoT every 15 frames (~0.25s)
      if (fp.duration % 15 === 0) {
        for (const enemy of allEnemies) {
          if (enemy.data.isDead) continue;
          const dist = Math.hypot(enemy.data.position.x - fp.x, enemy.data.position.y - fp.y);
          if (dist <= fp.radius) {
            enemy.takeDamage(fp.damage, true);
            if (fxManager && typeof fxManager === 'object' && 'addDamageText' in fxManager && typeof fxManager.addDamageText === 'function') {
              fxManager.addDamageText(enemy.data.position.x, enemy.data.position.y, `-${fp.damage}`, '#ff9100');
            }
          }
        }
      }

      if (fp.duration <= 0) {
        this.firePatches.splice(i, 1);
      }
    }

    // 6. Update Freeze Overlay
    if (this.freezeOverlayAlpha > 0) {
      this.freezeOverlayAlpha = Math.max(0, this.freezeOverlayAlpha - 0.008);
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Render Scorch Marks
    for (const sm of this.scorchMarks) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38, 20, 15, ${sm.alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 61, 0, ${sm.alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Render Napalm Fire Patches
    for (const fp of this.firePatches) {
      ctx.save();
      const alpha = Math.min(0.6, fp.duration / 150 * 0.6);
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(216, 67, 21, ${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 145, 0, ${alpha * 1.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Render Shockwave Rings
    // O laranja era fixo aqui e ignorava s.color, então todo anel saía igual.
    for (const s of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // Render Falling Meteors
    for (const m of this.meteors) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(m.currentX, m.currentY, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffea00';
      ctx.fill();
      ctx.strokeStyle = '#ff3d00';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // Render Embers
    for (const e of this.embers) {
      ctx.save();
      ctx.globalAlpha = e.alpha;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      ctx.restore();
    }

    // Render Freeze Screen Overlay & Shards
    if (this.freezeOverlayAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 229, 255, ${this.freezeOverlayAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.strokeStyle = `rgba(128, 222, 234, ${this.freezeOverlayAlpha * 1.5})`;
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }
}
