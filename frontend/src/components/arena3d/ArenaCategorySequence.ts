import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';
import { ArenaParticleController } from './ArenaParticleController';

export class ArenaCategorySequence {
  private isPreviewRunning: boolean = false;
  private isIgnitionRunning: boolean = false;
  private elapsedSeconds: number = 0;
  private cameraCtrl: ArenaCameraController;
  private lightingCtrl: ArenaLightingController;
  private particleCtrl: ArenaParticleController;

  constructor(
    cameraCtrl: ArenaCameraController,
    lightingCtrl: ArenaLightingController,
    particleCtrl: ArenaParticleController
  ) {
    this.cameraCtrl = cameraCtrl;
    this.lightingCtrl = lightingCtrl;
    this.particleCtrl = particleCtrl;
  }

  /**
   * Starts Category Preview orbital view.
   */
  public startPreview() {
    this.isPreviewRunning = true;
    this.isIgnitionRunning = false;
    this.elapsedSeconds = 0;
    this.particleCtrl.setMode('AMBIENT');
  }

  /**
   * Starts Category Started short cinematic ignition.
   */
  public startIgnition() {
    this.isPreviewRunning = false;
    this.isIgnitionRunning = true;
    this.elapsedSeconds = 0;
    this.lightingCtrl.flashLight.color.setHex(0xf59e0b);
    this.lightingCtrl.flashLight.intensity = 8.0;
    this.cameraCtrl.setPreset('STAGE', true);
  }

  public update(deltaSeconds: number) {
    this.elapsedSeconds += deltaSeconds;

    if (this.isPreviewRunning) {
      this.cameraCtrl.orbitPreview(this.elapsedSeconds);
    } else if (this.isIgnitionRunning) {
      if (this.elapsedSeconds > 1.8) {
        this.isIgnitionRunning = false;
      }
    }
  }

  public stop() {
    this.isPreviewRunning = false;
    this.isIgnitionRunning = false;
  }

  public isPreview(): boolean {
    return this.isPreviewRunning;
  }
}
