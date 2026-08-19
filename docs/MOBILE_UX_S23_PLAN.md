# 📱 Arquitetura UX/UI Mobile: Galaxy S23 (Zero-Scroll Experience)

**Objetivo:** Adaptar *Oh My TD* para que funcione de forma orgânica, fluida e 100% visível na tela de um Samsung Galaxy S23, sem qualquer necessidade de rolagem vertical ou horizontal, garantindo ergonomia de toque e alvos precisos.

---

## 1. 🔍 Diagnóstico do Problema Atual (A Ilusão do Portrait)

O Galaxy S23 possui uma resolução CSS típica de **360x780 px** (em retrato/portrait) a **393x852 px** (dependendo da densidade e atualizações do sistema), mantendo uma proporção de tela muito alta (`~19.5:9`). 

Atualmente, o jogo Oh My TD tenta ser responsivo empilhando a interface verticalmente em retrato: HUD no topo, mapa no meio, e controles (Action Toolbar) na base. 

**O gargalo estrutural:**
- O mapa de batalha possui `840x600 px` (aspect ratio cravado de **1.4:1** - formato paisagem).
- Quando o motor (`Game.ts`) tenta encaixar 1.4:1 numa largura de `360px` usando `object-fit: contain`, a altura renderizada do mapa cai para míseros **~257px**.
- **Impacto na Jogabilidade:** O mapa ocupa apenas 33% da altura da tela, deixando enormes blocos vazios (letterboxing). Os *tiles* lógicos, essenciais para construção (grade 21x15), passam a ter áreas de clique ridículas de **~17x18px**. A Apple HIG e o Material Design exigem mínimos de `44px` a `48px` para toque. Um tile de 18px gera cliques errados consistentes. O jogo, estruturalmente, é injogável na vertical sem lupa, o que rompe a regra de "Zero-Scroll".

Além disso, tentar jogar com o S23 "deitado" (Landscape) sob a arquitetura atual apenas "estica" as barras horizontais no topo e base. Numa tela de `393px` de altura física, as barras superior/inferior somadas roubam ~150px, esmagando o canvas central para ~243px de altura e criando enormes bordas laterais inúteis.

---

## 2. 🗺️ Mapa de Layout Ideal (Arquitetura S23 Paisagem Nativa)

A solução **única e absoluta** para preencher a tela orgânica e sem overflow no S23, sem reescrever o código fundamental da câmera (`Game.ts`), é forçar e abraçar nativamente o layout em **Landscape (Orientação Paisagem)**.

Ao virar o Galaxy S23, ganhamos um viewport de **852x393 px**. 
Dimensionando o mapa para bater na altura (393px), ele consumirá **550px** de largura (1.4:1). Sobram perfeitos **~300px horizontais** que se tornam as duas Zonas de Polegar (Thumb Zones) laterais da UI.

### 2.1 Especificação de Zonas (Zero-Scroll Flexbox)

O container root `.app-layout` deve ser mudado via CSS em Landscape para `flex-direction: row`.

| Componente | Posicionamento & Tamanho Recomendado (Landscape S23) | Comportamento CSS Zero-Scroll |
| :--- | :--- | :--- |
| **Painel Esquerdo (Info)** | `width: 150px; height: 100dvh; flex-shrink: 0;` | Ancora no polegar esquerdo. Contém: Ouro, Vida, Velocidade (1x/2x/4x/Auto), Botão de Menu. Aplica `padding-left: env(safe-area-inset-left)`. |
| **Game Canvas (Centro)** | `flex: 1; height: 100dvh; display: flex; align-items: center; justify-content: center;` | O canvas flutua centralizado. Usando `object-fit: contain`, os tiles crescem para **~26x26px** (melhoria ergonômica considerável) e as proporções do level design são respeitadas. |
| **Painel Direito (Deck)** | `width: 150px; height: 100dvh; flex-shrink: 0;` | Ancora no polegar direito. Contém: Torre Cards empilhadas verticalmente e Botão "Iniciar Onda". Aplica `padding-right: env(safe-area-inset-right)`. |

### 2.2 Controle Estrito de Altura (100dvh)
Para evitar as flutuações das barras de navegação nativas do Chrome/Samsung Internet que causam overflow, a raiz deve manter:
```css
html, body, .app-layout {
  height: 100dvh; /* Garante tamanho dinâmico sem invadir a aba de endereços mobile */
  width: 100vw;
  overflow: hidden; /* Corta o scroll da página nativamente */
  position: fixed; /* Previne "pull-to-refresh" arrasto nativo da web mobile */
}
```

### 2.3 Tratando a Situação Portrait (Se o usuário se recusar a virar)
Se o aparelho estiver na vertical (Portrait), deve-se adotar a "Cortina de Orientação".
Como o nível lógico de mecânica e tamanho do *grid* foi desenhado para Landscape, forçar UI responsiva vertical destrói a precisão. 
A UX deve ocultar o `#game-area` temporariamente via CSS Media Query (`@media (orientation: portrait)`) e exibir uma tela amigável: *"Por favor, rotacione seu Galaxy S23 para jogar de forma confortável."*

---

## 3. ⚙️ Modais e Overflow Interno

O único lugar onde o Scroll *deve* existir é dentro de modais de texto muito densos (ex: Changelog e Árvore de Talentos).

Para respeitar a ergonomia:
1. Modais como `mechanics-modal-card` usam hoje `max-height: 80vh`. Devem ser atualizados para `80dvh`.
2. A estrutura do modal deve garantir que o Cabeçalho (com botão fechar) e o Rodapé permaneçam em `position: sticky` (ou flex fixo), **sendo que apenas a lista interna role (`overflow-y: auto`)**.
3. Ampliar a área de clique para o ícone de fechar (✖) nos modais para `44x44px`, com margens de alívio.
4. Adicionar um overlay click (tocar fora da janela) que fecha os modais automaticamente, dispensando a necessidade de buscar um pequeno 'X' no canto superior (Padrão de UX mobile orgânica).

---

## 4. 🚀 Plano de Execução (Próximas Sprints)

1. **Sprint 1: Container e Orientação**
   - Atualizar `index.html` CSS: criar block container para `@media (orientation: portrait) and (max-width: 600px)` ocultando a HUD e exibindo tela "Gire o Aparelho".
   - Modificar `.app-layout` no CSS para `flex-direction: row` quando em *Landscape*.
   
2. **Sprint 2: Realocação das Zonas de Polegar (Sidebars)**
   - Extrair os botões de controle (`#time-controls`) e HUD/Stats (`#hud-stats-bar`) que habitam os layout parts 1, 2 e 4.
   - Refazer HTML/CSS para agrupá-los em `.left-panel` (Stats, Speed) e `.right-panel` (Tower Deck, Start Wave).
   - Aplicar funções `env(safe-area-inset-*)` aos painéis para respeitar cantos curvos e "furinhos" de câmera da família Galaxy.

3. **Sprint 3: Modais e Safe Touch**
   - Revisar toda interface de Modais em `UIManager.ts`. Adicionar listener global para clicar em `.modal-overlay` (fora da área `.modal-card`) e executar fechamento natural.
   - Atualizar a altura limitadora das `.modal-card` para `max-height: 85dvh; display: flex; flex-direction: column;` mantendo `flex-shrink: 0` nos headers e botão fechar.

### ✅ Conclusão

Essa arquitetura elimina todas as barras de scroll horizontais e verticais do DOM global, respeita a tela super widescreen nativa do Galaxy S23 via Landscape, e reposiciona controles mecânicos essenciais perfeitamente debaixo dos polegares do jogador, enquanto garante que o palco principal da batalha ocupe 100% da resolução orgânica.