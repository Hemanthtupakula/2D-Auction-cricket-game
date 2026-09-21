import * as THREE from 'three';
import { FranchiseCode } from '../../types';
export type { FranchiseCode };

// Canonical Blender & Procedural Node Names
export const ARENA_NODES = {
  CENTRAL_STAGE: 'CentralStage',
  PLAYER_STAGE: 'PlayerStage',
  LED_PANEL: 'LEDPanel',
  PLAYER_DISPLAY_SCREEN: 'PlayerDisplayScreen',

  PODIUMS: {
    MI: 'Podium_MI',
    CSK: 'Podium_CSK',
    RCB: 'Podium_RCB',
    KKR: 'Podium_KKR',
    RR: 'Podium_RR',
    SRH: 'Podium_SRH',
    GT: 'Podium_GT',
    LSG: 'Podium_LSG',
    DC: 'Podium_DC',
    PBKS: 'Podium_PBKS',
  } as Record<FranchiseCode, string>,

  CAMERAS: {
    WIDE: 'Camera_Wide',
    STAGE: 'Camera_Stage',
    PLAYER: 'Camera_Player',
    LEFT_BIDDER: 'Camera_LeftBidder',
    RIGHT_BIDDER: 'Camera_RightBidder',
    OVERHEAD: 'Camera_Overhead',
    WINNER: 'Camera_Winner',
  },
} as const;

export type ArenaCameraPreset = keyof typeof ARENA_NODES.CAMERAS;

// Zero AI: There are only ACTIVE_HUMAN and INACTIVE
export type FranchiseSeatStatus = 'ACTIVE_HUMAN' | 'INACTIVE';

export interface FranchiseVisualConfig {
  code: FranchiseCode;
  name: string;
  nodeName: string;
  primaryColor: number;
  secondaryColor: number;
  angleRadians: number;
  position: THREE.Vector3;
}

// 10 Official Franchises in Circular Order around the Arena
export const FRANCHISE_ORDER: FranchiseCode[] = [
  'MI',
  'CSK',
  'RCB',
  'KKR',
  'RR',
  'SRH',
  'GT',
  'LSG',
  'DC',
  'PBKS',
];

const ARENA_RADIUS = 8.8;

export const FRANCHISE_VISUAL_CONFIGS: Record<string, FranchiseVisualConfig> = (() => {
  const configs: Record<string, FranchiseVisualConfig> = {};
  const baseData: Record<
    FranchiseCode,
    { name: string; primary: number; secondary: number }
  > = {
    MI: { name: 'Mumbai Indians', primary: 0x004ba0, secondary: 0xd4af37 },
    CSK: { name: 'Chennai Super Kings', primary: 0xfbc02d, secondary: 0x004ba0 },
    RCB: { name: 'Royal Challengers Bengaluru', primary: 0xd32f2f, secondary: 0x000000 },
    KKR: { name: 'Kolkata Knight Riders', primary: 0x4a148c, secondary: 0xffd700 },
    RR: { name: 'Rajasthan Royals', primary: 0xe91e63, secondary: 0x004ba0 },
    SRH: { name: 'Sunrisers Hyderabad', primary: 0xf57c00, secondary: 0x000000 },
    GT: { name: 'Gujarat Titans', primary: 0x1b2838, secondary: 0xd4af37 },
    LSG: { name: 'Lucknow Super Giants', primary: 0x00acc1, secondary: 0xf57c00 },
    DC: { name: 'Delhi Capitals', primary: 0x1565c0, secondary: 0xd32f2f },
    PBKS: { name: 'Punjab Kings', primary: 0xc62828, secondary: 0xd4af37 },
  };

  FRANCHISE_ORDER.forEach((code, index) => {
    // Distribute around 360 degrees, offset so stage front is open
    const angle = (index / FRANCHISE_ORDER.length) * (Math.PI * 2) - Math.PI / 2;
    const x = Math.cos(angle) * ARENA_RADIUS;
    const z = Math.sin(angle) * ARENA_RADIUS;
    configs[code] = {
      code,
      name: baseData[code].name,
      nodeName: ARENA_NODES.PODIUMS[code],
      primaryColor: baseData[code].primary,
      secondaryColor: baseData[code].secondary,
      angleRadians: angle,
      position: new THREE.Vector3(x, 0, z),
    };
  });

  return configs as Record<FranchiseCode, FranchiseVisualConfig>;
})();

// Animation Priority Levels
// STOP > PAUSE > SOLD > UNSOLD > FINAL_CALL > GOING_TWICE > GOING_ONCE > PLAYER_REVEAL > BID > AMBIENCE
export enum AnimationPriority {
  AMBIENCE = 1,
  BID = 3,
  PLAYER_REVEAL = 4,
  GOING_ONCE = 5,
  GOING_TWICE = 6,
  FINAL_CALL = 7,
  UNSOLD = 8,
  SOLD = 8,
  PAUSE = 9,
  STOP = 10,
}

export type ArenaPhaseType =
  | 'AMBIENCE'
  | 'CATEGORY_PREVIEW'
  | 'CATEGORY_STARTED'
  | 'PLAYER_REVEAL'
  | 'BIDDING'
  | 'BID_PLACED'
  | 'GOING_ONCE'
  | 'GOING_TWICE'
  | 'FINAL_CALL'
  | 'SOLD'
  | 'UNSOLD'
  | 'WAITING_FOR_HOST'
  | 'PAUSED'
  | 'STOPPED';

export interface ArenaEvent {
  eventId: string;
  roomVersion?: number;
  lotNumber?: number;
  type: ArenaPhaseType;
  priority: AnimationPriority;
  timestamp: number;
  franchiseCode?: string;
  amountLakhs?: number;
  basePriceLakhs?: number;
  playerName?: string;
  categoryName?: string;
}

/**
 * Calculates clamped visual tension metric:
 * tension = currentBid / basePrice, clamped to [1.0, 3.5] to prevent visual blowouts
 */
export function calculateClampedTension(currentBidLakhs: number, basePriceLakhs: number): number {
  const safeBase = Math.max(basePriceLakhs, 1);
  const ratio = currentBidLakhs / safeBase;
  return Math.min(3.5, Math.max(1.0, ratio));
}
