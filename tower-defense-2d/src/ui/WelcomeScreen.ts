import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { DatabaseManager } from '../engine/DatabaseManager';
import { AudioManager } from '../engine/AudioManager';
export class WelcomeScreen {
  private overlayEl: HTMLDivElement | null = null;
  private canvasContainerEl: HTMLDivElement | null = null;
  private leaderboardModalEl: HTMLDivElement | null = null;
  private onStartCallback: (mode: 'CAMPAIGN' | 'TRADITIONAL') => void;
  private db: DatabaseManager;
  private audioManager: AudioManager;
  private audioBtnEl: HTMLButtonElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;

  private dioramaGroup: THREE.Group | null = null;
  private particleSystem: THREE.Points | null = null;

  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  private handleResizeBound: () => void;

  constructor(
    onStart: (mode: 'CAMPAIGN' | 'TRADITIONAL') => void,
    db?: DatabaseManager,
    audioManager?: AudioManager
  ) {
    this.onStartCallback = onStart;
    this.db = db || DatabaseManager.getInstance();
    this.audioManager = audioManager || new AudioManager();
    this.handleResizeBound = this.handleResize.bind(this);
    this.initUI();
    this.initThree();
    this.audioManager.playMenuTheme().catch(() => {});
  }

  private initUI(): void {
    // Create main overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'welcome-screen-overlay';
    this.overlayEl.style.cssText = 'position:fixed!important;inset:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100dvh!important;margin:0 auto!important;z-index:100000!important;';
    // Create 3D canvas container
    this.canvasContainerEl = document.createElement('div');
    this.canvasContainerEl.id = 'welcome-canvas-container';
    this.overlayEl.appendChild(this.canvasContainerEl);

    // Create sound toggle button
    const audioBtn = document.createElement('button');
    audioBtn.id = 'welcome-audio-btn';
    audioBtn.className = `welcome-audio-toggle${this.audioManager.isBgmMuted ? ' muted' : ''}`;
    audioBtn.setAttribute('aria-label', this.audioManager.isBgmMuted ? 'Ativar música do menu' : 'Silenciar música do menu');
    audioBtn.title = this.audioManager.isBgmMuted ? 'Ativar música' : 'Silenciar música';
    audioBtn.innerHTML = `<span class="welcome-audio-icon">${this.audioManager.isBgmMuted ? '🔇' : '🎵'}</span>`;
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = this.audioManager.toggleBgmMute();
      this.updateAudioButtonState(isMuted);
    });
    this.audioBtnEl = audioBtn;
    this.overlayEl.appendChild(audioBtn);
    // Create UI content card
    const uiContent = document.createElement('div');
    uiContent.id = 'welcome-ui-content';

    const title = document.createElement('h1');
    title.className = 'retro-title';
    title.textContent = 'OH MY TD';

    const subtitle = document.createElement('p');
    subtitle.className = 'retro-subtitle';
    subtitle.textContent = 'RETRO TOWER DEFENSE · 80S EDITION';

    const btnContainer = document.createElement('div');
    btnContainer.className = 'welcome-buttons-container';

    const campaignBtn = document.createElement('button');
    campaignBtn.className = 'retro-btn-campaign';
    campaignBtn.textContent = 'MODO CAMPANHA';
    campaignBtn.addEventListener('click', () => {
      this.destroy('CAMPAIGN');
    });

    const traditionalBtn = document.createElement('button');
    traditionalBtn.className = 'retro-btn-traditional';
    traditionalBtn.textContent = 'MODO TRADICIONAL';
    traditionalBtn.addEventListener('click', () => {
      this.destroy('TRADITIONAL');
    });

    const leaderboardBtn = document.createElement('button');
    leaderboardBtn.className = 'retro-btn-leaderboard';
    leaderboardBtn.textContent = 'PLACAR GLOBAL';
    leaderboardBtn.addEventListener('click', () => {
      this.openLeaderboardModal();
    });

    btnContainer.appendChild(campaignBtn);
    btnContainer.appendChild(traditionalBtn);
    btnContainer.appendChild(leaderboardBtn);
    uiContent.appendChild(title);
    uiContent.appendChild(subtitle);
    uiContent.appendChild(btnContainer);
    this.overlayEl.appendChild(uiContent);
    // Create developer links footer
    const devFooter = document.createElement('div');
    devFooter.className = 'welcome-dev-footer';
    devFooter.innerHTML = `
      <span class="dev-footer-text">Desenvolvido por <strong>Eliel França</strong></span>
      <div class="dev-footer-links">
        <a href="https://www.linkedin.com/in/eliel-franca/" target="_blank" rel="noopener noreferrer" class="dev-link linkedin-link" title="LinkedIn">
          <span class="dev-icon">👔</span> LinkedIn
        </a>
        <a href="https://github.com/elielfranca90" target="_blank" rel="noopener noreferrer" class="dev-link github-link" title="GitHub">
          <span class="dev-icon">🐙</span> GitHub
        </a>
        <a href="https://x.com/elielofranca" target="_blank" rel="noopener noreferrer" class="dev-link twitter-link" title="X (Twitter)">
          <span class="dev-icon">𝕏</span> Twitter
        </a>
      </div>
    `;
    this.overlayEl.appendChild(devFooter);

    document.body.appendChild(this.overlayEl);
  }
  private updateAudioButtonState(isMuted: boolean): void {
    if (!this.audioBtnEl) return;
    if (isMuted) {
      this.audioBtnEl.classList.add('muted');
      this.audioBtnEl.setAttribute('aria-label', 'Ativar música do menu');
      this.audioBtnEl.title = 'Ativar música';
      this.audioBtnEl.innerHTML = '<span class="welcome-audio-icon">🔇</span>';
    } else {
      this.audioBtnEl.classList.remove('muted');
      this.audioBtnEl.setAttribute('aria-label', 'Silenciar música do menu');
      this.audioBtnEl.title = 'Silenciar música';
      this.audioBtnEl.innerHTML = '<span class="welcome-audio-icon">🎵</span>';
    }
  }

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }
  private async openLeaderboardModal(): Promise<void> {
    if (!this.overlayEl) return;

    if (this.leaderboardModalEl) {
      this.leaderboardModalEl.classList.remove('hidden');
      const content = this.leaderboardModalEl.querySelector('#welcome-leaderboard-content') as HTMLElement;
      if (content) {
        await this.loadLeaderboardData(content);
      }
      return;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'welcome-leaderboard-modal-overlay';
    modalOverlay.className = 'welcome-modal-overlay';

    const modalCard = document.createElement('div');
    modalCard.className = 'welcome-modal-card retro-modal-card';

    const header = document.createElement('div');
    header.className = 'welcome-modal-header';

    const title = document.createElement('h2');
    title.className = 'retro-modal-title';
    title.textContent = '🏆 PLACAR GLOBAL TOP 20';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'retro-close-btn';
    closeBtn.textContent = '✖';
    closeBtn.addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.id = 'welcome-leaderboard-content';
    content.className = 'welcome-leaderboard-content';
    content.innerHTML = '<p style="text-align: center; padding: 20px;">⌛ Carregando placar global...</p>';

    const bottomRow = document.createElement('div');
    bottomRow.style.marginTop = '16px';
    bottomRow.style.textAlign = 'center';

    const bottomCloseBtn = document.createElement('button');
    bottomCloseBtn.className = 'retro-btn-secondary';
    bottomCloseBtn.textContent = 'VOLTAR';
    bottomCloseBtn.addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
    });
    bottomRow.appendChild(bottomCloseBtn);

    modalCard.appendChild(header);
    modalCard.appendChild(content);
    modalCard.appendChild(bottomRow);
    modalOverlay.appendChild(modalCard);

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden');
      }
    });

    this.overlayEl.appendChild(modalOverlay);
    this.leaderboardModalEl = modalOverlay;

    await this.loadLeaderboardData(content);
  }

  private async loadLeaderboardData(content: HTMLElement): Promise<void> {
    content.innerHTML = '<p style="text-align: center; padding: 20px;">⌛ Carregando placar global...</p>';

    if (!this.db || !this.db.isConnected()) {
      content.innerHTML = '<p style="text-align: center; color: #ff5252; padding: 20px;">⚠️ Placar indisponível no modo offline. Conecte-se ao Supabase para visualizar o ranking.</p>';
      return;
    }

    const list = await this.db.getTop20Leaderboard();
    if (list.length === 0) {
      content.innerHTML = '<p style="text-align: center; color: #aaa; padding: 20px;">Nenhum registro encontrado no placar ainda. Seja o primeiro!</p>';
      return;
    }

    const avatarIcons: Record<string, string> = {
      default_avatar: '🛡️',
      solar_prism: '☀️',
      mega_boss: '👹',
      frost_wizard: '❄️',
    };

    const rowsHtml = list
      .map((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const icon = avatarIcons[entry.avatar_id] || '🛡️';
        return `
          <tr>
            <td class="rank-col ${rankClass}">${medal}</td>
            <td><strong>${icon} ${entry.username || 'Anônimo'}</strong></td>
            <td><span style="font-size:0.675rem; background:#334; padding:2px 6px; border-radius:4px;">${entry.challenge_mode}</span></td>
            <td style="color:#ffca28; font-weight:bold;">Onda ${entry.wave_reached}</td>
            <td>⚔️ ${entry.total_kills}</td>
            <td>🪙 ${entry.gold_earned}g</td>
          </tr>
        `;
      })
      .join('');

    content.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>Jogador</th>
            <th>Modo</th>
            <th>Maior Onda</th>
            <th>Kills</th>
            <th>Ouro</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  private initThree(): void {
    if (!this.canvasContainerEl) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    // 1. Scene & Fog / Sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 3, 12);
    this.camera.lookAt(0, 1.5, 0);

    // 3. Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.canvasContainerEl.appendChild(this.renderer.domElement);
    } catch (e) {
      console.warn('WebGL setup failed for WelcomeScreen, falling back to basic UI:', e);
      return;
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // 5. Diorama Base (Floating Island)
    this.dioramaGroup = new THREE.Group();
    this.dioramaGroup.position.set(0, -5, -20);

    const islandBaseGeo = new THREE.CylinderGeometry(20, 16, 5, 8);
    const islandBaseMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50, flatShading: true });
    const islandBase = new THREE.Mesh(islandBaseGeo, islandBaseMat);
    this.dioramaGroup.add(islandBase);

    // 6. Low-Poly Pine Trees
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true });
    const leavesGeo = new THREE.ConeGeometry(2, 5, 5);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2E7D32, flatShading: true });

    const treeCount = 18;
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(tx, 3.5, tz);
      this.dioramaGroup.add(trunk);

      const leaves = new THREE.Mesh(leavesGeo, leavesMat);
      leaves.position.set(tx, 7, tz);
      this.dioramaGroup.add(leaves);
    }

    this.scene.add(this.dioramaGroup);

    // 7. Glowing Sun in the Distance
    const sunGeo = new THREE.SphereGeometry(15, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(-40, 30, -100);
    this.scene.add(sunMesh);

    // 8. Firefly Particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 50;
      particlePositions[i * 3 + 1] = Math.random() * 25 - 5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 20;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xADFF2F,
      size: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    // 9. Post Processing (Bloom)
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        1.3,  // strength
        0.5,  // radius
        0.9   // threshold
      );
      this.composer.addPass(bloomPass);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
    } catch (e) {
      console.warn('EffectComposer bloom setup warning:', e);
      this.composer = null;
    }

    // 9. Resize Listener
    window.addEventListener('resize', this.handleResizeBound);

    // 10. Start Animation Loop
    this.animate();
  }

  private handleResize(): void {
    if (!this.camera || !this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  private animate = (): void => {
    if (this.isDestroyed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Rotate and float diorama
    if (this.dioramaGroup) {
      this.dioramaGroup.rotation.y += 0.002;
      this.dioramaGroup.position.y = -5 + Math.sin(Date.now() * 0.001) * 0.5;
    }

    // Rotate firefly particles
    if (this.particleSystem) {
      this.particleSystem.rotation.y += 0.001;
    }

    // Render
    if (this.composer) {
      this.composer.render();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public destroy(mode: 'CAMPAIGN' | 'TRADITIONAL' = 'CAMPAIGN'): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Stop and fade out menu theme music smoothly
    this.audioManager.stopMenuTheme(500).catch(() => {});

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove window resize listener
    window.removeEventListener('resize', this.handleResizeBound);

    // Fade out overlay element smooth transition
    if (this.overlayEl) {
      this.overlayEl.style.opacity = '0';
      this.overlayEl.style.pointerEvents = 'none';

      setTimeout(() => {
        if (this.overlayEl && this.overlayEl.parentNode) {
          this.overlayEl.parentNode.removeChild(this.overlayEl);
        }
        this.overlayEl = null;
        this.leaderboardModalEl = null;
        this.audioBtnEl = null;
      }, 600);
    }

    // Dispose Three.js scene & memory resources
    this.disposeThreeResources();

    // Trigger onStart callback to launch main game
    if (this.onStartCallback) {
      this.onStartCallback(mode);
    }
  }

  private disposeThreeResources(): void {
    if (this.scene) {
      this.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh || (object as THREE.Points).isPoints) {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    this.camera = null;
    this.dioramaGroup = null;
    this.particleSystem = null;
  }
}
