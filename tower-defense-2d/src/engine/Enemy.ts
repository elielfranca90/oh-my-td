import type { EnemyType, IEnemy2D, Vector2D } from '../types';

export class Enemy2D {
  public data: IEnemy2D;
  public baseDamage: number;

  constructor(waypoints: Vector2D[], type: EnemyType, id: string, hpMultiplier = 1.0) {
    const config = this.getEnemyConfig(type);
    this.baseDamage = config.baseDamage;

    const scaledHp = Math.round(config.hp * hpMultiplier);
    const scaledReward = Math.round(config.reward * Math.pow(hpMultiplier, 0.4));

    this.data = {
      id,
      type,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: config.speed,
      goldReward: scaledReward,
      waypointIndex: 0,
      position: { ...waypoints[0] },
      isDead: false,
      radius: config.radius,
      color: config.color,
      slowTimer: 0,
      slowFactor: 1,
      freezeTimer: 0,
    };
  }

  private getEnemyConfig(type: EnemyType) {
    switch (type) {
      case 'RUNNER':
        return { hp: 6, speed: 3.5, radius: 11, reward: 8, color: '#ff9800', baseDamage: 1 };
      case 'TANK':
        return { hp: 35, speed: 1.1, radius: 20, reward: 25, color: '#8e24aa', baseDamage: 2 };
      case 'BOSS':
        return { hp: 160, speed: 0.8, radius: 26, reward: 100, color: '#d50000', baseDamage: 5 };
      case 'STANDARD':
      default:
        return { hp: 10, speed: 2.0, radius: 15, reward: 10, color: '#e53935', baseDamage: 1 };
    }
  }

  public applySlow(factor: number, durationFrames = 120) {
    this.data.slowFactor = Math.min(this.data.slowFactor, factor);
    this.data.slowTimer = Math.max(this.data.slowTimer, durationFrames);
  }

  public applyFreeze(durationFrames = 210) { // 3.5 sec at 60fps
    this.data.freezeTimer = Math.max(this.data.freezeTimer, durationFrames);
  }

  public update(waypoints: Vector2D[]): boolean {
    if (this.data.isDead) return false;

    // Handle timers
    if (this.data.freezeTimer > 0) {
      this.data.freezeTimer--;
      return false; // Stationary while frozen
    }

    let effectiveSpeed = this.data.speed;
    if (this.data.slowTimer > 0) {
      this.data.slowTimer--;
      effectiveSpeed *= this.data.slowFactor;
      if (this.data.slowTimer <= 0) {
        this.data.slowFactor = 1;
      }
    }

    let distanceToMove = effectiveSpeed;

    while (distanceToMove > 0) {
      const target = waypoints[this.data.waypointIndex + 1];
      if (!target) return true; // Reached base/end

      const dx = target.x - this.data.position.x;
      const dy = target.y - this.data.position.y;
      const distToNext = Math.hypot(dx, dy);

      if (distToNext <= distanceToMove) {
        // Snap to waypoint corner and continue remaining movement distance to next waypoint
        this.data.position.x = target.x;
        this.data.position.y = target.y;
        this.data.waypointIndex++;
        distanceToMove -= distToNext;
      } else {
        // Move towards target
        this.data.position.x += (dx / distToNext) * distanceToMove;
        this.data.position.y += (dy / distToNext) * distanceToMove;
        distanceToMove = 0;
      }
    }

    return false;
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.data.isDead) return;

    // Slow/Freeze Aura
    if (this.data.freezeTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.fill();
    } else if (this.data.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(41, 121, 255, 0.3)';
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    ctx.arc(this.data.position.x, this.data.position.y, this.data.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.data.freezeTimer > 0 ? '#80deea' : this.data.color;
    ctx.fill();

    // Outline
    ctx.strokeStyle = this.data.type === 'BOSS' ? '#ffd700' : '#ffffff';
    ctx.lineWidth = this.data.type === 'BOSS' ? 3 : 1.5;
    ctx.stroke();

    // HP Bar
    const barWidth = this.data.radius * 2.2;
    const barHeight = this.data.type === 'BOSS' ? 6 : 4;
    const barX = this.data.position.x - barWidth / 2;
    const barY = this.data.position.y - this.data.radius - (this.data.type === 'BOSS' ? 10 : 8);

    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpRatio = Math.max(0, this.data.hp / this.data.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.2 ? '#ff9800' : '#f44336';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }
}
