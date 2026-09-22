export type PresentationCamera =
  | "BATTER_VIEW" | "BOWLER_VIEW" | "DELIVERY_TRACK" | "CONTACT_VIEW"
  | "BALL_FOLLOW" | "FIELDING_VIEW" | "BOUNDARY_VIEW" | "WICKET_VIEW"
  | "CELEBRATION_VIEW" | "RESET_VIEW";

export type PresentationOutcome =
  | "DOT" | "RUNS" | "FOUR" | "SIX" | "WICKET" | "WIDE" | "NO_BALL";

export interface PresentationBall {
  innings?: number; ballNumber?: number; overNumber?: number; ballInOver?: number;
  batterName?: string; bowlerName?: string; outcome?: PresentationOutcome | string;
  runs?: number; wicket?: boolean; commentary?: string; shotIntent?: string;
  bowlPlan?: string; legalBall?: boolean; delivery?: string; speed?: string;
  aimX?: number; aimZ?: number; deliveryEpochMs?: number; batEpochMs?: number;
}

export interface PresentationPlayer {
  id: string; name?: string; teamCode?: string; x: number; z: number;
  role?: "BATTER" | "BOWLER" | "FIELDER" | "KEEPER";
  spriteUrl?: string; accent?: string;
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
  onCameraChange?: (camera: PresentationCamera) => void;
  onPresentationComplete?: () => void;
}
