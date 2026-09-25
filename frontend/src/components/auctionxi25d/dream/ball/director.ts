import * as THREE from 'three';
import type {AuthoritativeBallEvent} from '../core/types';
import {clamp} from '../core/easing';
import {resolveBallTrajectory, type BallTrajectory} from './trajectory';

export class BallDirector {
  readonly group = new THREE.Group();
  readonly ball: THREE.Mesh;
  readonly trail: THREE.Line;
  private trajectory: BallTrajectory | null = null;
  private active = false;
  private elapsed = 0;
  private readonly trailPoints = 26;

  constructor() {
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshStandardMaterial({color: 0x8b1111, roughness: 0.35}),
    );
    this.ball.castShadow = true;
    this.group.add(this.ball);

    const geometry = new THREE.BufferGeometry().setFromPoints(
      Array.from({length: this.trailPoints}, () => new THREE.Vector3()),
    );
    this.trail = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({transparent: true, opacity: 0.35}),
    );
    this.group.add(this.trail);
  }

  begin(event: AuthoritativeBallEvent): void {
    this.trajectory = resolveBallTrajectory(event);
    this.elapsed = 0;
    this.active = true;
    this.ball.position.copy(this.trajectory.start);
    this.trail.geometry.setFromPoints(
      Array.from({length: this.trailPoints}, () => this.trajectory!.start.clone()),
    );
  }

  getTrajectory(): BallTrajectory | null {
    return this.trajectory;
  }

  getTimings() {
    return {
      bounceTime: this.trajectory?.bounceTime ?? 0.42,
      contactTime: this.trajectory?.contactTime ?? 0.78,
      totalDuration: this.trajectory?.totalDuration ?? 1.55,
    };
  }

  getPhase(elapsedSeconds: number): 'DELIVERY' | 'BOUNCE' | 'CONTACT' | 'FLIGHT_RESULT' {
    const t = elapsedSeconds;
    const timings = this.getTimings();
    if (t < timings.bounceTime) return 'DELIVERY';
    if (t < timings.contactTime) return 'BOUNCE';
    if (t < timings.totalDuration) return 'CONTACT';
    return 'FLIGHT_RESULT';
  }

  sampleNormalized(progress: number): THREE.Vector3 {
    if (!this.trajectory) return this.ball.position.clone();
    const t = clamp(progress, 0, 1);
    const tr = this.trajectory;
    const elapsed = t * tr.totalDuration;

    if (elapsed <= tr.bounceTime) {
      const q = clamp(elapsed / Math.max(0.001, tr.bounceTime), 0, 1);
      const eased = q * q * (3 - 2 * q);
      const point = tr.start.clone().lerp(tr.bounce, eased);
      point.y += Math.sin(q * Math.PI) * tr.bounceArc;
      point.x += Math.sin(q * Math.PI) * tr.lateralCurve;
      return point;
    }

    if (elapsed <= tr.contactTime) {
      const q = clamp(
        (elapsed - tr.bounceTime) / Math.max(0.001, tr.contactTime - tr.bounceTime),
        0,
        1,
      );
      const eased = q * q * (3 - 2 * q);
      const point = tr.bounce.clone().lerp(tr.contact, eased);
      point.y = THREE.MathUtils.lerp(0.08, tr.contact.y, eased) + Math.sin(q * Math.PI) * 0.34;
      point.x += Math.sin(q * Math.PI) * tr.lateralCurve * 0.45;
      return point;
    }

    const q = clamp(
      (elapsed - tr.contactTime) / Math.max(0.001, tr.totalDuration - tr.contactTime),
      0,
      1,
    );
    const eased = q * q * (3 - 2 * q);
    const point = tr.contact.clone().lerp(tr.end, eased);
    point.y = THREE.MathUtils.lerp(tr.contact.y, tr.end.y, eased) + Math.sin(q * Math.PI) * tr.postContactArc;
    point.x += Math.sin(q * Math.PI) * tr.spin;
    return point;
  }

  update(elapsedSeconds: number): void {
    if (!this.trajectory) return;
    this.elapsed = Math.max(0, elapsedSeconds);
    const normalized = this.trajectory.totalDuration <= 0
      ? 1
      : clamp(this.elapsed / this.trajectory.totalDuration, 0, 1);
    this.ball.position.copy(this.sampleNormalized(normalized));

    const trailPoints: THREE.Vector3[] = [];
    for (let i = 0; i < this.trailPoints; i += 1) {
      const sampleElapsed = Math.max(0, this.elapsed - i * 0.028);
      const sample = this.trajectory.totalDuration <= 0
        ? this.trajectory.end.clone()
        : this.sampleNormalized(sampleElapsed / this.trajectory.totalDuration);
      trailPoints.push(sample);
    }
    this.trail.geometry.setFromPoints(trailPoints);
    this.active = normalized < 1;
  }

  reset(): void {
    this.active = false;
    this.elapsed = 0;
    this.trajectory = null;
    this.ball.position.set(0, 0.54, -8.25);
    this.trail.geometry.setFromPoints(
      Array.from({length: this.trailPoints}, () => new THREE.Vector3(0, 0.54, -8.25)),
    );
  }

  get running(): boolean {
    return this.active;
  }
}
