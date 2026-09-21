import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';
import { ArenaPodiumController } from './ArenaPodiumController';
import { ArenaParticleController } from './ArenaParticleController';

export class ArenaUnsoldSequence {
  private isRunning: boolean = false;
  private elapsedSeconds: number = 0;
  private readonly totalDuration: number = 3.5;
  private cameraCtrl: ArenaCameraController;
  private lightingCtrl: ArenaLightingController;
  private podiumCtrl: ArenaPodiumController;
  private particleCtrl: ArenaParticleController;

  constructor(
    cameraCtrl: ArenaCameraController,
    lightingCtrl: ArenaLightingController,
    podiumCtrl: ArenaPodiumController,
    particleCtrl: ArenaParticleController
  ) {
    this.cameraCtrl = cameraCtrl;
    this.lightingCtrl = lightingCtrl;
    this.podiumCtrl = podiumCtrl;
    this.particleCtrl = particleCtrl;
  }

  public start() {
    this.isRunning = true;
    this.elapsedSeconds = 0;

    // 1. Cool blue stage reset, clear leader follow-spots
    this.lightingCtrl.triggerUnsoldSequence();

    // 2. Clear podium leader status
    this.podiumCtrl.setLeader(null);
    this.podiumCtrl.setWinner(null);

    // 3. Gentle cooldown particle drift
    this.particleCtrl.setMode('COOLDOWN');

    // 4. Neutral wide stage camera
    this.cameraCtrl.setPreset('WIDE', true);
  }

  public update(deltaSeconds: number): boolean {
    if (!this.isRunning) return false;

    this.elapsedSeconds += deltaSeconds;

    if (this.elapsedSeconds >= this.totalDuration) {
      this.isRunning = false;
      return false;
    }

    return true;
  }

  public stop() {
    this.isRunning = false;
  }

  public active(): boolean {
    return this.isRunning;
  }
}
