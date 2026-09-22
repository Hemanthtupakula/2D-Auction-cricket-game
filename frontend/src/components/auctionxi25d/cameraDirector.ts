import * as THREE from "three";
import type { PresentationCamera } from "./types";

export class BroadcastCameraDirector {
  private readonly camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) { this.camera = camera; }

  setState(state: PresentationCamera) {
    const poses: Record<PresentationCamera, [number,number,number,number,number,number]> = {
      BATTER_VIEW:[0,7.8,13.8,0,1,0], BOWLER_VIEW:[0,6.6,-13.5,0,1.1,0],
      DELIVERY_TRACK:[4.8,5.4,9.5,0,1,0], CONTACT_VIEW:[4.6,3.6,6.8,0,1,0],
      BALL_FOLLOW:[6.8,5,4.5,0,1.4,0], FIELDING_VIEW:[-7.2,5.4,3,0,1.4,0],
      BOUNDARY_VIEW:[8.8,6.4,0,0,1.5,0], WICKET_VIEW:[-4.8,4.2,-1.2,0,1.2,0],
      CELEBRATION_VIEW:[0,8.5,12,0,1,0], RESET_VIEW:[0,8.8,14.5,0,.9,0],
    };
    const [x,y,z,tx,ty,tz] = poses[state];
    this.targetPosition.set(x,y,z); this.targetLookAt.set(tx,ty,tz);
  }

  update(deltaSeconds: number) {
    const alpha = 1 - Math.exp(-deltaSeconds * 6);
    this.camera.position.lerp(this.targetPosition, alpha);
    const current = new THREE.Vector3();
    this.camera.getWorldDirection(current);
    const desired = this.targetLookAt.clone().sub(this.camera.position).normalize();
    current.lerp(desired, alpha);
    this.camera.lookAt(this.camera.position.clone().add(current));
  }
}
