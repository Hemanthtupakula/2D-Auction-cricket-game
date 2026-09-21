import { Client } from '@stomp/stompjs';
import { AllocationState, RoomStateSnapshot, AuctionBid } from '../types';

export interface AuctionEventMessage {
  eventType: string;
  payload: any;
  timestamp: number;
}

export class RealtimeManager {
  private client: Client | null = null;
  private roomCode: string = '';
  private onAllocationCallback: ((state: AllocationState) => void) | null = null;
  private onSnapshotCallback: ((snapshot: RoomStateSnapshot) => void) | null = null;
  private onAuctionEventCallback: ((event: AuctionEventMessage) => void) | null = null;
  private onBidCallback: ((bid: AuctionBid) => void) | null = null;
  private onAlertCallback: ((message: string) => void) | null = null;

  connect(
    roomCode: string,
    callbacks: {
      onAllocation?: (state: AllocationState) => void;
      onSnapshot?: (snapshot: RoomStateSnapshot) => void;
      onAuctionEvent?: (event: AuctionEventMessage) => void;
      onBid?: (bid: AuctionBid) => void;
      onAlert?: (msg: string) => void;
    }
  ) {
    this.roomCode = roomCode.toUpperCase();
    this.onAllocationCallback = callbacks.onAllocation || null;
    this.onSnapshotCallback = callbacks.onSnapshot || null;
    this.onAuctionEventCallback = callbacks.onAuctionEvent || null;
    this.onBidCallback = callbacks.onBid || null;
    this.onAlertCallback = callbacks.onAlert || null;

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProto = isHttps ? 'wss:' : 'ws:';
      const brokerURL = `${wsProto}//${window.location.host}/ws/auction`;

      this.client = new Client({
        brokerURL: brokerURL,
        reconnectDelay: 2000,
        // Spring's simple broker emits no server heartbeats; requiring them caused a
        // ~10s disconnect/reconnect storm. 0 disables enforcement -> socket stays stable.
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          console.log('[STOMP] Connected to room channel', this.roomCode);

          // 1. Allocation topic
          this.client?.subscribe(`/topic/room/${this.roomCode}/allocation`, (message) => {
            try {
              const state: AllocationState = JSON.parse(message.body);
              if (this.onAllocationCallback) {
                this.onAllocationCallback(state);
              }
            } catch (e) {
              console.error('[STOMP] Error parsing allocation state', e);
            }
          });

          // 2. Authoritative Room State topic
          this.client?.subscribe(`/topic/room/${this.roomCode}/state`, (message) => {
            try {
              const snapshot: RoomStateSnapshot = JSON.parse(message.body);
              if (this.onSnapshotCallback) {
                this.onSnapshotCallback(snapshot);
              }
            } catch (e) {
              console.error('[STOMP] Error parsing room snapshot', e);
            }
          });

          // 3. Auction Events topic
          this.client?.subscribe(`/topic/room/${this.roomCode}/auction`, (message) => {
            try {
              const event: AuctionEventMessage = JSON.parse(message.body);
              if (this.onAuctionEventCallback) {
                this.onAuctionEventCallback(event);
              }
            } catch (e) {
              console.error('[STOMP] Error parsing auction event', e);
            }
          });

          // 4. Bids topic
          this.client?.subscribe(`/topic/room/${this.roomCode}/bids`, (message) => {
            try {
              const bid: AuctionBid = JSON.parse(message.body);
              if (this.onBidCallback) {
                this.onBidCallback(bid);
              }
            } catch (e) {
              console.error('[STOMP] Error parsing bid', e);
            }
          });

          // 5. System alerts topic
          this.client?.subscribe(`/topic/room/${this.roomCode}/alerts`, (message) => {
            try {
              const payload = JSON.parse(message.body);
              if (this.onAlertCallback && payload.message) {
                this.onAlertCallback(payload.message);
              }
            } catch (e) {
              console.error('[STOMP] Error parsing alert message', e);
            }
          });
        },
        onStompError: (frame) => {
          console.warn('[STOMP] Protocol error', frame);
        },
        onWebSocketError: (event) => {
          console.warn('[STOMP] WebSocket transport error, falling back to polling', event);
        },
      });

      this.client.activate();
    } catch (err) {
      console.warn('[STOMP] Could not initialize WebSocket, relying on HTTP polling', err);
    }
  }

  isConnected(): boolean {
    return Boolean(this.client && this.client.connected);
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        // ignore
      }
      this.client = null;
    }
  }
}

export const realtimeManager = new RealtimeManager();
