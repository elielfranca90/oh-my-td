/**
 * Gerador pseudoaleatório semeado (mulberry32).
 *
 * O jogo usava `Math.random()` direto nos pontos que decidem partida — esquiva
 * do Runner, crítico das torres, composição das ondas endless, sorteio dos tiles
 * Sprout. Sem semente, nenhuma partida era reproduzível: não dava para escrever
 * teste de regressão de balanceamento nem investigar um bug relatado.
 *
 * Aleatoriedade puramente visual (jitter de texto de dano, screen-shake,
 * partículas) segue em `Math.random()` de propósito: não afeta o resultado da
 * partida e manter fora daqui evita que o render consuma a sequência da
 * simulação, o que quebraria a reprodutibilidade.
 */
export class Rng {
  private state: number;

  constructor(seed: number | string = 1) {
    this.state = typeof seed === 'string' ? Rng.hashString(seed) : seed >>> 0;
    // Estado 0 travaria a sequência; usa a constante da razão áurea de fallback.
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** FNV-1a de 32 bits, para aceitar semente legível como "map1-normal-42". */
  public static hashString(text: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /** Próximo float em [0, 1). */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** True com a probabilidade informada (0..1). */
  public chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  /** Inteiro em [0, maxExclusive). */
  public int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  /** Float em [min, max). */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Elemento aleatório do array (ou `undefined` se vazio). */
  public pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.int(items.length)];
  }

  /** Estado interno atual — útil para logar/retomar uma sequência. */
  public getState(): number {
    return this.state;
  }
}
