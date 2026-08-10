# 🎮 Guia Completo de Mecânicas de Jogo - Tower Defense 2D (Oh My TD)

Este documento fornece a especificação técnica e comportamental detalhada de **todas as mecânicas** implementadas na engine do jogo **Tower Defense 2D (Oh My TD)**.

---

## 📑 Sumário
1. [Motor de Simulação & Matemática](#1-motor-de-simulação--matemática)
2. [Torres de Defesa & Especializações (Nível 3)](#2-torres-de-defesa--especializações-nível-3)
3. [Módulos Roguelite (Draft Modifiers)](#3-módulos-roguelite-draft-modifiers)
4. [Catálogo de Inimigos & Habilidades Especiais](#4-catálogo-de-inimigos--habilidades-especiais)
5. [Biomas, Mapas, Hazards & Climas](#5-biomas-mapas-hazards--climas)
6. [Poderes Supremos (Ultimate Spells)](#6-poderes-supremos-ultimate-spells)
7. [Modos de Jogo, Ondas & Escalonamento](#7-modos-de-jogo-ondas--escalonamento)
8. [Meta-Progressão, Talentos & Conquistas](#8-meta-progressão-talentos--conquistas)
9. [Interface de Usuário (UI/UX) & Recursos Mobile](#9-interface-de-usuário-uiux--recursos-mobile)

---

## 1. Motor de Simulação & Matemática

### 1.1 Timestep Fixo & Sub-stepping
- **Timestep Fixo:** A simulação avança em passos constantes de **1/60s (16.67ms)** (`FIXED_STEP_MS`), independente da taxa de atualização do monitor (60Hz, 120Hz, 144Hz+).
- **Sub-stepping em Velocidades Aceleradas:** Nas velocidades **2x** e **4x**, o loop executa múltiplos passos de simulação (`step()`) por frame da renderização para garantir física determinística sem teletransporte de projéteis ou falhas de detecção de colisão.
- **Delta Clamp:** O delta máximo acumulado em um único frame é travado em **100ms** (`MAX_FRAME_MS`), impedindo "time jumps" abruptos quando a aba do navegador perde o foco.

### 1.2 Gerador Pseudo-Aleatório Semeado (`Mulberry32`)
- Toda a aleatoriedade do jogo (esquivas de inimigos, acertos críticos, sorteio de *Sprout Tiles* e composição de ondas Endless) utiliza um gerador determinístico semeado (**Mulberry32**).
- Informar a mesma semente (`runSeed`) reproduz a partida do início ao fim com 100% de fidelidade (suporte a *Replays* e simulações *headless*).

### 1.3 Algoritmo de Movimentação por Waypoints (`Precise Corner Turning`)
- Para evitar desvios ou quebras em curvas em alta velocidade (1x, 2x, 4x), a movimentação dos inimigos consome a distância exata segmento por segmento em cada passo:
  $$\text{distancia} = \sqrt{(X_{\text{alvo}} - X_{\text{atual}})^2 + (Y_{\text{alvo}} - Y_{\text{atual}})^2}$$
- Se $\text{distancia} \le \text{velocidadeRestante}$, a unidade é posicionada diretamente no waypoint atual, avança o ponteiro de waypoint e consome a velocidade restante no próximo segmento sem perda de frações de pixel.

### 1.4 Mapeamento de Coordenadas de Ponteiro (Mouse & Touch)
- Para suportar telas móveis e desktop com proporção fluida e letterboxing (`object-fit: contain`), o sistema converte coordenadas de clique/toque $(X_{\text{client}}, Y_{\text{client}})$ para o espaço interno ($840 \times 600$px) compensando offsets dinâmicos e escala.

---

## 2. Torres de Defesa & Especializações (Nível 3)

### 2.1 Atributos e Configuração Base das Torres

| Torre | Custo | Alcance | Dano Base | Cadência (frames/tiro) | HP Base | Efeito Secundário / Especial |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BASIC** | 🪙 50g | 150px | 5 | 45 (1.33 tiros/s) | 100 HP | Equilibrada, dano direto monoponto. |
| **FROST** | 🪙 70g | 130px | 2 | 40 (1.50 tiros/s) | 100 HP | Pulso Glacial AoE; aplica **50% de lentidão** (`slowFactor: 0.5`). |
| **SOLAR PRISM** | 🪙 100g | 140px | 6 | 24 (2.50 pulsos/s) | 100 HP | Lente Prismática; **+10%/s de foco no alvo** contínuo. |
| **CANNON** | 🪙 105g | 120px | 14 | 90 (0.66 tiros/s) | 150 HP | Executor; causa **2x de dano** em Tank/Boss/Black Mega Boss acima de 50% HP (`MOSS_GIANT` sempre excluído); **perfura 50% da armadura de qualquer alvo permanentemente** (`armorPenetration: 0.5`), em qualquer especialização — ver §2.1.1. |
| **ARTILLERY** | 🪙 110g | 170px | 25 | 110 (0.54 tiros/s)| 150 HP | Bombardeio de longo alcance com **área de impacto de 50px** (`splashRadius`). |

- **Fórmula de Upgrade:** O custo de upgrade para o Nível 2 e Nível 3 é calculado por:
  $$\text{CustoUpgrade} = \lfloor \text{CustoBase} \times 0.8 \times \text{NívelAtual} \rfloor$$
- **Evolução Genérica (Nível 1 $\rightarrow$ 2):** Aumenta o Dano em **+50%** e o Alcance em **+15%**.

---

### 2.1.1 Armadura, Penetração e Esquiva (`Enemy2D.takeDamage`)

A armadura (`armorFactor`) do inimigo **vale para todo dano de toda torre**. Cada disparo carrega um `armorPenetration` (0..1) próprio que atenua essa redução:

$$\text{efetivo} = \text{armorFactor} + (1 - \text{armorFactor}) \times \text{armorPenetration}$$
$$\text{danoAplicado} = \max\!\big(1,\ \text{round}(\text{dano} \times \text{efetivo})\big)$$

Com penetração `0` o efetivo é o próprio `armorFactor` (redução plena); com penetração `1` o efetivo vira `1` (bypass total, como a especialização PIERCING promete).

**Ordem de resolução do dano:** esquiva (só se `isAvoidable`) → armadura/penetração → Escudo de Energia (absorve o dano *já reduzido pela armadura*) → HP.

**Penetração por origem do dano** (`TowerManager.ts` / `Projectile.ts` / `Tower.ts` / `SpellManager.ts` / `ParticleManager.ts` / `Game.ts`):

| Origem | `armorPenetration` | Esquivável (`isAvoidable`) |
| :--- | :--- | :--- |
| BASIC (tiro padrão, com ou sem MULTISHOT) | 0 | Sim |
| BASIC + especialização PIERCING | **1** (bypass total) | Sim |
| CANNON (qualquer especialização, diferencial permanente da torre) | **0.5** | Sim |
| FROST (pulso glacial AoE) | 0 | **Não** |
| SOLAR_PRISM (feixe principal e feixe secundário CHAIN_BEAM) | 0 | Sim |
| ARTILLERY (impacto no alvo primário perseguido) | 0 | Sim |
| ARTILLERY (respingo/estilhaço nas vítimas secundárias no raio) | 1 | **Não** |
| Meteoro (Poder Supremo) | 1 | **Não** |
| DoT de poça de Napalm (a cada 15 frames) | 1 | **Não** |
| Gêiser de lava (MAP_2, 1 dano/frame sob erupção) | 1 | **Não** |
| Faísca do módulo VOLTAIC_OVERCHARGE | 1 | **Não** |

Antes deste ciclo, só disparos marcados como "leves" (BASIC e o pulso da FROST) sofriam armadura — CANNON, ARTILLERY e SOLAR_PRISM a ignoravam por completo por um acidente de flag (`isLightShot`), o que apagava a identidade defensiva do Tank/Moss Giant/Black Mega Boss contra a maior parte do roster. Essa flag foi substituída pelo `armorPenetration` explícito acima.

Todo dano em área, DoT e hazard ambiental é `isAvoidable = false`: o Runner (25% de `dodgeChance`) só esquiva de **tiros diretos mirados** (um projétil BASIC/CANNON/ARTILLERY perseguindo-o como alvo primário, ou o feixe do Prisma Solar). Ele não esquiva do pulso da Frost, do respingo da Artilharia, do Meteoro, do DoT de napalm, do gêiser de lava nem da faísca do módulo Voltaico — esquivar de uma explosão em área era ilegível ("DODGED!" dentro de uma cratera).

---

### 2.2 Ramificações de Especialização no Nível 3

No salto do Nível 2 para o Nível 3, o jogador **deve escolher uma de duas especializações** exclusivas para a torre:

#### 🎯 **BASIC**
1. **MULTISHOT (Tiro Múltiplo):** A torre ganha a capacidade de disparar simultaneamente em **2 alvos** dentro do alcance, mantendo cadência total com pequeno ajuste proporcional no dano por projétil.
2. **PIERCING (Perfurante):** Os tiros **ignoram completamente a armadura** dos alvos (`armorPenetration: 1`, efetivo contra *Tank*, *Moss Giant*, *Boss* e *Black Mega Boss*).

#### 💥 **CANNON**
1. **EXECUTIONER (Executor):** O bônus de dano dobrado (**2x**) passa a ser aplicado contra *Tank*, *Boss* e **`Black Mega Boss`** em **qualquer porcentagem de vida**, e não apenas acima de 50% HP. **`MOSS_GIANT` fica de fora da lista de alvos de execução em qualquer especialização** — decisão deliberada do game design: a identidade do Moss Giant é regeneração/terreno, não "alvo blindado", e o texto da carta sempre prometeu só Tank/Boss.
2. **SHRAPNEL (Estilhaço):** Os impactos dos mísseis passam a explodir em área, causando dano de estilhaço nos inimigos adjacentes ao alvo primário.

#### 🧊 **FROST**
1. **DEEP_FREEZE (Congelamento):** Em vez de apenas desacelerar, a torre dispara um pulso glacial concentrado a cada intervalo estendido que **congelar completamente (0 velocidade)** os inimigos no alcance por um tempo.
2. **PERMAFROST (Permafrost):** Aumenta drasticamente a intensidade e duração do efeito de lentidão, mantendo o controle de grupo ativo sem lacunas.

#### 🔥 **ARTILLERY**
1. **NAPALM (Napalm):** Expande significativamente o raio da explosão de cada morteiro no solo (`splashRadius` expandido).
2. **SIEGE (Cerco):** Concede um aumento maciço no alcance do bombardeio, permitindo cobrir múltiplos corredores e pontos distantes do mapa.

#### ☀️ **SOLAR PRISM**
1. **FOCUS_LENS (Lente de Foco):** O multiplicador de foco no alvo acumula **duas vezes mais rápido**, atingindo o pico de dano máximo em metade do tempo de exposição.
2. **CHAIN_BEAM (Feixe em Cadeia):** O feixe solar principal divide um segundo raio secundário para um inimigo próximo, causando 50% do dano atual.

---

### 2.3 Estratégias de Alvo (`TargetingStrategy`)
Todas as torres permitem alternar livremente o critério de seleção de alvos:
- **FIRST (Primeiro):** Foca no inimigo mais avançado no caminho (maior progresso nos waypoints).
- **STRONGEST (Mais Forte):** Foca no inimigo com maior vida atual (`hp`).
- **WEAKEST (Mais Fraco):** Foca no inimigo com menor vida atual (`hp`).
- **LAST (Último):** Foca no inimigo mais atrasado no caminho.

---

## 3. Módulos Roguelite (Draft Modifiers)

Durante a partida, um modal de Draft Roguelite sorteia módulos para equipar em torres de nível 2+. **Gatilhos** (`Game.ts`):
- **Campanha (10 ondas):** ao completar as ondas **3, 6 e 9** — a 10ª nunca dispara o draft porque o mesmo passo de simulação já declara `VICTORY` primeiro, evitando o modal de draft competir com o de vitória.
- **Modo Infinito:** a cada múltiplo de **5** ondas (5, 10, 15, 20…), sem linha de chegada.

Módulos disponíveis:

- 💰 **MIDAS_TOUCH (Módulo Midas):** Concede **+2 de ouro** a cada 5 abates efetuados pela torre.
- 🎯 **PIERCING_CORE (Núcleo Perfurante):** Os projéteis da torre atravessam **+1 inimigo adicional** na trajetória.
- ⚡ **VOLTAIC_OVERCHARGE (Carga Voltaica):** Quando o tiro da torre acerta um alvo já lento (`slowTimer > 0`) ou congelado (`freezeTimer > 0`), descarrega uma faísca elétrica em raio de **40px** ao redor do alvo, causando **8 de dano** a cada vizinho atingido — dano em área: ignora armadura (`armorPenetration: 1`) e não é esquivável. A faísca nunca acerta o próprio alvo primário duas vezes e não cascateia (um vizinho atingido pela faísca, mesmo que também esteja lento/congelado, não dispara uma segunda faísca) — implementado em `handleTowerDamageDealt()` (`Tower.ts`).
- 🩸 **VAMPIRIC_DRAIN (Dreno Vampírico):** O dano causado pela torre acumula num contador interno; a cada 100 de dano acumulado, regenera 1 HP da Vida da Base.
- 🏴‍☠️ **BOUNTY_HUNTER (Caçador de Recompensas):** Concede **+20% de ouro extra** ao derrotar unidades das categorias *Tank*, *Boss* e **`Black Mega Boss`**.

---

## 4. Catálogo de Inimigos & Habilidades Especiais

### 4.1 Tabela de Atributos Base dos Inimigos

| Inimigo | Vida Base (`hp`) | Escudo (`shield`) | Velocidade | Raio (`radius`) | Recompensa (`gold`) | Armadura (`armorFactor`) | Esquiva (`dodgeChance`) | Dano na Base |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STANDARD** | 10 HP | 0 | 2.0 px/frame | 15px | 🪙 10g | 1.0 (0% red.) | 0% | 1 HP |
| **RUNNER** | 6 HP | 0 | 3.6 px/frame | 11px | 🪙 8g | 1.0 (0% red.) | **25% (`DODGED!`)** | 1 HP |
| **TANK** | 35 HP | 0 | 1.1 px/frame | 20px | 🪙 25g | **0.6 (40% red.)** | 0% | 2 HP |
| **SHIELDED** | 14 HP | 22 Shield | 2.2 px/frame | 14px | 🪙 18g | 0.9 (10% red.) | 0% | 1 HP |
| **SPORE_SPRINTER** | 10 HP | 0 | 2.4 px/frame | 13px | 🪙 12g | 1.0 (0% red.) | 0% | 1 HP |
| **MOSS_GIANT** | 45 HP | 0 | 1.0 px/frame | 22px | 🪙 30g | 0.7 (30% red.) | 0% | 3 HP |
| **BOSS** | 160 HP | 0 | 0.8 px/frame | 26px | 🪙 100g | 0.8 (20% red.) | 0% | 5 HP |
| **BLACK_MEGA_BOSS**| 380 HP | 90 Shield | 0.55 px/frame | 32px | 🪙 300g | **0.45 (55% red.)** | 0% | 10 HP |

---

### 4.2 Habilidades Passivas e Mecânicas Especiais dos Inimigos

- 🏃 **Esquiva Ágil (`RUNNER`):** Possui 25% de probabilidade de ignorar completamente um **tiro direto mirado** (BASIC/CANNON/ARTILLERY perseguindo-o como alvo primário, ou o feixe do Prisma Solar), exibindo o indicador visual `DODGED!`. **Não esquiva de dano em área, DoT nem hazard ambiental** (pulso da Frost, respingo da Artilharia, Meteoro, DoT de napalm, gêiser de lava, faísca do módulo Voltaico) — ver §2.1.1.
- 🛡️ **Placa de Armadura (`TANK`):** Multiplica todo dano recebido, **de qualquer torre**, por $0.6$ (redução passiva de 40%), atenuada pela penetração (`armorPenetration`) do disparo que a atingiu — ver §2.1.1.
- 🔮 **Escudo de Energia (`SHIELDED`):** Uma barra azul de 22 HP absorve todos os danos antes de impactar a vida primária da unidade.
- 🍄 **Nuvem de Esporos (`SPORE_SPRINTER`):** Ao ter sua vida reduzida abaixo de 50% HP, libera instantaneamente uma nuvem de esporos que concede **+30% de velocidade de movimento** aos aliados próximos.
- 🌿 **Regeneração da Mata (`MOSS_GIANT`):** Enquanto estiver caminhando sobre tiles de mata/floresta (`OBSTACLE_FOREST` ou grama viva), recupera **+3 HP/segundo**.
- 👑 **Reinforços ao Morrer (`BOSS`):** Ao ser derrotado, o Chefão invoca **2 unidades Runner** nos waypoints imediatos.
- 💀 **Fases do Mega Chefão (`BLACK_MEGA_BOSS`):** Possui renderizador procedural dedicado (`MegaBossSpriteRenderer`), aura de partículas, 90 de escudo de energia e causa 10 de dano direto à base se alcançar o final.

---

## 5. Biomas, Mapas, Hazards & Climas

O jogo possui 4 mapas situados em biomas únicos, cada um com mecânicas ambientais (*Hazards*) e visuais próprias:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   4 MAPAS & BIOMAS                                     │
├──────────────────┬──────────────────────┬────────────────────────┬─────────────────────┤
│   Green Valley   │      Death Pass      │     Citadel Breach     │     Grave Pass      │
│     (MAP_1)      │       (MAP_2)        │        (MAP_3)         │       (MAP_4)       │
├──────────────────┼──────────────────────┼────────────────────────┼─────────────────────┤
│ • Clima: MIST    │ • Hazard: LAVA_GEYSER│ • Hazard: POWER_SURGE  │ • Hazard: GRAVEYARD │
│ • Sprout Tiles   │ • Dual Spawn (2 Rota)│ • Rota Curta de Alta V.│ • Erupção de Almas  │
└──────────────────┴──────────────────────┴────────────────────────┴─────────────────────┘
```

### 5.1 MAP 1: Green Valley (Desfiladeiro Verde)
- **Bioma:** Gramado esmeralda, pinheiros e serras nevadas.
- **Clima Dinâmico (`MIST`):** A cada ciclo (12s ativo / 18s inativo), uma neblina fria cobre o mapa com um overlay azul-acinzentado (`rgba(200, 225, 235, 0.18)`), reduzindo a visibilidade e diminuindo o alcance efetivo de **todas as torres** em **20%** (`effRange = range * 0.8`) — ver §5.5. Isso inclui o pulso da Frost, cuja partícula visual é desenhada com o mesmo `effRange` reduzido usado para escolher alvos (antes desenhava com o raio cheio e mentia sobre quem seria atingido).
- **Mecânica Única (`Overgrowth Sprout`):** 4 blocos de grama viva (*Sprout Tiles*) são sorteados no início da partida, concedendo às torres construídas sobre eles **+25% de alcance** (`range * 1.25`) **e o dobro da cadência de tiro** (`fireRate / 2`, ou seja **+100%**, incluindo o intervalo do beam do Prisma Solar). O bônus de cadência é intencional e é o maior modificador de terreno do jogo — **o MAP_1 é deliberadamente o mapa de DPS** da campanha; os outros três mapas competem em posicionamento/controle (Dual Spawn, hazard de energia, névoa+almas), não em dano bruto.

### 5.2 MAP 2: Death Pass (Vale da Morte)
- **Bioma:** Basalto vulcânico e rios de lava incandescente.
- **Mecânica Única (Dual Spawn):** Possui **2 portais de spawn simultâneos**, exigindo divisão de defesas.
- **Hazard Ambiental (`LAVA_GEYSER`):** Fissuras de lava entram em erupção periodicamente em coordenadas específicas. Torres construídas ao lado de fissuras ativas entram em superaquecimento (`overheatTimer`), desativando temporariamente seu ataque.

### 5.3 MAP 3: Citadel Breach (Cidadela)
- **Bioma:** Mármore negro gótico e circuitos neon.
- **Mecânica Única:** Rota curta de alta velocidade.
- **Hazard Ambiental (`POWER_SURGE`):** 4 tiles de energia fixos. Torres construídas sobre eles recebem **+10% de dano** (`damage * 1.1`) e a cadência sobe para `fireRate * 0.83`, ou seja **+~20% de tiros por segundo** — não os +50% que este documento chegou a afirmar numa versão anterior; o comentário no próprio código também erra para "+25%". O valor real é o `× 0.83` acima, verificado em `TowerManager.ts` (`placeTower()`).

### 5.4 MAP 4: Grave Pass (Cemitério Obscuro)
- **Bioma:** Solo escuro, lápides e névoa espectral.
- **Hazard Ambiental (`GRAVEYARD_SOULS`):** 2 geysers de almas (posições fixas) que alternam erupção em ciclos de ~5s ativos / ~9s inativos e aplicam **lentidão de 70%** por 0,5s (sem dano) aos inimigos que passam por eles.
- **Névoa periódica:** ao contrário do que a documentação registrava antes deste ciclo, o Grave Pass **também tem névoa** (`isMistActive`), não só o MAP_1. Ela começa **ativa** (janela inicial de 15s) e depois alterna em fases de **~13,3s** cada — mesma penalidade de −20% de alcance efetivo em todas as torres, ver §5.5.

---

### 5.5 Névoa (Mist) — regra geral, válida para os dois mapas que a têm

Sob névoa ativa, **toda torre no mapa** (não só Frost ou Solar Prism) tem seu alcance efetivo reduzido em 20% (`effRange = tower.data.range * 0.8`, `TowerManager.ts`) tanto para decidir quem está no alcance quanto para o Prisma Solar decidir se mantém o feixe no alvo atual. Isso nunca foi documentado antes deste ciclo, apesar de já existir em código.

| Mapa | Tem névoa? | Ciclo |
| :--- | :--- | :--- |
| MAP_1 (Green Valley) | Sim | 12s ativo / 18s inativo (após uma janela inicial inativa de 12s) |
| MAP_2 (Death Pass) | Não | — |
| MAP_3 (Citadel Breach) | Não | — |
| MAP_4 (Grave Pass) | Sim | Começa ativa por 15s, depois alterna em fases simétricas de ~13,3s |

---

## 6. Poderes Supremos (Ultimate Spells)

O jogador dispõe de 2 Poderes Supremos disparados manualmente pela interface:

### ☄️ Meteor Strike (Ataque Meteorítico)
- **Custo Inicial:** 🪙 150g
- **Cooldown Base:** 30 segundos (30.000ms)
- **Efeito:** Dispara uma queda de meteoro com onda de choque, partículas de brasa e cratera no solo, causando **dano massivo em área (AoE)** em todos os inimigos presentes na zona de impacto.

### ❄️ Global Freeze (Congelamento Global)
- **Custo Inicial:** 🪙 120g
- **Cooldown Base:** 40 segundos (40.000ms)
- **Efeito:** Aplica uma vinheta congelante na tela e trava a velocidade de **todos os inimigos no mapa em 0 por 3,5 segundos**.

### 📈 Escalonamento Dinâmico de Custos & Talentos
- **Escalonamento por Uso:** O custo em ouro de cada magia **dobra a cada uso** efetuado na mesma partida ($150\text{g} \rightarrow 300\text{g} \rightarrow 600\text{g}\dots$).
- **Redução por Talentos:** O talento de *Channeling* reduz o tempo de recarga base em até **-30%**.

---

## 7. Modos de Jogo, Ondas & Escalonamento

### 7.1 Modo Campanha (10 Ondas)
- O jogador enfrenta **10 ondas** pré-configuradas com dificuldade progressiva (`GameState.maxWaves = 10`, `WaveManager.CAMPAIGN_MAX_WAVES = 10`). Esta seção do documento chegou a afirmar "20 Ondas" numa versão anterior — número que nunca existiu no código.
- A Onda 10 culmina no Chefão e a vitória exibe o painel de celebração com relatórios detalhados. A checagem de vitória roda **antes** da checagem do Draft Roguelite no mesmo passo de simulação, então a onda 10 nunca abre o modal de draft por cima do modal de vitória.
- O Draft Roguelite dispara ao completar as ondas **3, 6 e 9** (ver §3) — não mais 5/10/15, esquema em que a onda 15 nunca chegava a existir numa campanha de 10 ondas.
- Multiplicadores de HP da Campanha:
  $$\text{Onda 1}: 1.0\times \quad \text{Onda 5}: 1.85\times \quad \text{Onda 10}: 4.50\times$$

### 7.2 Modo Infinito (Endless Scaling)
No Modo Infinito, após a Onda 10, o jogo sorteia **Arquétipos de Onda** especiais:
- **SWARM:** Hordas massivas de unidades leves.
- **ARMORED:** Composição dominada por *Tanks* e *Shielded*.
- **RUSH:** Velocidade extrema com *Runners* e *Spore Sprinters*.
- **MIXED:** Mistura equilibrada de todas as variantes.
- **BOSS_RUSH:** Múltiplos chefões com escolta pesada.

- **Fórmula de Escalonamento de Vida (Endless HP):**
  $$\text{HPMultiplier} = 4.5 \times 1.18^{(N_{\text{onda}} - 10)}$$

- **Fórmula de Quantidade de Bosses:**
  $$\text{QtdBosses} = \left\lfloor \frac{N_{\text{onda}} - 10}{3} \right\rfloor + 1$$
- O Draft Roguelite (§3) dispara a cada múltiplo de 5 ondas (5, 10, 15, 20…), sem linha de chegada.

---

### 7.3 Níveis de Desafio (`ChallengeMode`)

| Modo | Velocidade do inimigo | Ouro do inimigo | Custo de reparo | Vida da Base |
| :--- | :--- | :--- | :--- | :--- |
| **NORMAL** | 1.0× | 1.0× | 1.0× | 10 HP |
| **HARDCORE** | **1.25×** | 1.0× | **1.5×** | 1 HP |
| **MORTE_CERTA** | **1.4×** | **1.5×** | **2.0×** | 1 HP |

- Os multiplicadores de velocidade e ouro são aplicados por inimigo no spawn (`EnemyManager.spawnEnemy()`); o de ouro do MORTE_CERTA se acumula com o corte fixo de 25% que já existe a partir da onda 4 em qualquer modo.
- O multiplicador de custo de reparo (`Tower.getRepairCost()`) é aplicado **sobre o custo base, antes** do desconto do talento Engineering — senão o desconto anularia o modificador de dificuldade em vez de descontar sobre ele.
- Até este ciclo, **nenhum dos multiplicadores de HARDCORE existia**: a única diferença entre HARDCORE e NORMAL era a Vida da Base reduzida a 1 HP. A tabela acima é a matriz real, fechada pelo game-designer.
- **MORTE_CERTA:** além da matriz acima, **Poderes Supremos ficam desativados por completo** (`SpellManager` recusa qualquer conjuração), e o `BOSS` da onda 10 — tanto na campanha quanto a cada múltiplo de 10 no Modo Infinito — é substituído pelo `BLACK_MEGA_BOSS`.

---

## 8. Meta-Progressão, Talentos & Conquistas

### 8.1 Árvore de Talentos Permanente (`TalentManager`)
As Estrelas (★) obtidas em partidas e conquistas podem ser investidas na árvore de talentos permanente salvos localmente e na nuvem:

| Talento | Descrição do Bônus | Nível Máximo | Custo em Estrelas (★) por Nível |
| :--- | :--- | :--- | :--- |
| **damageLvl** (Archery) | **+10% / +20% / +30%** de Dano em todas as torres | Nível 3 | Lvl 1: 2★ • Lvl 2: 4★ • Lvl 3: 6★ |
| **goldLvl** (Economy) | **+25g / +50g** de Ouro Inicial | Nível 2 | Lvl 1: 3★ • Lvl 2: 5★ |
| **hpLvl** (Fortress) | **+5 HP / +10 HP** na Vida da Base | Nível 2 | Lvl 1: 2★ • Lvl 2: 4★ |
| **cdLvl** (Channeling) | **-15% / -30%** no Cooldown de Magias | Nível 2 | Lvl 1: 3★ • Lvl 2: 5★ |
| **repairLvl** (Engineering)| **25% / 50%** de desconto no Custo de Reparo | Nível 2 | Lvl 1: 3★ • Lvl 2: 5★ |
| **critLvl** (Precision) | **10% / 20%** de Chance Crítica Global (Dano 2x) | Nível 2 | Lvl 1: 3★ • Lvl 2: 5★ |

---

### 8.2 Catálogo de Conquistas & Recompensas em Estrelas

| ID da Conquista | Título Exibido | Requisito de Desbloqueio | Recompensa |
| :--- | :--- | :--- | :--- |
| `FIRST_BLOOD` | **First Blood** | Derrotar o 1º inimigo no jogo | 🪙 2★ |
| `RUNNER_HUNTER` | **Runner Hunter** | Derrotar 30 inimigos da classe Runner | 🪙 3★ |
| `SHIELD_BREAKER` | **Shield Breaker** | Destruir 20 Escudos de Energia | 🪙 3★ |
| `BOSS_SLAYER` | **Boss Slayer** | Derrotar 5 Chefões | 🪙 5★ |
| `METEOR_STRIKE` | **Armageddon** | Conjurar o Meteor Strike 3 vezes | 🪙 3★ |
| `GLOBAL_FREEZE` | **Absolute Zero** | Conjurar o Global Freeze 3 vezes | 🪙 3★ |
| `ENDLESS_SURVIVOR` | **Endless Survivor**| Alcançar a Onda 20 no Modo Infinito | 🪙 5★ |
| `FIELD_ENGINEER` | **Field Engineer** | Reparar torres danificadas 10 vezes | 🪙 4★ |
| `BLACK_BOSS_VANQUISHER`| **Nightmare Slayer**| Derrotar o Black Mega Boss no modo Morte Certa | 🪙 6★ |

---

### 8.3 Sincronização Cloud via Supabase (`DatabaseManager`)
- **Autenticação Anônima Persistente:** Cria uma identidade única para cada navegador, salvando progresso sem exigir cadastro formal de e-mail.
- **Sincronização de Progresso:** Atualização de Estrelas, Níveis de Talentos, Conquistas desbloqueadas e Maiores Ondas alcançadas.
- **Placar Global (Leaderboard Top 20):** Ranking global online com os melhores recordes de ondas e pontuação de partidas.

---

## 9. Interface de Usuário (UI/UX) & Recursos Mobile

- **Abas Responsivas em Telas Mobile:** Alternância fluida entre as visões `Build`, `Spells`, `Skills` e `Inspector`.
- **Auto-Inspector:** Seleção imediata ao tocar em qualquer torre construída no canvas.
- **Double-Tap to Build:** O 1º toque em um tile exibe a prévia/range da torre e o 2º toque confirma a construção.
- **Press-and-Hold Tooltips:** Pressionar e segurar por mais de 420ms abre dicas contextuais informando o status, hazard ou tipo de solo de qualquer célula do mapa.
- **Relatório de Analytics Pós-Jogo:** Apresenta a Torre MVP (maior contagem de abates), total de ouro coletado, inimigos derrotados e recorde pessoal.

### 9.1 Atalhos e Acessibilidade

Os atalhos de teclado abaixo (`Game.ts` → listener global de `keydown`) só disparam com `GameState.status` em `PLAYING` ou `PREPARATION`, e são suprimidos automaticamente enquanto qualquer modal estiver aberto (`.modal-overlay:not(.hidden)`) ou o foco estiver num campo de texto/select — digitar `S` no nome de um perfil não vende uma torre.

| Tecla | Ação |
| :--- | :--- |
| `Space` / `P` | Pausa/retoma o jogo (atalho pré-existente; não passa pelas mesmas checagens de status/modal dos demais) |
| `1`–`5` | Seleciona a torre a construir, na ordem da barra de construção: Basic, Frost, Solar Prism, Cannon, Artillery |
| `Q` | Arma o Meteoro (a mira segue o mouse/toque no canvas; um clique/toque detona) |
| `W` | Conjura o Congelamento Global imediatamente, sem etapa de mira |
| `Enter` | Inicia a próxima onda (`WaveManager.startNextWave()`) |
| `Esc` | Desarma a magia ativa; se não houver magia armada, cancela a seleção de tile pendente no mobile; se nenhuma das duas se aplicar, desseleciona a torre do Inspector — nessa ordem. Sem este atalho não havia como desarmar o Meteoro pelo teclado. |
| `U` | Upgrade da torre selecionada |
| `S` | Vende a torre selecionada, passando pela confirmação em duas etapas (ver §9.3) |
| `R` | Alterna a exibição do alcance de todas as torres simultaneamente (ver §9.4) |
| `Shift`+`1`/`2`/`3` | Troca a velocidade do jogo para 1x/2x/4x |

### 9.2 Retorno Tátil (Háptico)

`src/helpers/haptics.ts` centraliza chamadas a `navigator.vibrate()` — em desktop, onde a API não existe, a função é um no-op silencioso, então o resto do código pode chamá-la sem checar `isMobile`. Padrão por evento:

| Evento | Padrão de vibração (ms) |
| :--- | :--- |
| Construir torre | `10` |
| Upgrade de torre | `[10, 40, 10]` |
| Dano na base | `[60, 30, 60]` |
| Spawn de chefe (`BOSS` / `BLACK_MEGA_BOSS`) | `[100, 50, 100]` |
| Ação inválida por ouro insuficiente | `[30, 20, 30]` |

O gatilho de "ouro insuficiente" vive no único ponto de falha de `GameState.spendGold()`, então cobre construção, upgrade, reparo e magias sem precisar de uma chamada em cada chamador.

Duas camadas de opt-out, nenhuma controlada por quem chama `vibrate()`:
- **`prefers-reduced-motion: reduce`** do sistema operacional desativa toda vibração — tratado como "menos movimento" incluindo háptico, não só animação visual.
- **Interruptor manual em Configurações → 📳 Retorno Tátil**, persistido em `localStorage` (chave `haptics_enabled`), ligado por padrão.

### 9.3 Confirmação de Venda (duas etapas)

O botão "💰 Vender" do Inspector e o atalho `S` não vendem de primeira: o primeiro acionamento arma um estado de confirmação por **3 segundos** (`UIManager.SELL_CONFIRM_WINDOW_MS`) — o rótulo do botão muda para "⚠️ Confirmar venda? +Xg" e pulsa em laranja. Um segundo acionamento dentro da janela vende de fato. Se a janela expirar, ou outra torre for selecionada nesse intervalo, a armação é descartada e o botão volta ao rótulo normal.

### 9.4 Alcance de Todas as Torres

O botão 🎯 na barra da HUD (e o atalho `R`) alternam `TowerManager2D.showAllRanges`. Com o alcance ligado, **todas** as torres desenham seu círculo de alcance simultaneamente — mesmo estilo azul translúcido do hover, para não ser confundido com o amarelo de uma torre de fato selecionada —, não só a torre selecionada ou sob o mouse. O evento `ranges:toggle` mantém o botão sincronizado quando o atalho de teclado, e não o clique, foi a origem da mudança.

### 9.5 Escala de Tipografia no Canvas (`uiScale`)

O canvas interno é fixo em 840×600px e escalado por CSS até o tamanho da tela; num telefone de ~360px de largura CSS isso é um fator de ~0.43×, então texto desenhado a 11-14px no espaço interno do canvas chegava a ~5-6px reais. `Game2D.uiScale` — recalculado sempre que `syncCanvasWidth()` roda (resize, orientationchange, `ResizeObserver`) — é `clamp(1, 3, 840 / larguraRenderizadaCSS)`: nunca encolhe abaixo de 1× em telas grandes, só amplia em telas pequenas. Aplicado a:
- Tooltip de tile (press-and-hold)
- Toast de conquista desbloqueada
- Texto de dano flutuante e "DODGED!" (`FXManager`)
- Barra de vida/escudo e o "+" de regeneração do inimigo (`Enemy.render()`)

### 9.6 Alvos de Toque & Barra de Construção Mobile

- Piso geral de alvo de toque: **44px** (`min-height` de `.toolbar-card`, `.btn`, `.toolbar-chip`, `.speed-btn`), seguindo o mínimo do Apple HIG. O botão "Iniciar Onda" — o mais pressionado da sessão, uma vez por onda — tem piso próprio de **52px** em todos os breakpoints.
- Em retrato/mobile (`max-width: 768px and orientation: portrait`), a barra de seleção de torres/magias (`#action-toolbar`) fica fixa acima de `.time-controls` — a zona do polegar —, e a barra de stats (ouro/HP/onda, só leitura) permanece no topo.
- Dica de gesto: ao selecionar um tile vazio para construir no mobile, um balão DOM "Toque de novo para construir · Xg" (com botão ✖ para cancelar) aparece sobre o tile; o texto muda para "Ouro insuficiente · Xg" ou "Terreno não construível" quando aplicável. É DOM, não canvas, pelo mesmo motivo do §9.5 — e porque precisa de um botão ✖ clicável de verdade.
- `tests/mobile_ui_ux.test.ts` trava a regressão desses pisos (guard-rail em `>= 38px`/`>= 48px`, abaixo dos valores atuais de propósito, para pegar quedas futuras sem exigir o número exato).
