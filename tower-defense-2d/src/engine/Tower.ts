import type { ITower2D, TargetingStrategy, TowerType, Vector2D } from '../types';

export class Tower2D {
  public data: ITower2D;
  private readonly size = 40;

  constructor(gridX: number, gridY: number, tileSize: number, type: TowerType, id: string) {
    const center: Vector2D = {
      x: gridX * tileSize + tileSize / 2,
      y: gridY * tileSize + tileSize / 2,
    };

    const config = this.getTowerConfig(type);

    this.data = {
      id,
      type,
      gridX,
      gridY,
      range: config.range,
      damage: config.damage,
      fireRate: config.fireRate,
      cooldownTimer: 0,
      cost: config.cost,
      level: 1,
      position: center,
      targeting: 'FIRST',
      splashRadius: config.splashRadius,
      slowFactor: config.slowFactor,
      hp: Math.round(100 * (type === 'ARTILLERY' || type === 'CANNON' ? 1.5 : 1.0)),
      maxHp: Math.round(100 * (type === 'ARTILLERY' || type === 'CANNON' ? 1.5 : 1.0)),
      isDestroyed: false,
    };
  }

  private getTowerConfig(type: TowerType) {
    switch (type) {
      case 'CANNON':
        return { cost: 105, range: 120, damage: 14, fireRate: 90 };
      case 'SOLAR_PRISM':
        return { cost: 100, range: 140, damage: 4, fireRate: 24 };
      case 'FROST':
        return { cost: 70, range: 130, damage: 2, fireRate: 40, slowFactor: 0.5 };
      case 'ARTILLERY':
        return { cost: 110, range: 170, damage: 25, fireRate: 110, splashRadius: 50 };
      case 'BASIC':
      default:
        return { cost: 50, range: 150, damage: 5, fireRate: 45 };
    }
  }

  public cycleTargeting() {
    const strategies: TargetingStrategy[] = ['FIRST', 'STRONGEST', 'WEAKEST', 'LAST'];
    const nextIndex = (strategies.indexOf(this.data.targeting) + 1) % strategies.length;
    this.data.targeting = strategies[nextIndex];
  }

  public getUpgradeCost(): number {
    return Math.floor(this.data.cost * 0.8 * this.data.level);
  }

  public getSellValue(): number {
    let totalInvested = this.data.cost;
    for (let l = 1; l < this.data.level; l++) {
      totalInvested += Math.floor(this.data.cost * 0.8 * l);
    }
    return Math.floor(totalInvested * 0.7);
  }

  public upgrade(): boolean {
    if (this.data.level >= 3 || this.data.isDestroyed) return false;
    this.data.level++;
    this.data.damage = Math.floor(this.data.damage * 1.5);
    this.data.range = Math.floor(this.data.range * 1.15);
    this.data.maxHp = Math.floor(this.data.maxHp * 1.4);
    this.data.hp = this.data.maxHp;
    if (this.data.splashRadius) {
      this.data.splashRadius = Math.floor(this.data.splashRadius * 1.1);
    }
    return true;
  }

  public takeDamage(amount: number): boolean {
    if (this.data.isDestroyed) return true;
    this.data.hp = Math.max(0, this.data.hp - amount);
    if (this.data.hp <= 0) {
      this.data.isDestroyed = true;
    }
    return this.data.isDestroyed;
  }

  public getRepairCost(): number {
    if (this.data.isDestroyed) {
      // 30% cheaper than new tower cost
      return Math.ceil(this.data.cost * 0.7);
    }
    const missingHpRatio = (this.data.maxHp - this.data.hp) / this.data.maxHp;
    return Math.max(5, Math.ceil(this.data.cost * 0.7 * missingHpRatio));
  }

  public repair(): boolean {
    this.data.hp = this.data.maxHp;
    this.data.isDestroyed = false;
    return true;
  }

  public update(): boolean {
    if (this.data.isDestroyed) return false;
    if (this.data.cooldownTimer > 0) {
      this.data.cooldownTimer--;
      return false;
    }
    return true;
  }

  public render(ctx: CanvasRenderingContext2D, isSelected = false, isHovered = false) {
    const half = this.size / 2;

    // Range visualizer on select or hover
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(this.data.position.x, this.data.position.y, this.data.range, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(255, 235, 59, 0.2)' : 'rgba(33, 150, 243, 0.15)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fbc02d' : '#2196f3';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    // Base body color per type
    let color = '#1565c0'; // Basic
    if (this.data.type === 'CANNON') color = '#d84315';
    if (this.data.type === 'SOLAR_PRISM') color = '#ff8f00';
    if (this.data.type === 'FROST') color = '#00838f';
    if (this.data.type === 'ARTILLERY') color = '#4a148c';

    if (this.data.isDestroyed) {
      // Destroyed Crater Render
      ctx.fillStyle = '#212121';
      ctx.fillRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);
      ctx.strokeStyle = '#f44336';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❌', this.data.position.x, this.data.position.y + 4);
      return;
    }

    ctx.fillStyle = color;
    ctx.fillRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);

    // Border
    ctx.strokeStyle = isSelected ? '#ffeb3b' : '#ffffff';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeRect(this.data.position.x - half, this.data.position.y - half, this.size, this.size);

    // Core icon / shape
    ctx.beginPath();
    ctx.arc(this.data.position.x, this.data.position.y, 9, 0, Math.PI * 2);
    let coreColor = '#90caf9';
    if (this.data.type === 'CANNON') coreColor = '#ff7043';
    if (this.data.type === 'SOLAR_PRISM') coreColor = '#ffeb3b';
    if (this.data.type === 'FROST') coreColor = '#80deea';
    if (this.data.type === 'ARTILLERY') coreColor = '#e1bee7';
    ctx.fillStyle = coreColor;
    ctx.fill();

    // Level indicator dots
    for (let i = 0; i < this.data.level; i++) {
      ctx.beginPath();
      ctx.arc(
        this.data.position.x - 8 + i * 8,
        this.data.position.y + half - 5,
        2.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#ffeb3b';
      ctx.fill();
    }

    // Health Bar if damaged
    if (this.data.hp < this.data.maxHp) {
      const bw = this.size - 4;
      const bh = 4;
      const bx = this.data.position.x - bw / 2;
      const by = this.data.position.y - half - 7;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      const hpRatio = Math.max(0, this.data.hp / this.data.maxHp);
      ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(bx, by, bw * hpRatio, bh);
    }
  }
}
