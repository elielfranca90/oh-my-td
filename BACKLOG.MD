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
## 🟢 Concluído (Sprint de Correções de Balanceamento, Determinismo e UX)

- [x] **Restrição do Draft Roguelite Exclusivamente ao Modo Morte Certa**: O modal de draft de cartas e os módulos roguelite agora são exclusivos do modo Morte Certa (`challengeMode === 'MORTE_CERTA'`). Nos modos Normal e Hardcore o TD clássico segue sem interrupções.
- [x] **Determinismo no Sorteio de Módulos Roguelite**: O embaralhamento e sorteio das 3 cartas do draft agora utiliza o gerador pseudo-aleatório semeado (`Rng`) da partida, eliminando o uso de `Math.random()`.
- [x] **Feedback Visual Consistente no Prisma Solar (D3 / A11)**: Removida a aleatoriedade `Math.random() < 0.3` em `TowerManager.ts`. O texto de dano agora é emitido consistentemente sempre que dano é causado, garantindo feedback visual fidedigno e determinismo pleno.
- [x] **Escala Proporcional da Regeneração do `MOSS_GIANT` (C8)**: Ajustada a regeneração do Moss Giant de `+1 HP` fixo a cada 20 frames para percentual (~1,5% do HP máximo por segundo quando adjacente à vegetação, mínimo de 1 HP), mantendo a identidade mecânica do inimigo em ondas avançadas do modo Infinito.
- [x] **Persistência de Preferências do Jogador (D5)**: A velocidade de simulação (1x, 2x, 4x) e o estado do botão Auto-Wave agora são persistidos no `localStorage` (`oh_my_td_game_speed` e `oh_my_td_auto_mode`) e restaurados entre partidas.
- [x] **Validação e Vencibilidade da Campanha de 10 Ondas**: Comprovado empiricamente e travado em teste automatizado (`tests/balance.test.ts`) que a campanha de 10 ondas é 100% vencível a partir dos 70g iniciais (6/6 seeds sobrevivem à onda 10 com 0 falhas de compra e ~11 upgrades aplicados quando o ouro é reinvestido).

## 🟢 Concluído (Sprint P1 — Devolver Decisões ao Jogador, `docs/GAME_DESIGN_REVIEW.md` Parte F itens 10-14)

- [x] **Níveis Infinitos de Torre**: Nível 3 continua sendo o teto de especialização; a partir do Nível 4 a torre sobe em ranks genéricos e infinitos (dano/HP máximo crescem compostos sem limite, alcance/raio de área crescem compostos até um teto nos ranks 25/40), com custo de upgrade que também cresce composto por rank.
- [x] **Chamada Antecipada de Onda com Bônus de Ouro**: o contador de 5s entre ondas agora decresce em Manual e em Auto (antes só em Auto); chamar a próxima onda antes de zerar concede ouro proporcional ao tempo poupado, com teto de 60g.
- [x] **Curva de Ouro do Modo Infinito Recalibrada**: expoente efetivo de recompensa sobe para ~0,75 só a partir da onda 11 (composição sobre o expoente `0.4` que continua cravado em `Enemy.ts`), com corte suave substituindo o corte fixo de 25% antigo.
- [x] **Densidade de Onda da Campanha + Gatilho de Tensão**: as 10 ondas da campanha somam 144 inimigos (eram 64); limiar de tensão de áudio/vinheta recalibrado de `enemyCount > 20` para `enemyCount > 8`. Corte de ouro específico da campanha recalibrado (`×0.60` a partir da onda 2) para compensar a densidade maior.
- [x] **Magias com Dano Escalável**: Meteoro passa de dano fixo (90) para `90 + 12% do HP máximo do alvo`, por inimigo no impacto. Custo de Meteoro e Congelamento Global continua dobrando por uso, mas agora decai 1 passo a cada 2 ondas sem uso, com teto em 64× o custo base.

## 🟢 Concluído (v0.5.1 — Correções Críticas de Fim de Jogo & Bônus de Onda)

- [x] **Correção da Estrutura DOM do Modal de Fim de Jogo**: Fechamento adequado de tag `<div>` no modal de mecânicas em `UIManager.ts`, evitando o aninhamento indevido de `#modal-overlay` dentro de `#mechanics-modal-overlay` que mantinha as telas de Vitória e Game Over invisíveis.
- [x] **Trava de Bônus de Chamada Antecipada na Onda 1**: Adicionada verificação `if (this.currentWaveIndex < 0) return 0;` em `WaveManager.ts`, bloqueando recompensa de ouro indevida antes do início da partida.
- [x] **Testes de Regressão de Visibilidade e Contratos**: Adicionados testes no Vitest e validação com navegador headless cobrindo a hierarquia de contêineres e a exibição de modais nos modos Normal, Campanha e Morte Certa.
## 🟡 Próximas Funcionalidades (Backlog)

- [ ] **P2 — Retenção entre sessões** (`docs/GAME_DESIGN_REVIEW.md` Parte F, itens 15-18, pendente por completo): onboarding de ~40s guiando a primeira torre/onda/especialização; objetivos de run + Desafio Diário visível na UI (a infraestrutura de `ReplayEngine`/Daily Seed já existe, só falta porta de entrada); desbloqueios e prestígio na meta-progressão em vez de uma árvore de talentos que satura em 2-3 partidas; "Última Chance" na derrota (revivência única em troca do ouro acumulado). Inclui também as magias com recurso próprio ("Fúria") adiadas do P1.
- [ ] **Grade Espacial (Spatial Hash) para o Laço de Mira das Torres** (item E8 da auditoria): indexação por grade de células para reduzir a quantidade bruta de comparações torre×inimigo se o profiling em dispositivos modestos apontar necessidade.
- [ ] **Telegrafia e Leitura de Campo (D5 / C7)**: Telegrafia de rota no portal de spawn, realce de cobertura de caminho no hover e botão "Reparar Tudo".
- [ ] **Modo Co-op Multiplayer Local**: Suporte para dois jogadores na mesma tela com divisão de recursos e construção compartilhada.
- [ ] **Novas Torres Elementais**: Torre Arcana de Teleporte e Torre de Terremoto com desaceleração em área física.
- [ ] **Renderizadores Procedurais/Spritesheet Dedicados para Minions**: Expansão do padrão de renderização dedicada de `MegaBossSpriteRenderer.ts` para os demais tipos de inimigos (Standard, Runner, Tank, Shielded, Spore Sprinter, Moss Giant), com suporte a estados e animações procedimentais (caminhar, dano, habilidades ativas e derrota).
