import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FieldPreset, FIELD_PRESETS } from './MiniMatchFieldMap';

export interface MiniMatch3DCanvasProps {
  viewMode: 'BATTER_VIEW' | 'BOWLER_VIEW';
  fieldPreset?: FieldPreset;
  bannerEvent: {
    type: 'FOUR' | 'SIX' | 'WICKET_BOWLED' | 'WICKET_CAUGHT' | 'WICKET_LBW' | 'WICKET_RUNOUT' | 'DOT' | null;
    title: string;
    subtitle: string;
    runs?: number;
  } | null;
  isDelivering?: boolean;
  isBatSwinging?: boolean;
  bowlerFranchise?: string;
  batterFranchise?: string;
  strikerName?: string;
  bowlerName?: string;
  aimX?: number;
  aimZ?: number;
  onAimChange?: (x: number, z: number) => void;
  onAimLock?: (x: number, z: number) => void;
  canAim?: boolean;
  deliveryType?: string;
  bowlingSpeed?: string;
  batIntent?: 'DEFENSIVE' | 'NORMAL' | 'LOFT' | 'LEAVE';
}

type BatterPose = 'READY' | 'DEFEND' | 'DRIVE' | 'PULL' | 'LOFT' | 'LEAVE';

// Franchise Theme Palette Map
const FRANCHISE_COLORS: Record<string, { primary: string; secondary: string }> = {
  CSK: { primary: '#fbc02d', secondary: '#004ba0' },
  MI: { primary: '#004ba0', secondary: '#d4af37' },
  RCB: { primary: '#d32f2f', secondary: '#0f172a' },
  KKR: { primary: '#4a148c', secondary: '#ffd700' },
  RR: { primary: '#e91e63', secondary: '#004ba0' },
  SRH: { primary: '#f57c00', secondary: '#0f172a' },
  GT: { primary: '#1b2838', secondary: '#d4af37' },
  LSG: { primary: '#00acc1', secondary: '#f57c00' },
  DC: { primary: '#1565c0', secondary: '#d32f2f' },
  PBKS: { primary: '#c62828', secondary: '#d4af37' },
};

function getFranchiseColors(code?: string): { primary: string; secondary: string } {
  if (code && FRANCHISE_COLORS[code]) return FRANCHISE_COLORS[code];
  return { primary: '#0284c7', secondary: '#0369a1' };
}

// Procedural Sprite Generator for 2.5D Billboard Characters
function createBillboardTexture(
  type: 'BATTER' | 'BOWLER' | 'FIELDER' | 'KEEPER',
  pose: BatterPose | 'RUNUP' | 'RELEASE' | 'STANDING',
  primaryColor: string,
  secondaryColor: string,
  playerName?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 512);

  const cx = 128;
  const baseY = 460;
  const stanceOffset = pose === 'PULL' ? -15 : pose === 'DRIVE' ? 15 : 0;

  // Shadow at feet
  const shadowGrad = ctx.createRadialGradient(cx, baseY, 5, cx, baseY, 60);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 52, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();

  if (type === 'BATTER') {
    // 2.5D Stylized Cricketer Batter
    ctx.fillStyle = '#f8fafc'; // White batting pads
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;

    // Left Leg
    ctx.beginPath();
    ctx.roundRect(cx - 36 + stanceOffset, baseY - 160, 30, 150, 8);
    ctx.fill();
    ctx.stroke();

    // Right Leg
    ctx.beginPath();
    ctx.roundRect(cx + 6 + stanceOffset, baseY - 160, 30, 150, 8);
    ctx.fill();
    ctx.stroke();

    // Pad Straps
    ctx.fillStyle = '#cbd5e1';
    for (let y = baseY - 130; y <= baseY - 40; y += 30) {
      ctx.fillRect(cx - 34 + stanceOffset, y, 26, 6);
      ctx.fillRect(cx + 8 + stanceOffset, y, 26, 6);
    }

    // Torso / Team Jersey
    ctx.fillStyle = primaryColor;
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 45, baseY - 150);
    ctx.lineTo(cx + 45, baseY - 150);
    ctx.lineTo(cx + 52, baseY - 290);
    ctx.lineTo(cx - 52, baseY - 290);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Player Initial / Number on jersey
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    const displayNum = playerName ? playerName.slice(0, 3).toUpperCase() : '18';
    ctx.fillText(displayNum, cx, baseY - 200);

    // Arms & Batting Gloves
    ctx.fillStyle = primaryColor;
    ctx.fillRect(cx - 55, baseY - 285, 20, 80);
    ctx.fillRect(cx + 35, baseY - 285, 20, 80);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 45, baseY - 195, 14, 0, Math.PI * 2);
    ctx.arc(cx + 45, baseY - 195, 14, 0, Math.PI * 2);
    ctx.fill();

    // Neck & Helmet
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cx - 14, baseY - 315, 28, 30);

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(cx, baseY - 340, 36, 0, Math.PI * 2);
    ctx.fill();

    // Visor Grill
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, baseY - 335, 32, 0.2, Math.PI - 0.2);
    ctx.stroke();

  } else if (type === 'BOWLER') {
    // 2.5D Bowler Model in Athletic Action
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(cx - 30, baseY - 170);
    ctx.lineTo(cx - 40, baseY - 10);
    ctx.lineTo(cx - 15, baseY - 10);
    ctx.lineTo(cx - 5, baseY - 140);
    ctx.lineTo(cx + 5, baseY - 140);
    ctx.lineTo(cx + 15, baseY - 10);
    ctx.lineTo(cx + 40, baseY - 10);
    ctx.lineTo(cx + 30, baseY - 170);
    ctx.closePath();
    ctx.fill();

    // Spikes Shoes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 45, baseY - 12, 35, 12);
    ctx.fillRect(cx + 12, baseY - 12, 35, 12);

    // Jersey
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 42, baseY - 280, 84, 120, 12);
    ctx.fill();

    // Name on jersey
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    const bName = playerName ? playerName.slice(0, 3).toUpperCase() : '99';
    ctx.fillText(bName, cx, baseY - 210);

    // Head
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(cx, baseY - 330, 28, 0, Math.PI * 2);
    ctx.fill();

    // Bowling Arm
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 30, baseY - 270);
    ctx.lineTo(cx + 50, baseY - 420);
    ctx.stroke();

    // Cricket ball in hand
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + 50, baseY - 430, 14, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'KEEPER') {
    // Wicketkeeper crouching in stance
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 32, baseY - 120, 28, 110, 6);
    ctx.roundRect(cx + 4, baseY - 120, 28, 110, 6);
    ctx.fill();

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 38, baseY - 230, 76, 115, 10);
    ctx.fill();

    // Big Wicketkeeping Gloves
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx - 42, baseY - 170, 20, 0, Math.PI * 2);
    ctx.arc(cx + 42, baseY - 170, 20, 0, Math.PI * 2);
    ctx.fill();

    // Head & Helmet
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(cx, baseY - 270, 26, 0, Math.PI * 2);
    ctx.fill();

  } else {
    // 2.5D Fielder Sprite
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 28, baseY - 170, 24, 160, 6);
    ctx.roundRect(cx + 4, baseY - 170, 24, 160, 6);
    ctx.fill();

    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 36, baseY - 275, 72, 115, 10);
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(cx, baseY - 310, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(cx, baseY - 318, 25, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 5, baseY - 322, 35, 8);
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const MiniMatch3DCanvas: React.FC<MiniMatch3DCanvasProps> = ({
  viewMode = 'BATTER_VIEW',
  fieldPreset = 'BALANCED',
  bannerEvent,
  isDelivering = false,
  isBatSwinging = false,
  bowlerFranchise,
  batterFranchise,
  strikerName,
  bowlerName,
  aimX = 0,
  aimZ = 2.0,
  onAimChange,
  onAimLock,
  canAim = false,
  deliveryType = 'PACE',
  bowlingSpeed = 'MEDIUM',
  batIntent = 'NORMAL'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // References to communicate with Three.js animation loop without rebuilding entire scene
  const aimTargetRef = useRef<{ x: number; z: number }>({ x: aimX, z: aimZ });
  const deliveryTypeRef = useRef<string>(deliveryType);
  const bowlingSpeedRef = useRef<string>(bowlingSpeed);
  const batIntentRef = useRef<string>(batIntent);
  const isDeliveringRef = useRef<boolean>(isDelivering);
  const isBatSwingingRef = useRef<boolean>(isBatSwinging);
  const bannerEventRef = useRef<any>(bannerEvent);

  useEffect(() => {
    aimTargetRef.current = { x: aimX, z: aimZ };
  }, [aimX, aimZ]);

  useEffect(() => {
    deliveryTypeRef.current = deliveryType;
  }, [deliveryType]);

  useEffect(() => {
    bowlingSpeedRef.current = bowlingSpeed;
  }, [bowlingSpeed]);

  useEffect(() => {
    batIntentRef.current = batIntent;
  }, [batIntent]);

  useEffect(() => {
    isDeliveringRef.current = isDelivering;
  }, [isDelivering]);

  useEffect(() => {
    isBatSwingingRef.current = isBatSwinging;
  }, [isBatSwinging]);

  useEffect(() => {
    bannerEventRef.current = bannerEvent;
  }, [bannerEvent]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. THREE.JS SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep night stadium sky
    scene.fog = new THREE.FogExp2(0x060913, 0.011);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xcfd8dc, 0.65);
    scene.add(ambientLight);

    const floodLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    floodLight1.position.set(-20, 28, -12);
    floodLight1.castShadow = true;
    scene.add(floodLight1);

    const floodLight2 = new THREE.DirectionalLight(0xe0f2fe, 1.2);
    floodLight2.position.set(20, 28, -12);
    scene.add(floodLight2);

    const pitchSpot = new THREE.SpotLight(0xfffbeb, 2.2, 50, Math.PI / 3, 0.4);
    pitchSpot.position.set(0, 22, 0);
    pitchSpot.target.position.set(0, 0, 0);
    scene.add(pitchSpot);
    scene.add(pitchSpot.target);

    // 3. FLOODLIGHT TOWERS & STADIUM STANDS
    const createFloodlightTower = (x: number, z: number) => {
      const towerGroup = new THREE.Group();
      const mastGeo = new THREE.CylinderGeometry(0.35, 0.75, 26, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(x, 13, z);
      towerGroup.add(mast);

      const panelGeo = new THREE.BoxGeometry(5.0, 2.8, 0.5);
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(x, 26, z);
      panel.rotation.x = 0.35;
      towerGroup.add(panel);

      for (let row = -1; row <= 1; row++) {
        for (let col = -2; col <= 2; col++) {
          const bulbGeo = new THREE.SphereGeometry(0.38, 16, 16);
          const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(x + col * 0.9, 26 + row * 0.8, z + 0.35);
          towerGroup.add(bulb);
        }
      }

      const coneGeo = new THREE.ConeGeometry(14, 32, 32, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(coneGeo, coneMat);
      beam.position.set(x, 13, z + 7);
      beam.rotation.x = Math.PI / 2.7;
      towerGroup.add(beam);

      return towerGroup;
    };

    scene.add(createFloodlightTower(-25, -14));
    scene.add(createFloodlightTower(25, -14));
    scene.add(createFloodlightTower(-25, 20));
    scene.add(createFloodlightTower(25, 20));

    const standGeo = new THREE.CylinderGeometry(44, 48, 14, 36, 1, true, 0, Math.PI * 2);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, side: THREE.BackSide, roughness: 0.95 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 5;
    scene.add(stand);

    // 4. CRICKET GROUND & PITCH
    const groundGeo = new THREE.CircleGeometry(44, 64);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const ringGeo = new THREE.RingGeometry(18.5, 18.8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    const ropeGeo = new THREE.RingGeometry(41.8, 42.2, 64);
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = -Math.PI / 2;
    rope.position.y = 0.03;
    scene.add(rope);

    const pitchGeo = new THREE.PlaneGeometry(3.6, 22);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0.04, -1.5);
    pitch.receiveShadow = true;
    scene.add(pitch);

    const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const popCrease1 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.12), creaseMat);
    popCrease1.rotation.x = -Math.PI / 2;
    popCrease1.position.set(0, 0.06, 6.8);
    scene.add(popCrease1);

    const popCrease2 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.12), creaseMat);
    popCrease2.rotation.x = -Math.PI / 2;
    popCrease2.position.set(0, 0.06, -9.8);
    scene.add(popCrease2);

    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.2 });
    const bailsMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

    const createStumpsGroup = (zPos: number) => {
      const group = new THREE.Group();
      for (let i = -1; i <= 1; i++) {
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.25, 16), stumpMat);
        stump.position.set(i * 0.23, 0.62, zPos);
        stump.castShadow = true;
        group.add(stump);
      }
      const bails = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8), bailsMat);
      bails.rotation.z = Math.PI / 2;
      bails.position.set(0, 1.26, zPos);
      group.add(bails);
      return group;
    };

    const strikerStumps = createStumpsGroup(7.5);
    const bowlerStumps = createStumpsGroup(-10.5);
    scene.add(strikerStumps);
    scene.add(bowlerStumps);

    // 5. 3D DRAG-TO-AIM PITCH RETICLE (FOR BOWLING OWNER)
    const aimReticleGroup = new THREE.Group();
    const reticleInnerGeo = new THREE.RingGeometry(0.12, 0.22, 32);
    const reticleInnerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const reticleInner = new THREE.Mesh(reticleInnerGeo, reticleInnerMat);
    reticleInner.rotation.x = -Math.PI / 2;
    aimReticleGroup.add(reticleInner);

    const reticleOuterGeo = new THREE.RingGeometry(0.38, 0.44, 32);
    const reticleOuterMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const reticleOuter = new THREE.Mesh(reticleOuterGeo, reticleOuterMat);
    reticleOuter.rotation.x = -Math.PI / 2;
    aimReticleGroup.add(reticleOuter);

    const reticleDotGeo = new THREE.CircleGeometry(0.06, 16);
    const reticleDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const reticleDot = new THREE.Mesh(reticleDotGeo, reticleDotMat);
    reticleDot.rotation.x = -Math.PI / 2;
    aimReticleGroup.add(reticleDot);

    aimReticleGroup.position.set(aimTargetRef.current.x, 0.07, aimTargetRef.current.z);
    scene.add(aimReticleGroup);

    // 6. 2.5D BILLBOARD PLAYER SYSTEM WITH TEAM COLORS
    const batColors = getFranchiseColors(batterFranchise);
    const bowlColors = getFranchiseColors(bowlerFranchise);

    // Striker
    const batterTex = createBillboardTexture('BATTER', 'READY', batColors.primary, batColors.secondary, strikerName);
    const batterPlaneGeo = new THREE.PlaneGeometry(1.6, 3.2);
    const batterPlaneMat = new THREE.MeshBasicMaterial({ map: batterTex, transparent: true, side: THREE.DoubleSide });
    const batterBillboard = new THREE.Mesh(batterPlaneGeo, batterPlaneMat);
    batterBillboard.position.set(0.45, 1.6, 6.8);
    scene.add(batterBillboard);

    // 3D Bat
    const batGroup = new THREE.Group();
    const willowMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.24), willowMat);
    blade.position.set(0, -0.45, 0);
    blade.castShadow = true;
    batGroup.add(blade);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12), handleMat);
    handle.position.set(0, 0.25, 0);
    batGroup.add(handle);

    batGroup.position.set(0.15, 1.2, 7.0);
    batGroup.rotation.set(0.2, -0.4, 0.3);
    scene.add(batGroup);

    // Bowler
    const bowlerTex = createBillboardTexture('BOWLER', 'RUNUP', bowlColors.primary, bowlColors.secondary, bowlerName);
    const bowlerPlaneGeo = new THREE.PlaneGeometry(1.6, 3.2);
    const bowlerPlaneMat = new THREE.MeshBasicMaterial({ map: bowlerTex, transparent: true, side: THREE.DoubleSide });
    const bowlerBillboard = new THREE.Mesh(bowlerPlaneGeo, bowlerPlaneMat);
    bowlerBillboard.position.set(-0.5, 1.6, -13.5);
    scene.add(bowlerBillboard);

    // Non-Striker
    const nonStrikerTex = createBillboardTexture('BATTER', 'READY', batColors.primary, batColors.secondary, 'NS');
    const nonStrikerBillboard = new THREE.Mesh(batterPlaneGeo, new THREE.MeshBasicMaterial({ map: nonStrikerTex, transparent: true, side: THREE.DoubleSide }));
    nonStrikerBillboard.position.set(-1.4, 1.6, -9.5);
    scene.add(nonStrikerBillboard);

    // Wicketkeeper
    const keeperTex = createBillboardTexture('KEEPER', 'STANDING', bowlColors.primary, bowlColors.secondary, 'WK');
    const keeperBillboard = new THREE.Mesh(batterPlaneGeo, new THREE.MeshBasicMaterial({ map: keeperTex, transparent: true, side: THREE.DoubleSide }));
    keeperBillboard.position.set(0.1, 1.4, 9.8);
    scene.add(keeperBillboard);

    // Fielders
    const fielderTex = createBillboardTexture('FIELDER', 'STANDING', bowlColors.primary, bowlColors.secondary);
    const fielderPlaneMat = new THREE.MeshBasicMaterial({ map: fielderTex, transparent: true, side: THREE.DoubleSide });
    const fieldersGroup = new THREE.Group();

    const currentFielderPositions = FIELD_PRESETS[fieldPreset] || FIELD_PRESETS.BALANCED;
    currentFielderPositions.forEach((pos) => {
      if (pos.id === 'keeper') return;
      const fPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), fielderPlaneMat);
      const worldX = (pos.x / 50) * 32;
      const worldZ = (pos.y / 50) * 32;
      fPlane.position.set(worldX, 1.4, worldZ);
      fieldersGroup.add(fPlane);
    });
    scene.add(fieldersGroup);

    // 7. 3D BALL SPHERE WITH SEAM & GROUND SHADOW
    const ballGroup = new THREE.Group();
    const ballSphereGeo = new THREE.SphereGeometry(0.12, 24, 24);
    const ballLeatherMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
    const ballMesh = new THREE.Mesh(ballSphereGeo, ballLeatherMat);
    ballMesh.castShadow = true;
    ballGroup.add(ballMesh);

    const seamGeo = new THREE.TorusGeometry(0.121, 0.008, 8, 32);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    ballGroup.add(seam);

    const ballShadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
    const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), ballShadowMat);
    ballShadow.rotation.x = -Math.PI / 2;
    ballShadow.position.y = 0.05;
    scene.add(ballShadow);

    ballGroup.position.set(-0.5, 2.2, -13.5);
    scene.add(ballGroup);

    // Ball Motion Trail Ribbon Spheres
    const trailCount = 8;
    const trailPositions: THREE.Vector3[] = [];
    const trailMeshes: THREE.Mesh[] = [];
    const trailGeo = new THREE.SphereGeometry(0.08, 12, 12);
    for (let i = 0; i < trailCount; i++) {
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: ((trailCount - i) / trailCount) * 0.45,
      });
      const tMesh = new THREE.Mesh(trailGeo, trailMat);
      tMesh.visible = false;
      scene.add(tMesh);
      trailMeshes.push(tMesh);
    }

    // Bat-Ball Contact Flash Burst Mesh
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const flashMesh = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.7, 24), flashMat);
    flashMesh.position.set(0.2, 1.15, 6.8);
    flashMesh.rotation.x = -Math.PI / 3;
    scene.add(flashMesh);

    // Parallax Distant Stands & Crowd Silhouette Ring
    const crowdWallGeo = new THREE.CylinderGeometry(54, 58, 12, 36, 1, true);
    const crowdWallMat = new THREE.MeshBasicMaterial({
      color: 0x071120,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85
    });
    const crowdWall = new THREE.Mesh(crowdWallGeo, crowdWallMat);
    crowdWall.position.y = 7;
    scene.add(crowdWall);

    // 8. INTERACTIVE RAYCASTING FOR PITCH AIMING
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const updateAimFromEvent = (e: MouseEvent | TouchEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(pitch);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        // Clamp within legal pitch boundaries
        const clampedX = Math.max(-1.3, Math.min(1.3, pt.x));
        const clampedZ = Math.max(-1.5, Math.min(6.2, pt.z));

        aimTargetRef.current = { x: clampedX, z: clampedZ };
        aimReticleGroup.position.set(clampedX, 0.07, clampedZ);

        if (onAimChange) {
          onAimChange(parseFloat(clampedX.toFixed(2)), parseFloat(clampedZ.toFixed(2)));
        }
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!canAim) return;
      if ('touches' in e && e.cancelable) e.preventDefault();
      isDraggingRef.current = true;
      updateAimFromEvent(e);
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!canAim || !isDraggingRef.current) return;
      if ('touches' in e && e.cancelable) e.preventDefault();
      updateAimFromEvent(e);
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (onAimLock) {
          onAimLock(aimTargetRef.current.x, aimTargetRef.current.z);
        }
      }
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    container.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    // 9. ANIMATION STATE MACHINE
    let animProgress = 0;
    let dynamicCurve: THREE.CatmullRomCurve3 | null = null;
    let boundaryCurve: THREE.CatmullRomCurve3 | null = null;
    let flightDurationFactor = 0.016;

    const buildDeliveryCurve = () => {
      const aim = aimTargetRef.current;
      const dType = deliveryTypeRef.current;
      const speed = bowlingSpeedRef.current;

      // Adjust animation speed based on delivery speed
      if (speed === 'FAST') flightDurationFactor = 0.024;
      else if (speed === 'SLOW' || dType === 'SLOWER') flightDurationFactor = 0.011;
      else flightDurationFactor = 0.016;

      const releasePt = new THREE.Vector3(-0.4, 2.2, -9.8);
      const bouncePt = new THREE.Vector3(aim.x, 0.12, aim.z);

      // Determine bounce height and post-pitch trajectory
      let arrivalY = 0.9;
      let lateralSwing = 0;

      if (dType === 'BOUNCER' || aim.z < 0.5) {
        arrivalY = 1.95; // Head/shoulder height
      } else if (dType === 'YORKER' || aim.z > 4.8) {
        arrivalY = 0.22; // Base of stumps
      } else if (dType === 'SWING') {
        lateralSwing = aim.x > 0 ? -0.45 : 0.45; // Curve into or away from batter
      } else if (dType === 'CUTTER') {
        lateralSwing = 0.3; // Deviation off pitch
      }

      const arrivalPt = new THREE.Vector3(aim.x + lateralSwing, arrivalY, 6.8);

      // Curve with realistic mid-air flight arc
      const midFlightPt = new THREE.Vector3(
        (releasePt.x + bouncePt.x) * 0.5,
        1.65,
        (releasePt.z + bouncePt.z) * 0.5
      );

      dynamicCurve = new THREE.CatmullRomCurve3([releasePt, midFlightPt, bouncePt, arrivalPt]);
    };

    const buildBoundaryCurve = (isSix: boolean) => {
      const aim = aimTargetRef.current;
      const intent = batIntentRef.current;
      const startPt = new THREE.Vector3(aim.x, 1.0, 6.8);

      let targetX = intent === 'PULL' ? -28.0 : intent === 'LOFT' ? 14.0 : 26.0;
      let targetZ = intent === 'PULL' ? 18.0 : intent === 'LOFT' ? -38.0 : 36.0;
      let peakY = isSix ? 18.0 : 4.5;

      const apexPt = new THREE.Vector3(targetX * 0.5, peakY, targetZ * 0.5);
      const endPt = new THREE.Vector3(targetX, 0.2, targetZ);

      boundaryCurve = new THREE.CatmullRomCurve3([startPt, apexPt, endPt]);
    };

    const animate = () => {
      // Billboards face active camera in 3D world space
      batterBillboard.quaternion.copy(camera.quaternion);
      bowlerBillboard.quaternion.copy(camera.quaternion);
      nonStrikerBillboard.quaternion.copy(camera.quaternion);
      keeperBillboard.quaternion.copy(camera.quaternion);
      fieldersGroup.children.forEach((f) => {
        f.quaternion.copy(camera.quaternion);
      });

      // Reticle visual state & pulsing feedback
      aimReticleGroup.visible = canAim;
      if (canAim) {
        const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.12;
        reticleOuter.scale.set(pulse, pulse, pulse);
        const aim = aimTargetRef.current;
        aimReticleGroup.position.set(aim.x, 0.07, aim.z);

        // Highlight ring by delivery classification
        if (aim.z > 4.8) {
          (reticleInner.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b); // Orange for Yorker
        } else if (aim.z < 0.5) {
          (reticleInner.material as THREE.MeshBasicMaterial).color.setHex(0xef4444); // Red for Bouncer
        } else {
          (reticleInner.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8); // Cyan for Good
        }
      }

      const activeDelivering = isDeliveringRef.current;
      const activeBatSwinging = isBatSwingingRef.current;
      const currentBanner = bannerEventRef.current;

      if (!activeDelivering && !currentBanner) {
        // 🛑 IDLE STATE: Pitch is completely still waiting for human input!
        animProgress = 0;
        dynamicCurve = null;
        boundaryCurve = null;

        bowlerBillboard.position.set(-0.5, 1.6, -13.5);
        ballGroup.position.set(-0.5, 2.2, -13.5);
        ballShadow.position.set(-0.5, 0.05, -13.5);
        ballShadow.scale.setScalar(0.4);

        trailPositions.length = 0;
        trailMeshes.forEach((m) => { m.visible = false; });
        (flashMesh.material as THREE.MeshBasicMaterial).opacity = 0;

        batterBillboard.position.set(0.45, 1.6, 6.8);
        batGroup.position.set(0.15, 1.2, 7.0);
        batGroup.rotation.set(0.2, -0.4, 0.3);

        if (viewMode === 'BATTER_VIEW') {
          camera.position.set(0, 3.2, 12.5);
          camera.lookAt(0, 1.2, -10);
        } else {
          camera.position.set(0, 3.8, -16);
          camera.lookAt(0, 1.3, 7.5);
        }
      } else {
        // ⚡ ACTIVE DELIVERY (Advances only once per bowler action!)
        if (activeDelivering && animProgress < 1.0) {
          if (!dynamicCurve) buildDeliveryCurve();

          animProgress += flightDurationFactor;

          const bowlerZ = THREE.MathUtils.lerp(-13.5, -9.8, Math.min(animProgress * 1.8, 1));
          bowlerBillboard.position.z = bowlerZ;
          bowlerBillboard.position.y = 1.6 + Math.sin(animProgress * Math.PI * 8) * 0.08;

          if (dynamicCurve) {
            const ballPos = dynamicCurve.getPointAt(Math.min(animProgress, 1));
            ballGroup.position.copy(ballPos);
            ballShadow.position.set(ballPos.x, 0.05, ballPos.z);
            ballShadow.scale.setScalar(Math.max(0.3, 1.0 - (ballPos.y - 0.18) * 0.4));
            ballMesh.rotation.x += 0.25;
            seam.rotation.y += 0.3;

            // Motion Trail Update
            trailPositions.unshift(ballPos.clone());
            if (trailPositions.length > trailCount) trailPositions.pop();
            trailPositions.forEach((tPos, idx) => {
              if (trailMeshes[idx]) {
                trailMeshes[idx].position.copy(tPos);
                trailMeshes[idx].visible = true;
                const sc = ((trailCount - idx) / trailCount) * 0.85;
                trailMeshes[idx].scale.set(sc, sc, sc);
              }
            });
          }

          // Bat swing animation based on intent: ONLY triggers on human player action
          if (activeBatSwinging) {
            const intent = batIntentRef.current;
            const t = (animProgress - 0.75) * 4.0;

            // Trigger Contact Flash Burst
            (flashMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
            flashMesh.scale.set(1.4, 1.4, 1.4);

            if (intent === 'DEFENSIVE') {
              batGroup.rotation.x = THREE.MathUtils.lerp(0.2, -0.3, t);
              batGroup.position.z = THREE.MathUtils.lerp(7.0, 6.75, t);
            } else if (intent === 'LOFT') {
              batGroup.rotation.x = THREE.MathUtils.lerp(0.2, -1.8, t);
              batGroup.position.y = THREE.MathUtils.lerp(1.2, 1.7, t);
              batGroup.position.z = THREE.MathUtils.lerp(7.0, 6.4, t);
            } else if (intent === 'LEAVE') {
              batGroup.rotation.z = THREE.MathUtils.lerp(0.3, 1.2, t);
              batGroup.position.y = THREE.MathUtils.lerp(1.2, 1.8, t);
            } else {
              // NORMAL drive
              batGroup.rotation.x = THREE.MathUtils.lerp(0.2, -1.2, t);
              batGroup.position.z = THREE.MathUtils.lerp(7.0, 6.6, t);
            }

            // Subtle camera impact impulse on contact
            camera.position.y += (Math.random() - 0.5) * 0.025;
          }
        }

        // Boundary Presentation (FOUR / SIX)
        if (currentBanner?.type === 'SIX' || currentBanner?.type === 'FOUR') {
          if (!boundaryCurve) buildBoundaryCurve(currentBanner.type === 'SIX');

          if (boundaryCurve) {
            const t = Math.min((animProgress - 0.5) / 0.5, 1);
            if (t > 0) {
              const bPos = boundaryCurve.getPointAt(t);
              ballGroup.position.copy(bPos);
              ballShadow.position.set(bPos.x, 0.05, bPos.z);
              camera.position.set(
                THREE.MathUtils.lerp(camera.position.x, ballGroup.position.x * 0.5, 0.05),
                THREE.MathUtils.lerp(camera.position.y, 6.5 + ballGroup.position.y * 0.3, 0.05),
                THREE.MathUtils.lerp(camera.position.z, 16.0, 0.05)
              );
              camera.lookAt(ballGroup.position.x, ballGroup.position.y, ballGroup.position.z);
            }
          }
        }

        // Wicket Presentation (Stumps flying)
        if (currentBanner?.type?.startsWith('WICKET_BOWLED')) {
          strikerStumps.children.forEach((child, i) => {
            child.position.z += 0.05 * (i + 1);
            child.rotation.x += 0.04;
          });
        }
      }

      // Smooth decay of contact flash burst
      const fMat = flashMesh.material as THREE.MeshBasicMaterial;
      if (fMat.opacity > 0.01) {
        fMat.opacity *= 0.88;
        flashMesh.scale.multiplyScalar(1.04);
      }

      // Parallax rotation on distant crowd and stands
      crowdWall.rotation.y = camera.position.x * 0.005;

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [viewMode, fieldPreset, bowlerFranchise, batterFranchise, strikerName, bowlerName, canAim, onAimChange]);

  return (
    <div className={`relative w-full h-full min-h-[420px] overflow-hidden select-none ${canAim ? 'cursor-crosshair' : 'cursor-default'}`}>
      <div ref={mountRef} className="w-full h-full absolute inset-0" />

      {/* Outcome Banner Overlay */}
      {bannerEvent && (
        <div className="absolute inset-x-0 top-16 sm:top-20 flex justify-center z-20 pointer-events-none animate-bounce">
          <div
            className={`px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 flex flex-col items-center text-white ${
              bannerEvent.type === 'SIX'
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600'
                : bannerEvent.type === 'FOUR'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600'
                : bannerEvent.type?.startsWith('WICKET')
                ? 'bg-gradient-to-r from-red-600 via-rose-700 to-red-800'
                : 'bg-slate-900/90'
            }`}
          >
            <span className="text-xl sm:text-2xl font-black tracking-wider drop-shadow">{bannerEvent.title}</span>
            <span className="text-xs font-semibold opacity-90">{bannerEvent.subtitle}</span>
          </div>
        </div>
      )}

      {/* Visual Pitch Drag Hint Pill when Bowling */}
      {canAim && !isDelivering && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sky-950/85 backdrop-blur-md border border-sky-400/50 px-4 py-1.5 rounded-full text-sky-200 text-xs font-extrabold shadow-xl z-20 flex items-center space-x-2 pointer-events-none animate-pulse">
          <span>🎯 DRAG OR TAP ON PITCH TO AIM LANDING SPOT</span>
        </div>
      )}
    </div>
  );
};
