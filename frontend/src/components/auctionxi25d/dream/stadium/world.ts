import * as THREE from 'three';
import type { AuthoritativeBallEvent } from '../core/types';

interface CrowdActor {
  root: THREE.Group;
  phase: number;
  lift: number;
  baseY: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function seeded(seed: number): number {
  let x = (seed ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function outcomeExcitement(event: AuthoritativeBallEvent): number {
  switch (event.outcome) {
    case 'SIX': return 1.35;
    case 'FOUR': return 1.05;
    case 'WICKET':
    case 'RUN_OUT': return 1.45;
    case 'THREE':
    case 'TWO': return 0.55;
    case 'ONE': return 0.28;
    default: return 0.08;
  }
}

export class DreamStadiumWorld {
  readonly group = new THREE.Group();
  readonly lights = new THREE.Group();
  readonly crowd = new THREE.Group();

  private readonly crowdActors: CrowdActor[] = [];
  private readonly animatedLights: THREE.PointLight[] = [];
  private readonly ledMaterials: THREE.MeshStandardMaterial[] = [];
  private pulse = 0;
  private excitement = 0.12;
  private targetExcitement = 0.12;
  private eventFlash = 0;

  constructor() {
    this.group.name = 'auction-xi-v4-9-stadium-world';
    this.build();
  }

  private build(): void {
    this.buildSky();
    this.buildOutfield();
    this.buildPitch();
    this.buildBoundary();
    this.buildStands();
    this.buildScreens();
    this.buildFloodlights();
    this.buildCrowd();
    this.group.add(this.lights, this.crowd);
  }

  private buildSky(): void {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(58, 40, 24),
      new THREE.MeshBasicMaterial({
        color: 0x071321,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    sky.position.y = 5;
    sky.name = 'night-sky-dome';
    this.group.add(sky);

    const starPositions: number[] = [];
    for (let i = 0; i < 240; i += 1) {
      const theta = seeded(i * 13 + 9) * Math.PI * 2;
      const phi = Math.acos(0.08 + seeded(i * 17 + 3) * 0.72);
      const radius = 46 + seeded(i * 19 + 5) * 8;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(radius * Math.cos(phi)) + 14;
      const z = radius * Math.sin(phi) * Math.sin(theta);
      starPositions.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xa8c8ff, size: 0.08, transparent: true, opacity: 0.52 }),
    );
    stars.name = 'ambient-stars';
    this.group.add(stars);
  }

  private buildOutfield(): void {
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(34, 128),
      new THREE.MeshStandardMaterial({ color: 0x174b2a, roughness: 1 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0;
    grass.name = 'outfield';
    grass.receiveShadow = true;
    this.group.add(grass);

    for (let i = 0; i < 7; i += 1) {
      const radius = 9 + i * 3.1;
      const band = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.07, 128),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0x2b6a38 : 0x225b31,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
        }),
      );
      band.rotation.x = -Math.PI / 2;
      band.position.y = 0.012 + i * 0.0005;
      this.group.add(band);
    }
  }

  private buildPitch(): void {
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 24),
      new THREE.MeshStandardMaterial({ color: 0xb79a6a, roughness: 0.92 }),
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.018;
    pitch.receiveShadow = true;
    pitch.name = 'cricket-pitch';
    this.group.add(pitch);

    const pitchShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.25, 24.3),
      new THREE.MeshBasicMaterial({ color: 0x0b2c18, transparent: true, opacity: 0.12 }),
    );
    pitchShadow.rotation.x = -Math.PI / 2;
    pitchShadow.position.y = 0.012;
    this.group.add(pitchShadow);

    for (const z of [-8.7, 8.7]) {
      const crease = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.018, 0.045),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x202020 }),
      );
      crease.position.set(0, 0.058, z);
      this.group.add(crease);

      for (const x of [-0.16, 0, 0.16]) {
        const stump = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 0.72, 10),
          new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.55 }),
        );
        stump.position.set(x, 0.39, z);
        this.group.add(stump);
      }

      for (const x of [-0.08, 0.08]) {
        const bail = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.025, 0.025),
          new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }),
        );
        bail.position.set(x, 0.76, z);
        this.group.add(bail);
      }
    }

    const pitchGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.92, 23.6),
      new THREE.MeshBasicMaterial({ color: 0xffd28f, transparent: true, opacity: 0.035 }),
    );
    pitchGlow.rotation.x = -Math.PI / 2;
    pitchGlow.position.y = 0.061;
    this.group.add(pitchGlow);
  }

  private buildBoundary(): void {
    const rope = new THREE.Mesh(
      new THREE.TorusGeometry(28, 0.10, 10, 128),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x123322,
        emissiveIntensity: 0.18,
        roughness: 0.7,
      }),
    );
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 0.06;
    rope.name = 'boundary-rope';
    this.group.add(rope);

    const led = new THREE.Mesh(
      new THREE.TorusGeometry(27.25, 0.055, 8, 128),
      new THREE.MeshStandardMaterial({
        color: 0x39f5c8,
        emissive: 0x39f5c8,
        emissiveIntensity: 1.2,
        roughness: 0.35,
      }),
    );
    led.rotation.x = Math.PI / 2;
    led.position.y = 0.12;
    this.group.add(led);
    this.ledMaterials.push(led.material as THREE.MeshStandardMaterial);
  }

  private buildStands(): void {
    const tiers = [
      { inner: 14.5, outer: 18.0, y: 0.55 },
      { inner: 18.5, outer: 22.0, y: 1.35 },
      { inner: 22.5, outer: 26.1, y: 2.15 },
      { inner: 26.6, outer: 31.5, y: 3.0 },
    ];

    tiers.forEach((tier, index) => {
      const seats = new THREE.Mesh(
        new THREE.RingGeometry(tier.inner, tier.outer, 128, 3),
        new THREE.MeshStandardMaterial({
          color: index < 2 ? 0x15202b : 0x101821,
          roughness: 0.96,
          metalness: 0.06,
        }),
      );
      seats.rotation.x = -Math.PI / 2;
      seats.position.y = tier.y;
      seats.name = `stand-tier-${index + 1}`;
      this.group.add(seats);

      const fascia = new THREE.Mesh(
        new THREE.TorusGeometry((tier.inner + tier.outer) / 2, 0.28, 7, 128),
        new THREE.MeshStandardMaterial({ color: 0x080d13, metalness: 0.45, roughness: 0.52 }),
      );
      fascia.rotation.x = Math.PI / 2;
      fascia.position.y = tier.y + 0.22;
      this.group.add(fascia);
    });

    const roof = new THREE.Mesh(
      new THREE.TorusGeometry(29.9, 0.38, 8, 128),
      new THREE.MeshStandardMaterial({ color: 0x0a1119, metalness: 0.72, roughness: 0.34 }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 6.4;
    this.group.add(roof);

    const canopy = new THREE.Mesh(
      new THREE.RingGeometry(30.2, 36, 128, 1),
      new THREE.MeshStandardMaterial({
        color: 0x0b141e,
        transparent: true,
        opacity: 0.86,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    canopy.rotation.x = -Math.PI / 2;
    canopy.position.y = 6.25;
    this.group.add(canopy);
  }

  private buildScreens(): void {
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e1721,
      emissive: 0x0e3140,
      emissiveIntensity: 0.72,
      roughness: 0.44,
      metalness: 0.22,
    });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x070c11, metalness: 0.7, roughness: 0.36 });

    [
      { x: 0, z: -25.6, ry: 0 },
      { x: 0, z: 25.6, ry: Math.PI },
      { x: 25.6, z: 0, ry: Math.PI / 2 },
      { x: -25.6, z: 0, ry: -Math.PI / 2 },
    ].forEach((screen, index) => {
      const group = new THREE.Group();
      group.name = `stadium-screen-${index + 1}`;
      group.position.set(screen.x, 3.0, screen.z);
      group.rotation.y = screen.ry;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.2, 0.24), frameMaterial);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(6.45, 2.55), screenMaterial);
      panel.position.z = screen.z < 0 ? 0.13 : -0.13;
      group.add(frame, panel);

      const led = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.12, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0x39f5c8,
          emissive: 0x39f5c8,
          emissiveIntensity: 1.4,
        }),
      );
      led.position.y = -1.65;
      group.add(led);
      this.ledMaterials.push(led.material as THREE.MeshStandardMaterial);
      this.group.add(group);
    });
  }

  private buildFloodlights(): void {
    const towerPositions = [
      [18, 0, 18],
      [-18, 0, 18],
      [18, 0, -18],
      [-18, 0, -18],
      [0, 0, -24],
      [0, 0, 24],
    ] as const;

    towerPositions.forEach(([x, _y, z], index) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.18, 11, 8),
        new THREE.MeshStandardMaterial({ color: 0x34383e, metalness: 0.82, roughness: 0.35 }),
      );
      tower.position.set(x, 5.2, z);
      tower.name = `floodlight-tower-${index + 1}`;
      this.lights.add(tower);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.55, 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xf4f4f4,
          emissive: 0xffffff,
          emissiveIntensity: 0.75,
          metalness: 0.15,
          roughness: 0.38,
        }),
      );
      panel.position.set(x, 10.85, z);
      panel.lookAt(0, 0.5, 0);
      this.lights.add(panel);

      const light = new THREE.PointLight(0xffffff, 26, 34, 1.6);
      light.position.set(x, 10.5, z);
      this.animatedLights.push(light);
      this.lights.add(light);
    });
  }

  private buildCrowd(): void {
    const palette = [0x3b4858, 0x53697d, 0x8a6f50, 0x385d4a, 0x6e4567, 0x5e5e5e];
    let actorIndex = 0;

    for (let ring = 0; ring < 4; ring += 1) {
      const radius = 15.3 + ring * 3.0;
      const count = 68 + ring * 18;
      const y = 0.74 + ring * 0.78;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + ring * 0.17;
        const radialJitter = (seeded(actorIndex * 11 + 2) - 0.5) * 0.42;
        const person = new THREE.Group();
        person.position.set(
          Math.cos(angle) * (radius + radialJitter),
          y,
          Math.sin(angle) * (radius + radialJitter),
        );
        person.rotation.y = -angle + Math.PI / 2;

        const color = palette[Math.floor(seeded(actorIndex * 29 + 7) * palette.length)];
        const shirt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.10, 0.23, 6),
          new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
        );
        shirt.position.y = 0.22;

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 7, 6),
          new THREE.MeshStandardMaterial({ color: 0x9f755a, roughness: 1 }),
        );
        head.position.y = 0.39;
        person.add(shirt, head);
        this.crowd.add(person);
        this.crowdActors.push({
          root: person,
          phase: seeded(actorIndex * 31 + 4) * Math.PI * 2,
          lift: 0.02 + seeded(actorIndex * 37 + 6) * 0.035,
          baseY: y,
        });
        actorIndex += 1;
      }
    }
  }

  onBall(event: AuthoritativeBallEvent): void {
    this.targetExcitement = outcomeExcitement(event);
    this.eventFlash = 1;
  }

  update(dt: number): void {
    this.pulse += Math.max(0, dt);
    this.excitement = THREE.MathUtils.damp(this.excitement, this.targetExcitement, 3.2, Math.max(0, dt));
    this.targetExcitement = Math.max(0.08, this.targetExcitement - dt * 0.16);
    this.eventFlash = Math.max(0, this.eventFlash - dt * 1.4);

    this.crowdActors.forEach((actor) => {
      const wave = Math.sin(this.pulse * (2.4 + actor.lift * 5) + actor.phase);
      const active = 0.5 + 0.5 * Math.max(-1, Math.min(1, wave));
      actor.root.position.y = actor.baseY + wave * actor.lift * (0.35 + this.excitement * 0.65);
      actor.root.rotation.z = wave * 0.045 * (0.2 + this.excitement);
      if (active > 0.92 && this.excitement > 1.0) {
        actor.root.rotation.z += 0.08;
      }
    });

    this.animatedLights.forEach((light, index) => {
      light.intensity = 23 + Math.sin(this.pulse * 1.8 + index * 0.8) * 1.6 + this.eventFlash * 7;
    });

    const ledPulse = 0.85 + 0.65 * (0.5 + 0.5 * Math.sin(this.pulse * 3.2));
    this.ledMaterials.forEach((material, index) => {
      material.emissiveIntensity = ledPulse + this.eventFlash * (index % 2 === 0 ? 1.4 : 0.8);
    });
  }

  reset(): void {
    this.targetExcitement = 0.12;
    this.excitement = clamp(this.excitement, 0.08, 0.35);
    this.eventFlash = 0;
  }
}
