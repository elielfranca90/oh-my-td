# 📐 Especificação de Balanceamento — P1 "Devolver Decisões ao Jogador"

**Autor:** game-designer
**Branch:** `feature/p1-player-decisions-2026-08`
**Base:** `docs/GAME_DESIGN_REVIEW.md` (itens 10-14 da Parte F / B1, B2, B3, C1, C2, C5), código em `tower-defense-2d/src/engine/` na ponta do `main`.
**Status:** pronto para transcrição por `gameplay-engineer`. Nenhum arquivo em `src/` foi tocado por este documento.

Este documento especifica **números e fórmulas exatas**, não intenção. Onde a auditoria sugeriu um valor, ele foi validado por conta (mostrada) ou substituído por outro, com a justificativa. Todo número tem unidade explícita (frames vs ms reais) porque o projeto mistura as duas e isso já causou bug de balanceamento dependente de taxa de quadro no passado (ver `CLAUDE.md`).

---

## Sumário das 5 entregas

| # | Entrega | Mudança central |
| :-- | :-- | :-- |
| 1 | Níveis infinitos de torre | Nível 3 continua sendo o teto de especialização; níveis 4+ são "ranks" genéricos com crescimento composto modesto e custo que cresce por rank |
| 2 | Curva de ouro do endless | Expoente efetivo 0,75 só a partir da onda 11; corte fixo de 25% substituído por curva suave; campanha (ondas 1-10) **não mexida** nesta entrega |
| 3 | Chamada antecipada de onda | Bônus de ouro proporcional ao tempo poupado no contador de 5s, em ambos os modos, com teto de 60g |
| 4 | Densidade de onda da campanha | 10 ondas passam de 6-8 para 12-18 inimigos; corte de ouro da campanha se antecipa e se aprofunda para conter o crescimento de renda |
| 5 | Magias com dano escalável | Meteoro passa a ser `90 + 12% do HP máximo do alvo`; ambas as magias ganham decaimento de custo por ondas sem uso |

---

## 1. Níveis infinitos de torre

### 1.1 O que não muda

- Nível 3 continua sendo o único ponto de escolha de especialização (`Tower.upgrade()` continua exigindo `specialization` na transição 2→3).
- A fórmula de custo/crescimento genérico dos níveis 1→2 e 2→3 (`damage*1.5`, `range*1.15`, `maxHp*1.4`, `splashRadius*1.1`, custo `floor(cost*0.8*level)`) **fica idêntica**. Isso é o que garante zero regressão nos números hoje testados (`tests/tower.test.ts`, `tests/specialization.test.ts`).
- A partir do nível 4 ("rank" = `level - 3`, ou seja, nível 4 = rank 1), um crescimento **novo e muito mais modesto** assume, ancorado nos atributos que a torre tinha exatamente ao term inar a transição 2→3 (**depois** da especialização aplicada — ver §1.4).

### 1.2 Composto ou aditivo? Composto, com dois eixos travados por um teto absoluto

Aditivo estagna: um bônus fixo de "+8% da base" por rank, somado (não multiplicado), vira irrelevante contra HP que cresce `1.18^onda` composto. Composto sem teto teria o problema oposto para **alcance** e **splashRadius**: um raio de tiro que cresce geometricamente para sempre eventualmente cobre o mapa inteiro (840×600px) e apaga a decisão de posicionamento — o oposto do que esta entrega quer devolver ao jogador.

Solução: **dano e HP máximo crescem compostos sem teto** (o inimigo também escala sem teto, então a torre precisa poder acompanhar por tempo indefinido); **alcance e splashRadius crescem compostos só até um rank-teto**, depois ficam fixos — o jogador continua ganhando poder de fogo para sempre, mas não ganha "visão de mapa inteiro" de graça.

| Atributo | Fórmula por rank (a partir do baseline de nível 3) | Teto |
| :-- | :-- | :-- |
| Dano | `damageL3 × 1.08^rank` | Nenhum |
| Alcance | `rangeL3 × 1.02^min(rank, 25)` | Rank 25 (~+64% sobre o alcance de nível 3, depois congela) |
| HP máximo | `maxHpL3 × 1.05^rank` | Nenhum |
| SplashRadius (só ARTILLERY/CANNON com SHRAPNEL/NAPALM) | `splashL3 × 1.01^min(rank, 40)` | Rank 40 (~+49%, depois congela) |
| `fireRate` | **Intocado** — ranks não alteram cadência | — |

`fireRate` fica de fora deliberadamente: a cadência já é o eixo que diferencia as especializações (`DEEP_FREEZE` triplica o intervalo, `MULTISHOT` mantém o normal). Se ranks também acelerassem o tiro, um `DEEP_FREEZE` rankeado voltaria a se aproximar do congelamento permanente que a própria especialização evita por design — os ranks têm que ser ortogonais ao eixo de especialização, não vazar nele.

### 1.3 Por que não usar recorrência com `floor()` a cada rank

**Armadilha real, encontrada ao validar os números:** se a implementação aplicar `Math.floor(damage * 1.08)` **sobre o valor já arredondado do rank anterior** (recorrência), torres de dano baixo travam. Exemplo: BASIC nível 3 tem `damage = 10`. `Math.floor(10 * 1.08) = Math.floor(10.8) = 10` — e permanece `10` para sempre, porque a fração nunca se acumula.

**Correção obrigatória:** a cada upgrade, recalcular a partir do **baseline de nível 3 guardado**, não do valor do rank anterior:

```
damage(rank) = Math.floor(damageL3 * Math.pow(1.08, rank))
range(rank)  = Math.floor(rangeL3  * Math.pow(1.02, Math.min(rank, 25)))
maxHp(rank)  = Math.floor(maxHpL3  * Math.pow(1.05, rank))
splash(rank) = Math.floor(splashL3 * Math.pow(1.01, Math.min(rank, 40)))  // se a torre tiver splash
```

Isso exige que `Tower2D` guarde um snapshot dos 4 valores no instante em que `level` chega a 3 (**depois** de `applySpecializationStats()` rodar — ver §1.4).

### 1.4 Ordem de captura do baseline

`applySpecializationStats()` já modifica `damage`/`range`/`splashRadius`/`fireRate`/`slowFactor` na mesma chamada de `upgrade()` que leva o nível de 2 para 3. O baseline de rank **tem que ser capturado depois** dessa modificação, senão SIEGE/NAPALM/MULTISHOT ficariam sem efeito nos ranks seguintes (ex.: SIEGE aumenta o alcance base em +40% no momento da especialização; os ranks de alcance devem compor sobre esse valor já ampliado, não sobre o valor pré-SIEGE).

### 1.5 Validação numérica — ARTILLERY (custo base 110g)

Nível 1→3 usa a fórmula antiga (inalterada). A partir daí, ranks:

| Nível | Rank | Dano | Alcance | HP máx | Splash | DPS (`dano×60/110`) |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | — | 25 | 170 | 150 | 50 | 13,64 |
| 2 | — | 37 | 195 | 210 | 55 | 20,18 |
| 3 (baseline) | 0 | 55 | 224 | 294 | 60 | 30,00 |
| 4 | 1 | 59 | 228 | 308 | 60 | 32,18 |
| 8 | 5 | 80 | 247 | 375 | 63 | 43,64 |
| 12 | 9 | 109 | 267 | 456 | 65 | 59,45 |
| 20 | 17 | 203 | 313 | 673 | 71 | 110,73 |
| 30 | 27 | 439 | 367 | 1097 | 78 | 239,45 |
| 40 | 37 | 948 | 367 | 1787 | 86 | 517,09 |
| 50 | 47 | 2047 | 367 | 2912 | 89 | 1116,55 |

**Comparação com HP de BOSS no endless** (`160 × 4.5 × 1.18^(onda-10)`):

| Onda | HP do BOSS | DPS de 1 ARTILLERY no rank alcançável até ali* |
| :-- | :-- | :-- |
| 20 | 3.768 | ~111 (rank17) |
| 30 | 19.723 | ~239 (rank27) |
| 40 | 103.227 | ~517 (rank37) |
| 50 | 540.272 | ~1.117 (rank47) |

\* "rank alcançável" assume 1 rank comprado por onda a partir da onda 4 — otimista para uma única torre, mas serve para mostrar a ordem de grandeza: mesmo no melhor caso, **uma torre sozinha nunca alcança o BOSS**; o jogo continua exigindo dezenas de torres simultâneas, exatamente como hoje. O que muda é que ranks dão ao jogador algo para *comprar* e *decidir* onda a onda em vez de bater no teto do nível 3 por volta da onda 12 (diagnóstico do B2) — o "muro" de fim de run é empurrado para mais tarde, não removido (isso é intencional: o jogo não pretende ser literalmente infinito sem fim de conteúdo).

**Por que não aditivo — a mesma conta com `+8% da base somado por rank` (sem compor):**

| Nível | Dano (aditivo, `55×(1+0,08×rank)`) | Dano (composto) |
| :-- | :-- | :-- |
| 20 | 129 | 203 |
| 50 | 261 | 2047 |

No rank 47 (nível 50) o aditivo entrega **12,7% do dano do composto**. Contra um BOSS de 540.272 HP isso é ruído estatístico — a "decisão de investir em ranks" deixaria de existir na prática por volta da onda 25-30, reproduzindo o mesmo platô que a auditoria criticou no nível 3 fixo, só que um pouco mais tarde. Composto é a escolha correta.

### 1.6 Custo do rank N

Fórmula (nota: para nível ≤ 3, `max(0, level-3) = 0`, então é **bit-a-bit idêntica à fórmula atual** — zero regressão nos níveis 1-3):

```
upgradeCost(level) = Math.floor(costBase * 0.8 * level * Math.pow(1.10, Math.max(0, level - 3)))
```

`1.10` (10% de crescimento composto por rank) foi calibrado por conta, não chutado: com `1.25` (primeira tentativa), o custo acumulado até o nível 30 de uma única ARTILLERY chegava a **3,64 milhões de ouro** — contra uma renda estimada de toda a partida até a onda 30 (somando todas as torres) de ~250 mil ouro pela curva nova da entrega 2. Ou seja, `1.25` tornava o próprio dreno de ouro impossível de alimentar, não um dreno real. `1.10` mantém o nível 20 de uma torre em ~47k (alcançável para 1-2 "torres foco" numa run de endless bem jogada) e o nível 30 em ~227k (exige a run inteira dedicada a uma única torre — corretamente extremo).

**Custo acumulado total** (construir + todos os upgrades até o nível indicado):

| Torre (custo base) | Nível 4 | Nível 8 | Nível 12 | Nível 20 |
| :-- | :-- | :-- | :-- | :-- |
| BASIC (50g) | 290 | 1.436 | 4.310 | 21.559 |
| FROST (70g) | 406 | 2.010 | 6.034 | 30.185 |
| SOLAR_PRISM (100g) | 580 | 2.873 | 8.622 | 43.124 |
| CANNON (105g) | 609 | 3.016 | 9.053 | 45.279 |
| ARTILLERY (110g) | 638 | 3.160 | 9.484 | 47.436 |

**Custo do upgrade individual** (ARTILLERY, para referência de progressão onda a onda):

| Upgrade | Custo | Upgrade | Custo | Upgrade | Custo |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 3→4 | 264 | 8→9 | 1.133 | 13→14 | 2.967 |
| 4→5 | 387 | 9→10 | 1.403 | 16→17 | 4.860 |
| 5→6 | 532 | 10→11 | 1.714 | 20→21 | 8.895 |
| 6→7 | 702 | 11→12 | 2.074 | | |
| 7→8 | 901 | 12→13 | 2.489 | | |

### 1.7 `getSellValue()` — o laço continua correto e barato

`getSellValue()` soma `upgradeCost(l)` para `l` de 1 até `level-1`, exatamente como hoje — só que `upgradeCost` agora usa a fórmula com `1.10^rank`. Continua sendo **um único termo em forma fechada por iteração** (não recursivo), então mesmo um nível teórico de 200 é um laço de ~200 iterações sub-milissegundo — não há necessidade de nenhuma trava anti-loop nova. Confirmar apenas que a implementação usa a fórmula fechada do §1.6 dentro do laço, não uma variável de custo acumulada por multiplicação sucessiva (que reintroduziria o mesmo risco de arredondamento do §1.3, ainda que menos grave aqui porque o custo nunca é tão pequeno quanto o dano da BASIC).

### 1.8 Render — representação compacta acima do rank 3

Hoje `Tower.render()` desenha um ponto amarelo por nível num laço `for (i < level)`, espaçados 8px. No rank 20 (nível 23) isso são 23 pontos atravessando o tile de 40px da torre.

**Nova regra:**
- `level <= 3`: comportamento atual, inalterado (1, 2 ou 3 pontos).
- `level > 3`: desenhar **exatamente 3 pontos** (mesmo estilo/posição de hoje) seguidos de um rótulo de texto `×{level}` (ex.: "×7", "×23") em fonte ~9px, cor `#ffeb3b` (a mesma dos pontos), posicionado imediatamente à direita do 3º ponto, mesma linha de base (`position.y + half - 5`).

---

## 2. Curva de ouro do endless

### 2.1 O que NÃO muda (restrição dura)

A campanha (ondas 1-10) usa a fórmula e os parâmetros **atuais** para o expoente e o corte fixo:

```
onda <= 10:  goldMultiplier = (MORTE_CERTA ? 1.5 : 1.0) * (onda >= 4 ? 0.75 : 1.0)
             reward = base * Math.pow(hpMultiplier, 0.4) * goldMultiplier   // hpMultiplier = campaignHpScales[onda]
```

Isso é **bit-a-bit** o que o código já faz hoje. Zero mudança de número na campanha por esta entrega (a entrega 4 toca nesse corte especificamente para compensar a densidade de onda maior — ver §4 — mas essa é uma mudança separada, justificada por um motivo diferente).

### 2.2 O que muda: só ondas > 10 (endless)

```
onda > 10:
  exponentCompensation = Math.pow(hpMultiplier, 0.35)     // 0.75 - 0.40, ver nota abaixo
  smoothCut            = Math.max(0.45, 0.85 - 0.008 * (onda - 10))
  goldMultiplier        = (MORTE_CERTA ? 1.5 : 1.0) * exponentCompensation * smoothCut
  reward = base * Math.pow(hpMultiplier, 0.4) * goldMultiplier
         = base * Math.pow(hpMultiplier, 0.75) * smoothCut * (MORTE_CERTA ? 1.5 : 1.0)
```

`hpMultiplier` aqui é o valor **já calculado pelo `WaveManager`** para a onda em questão (`4.5 * 1.18^(onda-10)`) — o mesmo valor que `EnemyManager.spawnEnemy()` já recebe como parâmetro. **Nenhuma fórmula de HP é duplicada**: a compensação de expoente multiplica esse valor já pronto por `hpMultiplier^0.35`, produzindo o efeito de "expoente efetivo 0,75" sem tocar em `Enemy.ts` (que continua com `Math.pow(hpMultiplier, 0.4)` hoje-cravado — zero risco de regressão nos testes que instanciam `Enemy2D` diretamente com `hpMultiplier` arbitrário, como `tests/enemy.test.ts`).

Por que expoente efetivo 0,75 e não outro valor: é o número que a auditoria sugeriu e ele produz uma curva "ouro por HP" que ainda declina (mantém a escassez que justifica os ranks de torre como dreno de ouro — ver entrega 1) mas para de ser uma queda de precipício. Validado abaixo.

`smoothCut` substitui o corte fixo de 25%: começa em 0,842 na onda 11 (perto do 0,75 antigo, sem um salto abrupto de riqueza logo na virada campanha→endless) e desce linearmente até um piso de 0,45 (alcançado na onda 60), nunca zerando — o endless nunca fica *sem* corte de ouro, só menos punitivo.

### 2.3 Validação — "ouro por ponto de HP" (mesma métrica da auditoria)

Razão `reward / hpMultiplier` normalizada pela onda 1 = 1,0 (fórmula: `hpMultiplier^(0.4-1) * goldMultiplier`, que se reduz a `hpMultiplier^-0.25 * smoothCut` para as ondas endless):

| Onda | HP mult. | Razão ANTIGA (expoente 0,4 + corte 0,75 fixo) | Razão NOVA | Ganho |
| :-- | :-- | :-- | :-- | :-- |
| 10 (campanha) | 4,5× | 0,304 | **0,244** (recalculado, ver nota) | não comparável ao endless — corte próprio |
| 20 | 23,5× | 0,113 | 0,350 | **3,1×** |
| 30 | 123,3× | 0,042 | 0,207 | **4,9×** |
| 40 | 645,1× | 0,016 | 0,121 | **7,8×** |

A curva **continua caindo** (0,304 → 0,121, não fica plana) — o dreno de ouro dos ranks de torre (entrega 1) continua tendo motivo de existir — mas a queda de ~19× entre onda 10 e 40 (0,304/0,016) vira uma queda de ~2,5× (0,304/0,121). É uma correção real, não uma remoção do desafio econômico.

**Correção (tech-writer, pós-implementação):** a linha da onda 10 estava rotulada "(campanha, inalterada)" acima — isso é **incorreto**. A entrega 4 (§4, densidade de onda) recalibrou o corte de ouro específico da campanha de `×0,75` a partir da onda 4 para `×0,60` a partir da onda 2 (para compensar os +125% de inimigos), e onda 10 está dentro da faixa afetada (onda ≥ 2). A razão ouro/HP medida na onda 10 caiu de **0,304 para 0,244**, não ficou igual. "Inalterada" só descreve corretamente o *expoente* (0,4, intocado por esta entrega) — o corte multiplicativo que entra na mesma razão mudou, e o valor final mudou com ele. Isto não é uma regressão silenciosa: é a mudança documentada na §4.2/§4.4 desta mesma spec, só mal rotulada nesta tabela específica.

**Validação empírica (`qa-engineer`, medição A/B controlada, harness `tests/helpers/balanceSim.ts` com `autoUpgradeGold`):** as ondas 20 e 30 bateram com a previsão desta spec — razão medida 0,347 (onda 20) e 0,207 (onda 30) contra 0,350 e 0,207 previstos aqui. É a diferença entre uma fórmula em papel e uma fórmula que sobreviveu a uma simulação completa (spawns reais, upgrades reais, sem duplicar a conta manualmente) — dá crédito ao método desta seção. A onda 10, por ser campanha (corte próprio, corrigido acima), não fez parte da comparação de expoente do endless; a métrica que a valida é a de campanha (custo acumulado/`failedOrders`), tratada em `BACKLOG.MD`.

### 2.4 Renda absoluta de referência (inimigo STANDARD, base 10g, NORMAL)

| Onda | Reward ANTIGO | Reward NOVO |
| :-- | :-- | :-- |
| 11 | ~19g | ~29g |
| 20 | ~34g | ~82g |
| 30 | ~68g | ~256g |
| 40 | ~135g | ~781g |

### 2.5 Interação com MORTE_CERTA (×1,5) e talento de ouro

- **MORTE_CERTA**: o fator `1.5` multiplica o resultado inteiro, igual a hoje — nas ondas endless ele agora multiplica uma base já maior (ex.: onda 30 NORMAL 256g × 1,5 = 384g). Isso é aceitável porque MORTE_CERTA também tem `speedMultiplier 1.4×` e **1 HP de vida da base** (qualquer vazamento é derrota) — o risco escala junto com a recompensa, e o corte de ouro da campanha (entrega 4) foi deliberadamente endurecido para as ondas 2-10 justamente para que o modo não vire passeio *antes* de chegar ao endless.
- **Talento `goldLvl` (Economy)**: `+25g/+50g` de ouro inicial — é um bônus fixo aplicado **uma única vez**, no início da partida (`GameState.gold = 70 + bonus`). Não interage com a fórmula de recompensa por abate; nenhuma mudança necessária.

---

## 3. Chamada antecipada de onda com bônus

### 3.1 Decisão de arquitetura: contador ativo nos dois modos

Hoje `autoCountdownMs` só é decrementado quando `isAutoMode === true` (`updateAutoCountdown()` retorna imediatamente se `!isAutoMode`). Em modo Manual o valor fica congelado em 5000 — não existe noção de "tempo economizado" para o jogador manual hoje.

**Mudança de comportamento (não é código, é a regra que o código deve implementar):** `updateAutoCountdown(deltaTimeMs)` passa a decrementar `autoCountdownMs` sempre que `!isWaveActive`, **independente de `isAutoMode`**. O auto-início da próxima onda ao chegar a zero continua acontecendo **só** quando `isAutoMode === true` (comportamento hoje inalterado nesse ponto). Em modo Manual, o contador simplesmente chega a zero e fica parado em zero (bônus zerado a partir daí) até o jogador apertar "Iniciar Onda".

Isso é mudança de comportamento do `WaveManager`, então preciso deixá-la explícita aqui mesmo não sendo uma das "5 entregas numéricas" propriamente ditas — sem ela, a entrega 3 simplesmente não faz sentido em modo Manual.

### 3.2 Fórmula do bônus (getter puro, sem GameState)

```
WaveManager.getEarlyCallBonus(): number {
  if (this.isWaveActive) return 0;
  const secondsSaved = this.autoCountdownMs / 1000;             // ms reais -> segundos, fracionário
  const nextWaveNum = this.currentWaveIndex + 2;                // onda que está PRA COMEÇAR
  const perSecondRate = 2 + Math.floor(nextWaveNum / 5);        // ouro/segundo, cresce devagar com a onda
  return Math.floor(Math.min(60, perSecondRate * secondsSaved)); // teto de 60g, sempre
}
```

- `secondsSaved` vem de `autoCountdownMs`, que é **ms reais** (não frames) — consistente com o resto do timing de ondas/magias do projeto.
- `nextWaveNum = currentWaveIndex + 2` porque `startNextWave()` ainda não foi chamado no momento em que o bônus é calculado (`currentWaveIndex` ainda aponta para a onda que **acabou**; a onda que vai começar é `currentWaveIndex + 2` em contagem 1-based). Isso importa para não off-by-one o `perSecondRate`.
- Teto de 60g é fixo e absoluto, independente da fórmula de taxa — proteção contra qualquer ajuste futuro de `perSecondRate` que esqueça de recalcular um teto relativo.

### 3.3 Ordem de chamada (contrato para quem integra em `Game.ts`)

**Obrigatório chamar `getEarlyCallBonus()` ANTES de `startNextWave()`.** Depois de `startNextWave()`, `currentWaveIndex` já avançou e `autoCountdownMs` já foi resetado para 5000 em `onEnemyCleared`/`setAutoMode` — chamar na ordem errada sempre devolve o valor errado (tipicamente 0 ou o bônus da onda seguinte). Sequência correta:

```
const bonus = waveManager.getEarlyCallBonus();
if (waveManager.startNextWave()) {
  if (bonus > 0) gameState.addGold(bonus);
}
```

`startNextWave()` já retorna `false` se `isWaveActive` for `true` ou não houver próxima config — só creditar o bônus se a onda de fato começou, senão um clique que falha (ex.: onda já ativa por um duplo-clique) creditaria ouro de brincadeira.

### 3.4 Escopo: os dois modos, os dois modos de jogo, sem multiplicador ×2

- **Campanha e Endless**: os dois. Não há razão para restringir — a campanha também tem tempo morto entre ondas (é justamente o C5 que ataca a densidade *dentro* de cada onda; a entrega 3 ataca o tempo *entre* ondas, problema ortogonal e presente nos dois modos).
- **Modo Auto**: sim, também vale. Um jogador em Auto que aperta "Iniciar Onda" manualmente antes do auto-disparo está sendo mais engajado que o padrão (não fazer nada) — recompensá-lo é o incentivo certo. Um jogador em Auto que realmente não toca em nada recebe bônus 0 (o auto-disparo acontece exatamente quando `autoCountdownMs` chega a zero, ou seja, `secondsSaved = 0`), o que preserva o comportamento "passivo" de hoje como o piso, não como algo punido nem premiado.
- **Sem o multiplicador ×2 "onda anterior ainda na tela" que a auditoria sugeriu** — ver discordância explícita abaixo.

### 3.5 Discordância com a auditoria

A auditoria sugere "×2 se a onda anterior ainda estiver na tela". Isso é **estruturalmente impossível** sem quebrar um invariante do `WaveManager`: `isWaveActive` só vira `false` em `onEnemyCleared()`, que exige `remainingEnemiesCount === 0` — ou seja, no exato instante em que `startNextWave()` volta a estar disponível, por definição **não há nenhum inimigo da onda anterior em tela**. Implementar o ×2 literal exigiria permitir ondas sobrepostas (chamar a onda N+1 enquanto a onda N ainda tem inimigos vivos), o que é uma mudança de arquitetura bem maior do que "um getter puro" — spawnQueue deixaria de ser uma fila única, `isWaveActive` deixaria de ser um único booleano, etc. Isso está fora do escopo desta rodada P1 (é, no máximo, um candidato a P2/P3 com seu próprio design de risco: “correr duas ondas ao mesmo tempo” muda o jogo de forma que merece uma spec própria).

Em vez disso, a curva contínua de `secondsSaved` já cria o incentivo pretendido (chamar mais rápido = mais bônus) sem precisar de um caso especial artificial.

### 3.6 Tabela de exemplo

| Onda (próxima) | `perSecondRate` | Bônus com 5s poupados (chamada instantânea) | Bônus com 2s poupados |
| :-- | :-- | :-- | :-- |
| 1 | 2g/s | 10g | 4g |
| 10 | 4g/s | 20g | 8g |
| 20 | 6g/s | 30g | 12g |
| 30 | 8g/s | 40g | 16g |
| 40 | 10g/s | 50g | 20g |
| 50+ | 12g/s (teto efetivo em 60g) | 60g (teto) | 24g |

---

## 4. Densidade de onda da campanha + gatilho de tensão

### 4.1 Novo limiar de tensão

`Game.ts` (linha ~1122): `enemyCount > 20` vira **`enemyCount > 8`**. Validado pela auditoria (C5) e compatível com a nova densidade abaixo — 12-18 inimigos por onda com espaçamento reduzido cruzam 8 simultâneos com folga em pelo menos um trecho de cada onda a partir da onda 3.

### 4.2 O conflito matemático que a restrição dura expõe

Dobrar o número de inimigos por onda **necessariamente** aumenta a renda total da campanha, porque a recompensa mínima por abate (RUNNER, 8g) nunca é zero — não existe forma de encher uma onda de "inimigos de enchimento" que não paguem nada sem quebrar a expectativa básica do jogador (matar sempre paga alguma coisa). Testei isso por conta antes de fechar o número: preencher as 10 ondas até 12-17 inimigos usando só RUNNER como enchimento (mantendo os inimigos "caros" de hoje em quantidade igual) já levava o ouro total da campanha de **1.291 para 1.995** (+55%) — o triplo do que eu chamaria de "pequeno".

**Resolução:** a mesma entrega que aumenta a contagem também antecipa e aprofunda o corte de ouro específico da campanha (que hoje já existe, `onda >= 4 ? ×0.75 : ×1.0` — não é uma mecânica nova, é o mesmo parâmetro sendo recalibrado):

```
onda <= 10 (campanha):
  goldMultiplier = (MORTE_CERTA ? 1.5 : 1.0) * (onda >= 2 ? 0.60 : 1.0)
```

(Substitui o `onda >= 4 ? 0.75 : 1.0` do §2.1 — **esta é a única mudança que a entrega 4 faz na fórmula de ouro da campanha**; a entrega 2 declarou a campanha intocada e continua sendo verdade *para o endless*. Se as duas entregas forem implementadas por engenheiros diferentes em paralelo, esta linha é a única sobreposição real entre elas — sinalizar isso na revisão de PR.)

### 4.3 Resultado líquido, com números reais

> **Nota pós-implementação (tech-writer, P1):** esta tabela originalmente afirmava "140" inimigos. A soma elemento-por-elemento das dez listas do §4.4 — tanto nesta spec quanto no array `WaveManager.waves` que de fato foi implementado — dá **144**, não 140: era um erro de conta desta spec desde a origem, não uma divergência introduzida na implementação. Corrigido abaixo; o total de ouro (1.695g) não foi recalculado para 144 elementos — refazer essa conta exige rodar o harness headless (`runBalanceSim`), trabalho de engenharia/QA, não de redação; o valor é reproduzido como veio da spec original.

Com a nova densidade (tabela §4.4) e o novo corte:

| Métrica | Antes | Depois | Variação |
| :-- | :-- | :-- | :-- |
| Total de inimigos (10 ondas) | 64 | **144** | **+125%** |
| Ouro total da campanha (NORMAL, com todos os multiplicadores) | 1.474g | 1.695g | **+15%** |

**+15% de ouro contra +125% de inimigos para interceptar.** Não é zero — sou explícito sobre isso em vez de forçar a conta para "desvio pequeno" como o enunciado pediu, porque forçar seria mentir com números. Mas o desvio real (ouro) é pequeno frente ao aumento de ameaça (contagem), e o lado que mais importa para "MORTE_CERTA vira passeio" é justamente a superfície de risco: com 1 HP de vida da base, **mais que o dobro de inimigos por onda é uma dificuldade adicional real**, não neutralizada pelos 15% de ouro extra. Direção do erro, se houver, é "ficou mais difícil", não "ficou mais fácil" — o lado seguro para MORTE_CERTA.

**Ainda assim, isto precisa ser validado com o harness antes de merge** (ver seção de testes) — a conta acima é sobre ouro total, não sobre se `MAP1_REFERENCE_BUILD` de fato sobrevive às 10 ondas com a densidade nova no tempo que as 10 ondas demoram para spawnar. Delego essa verificação ao `qa-engineer`/`gameplay-engineer` via `runBalanceSim`.

### 4.4 Composição das 10 ondas (formato `{ type, delay }`, `delay` em ms reais)

Os inimigos "grandes" (TANK/SHIELDED/MOSS_GIANT/BOSS) ficam nas **mesmas quantidades de hoje**; o volume extra é RUNNER/STANDARD/SPORE_SPRINTER com delays mais curtos que os originais, para gerar sobreposição (mais de 8 vivos ao mesmo tempo) sem introduzir tipos novos por onda (a identidade de cada onda, como documentada em `GAME_MECHANICS.md`, não muda).

> **Nota pós-implementação (tech-writer, P1):** os delays das **Ondas 2 e 5** abaixo foram ajustados durante a implementação em relação ao que esta spec originalmente pedia — a composição literal (contagem e tipos) não mudou, só os `delay` de alguns tipos dentro dessas duas ondas. A Onda 5 tem justificativa registrada em comentário no próprio código (`WaveManager.ts`): os delays originais deixavam o BOSS colado nos dois TANK anteriores, sem uma janela livre para a build de referência concentrar fogo nele antes da próxima curva — validado com o harness headless (`runBalanceSim`, seed identificada como `'trava'` em `balance.test.ts`) e só então corrigido. A Onda 2 tem a mesma classe de ajuste (delay do RUNNER alongado), sem um comentário dedicado no código explicando o motivo especificamente — a spec abaixo foi corrigida para refletir o array `WaveManager.waves` tal como implementado, que é a fonte de verdade.

```
Onda 1 (12 inimigos, alvo: ainda a primeira experiência do jogador, ouro inicial 70g):
  STANDARD×12, delay 900ms (exceto o 1º, 800ms)

Onda 2 (13 inimigos):
  STANDARD, RUNNER×2, STANDARD, RUNNER×2, STANDARD, RUNNER×2, STANDARD, RUNNER×2, STANDARD
  delays: STANDARD 900ms, RUNNER 650ms (implementado; esta spec pedia 550ms — ver nota acima)

Onda 3 (13 inimigos — introduz TANK/SPORE_SPRINTER):
  STANDARD, SPORE_SPRINTER, TANK, STANDARD, SPORE_SPRINTER, TANK, STANDARD, STANDARD, STANDARD, RUNNER, RUNNER, RUNNER, RUNNER
  delays: STANDARD 800ms, SPORE_SPRINTER 800ms, TANK 1500ms, RUNNER 500ms

Onda 4 (13 inimigos — introduz MOSS_GIANT):
  RUNNER, SPORE_SPRINTER, RUNNER, TANK, MOSS_GIANT, RUNNER, RUNNER, SPORE_SPRINTER, RUNNER, RUNNER, STANDARD, STANDARD, STANDARD
  delays: RUNNER 450ms, SPORE_SPRINTER 550ms, TANK 1400ms, MOSS_GIANT 1800ms, STANDARD 700ms

Onda 5 — MID BOSS (14 inimigos):
  STANDARD, TANK, TANK, BOSS, RUNNER, RUNNER, STANDARD, STANDARD, RUNNER, RUNNER, STANDARD, STANDARD, STANDARD, STANDARD
  delays: STANDARD 700ms, TANK 1300ms, BOSS 3200ms, RUNNER 600ms (implementado; esta spec pedia TANK 1100ms/BOSS 2200ms/RUNNER 500ms — ver nota acima)

Onda 6 (14 inimigos — introduz SHIELDED):
  MOSS_GIANT, RUNNER, SHIELDED, TANK, MOSS_GIANT, RUNNER, STANDARD, STANDARD, RUNNER, RUNNER, STANDARD, STANDARD, STANDARD, STANDARD
  delays: MOSS_GIANT 1700ms, RUNNER 450ms, SHIELDED 1000ms, TANK 1100ms, STANDARD 650ms

Onda 7 — SWARM (16 inimigos):
  [STANDARD, RUNNER, SPORE_SPRINTER, RUNNER] × 4
  delays: STANDARD 350ms, RUNNER 350ms, SPORE_SPRINTER 350ms

Onda 8 — BOSS + ESCORT (16 inimigos):
  TANK, MOSS_GIANT, BOSS, RUNNER, SHIELDED, TANK, STANDARD, STANDARD, RUNNER, RUNNER, STANDARD, STANDARD, STANDARD, STANDARD, STANDARD, STANDARD
  delays: TANK 900ms, MOSS_GIANT 1500ms, BOSS 1900ms, SHIELDED 900ms, RUNNER 400ms, STANDARD 600ms

Onda 9 — CHAOS (16 inimigos):
  RUNNER, SPORE_SPRINTER, SHIELDED, MOSS_GIANT, TANK, RUNNER, RUNNER, SPORE_SPRINTER, STANDARD, STANDARD, RUNNER, RUNNER, STANDARD, STANDARD, STANDARD, STANDARD
  delays: RUNNER 320ms, SPORE_SPRINTER 320ms, SHIELDED 850ms, MOSS_GIANT 1500ms, TANK 800ms, STANDARD 550ms

Onda 10 — ULTIMATE BOSS WAVE (17 inimigos):
  TANK, MOSS_GIANT, BOSS, SHIELDED, BOSS, RUNNER, TANK, STANDARD, STANDARD, RUNNER, RUNNER, SHIELDED, TANK, STANDARD, STANDARD, RUNNER, RUNNER
  delays: TANK 700ms, MOSS_GIANT 1500ms, BOSS 1900ms, SHIELDED 900ms, RUNNER 350ms, STANDARD 550ms
```

### 4.5 `campaignHpScales` — confirmação explícita

**Fica igual.** A tabela `{1:1.0, 2:1.15, 3:1.3, 4:1.5, 5:1.85, 6:2.2, 7:2.6, 8:3.1, 9:3.7, 10:4.5}` não muda. Baixar o HP por inimigo para compensar o volume maior exigiria uma redução de ~87% (calculado por conta e descartado — ver raciocínio abaixo) para manter a renda *total* bit-a-bit idêntica, o que esvaziaria a dificuldade da campanha por completo. A compensação certa é no ouro (§4.2), não no HP: o HP por inimigo continua ensinando o jogador a reconhecer TANK/MOSS_GIANT/SHIELDED/BOSS pela mesma resistência de sempre; só a *quantidade* de decisões de posicionamento por onda sobe.

---

## 5. Magias com dano escalável (Opção 1 — decisão do diretor)

### 5.1 Meteoro — dano proporcional

```
damage = 90 + 0.12 * enemy.data.maxHp
```

Continua **dano em área**: `armorPenetration = 1`, `isAvoidable = false` — inalterado, sem exceção (restrição dura do enunciado, já é o comportamento de `SpellManager.castMeteorAt()` hoje).

`maxHp`, não `hp` atual — dano de Meteoro não deve variar se o alvo já estiver ferido (isso incentivaria "guardar" o Meteoro para acabar de matar em vez de usá-lo como abertura de combate, o oposto do que uma magia de impacto deve incentivar).

### 5.2 Validação

| Cenário | HP máximo | Dano do Meteoro | % do HP máximo |
| :-- | :-- | :-- | :-- |
| STANDARD, onda 1 | 10 | 91 | 910% (one-shot, igual a hoje) |
| BOSS, onda 20 (endless) | 3.768 | 542 | 14,4% (era 2,4% com o dano fixo de 90) |
| BOSS, onda 40 (endless) | 103.227 | 12.477 | 12,1% |

A parte fixa (90) preserva a fantasia de "nuke que limpa uma tela cheia de inimigos fracos" no início do jogo — inalterada. A parte proporcional (12%) é o que resolve a queda para irrelevância que a auditoria mediu (B3): o Meteoro passa a tirar uma fração de HP **estável entre 12% e 14%** de um chefe, para sempre, em vez de despencar para menos de 3%.

### 5.3 Congelamento Global — intocado no efeito, ganha o mesmo alívio de custo do Meteoro

Duração (3,5s / 210 frames), custo inicial (120g) e cooldown base (40s) **ficam exatamente como estão**. Congelamento não causa dano, então o problema de "dano fixo evapora contra HP exponencial" não se aplica a ele — não há necessidade de escalar nada no efeito.

A única mudança é de **consistência**, não de escala: ele ganha o mesmo mecanismo de decaimento de custo por ondas sem uso do §5.4, com seu próprio estado independente (`freezeCostStep`, não compartilhado com o do Meteoro). Sem isso, Congelamento ficaria estritamente pior que o Meteoro em jogos longos por um motivo que não tem nada a ver com o papel de cada magia — a mesma "escolha falsa" que a auditoria aponta em `DEEP_FREEZE` vs `PERMAFROST` (A9), só que entre magias em vez de especializações.

### 5.4 Decaimento de custo por ondas sem uso

Problema atual: `cost *= 2` a cada uso, para sempre, sem decaimento — quem usa a magia uma vez na onda 10 já paga 76.800g na onda 30 se usar todo turno (dobrar 9 vezes a partir de 150g). Isso é o que a auditoria chamou de "garante que ninguém queira testar de novo".

**Novo mecanismo** (idêntico para Meteoro e Congelamento, com estado independente por magia):

```
estado por magia: costStep (inteiro, começa 0), wavesSinceLastCast (inteiro, começa 0)
custo atual = baseCost * 2^costStep                    // baseCost: 150 (Meteoro) / 120 (Congelamento)

Ao conjurar com sucesso:
  costStep = min(6, costStep + 1)     // teto: nunca passa de baseCost*64
  wavesSinceLastCast = 0

A cada onda completada (WaveManager já emite 'wave:end' — o chamador assina esse evento
e invoca SpellManager.onWaveCompleted() uma vez por onda concluída):
  wavesSinceLastCast++
  se wavesSinceLastCast > 0 e wavesSinceLastCast % 2 === 0:
    costStep = max(0, costStep - 1)
```

Isso é exatamente o "-1 passo a cada 2 ondas sem uso" que a auditoria sugeriu, com um teto superior explícito (`costStep <= 6`, custo máximo `150*64 = 9.600g` para o Meteoro) que a auditoria não especificava — adicionado porque "decai, mas nunca temos garantia de que decai rápido o bastante" não é uma trava de segurança, é uma esperança.

**Tabela de custo do Meteoro ao longo de 30 ondas**, dois padrões de uso:

| Padrão | Onda 1 | Onda 5 | Onda 10 | Onda 20 | Onda 30 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| Spam (conjura toda onda) | 150g | 2.400g | 9.600g (teto) | 9.600g (teto) | 9.600g (teto) |
| Tático (1x a cada 3 ondas) | 150g | 150g | 150g | 150g | 150g* |

\* No padrão tático, o custo só passa de 150g se o jogador conjurar de novo antes de completar 2 ondas de intervalo — no ritmo "1x a cada 3 ondas" o passo sempre decai de volta a 0 antes do próximo uso. Isso é o comportamento pretendido: o jogador que usa a magia com parcimônia nunca é punido por isso, e o jogador que abusa converge para um teto alto mas finito, em vez de uma escalada geométrica sem fim (76.800g → 153.600g → ... na regra antiga).

**Comparação direta com a regra antiga (sem decaimento), spam em toda onda:**

| Onda | Custo ANTIGO (sem teto) | Custo NOVO (com decaimento + teto) |
| :-- | :-- | :-- |
| 3 | 600g | 600g |
| 5 | 2.400g | 2.400g |
| 10 | 76.800g | 9.600g |
| 30 | ~2,4 × 10⁸g (inviável) | 9.600g |

---

## Contrato de API para a engine

Assinaturas novas ou alteradas, por entrega. Onde duas entregas tocam o mesmo método, está sinalizado.

### Entrega 1 — Tower.ts / TowerManager.ts / UIManager.ts

- `Tower2D.upgrade(specialization?: TowerSpecialization): boolean`
  - Remove o `if (this.data.level >= 3) return false;` — o teto de retorno `false` passa a existir **só** quando `level === 2` e nenhuma especialização válida foi passada (comportamento hoje já coberto por `isSpecializing`).
  - Branch por nível: `level < 3` usa o bloco genérico atual (`*1.5`/`*1.15`/`*1.4`/`*1.1`, inalterado); `level >= 3` usa as fórmulas fechadas do §1.2/§1.3, ancoradas num novo campo de estado (ver abaixo).
  - Novo campo em `ITower2D` (`src/types.ts`): algo como `rankBaseline?: { damage: number; range: number; maxHp: number; splashRadius?: number }`, preenchido no exato instante em que `level` se torna `3` (depois de `applySpecializationStats()`), nunca mais escrito depois disso.
- `Tower2D.getUpgradeCost(): number` — nova fórmula do §1.6 (`* Math.pow(1.10, Math.max(0, level-3))`), idêntica à atual para `level <= 3`.
- `Tower2D.getSellValue(): number` — mesmo laço, usando a fórmula de custo nova dentro dele.
- `Tower2D.render(...)` — a partir de `level > 3`, trocar o laço de N pontos por 3 pontos + `fillText('×' + level, ...)` (§1.8).
- `TowerManager2D.upgradeSelectedTower(specialization?: TowerSpecialization): boolean` — remove o mesmo teto de nível 3 (linha 167 hoje: `if (this.selectedTower.data.level >= 3) return false;`); a checagem de especialização obrigatória continua restrita a `level === 2`.
- **Fora do meu escopo de arquivo, mas necessário para a entrega funcionar de ponta a ponta** — sinalizo para `ui-ux-engineer`/`gameplay-engineer`: `UIManager.ts` linha ~1322 (`if (tower.data.level >= 3) { upgradeBtn.innerText = '⭐ Máximo'; disabled = true; }`) precisa parar de travar o botão — deve mostrar `⬆️ {cost}g` para qualquer nível ≥ 3 (o teto real agora é só quando `level === 2` sem especialização escolhida, caso já tratado por `isSpecializing`/`specBox`).

### Entrega 2 — EnemyManager.ts

- Método novo (privado, mas com contrato claro para teste): `EnemyManager2D.computeGoldMultiplier(waveNum: number, hpMultiplier: number): number` — substitui a lógica inline hoje em `spawnEnemy()` (linhas 178-181). Implementa exatamente o branch do §2.1/§2.2. Recebe `hpMultiplier` do mesmo parâmetro que `spawnEnemy(type, hpMultiplier)` já tem — **nenhum novo dado precisa ser plumbed**.
- `Enemy.ts` **não muda** — o expoente `0.4` em `getEnemyConfig`/construtor continua cravado; a compensação de expoente das ondas endless vive inteiramente dentro do multiplicador calculado em `EnemyManager`.

### Entrega 3 — WaveManager.ts / Game.ts

- `WaveManager.updateAutoCountdown(deltaTimeMs: number): void` — remove a guarda `if (!this.isAutoMode || this.isWaveActive) return;` e troca por `if (this.isWaveActive) return;`. O auto-início (`if (this.autoCountdownMs <= 0) { this.startNextWave(); ... }`) continua condicionado a `this.isAutoMode` internamente.
- `WaveManager.getEarlyCallBonus(): number` — **novo método público, getter puro** (só lê `this.autoCountdownMs`/`this.currentWaveIndex`/`this.isWaveActive`; não recebe nem consulta `GameState`). Fórmula exata no §3.2.
- Ponto de integração em `Game.ts` (onde hoje o clique de "Iniciar Onda" chama `waveManager.startNextWave()`): buscar o bônus **antes** de chamar `startNextWave()` e creditar com `gameState.addGold(bonus)` **depois** que `startNextWave()` confirmar `true` (§3.3). Isso é código de `Game.ts`, não de `WaveManager` — é o "chamador credita o ouro" que a restrição de arquitetura exige.

### Entrega 4 — WaveManager.ts / EnemyManager.ts / Game.ts

- `WaveManager.waves` — substituir o conteúdo dos 10 elementos (não o comprimento do array, que permanece 10) pelas composições do §4.4.
- `EnemyManager2D.computeGoldMultiplier` (o **mesmo** método novo da entrega 2) — o branch `waveNum <= 10` usa `0.60` a partir da onda 2 em vez de `0.75` a partir da onda 4 (§4.2). **Atenção de integração:** se entregas 2 e 4 forem implementadas em paralelo por pessoas diferentes, as duas tocam o branch de campanha do mesmo método — a entrega 2 especifica esse branch como "inalterado" partindo do código de hoje, e a entrega 4 é quem de fato o modifica. Implementar na ordem 2 depois 4, ou avisar quem pega a 2 que o branch de campanha já vem pré-modificado.
- `Game.ts` linha ~1122: `enemyCount > 20` → `enemyCount > 8`.

### Entrega 5 — SpellManager.ts / AchievementManager.ts (nenhuma mudança lá) / Game.ts

- `SpellManager.castMeteorAt(...)`: dentro do callback de impacto (`particleManager.spawnMeteor(x, y, () => { ... })`), trocar `const damage = 90;` por `const damage = Math.round(90 + 0.12 * enemy.data.maxHp);` — **calculado por inimigo, dentro do laço que já itera `allEnemies`** (o dano varia por alvo, não é mais um valor único fora do laço).
- `SpellManager` — novos campos de estado privados: `meteorCostStep = 0`, `meteorWavesSinceLastCast = 0`, `freezeCostStep = 0`, `freezeWavesSinceLastCast = 0`. `meteorCost`/`freezeCost` deixam de ser incrementados só por `*= 2` direto — passam a ser **derivados** (`baseCost * Math.pow(2, costStep)`) ou mantidos em sincronia manual com o step a cada cast (qualquer uma das duas abordagens é aceitável, desde que a fórmula do §5.4 seja respeitada).
- `SpellManager.onWaveCompleted(): void` — **novo método público**, sem parâmetros (não precisa saber o número da onda, só contar "quantas ondas se passaram desde o último cast" de cada magia). Aplica o decaimento do §5.4 nos dois `costStep`.
- Ponto de integração em `Game.ts`: assinar `EventBus` no evento `wave:end` (que `WaveManager.onEnemyCleared()` já emite) e chamar `spellManager.onWaveCompleted()` uma vez por emissão.

---

## Assertivas de teste que vão quebrar

Verificado arquivo por arquivo em `tower-defense-2d/tests/`, não por suposição.

### `tests/specialization.test.ts` — **quebra confirmada**

Linha 82-93 (`'deve aplicar a especialização escolhida no nível 3'`):
```ts
expect(tower.upgrade(opcao.id)).toBe(true);
expect(tower.data.level).toBe(3);
expect(tower.data.specialization).toBe(opcao.id);

// Nível 3 é o teto, mesmo com outra escolha em mãos
expect(tower.upgrade(opcao.id)).toBe(false);   // <-- ESTA LINHA QUEBRA
```
Com níveis infinitos, chamar `upgrade()` de novo a partir do nível 3 agora **retorna `true`** (sobe para nível 4, ranks genéricos, ignora o argumento de especialização porque `isSpecializing` só é `true` em `level === 2`). O `qa-engineer` precisa reescrever esse último `expect` para: `upgrade()` no nível 3 retorna `true`, `level` vira `4`, e `tower.data.specialization` **continua** sendo `opcao.id` (não é sobrescrito). Sugiro também um teste novo dedicado a "ranks são infinitos e não pedem especialização".

### `tests/wave_preview.test.ts` — **quebra confirmada**

Linha 5-16 (`'deve prever a onda 1 antes de começar, agrupada por tipo'`):
```ts
expect(preview?.totalEnemies).toBe(6);                              // <-- vira 12
expect(preview?.entries).toEqual([{ type: 'STANDARD', count: 6 }]); // <-- vira count: 12
```
A onda 1 continua sendo só STANDARD (composição do §4.4 preserva isso), então só os números mudam, não a forma do teste. Trivial de corrigir, mas vai falhar até corrigir.

Os demais testes desse arquivo (`hasBoss` na onda 5, preview do endless onda 11, arquétipos, Morte Certa onda 10) não hardcodam contagem — continuam passando.

### `tests/balance.test.ts` — **risco real, precisa de simulação antes de aceitar**

- `'deve sobreviver às 7 primeiras ondas com a build de referência'` (linha 96-105): usa `MAP1_REFERENCE_BUILD` (sem `startingGold` customizado — depende só do ouro ganho em campanha) e afirma `r.status === 'PLAYING'` e `r.baseHpRemaining > 0` após 7 ondas. A densidade nova (§4.4) mais que dobra o número de inimigos nas ondas 1-7; **não tenho certeza de que essa build de referência especificamente ainda sobrevive** sem rodar o harness — é exatamente o tipo de afirmação que meu mandato pede para não fechar sem `runBalanceSim`. Recomendo ao `qa-engineer`/`gameplay-engineer`: rodar `runBalanceSim({ seed: 's1'..'s6', waves: 7, build: MAP1_REFERENCE_BUILD })` com as ondas novas **antes** de mesclar, e se `baseHpRemaining` chegar a 0 em algum seed, ajustar os delays do §4.4 (afrouxar, não a contagem) até a build de referência voltar a sobreviver — a build de referência é o "jogador médio seguindo o tutorial implícito do mapa", não deveria precisar de skill acima da média para passar da onda 7.
- `'deve gerar ondas endless jogáveis além da campanha'` (linha 180-200): roda 12 ondas (10 campanha + 2 endless) com `FULL_DEFENSE_BUILD`/`startingGold: 4000` — build muito mais forte, risco bem menor, mas ainda vale re-rodar porque `waveMetrics.every(w => !w.timedOut)` poderia, em teoria, estourar `maxStepsPerWave` (7200 passos ≈ 2min) se a onda 1-10 ficar sensivelmente mais longa de spawnar com a densidade nova. Meus delays do §4.4 foram desenhados para caber bem dentro disso (onda mais longa, onda 10, soma ~11s de spawn), mas é o harness que decide, não minha conta de cabeça.

Os demais `it()` desse arquivo (determinismo, ordens de build, dano por tipo de torre, upgrades refletindo na defesa) não hardcodam número de inimigos nem ouro absoluto — continuam válidos.

### `tests/specialization.test.ts` (segunda seção, "Especializações em partida simulada") — **mesmo risco de simulação**

`'deve manter a defesa completa viável com torres especializadas'` (linha 188-200): `FULL_DEFENSE_BUILD` + `FULL_DEFENSE_UPGRADES`, `startingGold: 4000`, 10 ondas, afirma `wavesCompleted === 10`. Risco baixo (build forte, ouro alto) mas mesma recomendação: re-rodar após aplicar §4.4.

### `tests/tower.test.ts` — **não quebra**

`'should initialize tower stats and handle upgrades correctly'` (linha 11-23) só testa a transição nível 1→2 (`tower.upgrade()` sem argumento, resultado `level === 2`, `damage === 7`). Fórmula genérica de níveis 1-3 não muda — este teste é seguro.

### `tests/campaign_mode.test.ts` — **não quebra**

Nenhuma asserção sobre contagem de inimigos, ouro ou nível de torre — só UI de vitória/troca de mapa e flags de modo. Seguro.

### `tests/wave.test.ts` — **não quebra**

`wm.waves.length` continua `10` (só o conteúdo interno de cada onda muda, não o tamanho do array). O teste de `hpMultiplier` da onda 11 (`toBeCloseTo(5.31, 2)`) testa a fórmula de HP do endless, que nenhuma das 5 entregas toca. Seguro — só confirmar que a onda 1 continua tendo pelo menos um inimigo com delay ≤ 1200ms como primeiro elemento (§4.4 mantém 800-900ms, seguro).

### `tests/endless_mode.test.ts`, `tests/challenge.test.ts`, `tests/enemy.test.ts` — **não quebram**

Nenhum hardcoda contagem de inimigos por onda, valor de `goldMultiplier`/corte fixo, nível máximo de torre ou custo de magia. `challenge.test.ts` usa o primeiro inimigo da onda 1 (STANDARD) só para checar velocidade — composição nova preserva isso.

### Cobertura ausente (recomendação, não bloqueio)

Nenhum arquivo de teste hoje cobre `SpellManager` (`meteorCost`/dano/decaimento) nem `WaveManager.getEarlyCallBonus()`/`updateAutoCountdown` fora de Auto — são superfícies novas ou pouco testadas; o `qa-engineer` vai precisar escrever testes do zero para as entregas 3 e 5, não só ajustar números existentes.
