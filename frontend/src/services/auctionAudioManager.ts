/**
 * Auction XI — Local Sound Effects Engine (Phase 5, Section 3)
 * Zero TTS, zero network: pre-bundled clips in /public/audio/sfx/ play in <20ms.
 */

export type AudioPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface VoiceEvent {
  id: string;
  type:
    | 'PLAYER_REVEAL'
    | 'BIDDING_OPEN'
    | 'NEW_BID'
    | 'OUTBID'
    | 'GOING_ONCE'
    | 'GOING_TWICE'
    | 'FINAL_CALL'
    | 'SOLD'
    | 'UNSOLD'
    | 'PAUSED'
    | 'RESUMED'
    | 'STOPPED'
    | 'AUDIO_READY'
    | 'EFFECT';
  priority: AudioPriority;
  roomCode?: string;
  roomVersion?: number;
  lotNumber?: number;
  playerId?: string;
  text?: string;
  audioUrls?: string[];
  sfxUrl?: string;
  timestamp: number;
}

export type AudioManagerStatus = 'LOCKED' | 'READY' | 'PLAYING' | 'BLOCKED' | 'ERROR';

const SFX_BASE = '/audio/sfx';

const SFX = {
  bid: `${SFX_BASE}/bid.mp3`,
  goingOnce: `${SFX_BASE}/going-once.mp3`,
  goingTwice: `${SFX_BASE}/going-twice.mp3`,
  thirdCall: `${SFX_BASE}/third-call.mp3`,
  sold: `${SFX_BASE}/sold-hammer.mp3`,
  unsold: `${SFX_BASE}/unsold-buzzer.mp3`,
  cheer: `${SFX_BASE}/crowd-cheer.mp3`,
  category: `${SFX_BASE}/category-change.mp3`,
} as const;

const CLIP_DEBOUNCE_MS = 250;

class AuctionAudioManager {
  private status: AudioManagerStatus = 'LOCKED';
  private listeners = new Set<(status: AudioManagerStatus, isMuted: boolean) => void>();
  private isMuted = false;
  private volumeMaster = 1.0;
  private current: HTMLAudioElement | null = null;
  private lastPlayAt = new Map<string, number>();

  public subscribe(fn: (status: AudioManagerStatus, isMuted: boolean) => void) {
    this.listeners.add(fn);
    fn(this.status, this.isMuted);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(status: AudioManagerStatus) {
    this.status = status;
    this.listeners.forEach((l) => l(status, this.isMuted));
  }

  public getStatus(): AudioManagerStatus {
    return this.status;
  }

  public async unlock(): Promise<boolean> {
    if (this.status !== 'LOCKED') return true;
    try {
      const probe = new Audio(SFX.bid);
      probe.volume = 0;
      await probe.play();
      probe.pause();
      this.emit('READY');
      Object.values(SFX).forEach((url) => {
        const a = new Audio();
        a.preload = 'auto';
        a.src = url;
      });
      return true;
    } catch {
      this.emit('BLOCKED');
      return false;
    }
  }

  public isUnlocked(): boolean {
    return this.status !== 'LOCKED';
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) this.stop();
    this.listeners.forEach((l) => l(this.status, this.isMuted));
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.volumeMaster = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.volumeMaster;
  }

  public updateContext(_roomVersion?: number, _lotNumber?: number) {
    /* context tracking is unnecessary for the local SFX layer */
  }

  private playClip(url: string, { interrupt = false }: { interrupt?: boolean } = {}) {
    if (this.isMuted || typeof window === 'undefined') return;
    const now = Date.now();
    const last = this.lastPlayAt.get(url) || 0;
    if (now - last < CLIP_DEBOUNCE_MS) return;
    this.lastPlayAt.set(url, now);
    try {
      if (interrupt && this.current) {
        this.current.pause();
        this.current = null;
      }
      const audio = new Audio(url);
      audio.volume = this.volumeMaster;
      this.current = audio;
      void audio.play().catch(() => {});
    } catch {
      /* sound is presentation-only; never throw */
    }
  }

  public play(event: VoiceEvent) {
    switch (event.type) {
      case 'PLAYER_REVEAL':
        this.playClip(SFX.category);
        break;
      case 'BIDDING_OPEN':
      case 'NEW_BID':
      case 'OUTBID':
        this.playClip(SFX.bid);
        break;
      case 'GOING_ONCE':
        this.playClip(SFX.goingOnce);
        break;
      case 'GOING_TWICE':
        this.playClip(SFX.goingTwice);
        break;
      case 'FINAL_CALL':
        this.playClip(SFX.thirdCall, { interrupt: true });
        break;
      case 'SOLD':
        this.playClip(SFX.sold, { interrupt: true });
        this.playClip(SFX.cheer);
        break;
      case 'UNSOLD':
        this.playClip(SFX.unsold, { interrupt: true });
        break;
      case 'EFFECT':
        if (event.sfxUrl) this.playClip(event.sfxUrl);
        break;
      default:
        break;
    }
  }

  public stop() {
    if (this.current) {
      try {
        this.current.pause();
      } catch {
        /* ignore */
      }
      this.current = null;
    }
  }

  public getManifests() {
    return { audio: {}, teams: {}, players: {} };
  }

  public getAudioCache() {
    return new Map<string, string>();
  }

  public getCurrentSpeech(): string | null {
    return null;
  }

  public formatAuctionAmount(amountLakhs: number): string {
    if (amountLakhs >= 100) {
      const cr = amountLakhs / 100;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
    }
    return `₹${amountLakhs} L`;
  }

  public resolveNumberAudio(_amountLakhs: number): string[] {
    return [];
  }

  public resolveTeamAudio(_code: string): string {
    return '';
  }

  public announcePlayerReveal(_lot: number, _name: string, _country: string, _role: string, _basePriceLakhs: number, _playerId?: string) {
    this.playClip(SFX.category);
  }

  public announceBiddingOpen(_lotNumber?: number) {
    this.playClip(SFX.bid);
  }

  public announceBid(_franchiseCode: string, _franchiseName: string, _amountLakhs: number, _lotNumber?: number) {
    this.playClip(SFX.bid);
  }

  public announceOutbid(_franchiseCode: string, _lotNumber?: number) {
    this.playClip(SFX.bid);
  }

  public announceGoingOnce(_amountLakhs: number, _lotNumber?: number) {
    this.playClip(SFX.goingOnce);
  }

  public announceGoingTwice(_amountLakhs: number, _lotNumber?: number) {
    this.playClip(SFX.goingTwice);
  }

  public announceFinalCall(_amountLakhs: number, _lotNumber?: number) {
    this.playClip(SFX.thirdCall, { interrupt: true });
  }

  public announceSold(_name: string, _franchiseCode: string, _amountLakhs: number, _lotNumber?: number, _playerId?: string) {
    this.playClip(SFX.sold, { interrupt: true });
    this.playClip(SFX.cheer);
  }

  public announceUnsold(_name: string, _lotNumber?: number, _playerId?: string) {
    this.playClip(SFX.unsold, { interrupt: true });
  }

  public announceNextPlayer() {
    this.playClip(SFX.category);
  }

  public announcePause() {
    this.stop();
  }

  public announceResume() {
    /* silent */
  }

  public announceStop() {
    this.stop();
  }
}

export const auctionAudioManager = new AuctionAudioManager();
