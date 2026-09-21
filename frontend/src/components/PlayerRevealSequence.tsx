import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Player } from '../types';
import { announcer } from '../services/announcer';
import { Sparkles, Globe, ChevronRight } from 'lucide-react';
import { resolvePlayerPhoto, handleImageFallback } from '../services/mediaResolver';

interface PlayerRevealSequenceProps {
  player: Player;
  onComplete?: () => void;
}

export const PlayerRevealSequence: React.FC<PlayerRevealSequenceProps> = ({
  player,
  onComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // 1. Authoritative Announcement Trigger (Non-blocking)
    announcer.announcePlayerReveal(
      player.lotNumber,
      player.fullName,
      player.country,
      player.role,
      player.basePrice / 100000,
      player.id
    );

    // 2. Hard Safety Watchdog (Guarantees dismissal within 3.6s under any circumstance)
    const hardTimeout = setTimeout(() => {
      onCompleteRef.current?.();
    }, 3600);

    const container = mountRef.current;
    if (!container) return () => clearTimeout(hardTimeout);

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let chitGeo: THREE.BoxGeometry | null = null;
    let chitMat: THREE.MeshStandardMaterial | null = null;
    let chit: THREE.Mesh | null = null;
    let pGeo: THREE.BufferGeometry | null = null;
    let pMat: THREE.PointsMaterial | null = null;
    let particles: THREE.Points | null = null;
    let reqId: number | null = null;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.z = 6.5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.replaceChildren(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const goldLight = new THREE.PointLight(0xf59e0b, 3.5, 30);
      goldLight.position.set(4, 4, 5);
      scene.add(goldLight);

      const blueLight = new THREE.PointLight(0x38bdf8, 2.5, 30);
      blueLight.position.set(-4, -3, 4);
      scene.add(blueLight);

      chitGeo = new THREE.BoxGeometry(2.3, 3.2, 0.08);
      chitMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.85,
        roughness: 0.2,
      });
      chit = new THREE.Mesh(chitGeo, chitMat);
      scene.add(chit);

      const pCount = 50;
      pGeo = new THREE.BufferGeometry();
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount * 3; i++) {
        pPos[i] = (Math.random() - 0.5) * 8;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      pMat = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xfde047,
        transparent: true,
        opacity: 0.75,
      });
      particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);
    } catch (e) {
      console.warn('[PlayerRevealSequence] WebGL init failed, using graceful 2D presentation:', e);
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000.0;

      if (elapsed < 0.6) {
        setStep(1);
        if (chit && camera) {
          chit.position.y = Math.sin(elapsed * 4) * 0.1;
          camera.position.z = 6.5 - elapsed * 0.8;
        }
      } else if (elapsed < 1.3) {
        setStep(2);
        if (chit) {
          chit.rotation.z = Math.sin(elapsed * 18) * 0.25;
          chit.position.x = Math.cos(elapsed * 16) * 0.3;
          chit.rotation.y += 0.08;
        }
      } else if (elapsed < 2.0) {
        setStep(3);
        if (chit) {
          const spinT = (elapsed - 1.3) / 0.7;
          chit.rotation.y += (1 - spinT * 0.6) * 0.35;
          chit.rotation.x = Math.sin(spinT * Math.PI) * 0.2;
          chit.position.set(0, 0, 0);
        }
      } else if (elapsed < 2.3) {
        setStep(4);
        if (chit) {
          chit.rotation.set(0, 0, 0);
          chit.position.set(0, 0, 0);
        }
      } else if (elapsed < 2.6) {
        setStep(5);
      } else if (elapsed < 2.9) {
        setStep(6);
      } else if (elapsed < 3.2) {
        setStep(7);
      } else {
        setStep(8);
      }

      if (particles && scene && camera && renderer) {
        particles.rotation.y = elapsed * 0.05;
        renderer.render(scene, camera);
      }

      if (elapsed < 3.4) {
        reqId = requestAnimationFrame(animate);
      } else {
        onCompleteRef.current?.();
      }
    };

    reqId = requestAnimationFrame(animate);

    return () => {
      clearTimeout(hardTimeout);
      if (reqId !== null) cancelAnimationFrame(reqId);
      if (renderer) renderer.dispose();
      if (chitGeo) chitGeo.dispose();
      if (chitMat) chitMat.dispose();
      if (pGeo) pGeo.dispose();
      if (pMat) pMat.dispose();
    };
  }, [player.id, player.lotNumber]);

  const formatLakhs = (lakhs: number) => {
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs} L`;
  };

  const basePriceLakhs = player.basePrice >= 100000 ? Math.round(player.basePrice / 100000) : player.basePrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      {/* Cinematic Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0e1424] border border-amber-500/50 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center">
        {/* Step 1-4: 3D Chit Shuffling Stage */}
        <div className="relative w-full flex flex-col items-center justify-center">
          <div
            ref={mountRef}
            className={`w-full h-56 transition-all duration-500 ${step >= 5 ? 'opacity-20 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}
          />

          {/* Lot Header Badge */}
          <div className="absolute top-0 inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black tracking-widest uppercase shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>LOT #{String(player.lotNumber).padStart(3, '0')} • SET {player.auctionSet}</span>
          </div>
        </div>

        {/* Step 5 (2.4s+): Player Image Reveal */}
        {step >= 5 && (
          <div className="animate-zoomIn mt-1 relative">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-amber-500 shadow-xl shadow-amber-500/25 bg-slate-900 mx-auto">
              <img
                src={resolvePlayerPhoto(player, 'hero').url}
                alt={player.fullName}
                className="w-full h-full object-cover"
                onError={handleImageFallback}
              />
              {player.isOverseas && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                  OS
                </span>
              )}
            </div>
          </div>
        )}

        {/* Step 6 (2.7s+): Player Name Reveal */}
        {step >= 6 && (
          <div className="animate-fadeIn mt-3 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {player.fullName}
            </h2>
          </div>
        )}

        {/* Step 7 (3.0s+): Country + Role + Capped status */}
        {step >= 7 && (
          <div className="animate-fadeIn flex flex-wrap items-center justify-center gap-2 mt-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center space-x-1">
              <Globe className="w-3 h-3 text-amber-400" />
              <span>{player.country}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-semibold">
              {player.role}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
              {player.isCapped ? 'Capped' : 'Uncapped'}
            </span>
          </div>
        )}

        {/* Step 8 (3.2s+): Base Price & Key Stats */}
        {step >= 8 && (
          <div className="animate-zoomIn w-full mt-4 space-y-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 flex items-center justify-between px-6">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                Opening Base Price
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {formatLakhs(basePriceLakhs)}
              </span>
            </div>

            {/* Key IPL Statistics (Never fabricated) */}
            {player.ipl ? (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Matches</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {player.ipl.matches ?? '-'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {player.role === 'Bowler' ? 'Wickets' : 'Runs'}
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {player.role === 'Bowler' ? player.ipl.wickets ?? '-' : player.ipl.runs ?? '-'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {player.role === 'Bowler' ? 'Econ' : 'SR'}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {player.role === 'Bowler' ? player.ipl.economy ?? '-' : player.ipl.strikeRate ?? '-'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {player.role === 'Bowler' ? 'Best' : '100s/50s'}
                  </span>
                  <span className="font-mono font-bold text-blue-400 text-sm">
                    {player.role === 'Bowler'
                      ? player.ipl.bestBowling ?? '-'
                      : `${player.ipl.hundreds ?? 0}/${player.ipl.fifties ?? 0}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                Debut / Uncapped • No prior IPL appearance recorded
              </div>
            )}
          </div>
        )}

        {/* Non-Blocking Dismiss Action */}
        <button
          onClick={() => onCompleteRef.current?.()}
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-full transition-all cursor-pointer shadow-sm"
        >
          <span>Skip to Bidding</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
