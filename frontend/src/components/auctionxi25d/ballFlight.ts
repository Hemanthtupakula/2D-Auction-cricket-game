import * as THREE from "three";

export interface BallFlightSample { position: THREE.Vector3; t: number; }

export function createCricketFlight(
  start: THREE.Vector3, end: THREE.Vector3, lift: number,
  durationMs: number, steps = 48
): BallFlightSample[] {
  const points: BallFlightSample[] = [];
  const control = start.clone().lerp(end, 0.5);
  control.y += lift;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = start.clone().lerp(control, t);
    const b = control.clone().lerp(end, t);
    points.push({ position: a.lerp(b, t), t: Math.min(1, (t * durationMs) / durationMs) });
  }
  return points;
}

export function outcomeLift(outcome: string, runs: number): number {
  if (outcome === "SIX") return 4.8;
  if (outcome === "FOUR") return 2.8;
  if (outcome === "WICKET") return 0.9;
  if (runs >= 2) return 1.7;
  return 0.35;
}
