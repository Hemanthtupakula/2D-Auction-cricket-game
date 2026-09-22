import * as THREE from 'three';
import { commandForBall } from './stateMapper';
import type { PlayerPresentationCommand, PresentationBall } from './types';

export interface ProductionPlayerRigOptions {
  teamAccent?: THREE.ColorRepresentation;
  scale?: number;
}

function makePlayerMaterial(accent: THREE.ColorRepresentation) {
  const group = new THREE.Group();
  const shirt = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.20, 0.45, 4, 8),
    new THREE.MeshStandardMaterial({ color: accent, roughness: 0.78 })
  );
  shirt.position.y = 0.58;
  group.add(shirt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xb97850, roughness: 0.9 })
  );
  head.position.y = 0.98;
  group.add(head);

  const bat = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.48, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xd6b27a, roughness: 0.65 })
  );
  bat.position.set(0.25, 0.55, 0.05);
  group.add(bat);
  return group;
}

/**
 * Presentation-only player rig. It deliberately contains no scoring/rule logic.
 * Replace its primitive body with sprite-sheet or GLTF animation assets later
 * without changing the authoritative match contract.
 */
export class ProductionPlayerRig {
  readonly object: THREE.Group;
  private baseScale: number;
  private phase = 0;
  private targetState = 'IDLE';

  constructor(options: ProductionPlayerRigOptions = {}) {
    this.object = makePlayerMaterial(options.teamAccent ?? 0x3b82f6);
    this.baseScale = options.scale ?? 1;
    this.object.scale.setScalar(this.baseScale);
  }

  setCommand(command: PlayerPresentationCommand) {
    this.targetState = command.state;
    this.phase = 0;
  }

  applyAuthoritativeBall(ball: PresentationBall) {
    const mapped = commandForBall(ball);
    this.setCommand({ role: 'BATTER', state: mapped.batter });
  }

  update(deltaSeconds: number) {
    this.phase += deltaSeconds;
    const state = this.targetState;
    const active = ['TRIGGER','DEFENSIVE','NORMAL','STRAIGHT_DRIVE','COVER_DRIVE','CUT','PULL','FLICK','SWEEP','LOFT','LEAVE',
      'RELEASE_FAST','RELEASE_SWING','RELEASE_CUTTER','RELEASE_SLOWER','RELEASE_YORKER','RELEASE_BOUNCER',
      'CATCH','THROW','CELEBRATION','DISMISSAL'].includes(state);

    const pulse = active ? Math.sin(this.phase * 14) * 0.035 : Math.sin(this.phase * 3) * 0.008;
    this.object.scale.y = this.baseScale * (1 + pulse);
    this.object.rotation.z = active ? Math.sin(this.phase * 9) * 0.025 : 0;
  }
}
