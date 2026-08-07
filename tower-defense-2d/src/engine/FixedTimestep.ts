/**
 * Fixed timestep accumulator.
 *
 * The whole simulation advances in discrete steps of exactly `stepMs`. One step is
 * frame-equivalent to a legacy 60 fps frame (1000/60 ms), so every frame-counting
 * balance number already tuned in the game (cooldownTimer, slowTimer, particle life,
 * ...) keeps its original meaning while the simulation becomes independent of the
 * monitor refresh rate.
 *
 * `speedMultiplier` scales how much simulated time a real frame is worth, so 2x/4x
 * genuinely accelerate the simulation instead of only increasing enemy density.
 *
 * The raw delta is clamped so a tab returning from background cannot flush dozens of
 * seconds of simulation (which used to zero every spell cooldown at once).
 */
export const FIXED_STEP_MS = 1000 / 60;

export class FixedTimestep {
  private accumulatorMs = 0;

  public readonly stepMs: number;
  public readonly maxDeltaMs: number;
  public readonly maxStepsPerFrame: number;

  constructor(stepMs = FIXED_STEP_MS, maxDeltaMs = 100, maxStepsPerFrame = 30) {
    this.stepMs = stepMs;
    this.maxDeltaMs = maxDeltaMs;
    this.maxStepsPerFrame = maxStepsPerFrame;
  }

  /**
   * Feeds one real frame delta into the accumulator and runs as many fixed steps as
   * it affords. Returns how many steps were executed.
   */
  public advance(rawDeltaMs: number, speedMultiplier: number, step: (stepMs: number) => void): number {
    const clampedDelta = Math.min(Math.max(0, rawDeltaMs), this.maxDeltaMs);
    this.accumulatorMs += clampedDelta * Math.max(0, speedMultiplier);

    let steps = 0;
    while (this.accumulatorMs >= this.stepMs && steps < this.maxStepsPerFrame) {
      this.accumulatorMs -= this.stepMs;
      steps++;
      step(this.stepMs);
    }

    // Backlog we could not afford this frame is dropped instead of snowballing.
    if (steps >= this.maxStepsPerFrame) {
      this.accumulatorMs = 0;
    }

    return steps;
  }

  public reset() {
    this.accumulatorMs = 0;
  }

  public get pendingMs(): number {
    return this.accumulatorMs;
  }
}
