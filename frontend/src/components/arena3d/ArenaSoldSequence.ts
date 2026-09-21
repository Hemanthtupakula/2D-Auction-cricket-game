import { FranchiseCode } from '../../types';
import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';
import { ArenaPodiumController } from './ArenaPodiumController';
import { ArenaParticleController } from './ArenaParticleController';

export class ArenaSoldSequence {
  private isRunning: boolean = false;
  private elapsedSeconds: number = 0;
  private readonly totalDuration: number = 5.0;
  private winnerCode: FranchiseCode | null = null;
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

  public start(winnerFranchiseCode?: FranchiseCode | null) {
    this.isRunning = true;
    this.elapsedSeconds = 0;
    this.winnerCode = winnerFranchiseCode || null;

    // 1. Hammer impact flash and dominant winner spotlight
    this.lightingCtrl.triggerSoldSequence(winnerFranchiseCode || undefined);

    // 2. Winner podium beacon elevation
    this.podiumCtrl.setWinner(winnerFranchiseCode || null);

    // 3. Celebratory golden confetti burst
    this.particleCtrl.setMode('CONFETTI');

    // 4. Dramatic camera transition to winner
    this.cameraCtrl.focusWinner(winnerFranchiseCode || undefined);
  }

  public update(deltaSeconds: number): boolean {
    if (!this.isRunning) return false;

    this.elapsedSeconds += deltaSeconds;

    if (this.elapsedSeconds > 3.2 && this.elapsedSeconds < 4.0) {
      // Eases camera into celebratory wide stage view
      this.cameraCtrl.setPreset('STAGE', false);
    } else if (this.elapsedSeconds >= this.totalDuration) {
      this.isRunning = false;
      return false;
    }

    return true;
  }

  public stop() {
    this.isRunning = false;
    this.podiumCtrl.setWinner(null);
  }

  public active(): boolean {
    return this.isRunning;
  }

  public getWinnerCode(): FranchiseCode | null {
    return this.winnerCode;
  }
}
