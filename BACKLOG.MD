# 📌 Product Backlog - Tower Defense 2D (Oh My TD)

## 🟢 Concluído

- [x] **Diorama 3D Low-Poly de Natureza**: Substituição do background synthwave/space da `WelcomeScreen` por uma ilha flutuante 3D em Three.js com pinheiros, sol bucólico com bloom e vaga-lumes.
- [x] **Renderização WebGL de Terrenos sRGB**: Texturas dos tiles do mapa configuradas com `THREE.SRGBColorSpace` para fidelidade de cores sem lavagem de gama.
- [x] **Sistema de Especializações de Torres (Nível 3)**: Ramificação de caminhos de upgrade (ex: Sniper vs Gatling) para todas as 5 torres.
- [x] **Chefão Final & Mega Boss Renderer**: Implementação de `BLACK_MEGA_BOSS` na Onda 20 do Modo Campanha com renderizador procedural dedicado.
- [x] **Sincronização Cloud & Supabase**: Autenticação anônima, persistência de conquistas e Placar Global de High Scores.
- [x] **Sub-stepping e Simulação Físico-Determinística**: Implementação de timestep fixo com sub-stepping para execução estável em 2x/4x.

## 🟡 Em Andamento / Próximas Iterações

- [ ] **Novos Biomas & Mapas Fantasia**: Adição do Mapa 4 (Grave Pass / Cemitério Obscuro) com mecânicas de névoa e portais de invocação.
- [ ] **Modo Co-op Multiplayer Local**: Suporte para dois jogadores na mesma tela com divisão de recursos e construção compartilhada.
- [ ] **Novas Torres Elementais**: Torre Arcana de Teleporte e Torre de Terremoto com desaceleração em área física.
- [ ] **Trilha Sonora Orquestrada Sintetizada**: Expansão do motor Web Audio API com polifonia estendida e efeitos de arpejador dinâmico.
