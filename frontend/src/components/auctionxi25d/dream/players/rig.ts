import * as THREE from 'three';
import { ProductionCricketPlayerRig } from '../../playerPresentation/v4/ProductionCricketPlayerRig';
import type { PlayerIdentity, PlayerRole } from '../../playerPresentation/v4/types';
import type { Role, PresentationState } from '../core/types';

function hashId(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Chooses a presentation-only likeness profile without changing the authoritative
 * player identity. The mapping is deterministic so the same player keeps the
 * same visual representation across renders/clients.
 */
function visualProfileFor(id: string, role: Role): string {
  const bucket = hashId(id);
  if (role === 'KEEPER') return 'hkt-17';
  if (role === 'BOWLER') return bucket % 2 === 0 ? 'akshay-18' : 'hemanth-naidu-27';
  if (role === 'BATTER') return bucket % 2 === 0 ? 'ajay-07' : 'gokul-11';
  const profiles = ['ajay-07', 'akshay-18', 'gokul-11', 'hemanth-naidu-27', 'hkt-17'];
  return profiles[bucket % profiles.length];
}

export class PlayerDirector {
  readonly v4Rig = new ProductionCricketPlayerRig();
  readonly group: THREE.Group = this.v4Rig.group;
  private activeIds = new Set<string>();

  position(id: string, role: Role, x: number, z: number, name?: string): void {
    const v4Role: PlayerRole =
      role === 'BATTER' ? 'BATTER' :
      role === 'BOWLER' ? 'BOWLER' :
      role === 'KEEPER' ? 'KEEPER' : 'FIELDER';
    const identity: PlayerIdentity = {
      id,
      name: name || id,
      role: v4Role,
      visualProfileId: visualProfileFor(id, role),
    };
    this.v4Rig.addPlayer(identity, new THREE.Vector3(x, 0, z));
    this.v4Rig.setPlayerPosition(id, new THREE.Vector3(x, 0, z));
    this.activeIds.add(id);
  }

  async preloadVisuals(players: Array<{ id: string; role?: Role; x: number; z: number; name?: string }>): Promise<void> {
    const identities = players.map((player) => ({
      id: player.id,
      name: player.name || player.id,
      role: player.role === "BATTER" ? "BATTER" as const : player.role === "BOWLER" ? "BOWLER" as const : player.role === "KEEPER" ? "KEEPER" as const : "FIELDER" as const,
      visualProfileId: player.role === "KEEPER" ? "hkt-17" : player.role === "BOWLER" ? "akshay-18" : player.role === "BATTER" ? "ajay-07" : "gokul-11",
    }));
    await this.v4Rig.preloadVisuals(identities);
  }

  syncPlayers(players: Array<{ id: string; role?: Role; x: number; z: number; name?: string }>): void {
    if (players.length < 7) return;
    const nextIds = new Set(players.map((player) => player.id).filter(Boolean));
    for (const id of this.activeIds) {
      if (!nextIds.has(id)) this.v4Rig.removePlayer(id);
    }
    for (const player of players) {
      this.position(player.id, (player.role || "FIELDER") as Role, player.x, player.z, player.name);
    }
    this.activeIds = nextIds;
  }

  state(id: string, _role: Role, state: PresentationState): void {
    this.v4Rig.transitionPlayer(id, state as any);
  }

  offset(id: string, offset: THREE.Vector3): void {
    this.v4Rig.setPlayerPresentationOffset(id, offset);
  }

  update(dt: number, _time?: number): void {
    this.v4Rig.update(dt);
  }

  reset(): void {
    this.v4Rig.resetForNextBall();
  }
}
