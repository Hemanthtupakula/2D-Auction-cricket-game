import * as THREE from 'three';

export type ParticleMode = 'AMBIENT' | 'TENSION' | 'CONFETTI' | 'COOLDOWN' | 'FROZEN';

export class ArenaParticleController {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private count: number;
  private mode: ParticleMode = 'AMBIENT';
  private tension: number = 1.0;
  private liteMode: boolean;

  constructor(scene: THREE.Scene, liteMode: boolean = false) {
    this.liteMode = liteMode;
    this.count = liteMode ? 35 : 140;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      this.resetAmbientParticle(i);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      size: liteMode ? 0.12 : 0.09,
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  private resetAmbientParticle(index: number) {
    const i3 = index * 3;
    this.positions[i3] = (Math.random() - 0.5) * 22;
    this.positions[i3 + 1] = Math.random() * 8 + 0.5;
    this.positions[i3 + 2] = (Math.random() - 0.5) * 22;

    this.velocities[i3] = (Math.random() - 0.5) * 0.2;
    this.velocities[i3 + 1] = Math.random() * 0.4 + 0.1;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
  }

  private resetConfettiParticle(index: number) {
    const i3 = index * 3;
    this.positions[i3] = (Math.random() - 0.5) * 14;
    this.positions[i3 + 1] = Math.random() * 6 + 9;
    this.positions[i3 + 2] = (Math.random() - 0.5) * 14;

    this.velocities[i3] = (Math.random() - 0.5) * 0.8;
    this.velocities[i3 + 1] = -(Math.random() * 1.5 + 1.2);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.8;
  }

  public isLite(): boolean {
    return this.liteMode;
  }

  public setMode(mode: ParticleMode, tension: number = 1.0) {
    this.mode = mode;
    this.tension = tension;

    switch (mode) {
      case 'CONFETTI':
        this.material.color.setHex(0xffd700);
        this.material.opacity = 0.9;
        for (let i = 0; i < this.count; i++) {
          this.resetConfettiParticle(i);
        }
        break;
      case 'COOLDOWN':
        this.material.color.setHex(0x38bdf8);
        this.material.opacity = 0.3;
        break;
      case 'TENSION':
        this.material.color.setHex(0xf97316);
        this.material.opacity = 0.8;
        break;
      case 'AMBIENT':
      default:
        this.material.color.setHex(0xf59e0b);
        this.material.opacity = 0.65;
        break;
    }
  }

  public update(deltaSeconds: number) {
    if (this.mode === 'FROZEN') return;

    const posAttr = this.geometry.attributes.position;
    const speedMultiplier = this.mode === 'TENSION' ? this.tension : 1.0;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      if (this.mode === 'CONFETTI') {
        this.positions[i3] += this.velocities[i3] * deltaSeconds;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaSeconds;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaSeconds;

        if (this.positions[i3 + 1] < 0.2) {
          this.resetConfettiParticle(i);
        }
      } else {
        this.positions[i3] += this.velocities[i3] * deltaSeconds * speedMultiplier;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaSeconds * speedMultiplier;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaSeconds * speedMultiplier;

        if (this.positions[i3 + 1] > 9.5) {
          this.positions[i3 + 1] = 0.5;
        }
      }
    }

    posAttr.needsUpdate = true;
  }
}
