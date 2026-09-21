import * as THREE from 'three';
import { FranchiseCode, FRANCHISE_VISUAL_CONFIGS } from './ArenaState';

export class ArenaLightingController {
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public stageSpotlight: THREE.SpotLight;
  public bidderSpotlight: THREE.SpotLight;
  public flashLight: THREE.PointLight;

  private targetStageColor: THREE.Color;
  private targetStageIntensity: number = 4.5;
  private targetBidderIntensity: number = 0;
  private targetBidderPos: THREE.Vector3;
  private flashIntensity: number = 0;
  private isLiteMode: boolean;

  constructor(scene: THREE.Scene, liteMode: boolean = false) {
    this.isLiteMode = liteMode;

    // 1. Ambient Broadcast Fill
    this.ambientLight = new THREE.AmbientLight(0x1a2639, liteMode ? 1.5 : 1.2);
    scene.add(this.ambientLight);

    // 2. Overhead Arena Directional Light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, liteMode ? 1.2 : 1.6);
    this.directionalLight.position.set(0, 20, 6);
    scene.add(this.directionalLight);

    // 3. Central Stage Spotlight (Illuminates CentralStage & PlayerStage)
    this.stageSpotlight = new THREE.SpotLight(0xf59e0b, 5.0, 30, Math.PI / 4, 0.35, 1.2);
    this.stageSpotlight.position.set(0, 13, 0);
    this.stageSpotlight.target.position.set(0, 0.5, 0);
    scene.add(this.stageSpotlight);
    scene.add(this.stageSpotlight.target);

    // 4. Bidder Follow Spotlight (Snaps to leading franchise podium)
    this.bidderSpotlight = new THREE.SpotLight(0x38bdf8, 0, 35, Math.PI / 5.5, 0.25, 1.2);
    this.bidderSpotlight.position.set(0, 15, 0);
    this.bidderSpotlight.target.position.set(0, 0, 0);
    scene.add(this.bidderSpotlight);
    scene.add(this.bidderSpotlight.target);

    // 5. Impact / Flash Point Light for SOLD and bid spikes
    this.flashLight = new THREE.PointLight(0xffffff, 0, 40);
    this.flashLight.position.set(0, 5, 0);
    scene.add(this.flashLight);

    this.targetStageColor = new THREE.Color(0xf59e0b);
    this.targetBidderPos = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Calm intelligent presentation for player analysis.
   */
  public setAnalysisMood() {
    this.targetStageColor.setHex(0xf59e0b);
    this.targetStageIntensity = 4.5;
    this.targetBidderIntensity = 0;
    this.ambientLight.intensity = 1.2;
  }

  /**
   * Energy bidding mood with leader tracking.
   */
  public setBiddingMood(leaderCode?: FranchiseCode | null, tension: number = 1.0) {
    this.targetStageColor.setHex(0xfbbf24);
    this.targetStageIntensity = 4.5 + (tension - 1.0) * 1.2;

    if (leaderCode && FRANCHISE_VISUAL_CONFIGS[leaderCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[leaderCode];
      this.targetBidderPos.copy(cfg.position);
      this.targetBidderIntensity = 3.5 + (tension - 1.0) * 1.0;
      this.bidderSpotlight.color.setHex(cfg.primaryColor);
    } else {
      this.targetBidderIntensity = 0;
    }
  }

  /**
   * Going Once mood: Rising tension, amber glow.
   */
  public setGoingOnceMood(leaderCode?: FranchiseCode | null) {
    this.targetStageColor.setHex(0xf97316);
    this.targetStageIntensity = 5.5;
    if (leaderCode && FRANCHISE_VISUAL_CONFIGS[leaderCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[leaderCode];
      this.targetBidderPos.copy(cfg.position);
      this.targetBidderIntensity = 4.8;
      this.bidderSpotlight.color.setHex(cfg.primaryColor);
    }
  }

  /**
   * Going Twice mood: High urgency, high-contrast stage spotlight.
   */
  public setGoingTwiceMood(leaderCode?: FranchiseCode | null) {
    this.targetStageColor.setHex(0xef4444);
    this.targetStageIntensity = 6.8;
    this.ambientLight.intensity = 0.8;
    if (leaderCode && FRANCHISE_VISUAL_CONFIGS[leaderCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[leaderCode];
      this.targetBidderPos.copy(cfg.position);
      this.targetBidderIntensity = 5.5;
      this.bidderSpotlight.color.setHex(cfg.primaryColor);
    }
  }

  /**
   * Final Call mood: Maximum tension pulse.
   */
  public setFinalCallMood(leaderCode?: FranchiseCode | null, elapsed: number = 0) {
    const pulse = Math.sin(elapsed * 12) * 0.5 + 0.5;
    this.targetStageColor.setHex(0xdc2626);
    this.targetStageIntensity = 5.5 + pulse * 3.0;
    this.ambientLight.intensity = 0.6;
    if (leaderCode && FRANCHISE_VISUAL_CONFIGS[leaderCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[leaderCode];
      this.targetBidderPos.copy(cfg.position);
      this.targetBidderIntensity = 5.0 + pulse * 2.0;
    }
  }

  /**
   * SOLD celebration: Hammer impact flash -> arena dims -> winner podium & stage spotlight.
   */
  public triggerSoldSequence(winnerCode?: FranchiseCode) {
    // White/gold flash
    this.flashLight.color.setHex(0xffffff);
    this.flashIntensity = 12.0;

    // Dominant winner spotlight
    this.targetStageColor.setHex(0xffd700);
    this.targetStageIntensity = 7.5;
    this.ambientLight.intensity = 0.4;

    if (winnerCode && FRANCHISE_VISUAL_CONFIGS[winnerCode]) {
      const cfg = FRANCHISE_VISUAL_CONFIGS[winnerCode];
      this.targetBidderPos.copy(cfg.position);
      this.targetBidderIntensity = 8.0;
      this.bidderSpotlight.color.setHex(cfg.primaryColor);
    }
  }

  /**
   * UNSOLD quiet cooldown: Cool blue stage reset, spotlights off.
   */
  public triggerUnsoldSequence() {
    this.targetStageColor.setHex(0x38bdf8);
    this.targetStageIntensity = 1.8;
    this.targetBidderIntensity = 0;
    this.ambientLight.intensity = 0.9;
  }

  /**
   * Brief light burst on new bid.
   */
  public triggerBidPulse(franchiseCode: FranchiseCode) {
    const cfg = FRANCHISE_VISUAL_CONFIGS[franchiseCode];
    if (cfg) {
      this.flashLight.color.setHex(cfg.primaryColor);
      this.flashIntensity = 3.5;
      this.targetBidderPos.copy(cfg.position);
      this.bidderSpotlight.color.setHex(cfg.primaryColor);
    }
  }

  /**
   * Paused state: gentle frozen blue.
   */
  public setPausedMood() {
    this.targetStageColor.setHex(0x64748b);
    this.targetStageIntensity = 2.0;
    this.targetBidderIntensity = 0;
    this.ambientLight.intensity = 0.7;
  }

  /**
   * Stopped state: house lights only.
   */
  public setStoppedMood() {
    this.targetStageColor.setHex(0x334155);
    this.targetStageIntensity = 0;
    this.targetBidderIntensity = 0;
    this.ambientLight.intensity = 1.0;
  }

  /**
   * Per-frame update for smooth lighting transitions and decay.
   */
  public update(_deltaSeconds: number) {
    // Lerp stage spotlight color and intensity
    this.stageSpotlight.color.lerp(this.targetStageColor, 0.08);
    this.stageSpotlight.intensity = THREE.MathUtils.lerp(
      this.stageSpotlight.intensity,
      this.targetStageIntensity,
      0.08
    );

    // Lerp bidder spotlight
    this.bidderSpotlight.target.position.lerp(this.targetBidderPos, 0.12);
    this.bidderSpotlight.intensity = THREE.MathUtils.lerp(
      this.bidderSpotlight.intensity,
      this.targetBidderIntensity,
      0.1
    );

    // Flash decay
    if (this.flashIntensity > 0.01) {
      this.flashIntensity *= 0.82;
      this.flashLight.intensity = this.isLiteMode ? this.flashIntensity * 0.6 : this.flashIntensity;
    } else {
      this.flashLight.intensity = 0;
    }
  }
}
