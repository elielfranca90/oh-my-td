# 📌 Product Backlog - Tower Defense 2D (Oh My TD)

## 🟢 Concluído

- [x] **Diorama 3D Low-Poly de Natureza**: Substituição do background synthwave/space da `WelcomeScreen` por uma ilha flutuante 3D em Three.js com pinheiros, sol bucólico com bloom e vaga-lumes.
- [x] **Renderização WebGL de Terrenos sRGB**: Texturas dos tiles do mapa configuradas com `THREE.SRGBColorSpace` para fidelidade de cores sem lavagem de gama.
- [x] **Sistema de Especializações de Torres (Nível 3)**: Ramificação de caminhos de upgrade (ex: Sniper vs Gatling) para todas as 5 torres.
- [x] **Chefão Final & Mega Boss Renderer**: Implementação de `BLACK_MEGA_BOSS` na Onda 20 do Modo Campanha com renderizador procedural dedicado.
- [x] **Sincronização Cloud & Supabase**: Autenticação anônima, persistência de conquistas e Placar Global de High Scores.
- [x] **Sub-stepping e Simulação Físico-Determinística**: Implementação de timestep fixo com sub-stepping para execução estável em 2x/4x.

## 🟢 Concluído (Sprint Game Evolution v2)

- [x] **1. Mecânicas Ambientais Dinâmicas por Bioma**: Fissuras de lava ativas no Desfiladeiro/Vale da Morte, conectores de energia na Cidadela Neon e névoa dinâmica no Vale Verde.
- [x] **2. Sistema Roguelite de Módulos e Draft de Cartas**: Modal de Draft de Cartas nas Ondas 5, 10 e 15 + encaixe de módulos passivos/ativos em torres Nível 2+.
- [x] **3. Replay Determinístico & Desafios Diários**: Gravação compacta de logs de input, reprodutor Ghost Replay no Leaderboard e Daily Seed determinística.
- [x] **4. Post-Processing Shaders no Three.js & Motor de Tensão Audio**: Efeitos visuais WebGL (Vignette, Heat Distortion) e camadas dinâmicas de tensão e arpejos sintetizados em tempo real.

## 🟢 Concluído (Sprint de Estabilidade e Correção de Bugs de Gameplay)

- [x] **Correção de Congelamento no Draft Roguelite**: Resolução de referência não definida de `getAllRogueliteModules` em `UIManager.ts` via importação correta de `Specializations.ts`.
- [x] **Normalização da Instância Supabase (GoTrueClient Singleton)**: Implementação do padrão Singleton no `DatabaseManager` e atualização em `Game.ts` e `WelcomeScreen.ts` para mitigar recriações concorrentes de cliente Supabase.
- [x] **Correção do Loop de Resolução / Encolhimento do Canvas**: Ajuste no cálculo de `--canvas-width` e `--canvas-height` em `syncCanvasWidth` (`Game.ts`) para prevenir loop de encolhimento infinito no layout `flex`.
- [x] **Sanitização de Tipagem TypeScript & Refatoração de Construtores**: Adição de declarações explícitas de atributos da classe `TowerManager2D` e suporte a regras estritas de compilação sem parâmetros de construtor em `ReplayEngine.ts`.
- [x] **Isolamento de Brotos Selvagens (*Overgrowth Sprout*) por Bioma**: Restrição da geração de tiles *Sprout* exclusivamente ao mapa **Green Valley (`MAP_1`)** em `Game.ts`, garantindo que mapas de lava, cibernéticos ou góticos não contenham brotos de vegetação incoerentes com seus biomas.
- [x] **Mecânica de Terreno no Cemitério Obscuro (*Altar Obscuro / Dark Altar*)**: Sorteio de 3 tiles góticos especiais (`darkAltarTiles`) exclusivamente no **Grave Pass (`MAP_4`)**, concedendo **+25% de Dano Necrótico** para torres construídas neles e destacando um marcador de aura roxa espiritual (`#ab47bc`).

## 🟢 Concluído (Sprint Biomas Fantasia)

- [x] **Mapa 4 (Grave Pass / Cemitério Obscuro)**: Adição do quarto mapa com rota em espiral gótica, bioma de névoa e perigo ambiental `GRAVEYARD_SOULS` (erupções de almas com desaceleração em área), atlas procedural em tons de roxo/esmeralda e trilha sonora BGM dedicada em Sol Menor.
- [x] **Otimização de Bundling & Vendor Code-Splitting (Vite)**: Criação do `vite.config.ts` com `manualChunks` isolando Three.js (~514 kB) e Supabase (~215 kB), reduzindo o chunk principal do jogo em ~78% (de 935 kB para 204 kB).

## 🟡 Próximas Funcionalidades (Backlog)

- [ ] **Modo Co-op Multiplayer Local**: Suporte para dois jogadores na mesma tela com divisão de recursos e construção compartilhada.
- [ ] **Novas Torres Elementais**: Torre Arcana de Teleporte e Torre de Terremoto com desaceleração em área física.
- [ ] **Renderizadores Procedurais/Spritesheet Dedicados para Minions**: Expansão do padrão de renderização dedicada de `MegaBossSpriteRenderer.ts` para os demais tipos de inimigos (Standard, Runner, Tank, Shielded, Spore Sprinter, Moss Giant), com suporte a estados e animações procedimentais (caminhar, dano, habilidades ativas e derrota).
