import * as THREE from 'three';
import { FranchiseCode } from '../../types';
import {
  ArenaEvent,
  AnimationPriority,
  calculateClampedTension,
} from './ArenaState';
import { ArenaSceneResult } from './arenaAssetLoader';
import { ArenaCameraController } from './ArenaCameraController';
import { ArenaLightingController } from './ArenaLightingController';
import { ArenaPodiumController } from './ArenaPodiumController';
import { ArenaParticleController } from './ArenaParticleController';
import { ArenaPlayerReveal } from './ArenaPlayerReveal';
import { ArenaBidReaction } from './ArenaBidReaction';
import { ArenaSoldSequence } from './ArenaSoldSequence';
import { ArenaUnsoldSequence } from './ArenaUnsoldSequence';
import { ArenaCategorySequence } from './ArenaCategorySequence';

export class ArenaAnimationManager {
  public scene: THREE.Scene;
  public cameraCtrl: ArenaCameraController;
  public lightingCtrl: ArenaLightingController;
  public podiumCtrl: ArenaPodiumController;
  public particleCtrl: ArenaParticleController;

  public playerReveal: ArenaPlayerReveal;
  public bidReaction: ArenaBidReaction;
  public soldSequence: ArenaSoldSequence;
  public unsoldSequence: ArenaUnsoldSequence;
  public categorySequence: ArenaCategorySequence;

  private currentPriority: AnimationPriority = AnimationPriority.AMBIENCE;
  private currentEventId: string | null = null;
  private clock: THREE.Clock;
  private isPaused: boolean = false;
  private isStopped: boolean = false;
  private currentLotLeader: FranchiseCode | null = null;
  private currentLotBasePrice: number = 200;
  private currentLotCurrentBid: number = 200;

  constructor(sceneResult: ArenaSceneResult, aspect: number, liteMode: boolean = false) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040711);
    this.scene.fog = new THREE.FogExp2(0x040711, 0.03);

    this.scene.add(sceneResult.rootGroup);

    this.cameraCtrl = new ArenaCameraController(aspect, sceneResult.cameraMarkers, liteMode);
    this.lightingCtrl = new ArenaLightingController(this.scene, liteMode);
    this.podiumCtrl = new ArenaPodiumController(sceneResult.podiums);
    this.particleCtrl = new ArenaParticleController(this.scene, liteMode);

    this.playerReveal = new ArenaPlayerReveal(
      sceneResult.playerStage,
      sceneResult.playerDisplayScreen,
      this.cameraCtrl,
      this.lightingCtrl
    );

    this.bidReaction = new ArenaBidReaction(
      this.cameraCtrl,
      this.lightingCtrl,
      this.podiumCtrl,
      this.particleCtrl
    );

    this.soldSequence = new ArenaSoldSequence(
      this.cameraCtrl,
      this.lightingCtrl,
      this.podiumCtrl,
      this.particleCtrl
    );

    this.unsoldSequence = new ArenaUnsoldSequence(
      this.cameraCtrl,
      this.lightingCtrl,
      this.podiumCtrl,
      this.particleCtrl
    );

    this.categorySequence = new ArenaCategorySequence(
      this.cameraCtrl,
      this.lightingCtrl,
      this.particleCtrl
    );

    this.clock = new THREE.Clock();
  }

  /**
   * Processes authoritative auction event enforcing strict priority preemption:
   * STOP > PAUSE > SOLD > UNSOLD > FINAL_CALL > GOING_TWICE > GOING_ONCE > PLAYER_REVEAL > BID > AMBIENCE
   */
  public dispatchEvent(event: ArenaEvent): boolean {
    if (this.isStopped && event.type !== 'STOPPED') {
      return false; // Remain stopped until reset
    }

    // Preemption check: lower priority cannot overwrite higher priority unless current active sequence finished
    const isCurrentSequenceActive =
      this.playerReveal.active() ||
      this.soldSequence.active() ||
      this.unsoldSequence.active();

    if (isCurrentSequenceActive && event.priority < this.currentPriority) {
      return false;
    }

    // Cancel lower-priority active sequences when preempted by higher priority
    if (event.priority > this.currentPriority || !isCurrentSequenceActive) {
      if (this.playerReveal.active() && event.priority > AnimationPriority.PLAYER_REVEAL) {
        this.playerReveal.stop();
      }
      if (this.categorySequence.isPreview() && event.type !== 'CATEGORY_PREVIEW') {
        this.categorySequence.stop();
      }
    }

    this.currentPriority = event.priority;
    this.currentEventId = event.eventId;

    if (event.basePriceLakhs) this.currentLotBasePrice = event.basePriceLakhs;
    if (event.amountLakhs) this.currentLotCurrentBid = event.amountLakhs;
    if (event.franchiseCode) this.currentLotLeader = event.franchiseCode as FranchiseCode;

    switch (event.type) {
      case 'CATEGORY_PREVIEW':
        this.isPaused = false;
        this.categorySequence.startPreview();
        this.lightingCtrl.setAnalysisMood();
        break;

      case 'CATEGORY_STARTED':
        this.categorySequence.startIgnition();
        break;

      case 'PLAYER_REVEAL':
        this.isPaused = false;
        this.podiumCtrl.setLeader(null);
        this.podiumCtrl.setWinner(null);
        this.currentLotLeader = null;
        this.playerReveal.start();
        break;

      case 'BIDDING':
        this.isPaused = false;
        const currentTension = calculateClampedTension(
          this.currentLotCurrentBid,
          this.currentLotBasePrice
        );
        this.lightingCtrl.setBiddingMood(this.currentLotLeader, currentTension);
        this.particleCtrl.setMode('AMBIENT');
        if (!this.playerReveal.active()) {
          this.cameraCtrl.setPreset('STAGE', false);
        }
        break;

      case 'BID_PLACED':
        this.isPaused = false;
        if (event.franchiseCode) {
          this.currentLotLeader = event.franchiseCode as FranchiseCode;
          this.bidReaction.onBid(
            this.currentLotLeader,
            event.amountLakhs || this.currentLotCurrentBid,
            event.basePriceLakhs || this.currentLotBasePrice
          );
        }
        break;

      case 'GOING_ONCE':
        this.lightingCtrl.setGoingOnceMood(this.currentLotLeader);
        this.particleCtrl.setMode('TENSION', 1.8);
        this.cameraCtrl.setPreset('STAGE', false);
        break;

      case 'GOING_TWICE':
        this.lightingCtrl.setGoingTwiceMood(this.currentLotLeader);
        this.particleCtrl.setMode('TENSION', 2.5);
        this.cameraCtrl.setPreset('STAGE', false);
        break;

      case 'FINAL_CALL':
        this.lightingCtrl.setFinalCallMood(this.currentLotLeader, this.clock.getElapsedTime());
        this.particleCtrl.setMode('TENSION', 3.2);
        this.cameraCtrl.setPreset('PLAYER', false);
        break;

      case 'SOLD':
        this.soldSequence.start(this.currentLotLeader);
        break;

      case 'UNSOLD':
        this.unsoldSequence.start();
        break;

      case 'WAITING_FOR_HOST':
        this.podiumCtrl.setLeader(null);
        this.podiumCtrl.setWinner(null);
        this.lightingCtrl.setAnalysisMood();
        this.particleCtrl.setMode('AMBIENT');
        this.cameraCtrl.setPreset('WIDE', false);
        break;

      case 'PAUSED':
        this.isPaused = true;
        this.lightingCtrl.setPausedMood();
        this.particleCtrl.setMode('FROZEN');
        break;

      case 'STOPPED':
        this.isStopped = true;
        this.lightingCtrl.setStoppedMood();
        this.particleCtrl.setMode('FROZEN');
        this.cameraCtrl.setPreset('WIDE', true);
        break;

      case 'AMBIENCE':
      default:
        this.lightingCtrl.setAnalysisMood();
        this.particleCtrl.setMode('AMBIENT');
        break;
    }

    return true;
  }

  /**
   * Main per-frame animation loop tick.
   */
  public tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    if (!this.isPaused && !this.isStopped) {
      // 1. Update active cinematics
      if (this.playerReveal.active()) {
        const stillActive = this.playerReveal.update(delta);
        if (!stillActive && this.currentPriority === AnimationPriority.PLAYER_REVEAL) {
          this.currentPriority = AnimationPriority.AMBIENCE;
        }
      }

      if (this.soldSequence.active()) {
        const stillActive = this.soldSequence.update(delta);
        if (!stillActive && this.currentPriority === AnimationPriority.SOLD) {
          this.currentPriority = AnimationPriority.AMBIENCE;
        }
      }

      if (this.unsoldSequence.active()) {
        const stillActive = this.unsoldSequence.update(delta);
        if (!stillActive && this.currentPriority === AnimationPriority.UNSOLD) {
          this.currentPriority = AnimationPriority.AMBIENCE;
        }
      }

      if (this.categorySequence.isPreview()) {
        this.categorySequence.update(delta);
      }

      // 2. Sub-controllers update
      this.podiumCtrl.update(delta, elapsed);
      this.particleCtrl.update(delta);
    }

    // Camera and Lighting always update smoothly
    this.cameraCtrl.update(delta);
    this.lightingCtrl.update(delta);
  }

  public render(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.cameraCtrl.camera);
  }

  public handleResize(width: number, height: number) {
    this.cameraCtrl.handleResize(width, height);
  }

  public getCurrentEventId(): string | null {
    return this.currentEventId;
  }

  public dispose() {
    this.scene.clear();
  }
}
