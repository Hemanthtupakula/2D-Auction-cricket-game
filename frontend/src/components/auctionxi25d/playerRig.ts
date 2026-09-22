import * as THREE from "three";
import type { PresentationPlayer } from "./types";
import { ProductionPlayerRig } from "./playerPresentation/ProductionPlayerRig";
import { commandForBall } from "./playerPresentation/stateMapper";
import type { PresentationBall as PlayerPresentationBall } from "./playerPresentation/types";

export * from "./playerPresentation";

export function createPlayerSprite(player: PresentationPlayer): THREE.Object3D {
  const accent = player.accent || (
    player.role === "BATTER" ? 0x2563eb :
    player.role === "BOWLER" ? 0xd97706 :
    player.role === "KEEPER" ? 0x7c3aed :
    0x059669
  );

  const rig = new ProductionPlayerRig({ teamAccent: accent, scale: 1.15 });
  const root = new THREE.Group();
  root.name = `player-${player.id}`;
  root.position.set(player.x, 0, player.z);
  root.add(rig.object);
  root.userData.rig = rig;
  root.userData.player = player;

  // Set initial posture based on role
  resetPlayerRig(root);

  return root;
}

export function updatePlayerSprite(obj: THREE.Object3D, player: PresentationPlayer, deltaSeconds: number): void {
  const target = new THREE.Vector3(player.x, 0, player.z);
  obj.position.lerp(target, 1 - Math.exp(-deltaSeconds * 10));
  const rig = obj.userData?.rig as ProductionPlayerRig | undefined;
  if (rig) {
    rig.update(deltaSeconds);
  }
}

export function applyBallToPlayerRig(obj: THREE.Object3D, ball: PlayerPresentationBall): void {
  const rig = obj.userData?.rig as ProductionPlayerRig | undefined;
  const player = obj.userData?.player as PresentationPlayer | undefined;
  if (!rig) return;

  const role = player?.role === "KEEPER" ? "WICKETKEEPER" : (player?.role || "FIELDER");
  const commands = commandForBall(ball);

  if (role === "BATTER") {
    const state = commands.batterResult || commands.batter;
    rig.setCommand({ role: "BATTER", state });
  } else if (role === "BOWLER") {
    rig.setCommand({ role: "BOWLER", state: commands.bowler });
  } else if (role === "WICKETKEEPER") {
    rig.setCommand({ role: "WICKETKEEPER", state: commands.keeper });
  } else {
    rig.setCommand({ role: "FIELDER", state: commands.fielder });
  }
}

export function resetPlayerRig(obj: THREE.Object3D): void {
  const rig = obj.userData?.rig as ProductionPlayerRig | undefined;
  const player = obj.userData?.player as PresentationPlayer | undefined;
  if (!rig) return;

  const role = player?.role === "KEEPER" ? "WICKETKEEPER" : (player?.role || "FIELDER");
  if (role === "BATTER") {
    rig.setCommand({ role: "BATTER", state: "READY" });
  } else if (role === "BOWLER") {
    rig.setCommand({ role: "BOWLER", state: "IDLE" });
  } else if (role === "WICKETKEEPER") {
    rig.setCommand({ role: "WICKETKEEPER", state: "CROUCH" });
  } else {
    rig.setCommand({ role: "FIELDER", state: "READY" });
  }
}
