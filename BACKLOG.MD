# 📌 Product Backlog - Tower Defense 2D (Oh My TD)

## 🟢 Concluído

- [x] **Diorama 3D Low-Poly de Natureza**: Substituição do background synthwave/space da `WelcomeScreen` por uma ilha flutuante 3D em Three.js com pinheiros, sol bucólico com bloom e vaga-lumes.
- [x] **Renderização WebGL de Terrenos sRGB**: Texturas dos tiles do mapa configuradas com `THREE.SRGBColorSpace` para fidelidade de cores sem lavagem de gama.
- [x] **Sistema de Especializações de Torres (Nível 3)**: Ramificação de caminhos de upgrade (ex: Sniper vs Gatling) para todas as 5 torres.
- [x] **Chefão Final & Mega Boss Renderer**: Implementação de `BLACK_MEGA_BOSS` na Onda 20 do Modo Campanha com renderizador procedural dedicado.
- [x] **Sincronização Cloud & Supabase**: Autenticação anônima, persistência de conquistas e Placar Global de High Scores.
- [x] **Sub-stepping e Simulação Físico-Determinística**: Implementação de timestep fixo com sub-stepping para execução estável em 2x/4x.

## 🟢 Concluído (Sprint Game Evolution v2)

- [x] **1. Mecânicas Ambientais Dinâmicas por Bioma**: Fissuras de lava ativas no Desfiladeiro/Vale da Morte, conectores de energia na Cidadela Neon e névoa dinâmica no Vale Verde.
- [x] **2. Sistema Roguelite de Módulos e Draft de Cartas**: Modal de Draft de Cartas nas Ondas 5, 10 e 15 + encaixe de módulos passivos/ativos em torres Nível 2+.
- [x] **3. Replay Determinístico & Desafios Diários**: Gravação compacta de logs de input, reprodutor Ghost Replay no Leaderboard e Daily Seed determinística.
- [x] **4. Post-Processing Shaders no Three.js & Motor de Tensão Audio**: Efeitos visuais WebGL (Vignette, Heat Distortion) e camadas dinâmicas de tensão e arpejos sintetizados em tempo real.

## 🟢 Concluído (Sprint de Estabilidade e Correção de Bugs de Gameplay)

- [x] **Correção de Congelamento no Draft Roguelite**: Resolução de referência não definida de `getAllRogueliteModules` em `UIManager.ts` via importação correta de `Specializations.ts`.
- [x] **Normalização da Instância Supabase (GoTrueClient Singleton)**: Implementação do padrão Singleton no `DatabaseManager` e atualização em `Game.ts` e `WelcomeScreen.ts` para mitigar recriações concorrentes de cliente Supabase.
- [x] **Correção do Loop de Resolução / Encolhimento do Canvas**: Ajuste no cálculo de `--canvas-width` e `--canvas-height` em `syncCanvasWidth` (`Game.ts`) para prevenir loop de encolhimento infinito no layout `flex`.
- [x] **Sanitização de Tipagem TypeScript & Refatoração de Construtores**: Adição de declarações explícitas de atributos da classe `TowerManager2D` e suporte a regras estritas de compilação sem parâmetros de construtor em `ReplayEngine.ts`.
- [x] **Isolamento de Brotos Selvagens (*Overgrowth Sprout*) por Bioma**: Restrição da geração de tiles *Sprout* exclusivamente ao mapa **Green Valley (`MAP_1`)** em `Game.ts`, garantindo que mapas de lava, cibernéticos ou góticos não contenham brotos de vegetação incoerentes com seus biomas.
- [x] **Mecânica de Terreno no Cemitério Obscuro (*Altar Obscuro / Dark Altar*)**: Sorteio de 3 tiles góticos especiais (`darkAltarTiles`) exclusivamente no **Grave Pass (`MAP_4`)**, concedendo **+25% de Dano Necrótico** para torres construídas neles e destacando um marcador de aura roxa espiritual (`#ab47bc`).

## 🟢 Concluído (Sprint Polimento de UX Mobile — P3 da auditoria)

- [x] **Escala de Tipografia no Canvas (`uiScale`)**: Fator de escala aplicado a tooltip de tile, toast de conquista, texto de dano/"DODGED!" e barra de vida/escudo do inimigo, corrigindo texto ilegível (~5px reais) em telefones pequenos.
- [x] **Alvos de Toque em 44px+ e Barra de Construção no Polegar**: Piso geral de toque subiu para 44px (52px no botão "Iniciar Onda"); corrigida uma segunda regressão de CSS que baixava o piso para 28px em telas ≤480px. Em retrato/mobile, a barra de torres/magias passa a ficar fixa acima dos controles de tempo.
- [x] **Retorno Tátil (Háptico)**: Novo `src/helpers/haptics.ts` dispara vibração em construir torre, upgrade, dano na base, spawn de chefe e ação sem ouro; respeita `prefers-reduced-motion` e tem interruptor nas Configurações.
- [x] **Dica de Gesto de Construção Mobile**: Balão "Toque de novo para construir · Xg" com botão ✖ ao selecionar um tile vazio no mobile.
- [x] **Atalhos de Teclado**: `1`-`5` seleciona torre, `Q`/`W` arma Meteoro/conjura Congelamento, `Enter` inicia onda, `Esc` desarma magia → cancela seleção mobile → desseleciona torre (corrige o travamento de não poder desarmar o Meteoro pelo teclado), `U`/`S` upgrade/vende, `R` alterna todos os alcances, `Shift`+`1`/`2`/`3` troca velocidade.
- [x] **Confirmação de Venda em Duas Etapas**: Vender torre exige um segundo clique/tecla `S` dentro de uma janela de 3s, pelo botão e pelo atalho.
- [x] **Alternância de Alcance de Todas as Torres**: Botão 🎯 (e atalho `R`) desenha o alcance de todas as torres simultaneamente para planejar cobertura.
- [x] **Otimização do Laço de Mira das Torres**: Comparação por distância ao quadrado (sem `Math.hypot`) e buffer reutilizado por instância eliminam alocações e a raiz quadrada do laço torre×inimigo por quadro; grade espacial (spatial hash) segue pendente para uma rodada futura.

## 🟢 Concluído (Sprint Biomas Fantasia)

- [x] **Mapa 4 (Grave Pass / Cemitério Obscuro)**: Adição do quarto mapa com rota em espiral gótica, bioma de névoa e perigo ambiental `GRAVEYARD_SOULS` (erupções de almas com desaceleração em área), atlas procedural em tons de roxo/esmeralda e trilha sonora BGM dedicada em Sol Menor.
- [x] **Otimização de Bundling & Vendor Code-Splitting (Vite)**: Criação do `vite.config.ts` com `manualChunks` isolando Three.js (~514 kB) e Supabase (~215 kB), reduzindo o chunk principal do jogo em ~78% (de 935 kB para 204 kB).

## 🟢 Concluído (Sprint P1 — Devolver Decisões ao Jogador, `docs/GAME_DESIGN_REVIEW.md` Parte F itens 10-14)

- [x] **Níveis Infinitos de Torre**: Nível 3 continua sendo o teto de especialização; a partir do Nível 4 a torre sobe em ranks genéricos e infinitos (dano/HP máximo crescem compostos sem limite, alcance/raio de área crescem compostos até um teto nos ranks 25/40), com custo de upgrade que também cresce composto por rank. Baseline capturado uma única vez no instante em que o nível chega a 3, depois da especialização aplicada — evita a armadilha de `floor()` recorrente que travava atributos de valor baixo para sempre (ver `skills/lessons.md`).
- [x] **Chamada Antecipada de Onda com Bônus de Ouro**: o contador de 5s entre ondas agora decresce em Manual e em Auto (antes só em Auto); chamar a próxima onda antes de zerar concede ouro proporcional ao tempo poupado, com teto de 60g. O botão "Iniciar Onda"/Auto no mobile foi destravado para tornar o bônus alcançável sem teclado (ver `skills/lessons.md`).
- [x] **Curva de Ouro do Modo Infinito Recalibrada**: expoente efetivo de recompensa sobe para ~0,75 só a partir da onda 11 (composição sobre o expoente `0.4` que continua cravado em `Enemy.ts`), com corte suave substituindo o corte fixo de 25% antigo.
- [x] **Densidade de Onda da Campanha + Gatilho de Tensão**: as 10 ondas da campanha somam 144 inimigos (eram 64); limiar de tensão de áudio/vinheta recalibrado de `enemyCount > 20` para `enemyCount > 8`. Corte de ouro específico da campanha recalibrado (`×0.60` a partir da onda 2) para compensar a densidade maior.
- [x] **Magias com Dano Escalável**: Meteoro passa de dano fixo (90) para `90 + 12% do HP máximo do alvo`, por inimigo no impacto. Custo de Meteoro e Congelamento Global continua dobrando por uso, mas agora decai 1 passo a cada 2 ondas sem uso, com teto em 64× o custo base.

**Pendências herdadas do P1, registradas e não fechadas** (ver `docs/GAME_DESIGN_REVIEW.md` Parte F para o detalhe de cada decisão):
- Magias com recurso próprio ("Fúria", opção 2 do antigo item B3) — adiada para o pacote de retenção (P2), onde a HUD será tocada de qualquer forma.
- Multiplicador ×2 de bônus "onda anterior ainda em tela" (item C1 original) — rejeitado, não só adiado: estruturalmente impossível sem reescrever `spawnQueue` para permitir ondas sobrepostas.

**Medição A/B controlada (`qa-engineer`, pós-P1):** harness `tests/helpers/balanceSim.ts` estendido com `autoUpgradeGold` (estratégia "mais barato primeiro"), 6 seeds de `balance.test.ts`, `maxStepsPerWave` elevado para 40000, cada seed 2× por lado — comparando um worktree do `main` pré-P1 contra a branch `feature/p1-player-decisions-2026-08`, 100% reprodutível nos dois lados.
- **Endless, `FULL_DEFENSE_BUILD` + upgrades, `startingGold: 4000`:** média de onda de morte 14,0 (`main`) → 17,0 (branch), **+21%**. Por seed: s1 14→18, s2 14→18, s3 14→16, s4 14→15, s5 14→18, s6 14→17.
- **Endless, ouro alto (`startingGold: 50.000.000`, isola o teto de poder da economia):** onda 14 em todas as seeds no `main`; onda **39** em todas as seeds na branch, **+179%**.
- **Campanha completa (10 ondas), `MAP1_REFERENCE_BUILD`:** `main` 0/6 seeds sobrevivem; branch 0/6 seeds sobrevivem. Ondas de morte idênticas em 5 das 6 seeds; só s1 piorou (onda 10 → onda 8).

Três itens ficam em aberto a partir desta medição, nenhum deles feito:

- [ ] **A campanha de 10 ondas nunca foi verificada como vencível — dívida pré-existente, não regressão do P1.** `tests/campaign_mode.test.ts` só força `gameState.setStatus('VICTORY')` para exercitar o *fluxo* de vitória (não simula as 10 ondas); `tests/balance.test.ts:96` cobre só as **7 primeiras ondas**. A medição A/B acima mostra que a `MAP1_REFERENCE_BUILD` não vence a campanha nem antes nem depois do P1 (0/6 seeds nos dois lados) — ou seja, isto já era verdade no `main`, o P1 não criou o problema, só o expôs ao estender a simulação além da onda 7. Em aberto: descobrir se a campanha é vencível por alguma build competente, ou se a `MAP1_REFERENCE_BUILD` é fraca demais para servir de referência de balanceamento.
- [ ] **Seed s1 da campanha piorou** (morte na onda 10 → onda 8) enquanto as outras 5 seeds da mesma medição ficaram idênticas antes/depois do P1. Causa não isolada; por eliminação (é a única entrega do P1 que toca densidade/composição de onda na campanha), a hipótese é a Entrega 4 do `docs/P1_BALANCE_SPEC.md` (§4: densidade de onda, +125% de inimigos contra +15% de ouro total). Precisa de investigação dedicada antes de aceitar ou descartar a hipótese.
- [ ] **Hipótese não testada: o corte de ouro da campanha pode estar quebrando o script de build, não o jogo.** A Entrega 4 endureceu o corte de ouro da campanha de `×0,75` a partir da onda 4 para `×0,60` a partir da onda 2 — nas ondas 2 e 3 o jogador agora recebe 40% menos por abate do que recebia antes (ver `docs/P1_BALANCE_SPEC.md` §2.3, corrigido nesta rodada). A `MAP1_REFERENCE_BUILD` compra em ondas fixas do calendário (ex.: Canhão de 105g na onda 4), sem se adaptar à economia disponível. Vale checar o campo `failedOrders` do `SimResult` nas seeds que morrem: se as compras do script estiverem falhando por falta de ouro, o diagnóstico muda de "a campanha ficou difícil" (problema de jogo) para "o script de build não se adapta à nova curva" (problema de harness) — são correções muito diferentes e essa checagem ainda não foi feita.

## 🟡 Próximas Funcionalidades (Backlog)

- [ ] **P2 — Retenção entre sessões** (`docs/GAME_DESIGN_REVIEW.md` Parte F, itens 15-18, pendente por completo): onboarding de ~40s guiando a primeira torre/onda/especialização; objetivos de run + Desafio Diário visível na UI (a infraestrutura de `ReplayEngine`/Daily Seed já existe, só falta porta de entrada); desbloqueios e prestígio na meta-progressão em vez de uma árvore de talentos que satura em 2-3 partidas; "Última Chance" na derrota (revivência única em troca do ouro acumulado). Inclui também as magias com recurso próprio ("Fúria") adiadas do P1, ver acima.
- [ ] **Grade Espacial (Spatial Hash) para o Laço de Mira das Torres** (item E8 da auditoria, parcial desde o Sprint de Polimento UX Mobile): a comparação por distância ao quadrado e o buffer reutilizado já eliminaram alocações e `Math.hypot` do laço torre×inimigo; a indexação por grade grosseira de células — para reduzir o número de comparações em si, não só seu custo unitário — segue pendente. Retomar se o profiling em dispositivo real ainda apontar esse laço como quente.
- [ ] **Sobra do item A11 (`Math.random()` fora da simulação)**: ainda há `Math.random()` em `src/engine/TowerManager.ts` (~linha 409, decide se o número de dano do Prisma Solar aparece naquele tick; ~linha 602, jitter visual de um traço) e em `ParticleManager`/`FXManager` (posição/velocidade/cor de partículas, screen shake). São caminhos **cosméticos** — não alimentam a simulação nem o replay determinístico, então não violam a garantia de determinismo do projeto. A linha 409 é a exceção que importa: ela não decide um efeito visual solto, decide **se o feedback de dano aparece** para o jogador naquele tick — o mesmo problema de "feedback de dano inconsistente" que o item D3 da auditoria registrou e que continua sem correção.
- [ ] **Modo Co-op Multiplayer Local**: Suporte para dois jogadores na mesma tela com divisão de recursos e construção compartilhada.
- [ ] **Novas Torres Elementais**: Torre Arcana de Teleporte e Torre de Terremoto com desaceleração em área física.
- [ ] **Renderizadores Procedurais/Spritesheet Dedicados para Minions**: Expansão do padrão de renderização dedicada de `MegaBossSpriteRenderer.ts` para os demais tipos de inimigos (Standard, Runner, Tank, Shielded, Spore Sprinter, Moss Giant), com suporte a estados e animações procedimentais (caminhar, dano, habilidades ativas e derrota).
