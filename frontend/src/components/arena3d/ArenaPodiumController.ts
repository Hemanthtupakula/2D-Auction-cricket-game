import * as THREE from 'three';
import { FranchiseCode, FRANCHISE_ORDER, FRANCHISE_VISUAL_CONFIGS } from './ArenaState';

interface PodiumState {
  group: THREE.Group;
  pillarMesh: THREE.Mesh | null;
  pillarMat: THREE.MeshStandardMaterial | null;
  badgeMesh: THREE.Mesh | null;
  pointLight: THREE.PointLight | null;
  isHumanActive: boolean;
  isLeader: boolean;
  isWinner: boolean;
  pulseTime: number;
}

export class ArenaPodiumController {
  private podiumStates: Record<string, PodiumState> = {};
  private activeLeaderCode: FranchiseCode | null = null;
  private winnerCode: FranchiseCode | null = null;

  public getLeaderCode(): FranchiseCode | null {
    return this.activeLeaderCode;
  }

  public getWinnerCode(): FranchiseCode | null {
    return this.winnerCode;
  }

  constructor(podiumGroups: Record<string, THREE.Group>) {
    FRANCHISE_ORDER.forEach((code) => {
      const group = podiumGroups[code];
      if (!group) return;

      let pillarMesh: THREE.Mesh | null = null;
      let pillarMat: THREE.MeshStandardMaterial | null = null;
      let badgeMesh: THREE.Mesh | null = null;
      let pointLight: THREE.PointLight | null = null;

      group.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          if (child.name.includes('Pillar')) {
            pillarMesh = child;
            if (child.material instanceof THREE.MeshStandardMaterial) {
              // Clone material to allow individual emissive control
              pillarMat = child.material.clone();
              child.material = pillarMat;
            }
          } else if (child.name.includes('Badge')) {
            badgeMesh = child;
          }
        } else if (child instanceof THREE.PointLight) {
          pointLight = child;
        }
      });

      this.podiumStates[code] = {
        group,
        pillarMesh,
        pillarMat,
        badgeMesh,
        pointLight,
        isHumanActive: false,
        isLeader: false,
        isWinner: false,
        pulseTime: 0,
      };
    });
  }

  /**
   * Updates human franchise active membership (Zero AI: ACTIVE_HUMAN or INACTIVE).
   */
  public updateActiveFranchises(activeFranchiseCodes: FranchiseCode[]) {
    const activeSet = new Set(activeFranchiseCodes);
    FRANCHISE_ORDER.forEach((code) => {
      const pod = this.podiumStates[code];
      if (pod) {
        pod.isHumanActive = activeSet.has(code);
      }
    });
  }

  /**
   * Sets current leader on new bid or reset.
   */
  public setLeader(leaderCode: FranchiseCode | null) {
    this.activeLeaderCode = leaderCode;
    FRANCHISE_ORDER.forEach((code) => {
      const pod = this.podiumStates[code];
      if (pod) {
        pod.isLeader = code === leaderCode;
      }
    });
  }

  /**
   * Instant local podium punch on bid placement (ideal for rapid-fire bids).
   */
  public triggerBidPulse(code: FranchiseCode) {
    const pod = this.podiumStates[code];
    if (!pod) return;

    pod.pulseTime = 1.0;
    pod.group.scale.set(1.25, 1.25, 1.25);
    if (pod.pointLight) {
      pod.pointLight.intensity = 4.0;
    }
  }

  /**
   * Marks winning franchise for victory celebration on SOLD.
   */
  public setWinner(winnerCode: FranchiseCode | null) {
    this.winnerCode = winnerCode;
    FRANCHISE_ORDER.forEach((code) => {
      const pod = this.podiumStates[code];
      if (pod) {
        pod.isWinner = code === winnerCode;
      }
    });
  }

  /**
   * Per-frame animation tick for podiums: handles pulse decay, emissive waves, and scaling.
   */
  public update(deltaSeconds: number, elapsed: number) {
    FRANCHISE_ORDER.forEach((code) => {
      const pod = this.podiumStates[code];
      if (!pod) return;

      const cfg = FRANCHISE_VISUAL_CONFIGS[code];
      const targetScale = new THREE.Vector3(1, 1, 1);

      // Pulse decay
      if (pod.pulseTime > 0) {
        pod.pulseTime = Math.max(0, pod.pulseTime - deltaSeconds * 2.5);
      }

      if (pod.isWinner) {
        // Grand victory pulse on SOLD
        targetScale.set(1.22, 1.22, 1.22);
        if (pod.pillarMat) {
          pod.pillarMat.emissive.setHex(cfg.primaryColor);
          pod.pillarMat.emissiveIntensity = 0.9 + Math.sin(elapsed * 8) * 0.4;
        }
        if (pod.pointLight) {
          pod.pointLight.intensity = 3.5 + Math.sin(elapsed * 8) * 1.0;
        }
      } else if (pod.isLeader) {
        // High bidder leader state
        targetScale.set(1.15, 1.15, 1.15);
        if (pod.pillarMat) {
          pod.pillarMat.emissive.setHex(cfg.primaryColor);
          pod.pillarMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 6) * 0.25;
        }
        if (pod.pointLight) {
          pod.pointLight.intensity = 2.5;
        }
      } else if (pod.isHumanActive) {
        // Active human station
        targetScale.set(1.0, 1.0, 1.0);
        if (pod.pillarMat) {
          pod.pillarMat.emissive.setHex(cfg.primaryColor);
          pod.pillarMat.emissiveIntensity = 0.15;
        }
        if (pod.pointLight) {
          pod.pointLight.intensity = 0.4;
        }
      } else {
        // Inactive / unassigned team (Zero AI)
        targetScale.set(0.9, 0.9, 0.9);
        if (pod.pillarMat) {
          pod.pillarMat.emissive.setHex(0x000000);
          pod.pillarMat.emissiveIntensity = 0;
        }
        if (pod.pointLight) {
          pod.pointLight.intensity = 0;
        }
      }

      // Add dynamic pulse boost if recently bid
      if (pod.pulseTime > 0) {
        targetScale.multiplyScalar(1 + pod.pulseTime * 0.15);
      }

      pod.group.scale.lerp(targetScale, 0.12);
    });
  }
}
