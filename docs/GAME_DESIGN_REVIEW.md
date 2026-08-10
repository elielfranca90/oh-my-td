# 🎯 Revisão de Game Design — Oh My TD (v0.4.0)

**Escopo:** auditoria de mecânicas implementadas vs. especificadas, curvas de balanceamento, retenção de sessão e UX/UI em desktop e mobile.
**Base:** leitura do código-fonte em `tower-defense-2d/src/` (engine + UI), `docs/GAME_MECHANICS.md` e `index.html`.
**Data:** 09/08/2026

---

## 0. Sumário executivo

O jogo tem **superfície de conteúdo grande** (4 mapas, 5 torres, 10 especializações, 5 módulos roguelite, 8 inimigos, 2 magias, 6 talentos, 9 badges, replay determinístico e leaderboard cloud) sobre um **loop curto demais para sustentá-la**.

O diagnóstico em uma frase: **o jogador vê todo o conteúdo em ~30 minutos e depois bate numa parede aritmética, não numa parede de habilidade.**

Os quatro gargalos que realmente decidem retenção:

| # | Gargalo | Efeito medido |
| :--- | :--- | :--- |
| 1 | Campanha de 10 ondas × ~6,7 inimigos | Run completa em ~8 minutos, 67 inimigos no total |
| 2 | Árvore de talentos custa 50★; badges dão 34★ e vitória dá 10★ | Meta-progressão **esgotada em 2–3 partidas** |
| 3 | HP endless cresce 18% compostos/onda; ouro cresce a `HP^0.4 × 0.75` | Ouro por ponto de HP cai **~24x** entre a onda 1 e a 30 |
| 4 | Torre trava no nível 3; magias têm dano fixo e custo que dobra | Teto de poder atingido por volta da onda 12; run morre por volta da 28–32 sem decisão do jogador |

Além disso há **6 mecânicas anunciadas que não funcionam** (uma delas 100% morta), e a tipografia desenhada no canvas fica **ilegível em celular** por um problema de escala.

Prioridade recomendada: **P0 (correções) → economia/teto de poder → chamada antecipada de onda → onboarding → alvos de toque.** Os quatro últimos são baratos e mexem diretamente no tempo de sessão.

---

# PARTE A — Correções: mecânicas que deveriam funcionar e não funcionam

Ordenadas por severidade. Cada item traz evidência no código.

### A1. 🔴 `VOLTAIC_OVERCHARGE` é uma carta completamente morta

**Onde:** `src/engine/Specializations.ts:122` (catálogo) e `src/types.ts:65` (tipo) — **e mais nenhum lugar do projeto.**

O módulo é oferecido no Draft Roguelite e descrito como "tiros em alvos lentos/congelados disparam faíscas elétricas (8 dano AoE)". Não existe implementação alguma. Como o draft sorteia entre 5 módulos, **20% das escolhas do jogador são placebo** — e pior, é o único módulo com sinergia explícita (Frost + qualquer torre), então é justamente o que um jogador atento vai escolher.

**Correção:** implementar em `handleTowerDamageDealt()` (`Tower.ts:337`), que já é o ponto único por onde passam todos os danos de torre. Se o alvo tem `slowTimer > 0 || freezeTimer > 0`, aplicar 8 de dano num raio de ~40px. Ou remover a carta do pool até implementar — uma carta morta é pior que quatro cartas.

---

### A2. 🔴 A armadura dos inimigos não existe para 3 das 5 torres

**Onde:** `Enemy.ts:91` — `if (isLightShot && armorFactor < 1.0)`. Só aplica redução quando o tiro é "leve".

Quem passa `isLightShot = true`: apenas a **BASIC** (`TowerManager.ts:384`) e o pulso da **FROST** (`TowerManager.ts:284`). Canhão, Artilharia e Prisma Solar passam `false` e **ignoram armadura integralmente**.

Consequências em cadeia:
- O `armorFactor: 0.6` do Tank e `0.7` do Moss Giant — a identidade defensiva desses inimigos — é invisível na maior parte do jogo.
- A especialização **PIERCING** ("ignora armadura") só tem valor sobre a própria Basic, ou seja, compete contra si mesma.
- O Canhão já ignora armadura **e** ainda ganha 2x contra Tank/Boss: ele não é uma escolha, é a resposta certa.

**Correção:** armadura passa a valer para todos os disparos; `PIERCING` e o Canhão ganham anulação explícita de armadura como diferencial. Isso transforma o roster de inimigos num quebra-cabeça em vez de uma barra de vida.

---

### A3. 🔴 Esquiva do Runner cancela dano em área e o Meteoro

**Onde:** `Enemy.ts:85` — o teste de `dodgeChance` é a **primeira** coisa em `takeDamage()`, sem saber a origem do dano.

Resultado: um Runner tem 25% de chance de **desviar de um Meteoro** (`SpellManager.ts:132`), do respingo da Artilharia (`Projectile.ts:74`), do pulso glacial da Frost (`TowerManager.ts:284`) e até de um gêiser de lava (`Game.ts:763`). Desviar de uma explosão em área é ilegível para o jogador: ele vê "DODGED!" numa cratera e conclui que o jogo é injusto.

**Correção:** adicionar um parâmetro `isAvoidable` (default `true`) em `takeDamage()`; passar `false` em dano de área, DoT e hazards. Custo: ~6 linhas.

---

### A4. 🟠 O Canhão é mudo

**Onde:** `AudioManager.ts:437` define `playCannonShot()`. **Nenhum arquivo o chama.**

Basic, Frost e Artilharia tocam SFX de disparo; o Canhão — a torre de 105g com o maior impacto visual por tiro — não emite som algum. Feedback de impacto é o principal veículo de "game feel" num TD; uma torre silenciosa é percebida como quebrada.

**Correção:** uma linha em `TowerManager.ts:400` (bloco `CANNON`).

---

### A5. 🟠 O Draft Roguelite quase não acontece na Campanha

**Onde:** `Game.ts:808` — `if (completedWave === 5 || completedWave === 10 || completedWave === 15)`.

Mas a campanha termina na onda 10 (`GameState.ts:12` — `maxWaves = 10`; vitória em `Game.ts:820`). Então:
- A onda 15 **nunca existe** em campanha.
- O draft da onda 10 dispara no mesmo passo de simulação que declara `VICTORY` — o modal do draft e o de vitória competem pela tela.

Na prática o sistema roguelite inteiro se resume a **uma escolha por run**.

**Correção:** mover os gatilhos para as ondas 3, 6 e 9 na campanha (mantendo 5/10/15/20… no endless) e suprimir o draft quando a run já terminou.

---

### A6. 🟠 HARDCORE não tem nada do que promete

**Onde:** `EnemyManager.ts:168-170`:
```ts
const isFast  = this.gameState.challengeMode === 'MORTE_CERTA';
const isTurbo = this.gameState.challengeMode === 'MORTE_CERTA';  // variável duplicada
```

`docs/GAME_MECHANICS.md §7.3` especifica para o HARDCORE "+25% de velocidade e custo de reparo elevado". **Nenhum dos dois existe.** A única diferença entre HARDCORE e NORMAL é `baseHp = 1` (`GameState.ts:24`). Como o dano de um vazamento já é ≥1, HARDCORE e MORTE_CERTA são idênticos em consequência de erro — o degrau intermediário de dificuldade não existe.

**Correção:** aplicar `speedMultiplier = 1.25` e um multiplicador de custo de reparo no HARDCORE; remover a variável duplicada.

---

### A7. 🟡 O Executor ignora o chefe final

**Onde:** `TowerManager.ts:403` — `const isExecutionTarget = target.data.type === 'TANK' || target.data.type === 'BOSS';`

`BLACK_MEGA_BOSS` e `MOSS_GIANT` ficam de fora. Ou seja: a especialização anti-chefe do Canhão **não funciona contra o chefe final** do modo Morte Certa, que é exatamente o momento em que o jogador a escolheu para usar.

**Correção:** incluir `BLACK_MEGA_BOSS` (e decidir conscientemente sobre `MOSS_GIANT`, que tem armadura e cara de alvo de Executor).

---

### A8. 🟡 O pulso da Frost mente sob névoa

**Onde:** `TowerManager.ts:255` usa `effectiveRange` (reduzido 20% pela névoa) para escolher alvos, mas `TowerManager.ts:277` desenha a partícula do pulso com `tower.data.range` (o raio cheio).

Sob névoa o jogador vê a onda glacial cobrir inimigos que não tomam dano nenhum. Um feedback visual que mente é pior que nenhum feedback.

**Nota relacionada:** o `MAP_4` (Grave Pass) também alterna `isMistActive` (`MapManager.ts:170-174`) e portanto sofre o mesmo −20% de alcance — o que **não está documentado em lugar nenhum**, nem no `GAME_MECHANICS.md`, nem no tooltip do tile.

---

### A9. 🟡 DEEP_FREEZE é estritamente pior que PERMAFROST

Não é bug, é balanceamento — mas o efeito é o mesmo: uma das duas rotas nunca é escolhida por quem faz a conta.

| | Efeito | Cadência | Uptime de controle |
| :--- | :--- | :--- | :--- |
| `DEEP_FREEZE` | congela 60 frames (1s) | `fireRate × 3` = 120 frames (2s) | **50%**, controle total |
| `PERMAFROST` | lentidão 0.25 por 240 frames | 40 frames | **100%**, −75% de velocidade |

Referências: `Tower.ts:130-137`, `TowerManager.ts:292-298`.

PERMAFROST entrega controle contínuo; DEEP_FREEZE entrega metade do tempo com janelas cegas em que o grupo anda livre. Sem uma vantagem compensatória (dano durante o congelamento, por exemplo), a escolha é falsa.

**Correção:** dar ao DEEP_FREEZE um bônus de dano contra alvos congelados (ex.: +50% de dano recebido enquanto `freezeTimer > 0`), transformando-o na rota "burst/combo" contra a rota "controle sustentado".

---

### A10. 🟡 O bônus do Broto está subdocumentado — e é enorme

**Onde:** `TowerManager.ts:454` e `:326` — torres em tile Sprout usam `fireRate / 2`, ou seja **+100% de cadência**, além dos +25% de alcance.

O tooltip in-game menciona ("🌱 Broto: +25% alcance · cadência 2x", `Game.ts:613`), mas o `GAME_MECHANICS.md §5.1` e os READMEs falam **só do alcance**. Dobrar a cadência é de longe o maior modificador de terreno do jogo — quatro tiles do MAP_1 valem mais que qualquer especialização.

**Correção:** decidir se é intencional. Se sim, documentar e usá-lo como âncora de design ("o MAP_1 é o mapa de DPS"); se não, reduzir para ~+35%.

---

### A11. ⚪ Inconsistências menores

| Item | Onde | Observação |
| :--- | :--- | :--- |
| `wave:change` emite `max: 10` fixo | `WaveManager.ts:309, :461` | No endless a HUD recebe "onda 27 / 10" |
| Modal de badges nasce "Unlocked 0/7" | `UIManager.ts:377` | São 9 conquistas; corrigido em runtime na linha 1394, mas pisca errado |
| README diz 20 ondas, 11 badges, Canhão 90g/18 dano | `README.md` (raiz e do app) | Código: 10 ondas, 9 badges, Canhão 105g/14. O `GAME_MECHANICS.md` está correto |
| Power Surge: comentário diz +25% cadência | `TowerManager.ts:127` | O código aplica `×0.83` (+20%); o `GAME_MECHANICS.md §5.3` diz +50% |
| `Math.random()` em lógica de FX | `TowerManager.ts:362, :535` | Cosmético, mas fura a regra de determinismo do projeto |

---

# PARTE B — As três curvas que encerram a sessão

Esta é a parte que mais afeta "segurar o jogador na tela". Não são bugs: são curvas que se cruzam cedo demais.

### B1. 🔴 A economia do Modo Infinito colapsa por construção

Três regras se multiplicam:

```
HP do inimigo   = base × 4.5 × 1.18^(onda-10)        WaveManager.ts:448
Ouro do inimigo = base × HP_mult^0.4                  Enemy.ts:36
Ouro (onda ≥ 4) = × 0.75                              EnemyManager.ts:173
```

O expoente `0.4` significa que **o ouro cresce na raiz 2,5 do HP**. Na prática:

| Onda | Multiplicador de HP | Multiplicador de ouro | Ouro por ponto de HP (vs. onda 1) |
| :--- | :--- | :--- | :--- |
| 10 | 4,5× | 1,8× | 0,30× |
| 20 | 23,5× | 3,6× | 0,11× |
| 30 | 123,3× | 6,9× | **0,042×** |

Somando o corte fixo de 25% a partir da onda 4, o jogador na onda 30 recebe **~1/24 do poder de compra** que tinha no início, contra inimigos 123× mais duros. Não existe build que resolva isso: a run acaba porque a planilha acabou.

**Correção:** subir o expoente para ~0,75 e substituir o corte fixo de 25% por uma curva suave. E, principalmente, criar um **dreno de ouro que também escale** (ver B2) — senão o excedente só vira ouro parado, que é igualmente entediante.

---

### B2. 🔴 O teto de poder chega antes da metade do conteúdo

Uma torre termina de evoluir no nível 3. A Artilharia máxima faz `25 → 37 → 55` de dano a cada 110 frames ≈ **30 DPS** (`Tower.ts:98`, config em `Tower.ts:59`), ~39 DPS com o talento de dano no máximo.

Um BOSS na onda 30 tem ~19.700 HP, e a onda gera 7 deles (`WaveManager.ts:352`). Com ~20 torres maximizadas, cada chefe consome ~25 segundos de fogo concentrado — aproximadamente o tempo que ele leva para atravessar o mapa. **É esse cruzamento, por volta das ondas 28–32, que encerra toda run de endless**, independentemente de habilidade, mapa ou build.

Do ponto de vista de retenção o problema não é "o jogo fica difícil" — é que **a partir da onda ~12 não há mais nada para decidir nem para comprar.** O jogador entra num modo de espera assistindo o inevitável.

**Correção (a mais valiosa do relatório):** níveis infinitos após o 3. Cada rank dá +8% de dano e +2% de alcance, com custo crescente. Não muda regra nenhuma, reaproveita a UI de upgrade existente, e devolve ao jogador uma decisão e um número subindo em toda onda até o fim da run.

---

### B3. 🟠 As magias supremas se autodestroem

```
Meteoro: 90 de dano fixo, raio 90px      SpellManager.ts:125-126
Custo:   150g, dobrando a cada uso       SpellManager.ts:142
```

O dano **nunca escala**. Na onda 20 um chefe tem ~3.768 HP: o Meteoro tira **2,4%** dele — pelo preço de uma torre e meia. Na terceira conjuração o custo já é 600g.

Ou seja: a fantasia de poder do jogo tem prazo de validade na onda ~8, e o custo dobrado garante que ninguém queira testar de novo. As duas conquistas ligadas a magias (`METEOR_STRIKE`, `GLOBAL_FREEZE`, 3 usos cada) empurram o jogador a torrar ouro numa mecânica que já não faz nada.

**Correção (escolher uma):**
1. **Dano proporcional:** Meteoro causa `90 + 12% do HP máximo do alvo`. Continua relevante para sempre sem ficar absurdo cedo.
2. **Recurso próprio:** magias deixam de custar ouro e passam a carregar com abates (barra de "Fúria"). Isso remove a competição direta com a construção de torres — hoje o jogador escolhe entre "uma torre permanente" e "90 de dano uma vez", e a torre ganha sempre. Com recurso próprio, a magia vira uma decisão de *timing*, que é muito mais interessante.

**Recomendo a opção 2** e migrar o custo dobrado para um decaimento (`-1 passo a cada 2 ondas`) caso mantenha o ouro.

---

### B4. 🟠 A meta-progressão termina antes do jogador se fixar

| Fonte de ★ | Total disponível |
| :--- | :--- |
| Árvore completa (6 talentos) | **custa 50★** |
| 9 conquistas | 34★ |
| Vitória em campanha | 10★ por run (`floor(ondas/2) + 5`, `Game.ts:912`) |

**Duas vitórias mais as conquistas já compram a árvore inteira.** Depois disso, todo ★ ganho é lixo — não há dreno. O sistema que deveria ser o motivo de voltar amanhã se resolve na primeira sessão.

**Correção:** ver C4.

---

# PARTE C — Melhorias e substituições para prender o jogador

Ordenadas por **impacto ÷ esforço**. As três primeiras são baratas e mexem no tempo de sessão imediatamente.

### C1. ⭐ Chamada antecipada de onda com bônus de ouro *(o melhor custo-benefício do relatório)*

Hoje o jogador aperta "Iniciar Onda", assiste, espera o contador de 5s e repete. **Não há decisão entre ondas.**

Proposta clássica de TD, e aqui quase de graça porque `autoCountdownMs` já existe (`WaveManager.ts:253`): chamar a próxima onda antes do tempo concede **bônus de ouro proporcional ao tempo economizado** (ex.: +1g por segundo restante, ×2 se a onda anterior ainda estiver na tela).

Por que funciona:
- Cria uma decisão de risco/recompensa **em toda onda**, não a cada 5 ondas.
- Comprime o tempo morto: jogadores bons encadeiam ondas e a sessão fica densa em vez de longa.
- Ataca o gargalo de economia da B1 pelo lado da habilidade, não da planilha.
- Gera a métrica natural de leaderboard "onda X em Y minutos".

**Esforço:** baixo. Um cálculo em `startNextWave()` e um rótulo no botão.

---

### C2. ⭐ Níveis infinitos de torre (detalhado em B2)

O dreno de ouro que faltava e o "número subindo" que sustenta as sessões longas. Reaproveita UI e economia existentes.

---

### C3. ⭐ Objetivos de run e Desafio Diário visível

O `ReplayEngine` e a Daily Seed já existem no código (`ReplayEngine.ts`, `Game.ts:192`) mas **não têm porta de entrada na UI**. É conteúdo pronto e invisível.

Proposta:
- **3 objetivos por run**, sorteados da semente: "vença a onda 7 sem perder HP", "mate 5 Tanks com Artilharia", "termine com 4 torres nível 3". Cada um vale ★.
- **Desafio Diário** na tela inicial: todo mundo joga a mesma semente, com placar próprio. É o gancho de "voltar amanhã" mais barato que existe, e a infraestrutura determinística já está construída e testada.

**Esforço:** médio (UI nova), alto retorno.

---

### C4. ⭐ Meta-progressão com desbloqueios, não só bônus

Substituir a árvore de 6 nós que satura por:
1. **Desbloqueios por ★:** a 5ª torre, o MAP_3 e o MAP_4 começam bloqueados e abrem com ★. Ver algo bloqueado é o mais forte convite a jogar de novo — hoje o jogador recebe tudo de uma vez e não tem nada a perseguir.
2. **Ramos por torre:** "Especialista em Gelo: +1s de lentidão", "Doutrina de Artilharia: +10% de raio". Puxa o jogador a experimentar torres que ele ignora.
3. **Nível de prestígio soft-infinito:** depois da árvore cheia, cada 10★ dá +1% de dano global, para sempre. Elimina o ★ inútil.

---

### C5. Ritmo de onda: as ondas são finas demais

As ondas da campanha têm **6 a 8 inimigos** (`WaveManager.ts:40-166`) com delays de 0,4–2,5s: cada onda entrega ~8 segundos de ação seguidos de espera. A tensão nunca acumula — e `Game.ts:867` só considera a partida "tensa" acima de **20 inimigos simultâneos**, número que a campanha *nunca* atinge. O sistema de tensão de áudio e a vinheta praticamente não disparam no modo principal.

**Correção:** 12–20 inimigos por onda na campanha, com sobreposição entre elas, e recalibrar o gatilho de tensão para ~8 inimigos.

---

### C6. Derrota interessante em vez de derrota terminal

Hoje `baseHp = 0` encerra tudo instantaneamente (`GameState.ts:61`). No HARDCORE/MORTE_CERTA (1 HP) isso significa que **um único vazamento apaga 20 minutos de sessão**, sem aviso e sem recurso.

**Correção:** "Última Chance" — ao chegar a 0 HP, oferecer uma revivência única em troca de **todo o ouro acumulado** (mais um congelamento global grátis para reorganizar). Transforma o pior momento da sessão num clímax, e alonga runs justamente na faixa em que o jogador estava mais investido.

---

### C7. Dar propósito ao dano de chefe contra torres

Chefes atacam torres num raio de 100–120px por 12–15 de dano/s (`EnemyManager.ts:98-120`), e torres têm 100–150 HP: um chefe parado destrói uma torre em ~9 segundos. A mecânica é boa — mas hoje é invisível, porque **não há telegrafia** (nenhuma linha de ataque, nenhum alerta) e a reação disponível (reparar) exige abrir o inspetor da torre certa no meio do caos.

**Correção:** desenhar o raio de ameaça do chefe, piscar a torre sob ataque, e adicionar um botão de "reparar tudo" com preço somado. Assim o sistema de reparo — que já tem talento e conquista dedicados — vira uma decisão real.

---

### C8. Substituição sugerida: aposentar o `MOSS_GIANT` como está

Regenera +1 HP a cada 20 frames (`Enemy.ts:144`), valor **absoluto**. Na onda 20, com 45 × 23,5 = 1.058 HP, os 3 HP/s regenerados são 0,3% da vida por segundo: o traço que define o inimigo desaparece por escala. Ou a regeneração vira percentual (~1,5%/s do HP máximo), ou o inimigo deveria ser substituído por algo que escale — por exemplo, um **Curandeiro** que regenera *os aliados ao redor*, criando um alvo prioritário e ensinando o jogador a focar fogo.

---

# PARTE D — UX/UI no navegador

### D1. 🔴 Não existe onboarding

Busca por `tutorial|onboarding|firstTime` em `src/`: **zero ocorrências.**

O primeiro contato é: uma tela inicial com 3 botões, e em seguida uma HUD com 5 cartas de torre, 2 magias, 3 velocidades, seletor de mapa, seletor de desafio, botão de infinito, botão de auto e um botão de onda. Nada explica que se constrói clicando no terreno, que tiles verdes dão bônus, que o nível 3 pede uma escolha, ou o que "Morte Certa" faz.

Para um jogo que quer ser "convidativo", este é o item de maior impacto da Parte D.

**Correção:** primeira run guiada de ~40 segundos — destacar um tile e pedir a primeira torre, apontar o botão de onda, e no primeiro upgrade nível 2→3 explicar a escolha. Um `hasSeenTutorial` no `localStorage` (onde os talentos já são salvos) basta como estado.

---

### D2. 🟠 Teclado praticamente ausente

Só existem `Space` e `P` para pausar (`Game.ts:344-349`). Faltam os atalhos que qualquer jogador de TD procura por reflexo:

| Tecla | Ação |
| :--- | :--- |
| `1`–`5` | selecionar tipo de torre |
| `Q` / `W` | Meteoro / Congelamento |
| `Enter` | iniciar próxima onda |
| `Esc` | cancelar magia armada / desselecionar torre |
| `U` / `S` | upgrade / vender a torre selecionada |
| `1`/`2`/`3` (com Shift) | velocidade |

`Esc` merece destaque: hoje, com o Meteoro armado, **não há como desarmá-lo pelo teclado**, e clicar no canvas com ouro insuficiente já foi fonte de um bug travante corrigido (o comentário em `Game.ts:470-477` documenta o caso).

---

### D3. 🟠 Feedback de dano inconsistente

`TowerManager.ts:362` — `if (fxManager && Math.random() < 0.3)`: o Prisma Solar mostra o número de dano em **30% dos ticks**, aleatoriamente. As outras torres mostram sempre. O jogador percebe isso como falha de renderização, não como economia de poluição visual. Melhor: acumular o dano do feixe e emitir um número consolidado a cada segundo.

### D4. 🟠 Vender torre não pede confirmação

`UIManager.ts` liga o botão "💰 Vender" direto em `sellSelectedTower()`. Um toque errado apaga uma Artilharia nível 3 (110g + upgrades) sem desfazer. Pede confirmação, ou uma janela de "desfazer" de 3 segundos.

### D5. 🟡 Melhorias de leitura de campo
- **Alternar exibição de todos os alcances** (hoje só aparece no hover/seleção, `Tower.ts:200`). Essencial para planejar cobertura.
- **Telegrafia da onda no canvas**: a composição só aparece na HUD; marcar o portal de spawn com os ícones da próxima onda mantém o olhar no campo.
- **Persistir preferências** de velocidade e auto entre runs (o endless já persiste — `Game.ts:115`).
- **Linha de caminho realçada** ao passar o mouse por um tile, mostrando quais trechos da rota aquela torre cobre.

---

# PARTE E — UX/UI em smartphones e tablets

### E1. 🔴 Toda a tipografia desenhada no canvas fica ilegível no celular

Este é o problema mais grave da Parte E e não é óbvio no desktop.

O canvas tem resolução interna fixa de **840×600** e é escalado por CSS. Num telefone de 360px de largura útil, o fator de escala é ~0,43. Então:

| Elemento | Tamanho no canvas | Tamanho real no telefone |
| :--- | :--- | :--- |
| Tooltip de tile (`Game.ts:680-681`) | 11–12px | **~5px** |
| Texto de dano / "DODGED!" (`FXManager`) | ~12px | ~5px |
| Toast de conquista (`Game.ts:575-580`) | 12–14px | ~6px |
| Barra de vida do inimigo (`Enemy.ts:281`) | 4px de altura | **~1,7px** |

Ou seja: o press-and-hold — recurso destacado como diferencial mobile — abre uma caixa **que não pode ser lida no aparelho para o qual foi feito**.

**Correção:** calcular um `uiScale = 840 / larguraRealDoCanvas` e multiplicar todo tamanho de fonte e espessura de barra desenhados no canvas. Alternativamente, mover o tooltip de tile para um elemento DOM posicionado sobre o canvas — ele já é HTML em tudo o mais.

---

### E2. 🔴 Alvos de toque abaixo do mínimo — e o botão mais usado é o menor

`index.html:1030-1046`:
```css
.toolbar-card, .btn, .toolbar-chip, .speed-btn { min-height: 38px; }
.start-wave-main-btn { min-height: 32px; font-size: 0.75rem; }
```

O mínimo recomendado é 44px (Apple HIG) / 48dp (Material). Tudo está abaixo — e **"Iniciar Onda", o botão mais pressionado do jogo, é o menor de todos, com 32px.**

**Correção:** 44px como piso geral; 52–56px para o botão de onda, que deveria ser o elemento mais proeminente da tela.

---

### E3. 🟠 As ações principais estão fora do alcance do polegar

O layout empilha: HUD (topo) → barra de ação com as **cartas de torre** (topo) → canvas (meio) → controles de tempo (base, `bottom: max(8px, env(safe-area-inset-bottom))`).

Em retrato, num aparelho de 6,5", a barra de torres fica na **zona mais difícil de alcançar com uma mão**, enquanto a base — a zona natural do polegar — carrega só velocidade e onda. O jogador precisa reposicionar a mão a cada construção, que é a ação mais repetida do jogo.

**Correção:** em retrato, mover a seleção de torres para uma barra inferior fixa acima dos controles de tempo, e subir a HUD de recursos (ouro/HP/onda), que é apenas leitura, para o topo.

---

### E4. 🟠 Nenhum retorno tátil

Zero ocorrências de `navigator.vibrate` no projeto. Em mobile, o háptico substitui o feedback físico que o mouse não precisa. Custa quase nada:

| Evento | Padrão |
| :--- | :--- |
| Torre construída | `10ms` |
| Upgrade concluído | `[10, 40, 10]` |
| Base recebe dano | `[60, 30, 60]` |
| Chefe entra em cena | `[100, 50, 100]` |
| Ação inválida (sem ouro) | `[30, 20, 30]` |

Respeitar `prefers-reduced-motion` e oferecer um interruptor nas configurações (que já tem sliders de BGM/SFX).

---

### E5. 🟠 O gesto de construir não se explica

`Game.ts:486-503`: no mobile o primeiro toque seleciona o tile e o segundo constrói. É a decisão certa (evita construção acidental), mas **nada na tela diz isso**. O fantasma de posicionamento aparece (`renderGhostPlacement`) sem nenhum rótulo.

**Correção:** com o tile selecionado, exibir "Toque de novo para construir · 50g" junto ao fantasma, e um botão explícito de ✖ para cancelar. No tablet, considerar arrastar-e-soltar da carta para o tile, que é mais direto.

---

### E6. 🟡 Retrato não é tratado

Há `orientationchange` apenas para recalcular tamanho (`Game.ts:337`). Um canvas 14:10 em retrato ocupa uma faixa fina no meio da tela, com o campo de jogo minúsculo e enormes áreas vazias.

**Correção:** detectar retrato e (a) sugerir a rotação com um overlay dispensável, ou (b) servir um layout de retrato de verdade, com o canvas ocupando a largura total e os painéis empilhados abaixo.

### E7. 🟡 Modais e zoom
- **Sem toque no fundo para fechar** e sem arrastar-para-baixo: só o ✖. Em telas pequenas o ✖ é o alvo mais difícil da tela.
- `index.html:5` — `maximum-scale=1.0, user-scalable=no` desativa o zoom. Defensável sobre o canvas, mas prejudica quem precisa ampliar para ler o placar ou o changelog. Liberar o zoom dentro dos modais.
- O leaderboard usa `overflow-x: auto` numa tabela; em telefone, cartões empilhados leem melhor que uma tabela com rolagem lateral.

### E8. 🟡 Custo de quadro em aparelhos modestos

`TowerManager.ts:260` roda `enemies.filter(...)` com `Math.hypot` **por torre, por quadro**. Com 30 torres e 40 inimigos são 1.200 raízes quadradas e 30 arrays novos a cada quadro — 72.000 alocações por segundo a 60fps, e o dobro em 2x. É a causa mais provável de engasgos e aquecimento em celulares intermediários, e piora justo nas ondas grandes.

**Correção:** comparar distância ao quadrado (elimina a raiz), reutilizar um buffer em vez de criar arrays, e opcionalmente indexar inimigos numa grade grosseira de células.

---

# PARTE F — Plano de execução sugerido

### P0 — Consertar o que está quebrado *(~1 sprint curta)*
1. `VOLTAIC_OVERCHARGE`: implementar ou remover do pool **(A1)**
2. Esquiva não anula dano em área **(A3)**
3. Armadura passa a valer para todas as torres **(A2)**
4. SFX do Canhão **(A4)**
5. Gatilhos do draft na campanha **(A5)**
6. HARDCORE ganha seus modificadores **(A6)**
7. Executor inclui o `BLACK_MEGA_BOSS` **(A7)**
8. Raio do pulso da Frost sob névoa **(A8)**
9. Sincronizar `README.md` com o código **(A11)**

### P1 — Devolver decisões ao jogador *(o que mais alonga a sessão)*
10. **Chamada antecipada de onda com bônus** **(C1)**
11. **Níveis infinitos de torre** **(B2/C2)**
12. Recalibrar a economia do endless (`^0.75`) **(B1)**
13. Magias com dano escalável ou recurso próprio **(B3)**
14. Ondas mais densas + gatilho de tensão em 8 inimigos **(C5)**

### P2 — Retenção entre sessões
15. Onboarding de 40 segundos **(D1)**
16. Objetivos de run + Desafio Diário na UI **(C3)**
17. Desbloqueios e prestígio na meta-progressão **(C4)**
18. "Última Chance" na derrota **(C6)**

### P3 — Polimento de UX
19. Escala de tipografia no canvas **(E1)** — *tratar como P1 se mobile for público principal*
20. Alvos de toque em 44px+ e barra de construção inferior **(E2, E3)**
21. Háptico **(E4)** e dica do gesto de construir **(E5)**
22. Atalhos de teclado, incluindo `Esc` **(D2)**
23. Confirmação de venda **(D4)** e alternância de alcances **(D5)**
24. Otimização do laço de mira **(E8)**

---

## Nota de método

Todas as afirmações acima foram verificadas no código-fonte, não nos documentos — em vários pontos os dois discordam, e onde discordam o código venceu. O `docs/GAME_MECHANICS.md` está fiel ao código na maioria absoluta dos casos (as exceções estão em A6, A10 e A11); os dois `README.md` estão defasados em números.

Não foram medidas sessões reais de jogo. As estimativas de duração de run e de parede do endless são derivadas das fórmulas de HP, cadência e dano, e devem ser confirmadas com o harness headless que já existe em `tests/helpers/balanceSim.ts` — ele é a ferramenta certa para validar as recalibragens propostas em B1 e B2 antes de aplicá-las.
