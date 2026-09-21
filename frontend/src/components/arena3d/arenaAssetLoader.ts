import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ARENA_NODES,
  FRANCHISE_ORDER,
  FRANCHISE_VISUAL_CONFIGS,
} from './ArenaState';

export interface ArenaSceneResult {
  rootGroup: THREE.Group;
  podiums: Record<string, THREE.Group>;
  centralStage: THREE.Object3D;
  playerStage: THREE.Object3D;
  ledPanel: THREE.Mesh;
  playerDisplayScreen: THREE.Mesh;
  cameraMarkers: Record<string, THREE.Object3D>;
  isImportedGlb: boolean;
}

/**
 * Creates the Procedural Grand Arena V2 with the EXACT canonical node names:
 * CentralStage, PlayerStage, LEDPanel, PlayerDisplayScreen,
 * Podium_MI .. Podium_PBKS,
 * Camera_Wide, Camera_Stage, Camera_Player, Camera_LeftBidder, Camera_RightBidder, Camera_Overhead, Camera_Winner.
 */
export function createProceduralGrandArena(liteMode: boolean = false): ArenaSceneResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'GrandArena_Root';

  // 1. Arena Main Floor (Broad dark metallic circular floor)
  const floorRadius = 16.5;
  const floorGeo = new THREE.CylinderGeometry(floorRadius, floorRadius, 0.4, liteMode ? 32 : 48);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x070b16,
    roughness: 0.35,
    metalness: 0.85,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.name = 'ArenaFloor';
  floorMesh.position.y = -0.2;
  rootGroup.add(floorMesh);

  // Outer Tier Ring (Auditorium accent)
  const outerRingGeo = new THREE.RingGeometry(14.5, 15.8, liteMode ? 32 : 48);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0x1e3a8a,
    side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.02;
  rootGroup.add(outerRing);

  // 2. CentralStage (Tiered circular grand stage)
  const centralStage = new THREE.Group();
  centralStage.name = ARENA_NODES.CENTRAL_STAGE;

  const stageBaseGeo = new THREE.CylinderGeometry(3.6, 3.9, 0.5, liteMode ? 24 : 36);
  const stageBaseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.25,
    metalness: 0.9,
  });
  const stageBase = new THREE.Mesh(stageBaseGeo, stageBaseMat);
  stageBase.position.y = 0.25;
  centralStage.add(stageBase);

  // Stage Glowing Edge Ring
  const stageRingGeo = new THREE.RingGeometry(3.5, 3.7, liteMode ? 24 : 36);
  const stageRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
  });
  const stageRing = new THREE.Mesh(stageRingGeo, stageRingMat);
  stageRing.rotation.x = -Math.PI / 2;
  stageRing.position.y = 0.51;
  centralStage.add(stageRing);

  rootGroup.add(centralStage);

  // 3. PlayerStage (Raised turntable on CentralStage for chit and player reveal)
  const playerStage = new THREE.Group();
  playerStage.name = ARENA_NODES.PLAYER_STAGE;
  playerStage.position.set(0, 0.5, 0);

  const turntableGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.3, 24);
  const turntableMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.8,
  });
  const turntableMesh = new THREE.Mesh(turntableGeo, turntableMat);
  turntableMesh.position.y = 0.15;
  playerStage.add(turntableMesh);

  // Holographic Chit Pedestal Base
  const pedestalGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.9, 20);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.2,
    metalness: 0.85,
  });
  const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestalMesh.name = 'PedestalMesh';
  pedestalMesh.position.y = 0.75;
  playerStage.add(pedestalMesh);

  // PlayerDisplayScreen (Holographic glass disk / emitter)
  const screenGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.06, 24);
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    wireframe: true,
    transparent: true,
    opacity: 0.8,
  });
  const playerDisplayScreen = new THREE.Mesh(screenGeo, screenMat);
  playerDisplayScreen.name = ARENA_NODES.PLAYER_DISPLAY_SCREEN;
  playerDisplayScreen.position.y = 1.25;
  playerStage.add(playerDisplayScreen);

  centralStage.add(playerStage);

  // 4. LEDPanel (Curved broad background LED wall)
  const ledGeo = new THREE.CylinderGeometry(17, 17, 7.5, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x050a16,
    emissive: 0x0a1628,
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.7,
    side: THREE.BackSide,
  });
  const ledPanel = new THREE.Mesh(ledGeo, ledMat);
  ledPanel.name = ARENA_NODES.LED_PANEL;
  ledPanel.position.set(0, 4.0, 0);
  rootGroup.add(ledPanel);

  // 5. 10 Named Franchise Podiums (Podium_MI .. Podium_PBKS)
  const podiums: Record<string, THREE.Group> = {};

  FRANCHISE_ORDER.forEach((code) => {
    const cfg = FRANCHISE_VISUAL_CONFIGS[code];
    const podGroup = new THREE.Group();
    podGroup.name = cfg.nodeName;
    podGroup.position.copy(cfg.position);
    podGroup.lookAt(0, 0.8, 0);

    // Pedestal Base
    const podBaseGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 18);
    const podBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.8,
    });
    const podBase = new THREE.Mesh(podBaseGeo, podBaseMat);
    podBase.name = `${cfg.nodeName}_Base`;
    podBase.position.y = 0.175;
    podGroup.add(podBase);

    // Illuminated Pillar Column
    const pillarGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.4, 18);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: cfg.primaryColor,
      emissiveIntensity: 0.15,
      roughness: 0.25,
      metalness: 0.6,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.name = `${cfg.nodeName}_Pillar`;
    pillar.position.y = 0.95;
    podGroup.add(pillar);

    // Team Brand Plaque / Badge
    const badgeGeo = new THREE.BoxGeometry(0.9, 0.6, 0.15);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: cfg.primaryColor,
      roughness: 0.3,
      metalness: 0.7,
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.name = `${cfg.nodeName}_Badge`;
    badge.position.set(0, 1.8, 0.18);
    podGroup.add(badge);

    // Local Point Light on Podium (Dynamic leader & bid reaction)
    const podLight = new THREE.PointLight(cfg.primaryColor, 0.3, 5.5);
    podLight.name = `${cfg.nodeName}_Light`;
    podLight.position.set(0, 2.1, 0);
    podGroup.add(podLight);

    rootGroup.add(podGroup);
    podiums[code] = podGroup;
  });

  // 6. Named Camera Position Markers (Object3D anchors)
  const cameraMarkers: Record<string, THREE.Object3D> = {};

  const createMarker = (name: string, pos: THREE.Vector3, lookTarget: THREE.Vector3) => {
    const marker = new THREE.Object3D();
    marker.name = name;
    marker.position.copy(pos);
    marker.userData.lookTarget = lookTarget.clone();
    rootGroup.add(marker);
    cameraMarkers[name] = marker;
  };

  createMarker(
    ARENA_NODES.CAMERAS.WIDE,
    new THREE.Vector3(0, 9.5, 17.5),
    new THREE.Vector3(0, 1.2, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.STAGE,
    new THREE.Vector3(0, 4.5, 8.8),
    new THREE.Vector3(0, 1.5, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.PLAYER,
    new THREE.Vector3(0, 2.6, 5.2),
    new THREE.Vector3(0, 1.6, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.LEFT_BIDDER,
    new THREE.Vector3(-6.5, 5.5, 8.5),
    new THREE.Vector3(-4.5, 1.2, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.RIGHT_BIDDER,
    new THREE.Vector3(6.5, 5.5, 8.5),
    new THREE.Vector3(4.5, 1.2, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.OVERHEAD,
    new THREE.Vector3(0, 18.0, 1.0),
    new THREE.Vector3(0, 0, 0)
  );

  createMarker(
    ARENA_NODES.CAMERAS.WINNER,
    new THREE.Vector3(0, 6.5, 12.5),
    new THREE.Vector3(0, 1.5, 0)
  );

  return {
    rootGroup,
    podiums,
    centralStage,
    playerStage,
    ledPanel,
    playerDisplayScreen,
    cameraMarkers,
    isImportedGlb: false,
  };
}

/**
 * Asynchronously loads the Blender Grand Arena GLB asset.
 * If the file is not found, network fails, or parsing errors, it executes the
 * seamless procedural fallback with identical canonical node names.
 */
export async function loadGrandArenaAsset(
  glbUrl: string = '/models/AuctionXI_GrandArena_V2.glb',
  liteMode: boolean = false
): Promise<ArenaSceneResult> {
  const loader = new GLTFLoader();

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        glbUrl,
        (gltfData) => resolve(gltfData),
        undefined,
        (err) => reject(err)
      );
    });

    const rootGroup = new THREE.Group();
    rootGroup.name = 'GrandArena_Imported';
    rootGroup.add(gltf.scene);

    // Extract named nodes from imported GLB
    const findNode = (name: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      gltf.scene.traverse((child: THREE.Object3D) => {
        if (child.name === name && !found) {
          found = child;
        }
      });
      return found;
    };

    // If any critical node is missing from the GLB, generate procedural fallback
    let centralStage = findNode(ARENA_NODES.CENTRAL_STAGE);
    let playerStage = findNode(ARENA_NODES.PLAYER_STAGE);
    let ledPanel = findNode(ARENA_NODES.LED_PANEL) as THREE.Mesh | null;
    let playerDisplayScreen = findNode(ARENA_NODES.PLAYER_DISPLAY_SCREEN) as THREE.Mesh | null;

    const podiums: Record<string, THREE.Group> = {};
    let allPodiumsFound = true;
    for (const code of FRANCHISE_ORDER) {
      const nodeName = ARENA_NODES.PODIUMS[code];
      const pod = findNode(nodeName);
      if (pod && pod instanceof THREE.Group) {
        podiums[code] = pod;
      } else {
        allPodiumsFound = false;
        break;
      }
    }

    // If critical nodes are present, resolve with imported GLB
    if (centralStage && playerStage && ledPanel && allPodiumsFound) {
      const cameraMarkers: Record<string, THREE.Object3D> = {};
      Object.values(ARENA_NODES.CAMERAS).forEach((camName) => {
        const marker = findNode(camName) || new THREE.Object3D();
        cameraMarkers[camName] = marker;
      });

      return {
        rootGroup,
        podiums,
        centralStage,
        playerStage,
        ledPanel,
        playerDisplayScreen: playerDisplayScreen || (new THREE.Mesh() as any),
        cameraMarkers,
        isImportedGlb: true,
      };
    }

    // Partial GLB: fall back to procedural
    return createProceduralGrandArena(liteMode);
  } catch (_err) {
    // GLB not found or failed to load: execute seamless procedural fallback
    return createProceduralGrandArena(liteMode);
  }
}
