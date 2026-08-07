export interface TalentData {
  damageLvl: number;
  goldLvl: number;
  hpLvl: number;
  cdLvl: number;
}

export class TalentManager {
  public stars = 0;
  public talents: TalentData = {
    damageLvl: 0,
    goldLvl: 0,
    hpLvl: 0,
    cdLvl: 0,
  };

  private readonly STARS_KEY = 'td2d_stars_v1';
  private readonly TALENTS_KEY = 'td2d_talents_v1';

  constructor() {
    this.loadData();
  }

  /** Persisted progression is untrusted input: validate the type and clamp every level. */
  private loadData() {
    try {
      const savedStars = localStorage.getItem(this.STARS_KEY);
      if (savedStars !== null) {
        const stars = parseInt(savedStars, 10);
        this.stars = Number.isFinite(stars) ? Math.max(0, stars) : 0;
      }

      const savedTalents = localStorage.getItem(this.TALENTS_KEY);
      if (savedTalents !== null) {
        const parsed: unknown = JSON.parse(savedTalents);
        if (typeof parsed === 'object' && parsed !== null) {
          const raw = parsed as Record<string, unknown>;
          this.talents = {
            damageLvl: this.readLevel(raw.damageLvl, 'damageLvl'),
            goldLvl: this.readLevel(raw.goldLvl, 'goldLvl'),
            hpLvl: this.readLevel(raw.hpLvl, 'hpLvl'),
            cdLvl: this.readLevel(raw.cdLvl, 'cdLvl'),
          };
        }
      }
    } catch {
      // Fallback on defaults if localStorage fails
    }
  }

  private readLevel(value: unknown, type: keyof TalentData): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(this.getTalentMaxLvl(type), Math.floor(value)));
  }

  public saveData() {
    try {
      localStorage.setItem(this.STARS_KEY, this.stars.toString());
      localStorage.setItem(this.TALENTS_KEY, JSON.stringify(this.talents));
    } catch {
      // Ignore
    }
  }

  public earnStars(amount: number) {
    if (amount <= 0) return;
    this.stars += amount;
    this.saveData();
  }

  // Bonus Calculators — clamped so no persisted value can exceed the designed cap.
  public getDamageBonusMultiplier(): number {
    return 1 + this.clampedLevel('damageLvl') * 0.1; // +10%, +20%, +30%
  }

  public getStartingGoldBonus(): number {
    return this.clampedLevel('goldLvl') * 25; // +25g, +50g
  }

  public getBaseHpBonus(): number {
    return this.clampedLevel('hpLvl') * 5; // +5 HP, +10 HP
  }

  public getSpellCdReduction(): number {
    return this.clampedLevel('cdLvl') * 0.15; // -15%, -30%
  }

  private clampedLevel(type: keyof TalentData): number {
    const value = this.talents[type];
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(this.getTalentMaxLvl(type), value));
  }

  // Talent Upgrade Costs
  public getTalentCost(type: keyof TalentData): number {
    const current = this.talents[type];
    switch (type) {
      case 'damageLvl':
        return current === 0 ? 2 : current === 1 ? 4 : 6;
      case 'goldLvl':
        return current === 0 ? 3 : 5;
      case 'hpLvl':
        return current === 0 ? 2 : 4;
      case 'cdLvl':
        return current === 0 ? 3 : 5;
      default:
        return 999;
    }
  }

  public getTalentMaxLvl(type: keyof TalentData): number {
    return type === 'damageLvl' ? 3 : 2;
  }

  public upgradeTalent(type: keyof TalentData): boolean {
    const cost = this.getTalentCost(type);
    const maxLvl = this.getTalentMaxLvl(type);

    if (this.talents[type] >= maxLvl) return false;
    if (this.stars < cost) return false;

    this.stars -= cost;
    this.talents[type]++;
    this.saveData();
    return true;
  }
}
