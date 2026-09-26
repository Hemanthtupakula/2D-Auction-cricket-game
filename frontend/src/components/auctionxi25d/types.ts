export type PresentationCamera =
  | "BATTER_VIEW" | "BOWLER_VIEW" | "DELIVERY_TRACK" | "CONTACT_VIEW"
  | "BALL_FOLLOW" | "FIELDING_VIEW" | "BOUNDARY_VIEW" | "WICKET_VIEW"
  | "CELEBRATION_VIEW" | "RESET_VIEW";

export type PresentationOutcome =
  | "DOT" | "RUNS" | "FOUR" | "SIX" | "WICKET" | "WIDE" | "NO_BALL";

export interface PresentationBall {
  innings?: number; ballNumber?: number; overNumber?: number; ballInOver?: number;
  batterId?: string; bowlerId?: string;
  batterName?: string; bowlerName?: string; outcome?: PresentationOutcome | string;
  runs?: number; wicket?: boolean; commentary?: string; shotIntent?: string;
  bowlPlan?: string; legalBall?: boolean; delivery?: string; speed?: string | number;
  aimX?: number; aimZ?: number; deliveryEpochMs?: number; batEpochMs?: number;
  line?: string; length?: string; shot?: string; timing?: string; timingBand?: string; wicketType?: string;
}

export interface PresentationPlayer {
  /** Authoritative player ID. Never replaced by a visual/likeness ID. */
  id: string;
  name?: string;
  teamCode?: string;
  x: number;
  z: number;
  role?: "BATTER" | "BOWLER" | "FIELDER" | "KEEPER";
  spriteUrl?: string;
  accent?: string;
  /** Presentation-only face/model reference. Does not alter auction identity. */
  visualProfileId?: string;
  jerseyNumber?: number;
}

export interface MiniMatch25DProps {
  className?: string;
  match?: Record<string, unknown> | null;
  balls?: PresentationBall[];
  awaitInput?: Record<string, unknown> | null;
  lastBall?: PresentationBall | null;
  currentCamera?: PresentationCamera;
  players?: PresentationPlayer[];
  battingTeam?: string; bowlingTeam?: string; stadiumName?: string;
  interactive?: boolean;
  /** Bowling interaction state from the authoritative 2D arena. */
  aimX?: number;
  aimZ?: number;
  canAim?: boolean;
  isDelivering?: boolean;
  isBatSwinging?: boolean;
  deliveryType?: string;
  bowlingSpeed?: string | number;
  batIntent?: string;
  onAimChange?: (x: number, z: number) => void;
  onAimLock?: () => void;
  onCameraChange?: (camera: PresentationCamera) => void;
  onPresentationComplete?: () => void;
}
