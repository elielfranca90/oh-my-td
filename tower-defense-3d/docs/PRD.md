# 📋 Product Requirement Document (PRD) - Tower Defense 2D

---

## 1. Visão Geral
O **Tower Defense 2D (Oh My TD)** é um jogo de estratégia em tempo real executado nativamente no navegador utilizando a **HTML5 Canvas 2D API**. O objetivo deste projeto é entregar uma experiência completa de defesa de rotas, combinando construção espacial em grade, táticas de disparo, poderes supremos, modos de automação e ondas procedurais infinitas.

---

## 2. Objetivos Principais
* Oferecer jogabilidade fluida mantendo 60 FPS estáveis sem travamentos ou scroll.
* Garantir 100% de precisão de movimentação de inimigos sobre a rota em 'S' de 14x10 tiles.
* Manter um código-fonte modular em TypeScript desacoplando renderização, simulação e interface (DOM).

---

## 3. Requisitos Funcionais

| Código | Módulo | Descrição do Comportamento |
| :--- | :--- | :--- |
| **RF01** | Renderização | Renderizar grade de 14x10 tiles em Canvas 2D responsivo ajustado a `100vh`. |
| **RF02** | Rota em 'S' | Demarcar o caminho dos inimigos com blocos cinza escuro (`#424242`). |
| **RF03** | Terreno Construível | Demarcar zonas de construção válidas com blocos verdes (`#2e7d32`). |
| **RF04** | Construção | Permitir posicionar 4 tipos de torres (`Basic`, `Frost`, `Cannon`, `Artillery`) ao clicar em blocos verdes. |
| **RF05** | Restrição de Economia | Impedir a construção ou upgrade de torres caso o jogador não possua ouro suficiente. |
| **RF06** | Inimigos | Gerar 4 variações de tropas (`Standard`, `Runner`, `Tank`, `Boss`) e movê-las com precisão milimétrica pelos waypoints. |
| **RF07** | Táticas de Disparo | Permitir alternar a estratégia de cada torre entre `FIRST`, `STRONGEST`, `WEAKEST` e `LAST`. |
| **RF08** | Efeitos de Status | Aplicar desaceleração (Frost) e dano em área AoE (Artillery) em alvos afetados. |
| **RF09** | Poderes Supremos | Permitir invocar `Meteor Strike` (dano AoE via clique) e `Global Freeze` (congelamento geral). |
| **RF10** | Modo Auto Wave | Automatizar o início de ondas com um cronômetro regressivo de 5 segundos. |
| **RF11** | Modo Infinito | Permitir continuar a partida após a Onda 10 com geração procedural infinita (`Wave: X/♾️`). |
| **RF12** | Controle de Tempo & Pause | Permitir acelerar o jogo (1x, 2x, 4x) e pausar/retomar via botão HUD ou teclas `ESPAÇO` / `P`. |
| **RF13** | Inspector & Upgrade | Permitir inspecionar, evoluir até o Nível 3 e vender torres recuperando 70% do ouro investido. |

---

## 4. Requisitos Não-Funcionais
* **Performance:** Manter 60 FPS estáveis mesmo com 50+ entidades simultâneas em velocidade 4x.
* **Tamanho do Bundle:** Build de produção inferior a 40 kB minificado.
* **Layout Zero-Scroll:** Garantir que 100% dos elementos da interface caibam na tela sem rolagem vertical.
* **Clean Code:** Ausência estrita de gambiarras e desacoplamento total entre simulação matemática e renderização.
