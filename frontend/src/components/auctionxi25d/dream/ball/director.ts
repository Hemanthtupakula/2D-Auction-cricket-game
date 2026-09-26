import * as THREE from 'three';
import type { AuthoritativeBallEvent } from '../core/types';
import { clamp } from '../core/easing';
import { resolveBallTrajectory, type BallTrajectory } from './trajectory';

export class BallDirector {
  readonly group = new THREE.Group();
  readonly ball: THREE.Mesh;
  readonly trail: THREE.Line;
  private trajectory: BallTrajectory | null = null;
  private active = false;
  private elapsed = 0;
  private previewOnly = false;
  private readonly trailPoints = 26;

  constructor() {
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0xc71818, roughness: 0.28, metalness: 0.04 }),
    );
    this.ball.castShadow = true;
    this.ball.name = 'auction-xi-cricket-ball';
    this.group.add(this.ball);

    const geometry = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: this.trailPoints }, () => new THREE.Vector3()),
    );
    this.trail = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.52 }),
    );
    this.trail.name = 'auction-xi-ball-trail';
    this.group.add(this.trail);
  }

  begin(event: AuthoritativeBallEvent): void {
    this.trajectory = resolveBallTrajectory(event);
    this.elapsed = 0;
    this.active = true;
    this.previewOnly = false;
    this.ball.visible = true;
    this.ball.position.copy(this.trajectory.start);
    this.resetTrail(this.trajectory.start);
  }

  /**
   * Starts the visible delivery immediately after the bowler commits.
   * This uses the same deterministic trajectory solver as the authoritative
   * result, but ends at contact so the client does not invent the cricket result.
   */
  beginDeliveryPreview(event: AuthoritativeBallEvent): void {
    this.trajectory = resolveBallTrajectory({ ...event, outcome: 'DOT' });
    this.elapsed = 0;
    this.active = true;
    this.previewOnly = true;
    this.ball.visible = true;
    this.ball.position.copy(this.trajectory.start);
    this.resetTrail(this.trajectory.start);
  }

  getTrajectory(): BallTrajectory | null {
    return this.trajectory;
  }

  getPosition(): THREE.Vector3 {
    return this.ball.position.clone();
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
      const q = clamp((elapsed - tr.bounceTime) / Math.max(0.001, tr.contactTime - tr.bounceTime), 0, 1);
      const eased = q * q * (3 - 2 * q);
      const point = tr.bounce.clone().lerp(tr.contact, eased);
      point.y = THREE.MathUtils.lerp(0.08, tr.contact.y, eased) + Math.sin(q * Math.PI) * 0.34;
      point.x += Math.sin(q * Math.PI) * tr.lateralCurve * 0.45;
      return point;
    }

    const q = clamp((elapsed - tr.contactTime) / Math.max(0.001, tr.totalDuration - tr.contactTime), 0, 1);
    const eased = q * q * (3 - 2 * q);
    const point = tr.contact.clone().lerp(tr.end, eased);
    point.y = THREE.MathUtils.lerp(tr.contact.y, tr.end.y, eased) + Math.sin(q * Math.PI) * tr.postContactArc;
    point.x += Math.sin(q * Math.PI) * tr.spin;
    return point;
  }

  update(elapsedSeconds: number): void {
    if (!this.trajectory) return;
    this.elapsed = Math.max(0, elapsedSeconds);
    const stopAt = this.previewOnly ? this.trajectory.contactTime : this.trajectory.totalDuration;
    const normalized = stopAt <= 0 ? 1 : clamp(this.elapsed / stopAt, 0, 1);
    const sampleProgress = this.previewOnly
      ? normalized * (this.trajectory.contactTime / Math.max(this.trajectory.totalDuration, 0.001))
      : normalized;
    this.ball.position.copy(this.sampleNormalized(sampleProgress));

    const trailPoints: THREE.Vector3[] = [];
    for (let i = 0; i < this.trailPoints; i += 1) {
      const sampleElapsed = Math.max(0, this.elapsed - i * 0.028);
      const trailStop = this.previewOnly ? this.trajectory.contactTime : this.trajectory.totalDuration;
      const sample = trailStop <= 0
        ? this.trajectory.contact.clone()
        : this.sampleNormalized(clamp(sampleElapsed / trailStop, 0, 1) * (this.previewOnly ? this.trajectory.contactTime / Math.max(this.trajectory.totalDuration, 0.001) : 1));
      trailPoints.push(sample);
    }
    this.trail.geometry.setFromPoints(trailPoints);
    this.active = normalized < 1;
  }

  endPreview(): void {
    if (!this.previewOnly) return;
    this.active = false;
    this.previewOnly = false;
  }

  get previewRunning(): boolean {
    return this.previewOnly && this.active;
  }

  reset(): void {
    this.active = false;
    this.previewOnly = false;
    this.elapsed = 0;
    this.trajectory = null;
    this.ball.visible = false;
    this.ball.position.set(0, 0.54, -8.25);
    this.resetTrail(this.ball.position);
  }

  get running(): boolean {
    return this.active;
  }

  private resetTrail(position: THREE.Vector3): void {
    this.trail.geometry.setFromPoints(
      Array.from({ length: this.trailPoints }, () => position.clone()),
    );
  }
}
