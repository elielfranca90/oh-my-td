# 🏰 Tower Defense 2D (Oh My TD)

Jogo de estratégia *Tower Defense 2D* completo desenvolvido com **HTML5 Canvas**, **TypeScript** e **Vite**.

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Rodar servidor local
npm run dev

# Rodar testes automatizados (Vitest)
npm run test

# Gerar build de produção
npm run build
```

---

## 🛠️ Recursos Implementados

* **🎮 Tela Inicial 3D Synthwave & Modos de Jogo:** Interface de entrada retro 3D (Three.js) com suporte ao Modo Campanha (10 Ondas densas — 144 inimigos no total — + Boss Final com Modal de Vitória) e Modo Infinito com Seleção de Desafios (`NORMAL`, `HARDCORE`, `MORTE_CERTA`).
* **🏰 5 Torres Especializadas, Upgrades Ramificados (Lvl 3) & Ranks Infinitos:** Basic, Frost, Solar Prism, Cannon e Artillery com escolha de caminhos de especialização no Nível 3; a partir do Nível 4, ranks genéricos infinitos (dano/HP sem teto, alcance/área com teto) reaproveitam a mesma UI de upgrade.
* **👾 8 Tipos de Inimigos:** Standard, Runner (Esquiva), Tank (Armadura), Shielded (Escudo de Energia), Spore Sprinter (Velocidade), Moss Giant (Regeneração), BOSS (Reinforcements) e `BLACK_MEGA_BOSS` com renderizador customizado.
* **💰 Economia de Ouro Recalibrada:** curva de recompensa por abate com corte específico por modo — mais agressivo na campanha (compensando a densidade de onda maior) e mais suave no Modo Infinito (expoente efetivo 0,75, corte gradual até um piso), além de bônus de ouro por **chamar a próxima onda antecipadamente** (Manual e Auto).
* **☁️ Perfil do Jogador & Leaderboard Supabase:** Autenticação anônima persistente com sincronização cloud de conquistas e placar de líderes global online.
* **⚡ Motor Determinístico & Sub-stepping:** Timestep fixo ($1/60$s) e sub-stepping para movimentação e física sem falhas em acelerações de 2x e 4x.
* **🌟 Meta-Progressão & Badges:** Árvore de Talentos permanente salvando no LocalStorage e 9 Conquistas desbloqueáveis com notificações flutuantes.
* **☄️ Magias com Dano Escalável:** Meteoro causa `90 + 12% do HP máximo` do alvo (em vez de dano fixo); custo de ambas as magias dobra por uso e decai por ondas sem uso, com teto.
* **📊 Analytics Pós-Partida:** Painel de relatório exibindo a Torre MVP da partida, finanças, contagem de abates e recordes.
* **📱 UX Mobile Responsivo & Press-and-Hold:** Suporte a `100dvh`, *Safe Area Insets*, abas mobile com auto-inspector, seletores rápidos na HUD, tooltips por toque longo (*press-and-hold*) e controle duplo de áudio BGM/SFX.
* **⌨️ Atalhos de Teclado & 📳 Retorno Tátil:** `1`-`5` seleciona torre, `Q`/`W` arma Meteoro/conjura Congelamento, `Enter` inicia onda, `Esc` desarma magia/cancela seleção, `U`/`S` upgrade/vende (com confirmação em duas etapas), `R` alterna alcance de todas as torres; vibração no mobile em construir, upgrade, dano na base e chefe, com interruptor nas Configurações.
* **🧪 Bateria de Testes Automatizados (Vitest):** cobre motor matemático, física, banco de dados, fluxo de ondas, draft roguelite, UI e Mapa 4 (Grave Pass).
* **⚡ Vite HMR Estabilizado:** Grafo de dependências totalmente livre de ciclos circulares (`madge`), eliminando falhas de recarga e erros de export em tempo de desenvolvimento.

---

## 📚 Documentação Técnica

Consulte a documentação completa em [`/docs`](../docs):
* 🎮 [**GAME_MECHANICS.md**](../docs/GAME_MECHANICS.md): Guia exaustivo de todas as mecânicas do jogo (torres, especializações, inimigos, biomas, climas, magias, talentos, ondas e fórmulas).
* 📐 [**ARCHITECTURE_CANVAS.md**](../docs/ARCHITECTURE_CANVAS.md): Arquitetura do motor Canvas 2D, loop de renderização e sintetização de áudio.
* 📝 [**PRD.md**](../docs/PRD.md): Documento de Requisitos do Produto e User Stories.
* 🛠️ [**TECH_SPEC.md**](../docs/TECH_SPEC.md): Especificação Técnica e Contrato de Testes.
---

## 👤 Autor & Contato

Desenvolvido por **Eliel França**:
- 👔 **LinkedIn**: [https://www.linkedin.com/in/eliel-franca/](https://www.linkedin.com/in/eliel-franca/)
- 𝕏 **X (Twitter)**: [@elielofranca](https://x.com/elielofranca)
---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [`LICENSE`](../LICENSE) para mais detalhes.
