/**
 * Retorno tátil (vibração) para os eventos de maior impacto do jogo. Em
 * mouse/desktop `navigator.vibrate` simplesmente não existe — a chamada é um
 * no-op silencioso, então este módulo pode ser usado sem checar `isMobile`.
 *
 * Duas camadas de opt-out, ambas fora do controle deste módulo:
 * - `prefers-reduced-motion`: tratamos "menos movimento" como incluindo
 *   vibração, não só animação visual.
 * - Interruptor manual em Configurações (persistido em localStorage), para
 *   quem tem o SO em modo padrão mas não quer o telefone vibrando a cada tiro.
 */

const STORAGE_KEY = 'haptics_enabled';

/** Padrões usados pelos gatilhos descritos em GAME_DESIGN_REVIEW.md (E4). */
export const HAPTIC_PATTERNS = {
  TOWER_BUILT: 10,
  TOWER_UPGRADED: [10, 40, 10],
  BASE_DAMAGED: [60, 30, 60],
  BOSS_INCOMING: [100, 50, 100],
  ACTION_DENIED: [30, 20, 30],
} as const;

export function isHapticsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Dispara um padrão de vibração se o dispositivo suportar a Vibration API, o
 * jogador não tiver desativado o háptico nas configurações, e o SO não pedir
 * menos movimento.
 */
export function vibrate(pattern: number | readonly number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (prefersReducedMotion()) return;
  if (!isHapticsEnabled()) return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    // Alguns navegadores lançam se chamado fora de um gesto do usuário; a
    // vibração é só um tempero — nunca deve derrubar o fluxo do jogo.
  }
}
