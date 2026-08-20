import type { RunObjective, RunObjectiveId } from '../types';
import { EventBus } from './EventBus';
import type { Rng } from './Rng';
import type { TalentManager } from './TalentManager';

interface ObjectiveTemplate {
  id: RunObjectiveId;
  title: string;
  description: string;
  starReward: number;
  target: number;
}

const OBJECTIVE_POOL: ObjectiveTemplate[] = [
  {
    id: 'SURVIVE_WAVE_5_NO_DAMAGE',
    title: 'Defesa Impecável',
    description: 'Chegue à Onda 5 sem sofrer dano na base',
    starReward: 2,
    target: 5,
  },
  {
    id: 'KILL_15_SPECIAL_TOWER',
    title: 'Poder de Artilharia',
    description: 'Elimine 15 inimigos com Canhões ou Artilharia',
    starReward: 2,
    target: 15,
  },
  {
    id: 'REACH_LEVEL_3_TOWER',
    title: 'Especialista em Armas',
    description: 'Evolua qualquer torre para o Nível 3',
    starReward: 1,
    target: 1,
  },
  {
    id: 'CAST_SPELLS_3_TIMES',
    title: 'Mestre Arcano',
    description: 'Conjure 3 feitiços (Meteoro ou Congelamento)',
    starReward: 2,
    target: 3,
  },
  {
    id: 'ACCUMULATE_300_GOLD',
    title: 'Tesouro de Guerra',
    description: 'Acumule 300 de ouro no cofre',
    starReward: 2,
    target: 300,
  },
  {
    id: 'BUILD_4_DIFFERENT_TOWERS',
    title: 'Arsenal Versátil',
    description: 'Construa pelo menos 4 tipos diferentes de torres',
    starReward: 2,
    target: 4,
  },
  {
    id: 'SURVIVE_WAVE_10',
    title: 'Sobrevivente Veterano',
    description: 'Complete a Onda 10 com sucesso',
    starReward: 3,
    target: 10,
  },
  {
    id: 'EARLY_CALL_3_TIMES',
    title: 'Comandante Agressivo',
    description: 'Faça 3 chamadas antecipadas de onda com bônus',
    starReward: 2,
    target: 3,
  },
];

export class ObjectiveManager {
  private rng: Rng;
  private talentManager: TalentManager;
  private objectives: RunObjective[] = [];
  private baseDamagedBeforeWave5 = false;
  private builtTowerTypes: Set<string> = new Set();
  private maxTowerLevel = 1;
  private spellsCastCount = 0;
  private earlyCallsCount = 0;
  private specialKillsCount = 0;
  private unsubscribers: Array<() => void> = [];

  constructor(rng: Rng, talentManager: TalentManager) {
    this.rng = rng;
    this.talentManager = talentManager;
    this.initObjectives();
    this.bindEvents();
  }

  private initObjectives(): void {
    // Sorteio determinístico de 3 objetivos distintos sem reposição
    const pool = [...OBJECTIVE_POOL];
    const selected: ObjectiveTemplate[] = [];

    while (selected.length < 3 && pool.length > 0) {
      const idx = this.rng.int(pool.length);
      selected.push(pool[idx]);
      pool.splice(idx, 1);
    }

    this.objectives = selected.map((tpl) => ({
      id: tpl.id,
      title: tpl.title,
      description: tpl.description,
      starReward: tpl.starReward,
      target: tpl.target,
      current: 0,
      completed: false,
      claimed: false,
    }));
  }

  private bindEvents(): void {
    const bus = EventBus.getInstance();

    const onHpChange = (data: { current: number; max: number }) => {
      if (data.current < data.max) {
        this.baseDamagedBeforeWave5 = true;
      }
    };

    const onWaveChange = (data: { current: number; max: number }) => {
      // Objetivo: Sobreviva até a onda 5 sem dano
      const objSurvive5 = this.getObjective('SURVIVE_WAVE_5_NO_DAMAGE');
      if (objSurvive5 && !objSurvive5.completed) {
        if (!this.baseDamagedBeforeWave5) {
          objSurvive5.current = Math.min(objSurvive5.target, data.current);
          if (data.current >= 5) {
            this.completeObjective(objSurvive5);
          }
        }
      }

      // Objetivo: Sobreviva à onda 10
      const objSurvive10 = this.getObjective('SURVIVE_WAVE_10');
      if (objSurvive10 && !objSurvive10.completed) {
        objSurvive10.current = Math.min(objSurvive10.target, data.current);
        if (data.current >= 10) {
          this.completeObjective(objSurvive10);
        }
      }
      this.emitUpdate();
    };

    const onTowerBuild = (data: { towerType?: string }) => {
      if (data?.towerType) {
        this.builtTowerTypes.add(data.towerType);
        const objArsenal = this.getObjective('BUILD_4_DIFFERENT_TOWERS');
        if (objArsenal && !objArsenal.completed) {
          objArsenal.current = Math.min(objArsenal.target, this.builtTowerTypes.size);
          if (objArsenal.current >= objArsenal.target) {
            this.completeObjective(objArsenal);
          }
          this.emitUpdate();
        }
      }
    };

    const onTowerUpgrade = (data: { level?: number }) => {
      if (data?.level && data.level > this.maxTowerLevel) {
        this.maxTowerLevel = data.level;
      }
      const objLvl3 = this.getObjective('REACH_LEVEL_3_TOWER');
      if (objLvl3 && !objLvl3.completed && this.maxTowerLevel >= 3) {
        objLvl3.current = 1;
        this.completeObjective(objLvl3);
        this.emitUpdate();
      }
    };

    const onGoldChange = (gold: number) => {
      const objGold = this.getObjective('ACCUMULATE_300_GOLD');
      if (objGold && !objGold.completed) {
        objGold.current = Math.min(objGold.target, gold);
        if (gold >= objGold.target) {
          this.completeObjective(objGold);
          this.emitUpdate();
        }
      }
    };

    const onSpellCast = () => {
      this.spellsCastCount++;
      const objSpell = this.getObjective('CAST_SPELLS_3_TIMES');
      if (objSpell && !objSpell.completed) {
        objSpell.current = Math.min(objSpell.target, this.spellsCastCount);
        if (objSpell.current >= objSpell.target) {
          this.completeObjective(objSpell);
          this.emitUpdate();
        }
      }
    };

    const onEarlyCall = () => {
      this.earlyCallsCount++;
      const objEarly = this.getObjective('EARLY_CALL_3_TIMES');
      if (objEarly && !objEarly.completed) {
        objEarly.current = Math.min(objEarly.target, this.earlyCallsCount);
        if (objEarly.current >= objEarly.target) {
          this.completeObjective(objEarly);
          this.emitUpdate();
        }
      }
    };

    const onEnemyKill = (data: { towerType?: string }) => {
      if (data?.towerType === 'CANNON' || data?.towerType === 'ARTILLERY') {
        this.specialKillsCount++;
        const objKills = this.getObjective('KILL_15_SPECIAL_TOWER');
        if (objKills && !objKills.completed) {
          objKills.current = Math.min(objKills.target, this.specialKillsCount);
          if (objKills.current >= objKills.target) {
            this.completeObjective(objKills);
            this.emitUpdate();
          }
        }
      }
    };

    bus.on('hp:change', onHpChange);
    bus.on('wave:change', onWaveChange);
    bus.on('tower:build', onTowerBuild);
    bus.on('tower:upgrade', onTowerUpgrade);
    bus.on('gold:change', onGoldChange);
    bus.on('spell:cast', onSpellCast);
    bus.on('wave:early_bonus', onEarlyCall);
    bus.on('enemy:kill', onEnemyKill);

    this.unsubscribers.push(() => {
      bus.off('hp:change', onHpChange);
      bus.off('wave:change', onWaveChange);
      bus.off('tower:build', onTowerBuild);
      bus.off('tower:upgrade', onTowerUpgrade);
      bus.off('gold:change', onGoldChange);
      bus.off('spell:cast', onSpellCast);
      bus.off('wave:early_bonus', onEarlyCall);
      bus.off('enemy:kill', onEnemyKill);
    });
  }

  private completeObjective(obj: RunObjective): void {
    if (obj.completed) return;
    obj.completed = true;
    obj.claimed = true;
    obj.current = obj.target;

    this.talentManager.earnStars(obj.starReward);
    EventBus.getInstance().emit('objective:completed', obj);
  }

  private emitUpdate(): void {
    EventBus.getInstance().emit('objectives:updated', this.objectives);
  }

  public getObjective(id: RunObjectiveId): RunObjective | undefined {
    return this.objectives.find((o) => o.id === id);
  }

  public getObjectives(): RunObjective[] {
    return this.objectives;
  }

  public destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
