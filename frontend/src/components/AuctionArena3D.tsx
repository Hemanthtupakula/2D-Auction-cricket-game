import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomStateSnapshot, AuctionLot } from '../types';
import { loadGrandArenaAsset } from './arena3d/arenaAssetLoader';
import { ArenaAnimationManager } from './arena3d/ArenaAnimationManager';
import { ArenaEventController } from './arena3d/ArenaEventController';
import { calculateClampedTension } from './arena3d/ArenaState';

export interface AuctionArena3DProps {
  snapshot: RoomStateSnapshot;
  currentLot: AuctionLot | null;
  cameraFocus?: 'STAGE' | 'BIDDER' | 'OVERVIEW';
  isSold?: boolean;
  liteMode?: boolean;
  onFallbackToHud?: () => void;
}

export const AuctionArena3D: React.FC<AuctionArena3DProps> = ({
  snapshot,
  currentLot,
  isSold = false,
  liteMode = false,
  onFallbackToHud,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);

  const managerRef = useRef<ArenaAnimationManager | null>(null);
  const eventCtrlRef = useRef<ArenaEventController | null>(null);

  // 1. Initial Scene Setup & Asset Loading
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL context verification
    try {
      const testCanvas = document.createElement('canvas');
      const gl =
        testCanvas.getContext('webgl2') ||
        testCanvas.getContext('webgl') ||
        testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        onFallbackToHud?.();
        return;
      }
    } catch (_e) {
      setHasWebGL(false);
      onFallbackToHud?.();
      return;
    }

    let isCancelled = false;
    let reqId: number;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const aspect = width / height;

    // WebGL Renderer configuration
    const renderer = new THREE.WebGLRenderer({
      antialias: !liteMode,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, liteMode ? 1 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);

    // Asynchronously load Blender GLB or procedural fallback
    loadGrandArenaAsset('/models/AuctionXI_GrandArena_V2.glb', liteMode)
      .then((sceneResult) => {
        if (isCancelled) return;

        const manager = new ArenaAnimationManager(sceneResult, aspect, liteMode);
        const eventCtrl = new ArenaEventController(manager);

        managerRef.current = manager;
        eventCtrlRef.current = eventCtrl;

        // Ingest initial state
        eventCtrl.ingestSnapshot(snapshot, currentLot, isSold);
        setIsReady(true);

        // Main animation loop
        const animate = () => {
          manager.tick();
          manager.render(renderer);
          reqId = requestAnimationFrame(animate);
        };
        reqId = requestAnimationFrame(animate);
      })
      .catch((err) => {
        console.error('Failed to initialize 3D Arena:', err);
        setHasWebGL(false);
        onFallbackToHud?.();
      });

    // Window resize handler
    const handleResize = () => {
      if (!container || !managerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      managerRef.current.handleResize(w, h);
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      if (managerRef.current) {
        managerRef.current.dispose();
      }
      renderer.dispose();
    };
  }, [liteMode, onFallbackToHud]);

  // 2. Authoritative State Synchronization
  useEffect(() => {
    if (eventCtrlRef.current) {
      eventCtrlRef.current.ingestSnapshot(snapshot, currentLot, isSold);
    }
  }, [snapshot, currentLot, isSold]);

  // WebGL Fallback display
  if (!hasWebGL) {
    return (
      <div className="w-full h-full min-h-[360px] bg-slate-950/80 rounded-3xl border border-slate-800 flex items-center justify-center p-6 text-center text-slate-400">
        <div>
          <p className="text-sm font-bold text-amber-400 mb-1">WebGL Fallback Active</p>
          <p className="text-xs max-w-sm mx-auto">
            Switching to Tactical HUD view for optimal device responsiveness. Live synchronized bidding remains fully operational.
          </p>
        </div>
      </div>
    );
  }

  // Calculate live tension for HUD display
  const currentBid = currentLot?.currentBidLakhs ?? 0;
  const basePrice = currentLot?.basePriceLakhs ?? 1;
  const tension = calculateClampedTension(currentBid, basePrice);
  const highestBidder = currentLot?.highestBidderFranchise;

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#040711]">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full min-h-[380px]" />

      {/* Floating Tactical HUD Overlay */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider">3D GRAND ARENA</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400">10 PODIUMS</span>
          {liteMode && (
            <>
              <span className="text-slate-500">|</span>
              <span className="text-blue-400 font-bold">LITE</span>
            </>
          )}
        </div>

        {highestBidder && (
          <div className="px-3 py-1 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center space-x-2 animate-pulse shadow-lg">
            <span>🔥 LEADER:</span>
            <span className="font-mono text-white">{highestBidder}</span>
            <span>(₹{(currentBid / 100).toFixed(2)} Cr)</span>
            {tension > 1.4 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                {tension.toFixed(1)}x
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle loader while initializing */}
      {!isReady && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center pointer-events-none">
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400">
            <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>INITIALIZING GRAND ARENA 3D...</span>
          </div>
        </div>
      )}
    </div>
  );
};
