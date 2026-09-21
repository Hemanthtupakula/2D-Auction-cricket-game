import { FranchiseCode } from '../../types';
import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';
import { ArenaPodiumController } from './ArenaPodiumController';
import { ArenaParticleController } from './ArenaParticleController';
import { calculateClampedTension } from './ArenaState';

export class ArenaBidReaction {
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

  /**
   * Dispatches bid reaction.
   * - Immediately pulses the bidder podium (no lag).
   * - Triggers a light burst in the franchise's primary color.
   * - Updates tension metric on particle dynamics.
   * - Focuses camera on bidder ONLY if >400ms since last camera transition (prevents camera whip).
   */
  public onBid(franchiseCode: FranchiseCode, currentBidLakhs: number, basePriceLakhs: number) {
    const tension = calculateClampedTension(currentBidLakhs, basePriceLakhs);

    // 1. Instant local podium reaction
    this.podiumCtrl.setLeader(franchiseCode);
    this.podiumCtrl.triggerBidPulse(franchiseCode);

    // 2. Immediate lighting flash
    this.lightingCtrl.triggerBidPulse(franchiseCode);
    this.lightingCtrl.setBiddingMood(franchiseCode, tension);

    // 3. Dynamic particle escalation
    this.particleCtrl.setMode('TENSION', tension);

    // 4. Smooth camera focus (throttled internally to min 400ms)
    this.cameraCtrl.focusBidder(franchiseCode, false);
  }
}
