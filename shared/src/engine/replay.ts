import type { Network, SimState } from "./simulator.js";
import { initSim, stepSim, getSimLive } from "./simulator.js";
import type { SimLive } from "../schemas/live.js";
import { IncidentRunner, type IncidentSchedule, type IncidentEvent } from "./incidents.js";
import type { EtaHistory } from "./eta.js";

export interface ReplayTape {
  seed: number;
  hour: number;
  dtSec: number;
  durationSec: number;
  frames: SimLive[];
}

/**
 * Precomputes the entire scripted simulation timeline into a memory tape (M3-24).
 * Pure function: deterministic given seed and network. Precomputation requires zero network/Firestore calls.
 */
export function generateReplayTape(
  network: Network,
  hour = 20,
  durationSec = 600, // 10 minutes default
  dtSec = 2,
  seed = 20261023,
  incidentSchedule?: IncidentSchedule | IncidentEvent[],
  hist?: EtaHistory,
): ReplayTape {
  const runner = new IncidentRunner(incidentSchedule);
  let state: SimState = initSim(network, hour, seed, "replay");

  const frames: SimLive[] = [];
  const totalSteps = Math.floor(durationSec / dtSec);

  for (let step = 0; step <= totalSteps; step++) {
    const elapsedSec = step * dtSec;
    const { state: stateWithIncidents, alerts } = runner.apply(state, elapsedSec, network);

    const frame = getSimLive(stateWithIncidents, hour, network, hist, alerts);
    frames.push(frame);

    if (step < totalSteps) {
      state = stepSim(stateWithIncidents, dtSec, network, hour);
    }
  }

  return {
    seed,
    hour,
    dtSec,
    durationSec,
    frames,
  };
}

/**
 * Client-side ReplayController for tape playback (M3-25).
 * Operates purely in-memory with zero Firestore writes.
 */
export class ReplayController {
  private tape: ReplayTape;
  private currentFrameIndex = 0;
  private isPlaying = false;
  private speedMultiplier = 1;

  constructor(tape: ReplayTape) {
    this.tape = tape;
  }

  public play(): void {
    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
  }

  public togglePlay(): boolean {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  public setSpeed(speed: 1 | 2): void {
    this.speedMultiplier = speed;
  }

  public seek(targetSec: number): SimLive {
    const clampedSec = Math.max(0, Math.min(this.tape.durationSec, targetSec));
    this.currentFrameIndex = Math.min(Math.floor(clampedSec / this.tape.dtSec), this.tape.frames.length - 1);
    return this.getCurrentFrame();
  }

  public stepForward(): SimLive {
    if (this.currentFrameIndex < this.tape.frames.length - 1) {
      this.currentFrameIndex += this.speedMultiplier;
      if (this.currentFrameIndex >= this.tape.frames.length) {
        this.currentFrameIndex = this.tape.frames.length - 1;
        this.isPlaying = false;
      }
    } else {
      this.isPlaying = false;
    }
    return this.getCurrentFrame();
  }

  public getCurrentFrame(): SimLive {
    const frame = this.tape.frames[this.currentFrameIndex];
    if (!frame) {
      throw new Error(`Invalid frame index ${this.currentFrameIndex}`);
    }
    return frame;
  }

  public getCurrentTimeSec(): number {
    return this.currentFrameIndex * this.tape.dtSec;
  }

  public getStatus(): {
    isPlaying: boolean;
    currentSec: number;
    totalSec: number;
    speed: number;
    frameIndex: number;
    totalFrames: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentSec: this.getCurrentTimeSec(),
      totalSec: this.tape.durationSec,
      speed: this.speedMultiplier,
      frameIndex: this.currentFrameIndex,
      totalFrames: this.tape.frames.length,
    };
  }
}
