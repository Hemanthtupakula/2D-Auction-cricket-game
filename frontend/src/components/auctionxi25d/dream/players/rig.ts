import * as THREE from 'three';
import {ProductionCricketPlayerRig} from '../../playerPresentation/v4/ProductionCricketPlayerRig';
import type {PlayerIdentity, PlayerRole} from '../../playerPresentation/v4/types';
import type {Role, PresentationState} from '../core/types';

export class PlayerDirector {
  readonly v4Rig = new ProductionCricketPlayerRig();
  readonly group: THREE.Group = this.v4Rig.group;

  position(id: string, role: Role, x: number, z: number): void {
    const v4Role: PlayerRole =
      role === 'BATTER' ? 'BATTER' :
      role === 'BOWLER' ? 'BOWLER' :
      role === 'KEEPER' ? 'KEEPER' : 'FIELDER';
    const identity: PlayerIdentity = { id, name: id, role: v4Role };
    this.v4Rig.addPlayer(identity, new THREE.Vector3(x, 0, z));
    this.v4Rig.setPlayerPosition(id, new THREE.Vector3(x, 0, z));
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
