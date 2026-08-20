import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Rng } from '../src/engine/Rng';
import { TalentManager } from '../src/engine/TalentManager';
import { ObjectiveManager } from '../src/engine/ObjectiveManager';
import { GameState } from '../src/engine/GameState';
import { EventBus } from '../src/engine/EventBus';
import { TutorialManager } from '../src/ui/TutorialManager';
import { WelcomeScreen } from '../src/ui/WelcomeScreen';
import { DatabaseManager } from '../src/engine/DatabaseManager';

describe('P2 — Retenção entre Sessões (Testes de Integração & Unidade)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Objetivos da Run (ObjectiveManager)', () => {
    it('deve gerar deterministicamente 3 objetivos distintos para a mesma semente', () => {
      const rng1 = new Rng(12345);
      const tm1 = new TalentManager();
      const objManager1 = new ObjectiveManager(rng1, tm1);

      const rng2 = new Rng(12345);
      const tm2 = new TalentManager();
      const objManager2 = new ObjectiveManager(rng2, tm2);

      const objs1 = objManager1.getObjectives();
      const objs2 = objManager2.getObjectives();

      expect(objs1.length).toBe(3);
      expect(objs2.length).toBe(3);
      expect(objs1.map((o) => o.id)).toEqual(objs2.map((o) => o.id));

      objManager1.destroy();
      objManager2.destroy();
    });

    it('deve progredir e completar objetivos ao disparar eventos do jogo', () => {
      const rng = new Rng('test-seed');
      const tm = new TalentManager();
      const objManager = new ObjectiveManager(rng, tm);

      const initialStars = tm.stars;
      const objs = objManager.getObjectives();
      expect(objs.length).toBe(3);

      // Simula construção de 4 torres para arsenal
      const objArsenal = objManager.getObjective('BUILD_4_DIFFERENT_TOWERS');
      if (objArsenal) {
        EventBus.getInstance().emit('tower:build', { towerType: 'ARCHER' });
        EventBus.getInstance().emit('tower:build', { towerType: 'CANNON' });
        EventBus.getInstance().emit('tower:build', { towerType: 'FROST' });
        EventBus.getInstance().emit('tower:build', { towerType: 'ARTILLERY' });
        expect(objArsenal.completed).toBe(true);
        expect(tm.stars).toBeGreaterThan(initialStars);
      }

      // Simula upgrade para nível 3
      const objLvl3 = objManager.getObjective('REACH_LEVEL_3_TOWER');
      if (objLvl3) {
        EventBus.getInstance().emit('tower:upgrade', { level: 3 });
        expect(objLvl3.completed).toBe(true);
      }

      objManager.destroy();
    });
  });

  describe('2. Prestígio Cósmico & Desbloqueios (TalentManager)', () => {
    it('deve permitir upgrade de prestígio ao ter 10★ e conceder +1% de dano global por nível', () => {
      const tm = new TalentManager();
      expect(tm.talents.prestigeLvl).toBe(0);
      expect(tm.getPrestigeDamageBonus()).toBe(0);

      // Sem estrelas suficientes
      tm.stars = 5;
      expect(tm.upgradePrestige()).toBe(false);
      expect(tm.talents.prestigeLvl).toBe(0);

      // Com 10 estrelas
      tm.stars = 15;
      expect(tm.upgradePrestige()).toBe(true);
      expect(tm.talents.prestigeLvl).toBe(1);
      expect(tm.stars).toBe(5);
      expect(tm.getPrestigeDamageBonus()).toBe(0.01);
      expect(tm.getDamageBonusMultiplier()).toBeCloseTo(1.01, 2);

      // Segundo nível
      tm.stars = 10;
      expect(tm.upgradePrestige()).toBe(true);
      expect(tm.talents.prestigeLvl).toBe(2);
      expect(tm.getPrestigeDamageBonus()).toBe(0.02);
      expect(tm.getDamageBonusMultiplier()).toBeCloseTo(1.02, 2);
    });

    it('deve verificar desbloqueios de mapas e torres corretamente', () => {
      const tm = new TalentManager();
      expect(tm.isTowerUnlocked('ARCHER')).toBe(true);
      expect(tm.isTowerUnlocked('SOLAR_PRISM')).toBe(true);
      expect(tm.isMapUnlocked('MAP_1')).toBe(true);
      expect(tm.isMapUnlocked('MAP_4')).toBe(true);
    });
  });

  describe('3. Mecânica de Última Chance (GameState)', () => {
    it('deve pausar o jogo e emitir game:last_chance na primeira derrota', () => {
      const state = new GameState(undefined, 'NORMAL');
      state.setStatus('PLAYING');
      state.gold = 150;
      state.baseHp = 2;

      let lastChanceEmitted = false;
      const onLastChance = () => {
        lastChanceEmitted = true;
      };
      EventBus.getInstance().on('game:last_chance', onLastChance);

      state.takeDamage(2);

      expect(lastChanceEmitted).toBe(true);
      expect(state.status).toBe('GAME_OVER');
      expect(state.hasUsedLastChance).toBe(false);

      EventBus.getInstance().off('game:last_chance', onLastChance);
    });

    it('deve reviver a base com 3 HP e zerar o ouro ao aplicar a Última Chance', () => {
      const state = new GameState(undefined, 'NORMAL');
      state.setStatus('PLAYING');
      state.gold = 250;
      state.baseHp = 0;

      state.applyLastChance();

      expect(state.hasUsedLastChance).toBe(true);
      expect(state.baseHp).toBe(3);
      expect(state.gold).toBe(0);

      // Segunda derrota deve ir direto para GAME_OVER
      state.takeDamage(3);
      expect(state.status).toBe('GAME_OVER');
      expect(state.baseHp).toBe(0);
    });
  });

  describe('4. Onboarding / Tutorial Guiado (TutorialManager)', () => {
    it('deve iniciar o tutorial no primeiro acesso e avançar nos eventos', () => {
      expect(localStorage.getItem('oh_my_td_has_seen_tutorial')).toBeNull();

      const tutorial = new TutorialManager();
      const tooltip = document.getElementById('tutorial-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain('TUTORIAL 1/3');

      // Avança para o passo 2 ao construir torre
      EventBus.getInstance().emit('tower:build', { towerType: 'ARCHER' });
      const tooltip2 = document.getElementById('tutorial-tooltip');
      expect(tooltip2?.textContent).toContain('TUTORIAL 2/3');

      // Avança para o passo 3 ao iniciar onda
      EventBus.getInstance().emit('wave:change', { current: 1, max: 10 });
      const tooltip3 = document.getElementById('tutorial-tooltip');
      expect(tooltip3?.textContent).toContain('DICA ESTRATÉGICA');

      tutorial.completeTutorial();
      expect(localStorage.getItem('oh_my_td_has_seen_tutorial')).toBe('true');
      expect(document.getElementById('tutorial-tooltip')).toBeNull();
      tutorial.destroy();
    });

    it('não deve exibir tutorial se já tiver visto anteriormente', () => {
      localStorage.setItem('oh_my_td_has_seen_tutorial', 'true');
      const tutorial = new TutorialManager();
      expect(document.getElementById('tutorial-tooltip')).toBeNull();
      tutorial.destroy();
    });
  });

  describe('5. Desafio Diário na WelcomeScreen', () => {
    it('deve propagar o modo DAILY no callback de início', () => {
      let startedMode: string | null = null;
      const welcome = new WelcomeScreen((mode) => {
        startedMode = mode;
      });

      const dailyBtn = document.querySelector('.retro-btn-daily') as HTMLButtonElement;
      expect(dailyBtn).not.toBeNull();
      dailyBtn.click();

      expect(startedMode).toBe('DAILY');
    });

    it('deve gerar seed diária consistente via DatabaseManager', () => {
      const db = DatabaseManager.getInstance();
      const seed = db.getDailySeed();
      expect(typeof seed).toBe('number');
      expect(seed).toBeGreaterThan(0);
    });
  });
});
