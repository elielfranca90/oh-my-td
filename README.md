# 🏰 Tower Defense 2D - Oh My TD

Protótipo evoluído e completo de jogo estilo **Tower Defense 2D** desenvolvido com **HTML5 Canvas 2D**, **TypeScript 5.x** e **Vite**.

---

## 🌟 Visão Geral

O projeto iniciou com um MVP em Three.js 3D e evoluiu para uma engine nativa **Canvas 2D top-down**. A abordagem 2D proporcionou alta performance (60 FPS constantes), renderização ultra-leve (bundle de apenas ~30 kB), precisão matemática perfeita em cliques no grid e zero distorção de câmera.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
* **Node.js:** Versão 18 ou superior
* **npm:** Gerenciador de pacotes

### Passos de Inicialização
```bash
# 1. Entre no diretório do jogo 2D
cd tower-defense-2d

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Para gerar a build otimizada de produção
npm run build
```

---

## 🎮 Mecânicas & Recursos

### 🏰 4 Tipos de Torres
| Torre | Custo | Alcance | Dano | Efeito Especial |
| :--- | :--- | :--- | :--- | :--- |
| **Basic** | 🪙 50g | 150px | 5 | Cadência rápida de disparo |
| **Frost** | 🪙 70g | 130px | 2 | Desacelera inimigos em 50% por 2s |
| **Cannon** | 🪙 90g | 120px | 18 | Dano elevado contra alvos individuais |
| **Artillery** | 🪙 110g | 170px | 25 | Dano em Área (AoE) num raio de 50px |

### 🎯 Táticas de Disparo (*Targeting Tactics*)
Cada torre pode ter sua prioridade de alvo ajustada dinamicamente:
* **FIRST:** Foca no inimigo mais adiantado na rota.
* **STRONGEST:** Foca no inimigo com maior vida atual.
* **WEAKEST:** Foca no inimigo com menor vida atual.
* **LAST:** Foca no inimigo mais recente a entrar no mapa.

### 👾 4 Tipos de Inimigos
* **Standard:** Equilibrado (10 HP, 10g recompensa).
* **Runner:** Muito rápido (6 HP, 8g recompensa).
* **Tank:** Lento e resistente (35 HP, 25g recompensa, 2 dano à base).
* **BOSS:** Gigante e devastador (160 HP, 100g recompensa, 5 dano à base).

### ⚡ Poderes Supremos (*Ultimate Spells*)
* ☄️ **Meteor Strike (50g • 15s CD):** Invoca um meteoro que causa 90 de dano em área em qualquer ponto do mapa.
* ❄️ **Global Freeze (40g • 20s CD):** Congela todos os inimigos da tela por 3,5 segundos.

### ⚙️ Modos de Jogo & Opções
* **⚡ Auto Waves:** Inicia ondas automaticamente com cronômetro regressivo de 5 segundos.
* **♾️ Endless Mode:** Permite continuar o jogo indefinidamente após a Onda 10 com geração procedural de ondas e dificuldade escalar (`Wave: X/♾️`).
* **⏩ Controle de Velocidade:** Alterne a velocidade do jogo em `1x`, `2x` ou `4x`.
* **⏸️ Sistema de Pause:** Pause a partida pelo botão `⏸️` ou pelas teclas `ESPAÇO` / `P`.
* **📱 Interface Responsiva Zero-Scroll:** Layout 100% ajustado à altura da tela (`100vh`) sem barra de rolagem.

---

## 📚 Índice de Documentação

* [`/docs/PRD.md`](./docs/PRD.md): Documento de Requisitos do Produto (PRD).
* [`/docs/TECH_SPEC.md`](./docs/TECH_SPEC.md): Especificações Técnicas e Algoritmos.
* [`/docs/ARCHITECTURE_CANVAS.md`](./docs/ARCHITECTURE_CANVAS.md): Diagrama de Arquitetura.
