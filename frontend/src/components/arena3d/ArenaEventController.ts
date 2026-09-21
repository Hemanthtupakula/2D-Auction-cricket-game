import { RoomStateSnapshot, AuctionLot, FranchiseCode } from '../../types';
import { ArenaAnimationManager } from './ArenaAnimationManager';
import {
  ArenaEvent,
  AnimationPriority,
} from './ArenaState';

export class ArenaEventController {
  private animationManager: ArenaAnimationManager;
  private processedEventIds: Set<string> = new Set();
  private lastRoomVersion: number = -1;
  private lastLotNumber: number = -1;
  private lastPhase: string = '';
  private lastHighestBidder: string | null = null;
  private lastBidAmount: number = 0;
  private lastCategoryIndex: number = -1;
  private lastCategoryActive: boolean = false;

  constructor(animationManager: ArenaAnimationManager) {
    this.animationManager = animationManager;
  }

  /**
   * Ingests latest authoritative RoomStateSnapshot and currentLot.
   * Dispatches deduplicated events to the 3D Animation Manager.
   */
  public ingestSnapshot(snapshot: RoomStateSnapshot, currentLot: AuctionLot | null, isSoldProp: boolean = false) {
    if (!snapshot) return;

    // 1. Update Active Human Franchises (Zero AI: ACTIVE_HUMAN or INACTIVE)
    const activeFranchiseCodes: FranchiseCode[] = [];
    if (snapshot.franchises) {
      Object.entries(snapshot.franchises).forEach(([code, state]) => {
        if (state.active) {
          activeFranchiseCodes.push(code as FranchiseCode);
        }
      });
    }
    this.animationManager.podiumCtrl.updateActiveFranchises(activeFranchiseCodes);

    // 2. Stopped or Paused State Check
    if (snapshot.status === 'STOPPED') {
      this.dispatchIfNew({
        eventId: `stop-v${snapshot.version}`,
        roomVersion: snapshot.version,
        type: 'STOPPED',
        priority: AnimationPriority.STOP,
        timestamp: Date.now(),
      });
      return;
    }

    if (snapshot.isPaused || snapshot.status === 'PAUSED') {
      this.dispatchIfNew({
        eventId: `pause-v${snapshot.version}`,
        roomVersion: snapshot.version,
        type: 'PAUSED',
        priority: AnimationPriority.PAUSE,
        timestamp: Date.now(),
      });
      return;
    }

    // 3. Category Level Transitions
    const catIndex = snapshot.categoryIndex ?? 0;
    const catActive = snapshot.categoryActive ?? false;

    if (!catActive) {
      // Category Preview Mode
      const eventId = `cat-preview-${snapshot.currentCategory || 'set'}-${catIndex}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        type: 'CATEGORY_PREVIEW',
        priority: AnimationPriority.AMBIENCE,
        timestamp: Date.now(),
        categoryName: snapshot.currentCategoryName,
      });
      this.lastCategoryActive = false;
      return;
    } else if (!this.lastCategoryActive && catActive) {
      // Category Just Started
      const eventId = `cat-start-${snapshot.currentCategory || 'set'}-${catIndex}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        type: 'CATEGORY_STARTED',
        priority: AnimationPriority.AMBIENCE,
        timestamp: Date.now(),
        categoryName: snapshot.currentCategoryName,
      });
      this.lastCategoryActive = true;
    }

    // 4. Lot & Bidding State Machine
    if (!currentLot) {
      // WAITING FOR HOST / DRAW NEXT
      const eventId = `waiting-host-v${snapshot.version}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        type: 'WAITING_FOR_HOST',
        priority: AnimationPriority.AMBIENCE,
        timestamp: Date.now(),
      });
      return;
    }

    const lotNum = currentLot.lotNumber;
    const phase = currentLot.phase;
    const highestBidder = currentLot.highestBidderFranchise;
    const currentBid = currentLot.currentBidLakhs;
    const basePrice = currentLot.basePriceLakhs;

    // Detect New Lot Reveal
    if (phase === 'REVEALING' || (lotNum !== this.lastLotNumber && phase !== 'SOLD' && phase !== 'UNSOLD')) {
      const eventId = `lot-reveal-${lotNum}-v${snapshot.version}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'PLAYER_REVEAL',
        priority: AnimationPriority.PLAYER_REVEAL,
        timestamp: Date.now(),
        basePriceLakhs: basePrice,
        amountLakhs: currentBid,
        playerName: currentLot.player?.fullName,
      });
      this.lastLotNumber = lotNum;
    }

    // Detect Bid Placed
    if (
      highestBidder &&
      (highestBidder !== this.lastHighestBidder || currentBid !== this.lastBidAmount)
    ) {
      const latestBidTime = currentLot.bidHistory?.length
        ? currentLot.bidHistory[currentLot.bidHistory.length - 1].timestampMillis
        : Date.now();

      const eventId = `bid-${lotNum}-${highestBidder}-${currentBid}-${latestBidTime}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'BID_PLACED',
        priority: AnimationPriority.BID,
        timestamp: latestBidTime,
        franchiseCode: highestBidder,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });

      this.lastHighestBidder = highestBidder;
      this.lastBidAmount = currentBid;
    }

    // Phase Specific Events
    if (phase === 'GOING_ONCE') {
      const eventId = `going-once-${lotNum}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'GOING_ONCE',
        priority: AnimationPriority.GOING_ONCE,
        timestamp: Date.now(),
        franchiseCode: highestBidder || undefined,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });
    } else if (phase === 'GOING_TWICE') {
      const eventId = `going-twice-${lotNum}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'GOING_TWICE',
        priority: AnimationPriority.GOING_TWICE,
        timestamp: Date.now(),
        franchiseCode: highestBidder || undefined,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });
    } else if (phase === 'FINALIZING') {
      const eventId = `final-call-${lotNum}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'FINAL_CALL',
        priority: AnimationPriority.FINAL_CALL,
        timestamp: Date.now(),
        franchiseCode: highestBidder || undefined,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });
    } else if (phase === 'SOLD' || isSoldProp) {
      const eventId = `sold-${lotNum}-${highestBidder || 'winner'}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'SOLD',
        priority: AnimationPriority.SOLD,
        timestamp: Date.now(),
        franchiseCode: highestBidder || undefined,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });
    } else if (phase === 'UNSOLD') {
      const eventId = `unsold-${lotNum}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'UNSOLD',
        priority: AnimationPriority.UNSOLD,
        timestamp: Date.now(),
        basePriceLakhs: basePrice,
      });
    } else if (phase === 'BIDDING') {
      const eventId = `bidding-open-${lotNum}`;
      this.dispatchIfNew({
        eventId,
        roomVersion: snapshot.version,
        lotNumber: lotNum,
        type: 'BIDDING',
        priority: AnimationPriority.AMBIENCE,
        timestamp: Date.now(),
        franchiseCode: highestBidder || undefined,
        amountLakhs: currentBid,
        basePriceLakhs: basePrice,
      });
    }

    this.lastRoomVersion = snapshot.version;
    this.lastPhase = phase;
    this.lastCategoryIndex = catIndex;
  }

  public getDebugState() {
    return {
      lastRoomVersion: this.lastRoomVersion,
      lastLotNumber: this.lastLotNumber,
      lastPhase: this.lastPhase,
      lastCategoryIndex: this.lastCategoryIndex,
    };
  }

  /**
   * Dispatches event only if its eventId has not already been executed,
   * guaranteeing idempotency and preventing loop replays on heartbeat ticks.
   */
  private dispatchIfNew(event: ArenaEvent) {
    if (this.processedEventIds.has(event.eventId)) {
      return;
    }

    this.processedEventIds.add(event.eventId);
    // Keep cache bounded to prevent memory growth across long auctions
    if (this.processedEventIds.size > 200) {
      const iterator = this.processedEventIds.values();
      for (let i = 0; i < 50; i++) {
        const next = iterator.next();
        if (next.done) break;
        this.processedEventIds.delete(next.value);
      }
    }

    this.animationManager.dispatchEvent(event);
  }
}
