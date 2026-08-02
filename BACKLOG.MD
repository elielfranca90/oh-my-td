# 📝 Backlog & Roadmap - Tower Defense 2D (Oh My TD)

## 🎯 Concluído recente (v0.4.0)

- [x] **Correção de Cores do Mapa no ThreeRenderer (sRGB):**
  - Adicionado `texture.colorSpace = THREE.SRGBColorSpace` em `ThreeRenderer.ts` ao instanciar os `CanvasTexture` dos tiles.
  - Eliminada a dupla correção de gama do WebGLRenderer que deixava os biomas com aspecto lavado/pastel.
  - Adicionada suíte de teste garantindo que o `colorSpace` das texturas é `srgb`.
- [x] **Bump de Versão para v0.4.0:**
  - Versão sincronizada no `package.json`, `package-lock.json`, `index.html` e `UIManager.ts`.

---

## 🚀 Próximas Funcionalidades & Melhorias (Roadmap)

### 🎨 Visual & Efeitos FX
- [ ] Implementar shaders customizados WebGL para efeitos de lava incandescente no Map 2 (Death Pass).
- [ ] Adicionar partículas de névoa e clima dinâmico por bioma (chuva no Map 1, poeira de cinzas no Map 2, faíscas arcanas no Map 3).

### ⚔️ Jogabilidade & Conteúdo
- [ ] Adicionar novas torres secundárias de suporte (ex: Torre de Buffer Arcano / Gerador de Ouro).
- [ ] Modo Co-op / Multiplayer assíncrono para defesa em dupla.

### 📊 Performance & Infraestrutura
- [ ] Implementar Code Splitting dinâmico via `import()` no Vite para otimizar os chunks do Three.js (< 500kB).
- [ ] Adicionar cache local de assets compilados via Service Worker para suporte PWA offline.
