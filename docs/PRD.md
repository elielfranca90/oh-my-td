# 📋 Product Requirement Document (PRD) - Tower Defense 2D

---

## 1. Visão Geral
O **Tower Defense 2D (Oh My TD)** é um jogo de estratégia em tempo real executado nativamente no navegador utilizando a **HTML5 Canvas 2D API** e **Three.js** para a Tela Inicial com Diorama 3D Low-Poly de Natureza. O objetivo deste projeto é entregar uma experiência completa de defesa de rotas, combinando construção espacial em grade, 3 biomas distintos com trilhas sonoras dedicadas, táticas de disparo, especialização de upgrades no nível 3, poderes supremos, modos de jogo (Campanha e Desafios Infinitos), simulação determinística com sub-stepping, árvore de talentos permanente, autenticação e sincronização online de conquistas e placar via **Supabase**.

---

## 2. Objetivos Principais
* Oferecer jogabilidade fluida mantendo 60 FPS estáveis sem travamentos ou scroll em qualquer resolução (`100vh` / `100dvh`).
* Garantir 100% de precisão de movimentação de inimigos sobre as rotas de 14x10 tiles dos 3 mapas.
* Manter um código-fonte modular em TypeScript desacoplando renderização, simulação determinística com RNG semeado, áudio sintetizado, persistência na nuvem (Supabase) e interface DOM.
* Garantir a integridade do jogo com uma suíte abrangente de testes automatizados (Vitest).
---

## 3. Requisitos Funcionais

| Código | Módulo | Descrição do Comportamento |
| :--- | :--- | :--- |
| **RF01** | Renderização | Renderizar grade de 14x10 tiles com 3 biomas visuais únicos (*Green Valley, Death Pass Lava, Citadel Neon*). |
| **RF02** | Rota & Spawns | Suportar rotas em 'S', rotas curtas e rotas duplas (*Dual Spawn* de 2 portais simultâneos). |
| **RF03** | Terreno & Obstáculos | Renderizar obstáculos naturais (*Montanhas e Florestas*) onde a construção é fisicamente bloqueada. |
| **RF04** | Construção | Permitir posicionar 5 tipos de torres (`Basic`, `Frost`, `Solar Prism`, `Cannon`, `Artillery`) no grid. |
| **RF05** | Restrição de Economia | Impedir a construção ou upgrade de torres caso o jogador não possua ouro suficiente. |
| **RF06** | Inimigos Especializados | Gerar 7 variações de tropas (`Standard`, `Runner`, `Tank`, `Shielded`, `Spore Sprinter`, `Moss Giant`, `Boss`). |
| **RF07** | Táticas de Disparo | Permitir alternar a estratégia de cada torre entre `FIRST`, `STRONGEST`, `WEAKEST` e `LAST`. |
| **RF08** | Efeitos de Status & DoT | Aplicar desaceleração (Frost), dano em área AoE (Artillery Napalm DoT) e foco acumulativo (Solar Prism). |
| **RF09** | Poderes Supremos | Permitir invocar `Meteor Strike` (dano AoE via clique) e `Global Freeze` (congelamento geral) com custo progressivo. |
| **RF10** | Áudio Dinâmico em 2 Faixas | Sintetizar 3 trilhas BGM únicas para os mapas + trilha pesada e sinistra de Boss via Web Audio API. |
| **RF11** | Modo Auto & Infinito | Suportar temporizador de 5s entre ondas e modo infinito com escalonamento de HP $+12\%/\text{onda}$. |
| **RF12** | Árvore de Talentos | Permitir gastar Estrelas ganhas em partidas para evoluir bônus salvos no `LocalStorage`. |
| **RF13** | Badges & Achievements | Monitorar 7 conquistas desbloqueáveis com notificações flutuantes e modal de badges. |
| **RF14** | Analytics Pós-Partida | Exibir relatório final com Torre MVP, abates, finanças e High Score no `LocalStorage`. |
| **RF15** | UX Mobile Responsivo | Barra de abas mobile com auto-inspector no toque da torre e controles duplos de volume BGM/SFX. |
| **RF16** | Tela Inicial & Modos de Jogo | Tela Inicial com Diorama 3D Low-Poly de Natureza (Three.js) com ilha flutuante, pinheiros, sol dourado com bloom e vaga-lumes, permitindo escolher entre Modo Campanha (20 ondas com Boss final e modal de vitória) e Modo Infinito com Seleção de Desafios (`NORMAL`, `HARDCORE`, `MORTE_CERTA`). |
| **RF17** | Especializações de Torres | Permitir ramificação e escolha de caminhos de especialização no Nível 3 para todas as 5 torres com efeitos únicos. |
| **RF18** | Perfil & Leaderboard Supabase | Autenticação anônima com persistência de identidade, sincronização de conquistas na nuvem e placar global de High Scores via Supabase. |
| **RF19** | Motor Determinístico & Sub-stepping | Simulação com timestep fixo e sub-stepping para execução fluida e física precisa em velocidades 2x e 4x independente do refresh rate da tela. |
| **RF20** | Tooltip Press-and-Hold | Exibição contextual de dicas de terreno/tile via press-and-hold (toque longo em telas sensíveis ao toque e mouse). |
| **RF21** | Mega Boss & Renderização Customizada | Suporte ao chefão lendário `BLACK_MEGA_BOSS` com spritesheet com transparência e renderizador procedural dedicado (`MegaBossSpriteRenderer`). |
| **RF22** | Renderização WebGL sRGB | Renderizar os tiles dos mapas via `ThreeRenderer` usando `THREE.CanvasTexture` configurados com `THREE.SRGBColorSpace`, garantindo fidelidade de cores vivas e vibrantes sem desbotamento por dupla correção de gama. |

---

## 4. Requisitos Não-Funcionais
* **Performance:** Manter 60 FPS estáveis mesmo com 50+ entidades simultâneas em velocidade 4x com sub-stepping.
* **Tamanho do Bundle:** Build de produção otimizado com suporte a Three.js para o background 3D low-poly de natureza.
* **Layout Zero-Scroll:** Garantir que 100% dos elementos da interface caibam na tela em `100vh` e `100dvh` com suporte a *Safe Area Insets*.
* **Testes Automatizados:** Suíte de 140 testes unitários e de integração divididos em 22 arquivos de teste (Vitest) passando com 100% de sucesso.
