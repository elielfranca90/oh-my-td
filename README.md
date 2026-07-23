# 🏰 Tower Defense 2D - Oh My TD

Protótipo completo, responsivo e de alta performance de um jogo estilo **Tower Defense 2D** desenvolvido com **HTML5 Canvas 2D**, **TypeScript 5.x** e **Vite**.

---

## 🌟 Visão Geral

O projeto evoluiu de um MVP em Three.js para uma engine nativa **HTML5 Canvas 2D top-down**. A engine conta com renderização procedural de biomas em memória (*Offscreen Canvas*), áudio sintetizado em tempo real via **Web Audio API**, 3 mapas com mecânicas e trilhas sonoras únicas, árvore de talentos permanente, sistema de conquistas (*Badges*), relatórios de análises pós-partida, controles por toque mobile e layout **zero-scroll** em `100vh` e `100dvh` com suporte a *Safe Area Insets* (Galaxy S23, A51/A55, iPhones).

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

## 🗺️ 3 Mapas & Biomas Únicos

| Mapa | Bioma Visual | Trilha Sonora (BGM) | Mecânica Única / Twist |
| :--- | :--- | :--- | :--- |
| **Map 1: Green Valley** | Grama Esmeralda, Pinheiros e Serras Nevadas | C Maior / A Menor Bucólica (150ms) | Broto de Supercrescimento (+25% Alcance) |
| **Map 2: Death Pass** | Basalto Vulcânico e Rios de Lava Incandescente | E Menor / B Menor Vulcânica (110ms) | Rota Dupla / 2 Portais Simultâneos |
| **Map 3: Citadel Breach** | Mármore Negro Gótico e Circuitos Neon | A Menor / F# Menor Arcano-Punk (125ms) | Rota Curta de Alta Velocidade |

---

## 🏰 5 Tipos de Torres Especializadas

| Torre | Custo | Alcance | Dano | Especialização & Efeito |
| :--- | :--- | :--- | :--- | :--- |
| **Basic** | 🪙 50g | 150px | 5 | ⚡ **Critical Hit (20% chance):** Causa 2x de dano crítico |
| **Frost** | 🪙 70g | 130px | 2 | ❄️ **Aura Glacial Pulse AoE:** Causa dano e desacelera em 50% todos os alvos no raio |
| **Solar Prism** | 🪙 80g | 140px | 6 | ☀️ **Lente Prismática:** Ganha +10% de dano por segundo focado no mesmo alvo |
| **Cannon** | 🪙 90g | 120px | 18 | 💥 **Executor:** Causa 2x de dano (+100%) em Tanks e Bosses acima de 50% HP |
| **Artillery** | 🪙 110g | 170px | 25 | 🔥 **Zona de Napalm:** Explosão em área deixa poça de fogo DoT no chão por 2.5s |

---

## 👾 7 Tipos de Inimigos

* **Standard:** Tropa equilibrada (10 HP, 10g recompensa).
* **Runner:** **Esquiva Ágil (25% chance)** de desviar de mísseis e tiros pesados (`DODGED!`).
* **Tank:** **Placa de Armadura (absorve 40% de dano)** de tiros leves.
* **Shielded Speeder:** **Escudo de Energia Azul (22 Shield HP)** que absorve impacto antes da vida.
* **Spore Sprinter:** Libera uma nuvem de esporos dando **+30% de velocidade** aos aliados quando fica com menos de 50% HP.
* **Moss Giant:** Regenera **+3 HP/seg** enquanto pisar em blocos de grama.
* **BOSS:** **160 HP** (escalar no modo infinito), causa 5 de dano à base e **invoca 2 Corredores de reforço** ao morrer.

---

## ⚡ Poderes Supremos (*Ultimate Spells*)

* ☄️ **Meteor Strike (150g • 30s CD):** Animação de queda do meteoro, onda de choque, partículas de brasa e cratera no solo.
* ❄️ **Global Freeze (120g • 40s CD):** Vinheta de gelo ciano e congelamento geral de todos os inimigos por 3,5s.
* **Escalonamento Progressivo:** O custo em ouro dobra a cada uso durante a partida.

---

## 🌟 Meta-Progressão, Conquistas & Analytics

* 🌟 **Skill Tree Permanete (`TalentManager.ts`):** Ganhe Estrelas ao jogar e evolua talentos salvos no `LocalStorage` (*Archery, Economy, Fortress, Channeling*).
* 🏆 **Badges & Achievements (`AchievementManager.ts`):** 7 conquistas desbloqueáveis com notificações flutuantes e modal de inspeção.
* 📊 **Análises Pós-Partida (`AnalyticsManager.ts`):** Relatório com Torre MVP, total de abates, estatísticas financeiras e recorde pessoal de maior onda (`🏆 Best: Wave X`).

---

## 📱 UX Mobile & Áudio Independente

* **Mobile Tab Bar & Auto-Inspector:** Abas em celulares (`Build`, `Spells`, `Skills`, `Inspector`) com troca automática ao tocar em torres.
* **Controles Independentes de Áudio:** Sliders individuais para volume da Música (`🎵 BGM`) e dos Efeitos Sonoros (`🔊 SFX`) com salvamento automático.
* **Bateria de Testes Vitest:** 15 testes unitários e de integração cobrindo motores matemáticos, wave scaling e física do grid.
---

## 📚 Documentação Técnica

A arquitetura detalhada e especificações do projeto estão disponíveis na pasta [`/docs`](./docs):
+- 📐 [**ARCHITECTURE_CANVAS.md**](./docs/ARCHITECTURE_CANVAS.md): Arquitetura do motor Canvas 2D, loop de renderização e sintetização de áudio.
- 📝 [**PRD.md**](./docs/PRD.md): Documento de Requisitos do Produto e User Stories.
- 🛠️ [**TECH_SPEC.md**](./docs/TECH_SPEC.md): Especificação Técnica e Contrato de Testes.
---

## 👤 Autor & Contato

Desenvolvido por **Eliel França**:
* 👔 **LinkedIn**: [https://www.linkedin.com/in/eliel-franca/](https://www.linkedin.com/in/eliel-franca/)
* 𝕏 **X (Twitter)**: [@elielofranca](https://x.com/elielofranca)
