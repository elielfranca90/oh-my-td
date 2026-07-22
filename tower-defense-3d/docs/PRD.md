# 📋 Product Requirement Document (PRD)

---

## 1. Visão Geral
O **Tower Defense 3D** é um jogo de estratégia em tempo real executado nativamente no navegador. O objetivo deste MVP é validar as mecânicas fundamentais do gênero: construção espacial em grade, cálculo de alcance, travamento de alvos automáticos, combate por projéteis e movimentação de inimigos por rotas predefinidas.

---

## 2. Objetivos Principais
* Validar a jogabilidade básica de defesa de rotas.
* Manter a taxa de quadros estável em 60 FPS em navegadores desktop modernos.
* Estabelecer um código base escalável para futuras adições de complexidade.

---

## 3. Requisitos Funcionais

| Código | Módulo | Descrição do Comportamento |
| :--- | :--- | :--- |
| **RF01** | Renderização | Renderizar mapa em grade 10x10 com câmera isométrica interativa. |
| **RF02** | Mapa (Caminho) | Demarcar a rota dos inimigos com blocos na cor cinza escuro. |
| **RF03** | Mapa (Terreno) | Demarcar as zonas de construção válidas com blocos na cor verde. |
| **RF04** | Construção | Permitir o posicionamento de torres ao clicar em blocos verdes vazios. |
| **RF05** | Restrição | Bloquear a construção de torres sobre o caminho ou sobre outras torres. |
| **RF06** | Inimigos | Gerar inimigos automaticamente e movê-los pelos waypoints da rota. |
| **RF07** | Combate | Torres devem disparar projéteis contra o primeiro inimigo dentro do alcance. |
| **RF08** | Destruição | Inimigos atingidos por projéteis perdem vida e são removidos ao chegar a 0. |

---

## 4. Requisitos Não-Funcionais
* Exigência de 60 FPS com mais de 50 entidades renderizadas simultaneamente.
* Suporte multiplataforma para Chrome, Firefox, Safari e Edge.
* Limpeza estrita de memória (execução de `dispose()` em geometrias) ao remover entidades.

---

## 5. Fora do Escopo (MVP)
* Sistema de economia (moedas, custo de torres e recompensa por abates).
* Variações de torres (dano em área, lentidão, antiaérea).
* Variações de inimigos (rápidos, tanques, chefes).
* Interface de Usuário (HUD), menus e efeitos sonoros.
