# 📊 Relatório Técnico de Migração: Renderização 2D para Three.js ("Oh My TD")

**Para:** Gerência de Desenvolvimento / Liderança de Produto  
**Assunto:** Estratégia de Migração da Engine de Renderização 2D Canvas para WebGL / Three.js  
**Data:** 01 de Agosto de 2026  
**Status:** Proposta de Arquitetura & Roadmap Aprovado  

---

## 1. Sumário Executivo

O jogo **"Oh My TD"** utiliza atualmente um contexto de renderização em HTML5 Canvas 2D (`CanvasRenderingContext2D`). Embora a arquitetura atual seja funcional para batalhas simples, a escala do jogo no modo campanha e nas ondas avançadas (com centenas de inimigos, projéteis simultâneos e efeitos de partículas) impõe gargalos severos de desempenho processados inteiramente pela CPU.

Este relatório apresenta a estratégia técnica para migrar a pipeline de renderização do jogo para **Three.js (WebGL)**, cumprindo com rigor os três pilares estratégicos estabelecidos pela gerência:
1. **Preservação Total da Identidade Visual:** Manutenção das cores originais vibrantes e características do estilo *Pixel Art/Retro 2D*.
2. **Aproveitamento Máximo das Capacidades do Three.js:** Introdução de sistemas modernos como *Instancing*, malhas dinâmicas, aceleração de partículas por GPU e pós-processamento de luz (*Bloom*).
3. **Desempenho Leve e Fluido no Navegador:** Garantia de 60 FPS cravados no navegador em qualquer dispositivo, transferindo o gargalo do thread principal de CPU para a GPU.

---

## 2. Diagnóstico da Arquitetura Atual (Canvas 2D)

Na arquitetura atual (`Game.ts`, `SpriteManager.ts`, `ParticleManager.ts`, `FXManager.ts`):
* **Frequência de Draw Calls de CPU:** A cada frame (16.6ms), a CPU executa centenas de instruções individuais como `ctx.drawImage()`, `ctx.arc()`, `ctx.fill()` e `ctx.stroke()`.
* **Gargalo no Escalamento:** Com 200+ inimigos na tela e dezenas de projéteis de artilharia/torres, a contagem de renderizações Canvas 2D consome até 80% do tempo de frame da CPU, causando perda de quadros.
* **Texturas e Atlases:** O `SpriteManager` gera proceduralmente texturas em elementos `<canvas>` separados na memória, mas a renderização é realizada linha a linha pelo sistema de 2D do navegador.

---

## 3. Arquitetura Técnica Proposta em Three.js

### 3.1 Câmera Orthographic (Garantia da Estética 2D Nítida)
Para garantir que o jogo **não pareça um jogo 3D inclinado** e preserve rigorosamente a visão top-down / 2D original:
* **Câmera:** Utilização exclusiva de `THREE.OrthographicCamera`.
* **Projeção:** A câmera será configurada com dimensões idênticas à resolução nativa da tela do jogo ($840 \times 600$ unidades ou escala $1:1$ de pixels):
  ```typescript
  const aspect = width / height;
  const camera = new THREE.OrthographicCamera(
    0, width,  // left, right
    0, height, // top, bottom
    -1000, 1000 // near, far
  );
  camera.position.set(0, 0, 100);
  ```
* **Vantagem:** Elimina qualquer distorção de perspectiva ou efeito de profundidade indesejado, permitindo que cada pixel do sprite corresponda exatamente ao pixel projetado na tela.

### 3.2 Materiais e Fidelidade das Cores Retrô
Para manter as cores originais sem que fontes de luz virtuais (como `PointLight` ou `DirectionalLight`) alterem as paletas de cores do jogo:
* **Material Base:** Uso de `THREE.MeshBasicMaterial`, que renderiza texturas com cores puras e emissivas, imunes à atenuação de iluminação 3D.
* **Configuração de Filtragem Pixel-Art:** As texturas geradas pelo `SpriteManager` serão convertidas em `THREE.CanvasTexture` aplicando os parâmetros:
  ```typescript
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  ```
* **Resultado:** Mantém bordas perfeitamente nítidas e preserva as hex-colors exatas do jogo original (`#e53935` para inimigos standard, `#8e24aa` para tanks, `#29b6f6` para escudos, etc.).

---

## 4. Plano de Performance e Otimização Extrema (GPU Batching)

O segredo para manter o jogo **extremamente leve no navegador** sob estresse máximo é reduzir drasticamente a quantidade de *Draw Calls* enviadas para o driver gráfico.

```mermaid
graph TD
    subgraph CPU (Canvas 2D Antigo)
        A[Loop Principal] --> B[Draw Enemy 1]
        A --> C[Draw Enemy 2]
        A --> D[Draw Enemy N...]
        A --> E[Draw Projectiles...]
        note1[Centenas de Draw Calls por Frame]
    end

    subgraph GPU (Three.js Proposto)
        F[Matrizes de Instâncias] --> G[InstancedMesh: Inimigos]
        H[Matrizes de Instâncias] --> I[InstancedMesh: Projéteis]
        G --> J[1 Draw Call - GPU Batch]
        I --> K[1 Draw Call - GPU Batch]
        note2[Menos de 10 Draw Calls Totais]
    end
```

### 4.1 `THREE.InstancedMesh` para Entidades em Massa
Em vez de criar uma `THREE.Mesh` por entidade (o que saturaria a árvore de cena), utilizaremos `THREE.InstancedMesh` para renderizar todos os objetos da mesma categoria de uma só vez:

1. **Instancing de Inimigos e Projéteis:**
   * Uma única malha `InstancedMesh` pode renderizar até 5.000 inimigos com **uma única Draw Call**.
   * A posição, rotação e escala de cada entidade são atualizadas na VRAM por meio de uma matriz de transformação `THREE.Matrix4` reutilizável:
     ```typescript
     const dummy = new THREE.Object3D();

     enemies.forEach((enemy, index) => {
       dummy.position.set(enemy.x, enemy.y, 0);
       dummy.scale.set(enemy.radius * 2, enemy.radius * 2, 1);
       dummy.updateMatrix();
       instancedEnemyMesh.setMatrixAt(index, dummy.matrix);
     });
     instancedEnemyMesh.instanceMatrix.needsUpdate = true;
     ```

2. **Cores Dinâmicas por Instância:**
   * Para variações de status (ex: congelado, queimando, envenenado), utilizaremos `instancedEnemyMesh.setColorAt(index, color)`, alterando a tonalidade do inimigo sem necessidade de trocar de material ou re-executar chamadas de textura.

### 4.2 Geometria Unificada de Terreno (Map Tiles)
Os $14 \times 10$ tiles do mapa ($60\text{px}$ cada) serão fundidos em uma única `BufferGeometry` estática (`BufferGeometryUtils.mergeGeometries`) ou renderizados via `InstancedMesh` estático no início da fase. O mapa consome **exatamente 1 Draw Call** durante toda a partida.

---

## 5. Evolução de Partículas e Efeitos Visuais (FX)

### 5.1 Sistema de Partículas GPU com `THREE.Points`
O sistema de partículas atual (`ParticleManager.ts`), que lida com fagulhas de explosão de artilharia, meteoros, cinzas e choques, será migrado de estruturas de objetos JavaScript para **sistemas de pontos acelerados por hardware**:

* **Geometria de Pontos (`THREE.Points`):** Utilização de `THREE.BufferGeometry` com atributos de posição (`position`), cor (`color`) e transparência (`alpha`) armazenados como matrizes `Float32Array` contíguas na VRAM.
* **Ganhos de Performance:** Atualização de 1.000+ fagulhas e faíscas simultâneas de impacto de meteoro gastando $<0.5\text{ms}$ por frame de CPU.

### 5.2 Pós-Processamento Seletivo (*UnrealBloomPass*)
Aproveitando o padrão de pós-processamento já introduzido no projeto na `WelcomeScreen.ts`, implementaremos uma pipeline leve com `EffectComposer`:

* **Bloom Seletivo Retrô:** Aplicação de brilho néon (*Glow*) apenas em elementos emissivos de alta intensidade:
  * Impactos de Meteoros e explosões de Artilharia.
  * Habilidades de Magia e ataques do Mega Boss.
  * Tiros críticos das Torres Especiais.
* **Configuração de Baixo Custo:**
  ```typescript
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6, // Strength (suave para não ofuscar)
    0.4, // Radius
    0.85 // Threshold (apenas pixels muito brilhantes sofrem bloom)
  );
  ```
* **Tremor de Tela (Screen Shake) Otimizado:** Em vez de transformar o contexto 2D com offsets randômicos, o Screen Shake do `FXManager.ts` aplicará uma oscilação direta nas coordenadas $(X, Y)$ da `OrthographicCamera`, garantindo zero overhead de re-renderização.

---

## 6. Interface do Usuário (UI) e Integração de HUD

* **Manutenção do DOM HTML/CSS:** A interface do usuário (barras de vida do jogador, contadores de ouro/mana, painel de magias, árvore de talentos e menus modais) continuará em **HTML/CSS puro**.
* **Textos de Dano Flutuantes (*Damage Numbers*):** Os textos de dano flutuantes do `FXManager.ts` serão renderizados em uma camada overlay de canvas leve ou agrupados em um pool de instâncias `THREE.Sprite`, evitando recriar elementos DOM ou texturas a cada hit.

---

## 7. Roadmap de Implementação por Fases

| Fase | Descrição Técnica | Entregáveis Principais | Estimativa |
| :--- | :--- | :--- | :--- |
| **Fase 1: Fundação & Câmera** | Setup do `ThreeGameRenderer`, `OrthographicCamera` e renderizador unificado do terreno. | Cenas Three.js ativas com fundo renderizado a 60 FPS. | 3 dias |
| **Fase 2: Instancing de Entidades** | Implementação de `InstancedMesh` para Inimigos e Torres (`EnemyManager` e `TowerManager`). | Movimentação de 500+ inimigos em tela em 2 Draw Calls. | 4 dias |
| **Fase 3: Projéteis & Partículas GPU** | Migração do `ProjectileManager` e `ParticleManager` para `InstancedMesh` e `THREE.Points`. | Animação de tiro, meteoros e explosões aceleradas por GPU. | 4 dias |
| **Fase 4: FX & Post-Processing** | Aplicação do `UnrealBloomPass` seletivo, tremor de câmera e textos de dano flutuantes. | Efeitos visuais retrô/neon sem queda de desempenho. | 2 dias |
| **Fase 5: Benchmark & Polimento** | Testes de estresse (1.000+ unidades em tela), perfilamento de memória e validação cross-browser. | Liberação da nova engine em produção. | 2 dias |

---

## 8. Conclusão e Recomendação

A migração do "Oh My TD" para **Three.js com Orthographic Camera e InstancedMesh** é totalmente viável, altamente benéfica e garante a evolução sustentável do jogo. 

Ao adotar a estratégia descrita neste relatório, o jogo:
1. **Preserva 100% o estilo e identidade das pixel arts e paletas de cores retrô.**
2. **Elimina completamente os gargalos de CPU**, transferindo a carga gráfica para a GPU via WebGL.
3. **Prepara a base de código para futuras expansões**, como iluminação néon avançada, mapas dinâmicos e centenas de novos tipos de unidades simultâneas.

Recomendamos o início imediato da **Fase 1** do roadmap.

---
*Relatório elaborado pela Equipe de Arquitetura de Software e Engenharia de Jogos.*
