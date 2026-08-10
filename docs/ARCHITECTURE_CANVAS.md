# 📐 Architecture Canvas - 2D Engine

```mermaid
graph TD
    WS[WelcomeScreen - 3D Nature Diorama & Mode Select] --> A[Game Loop - Fixed Timestep & Sub-stepping]
    A --> B[Input Event Listeners - Mouse, Touch & Press-Hold]
    A --> C[Game State - Campaign & Challenge Modes]
    C --> D[Wave Manager - Campaign 20 Waves / Endless]
    C --> E[Enemy Manager - 8 Types & Black Mega Boss]
    C --> F[Tower Manager - 5 Towers & Level 3 Specializations]
    C --> G[Projectile Manager - AoE/Slow/Crit]
    C --> H[Spell Manager - Meteor/Freeze]
    C --> I[FX & Particle Manager - DoT/Shake]
    C --> J[Talent Manager - LocalStorage Stars]
    C --> K[Achievement Manager - 11 Badges]
    C --> L[Analytics Manager - High Score]
    C --> M[Audio Manager - SFX/BGM Sliders]
    C --> N[Sprite Manager - 3 Biomes & Vector SVGs]
    C --> RNG[Rng - Seeded Deterministic LCG/Mulberry32]
    C --> DB[DatabaseManager - Supabase Auth & Cloud Leaderboard]
    
    E --> MegaBoss[MegaBossSpriteRenderer - Procedural Boss Renderer]
    E --> O[Canvas 2D Renderer]
    F --> O
    G --> O
    H --> O
    I --> O
    N --> O
    N --> TR[ThreeRenderer - WebGL sRGB Map Terrain Layer z:0]
    TR --> WebGLCanvas[WebGL Canvas z:0]
    MegaBoss --> O
    
    D --> P[UIManager - DOM Responsive Overlay & HUD Badges]
    J --> P
    K --> P
    L --> P
    DB --> P
```

---

## 🧩 Descrição dos Módulos Principais

* **`WelcomeScreen` (Three.js & Retro UI):** Tela inicial com background 3D diorama low-poly de natureza (ilha flutuante, pinheiros, sol bucólico com efeito bloom e partículas de vaga-lumes), menu de início, seleção de modo (Campanha ou Infinito com Desafios) e perfil do jogador.
* **`Game` & `GameState`:** Motor principal com timestep fixo e sub-stepping para simulação fluida em 2x e 4x sem perda de física.
* **`DatabaseManager`:** Integração com Supabase para autenticação anônima persistente, sincronização cloud de conquistas e placar global (Leaderboard).
* **`Specializations`:** Sistema de ramificação de upgrades para torres no nível 3 com habilidades ativas e passivas únicas.
* **`Rng`:** Gerador pseudo-aleatório semeado (Mulberry32) para partidas determinísticas e simulação headless.
* **`MegaBossSpriteRenderer`:** Renderizador procedural otimizado com transparência para o chefão `BLACK_MEGA_BOSS`.
* **`ThreeRenderer`:** Renderizador WebGL (Three.js) dedicado aos tiles do mapa na camada inferior (`z-index: 0`) com texturas configuradas em `THREE.SRGBColorSpace` para fidelidade sRGB de cores.

---

## ⚡ Estabilidade do Vite HMR & Resolução de Dependências Circulares

Para garantir que o Hot Module Replacement (HMR) do Vite funcione de forma determinística em ambiente de desenvolvimento sem erros de avaliação de módulo em tempo de recarga (`Uncaught SyntaxError: ... does not provide an export named ...`), a árvore de dependências do projeto segue regras de desacoplamento unidirecional:

1. **Inversão de Dependência entre `UIManager` e `Game` (`IGame2D`):**
   - O `UIManager` não importa o tipo nem a classe concreta de `Game.ts`. Em vez disso, ele declara a interface `IGame2D` em `src/ui/UIManager.ts`.
   - A classe `Game2D` em `src/engine/Game.ts` assina a interface (`implements IGame2D`), eliminando o ciclo de importação cruzada entre Engine e UI.

2. **Centralização de Tipos Compartilhados em `src/types.ts`:**
   - Interfaces de dados e enumerações estruturais compartilhadas (como `TalentData` e `TileType`) foram centralizadas em `src/types.ts`.
   - `TalentManager.ts` e `MapManager.ts` re-exportam esses tipos para manter retrocompatibilidade com chamadas de testes e componentes externos sem reintroduzir ciclos estáticos no bundler.
