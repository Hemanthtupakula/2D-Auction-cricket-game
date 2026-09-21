/**
 * Auction XI — Audio Announcer Bridge
 * Delegates authoritative domain announcements to AuctionAudioManager
 * Powered by standardized en-IN-PrabhatNeural pre-generated audio pack + SpeechSynthesis fallback
 */

import { auctionAudioManager } from './auctionAudioManager';

class AuctionAnnouncer {
  public setMuted(muted: boolean) {
    auctionAudioManager.setMuted(muted);
  }

  public isMuted(): boolean {
    return auctionAudioManager.getIsMuted();
  }

  public setEnabled(enabled: boolean) {
    auctionAudioManager.setMuted(!enabled);
  }

  public isEnabled(): boolean {
    return !auctionAudioManager.getIsMuted();
  }

  public setVolume(vol: number) {
    auctionAudioManager.setVolume(vol);
  }

  public getVolume(): number {
    return auctionAudioManager.getVolume();
  }

  public stop() {
    auctionAudioManager.stop();
  }

  public unlock(): Promise<boolean> {
    return auctionAudioManager.unlock();
  }

  public isUnlocked(): boolean {
    return auctionAudioManager.isUnlocked();
  }

  public updateContext(roomVersion?: number, lotNumber?: number) {
    auctionAudioManager.updateContext(roomVersion, lotNumber);
  }

  public formatPriceWords(amountLakhs: number): string {
    return auctionAudioManager.formatAuctionAmount(amountLakhs);
  }

  // --- Authoritative Event Triggers ---

  public announcePlayerReveal(
    lot: number,
    name: string,
    country: string,
    role: string,
    basePriceLakhs: number,
    playerId?: string
  ) {
    auctionAudioManager.announcePlayerReveal(lot, name, country, role, basePriceLakhs, playerId);
  }

  public announceBiddingOpen(lotNumber?: number) {
    auctionAudioManager.announceBiddingOpen(lotNumber);
  }

  public announceBid(franchiseCode: string, franchiseName: string, amountLakhs: number, lotNumber?: number) {
    auctionAudioManager.announceBid(franchiseCode, franchiseName, amountLakhs, lotNumber);
  }

  public announceOutbid(franchiseCode: string, lotNumber?: number) {
    auctionAudioManager.announceOutbid(franchiseCode, lotNumber);
  }

  public announceGoingOnce(amountLakhs: number, lotNumber?: number) {
    auctionAudioManager.announceGoingOnce(amountLakhs, lotNumber);
  }

  public announceGoingTwice(amountLakhs: number, lotNumber?: number) {
    auctionAudioManager.announceGoingTwice(amountLakhs, lotNumber);
  }

  public announceFinalCall(amountLakhs: number, lotNumber?: number) {
    auctionAudioManager.announceFinalCall(amountLakhs, lotNumber);
  }

  public announceSold(name: string, franchiseCode: string, amountLakhs: number, lotNumber?: number, playerId?: string) {
    auctionAudioManager.announceSold(name, franchiseCode, amountLakhs, lotNumber, playerId);
  }

  public announceUnsold(name: string, lotNumber?: number, playerId?: string) {
    auctionAudioManager.announceUnsold(name, lotNumber, playerId);
  }

  public announceNextPlayer() {
    auctionAudioManager.announceNextPlayer();
  }

  public announcePause() {
    auctionAudioManager.announcePause();
  }

  public announceResume() {
    auctionAudioManager.announceResume();
  }

  public announceStop() {
    auctionAudioManager.announceStop();
  }
}

export const announcer = new AuctionAnnouncer();

