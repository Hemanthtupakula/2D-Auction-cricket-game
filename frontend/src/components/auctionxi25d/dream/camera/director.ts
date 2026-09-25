import * as THREE from 'three';
import { easeInOut } from '../core/easing';
import type { AuthoritativeBallEvent } from '../core/types';
import type { BallTrajectory } from '../ball/trajectory';
import type { FieldingSequence } from '../fielding/FieldingDirector';
import {
  buildCinematicPlan,
  focusPointFor,
  type CinematicCue,
  type CinematicTimings,
  type CinematicFocus,
} from './cinematic';

export type DreamCamera =
  | 'BATTER_VIEW'
  | 'BOWLER_VIEW'
  | 'DELIVERY_TRACK'
  | 'CONTACT_VIEW'
  | 'BALL_FOLLOW'
  | 'FIELDING_VIEW'
  | 'BOUNDARY_VIEW'
  | 'WICKET_VIEW'
  | 'CELEBRATION_VIEW'
  | 'RESET_VIEW';

type CameraMode = 'MANUAL' | 'AUTO';

interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

interface DynamicFocus {
  ball?: THREE.Vector3;
  contact?: THREE.Vector3;
  fieldTarget?: THREE.Vector3;
  batter?: THREE.Vector3;
  wicket?: THREE.Vector3;
  boundary?: THREE.Vector3;
}

interface CameraAutoContext {
  elapsed: number;
  points: DynamicFocus;
}

export class DreamCameraDirector {
  state: DreamCamera = 'BATTER_VIEW';
  private mode: CameraMode = 'AUTO';
  private from = new THREE.Vector3(0, 4.2, 10.5);
  private to = new THREE.Vector3(0, 4.2, 10.5);
  private lookFrom = new THREE.Vector3(0, 0.3, 0);
  private lookTo = new THREE.Vector3(0, 0.3, 0);
  private progress = 1;
  private currentFov = 48;
  private targetFov = 48;
  private cues: CinematicCue[] = [];
  private activeFocus: CinematicFocus = 'BATTER';
  private lastCueKey = '';

  set(state: DreamCamera, instant = false): void {
    this.mode = 'AUTO';
    this.transitionTo(state, instant);
  }

  setManual(state: DreamCamera, instant = false): void {
    this.mode = 'MANUAL';
    this.transitionTo(state, instant);
  }

  clearManualOverride(): void {
    this.mode = 'AUTO';
    this.progress = 1;
  }

  beginBall(
    event: AuthoritativeBallEvent,
    timings: CinematicTimings,
    trajectory: BallTrajectory,
    fieldingSequence: FieldingSequence,
    fieldTarget?: THREE.Vector3,
  ): void {
    this.mode = 'AUTO';
    this.cues = buildCinematicPlan({ event, timings, trajectory, fieldingSequence });
    this.lastCueKey = '';
    this.activeFocus = 'BATTER';
    this.transitionTo('BOWLER_VIEW', true);
    if (fieldTarget) {
      this.lookTo.copy(fieldTarget);
    }
  }

  update(
    cam: THREE.PerspectiveCamera,
    dt: number,
    autoContext?: CameraAutoContext,
  ): void {
    if (this.mode === 'AUTO' && autoContext && this.cues.length) {
      const cue = this.cueAt(autoContext.elapsed);
      if (cue) {
        const cueKey = `${cue.state}:${cue.start}`;
        if (cueKey !== this.lastCueKey) {
          this.activeFocus = cue.focus;
          this.transitionTo(cue.state);
          this.lastCueKey = cueKey;
        }
        const dynamicFocus = focusPointFor(cue.focus, autoContext.points);
        this.lookTo.lerp(dynamicFocus, Math.min(1, dt * 9));
      }
    }

    this.progress = Math.min(1, this.progress + Math.max(0, dt) * 3.2);
    const t = easeInOut(this.progress);
    cam.position.lerpVectors(this.from, this.to, t);
    this.lookFrom.lerpVectors(this.lookFrom, this.lookTo, Math.min(1, dt * 4.5));
    cam.lookAt(this.lookFrom);
    this.currentFov = THREE.MathUtils.damp(this.currentFov, this.targetFov, 8, Math.max(0, dt));
    cam.fov = this.currentFov;
    cam.updateProjectionMatrix();
  }

  get modeName(): CameraMode {
    return this.mode;
  }

  get focusName(): CinematicFocus {
    return this.activeFocus;
  }

  private cueAt(elapsed: number): CinematicCue | undefined {
    for (let i = 0; i < this.cues.length; i += 1) {
      const cue = this.cues[i];
      if (elapsed >= cue.start && elapsed <= cue.end) return cue;
    }
    return this.cues[this.cues.length - 1];
  }

  private transitionTo(state: DreamCamera, instant = false): void {
    this.state = state;
    const pose = this.presets(state);
    this.from.copy(this.to);
    this.to.copy(pose.pos);
    this.lookFrom.copy(this.lookTo);
    this.lookTo.copy(pose.look);
    this.targetFov = pose.fov;
    this.progress = instant ? 1 : 0;
  }

  presets(state: DreamCamera): CameraPose {
    switch (state) {
      case 'BOWLER_VIEW':
        return { pos: new THREE.Vector3(0, 3.5, -10.5), look: new THREE.Vector3(0, 0.75, 2), fov: 48 };
      case 'DELIVERY_TRACK':
        return { pos: new THREE.Vector3(3.9, 2.85, -4.0), look: new THREE.Vector3(0, 0.7, 2.5), fov: 52 };
      case 'CONTACT_VIEW':
        return { pos: new THREE.Vector3(-3.6, 2.55, 5.8), look: new THREE.Vector3(0, 0.9, 7.2), fov: 54 };
      case 'BALL_FOLLOW':
        return { pos: new THREE.Vector3(4.8, 3.35, 4.4), look: new THREE.Vector3(0, 0.75, -1), fov: 56 };
      case 'FIELDING_VIEW':
        return { pos: new THREE.Vector3(6.8, 5.8, 6.8), look: new THREE.Vector3(0, 0.9, 0), fov: 50 };
      case 'BOUNDARY_VIEW':
        return { pos: new THREE.Vector3(9.2, 4.0, 1.8), look: new THREE.Vector3(0, 1.2, -3.0), fov: 58 };
      case 'WICKET_VIEW':
        return { pos: new THREE.Vector3(-4.5, 3.1, 7.0), look: new THREE.Vector3(0, 1.0, 8.0), fov: 52 };
      case 'CELEBRATION_VIEW':
        return { pos: new THREE.Vector3(4.0, 3.7, 5.3), look: new THREE.Vector3(0, 1.0, 2.8), fov: 54 };
      case 'RESET_VIEW':
      case 'BATTER_VIEW':
      default:
        return { pos: new THREE.Vector3(0, 4.2, 10.5), look: new THREE.Vector3(0, 0.65, 0), fov: 48 };
    }
  }
}
