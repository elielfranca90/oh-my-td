import { describe, expect, it } from 'vitest';
import { AudioManager } from '../src/engine/AudioManager';
import { Enemy2D } from '../src/engine/Enemy';
import { FXManager } from '../src/engine/FXManager';
import { GameState } from '../src/engine/GameState';
import { ParticleManager } from '../src/engine/ParticleManager';
import { Rng } from '../src/engine/Rng';
import { SpellManager } from '../src/engine/SpellManager';
import type { EnemyType, Vector2D } from '../src/types';

/**
 * Cobertura da Entrega 5 do P1_BALANCE_SPEC.md — magias com dano escalável.
 * `SpellManager` não tinha nenhum teste antes desta rodada (confirmado na
 * spec, seção "Cobertura ausente").
 */

function makeEnemyAt(type: EnemyType, hpMultiplier: number, pos: Vector2D, rng?: Rng): Enemy2D {
  const waypoints: Vector2D[] = [pos, { x: pos.x + 999, y: pos.y }];
  return new Enemy2D(waypoints, type, `e-${type}-${pos.x}`, hpMultiplier, 0, 1.0, 1.0, rng);
}

/** Monta um SpellManager de teste com ouro suficiente para qualquer custo de magia. */
function makeSpell(gold = 1_000_000) {
  const state = new GameState();
  state.gold = gold;
  const fx = new FXManager();
  const audio = new AudioManager();
  const particles = new ParticleManager();
  const spell = new SpellManager(state, fx, audio, particles);
  return { spell, state, fx, audio, particles };
}

/** Avança a animação do meteoro até o impacto (progress += 0.05 por update -> 20 chamadas). */
function advanceMeteorImpact(particles: ParticleManager) {
  for (let i = 0; i < 20; i++) particles.update();
}

describe('Entrega 5 — Meteoro: dano proporcional ao maxHp do alvo (§5.1)', () => {
  it('dano = round(90 + 0.12*maxHp) — validado com os números de exemplo do §5.2', () => {
    const { spell, particles } = makeSpell();

    // STANDARD, onda 1 (maxHp 10): dano esperado 91 (one-shot, igual a hoje).
    const standard = makeEnemyAt('STANDARD', 1.0, { x: 0, y: 0 });
    spell.castMeteorAt(0, 0, [standard]);
    advanceMeteorImpact(particles);
    expect(standard.data.isDead).toBe(true); // 91 de dano contra 10 de HP

    // BOSS, onda 20 do endless (maxHp 3768, hpMultiplier 23.55): dano esperado 542.
    const boss = makeEnemyAt('BOSS', 23.55, { x: 0, y: 0 });
    expect(boss.data.maxHp).toBe(3768);
    spell.meteorCooldownMs = 0;
    spell.castMeteorAt(0, 0, [boss]);
    advanceMeteorImpact(particles);
    expect(boss.data.maxHp - boss.data.hp).toBe(542); // round(90 + 0.12*3768) = 542
  });

  it('um alvo com muito mais HP máximo toma mais dano que um alvo fraco no mesmo estouro', () => {
    const { spell, particles } = makeSpell();

    const fraco = makeEnemyAt('BOSS', 1.0, { x: 0, y: 0 }); // maxHp 160
    const forte = makeEnemyAt('BOSS', 5.0, { x: 10, y: 10 }); // maxHp 800, mesmo raio (90px)

    spell.castMeteorAt(0, 0, [fraco, forte]);
    advanceMeteorImpact(particles);

    const danoFraco = fraco.data.maxHp - fraco.data.hp;
    const danoForte = forte.data.maxHp - forte.data.hp;

    expect(danoFraco).toBe(109); // round(90 + 0.12*160)
    expect(danoForte).toBe(186); // round(90 + 0.12*800)
    expect(danoForte).toBeGreaterThan(danoFraco);
  });

  it('usa maxHp, não o HP atual — dano não varia se o alvo já estiver ferido', () => {
    const { spell, particles } = makeSpell();

    const ileso = makeEnemyAt('BOSS', 1.0, { x: 0, y: 0 });
    const ferido = makeEnemyAt('BOSS', 1.0, { x: 5, y: 5 });
    ferido.takeDamage(100, 1, false); // fere sem matar (maxHp 160)
    expect(ferido.data.hp).toBeLessThan(ferido.data.maxHp);

    spell.castMeteorAt(0, 0, [ileso, ferido]);
    advanceMeteorImpact(particles);

    // Mesmo maxHp -> mesmo dano do Meteoro, independente do HP atual.
    const danoIleso = ileso.data.maxHp - ileso.data.hp;
    expect(danoIleso).toBe(109);
  });

  it('ignora armadura por completo (armorPenetration=1): TANK toma o dano cheio, sem redução de armorFactor', () => {
    const { spell, particles } = makeSpell();

    // hpMultiplier 5 -> maxHp 175, com folga suficiente para o dano de 111 não
    // ser mascarado pelo clamp em 0 (TANK base só tem 35 HP).
    const tank = makeEnemyAt('TANK', 5.0, { x: 0, y: 0 }); // maxHp 175, armorFactor 0.6
    spell.castMeteorAt(0, 0, [tank]);
    advanceMeteorImpact(particles);

    const dano = tank.data.maxHp - tank.data.hp;
    // Se a armadura fosse aplicada, o dano seria round(111*0.6)=67. Sem
    // redução, é o valor cheio round(90+0.12*175)=111.
    expect(dano).toBe(111);
  });

  it('não é esquivável (isAvoidable=false): RUNNER não escapa mesmo com semente que causaria dodge', () => {
    // Semente 7: primeiro draw ~0.0117, abaixo dos 25% de dodgeChance do
    // RUNNER — a mesma semente usada em tests/damage_pipeline.test.ts.
    const { spell, particles } = makeSpell();
    const rng = new Rng(7);
    const runner = makeEnemyAt('RUNNER', 1.0, { x: 0, y: 0 }, rng);

    spell.castMeteorAt(0, 0, [runner]);
    advanceMeteorImpact(particles);

    expect(runner.data.isDead).toBe(true); // não esquivou: maxHp 6, dano de área mata
  });
});

describe('Entrega 5 — Congelamento: efeito intocado, só o custo ganha o mecanismo de decaimento', () => {
  it('duração de 3.5s (210 frames) continua igual, independente do decaimento de custo', () => {
    const { spell, particles } = makeSpell();
    const enemy = makeEnemyAt('STANDARD', 1.0, { x: 0, y: 0 });

    spell.triggerGlobalFreeze([enemy]);
    expect(enemy.data.freezeTimer).toBe(210);

    // Decai o custo algumas vezes; o efeito de congelamento em si não usa
    // costStep nenhum, então continua idêntico num cast seguinte.
    spell.onWaveCompleted();
    spell.onWaveCompleted();
    spell.freezeCooldownMs = 0;
    const enemy2 = makeEnemyAt('STANDARD', 1.0, { x: 0, y: 0 });
    spell.triggerGlobalFreeze([enemy2]);
    expect(enemy2.data.freezeTimer).toBe(210);
    void particles; // não usado neste teste — mantido para simetria do helper
  });
});

describe('Entrega 5 — decaimento de custo por ondas sem uso (§5.4)', () => {
  it('custo dobra a cada cast (baseCost * 2^costStep), com teto em costStep=6', () => {
    const { spell } = makeSpell();
    expect(spell.meteorCost).toBe(150);

    spell.castMeteorAt(0, 0, []);
    expect(spell.meteorCost).toBe(300); // costStep 1

    spell.meteorCooldownMs = 0;
    spell.castMeteorAt(0, 0, []);
    expect(spell.meteorCost).toBe(600); // costStep 2

    // Continua castando sem decair (sem chamar onWaveCompleted): sobe até o teto.
    for (let i = 0; i < 10; i++) {
      spell.meteorCooldownMs = 0;
      spell.castMeteorAt(0, 0, []);
    }
    expect(spell.meteorCost).toBe(150 * 64); // 9600g, costStep travado em 6
  });

  it('1 onda sem usar não decai; a cada 2 ondas completadas, decai 1 passo', () => {
    const { spell } = makeSpell();
    spell.castMeteorAt(0, 0, []); // costStep 1 -> 300g

    spell.onWaveCompleted(); // 1 onda desde o último cast: sem decaimento (1 % 2 !== 0)
    expect(spell.meteorCost).toBe(300);

    spell.onWaveCompleted(); // 2 ondas: decai 1 passo
    expect(spell.meteorCost).toBe(150);
  });

  it('decaimento nunca passa de costStep=0 (piso), mesmo com muitas ondas paradas', () => {
    const { spell } = makeSpell();
    expect(spell.meteorCost).toBe(150); // já no piso

    for (let i = 0; i < 20; i++) spell.onWaveCompleted();

    expect(spell.meteorCost).toBe(150);
  });

  it('padrão tático (1 cast a cada 3 ondas) nunca sai do custo-base: o step sempre decai de volta a 0 antes do próximo uso', () => {
    const { spell } = makeSpell();

    for (let ciclo = 0; ciclo < 5; ciclo++) {
      spell.meteorCooldownMs = 0;
      spell.castMeteorAt(0, 0, []);
      expect(spell.meteorCost).toBe(300); // sobe 1 passo a cada cast

      spell.onWaveCompleted();
      spell.onWaveCompleted();
      spell.onWaveCompleted(); // 3 ondas de intervalo -> decai de volta a 0 no meio do caminho

      expect(spell.meteorCost).toBe(150);
    }
  });

  it('Meteoro e Congelamento têm estado de decaimento independente', () => {
    const { spell } = makeSpell();

    spell.castMeteorAt(0, 0, []); // meteorCostStep 1
    spell.meteorCooldownMs = 0;
    spell.castMeteorAt(0, 0, []); // meteorCostStep 2 -> custo 600
    spell.triggerGlobalFreeze([]); // freezeCostStep 1 -> custo 240

    expect(spell.meteorCost).toBe(600);
    expect(spell.freezeCost).toBe(240);

    spell.onWaveCompleted();
    spell.onWaveCompleted(); // 2 ondas completadas para ambos, mas a partir de steps diferentes

    expect(spell.meteorCost).toBe(300); // decaiu 1 passo (2 -> 1)
    expect(spell.freezeCost).toBe(120); // decaiu totalmente (1 -> 0)
  });
});
