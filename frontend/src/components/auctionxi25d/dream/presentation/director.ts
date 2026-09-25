import * as THREE from 'three';
import type { AuthoritativeBallEvent } from '../core/types';
import { PresentationTimeline } from '../core/timeline';
import { PlayerDirector } from '../players/rig';
import { BallDirector } from '../ball/director';
import { DreamCameraDirector } from '../camera/director';
import { DreamStadiumWorld } from '../stadium/world';
import { BroadcastFX } from '../fx/broadcastFx';
import { FieldingDirector } from '../fielding/FieldingDirector';
import type { AuthoritativeBallPresentation, Outcome as V4Outcome } from '../../playerPresentation/v4/types';

export class DreamMatchPresentation {
  readonly root = new THREE.Group();
  readonly world = new DreamStadiumWorld();
  readonly players = new PlayerDirector();
  readonly ball = new BallDirector();
  readonly camera = new DreamCameraDirector();
  readonly fx = new BroadcastFX();
  readonly timeline = new PresentationTimeline();
  readonly fielding = new FieldingDirector(this.players, this.camera);
  private current?: AuthoritativeBallEvent;
  private elapsed = 0;
  private previewing = false;
  private previewCamera: 'BOWLER_VIEW' | 'DELIVERY_TRACK' | 'CONTACT_VIEW' = 'BOWLER_VIEW';

  constructor() {
    this.root.add(this.world.group, this.players.group, this.ball.group, this.fx.group);
  }

  getCurrentBall() { return this.current; }

  playDeliveryPreview(e: AuthoritativeBallEvent): void {
    this.current = e;
    this.elapsed = 0;
    this.previewing = true;
    this.timeline.reset();
    this.fielding.reset();
    this.world.reactToBall(e);
    this.ball.begin(e);
    this.players.reset();

    const v4Ball: AuthoritativeBallPresentation = {
      ballId: e.ballId,
      deliveryKind: e.deliveryKind,
      batterIntent: e.batterIntent,
      outcome: 'DOT',
      speedKph: e.speed,
      timingBand: e.timingBand,
      direction: e.target && 'x' in e.target ? e.target.x : 0,
      runCount: 0,
    };
    this.players.v4Rig.playBall(v4Ball);
    if (e.bowlerId) {
      this.players.position(e.bowlerId, 'BOWLER', 0, -7.5);
      this.players.state(e.bowlerId, 'BOWLER', 'RUNUP');
    }
    if (e.strikerId) {
      this.players.position(e.strikerId, 'BATTER', 0, 8.2);
      this.players.state(e.strikerId, 'BATTER', 'TRIGGER');
    }
    if (e.nonStrikerId) this.players.position(e.nonStrikerId, 'BATTER', -1.2, -7.5);
    if (e.fielders) for (const f of e.fielders) this.players.position(f.id, f.role === 'KEEPER' ? 'KEEPER' : 'FIELDER', f.x, f.z);

    this.previewCamera = 'BOWLER_VIEW';
    this.camera.setManual(this.previewCamera, true);
  }

  playBall(e: AuthoritativeBallEvent) {
    this.previewing = false;
    this.current = e;
    this.elapsed = 0;
    this.timeline.reset();
    this.world.reactToBall(e);
    this.ball.begin(e);
    this.players.reset();

    const v4Outcome: V4Outcome =
      e.outcome === 'SIX' ? 'SIX' : e.outcome === 'FOUR' ? 'FOUR' : e.outcome === 'WICKET' ? 'WICKET' :
      e.outcome === 'WIDE' ? 'WIDE' : e.outcome === 'NO_BALL' ? 'NO_BALL' : e.outcome === 'RUN_OUT' ? 'RUN_OUT' :
      e.outcome === 'THREE' ? 'THREE' : e.outcome === 'TWO' ? 'TWO' : e.outcome === 'ONE' ? 'ONE' : 'DOT';
    const v4Ball: AuthoritativeBallPresentation = {
      ballId: e.ballId, deliveryKind: e.deliveryKind, batterIntent: e.batterIntent, outcome: v4Outcome,
      speedKph: e.speed, timingBand: e.timingBand, direction: e.target && 'x' in e.target ? e.target.x : 0,
      runCount: e.outcome === 'SIX' ? 6 : e.outcome === 'FOUR' ? 4 : e.outcome === 'THREE' ? 3 :
        e.outcome === 'TWO' ? 2 : e.outcome === 'ONE' ? 1 : 0, wicketType: e.wicketType || (e.outcome === 'WICKET' ? 'bowled' : undefined),
    };
    this.players.v4Rig.playBall(v4Ball);
    if (e.bowlerId) { this.players.position(e.bowlerId, 'BOWLER', 0, -7.5); this.players.state(e.bowlerId, 'BOWLER', e.deliveryKind === 'BOUNCER' ? 'RUNUP' : e.deliveryKind === 'YORKER' ? 'RELEASE_YORKER' : 'READY'); }
    if (e.strikerId) { this.players.position(e.strikerId, 'BATTER', 0, 8.2); this.players.state(e.strikerId, 'BATTER', 'TRIGGER'); }
    if (e.nonStrikerId) { this.players.position(e.nonStrikerId, 'BATTER', -1.2, -7.5); this.players.state(e.nonStrikerId, 'BATTER', 'READY'); }
    if (e.fielders) for (const f of e.fielders) this.players.position(f.id, f.role === 'KEEPER' ? 'KEEPER' : 'FIELDER', f.x, f.z);

    const trajectory = this.ball.getTrajectory();
    if (trajectory) this.fielding.begin(e, trajectory);
    const timings = this.ball.getTimings();
    if (trajectory) this.camera.beginBall(e, timings, trajectory, this.fielding.getSequence(), this.fielding.getTarget());

    const releaseTime = Math.max(0.38, timings.bounceTime - 0.06);
    const contactTime = timings.contactTime;
    const presentationEnd = Math.max(3.4, timings.totalDuration + 1.05);
    this.timeline
      .add('runup', 0, Math.min(releaseTime, 0.38), () => { this.players.v4Rig.setPhase('DELIVERY'); })
      .add('release', Math.min(0.34, releaseTime), Math.min(0.62, releaseTime + 0.22), (t) => { if (e.bowlerId && t > 0.35) this.players.state(e.bowlerId, 'BOWLER', `RELEASE_${e.deliveryKind}`); })
      .add('flight', Math.min(0.52, releaseTime), Math.max(contactTime, 0.66), () => { this.players.v4Rig.setPhase('FIELDING'); })
      .add('response', contactTime, contactTime + 0.34, (t) => { this.players.v4Rig.setPhase('CONTACT'); if (e.strikerId && t >= 0.05) this.players.state(e.strikerId, 'BATTER', this.batterState(e)); })
      .add('result', Math.max(contactTime + 0.18, timings.totalDuration - 0.35), presentationEnd, (t) => { this.players.v4Rig.setPhase('RESULT'); this.applyOutcome(e, t); });
    this.timeline.start();
  }

  private batterState(e: AuthoritativeBallEvent) {
    if (e.batterIntent === 'LEAVE') return 'LEAVE';
    if (e.timingBand === 'VERY_EARLY' || e.timingBand === 'VERY_LATE') return 'MISS';
    if (e.outcome === 'WICKET') return 'DISMISS';
    switch (e.batterIntent) { case 'DEFENSIVE': return 'DEFENSIVE'; case 'LOFT': return 'LOFT'; default: return 'DRIVE'; }
  }

  private applyOutcome(e: AuthoritativeBallEvent, t: number) {
    if (t < 0.2) return;
    const big = e.outcome === 'FOUR' || e.outcome === 'SIX';
    const wicket = e.outcome === 'WICKET' || e.outcome === 'RUN_OUT';
    if (wicket) { this.fx.burst('WICKET'); if (e.strikerId && e.outcome === 'WICKET') this.players.state(e.strikerId, 'BATTER', 'DISMISS'); }
    else if (big) this.fx.burst(e.outcome);
  }

  update(dt: number, cam: THREE.PerspectiveCamera) {
    this.elapsed += dt;
    this.timeline.tick();
    const activeTrajectory = this.ball.getTrajectory();
    if (this.previewing && activeTrajectory) {
      const previewUntil = Math.min(this.elapsed, activeTrajectory.contactTime + 0.04);
      this.ball.update(previewUntil);
      const nextCamera = this.elapsed < 0.22 ? 'BOWLER_VIEW' : this.elapsed < activeTrajectory.contactTime ? 'DELIVERY_TRACK' : 'CONTACT_VIEW';
      if (nextCamera !== this.previewCamera) { this.previewCamera = nextCamera; this.camera.setManual(nextCamera); }
    } else {
      this.ball.update(this.elapsed);
      this.fielding.update(this.elapsed);
    }
    this.players.update(dt, this.elapsed);
    this.world.update(dt);
    this.fx.update(dt);
    this.camera.update(cam, dt, {
      elapsed: this.elapsed,
      points: { ball: this.ball.getPosition(), contact: activeTrajectory?.contact, fieldTarget: this.fielding.getTarget(), batter: new THREE.Vector3(0, 0.8, 7.8), wicket: new THREE.Vector3(0, 0.8, 8.2), boundary: activeTrajectory?.end },
    });
  }

  resetForNextBall() {
    this.current = undefined; this.elapsed = 0; this.previewing = false; this.timeline.reset(); this.fielding.reset(); this.ball.reset(); this.players.reset(); this.camera.set('BATTER_VIEW', true);
  }
}
