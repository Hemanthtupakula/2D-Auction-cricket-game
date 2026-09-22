export type PlayerRole = 'BATTER' | 'BOWLER' | 'FIELDER' | 'WICKETKEEPER';

export type BatterState =
  | 'IDLE' | 'READY' | 'TRIGGER' | 'DEFENSIVE' | 'NORMAL' | 'STRAIGHT_DRIVE'
  | 'COVER_DRIVE' | 'CUT' | 'PULL' | 'FLICK' | 'SWEEP' | 'LOFT' | 'LEAVE'
  | 'MISS' | 'EDGE' | 'CELEBRATION' | 'DISMISSAL';

export type BowlerState =
  | 'IDLE' | 'RUN_UP' | 'GATHER' | 'RELEASE_FAST' | 'RELEASE_SWING'
  | 'RELEASE_CUTTER' | 'RELEASE_SLOWER' | 'RELEASE_YORKER' | 'RELEASE_BOUNCER'
  | 'FOLLOW_THROUGH' | 'REACTION' | 'CELEBRATION';

export type FielderState =
  | 'IDLE' | 'READY' | 'REACT' | 'RUN' | 'PICKUP' | 'THROW'
  | 'CATCH' | 'MISS' | 'CELEBRATE';

export type WicketkeeperState =
  | 'CROUCH' | 'READY' | 'COLLECT' | 'CATCH' | 'APPEAL' | 'CELEBRATION';

export type DeliveryKind = 'PACE' | 'SWING' | 'CUTTER' | 'SLOWER' | 'YORKER' | 'BOUNCER';

export type BatterIntent = 'DEFENSIVE' | 'NORMAL' | 'LOFT' | 'LEAVE';

export interface PresentationBall {
  deliveryKind?: DeliveryKind;
  batterIntent?: BatterIntent;
  outcome?: string;
  speed?: number;
  timingBand?: string;
}

export interface PlayerPresentationCommand {
  role: PlayerRole;
  state: BatterState | BowlerState | FielderState | WicketkeeperState;
  intensity?: number;
  durationMs?: number;
}
