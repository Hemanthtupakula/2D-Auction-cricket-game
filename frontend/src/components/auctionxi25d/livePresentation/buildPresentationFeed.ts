import type { MiniMatch, MatchBall, Player } from "../../../types";
import type { PresentationBall, PresentationPlayer } from "../types";

const FRIEND_NAME_ALIASES: Record<string, string> = {
  ajay: "AJAY",
  "ajay 07": "AJAY",
  "ajay-07": "AJAY",
  akshay: "AKSHAY",
  "akshay 18": "AKSHAY",
  "akshay-18": "AKSHAY",
  gokul: "GOKUL",
  "gokul 11": "GOKUL",
  "gokul-11": "GOKUL",
  "hemanth naidu": "HEMANTH NAIDU",
  "hemanth naidu 27": "HEMANTH NAIDU",
  "hemanth-naidu-27": "HEMANTH NAIDU",
  hkt: "HKT",
  "hkt 17": "HKT",
  "hkt-17": "HKT",
};

const normalise = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");

const displayNameOf = (player: Player): string =>
  String(player.fullName || player.shortName || (player as Player & { name?: string }).name || player.id || "PLAYER").trim();

const presentationIdentityOf = (player: Player): string => {
  const displayName = displayNameOf(player);
  return FRIEND_NAME_ALIASES[normalise(displayName)] || player.id;
};

const isKeeper = (player: Player): boolean => {
  const role = normalise(player.role);
  const specialism = normalise((player as Player & { specialism?: string }).specialism);
  return role.includes("keeper") || role.includes("wicket") ||
    specialism.includes("keeper") || specialism.includes("wicket");
};

const pushPlayer = (
  out: PresentationPlayer[],
  player: Player | undefined,
  role: PresentationPlayer["role"],
  teamCode: string,
  x: number,
  z: number,
) => {
  if (!player?.id) return;

  out.push({
    // Friend identities intentionally use the configured display name as the
    // presentation ID so the existing V4.4 ProductionCricketPlayerRig can
    // resolve the corresponding friend GLB/face profile without changing
    // authoritative match IDs.
    id: presentationIdentityOf(player),
    name: displayNameOf(player),
    teamCode,
    x,
    z,
    role,
  });
};

export interface LivePresentationFeed {
  players: PresentationPlayer[];
  balls: PresentationBall[];
  lastBall: PresentationBall | null;
}

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

  const reserved = new Set(
    [striker?.id, nonStriker?.id, bowler?.id, keeper?.id].filter(
      (id): id is string => Boolean(id),
    ),
  );

  const fieldPositions: Array<[number, number]> = [
    [-6.4, 2.5],
    [6.4, 2.5],
    [-5.6, -1.5],
    [5.6, -1.5],
    [-8.2, -5.5],
    [8.2, -5.5],
    [0, -11.5],
  ];

  const fielders = bowlingXi
    .filter((player) => player?.id && !reserved.has(player.id))
    .slice(0, fieldPositions.length);

  const players: PresentationPlayer[] = [];

  pushPlayer(players, striker, "BATTER", battingTeam, 0, 8.2);
  pushPlayer(players, nonStriker, "BATTER", battingTeam, -1.2, -7.5);
  pushPlayer(players, bowler, "BOWLER", bowlingTeam, 0, -7.5);
  pushPlayer(players, keeper, "KEEPER", bowlingTeam, 0, 10);

  fielders.forEach((player, index) => {
    const [x, z] = fieldPositions[index];
    pushPlayer(players, player, "FIELDER", bowlingTeam, x, z);
  });

  // The V4 presentation normalizer already consumes shotIntent/bowlPlan.
  // Bridge the richer authoritative MiniMatch fields into that contract
  // without modifying the authoritative MatchBall itself.
  const balls: PresentationBall[] = (match.ballLog || []).map((ball: MatchBall) => ({
    ...ball,
    batterId: ball.batterId,
    bowlerId: ball.bowlerId,
    batterName: ball.batterName,
    bowlerName: ball.bowlerName,
    shotIntent: ball.shot || ball.shotIntent,
    bowlPlan: ball.deliveryType || ball.bowlPlan,
    delivery: ball.deliveryType || (ball as MatchBall & { delivery?: string }).delivery,
  }));

  return {
    players,
    balls,
    lastBall: balls.length ? balls[balls.length - 1] : null,
  };
}
