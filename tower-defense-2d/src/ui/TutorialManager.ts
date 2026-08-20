import { EventBus } from '../engine/EventBus';

export class TutorialManager {
  private currentStep = 0;
  private isActive = false;
  private tooltipEl: HTMLDivElement | null = null;
  private highlightEl: HTMLDivElement | null = null;
  private unsubscribers: Array<() => void> = [];
  private readonly TUTORIAL_KEY = 'oh_my_td_has_seen_tutorial';

  constructor() {
    this.checkAndStart();
  }

  private checkAndStart(): void {
    try {
      const hasSeen = localStorage.getItem(this.TUTORIAL_KEY);
      if (hasSeen === 'true') {
        return;
      }
    } catch {
      return;
    }

    this.isActive = true;
    this.currentStep = 1;
    this.renderStep();
    this.bindEvents();
  }

  private renderStep(): void {
    if (!this.isActive) return;
    this.cleanupDom();

    if (this.currentStep === 1) {
      this.renderStep1();
    } else if (this.currentStep === 2) {
      this.renderStep2();
    } else if (this.currentStep === 3) {
      this.renderStep3();
    }
  }

  private renderStep1(): void {
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.className = 'tutorial-box step-1';
    tooltip.innerHTML = `
      <div class="tutorial-header">
        <span class="tutorial-badge">TUTORIAL 1/3</span>
        <button id="tutorial-skip-btn" class="tutorial-skip-btn" title="Pular Tutorial">Pular ✕</button>
      </div>
      <p class="tutorial-text">
        👋 <strong>Bem-vindo ao Oh My TD!</strong><br>
        Selecione a <strong>Arqueira</strong> na barra inferior e toque/clique no <strong>terreno</strong> para posicionar sua primeira defesa!
      </p>
    `;

    const skipBtn = tooltip.querySelector('#tutorial-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipTutorial();
      });
    }

    document.body.appendChild(tooltip);
    this.tooltipEl = tooltip;
  }

  private renderStep2(): void {
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.className = 'tutorial-box step-2';
    tooltip.innerHTML = `
      <div class="tutorial-header">
        <span class="tutorial-badge">TUTORIAL 2/3</span>
        <button id="tutorial-skip-btn" class="tutorial-skip-btn" title="Pular Tutorial">Pular ✕</button>
      </div>
      <p class="tutorial-text">
        ⚔️ <strong>Defesa posicionada!</strong><br>
        Clique no botão <strong>Iniciar Onda</strong> (ou aperte <strong>Enter</strong>) para iniciar o ataque dos invasores!
      </p>
    `;

    const skipBtn = tooltip.querySelector('#tutorial-skip-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipTutorial();
      });
    }

    document.body.appendChild(tooltip);
    this.tooltipEl = tooltip;
  }

  private renderStep3(): void {
    const tooltip = document.createElement('div');
    tooltip.id = 'tutorial-tooltip';
    tooltip.className = 'tutorial-box step-3';
    tooltip.innerHTML = `
      <div class="tutorial-header">
        <span class="tutorial-badge">DICA ESTRATÉGICA</span>
        <button id="tutorial-ok-btn" class="tutorial-ok-btn">Entendido! 👍</button>
      </div>
      <p class="tutorial-text">
        ✨ <strong>Evolução e Terreno:</strong><br>
        Torres no <strong>Nível 3</strong> desbloqueiam <strong>Especializações</strong> únicas. Terrenos especiais concedem bônus de dano!
      </p>
    `;

    const okBtn = tooltip.querySelector('#tutorial-ok-btn');
    if (okBtn) {
      okBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.completeTutorial();
      });
    }

    document.body.appendChild(tooltip);
    this.tooltipEl = tooltip;

    // Auto-dismiss após 7 segundos
    setTimeout(() => {
      if (this.currentStep === 3) {
        this.completeTutorial();
      }
    }, 7000);
  }

  private bindEvents(): void {
    const bus = EventBus.getInstance();

    const onTowerBuild = () => {
      if (this.isActive && this.currentStep === 1) {
        this.currentStep = 2;
        this.renderStep();
      }
    };

    const onWaveStart = () => {
      if (this.isActive && this.currentStep === 2) {
        this.currentStep = 3;
        this.renderStep();
      }
    };

    bus.on('tower:build', onTowerBuild);
    bus.on('wave:change', onWaveStart);

    this.unsubscribers.push(() => {
      bus.off('tower:build', onTowerBuild);
      bus.off('wave:change', onWaveStart);
    });
  }

  public skipTutorial(): void {
    this.completeTutorial();
  }

  public completeTutorial(): void {
    this.isActive = false;
    this.currentStep = 0;
    try {
      localStorage.setItem(this.TUTORIAL_KEY, 'true');
    } catch {
      // Ignore
    }
    this.cleanupDom();
    this.destroy();
  }

  private cleanupDom(): void {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
    if (this.highlightEl) {
      this.highlightEl.remove();
      this.highlightEl = null;
    }
  }

  public destroy(): void {
    this.cleanupDom();
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
