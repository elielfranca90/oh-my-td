import { describe, expect, it } from 'vitest';
import { ThreeRenderer } from '../src/engine/ThreeRenderer';
import { AudioManager } from '../src/engine/AudioManager';

describe('Shaders & Web Audio Tension Engine Tests', () => {
  it('should set and clamp vignette intensity in ThreeRenderer', () => {
    const renderer = new ThreeRenderer(840, 600);
    expect(renderer.vignetteIntensity).toBe(0.0);

    renderer.setVignetteIntensity(0.75);
    expect(renderer.vignetteIntensity).toBe(0.75);

    renderer.setVignetteIntensity(1.5);
    expect(renderer.vignetteIntensity).toBe(1.0);
  });

  it('should update tension level in AudioManager', () => {
    const audio = new AudioManager();
    expect(audio.tensionLevel).toBe(0.0);

    audio.setTensionLevel(0.8);
    expect(audio.tensionLevel).toBe(0.8);

    audio.setTensionLevel(-0.5);
    expect(audio.tensionLevel).toBe(0.0);
  });
});
