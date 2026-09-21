import * as THREE from 'three';
import { ARENA_NODES, ArenaCameraPreset, FranchiseCode, FRANCHISE_VISUAL_CONFIGS } from './ArenaState';

export class ArenaCameraController {
  public camera: THREE.PerspectiveCamera;
  private currentPos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private cameraMarkers: Record<string, THREE.Object3D>;
  private lastTransitionTime: number = 0;
  private minTransitionIntervalMs: number = 400;
  private currentPreset: ArenaCameraPreset = 'WIDE';
  private lerpSpeed: number = 0.05;
  private liteMode: boolean = false;

  constructor(
    aspect: number,
    cameraMarkers: Record<string, THREE.Object3D>,
    liteMode: boolean = false
  ) {
    this.liteMode = liteMode;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 120);
    this.cameraMarkers = cameraMarkers;

    // Default starting overview position
    this.currentPos = new THREE.Vector3(0, 9.5, 17.5);
    this.targetPos = new THREE.Vector3(0, 9.5, 17.5);
    this.currentLookAt = new THREE.Vector3(0, 1.2, 0);
    this.targetLookAt = new THREE.Vector3(0, 1.2, 0);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.setPreset('WIDE', true);
  }

  /**
   * Transitions camera to a named preset anchor.
   * If force is false, enforces minimum 400ms interval to prevent camera whip on rapid bids.
   */
  public setPreset(preset: ArenaCameraPreset, force: boolean = false): boolean {
    const now = performance.now();
    if (!force && now - this.lastTransitionTime < this.minTransitionIntervalMs) {
      return false; // Throttled: preserve current focus during rapid events
    }

    const markerName = ARENA_NODES.CAMERAS[preset];
    const marker = this.cameraMarkers[markerName];

    if (marker) {
      this.targetPos.copy(marker.position);
      if (marker.userData?.lookTarget) {
        this.targetLookAt.copy(marker.userData.lookTarget);
      }
    } else {
      // Fallback coordinates if marker node is missing
      switch (preset) {
        case 'WIDE':
          this.targetPos.set(0, 9.5, 17.5);
          this.targetLookAt.set(0, 1.2, 0);
          break;
        case 'STAGE':
          this.targetPos.set(0, 4.5, 8.8);
          this.targetLookAt.set(0, 1.5, 0);
          break;
        case 'PLAYER':
          this.targetPos.set(0, 2.6, 5.2);
          this.targetLookAt.set(0, 1.6, 0);
          break;
        case 'LEFT_BIDDER':
          this.targetPos.set(-6.5, 5.5, 8.5);
          this.targetLookAt.set(-4.5, 1.2, 0);
          break;
        case 'RIGHT_BIDDER':
          this.targetPos.set(6.5, 5.5, 8.5);
          this.targetLookAt.set(4.5, 1.2, 0);
          break;
        case 'OVERHEAD':
          this.targetPos.set(0, 18.0, 1.0);
          this.targetLookAt.set(0, 0, 0);
          break;
        case 'WINNER':
          this.targetPos.set(0, 6.5, 12.5);
          this.targetLookAt.set(0, 1.5, 0);
          break;
      }
    }

    this.currentPreset = preset;
    this.lastTransitionTime = now;
    return true;
  }

  /**
   * Sets focus directly to a specific bidder franchise podium.
   * Throttled to min 400ms to prevent camera swinging during rapid bids.
   */
  public focusBidder(franchiseCode: FranchiseCode, force: boolean = false): boolean {
    const now = performance.now();
    if (!force && now - this.lastTransitionTime < this.minTransitionIntervalMs) {
      return false; // Skip major camera move, let podium pulse handle visual reaction
    }

    const cfg = FRANCHISE_VISUAL_CONFIGS[franchiseCode];
    if (!cfg) return false;

    // Angle of bidder decides if left or right camera preset is closer
    if (cfg.position.x < -1) {
      this.targetPos.set(cfg.position.x * 0.5 - 2.5, 6.0, cfg.position.z * 0.5 + 8.0);
      this.targetLookAt.set(cfg.position.x * 0.7, 1.4, cfg.position.z * 0.7);
    } else if (cfg.position.x > 1) {
      this.targetPos.set(cfg.position.x * 0.5 + 2.5, 6.0, cfg.position.z * 0.5 + 8.0);
      this.targetLookAt.set(cfg.position.x * 0.7, 1.4, cfg.position.z * 0.7);
    } else {
      this.targetPos.set(0, 6.0, cfg.position.z > 0 ? 14 : 10);
      this.targetLookAt.set(cfg.position.x, 1.4, cfg.position.z);
    }

    this.lastTransitionTime = now;
    return true;
  }

  /**
   * Focus specifically on the winning franchise podium and stage platform.
   */
  public focusWinner(franchiseCode?: FranchiseCode) {
    if (franchiseCode && FRANCHISE_VISUAL_CONFIGS[franchiseCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[franchiseCode];
      this.targetPos.set(cfg.position.x * 0.45, 6.5, cfg.position.z * 0.45 + 10.5);
      this.targetLookAt.set(cfg.position.x * 0.6, 1.5, cfg.position.z * 0.6);
    } else {
      this.setPreset('WINNER', true);
    }
    this.lastTransitionTime = performance.now();
  }

  /**
   * Orbital drift during Category Preview.
   */
  public orbitPreview(elapsedSeconds: number) {
    const radius = 16.5;
    const speed = 0.15;
    const angle = elapsedSeconds * speed;
    this.targetPos.set(Math.sin(angle) * radius, 8.5, Math.cos(angle) * radius);
    this.targetLookAt.set(0, 1.2, 0);
  }

  /**
   * Called every frame to smoothly interpolate position and orientation.
   */
  public update(_deltaSeconds: number) {
    const speed = this.liteMode ? this.lerpSpeed * 0.8 : this.lerpSpeed;
    this.currentPos.lerp(this.targetPos, speed);
    this.currentLookAt.lerp(this.targetLookAt, speed * 1.1);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public getPreset(): ArenaCameraPreset {
    return this.currentPreset;
  }
}
