import type { DatabaseManager } from './DatabaseManager';
import type { TalentData, TowerType, MapId } from '../types';
export type { TalentData };

export class TalentManager {
  public stars = 0;
  public talents: TalentData = {
    damageLvl: 0,
    goldLvl: 0,
    hpLvl: 0,
    cdLvl: 0,
    repairLvl: 0,
    critLvl: 0,
    prestigeLvl: 0,
  };
  public unlockedTowers: string[] = ['ARCHER', 'CANNON', 'FROST', 'ARTILLERY', 'SOLAR_PRISM'];
  public unlockedMaps: string[] = ['MAP_1', 'MAP_2', 'MAP_3', 'MAP_4'];
  private readonly STARS_KEY = 'td2d_stars_v1';
  private readonly TALENTS_KEY = 'td2d_talents_v1';
  private db: DatabaseManager | null = null;

  constructor(db?: DatabaseManager) {
    this.db = db || null;
    this.loadData();
    if (this.db) {
      this.syncWithRemote();
    }
  }

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
            repairLvl: this.readLevel(raw.repairLvl, 'repairLvl'),
            critLvl: this.readLevel(raw.critLvl, 'critLvl'),
            prestigeLvl: typeof raw.prestigeLvl === 'number' && Number.isFinite(raw.prestigeLvl) ? Math.max(0, Math.floor(raw.prestigeLvl)) : 0,
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

  public setDatabaseManager(db: DatabaseManager) {
    this.db = db;
    this.syncWithRemote();
  }

  public async syncWithRemote() {
    if (!this.db || !this.db.isConnected()) return;
    const remote = await this.db.fetchRemotePlayerState();
    if (remote) {
      const mergedStars = Math.max(this.stars, remote.stars);
      const mergedDamage = Math.max(this.talents.damageLvl, remote.talents.damageLvl);
      const mergedGold = Math.max(this.talents.goldLvl, remote.talents.goldLvl);
      const mergedHp = Math.max(this.talents.hpLvl, remote.talents.hpLvl);
      const mergedCd = Math.max(this.talents.cdLvl, remote.talents.cdLvl);
      const mergedRepair = Math.max(this.talents.repairLvl, remote.talents.repairLvl);
      const mergedCrit = Math.max(this.talents.critLvl, remote.talents.critLvl);
      const mergedPrestige = Math.max(this.talents.prestigeLvl || 0, remote.talents.prestigeLvl || 0);

      const localHadHigher =
        this.stars > remote.stars ||
        this.talents.damageLvl > remote.talents.damageLvl ||
        this.talents.goldLvl > remote.talents.goldLvl ||
        this.talents.hpLvl > remote.talents.hpLvl ||
        this.talents.cdLvl > remote.talents.cdLvl ||
        this.talents.repairLvl > remote.talents.repairLvl ||
        this.talents.critLvl > remote.talents.critLvl ||
        (this.talents.prestigeLvl || 0) > (remote.talents.prestigeLvl || 0);

      this.stars = mergedStars;
      this.talents.damageLvl = mergedDamage;
      this.talents.goldLvl = mergedGold;
      this.talents.hpLvl = mergedHp;
      this.talents.cdLvl = mergedCd;
      this.talents.repairLvl = mergedRepair;
      this.talents.critLvl = mergedCrit;
      this.talents.prestigeLvl = mergedPrestige;

      this.saveLocalData();

      if (localHadHigher) {
        this.db.queuePlayerStateSync(this.stars, this.talents);
      }
    } else {
      this.db.queuePlayerStateSync(this.stars, this.talents);
    }
  }

  private saveLocalData() {
    try {
      localStorage.setItem(this.STARS_KEY, this.stars.toString());
      localStorage.setItem(this.TALENTS_KEY, JSON.stringify(this.talents));
    } catch {
      // Ignore
    }
  }

  public saveData() {
    this.saveLocalData();
    if (this.db) {
      this.db.queuePlayerStateSync(this.stars, this.talents);
    }
  }

  public earnStars(amount: number) {
    if (amount <= 0) return;
    this.stars += amount;
    this.saveData();
  }

  // Bonus Calculators
  public getPrestigeDamageBonus(): number {
    return (this.talents.prestigeLvl || 0) * 0.01; // +1% por nível de prestígio
  }

  public getDamageBonusMultiplier(): number {
    return 1 + this.talents.damageLvl * 0.1 + this.getPrestigeDamageBonus(); // Base + Talentos (+10%/lvl) + Prestígio (+1%/lvl)
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

  public getRepairDiscount(): number {
    return this.talents.repairLvl * 0.25; // 25%, 50%
  }

  public getCritChance(): number {
    return this.talents.critLvl * 0.10; // 10%, 20%
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
      case 'repairLvl':
        return current === 0 ? 3 : 5;
      case 'critLvl':
        return current === 0 ? 3 : 5;
      default:
        return 999;
    }
  }

  public getTalentMaxLvl(type: keyof TalentData): number {
    switch (type) {
      case 'damageLvl':
        return 3;
      case 'goldLvl':
      case 'hpLvl':
      case 'cdLvl':
      case 'repairLvl':
      case 'critLvl':
      default:
        return 2;
    }
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

  // Prestígio Cósmico Soft-Infinito (C4)
  public getPrestigeCost(): number {
    return 10; // Custo fixo de 10★ por nível de prestígio cósmico (+1% Dano Global)
  }

  public upgradePrestige(): boolean {
    const cost = this.getPrestigeCost();
    if (this.stars < cost) return false;

    this.stars -= cost;
    this.talents.prestigeLvl = (this.talents.prestigeLvl || 0) + 1;
    this.saveData();
    return true;
  }

  // Desbloqueios de Conteúdo por Estrelas (C4)
  public isTowerUnlocked(type: TowerType): boolean {
    return this.unlockedTowers.includes(type);
  }

  public isMapUnlocked(mapId: MapId): boolean {
    return this.unlockedMaps.includes(mapId);
  }
}
