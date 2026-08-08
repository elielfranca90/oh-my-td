# 🏰 Tower Defense 2D - Oh My TD (v0.4.0)

Protótipo completo, responsivo e de alta performance de um jogo estilo **Tower Defense 2D** desenvolvido com **HTML5 Canvas 2D / WebGL (Three.js)**, **TypeScript 5.x** e **Vite**.

---

## 🌟 Visão Geral

O projeto utiliza uma arquitetura híbrida de renderização (**WebGL via Three.js** para renderização de terrenos em sRGB e background 3D Diorama Low-Poly de Natureza na Tela Inicial + **HTML5 Canvas 2D** para entidades e projéteis em tempo real). A engine conta com renderização procedural de biomas em memória (*Offscreen Canvas*), áudio sintetizado em tempo real via **Web Audio API**, 3 mapas com mecânicas e trilhas sonoras únicas, 2 Modos de Jogo (**Modo Campanha com 20 Ondas e Vitória** & **Modo Infinito com Seleção de Desafios**), especializações de torres no Nível 3, simulação determinística com sub-stepping em 2x/4x, autenticação anônima persistente e placar global na nuvem via **Supabase**, árvore de talentos permanente, sistema de conquistas (*Badges*), relatórios de análises pós-partida e suporte a controles sensíveis ao toque.
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

## 🏰 5 Tipos de Torres & Especializações (Nível 3)

| Torre | Custo | Alcance | Dano | Especialização & Efeito Primário | Caminhos de Especialização (Lvl 3) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Basic** | 🪙 50g | 150px | 5 | ⚡ **Critical Hit (20% chance):** 2x dano crítico | *Sniper Rifle* (Dano massivo a distância) / *Gatling Gun* (Cadência ultra-rápida) |
| **Frost** | 🪙 70g | 130px | 2 | ❄️ **Aura Glacial Pulse AoE:** Dano e slow 50% em área | *Blizzard Aura* (Raio expandido) / *Permafrost* (Congelamento profundo) |
| **Solar Prism** | 🪙 80g | 140px | 6 | ☀️ **Lente Prismática:** +10%/s de foco no alvo | *Melter Beam* (Dano acumulativo rápido) / *Refractor* (Multi-laser) |
| **Cannon** | 🪙 90g | 120px | 18 | 💥 **Executor:** 2x dano em Tanks e Bosses acima 50% HP | *Cluster Bomb* (Sub-explosões AoE) / *Bunker Buster* (Perfura armaduras) |
| **Artillery** | 🪙 110g | 170px | 25 | 🔥 **Zona de Napalm:** Poça DoT no solo por 2.5s | *Inferno Mortar* (Chagas de fogo persistentes) / *Nuke Cannon* (Impacto devastador) |
---

## 👾 8 Tipos de Inimigos

* **Standard:** Tropa equilibrada (10 HP, 10g recompensa).
* **Runner:** **Esquiva Ágil (25% chance)** de desviar de mísseis e tiros pesados (`DODGED!`).
* **Tank:** **Placa de Armadura (absorve 40% de dano)** de tiros leves.
* **Shielded Speeder:** **Escudo de Energia Azul (22 Shield HP)** que absorve impacto antes da vida.
* **Spore Sprinter:** Libera uma nuvem de esporos dando **+30% de velocidade** aos aliados quando fica com menos de 50% HP.
* **Moss Giant:** Regenera **+3 HP/seg** enquanto pisar em blocos de grama.
* **BOSS:** **160 HP** (escalar no modo infinito), causa 5 de dano à base e **invoca 2 Corredores de reforço** ao morrer.
* **BLACK MEGA BOSS:** Chefão com alta resistência, gráficos de spritesheet com transparência e renderizador dedicado (`MegaBossSpriteRenderer`).
---

## ⚡ Poderes Supremos (*Ultimate Spells*)

* ☄️ **Meteor Strike (150g • 30s CD):** Animação de queda do meteoro, onda de choque, partículas de brasa e cratera no solo.
* ❄️ **Global Freeze (120g • 40s CD):** Vinheta de gelo ciano e congelamento geral de todos os inimigos por 3,5s.
* **Escalonamento Progressivo:** O custo em ouro dobra a cada uso durante a partida.

---

## 🌟 Meta-Progressão, Conquistas & Cloud (Supabase)

* 🌟 **Skill Tree Permanente (`TalentManager.ts`):** Ganhe Estrelas ao jogar e evolua talentos salvos no `LocalStorage` (*Archery, Economy, Fortress, Channeling*).
* 🏆 **Badges & Achievements (`AchievementManager.ts`):** 11 conquistas desbloqueáveis com notificações flutuantes, modal de inspeção e sincronização cloud.
* ☁️ **Perfil & Leaderboard Supabase (`DatabaseManager.ts`):** Autenticação anônima com persistência de identidade e placar de líderes global online.
* 📊 **Análises Pós-Partida (`AnalyticsManager.ts`):** Relatório com Torre MVP, total de abates, estatísticas financeiras e recorde pessoal de maior onda (`🏆 Best: Wave X`).

## 📱 UX Mobile, Motor Determinístico & Áudio

* **Mobile Tab Bar & Auto-Inspector:** Abas em celulares (`Build`, `Spells`, `Skills`, `Inspector`) com troca automática ao tocar em torres.
* **Press-and-Hold Tooltips:** Dicas contextuais de tiles acionadas via clique prolongado em mobile ou mouse.
* **Motor Físico com Timestep Fixo & Sub-stepping:** Simulação 100% determinística sem travamento ou perda de tiros em velocidades 2x e 4x.
* **Controles Independentes de Áudio:** Sliders individuais para volume da Música (`🎵 BGM`) e dos Efeitos Sonoros (`🔊 SFX`) com salvamento automático.
* **Bateria de Testes Vitest:** 163 testes unitários e de integração divididos em 27 suítes cobrindo motores matemáticos, wave scaling, física de sub-stepping, banco de dados, draft roguelite e o novo Mapa 4 (Grave Pass).
---

## 📚 Documentação Técnica

A arquitetura detalhada e especificações do projeto estão disponíveis na pasta [`/docs`](./docs):
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
