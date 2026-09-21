import * as THREE from 'three';
import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';

export class ArenaPlayerReveal {
  private isRunning: boolean = false;
  private elapsedSeconds: number = 0;
  private readonly totalDuration: number = 3.3;
  private playerStage: THREE.Object3D;
  private displayScreen: THREE.Mesh;
  private cameraCtrl: ArenaCameraController;
  private lightingCtrl: ArenaLightingController;

  constructor(
    playerStage: THREE.Object3D,
    displayScreen: THREE.Mesh,
    cameraCtrl: ArenaCameraController,
    lightingCtrl: ArenaLightingController
  ) {
    this.playerStage = playerStage;
    this.displayScreen = displayScreen;
    this.cameraCtrl = cameraCtrl;
    this.lightingCtrl = lightingCtrl;
  }

  public start() {
    this.isRunning = true;
    this.elapsedSeconds = 0;
    this.cameraCtrl.setPreset('STAGE', true);
    this.lightingCtrl.setAnalysisMood();
  }

  public update(deltaSeconds: number): boolean {
    if (!this.isRunning) return false;

    this.elapsedSeconds += deltaSeconds;

    if (this.elapsedSeconds < 0.8) {
      // Phase 1: Stage sweep
      this.lightingCtrl.stageSpotlight.intensity = 5.0 + Math.sin(this.elapsedSeconds * 6) * 1.5;
    } else if (this.elapsedSeconds < 2.0) {
      // Phase 2: Turntable spin & screen expansion
      this.playerStage.rotation.y += deltaSeconds * 2.5;
      this.displayScreen.rotation.y += deltaSeconds * 3.5;
      const progress = (this.elapsedSeconds - 0.8) / 1.2;
      const scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;
      this.displayScreen.scale.set(scale, scale, scale);
    } else if (this.elapsedSeconds < this.totalDuration) {
      // Phase 3: Transition to Player camera close-up
      this.cameraCtrl.setPreset('PLAYER', false);
      this.playerStage.rotation.y = THREE.MathUtils.lerp(this.playerStage.rotation.y, 0, 0.1);
    } else {
      // Completed
      this.isRunning = false;
      this.playerStage.rotation.y = 0;
      this.displayScreen.scale.set(1, 1, 1);
      return false;
    }

    return true;
  }

  public stop() {
    this.isRunning = false;
    this.playerStage.rotation.y = 0;
    this.displayScreen.scale.set(1, 1, 1);
  }

  public active(): boolean {
    return this.isRunning;
  }
}
