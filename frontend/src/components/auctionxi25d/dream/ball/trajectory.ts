import * as THREE from 'three';
import type {AuthoritativeBallEvent, DeliveryKind, BatterIntent, Outcome} from '../core/types';

export interface BallTrajectory {
  start: THREE.Vector3;
  bounce: THREE.Vector3;
  contact: THREE.Vector3;
  end: THREE.Vector3;
  bounceTime: number;
  contactTime: number;
  totalDuration: number;
  bounceArc: number;
  postContactArc: number;
  lateralCurve: number;
  spin: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hashSeed(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function random01(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function directionForShot(shot: string, seed: number): {x: number; z: number} {
  const normalized = shot.toUpperCase();
  const jitter = random01(seed, 11) * 0.34 - 0.17;
  if (normalized.includes('CUT')) return {x: 0.92 + jitter, z: 0.42};
  if (normalized.includes('PULL')) return {x: -0.88 + jitter, z: 0.56};
  if (normalized.includes('LOFT')) return {x: jitter * 1.8, z: 1.0};
  if (normalized.includes('DEFENCE') || normalized.includes('DEFENSIVE')) return {x: jitter * 0.35, z: -0.55};
  if (normalized.includes('LEAVE')) return {x: jitter * 0.2, z: 0.12};
  return {x: jitter * 0.55, z: 0.94};
}

function outcomeDistance(outcome: Outcome): number {
  switch (outcome) {
    case 'SIX': return 18.5;
    case 'FOUR': return 12.8;
    case 'THREE': return 9.8;
    case 'TWO': return 7.2;
    case 'ONE': return 5.0;
    case 'WIDE': return 4.8;
    case 'NO_BALL': return 5.0;
    case 'RUN_OUT': return 4.0;
    case 'WICKET': return 1.2;
    default: return 2.0;
  }
}

function deliveryBounceZ(delivery: DeliveryKind, length?: string): number {
  const normalized = String(length ?? '').toUpperCase();
  if (delivery === 'BOUNCER' || normalized.includes('SHORT')) return -1.0;
  if (delivery === 'YORKER' || normalized.includes('FULL')) return 5.55;
  if (normalized.includes('GOOD')) return 1.95;
  if (delivery === 'SLOWER') return 2.15;
  return 1.55;
}

function deliveryLateralCurve(delivery: DeliveryKind): number {
  switch (delivery) {
    case 'SWING': return 0.56;
    case 'CUTTER': return 0.32;
    case 'BOUNCER': return 0.20;
    case 'YORKER': return 0.14;
    case 'SLOWER': return 0.11;
    default: return 0.08;
  }
}

function postContactArc(outcome: Outcome, intent: BatterIntent): number {
  if (outcome === 'SIX') return 5.8;
  if (intent === 'LOFT') return 3.0;
  if (outcome === 'FOUR') return 0.42;
  if (outcome === 'WICKET' || outcome === 'RUN_OUT') return 0.18;
  return 0.12;
}

function clampTargetX(x?: number): number {
  return clamp(typeof x === 'number' ? x : 0, -1.75, 1.75);
}

export function resolveBallTrajectory(event: AuthoritativeBallEvent): BallTrajectory {
  const seed = hashSeed([
    event.ballId,
    event.deliveryKind,
    event.batterIntent,
    event.timingBand,
    event.outcome,
    event.speed,
    event.line ?? '',
    event.length ?? '',
    event.shot ?? '',
  ].join('|'));

  const speed = clamp(Number(event.speed) || 138, 90, 165);
  const speedFactor = clamp((speed - 105) / 60, 0, 1);
  const delivery = event.deliveryKind;
  const intent = event.batterIntent;
  const outcome = event.outcome;

  const start = new THREE.Vector3(0, 0.54, -8.25);
  const bounceX = clampTargetX(event.target && 'x' in event.target ? event.target.x : undefined);
  const bounceZ = deliveryBounceZ(delivery, event.length);
  const lateral = deliveryLateralCurve(delivery);
  const swingSign = random01(seed, 3) > 0.5 ? 1 : -1;
  const releaseCurve = lateral * swingSign;

  const bounce = new THREE.Vector3(
    clamp(bounceX * 0.58 + releaseCurve * 0.55, -1.65, 1.65),
    0.08,
    bounceZ,
  );

  const contactX = clamp(bounce.x + releaseCurve * 0.68 + (random01(seed, 7) - 0.5) * 0.14, -1.9, 1.9);
  const contact = new THREE.Vector3(contactX, 1.02, 7.72);

  const shotDirection = directionForShot(event.shot ?? String(intent), seed);
  const distance = outcomeDistance(outcome);
  const outcomeScale = outcome === 'DOT' || outcome === 'WICKET' || outcome === 'RUN_OUT' ? 0.55 : 1;
  const endX = clamp(contact.x + shotDirection.x * distance * outcomeScale, -22, 22);
  const endZ = contact.z + shotDirection.z * distance * outcomeScale;
  const endY = outcome === 'SIX' ? 5.8 : outcome === 'FOUR' ? 0.28 : intent === 'LOFT' ? 2.2 : 0.10;

  const preContact = clamp(0.76 - speedFactor * 0.15 + (delivery === 'SLOWER' ? 0.08 : 0), 0.58, 0.86);
  const bounceTime = clamp(preContact * (delivery === 'BOUNCER' ? 0.42 : delivery === 'YORKER' ? 0.72 : 0.56), 0.24, preContact - 0.12);
  const postDuration = outcome === 'SIX' ? 0.92 : outcome === 'FOUR' ? 0.74 : 0.52;
  const totalDuration = preContact + postDuration;

  const bounceArc = delivery === 'BOUNCER' ? 1.18 : delivery === 'YORKER' ? 0.44 : 0.82;
  const postArc = postContactArc(outcome, intent);
  const spin = (random01(seed, 19) * 2 - 1) * (delivery === 'CUTTER' ? 0.95 : delivery === 'SWING' ? 0.55 : 0.22);

  return {
    start,
    bounce,
    contact,
    end: new THREE.Vector3(endX, endY, endZ),
    bounceTime,
    contactTime: preContact,
    totalDuration,
    bounceArc,
    postContactArc: postArc,
    lateralCurve: releaseCurve,
    spin,
  };
}
