import * as THREE from "three";
import type { PresentationPlayer } from "./types";
import {
  ProductionCricketPlayerRig,
  type PlayerIdentity,
  type PlayerRole,
  type AuthoritativeBallPresentation,
  type PresentationState,
  type DeliveryKind,
  type BatterIntent,
  type TimingBand,
  type Outcome,
} from "./playerPresentation/v4";

export * from "./playerPresentation/v4";

export class V4PlayerRigManager {
  readonly rig: ProductionCricketPlayerRig;

  constructor() {
    this.rig = new ProductionCricketPlayerRig();
  }

  get group(): THREE.Group {
    return this.rig.group;
  }

  registerXI(players: PresentationPlayer[], teamCode?: string): void {
    this.rig.clear();
    for (const p of players) {
      const role: PlayerRole =
        p.role === "KEEPER" ? "KEEPER" :
        p.role === "BOWLER" ? "BOWLER" :
        p.role === "BATTER" ? "BATTER" : "FIELDER";

      let kitPrimary: number | undefined = undefined;
      if (p.accent) {
        kitPrimary = typeof p.accent === "string" ? parseInt(p.accent.replace("#", ""), 16) : p.accent;
      }

      const identity: PlayerIdentity = {
        id: p.id,
        name: p.name || p.id,
        role,
        teamCode: teamCode || p.teamCode,
        kitPrimary,
      };

      this.rig.addPlayer(identity, new THREE.Vector3(p.x, 0, p.z));
    }
  }

  addPlayer(identity: PlayerIdentity, position: THREE.Vector3, yaw = 0): void {
    this.rig.addPlayer(identity, position, yaw);
  }

  playBall(e: AuthoritativeBallPresentation): void {
    this.rig.playBall(e);
  }

  setPhase(phase: string): void {
    this.rig.setPhase(phase);
  }

  update(dt: number): void {
    this.rig.update(dt);
  }

  resetForNextBall(): void {
    this.rig.resetForNextBall();
  }

  transitionPlayer(id: string, state: PresentationState): void {
    this.rig.transitionPlayer(id, state);
  }

  dispose(): void {
    this.rig.dispose();
  }
}

let activeV4Manager: V4PlayerRigManager | null = null;
export function getActiveV4Manager(): V4PlayerRigManager {
  if (!activeV4Manager) {
    activeV4Manager = new V4PlayerRigManager();
  }
  return activeV4Manager;
}

export function createPlayerSprite(player: PresentationPlayer): THREE.Object3D {
  const role: PlayerRole =
    player.role === "KEEPER" ? "KEEPER" :
    player.role === "BOWLER" ? "BOWLER" :
    player.role === "BATTER" ? "BATTER" : "FIELDER";

  let kitPrimary: number | undefined = undefined;
  if (player.accent) {
    kitPrimary = typeof player.accent === "string" ? parseInt(player.accent.replace("#", ""), 16) : player.accent;
  }

  const identity: PlayerIdentity = {
    id: player.id,
    name: player.name || player.id,
    role,
    teamCode: player.teamCode,
    kitPrimary,
  };

  const manager = getActiveV4Manager();
  manager.addPlayer(identity, new THREE.Vector3(player.x, 0, player.z));

  const root = new THREE.Group();
  root.name = `player-${player.id}`;
  root.position.set(player.x, 0, player.z);
  root.userData.player = player;
  root.userData.v4Manager = manager;
  return root;
}

export function updatePlayerSprite(obj: THREE.Object3D, player: PresentationPlayer, deltaSeconds: number): void {
  const target = new THREE.Vector3(player.x, 0, player.z);
  obj.position.lerp(target, 1 - Math.exp(-deltaSeconds * 10));
  const manager = obj.userData?.v4Manager as V4PlayerRigManager | undefined;
  if (manager) {
    manager.update(deltaSeconds);
  }
}

export function applyBallToPlayerRig(obj: THREE.Object3D, ball: any): void {
  const manager = obj.userData?.v4Manager as V4PlayerRigManager | undefined;
  if (!manager) return;

  const presBall: AuthoritativeBallPresentation = {
    ballId: String(ball.ballNumber ?? Date.now()),
    deliveryKind: (ball.deliveryKind || ball.delivery?.toUpperCase() || "PACE") as DeliveryKind,
    batterIntent: (ball.batterIntent || ball.shotIntent?.toUpperCase() || "NORMAL") as BatterIntent,
    outcome: (ball.outcome?.toUpperCase() || "DOT") as Outcome,
    speedKph: typeof ball.speed === "number" ? ball.speed : 138,
    timingBand: (ball.timingBand || "GOOD") as TimingBand,
  };
  manager.playBall(presBall);
}

export function resetPlayerRig(obj: THREE.Object3D): void {
  const manager = obj.userData?.v4Manager as V4PlayerRigManager | undefined;
  if (manager) {
    manager.resetForNextBall();
  }
}
