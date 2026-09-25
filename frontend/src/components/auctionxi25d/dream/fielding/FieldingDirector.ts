import * as THREE from 'three';
import type {AuthoritativeBallEvent, Role} from '../core/types';
import type {BallTrajectory} from '../ball/trajectory';
import type {PlayerDirector} from '../players/rig';
import type {DreamCameraDirector} from '../camera/director';

export type FieldingSequence = 'FIELD' | 'BOUNDARY' | 'CATCH' | 'RUN_OUT';

type FieldingActorState = 'REACT' | 'SPRINT' | 'DIVE' | 'PICKUP' | 'THROW' | 'CATCH' | 'MISS' | 'CELEBRATE';

interface FieldingActor {
  id: string;
  role: Role;
  home: THREE.Vector3;
  targetOffset: THREE.Vector3;
  startOffset: THREE.Vector3;
  state: FieldingActorState;
  chaseDelay: number;
  chaseDuration: number;
  holdDuration: number;
  returnDuration: number;
  targetReached: boolean;
  completed: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function normalise(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function hashSeed(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random01(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function shotVector(shot: string | undefined, seed: number): THREE.Vector3 {
  const s = normalise(shot);
  const jitter = random01(seed, 3) * 0.16 - 0.08;
  if (s.includes('cut') || s.includes('point')) return new THREE.Vector3(1, 0, -0.18 + jitter).normalize();
  if (s.includes('pull')) return new THREE.Vector3(-1, 0, -0.1 + jitter).normalize();
  if (s.includes('flick')) return new THREE.Vector3(-0.8, 0, 0.35 + jitter).normalize();
  if (s.includes('loft')) return new THREE.Vector3(jitter, 0, -1).normalize();
  if (s.includes('defence') || s.includes('defensive')) return new THREE.Vector3(jitter, 0, 0.72).normalize();
  return new THREE.Vector3(jitter, 0, -1).normalize();
}

function isCaughtWicket(event: AuthoritativeBallEvent): boolean {
  if (event.outcome !== 'WICKET') return false;
  const wicket = normalise(event.wicketType);
  return wicket.includes('caught') || wicket.includes('catch') || wicket.includes('edge catch') || Boolean(wicket === 'edge');
}

function isRunOut(event: AuthoritativeBallEvent): boolean {
  return event.outcome === 'RUN_OUT' || normalise(event.wicketType).includes('run out');
}

function sequenceFor(event: AuthoritativeBallEvent): FieldingSequence {
  if (isRunOut(event)) return 'RUN_OUT';
  if (isCaughtWicket(event)) return 'CATCH';
  if (event.outcome === 'FOUR' || event.outcome === 'SIX') return 'BOUNDARY';
  return 'FIELD';
}

function fieldTarget(event: AuthoritativeBallEvent, trajectory: BallTrajectory): THREE.Vector3 {
  const seed = hashSeed(`${event.ballId}|${event.shot ?? ''}|${event.outcome}|${event.wicketType ?? ''}`);
  const sequence = sequenceFor(event);

  if (sequence === 'RUN_OUT') {
    const wicket = normalise(event.wicketType);
    const z = wicket.includes('non') ? -7.5 : 8.2;
    return new THREE.Vector3((random01(seed, 8) - 0.5) * 0.22, 0, z);
  }

  if (sequence === 'CATCH') {
    const direction = shotVector(event.shot, seed);
    const distance = normalise(event.shot).includes('edge') ? 3.6 : 5.2 + random01(seed, 12) * 2.0;
    const height = event.batterIntent === 'LOFT' || event.outcome === 'WICKET' ? 2.0 + random01(seed, 19) * 1.8 : 1.35;
    return trajectory.contact.clone().addScaledVector(direction, distance).setY(height);
  }

  const result = trajectory.end.clone();
  result.x = clamp(result.x, -22, 22);
  result.z = clamp(result.z, -24, 24);
  if (sequence === 'BOUNDARY') {
    const radial = new THREE.Vector2(result.x, result.z);
    if (radial.length() < 14) {
      radial.setLength(14.5 + random01(seed, 27) * 3.0);
      result.x = radial.x;
      result.z = radial.y;
    }
    result.y = event.outcome === 'SIX' ? 2.4 : 0.12;
  }
  return result;
}

function distance2D(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class FieldingDirector {
  private actors: FieldingActor[] = [];
  private sequence: FieldingSequence = 'FIELD';
  private started = false;
  private finished = false;
  private cameraTriggered = false;
  private target = new THREE.Vector3();

  constructor(
    private readonly players: PlayerDirector,
    private readonly camera?: DreamCameraDirector,
  ) {}

  begin(event: AuthoritativeBallEvent, trajectory: BallTrajectory): void {
    this.reset();
    this.sequence = sequenceFor(event);
    this.target.copy(fieldTarget(event, trajectory));
    this.started = true;

    const candidates = (event.fielders ?? [])
      .map((fielder) => ({
        ...fielder,
        role: (fielder.role ?? 'FIELDER') as Role,
        home: new THREE.Vector3(fielder.x, 0, fielder.z),
      }))
      .filter((fielder) => fielder.role === 'FIELDER' || fielder.role === 'KEEPER')
      .sort((a, b) => distance2D(a.home, this.target) - distance2D(b.home, this.target));

    if (!candidates.length) {
      this.finished = true;
      return;
    }

    const primary = candidates[0];
    const seed = hashSeed(`${event.ballId}|${primary.id}|${this.sequence}`);
    const primaryDistance = distance2D(primary.home, this.target);

    if (this.sequence === 'CATCH') {
      this.actors.push(this.actorFor(primary.id, primary.role, primary.home, this.target, {
        chaseDelay: 0.42,
        chaseDuration: clamp(0.48 + primaryDistance * 0.055, 0.58, 1.0),
        holdDuration: 0.34,
        returnDuration: 0.5,
        state: primaryDistance > 6.0 ? 'DIVE' : 'CATCH',
      }));
      candidates.slice(1, 4).forEach((fielder, index) => {
        this.actors.push(this.actorFor(fielder.id, fielder.role, fielder.home, this.target, {
          chaseDelay: 0.36 + index * 0.04,
          chaseDuration: 0.75 + index * 0.06,
          holdDuration: 0.25,
          returnDuration: 0.45,
          state: 'REACT',
        }));
      });
      this.camera?.set('FIELDING_VIEW');
      this.cameraTriggered = true;
      return;
    }

    if (this.sequence === 'RUN_OUT') {
      this.actors.push(this.actorFor(primary.id, primary.role, primary.home, this.target, {
        chaseDelay: 0.26,
        chaseDuration: clamp(0.42 + primaryDistance * 0.06, 0.52, 0.95),
        holdDuration: 0.28,
        returnDuration: 0.48,
        state: 'PICKUP',
      }));
      const keeper = candidates.find((fielder) => fielder.role === 'KEEPER' && fielder.id !== primary.id);
      if (keeper) {
        this.actors.push(this.actorFor(keeper.id, keeper.role, keeper.home, new THREE.Vector3(0, 0, keeper.home.z), {
          chaseDelay: 0.6,
          chaseDuration: 0.65,
          holdDuration: 0.5,
          returnDuration: 0.45,
          state: 'CATCH',
        }));
      }
      candidates.slice(1, 3).forEach((fielder, index) => {
        if (fielder.id === keeper?.id) return;
        this.actors.push(this.actorFor(fielder.id, fielder.role, fielder.home, this.target, {
          chaseDelay: 0.4 + index * 0.05,
          chaseDuration: 0.8,
          holdDuration: 0.2,
          returnDuration: 0.4,
          state: 'REACT',
        }));
      });
      this.camera?.set('FIELDING_VIEW');
      this.cameraTriggered = true;
      return;
    }

    if (this.sequence === 'BOUNDARY') {
      this.actors.push(this.actorFor(primary.id, primary.role, primary.home, this.target, {
        chaseDelay: 0.25,
        chaseDuration: clamp(0.6 + primaryDistance * 0.06, 0.72, 1.18),
        holdDuration: event.outcome === 'SIX' ? 0.4 : 0.28,
        returnDuration: 0.55,
        state: 'SPRINT',
      }));
      candidates.slice(1, 3).forEach((fielder, index) => {
        this.actors.push(this.actorFor(fielder.id, fielder.role, fielder.home, this.target, {
          chaseDelay: 0.35 + index * 0.05,
          chaseDuration: 0.95 + index * 0.08,
          holdDuration: 0.2,
          returnDuration: 0.5,
          state: 'SPRINT',
        }));
      });
      return;
    }

    const spread = new THREE.Vector3(
      (random01(seed, 41) - 0.5) * 0.7,
      0,
      (random01(seed, 43) - 0.5) * 0.7,
    );
    const target = this.target.clone().add(spread);
    this.actors.push(this.actorFor(primary.id, primary.role, primary.home, target, {
      chaseDelay: 0.28,
      chaseDuration: clamp(0.5 + primaryDistance * 0.055, 0.62, 1.1),
      holdDuration: 0.35,
      returnDuration: 0.48,
      state: primaryDistance > 5.5 ? 'SPRINT' : 'PICKUP',
    }));
    candidates.slice(1, 3).forEach((fielder, index) => {
      this.actors.push(this.actorFor(fielder.id, fielder.role, fielder.home, target, {
        chaseDelay: 0.42 + index * 0.05,
        chaseDuration: 0.85 + index * 0.05,
        holdDuration: 0.24,
        returnDuration: 0.42,
        state: 'REACT',
      }));
    });
  }

  update(elapsed: number): void {
    if (!this.started || this.finished) return;
    let allDone = true;

    this.actors.forEach((actor) => {
      if (actor.completed) return;
      allDone = false;
      const local = elapsed - actor.chaseDelay;

      if (local < 0) {
        this.players.state(actor.id, actor.role, 'REACT');
        return;
      }

      if (local <= actor.chaseDuration) {
        const q = clamp(local / actor.chaseDuration, 0, 1);
        const eased = q * q * (3 - 2 * q);
        const offset = actor.targetOffset.clone().lerp(actor.startOffset, 1 - eased);
        this.players.offset(actor.id, offset);
        this.players.state(actor.id, actor.role, actor.state === 'CATCH' ? 'SPRINT' : actor.state);
        return;
      }

      const holdTime = local - actor.chaseDuration;
      if (holdTime <= actor.holdDuration) {
        this.players.offset(actor.id, actor.targetOffset);
        if (this.sequence === 'CATCH') {
          this.players.state(actor.id, actor.role, actor.state === 'DIVE' ? 'DIVE' : 'CATCH');
        } else if (this.sequence === 'RUN_OUT') {
          if (actor.state === 'PICKUP') this.players.state(actor.id, actor.role, 'THROW');
          else if (actor.state === 'CATCH') this.players.state(actor.id, actor.role, 'CATCH');
          else this.players.state(actor.id, actor.role, 'REACT');
        } else if (this.sequence === 'BOUNDARY') {
          this.players.state(actor.id, actor.role, 'REACT');
        } else {
          this.players.state(actor.id, actor.role, 'PICKUP');
        }

        if (!this.cameraTriggered && (this.sequence === 'CATCH' || this.sequence === 'RUN_OUT')) {
          this.camera?.set('FIELDING_VIEW');
          this.cameraTriggered = true;
        }
        return;
      }

      const returnTime = holdTime - actor.holdDuration;
      if (returnTime <= actor.returnDuration) {
        const q = clamp(returnTime / actor.returnDuration, 0, 1);
        const eased = q * q * (3 - 2 * q);
        const offset = actor.targetOffset.clone().multiplyScalar(1 - eased);
        this.players.offset(actor.id, offset);
        this.players.state(actor.id, actor.role, 'REACT');
        return;
      }

      this.players.offset(actor.id, new THREE.Vector3());
      if (this.sequence === 'CATCH' || this.sequence === 'RUN_OUT') {
        this.players.state(actor.id, actor.role, 'CELEBRATE');
      } else {
        this.players.state(actor.id, actor.role, 'READY');
      }
      actor.completed = true;
    });

    if (allDone) {
      this.finished = true;
    }
  }

  reset(): void {
    this.actors.forEach((actor) => {
      this.players.offset(actor.id, new THREE.Vector3());
      this.players.state(actor.id, actor.role, 'READY');
    });
    this.actors = [];
    this.sequence = 'FIELD';
    this.started = false;
    this.finished = false;
    this.cameraTriggered = false;
    this.target.set(0, 0, 0);
  }

  getSequence(): FieldingSequence {
    return this.sequence;
  }

  private actorFor(
    id: string,
    role: Role,
    home: THREE.Vector3,
    target: THREE.Vector3,
    options: Pick<FieldingActor, 'state' | 'chaseDelay' | 'chaseDuration' | 'holdDuration' | 'returnDuration'>,
  ): FieldingActor {
    return {
      id,
      role,
      home: home.clone(),
      startOffset: new THREE.Vector3(),
      targetOffset: new THREE.Vector3(target.x - home.x, target.y - home.y, target.z - home.z),
      state: options.state,
      chaseDelay: options.chaseDelay,
      chaseDuration: options.chaseDuration,
      holdDuration: options.holdDuration,
      returnDuration: options.returnDuration,
      targetReached: false,
      completed: false,
    };
  }
}
