import type {
  BatterIntent, BatterState, BowlerState, DeliveryKind, PresentationBall,
  FielderState, WicketkeeperState
} from './types';

export function batterIntentState(intent?: BatterIntent): BatterState {
  switch (intent) {
    case 'DEFENSIVE': return 'DEFENSIVE';
    case 'LOFT': return 'LOFT';
    case 'LEAVE': return 'LEAVE';
    default: return 'NORMAL';
  }
}

export function bowlerReleaseState(kind?: DeliveryKind): BowlerState {
  switch (kind) {
    case 'SWING': return 'RELEASE_SWING';
    case 'CUTTER': return 'RELEASE_CUTTER';
    case 'SLOWER': return 'RELEASE_SLOWER';
    case 'YORKER': return 'RELEASE_YORKER';
    case 'BOUNCER': return 'RELEASE_BOUNCER';
    default: return 'RELEASE_FAST';
  }
}

export function batterResultState(outcome?: string): BatterState | undefined {
  const value = String(outcome ?? '').toUpperCase();
  if (value.includes('WICKET') || value === 'BOWLED' || value === 'LBW' || value === 'CAUGHT') return 'DISMISSAL';
  if (value.includes('EDGE')) return 'EDGE';
  if (value.includes('MISS')) return 'MISS';
  if (value.includes('FOUR') || value.includes('SIX') || value.includes('BOUNDARY')) return 'CELEBRATION';
  return undefined;
}

export function fielderResultState(outcome?: string): FielderState {
  const value = String(outcome ?? '').toUpperCase();
  if (value.includes('CAUGHT')) return 'CATCH';
  if (value.includes('RUN_OUT')) return 'THROW';
  if (value.includes('FIELD')) return 'PICKUP';
  return 'REACT';
}

export function keeperResultState(outcome?: string): WicketkeeperState {
  const value = String(outcome ?? '').toUpperCase();
  if (value.includes('CAUGHT') || value.includes('WICKET')) return 'CATCH';
  if (value.includes('APPEAL')) return 'APPEAL';
  return 'COLLECT';
}

export function commandForBall(ball: PresentationBall) {
  return {
    batter: batterIntentState(ball.batterIntent),
    bowler: bowlerReleaseState(ball.deliveryKind),
    batterResult: batterResultState(ball.outcome),
    fielder: fielderResultState(ball.outcome),
    keeper: keeperResultState(ball.outcome),
  };
}
