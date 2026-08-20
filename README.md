# 🏰 Tower Defense 2D - Oh My TD (v0.8.0)

Protótipo completo, responsivo e de alta performance de um jogo estilo **Tower Defense 2D** desenvolvido com **HTML5 Canvas 2D / WebGL (Three.js)**, **TypeScript 5.x** e **Vite**.

---

## 🌟 Visão Geral

O projeto utiliza uma arquitetura híbrida de renderização (**WebGL via Three.js** para renderização de terrenos em sRGB e background 3D Diorama Low-Poly de Natureza na Tela Inicial com trilha orquestrada tema + **HTML5 Canvas 2D** para entidades e projéteis em tempo real). A engine conta com arquitetura mobile zero-scroll para Galaxy S23 (Dual Thumb Zones em Landscape), renderização procedural de biomas em memória (*Offscreen Canvas*), áudio sintetizado em tempo real via **Web Audio API**, 4 mapas com mecânicas e trilhas sonoras únicas, 3 Modos de Entrada (**Modo Campanha de 10 Ondas**, **Modo Tradicional / Desafios** & **Desafio Diário Global**), sistema de **Objetivos da Run**, **Prestígio Cósmico Soft-Infinito**, **Mecânica de Última Chance na Derrota**, especializações de torres no Nível 3 seguidas de **ranks genéricos infinitos**, chamada antecipada de onda com bônus de ouro, magias com dano proporcional escalável, sincronização online no Supabase e atalhos completos de teclado e háptico tátil.
---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* **Node.js:** Versão 18 ou superior
* **npm:** Gerenciador de pacotes

### Execução Local
```bash
# 1. Entre no diretório do projeto 2D
cd tower-defense-2d

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Execute a bateria de testes automatizados (Vitest)
npm run test

# 5. Gere a build otimizada de produção
npm run build
```

---

## 🗺️ 4 Mapas & Biomas Únicos

| Mapa | Bioma Visual | Trilha Sonora (BGM) | Mecânica Única / Twist |
| :--- | :--- | :--- | :--- |
| **Map 1: Green Valley** | Grama Esmeralda, Pinheiros e Serras Nevadas | C Maior / A Menor Bucólica (150ms) | Broto de Supercrescimento (+25% Alcance) |
| **Map 2: Death Pass** | Basalto Vulcânico e Rios de Lava Incandescente | E Menor / B Menor Vulcânica (110ms) | Rota Dupla / 2 Portais Simultâneos |
| **Map 3: Citadel Breach** | Mármore Negro Gótico e Circuitos Neon | A Menor / F# Menor Arcano-Punk (125ms) | Rota Curta de Alta Velocidade |
| **Map 4: Grave Pass** | Solo Obscuro, Tombstones e Névoa Espectral | G Menor Góico / E Frígio (135ms) | Erupção de Almas (`GRAVEYARD_SOULS` Slow AoE) |
---

## 🏰 5 Tipos de Torres, Especializações (Nível 3) & Ranks Infinitos

| Torre | Custo | Alcance | Dano | Especialização & Efeito Primário | Caminhos de Especialização (Lvl 3) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic** | 🪙 50g | 150px | 5 | ⚡ **Critical Hit (20% chance):** 2x dano crítico | *Sniper Rifle* (Dano massivo a distância) / *Gatling Gun* (Cadência ultra-rápida) |
| **Frost** | 🪙 70g | 130px | 2 | ❄️ **Aura Glacial Pulse AoE:** Dano e slow 50% em área | *Blizzard Aura* (Raio expandido) / *Permafrost* (Congelamento profundo) |
| **Solar Prism** | 🪙 100g | 140px | 6 | ☀️ **Lente Prismática:** +10%/s de foco no alvo | *Melter Beam* (Dano acumulativo rápido) / *Refractor* (Multi-laser) |
| **Cannon** | 🪙 105g | 120px | 14 | 💥 **Executor:** 2x dano em Tanks, Bosses e Black Mega Boss acima 50% HP, perfurando sempre 50% da armadura do alvo | *Cluster Bomb* (Sub-explosões AoE) / *Bunker Buster* (Perfura armaduras) |
| **Artillery** | 🪙 110g | 170px | 25 | 🔥 **Zona de Napalm:** Poça DoT no solo por 2.5s | *Inferno Mortar* (Chagas de fogo persistentes) / *Nuke Cannon* (Impacto devastador) |

O Nível 3 continua sendo o único ponto de escolha de especialização, mas deixou de ser o teto de progressão: a partir do Nível 4 a torre sobe em **ranks genéricos infinitos** (dano e HP máximo crescem compostos sem limite; alcance e raio de área crescem compostos até um teto nos ranks 25/40) com custo de upgrade que também cresce composto por rank. Detalhes e fórmulas em [`docs/GAME_MECHANICS.md`](./docs/GAME_MECHANICS.md).
---

## 👾 8 Tipos de Inimigos & Spritesheets Animados 4×5

Todos os 8 tipos de inimigos contam com animações completas em formato spritesheet matriz 4 colunas × 5 linhas (20 frames por criatura, executados centralizadamente a 140ms/frame pelo `MonsterSpriteRenderer`):

* **Standard:** Tropa equilibrada (10 HP, 10g recompensa) com animação bípede carmesim de garras e respiração.
* **Runner:** **Esquiva Ágil (25% chance)** de desviar de mísseis e tiros pesados (`DODGED!`) com animação quadrúpede veloz e rastro de vento.
* **Tank:** **Placa de Armadura (absorve 40% de dano)** com passadas sísmicas de golem e carapaça de ametista.
* **Shielded Speeder:** **Escudo de Energia Azul (22 Shield HP)** com anéis orbitais e pulso de barreira.
* **Spore Sprinter:** Libera nuvem de esporos com **+30% de velocidade** aos aliados quando fica com menos de 50% HP.
* **Moss Giant:** Regenera **~1,5% do HP máximo por segundo** enquanto adjacente à mata, com textura de musgo e vinhas.
* **BOSS:** **160 HP** (escalável), causa 5 de dano à base e **invoca 2 Corredores de reforço** ao morrer, com coroa de ouro flamejante e capa imperial.
* **BLACK MEGA BOSS:** Chefão supremo colossal com renderização integrada e máquina de estados (`IDLE`, `MOVING`, `ATTACK`, `HURT`, `DEFEAT`).

## ⚡ Poderes Supremos (*Ultimate Spells*)

* ☄️ **Meteor Strike (150g base • 30s CD):** Animação de queda do meteoro, onda de choque, partículas de brasa e cratera no solo. Dano **escala com o alvo**: `90 + 12% do HP máximo`, por inimigo no raio de impacto — continua relevante contra chefes em qualquer onda do Modo Infinito.
* ❄️ **Global Freeze (120g base • 40s CD):** Vinheta de gelo ciano e congelamento geral de todos os inimigos por 3,5s.
* **Escalonamento Dinâmico de Custo:** o custo em ouro dobra a cada conjuração na mesma partida, mas agora **decai 1 passo a cada 2 ondas sem usar aquela magia**, com teto absoluto em 64× o custo base — sem isso, quem usava a magia uma vez pagava cada vez mais pelo resto da run mesmo parando de usá-la.

---

## 🌟 Meta-Progressão, Conquistas & Cloud (Supabase)

* 🌟 **Skill Tree Permanente (`TalentManager.ts`):** Ganhe Estrelas ao jogar e evolua talentos salvos no `LocalStorage` (*Archery, Economy, Fortress, Channeling, Engineering, Precision*).
* 🏆 **Badges & Achievements (`AchievementManager.ts`):** 9 conquistas desbloqueáveis com notificações flutuantes, modal de inspeção e sincronização cloud.
* ☁️ **Perfil & Leaderboard Supabase (`DatabaseManager.ts`):** Autenticação anônima com persistência de identidade e placar de líderes global online.
* 📊 **Análises Pós-Partida (`AnalyticsManager.ts`):** Relatório com Torre MVP, total de abates, estatísticas financeiras e recorde pessoal de maior onda (`🏆 Best: Wave X`).

## 📱 UX Mobile, Motor Determinístico & Áudio

* **Mobile Tab Bar & Auto-Inspector:** Abas em celulares (`Build`, `Spells`, `Skills`, `Inspector`) com troca automática ao tocar em torres.
* **Press-and-Hold Tooltips:** Dicas contextuais de tiles acionadas via clique prolongado em mobile ou mouse.
* **Motor Físico com Timestep Fixo & Sub-stepping:** Simulação 100% determinística sem travamento ou perda de tiros em velocidades 2x e 4x.
* **Estabilidade Vite HMR & Grafo Limpo:** Grafo de módulos 100% livre de dependências circulares (verificado via `madge`), garantindo recargas ultrarrápidas no servidor de desenvolvimento sem erros de avaliação de imports.
* **Controles Independentes de Áudio:** Sliders individuais para volume da Música (`🎵 BGM`) e dos Efeitos Sonoros (`🔊 SFX`) com salvamento automático.
* **Atalhos de Teclado & Retorno Tátil:** Seleção de torre (`1`-`5`), magias (`Q`/`W`), início de onda (`Enter`) e upgrade/venda/alcance (`U`/`S`/`R`) no desktop; vibração em construir, upgrade, dano na base e chefe no mobile, com interruptor nas Configurações.
* **Alvos de Toque em 44px+ & Barra no Polegar:** Piso de toque de 44px (52px no botão de onda) e barra de construção fixa acima dos controles de tempo em retrato/mobile.
* **Chamada Antecipada de Onda:** o botão "Iniciar Onda" (e o botão de Auto no mobile) concede um bônus de ouro proporcional ao tempo poupado do contador de 5s entre ondas, em Manual e em Auto, com teto de 60g por chamada.
* **Bateria de Testes Vitest:** testes unitários e de integração cobrindo motores matemáticos, wave scaling, física de sub-stepping, banco de dados, draft roguelite e o Mapa 4 (Grave Pass).
---

## 📚 Documentação Técnica

A arquitetura detalhada e especificações do projeto estão disponíveis na pasta [`/docs`](./docs):
* 🎮 [**GAME_MECHANICS.md**](./docs/GAME_MECHANICS.md): Guia exaustivo de todas as mecânicas do jogo (torres, especializações, inimigos, biomas, climas, magias, talentos, ondas e fórmulas).
* 📐 [**ARCHITECTURE_CANVAS.md**](./docs/ARCHITECTURE_CANVAS.md): Arquitetura do motor Canvas 2D, loop de renderização e sintetização de áudio.
* 📝 [**PRD.md**](./docs/PRD.md): Documento de Requisitos do Produto e User Stories.
* 🛠️ [**TECH_SPEC.md**](./docs/TECH_SPEC.md): Especificação Técnica e Contrato de Testes.
---

## 👤 Autor & Contato

Desenvolvido por **Eliel França**:
* 👔 **LinkedIn**: [https://www.linkedin.com/in/eliel-franca/](https://www.linkedin.com/in/eliel-franca/)
* 𝕏 **X (Twitter)**: [@elielofranca](https://x.com/elielofranca)
---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [`LICENSE`](./LICENSE) para mais detalhes.
