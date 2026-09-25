import * as THREE from 'three';
import type { AuthoritativeBallEvent, Outcome } from '../core/types';

type UmpireSignal = 'IDLE' | 'FOUR' | 'SIX' | 'WICKET' | 'WIDE' | 'NO_BALL' | 'RUN_OUT';

interface UmpireRig {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  baseY: number;
  signal: UmpireSignal;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function signalFor(outcome: Outcome): UmpireSignal {
  switch (outcome) {
    case 'FOUR': return 'FOUR';
    case 'SIX': return 'SIX';
    case 'WICKET': return 'WICKET';
    case 'RUN_OUT': return 'RUN_OUT';
    case 'WIDE': return 'WIDE';
    case 'NO_BALL': return 'NO_BALL';
    default: return 'IDLE';
  }
}

export class UmpireDirector {
  readonly group = new THREE.Group();
  private readonly umpires: UmpireRig[] = [];
  private elapsed = 0;
  private signalTime = 0;

  constructor() {
    this.group.name = 'auction-xi-v4-9-officials';
    this.buildUmpire('bowler-end-umpire', new THREE.Vector3(2.6, 0, -6.9), Math.PI);
    this.buildUmpire('square-leg-umpire', new THREE.Vector3(6.25, 0, 7.0), -Math.PI / 2);
  }

  private buildUmpire(name: string, position: THREE.Vector3, rotationY: number): void {
    const root = new THREE.Group();
    root.name = name;
    root.position.copy(position);
    root.rotation.y = rotationY;

    const shirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.16, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.78 }),
    );
    shirt.position.y = 0.32;

    const trousers = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.13, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x232933, roughness: 0.85 }),
    );
    trousers.position.y = -0.14;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 8, 7),
      new THREE.MeshStandardMaterial({ color: 0x9c745a, roughness: 0.95 }),
    );
    head.position.y = 0.72;

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.075, 8),
      new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.72 }),
    );
    cap.position.y = 0.81;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.14, 0.48, 0);
    const leftArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.42, 0.085),
      new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.78 }),
    );
    leftArmMesh.position.y = -0.19;
    leftArm.add(leftArmMesh);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.14, 0.48, 0);
    const rightArmMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.42, 0.085),
      new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.78 }),
    );
    rightArmMesh.position.y = -0.19;
    rightArm.add(rightArmMesh);

    root.add(trousers, shirt, head, cap, leftArm, rightArm);
    this.group.add(root);
    this.umpires.push({ root, leftArm, rightArm, baseY: position.y, signal: 'IDLE' });
  }

  onBall(event: AuthoritativeBallEvent): void {
    this.elapsed = 0;
    this.signalTime = this.durationFor(event.outcome);
    const signal = signalFor(event.outcome);

    this.umpires[0].signal = signal === 'FOUR' || signal === 'SIX' || signal === 'RUN_OUT' ? 'IDLE' : signal;
    this.umpires[1].signal = signal === 'WIDE' || signal === 'NO_BALL' || signal === 'WICKET' || signal === 'RUN_OUT' ? signal : signal === 'FOUR' || signal === 'SIX' ? signal : 'IDLE';
  }

  update(dt: number): void {
    this.elapsed += Math.max(0, dt);
    const remaining = clamp(this.signalTime - this.elapsed, 0, this.signalTime);
    const hold = this.signalTime > 0 ? clamp(remaining / this.signalTime, 0, 1) : 0;
    this.umpires.forEach((umpire, index) => {
      const target = this.poseFor(umpire.signal, index, hold);
      umpire.leftArm.rotation.z = THREE.MathUtils.damp(umpire.leftArm.rotation.z, target.left, 12, Math.max(0, dt));
      umpire.rightArm.rotation.z = THREE.MathUtils.damp(umpire.rightArm.rotation.z, target.right, 12, Math.max(0, dt));
      umpire.root.position.y = umpire.baseY + Math.sin(this.elapsed * 3.6 + index) * 0.008;
    });
  }

  reset(): void {
    this.elapsed = 0;
    this.signalTime = 0;
    this.umpires.forEach((umpire) => { umpire.signal = 'IDLE'; });
  }

  private durationFor(outcome: Outcome): number {
    switch (outcome) {
      case 'SIX':
      case 'FOUR': return 1.35;
      case 'WICKET':
      case 'RUN_OUT': return 1.55;
      case 'WIDE':
      case 'NO_BALL': return 1.20;
      default: return 0.42;
    }
  }

  private poseFor(signal: UmpireSignal, index: number, hold: number): { left: number; right: number } {
    const easedHold = hold * hold * (3 - 2 * hold);
    const decay = 1 - easedHold;
    const squareLeg = index === 1;

    switch (signal) {
      case 'SIX':
        return { left: -1.15 * easedHold, right: 1.15 * easedHold };
      case 'FOUR':
        return squareLeg ? { left: 0, right: 1.05 * easedHold } : { left: 0, right: 0 };
      case 'WICKET':
        return { left: -1.15 * easedHold, right: 0 };
      case 'RUN_OUT':
        return squareLeg ? { left: -1.15 * easedHold, right: 0 } : { left: 0, right: 0 };
      case 'WIDE':
        return !squareLeg ? { left: -1.05 * easedHold, right: 0 } : { left: 0, right: 0 };
      case 'NO_BALL':
        return !squareLeg ? { left: 1.02 * easedHold, right: 0 } : { left: 0, right: 0 };
      default:
        return { left: -0.10 * decay, right: 0.10 * decay };
    }
  }
}
