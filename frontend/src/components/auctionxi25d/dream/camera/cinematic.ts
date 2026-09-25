import * as THREE from 'three';
import type { AuthoritativeBallEvent } from '../core/types';
import type { BallTrajectory } from '../ball/trajectory';
import type { FieldingSequence } from '../fielding/FieldingDirector';

export interface CinematicTimings {
  bounceTime: number;
  contactTime: number;
  totalDuration: number;
}

export type CinematicFocus =
  | 'BOWLER'
  | 'BALL'
  | 'CONTACT'
  | 'FIELD_TARGET'
  | 'WICKET'
  | 'BOUNDARY'
  | 'BATTER';

export interface CinematicCue {
  state:
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
  start: number;
  end: number;
  focus: CinematicFocus;
}

export interface CinematicContext {
  event: AuthoritativeBallEvent;
  timings: CinematicTimings;
  trajectory: BallTrajectory;
  fieldingSequence: FieldingSequence;
}

const safe = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;

export function buildCinematicPlan(context: CinematicContext): CinematicCue[] {
  const { event, timings, fieldingSequence } = context;
  const contact = Math.max(0.45, safe(timings.contactTime, 0.75));
  const total = Math.max(contact + 0.35, safe(timings.totalDuration, 1.5));
  const resultStart = Math.max(contact + 0.18, total - 0.38);
  const resultEnd = Math.max(resultStart + 0.55, total + 0.65);

  const cues: CinematicCue[] = [
    { state: 'BOWLER_VIEW', start: 0, end: Math.min(contact * 0.34, 0.28), focus: 'BOWLER' },
    { state: 'DELIVERY_TRACK', start: Math.min(contact * 0.22, 0.2), end: Math.max(contact - 0.16, 0.48), focus: 'BALL' },
    { state: 'CONTACT_VIEW', start: Math.max(contact - 0.16, 0.42), end: contact + 0.22, focus: 'CONTACT' },
  ];

  if (event.outcome === 'WICKET' || event.outcome === 'RUN_OUT' || fieldingSequence === 'CATCH' || fieldingSequence === 'RUN_OUT') {
    cues.push(
      { state: 'FIELDING_VIEW', start: contact + 0.12, end: Math.max(contact + 0.62, resultStart), focus: 'FIELD_TARGET' },
      { state: 'WICKET_VIEW', start: resultStart, end: resultEnd, focus: 'WICKET' },
      { state: 'CELEBRATION_VIEW', start: Math.max(resultStart + 0.28, total + 0.18), end: resultEnd + 0.48, focus: 'WICKET' },
    );
  } else if (event.outcome === 'FOUR' || event.outcome === 'SIX' || fieldingSequence === 'BOUNDARY') {
    cues.push(
      { state: 'BALL_FOLLOW', start: contact + 0.12, end: Math.max(contact + 0.48, resultStart), focus: 'BALL' },
      { state: 'BOUNDARY_VIEW', start: resultStart, end: resultEnd, focus: 'BOUNDARY' },
    );
  } else {
    cues.push(
      { state: 'BALL_FOLLOW', start: contact + 0.10, end: Math.max(contact + 0.52, resultStart), focus: 'BALL' },
      { state: 'FIELDING_VIEW', start: resultStart - 0.05, end: resultEnd, focus: 'FIELD_TARGET' },
    );
  }

  cues.push({ state: 'RESET_VIEW', start: resultEnd, end: resultEnd + 0.5, focus: 'BATTER' });
  return cues.sort((a, b) => a.start - b.start);
}

export function focusPointFor(
  focus: CinematicFocus,
  points: {
    ball?: THREE.Vector3;
    contact?: THREE.Vector3;
    fieldTarget?: THREE.Vector3;
    batter?: THREE.Vector3;
    wicket?: THREE.Vector3;
    boundary?: THREE.Vector3;
  },
): THREE.Vector3 {
  const selected =
    focus === 'BALL' ? points.ball :
    focus === 'CONTACT' ? points.contact :
    focus === 'FIELD_TARGET' ? points.fieldTarget :
    focus === 'BATTER' ? points.batter :
    focus === 'WICKET' ? points.wicket :
    focus === 'BOUNDARY' ? points.boundary :
    points.batter;

  return (selected ?? new THREE.Vector3(0, 0.7, 0)).clone();
}
