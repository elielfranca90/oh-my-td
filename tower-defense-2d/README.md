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

* **🎮 Tela Inicial 3D Synthwave & Modos de Jogo:** Interface de entrada retro 3D (Three.js) com suporte ao Modo Campanha (20 Ondas + Boss Final com Modal de Vitória) e Modo Infinito com Seleção de Desafios (`NORMAL`, `HARDCORE`, `MORTE_CERTA`).
* **🏰 5 Torres Especializadas & Upgrades Ramificados (Lvl 3):** Basic, Frost, Solar Prism, Cannon e Artillery com escolha de caminhos de especialização no Nível 3.
* **👾 8 Tipos de Inimigos:** Standard, Runner (Esquiva), Tank (Armadura), Shielded (Escudo de Energia), Spore Sprinter (Velocidade), Moss Giant (Regeneração), BOSS (Reinforcements) e `BLACK_MEGA_BOSS` com renderizador customizado.
* **☁️ Perfil do Jogador & Leaderboard Supabase:** Autenticação anônima persistente com sincronização cloud de conquistas e placar de líderes global online.
* **⚡ Motor Determinístico & Sub-stepping:** Timestep fixo ($1/60$s) e sub-stepping para movimentação e física sem falhas em acelerações de 2x e 4x.
* **🌟 Meta-Progressão & Badges:** Árvore de Talentos permanente salvando no LocalStorage e 11 Conquistas desbloqueáveis com notificações flutuantes.
* **📊 Analytics Pós-Partida:** Painel de relatório exibindo a Torre MVP da partida, finanças, contagem de abates e recordes.
* **📱 UX Mobile Responsivo & Press-and-Hold:** Suporte a `100dvh`, *Safe Area Insets*, abas mobile com auto-inspector, seletores rápidos na HUD, tooltips por toque longo (*press-and-hold*) e controle duplo de áudio BGM/SFX.
* **🧪 Bateria de Testes Automatizados (Vitest):** 163 testes passando em 27 suítes cobrindo motor matemático, física, banco de dados, fluxo de ondas, draft roguelite, UI e o novo Mapa 4 (Grave Pass).
---

## 👤 Autor & Contato

Desenvolvido por **Eliel França**:
- 👔 **LinkedIn**: [https://www.linkedin.com/in/eliel-franca/](https://www.linkedin.com/in/eliel-franca/)
- 𝕏 **X (Twitter)**: [@elielofranca](https://x.com/elielofranca)
---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [`LICENSE`](../LICENSE) para mais detalhes.
