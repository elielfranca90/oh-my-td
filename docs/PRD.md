# 📋 Product Requirement Document (PRD) - Tower Defense 2D

---

## 1. Visão Geral
O **Tower Defense 2D (Oh My TD)** é um jogo de estratégia em tempo real executado nativamente no navegador utilizando a **HTML5 Canvas 2D API**. O objetivo deste projeto é entregar uma experiência completa de defesa de rotas, combinando construção espacial em grade, 3 biomas distintos com trilhas sonoras dedicadas, táticas de disparo, poderes supremos, modos de automação, árvore de talentos permanente e ondas procedurais infinitas.

---

## 2. Objetivos Principais
* Oferecer jogabilidade fluida mantendo 60 FPS estáveis sem travamentos ou scroll em qualquer resolução.
* Garantir 100% de precisão de movimentação de inimigos sobre as rotas de 14x10 tiles dos 3 mapas.
* Manter um código-fonte modular em TypeScript desacoplando renderização, simulação, áudio sintetizado e interface DOM.
* Garantir integridade de código via testes automatizados (Vitest).

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

---

## 4. Requisitos Não-Funcionais
* **Performance:** Manter 60 FPS estáveis mesmo com 50+ entidades simultâneas em velocidade 4x.
* **Tamanho do Bundle:** Build de produção inferior a 90 kB minificado com todos os recursos.
* **Layout Zero-Scroll:** Garantir que 100% dos elementos da interface caibam na tela em `100vh`.
* **Testes Automatizados:** Suíte de 15+ testes unitários e de integração (Vitest) passando sem falhas.
