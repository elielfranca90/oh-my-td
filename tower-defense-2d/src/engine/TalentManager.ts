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

  private loadData() {
    try {
      const savedStars = localStorage.getItem(this.STARS_KEY);
      if (savedStars !== null) {
        this.stars = parseInt(savedStars, 10) || 0;
      }

      const savedTalents = localStorage.getItem(this.TALENTS_KEY);
      if (savedTalents !== null) {
        const parsed = JSON.parse(savedTalents);
        this.talents = {
          damageLvl: parsed.damageLvl || 0,
          goldLvl: parsed.goldLvl || 0,
          hpLvl: parsed.hpLvl || 0,
          cdLvl: parsed.cdLvl || 0,
        };
      }
    } catch {
      // Fallback on defaults if localStorage fails
    }
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

  // Bonus Calculators
  public getDamageBonusMultiplier(): number {
    return 1 + this.talents.damageLvl * 0.1; // +10%, +20%, +30%
  }

  public getStartingGoldBonus(): number {
    return this.talents.goldLvl * 25; // +25g, +50g
  }

  public getBaseHpBonus(): number {
    return this.talents.hpLvl * 5; // +5 HP, +10 HP
  }

  public getSpellCdReduction(): number {
    return this.talents.cdLvl * 0.15; // -15%, -30%
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
