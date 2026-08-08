import type { IRogueliteModule, RogueliteModuleId, TowerSpecialization, TowerType } from '../types';
export interface SpecializationOption {
  id: TowerSpecialization;
  name: string;
  description: string;
  icon: string;
}

/**
 * Catálogo das duas especializações de cada tipo de torre, oferecidas no salto
 * de nível 2 para 3.
 *
 * Cada par é uma escolha entre eixos diferentes (mais dano bruto vs. mais
 * controle/alcance), nunca "a melhor e a pior" — é a decisão que dá profundidade
 * ao posicionamento, já que antes toda torre de nível 3 jogava igual.
 */
export const SPECIALIZATIONS: Record<TowerType, readonly [SpecializationOption, SpecializationOption]> = {
  BASIC: [
    {
      id: 'MULTISHOT',
      name: 'Tiro Múltiplo',
      description: 'Dispara em 2 alvos ao mesmo tempo, com dano por tiro um pouco menor.',
      icon: '🎯',
    },
    {
      id: 'PIERCING',
      name: 'Perfurante',
      description: 'Ignora a armadura do alvo (Tank, Moss Giant, Boss).',
      icon: '🔩',
    },
  ],
  CANNON: [
    {
      id: 'EXECUTIONER',
      name: 'Executor',
      description: 'Dano dobrado em Tank e Boss com qualquer HP, não só acima de 50%.',
      icon: '💥',
    },
    {
      id: 'SHRAPNEL',
      name: 'Estilhaço',
      description: 'O impacto passa a explodir em área, atingindo os vizinhos.',
      icon: '🧨',
    },
  ],
  FROST: [
    {
      id: 'DEEP_FREEZE',
      name: 'Congelamento',
      description: 'Congela tudo no alcance de tempo em tempo, com pulsos mais lentos.',
      icon: '🧊',
    },
    {
      id: 'PERMAFROST',
      name: 'Permafrost',
      description: 'Lentidão muito mais forte e duradoura, mantida sem intervalo.',
      icon: '❄️',
    },
  ],
  ARTILLERY: [
    {
      id: 'NAPALM',
      name: 'Napalm',
      description: 'Raio de explosão bem maior a cada impacto.',
      icon: '🔥',
    },
    {
      id: 'SIEGE',
      name: 'Cerco',
      description: 'Alcance de bombardeio muito maior, cobrindo outros corredores.',
      icon: '📡',
    },
  ],
  SOLAR_PRISM: [
    {
      id: 'FOCUS_LENS',
      name: 'Lente de Foco',
      description: 'O bônus de foco no alvo sobe duas vezes mais rápido.',
      icon: '🔆',
    },
    {
      id: 'CHAIN_BEAM',
      name: 'Feixe em Cadeia',
      description: 'O feixe salta para um segundo alvo por metade do dano.',
      icon: '⚡',
    },
  ],
};

export function getSpecializations(type: TowerType): readonly SpecializationOption[] {
  return SPECIALIZATIONS[type];
}

export function getSpecializationOption(
  spec: TowerSpecialization
): SpecializationOption | undefined {
  for (const options of Object.values(SPECIALIZATIONS)) {
    const found = options.find(option => option.id === spec);
    if (found) return found;
  }
  return undefined;
}

/** Impede aplicar, por exemplo, NAPALM numa torre FROST. */
export function isValidSpecialization(type: TowerType, spec: TowerSpecialization): boolean {
  return SPECIALIZATIONS[type].some(option => option.id === spec);
}

export const ROGUELITE_MODULES: Record<RogueliteModuleId, IRogueliteModule> = {
  MIDAS_TOUCH: {
    id: 'MIDAS_TOUCH',
    name: 'Módulo Midas',
    description: 'Gera +2 de ouro a cada 5 abates efetuados por esta torre.',
    icon: '💰',
  },
  PIERCING_CORE: {
    id: 'PIERCING_CORE',
    name: 'Núcleo Perfurante',
    description: 'Projéteis da torre atravessam +1 inimigo adicional no caminho.',
    icon: '🎯',
  },
  VOLTAIC_OVERCHARGE: {
    id: 'VOLTAIC_OVERCHARGE',
    name: 'Carga Voltaica',
    description: 'Tiros em alvos lentos/congelados disparam faíscas elétricas (8 dano AoE).',
    icon: '⚡',
  },
  VAMPIRIC_DRAIN: {
    id: 'VAMPIRIC_DRAIN',
    name: 'Dreno Vampírico',
    description: '15% do dano causado regenera a Vida da Base (1 HP a cada 100 dano).',
    icon: '🩸',
  },
  BOUNTY_HUNTER: {
    id: 'BOUNTY_HUNTER',
    name: 'Caçador de Recompensas',
    description: '+20% de ouro adicional ganho ao derrotar Chefões e Tanches.',
    icon: '🏴‍☠️',
  },
};

export function getRogueliteModule(id: RogueliteModuleId): IRogueliteModule {
  return ROGUELITE_MODULES[id];
}

export function getAllRogueliteModules(): IRogueliteModule[] {
  return Object.values(ROGUELITE_MODULES);
}
