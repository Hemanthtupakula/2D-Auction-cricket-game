import type { MiniMatch, MatchBall, Player } from "../../../types";
import type { PresentationBall, PresentationPlayer } from "../types";
import { resolveVisualProfile } from "../playerPresentation/v4/visualProfileResolver";

const normalise = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
const displayNameOf = (player: Player): string => String(player.fullName || player.shortName || (player as Player & { name?: string }).name || player.id || "PLAYER").trim();
const specialismOf = (player: Player): string => String((player as Player & { specialism?: string }).specialism || "").trim();

const presentationSpeedOf = (deliveryType?: string): number => {
  const value = normalise(deliveryType);
  if (value.includes("bouncer")) return 146;
  if (value.includes("yorker")) return 141;
  if (value.includes("swing")) return 134;
  if (value.includes("cutter")) return 128;
  if (value.includes("slower")) return 112;
  return 138;
};

const isKeeper = (player: Player): boolean => {
  const role = normalise(player.role);
  const specialism = normalise(specialismOf(player));
  return role.includes("keeper") || role.includes("wicket") || specialism.includes("keeper") || specialism.includes("wicket");
};

const pushPlayer = (
  out: PresentationPlayer[], player: Player | undefined, role: PresentationPlayer["role"], teamCode: string, x: number, z: number,
) => {
  if (!player?.id) return;
  out.push({
    // AUTHORITATIVE PLAYER ID — never replaced by the visual likeness id.
    id: player.id,
    name: displayNameOf(player),
    teamCode,
    x,
    z,
    role,
    visualProfileId: resolveVisualProfile(player.id, player.role, specialismOf(player)),
  });
};

export interface LivePresentationFeed { players: PresentationPlayer[]; balls: PresentationBall[]; lastBall: PresentationBall | null; }

export function buildPresentationFeed(match: MiniMatch): LivePresentationFeed {
  const innings = Number(match.innings || 1);
  const battingTeam = innings === 1 ? match.homeFranchise : match.awayFranchise;
  const bowlingTeam = innings === 1 ? match.awayFranchise : match.homeFranchise;
  const battingXi = innings === 1 ? (match.homeXi || []) : (match.awayXi || []);
  const bowlingXi = innings === 1 ? (match.awayXi || []) : (match.homeXi || []);

  const striker = battingXi.find((player) => player.id === match.currentStrikerId);
  const nonStriker = battingXi.find((player) => player.id === match.currentNonStrikerId);
  const bowler = bowlingXi.find((player) => player.id === match.currentBowlerId);
  const keeper = bowlingXi.find(isKeeper);

  const reserved = new Set([striker?.id, nonStriker?.id, bowler?.id, keeper?.id].filter((id): id is string => Boolean(id)));
  const fieldPositions: Array<[number, number]> = [[-6.4, 2.5],[6.4, 2.5],[-5.6, -1.5],[5.6, -1.5],[-8.2, -5.5],[8.2, -5.5],[0, -11.5]];
  const fielders = bowlingXi.filter((player) => player?.id && !reserved.has(player.id)).slice(0, fieldPositions.length);
  const players: PresentationPlayer[] = [];

  pushPlayer(players, striker, "BATTER", battingTeam, 0, 8.2);
  pushPlayer(players, nonStriker, "BATTER", battingTeam, -1.2, -7.5);
  pushPlayer(players, bowler, "BOWLER", bowlingTeam, 0, -7.5);
  pushPlayer(players, keeper, "KEEPER", bowlingTeam, 0, 10);
  fielders.forEach((player, index) => { const [x, z] = fieldPositions[index]; pushPlayer(players, player, "FIELDER", bowlingTeam, x, z); });

  const balls: PresentationBall[] = (match.ballLog || []).map((ball: MatchBall) => ({
    ...ball,
    batterId: ball.batterId,
    bowlerId: ball.bowlerId,
    batterName: ball.batterName,
    bowlerName: ball.bowlerName,
    shotIntent: ball.shot || ball.shotIntent,
    bowlPlan: ball.deliveryType || ball.bowlPlan,
    delivery: ball.deliveryType || undefined,
    speed: presentationSpeedOf(ball.deliveryType),
    line: ball.line,
    length: ball.length,
    shot: ball.shot,
    timing: ball.timing,
    timingBand: ball.timing,
    wicketType: ball.wicketType,
  }));

  return { players, balls, lastBall: balls.length ? balls[balls.length - 1] : null };
}
