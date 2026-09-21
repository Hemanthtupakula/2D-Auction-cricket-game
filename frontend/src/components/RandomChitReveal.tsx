import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Player } from '../types';
import { announcer } from '../services/announcer';
import { Sparkles, Trophy, Volume2, VolumeX, X, ArrowRight } from 'lucide-react';
import { resolvePlayerPhoto, handleImageFallback } from '../services/mediaResolver';

interface RandomChitRevealProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onStartBidding?: (player: Player) => void;
  actionButtonLabel?: string;
  canStart?: boolean;
  disabledReason?: string;
}

export const RandomChitReveal: React.FC<RandomChitRevealProps> = ({
  player,
  isOpen,
  onClose,
  onStartBidding,
  actionButtonLabel,
  canStart = true,
  disabledReason,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [muted, setMuted] = useState(!announcer.isEnabled());

  useEffect(() => {
    if (!isOpen || !mountRef.current || !player) return;

    setRevealed(false);

    // Three.js Scene Setup
    const width = mountRef.current.clientWidth || 400;
    const height = mountRef.current.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 3, 50);
    goldLight.position.set(5, 5, 5);
    scene.add(goldLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 2, 50);
    blueLight.position.set(-5, -5, 5);
    scene.add(blueLight);

    // 3D Card / Chit Geometry
    const geometry = new THREE.BoxGeometry(2.4, 3.4, 0.1);

    // Materials: Gold metallic edge and back
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });

    const cardMesh = new THREE.Mesh(geometry, goldMaterial);
    scene.add(cardMesh);

    // Sparkle particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 80;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 10;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation physics
    let reqId: number;
    let startTime = performance.now();
    const duration = 2400; // 2.4s cinematic spin & landing
    let hasAnnounced = false;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Deceleration easing (easeOutCubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        // Fast spin that decelerates
        const spinSpeed = (1 - easeOut) * 25 + (1 - progress) * 5;
        cardMesh.rotation.y += spinSpeed * 0.03;
        cardMesh.rotation.x = Math.sin(elapsed * 0.005) * 0.35 * (1 - easeOut);
        cardMesh.rotation.z = Math.cos(elapsed * 0.004) * 0.25 * (1 - easeOut);
        cardMesh.position.y = Math.sin(elapsed * 0.008) * 0.4 * (1 - easeOut);

        particles.rotation.y += 0.005;
        renderer.render(scene, camera);
        reqId = requestAnimationFrame(animate);
      } else {
        // Landed squarely facing camera
        cardMesh.rotation.set(0, 0, 0);
        cardMesh.position.set(0, 0, 0);
        renderer.render(scene, camera);

        if (!hasAnnounced) {
          hasAnnounced = true;
          setRevealed(true);
          announcer.announcePlayerReveal(
            player.lotNumber,
            player.fullName,
            player.country,
            player.role,
            player.basePrice / 100000,
            player.id
          );
        }
      }
    };

    reqId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(reqId);
      announcer.stop();
      renderer.dispose();
      geometry.dispose();
      goldMaterial.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [isOpen, player]);

  if (!isOpen || !player) return null;

  const basePriceCrore = (player.basePrice / 10000000).toFixed(2);
  const basePriceLakh = player.basePrice / 100000;
  const priceDisplay =
    player.basePrice >= 10000000 ? `₹${basePriceCrore} Cr` : `₹${basePriceLakh} Lakh`;

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    announcer.setEnabled(!next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0e1424] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="font-extrabold text-sm tracking-wider uppercase text-amber-400">
              Random Chit Draw — Official Roster
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={muted ? 'Unmute Audio Voice' : 'Mute Audio Voice'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Canvas / Reveal Container */}
        <div className="relative flex flex-col items-center justify-center p-6 min-h-[360px] overflow-hidden">
          {/* Three.js Canvas Mount */}
          <div
            ref={mountRef}
            className={`w-full h-80 transition-opacity duration-700 ${revealed ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
          />

          {/* Revealed Player Card UI */}
          {revealed && (
            <div className="w-full flex flex-col items-center text-center animate-zoomIn space-y-4">
              {/* Lot Badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>LOT #{player.lotNumber} • SET {player.auctionSet}</span>
              </div>

              {/* Player Portrait */}
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-xl shadow-amber-500/20 bg-slate-900">
                <img
                  src={resolvePlayerPhoto(player, 'card').url}
                  alt={player.fullName}
                  className="w-full h-full object-cover"
                  onError={handleImageFallback}
                />
                <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/80 font-bold text-amber-300">
                  {player.country}
                </span>
              </div>

              {/* Name & Role */}
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">{player.fullName}</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center justify-center space-x-2">
                  <span>{player.role}</span>
                  <span>•</span>
                  <span>{player.battingStyle || 'Batter'}</span>
                  {player.bowlingStyle && (
                    <>
                      <span>•</span>
                      <span>{player.bowlingStyle}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Reserve Price Card */}
              <div className="w-full max-w-xs p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Base Price</span>
                <span className="text-lg font-black text-amber-400 font-mono">{priceDisplay}</span>
              </div>

              {/* Condensed Key Metrics */}
              {player.ipl ? (
                <div className="grid grid-cols-4 gap-2 w-full max-w-xs text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Matches</span>
                    <span className="font-bold text-white font-mono">{player.ipl.matches ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Runs</span>
                    <span className="font-bold text-amber-400 font-mono">{player.ipl.runs ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">SR</span>
                    <span className="font-bold text-emerald-400 font-mono">{player.ipl.strikeRate ?? '-'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Wkts</span>
                    <span className="font-bold text-blue-400 font-mono">{player.ipl.wickets ?? '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic bg-slate-900/40 px-4 py-2 rounded-lg border border-slate-800">
                  Debut Player • No prior IPL appearance recorded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Source: <strong className="text-slate-400">{player.source}</strong>
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            {onStartBidding && (
              <button
                onClick={() => onStartBidding(player)}
                disabled={!canStart}
                title={!canStart ? disabledReason : undefined}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{actionButtonLabel || 'Put on Auction Block'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
