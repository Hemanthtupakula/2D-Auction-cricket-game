import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { DreamMatchPresentation } from "./dream/presentation/director";
import type { AuthoritativeBallEvent, DeliveryKind, BatterIntent, TimingBand, Outcome, Role } from "./dream/core/types";
import type { MiniMatch25DProps, PresentationCamera, PresentationPlayer, PresentationBall } from "./types";
export type { MiniMatch25DProps };
import "./stage.css";

function normalisePlayers(input: PresentationPlayer[] | undefined): PresentationPlayer[] {
  if (input?.length) return input;
  return [
    { id: "bowler", name: "Bowler", role: "BOWLER", x: 0, z: -7.5 },
    { id: "batter", name: "Batter", role: "BATTER", x: 0, z: 8.2 },
    { id: "nonstriker", name: "Non-striker", role: "BATTER", x: -1.2, z: -7.5 },
    { id: "keeper", name: "WK", role: "KEEPER", x: 0, z: 10 },
    { id: "cover", role: "FIELDER", x: 5.2, z: 4.5 },
    { id: "midon", role: "FIELDER", x: 5.4, z: -1 },
    { id: "midoff", role: "FIELDER", x: -5.2, z: -1 },
    { id: "square", role: "FIELDER", x: 6.7, z: 4 },
    { id: "point", role: "FIELDER", x: -6.7, z: 4 },
    { id: "fine", role: "FIELDER", x: 5.4, z: 8 },
    { id: "third", role: "FIELDER", x: -5.4, z: 8 },
    { id: "long", role: "FIELDER", x: 0, z: -12 },
  ];
}

function mapDeliveryKind(val?: string): DeliveryKind {
  const d = (val || "PACE").toUpperCase();
  if (d.includes("YORK")) return "YORKER";
  if (d.includes("BOUNC")) return "BOUNCER";
  if (d.includes("SWING") || d.includes("SEAM")) return "SWING";
  if (d.includes("CUT")) return "CUTTER";
  if (d.includes("SLOW")) return "SLOWER";
  return "PACE";
}

function mapSpeed(val?: string | number): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const normalized = String(val || "138");
  const num = parseFloat(normalized.replace(/[^\d.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : 138;
}

function mapBatterIntent(val?: string): BatterIntent {
  const s = (val || "NORMAL").toUpperCase();
  if (s.includes("DEF")) return "DEFENSIVE";
  if (s.includes("LOFT") || s.includes("PULL") || s.includes("SIX") || s.includes("FOUR")) return "LOFT";
  if (s.includes("LEAVE")) return "LEAVE";
  return "NORMAL";
}

function mapTimingBand(val?: string): TimingBand {
  const t = (val || "GOOD").toUpperCase();
  if (t.includes("PERFECT")) return "PERFECT";
  if (t.includes("VERY_EARLY")) return "VERY_EARLY";
  if (t.includes("EARLY")) return "EARLY";
  if (t.includes("VERY_LATE")) return "VERY_LATE";
  if (t.includes("LATE")) return "LATE";
  return "GOOD";
}

function mapOutcome(ball: PresentationBall): Outcome {
  if (ball.wicket) return "WICKET";
  const o = String(ball.outcome || "").toUpperCase();
  if (o === "WICKET") return "WICKET";
  if (o === "SIX" || ball.runs === 6) return "SIX";
  if (o === "FOUR" || ball.runs === 4) return "FOUR";
  if (o === "THREE" || ball.runs === 3) return "THREE";
  if (o === "TWO" || ball.runs === 2) return "TWO";
  if (o === "ONE" || ball.runs === 1) return "ONE";
  if (o.includes("WIDE")) return "WIDE";
  if (o.includes("NO_BALL") || o.includes("NO BALL")) return "NO_BALL";
  if (o.includes("RUN_OUT") || o.includes("RUN OUT")) return "RUN_OUT";
  return "DOT";
}

function normaliseToDreamBall(ball: PresentationBall, players?: PresentationPlayer[]): AuthoritativeBallEvent {
  const normalizedPlayers = normalisePlayers(players);
  const batters = normalizedPlayers.filter((p) => p.role === "BATTER");
  const striker = batters[0];
  const nonStriker = batters[1];
  const bowler = normalizedPlayers.find((p) => p.role === "BOWLER");
  const fielders = normalizedPlayers
    .filter((p) => p.role !== "BATTER" && p.role !== "BOWLER")
    .map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));

  const target = typeof ball.aimX === "number" && typeof ball.aimZ === "number"
    ? { x: ball.aimX, z: ball.aimZ }
    : undefined;

  const ballId = ball.ballNumber != null
    ? `${ball.innings ?? 0}-${ball.ballNumber}`
    : `${ball.innings ?? 0}-${ball.overNumber ?? 0}.${ball.ballInOver ?? 1}`;

  return {
    ballId,
    over: typeof ball.overNumber === "number" ? ball.overNumber : 0,
    ball: typeof ball.ballInOver === "number" ? ball.ballInOver : 1,
    deliveryKind: mapDeliveryKind(ball.delivery || ball.bowlPlan),
    speed: mapSpeed(ball.speed),
    batterIntent: mapBatterIntent(ball.shotIntent || ball.shot),
    timingBand: mapTimingBand(ball.timingBand || ball.timing),
    outcome: mapOutcome(ball),
    target,
    strikerId: striker?.id || ball.batterId || "batter",
    nonStrikerId: nonStriker?.id || "nonstriker",
    bowlerId: bowler?.id || ball.bowlerId || "bowler",
    line: ball.line,
    length: ball.length,
    shot: ball.shot || ball.shotIntent,
    wicketType: ball.wicketType,
    fielders,
    timestamp: ball.deliveryEpochMs || Date.now(),
  };
}

function buildDeliveryPreviewEvent(
  players: PresentationPlayer[] | undefined,
  aimX: number,
  aimZ: number,
  deliveryType: string | undefined,
  speed: string | number | undefined,
  batIntent: string | undefined,
): AuthoritativeBallEvent {
  const p = normalisePlayers(players);
  const batters = p.filter((player) => player.role === "BATTER");
  const striker = batters[0];
  const nonStriker = batters[1];
  const bowler = p.find((player) => player.role === "BOWLER");
  const fielders = p
    .filter((player) => player.role !== "BATTER" && player.role !== "BOWLER")
    .map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));

  return {
    ballId: `preview-${Date.now()}`,
    over: 0,
    ball: 1,
    deliveryKind: mapDeliveryKind(deliveryType),
    speed: mapSpeed(speed),
    batterIntent: mapBatterIntent(batIntent),
    timingBand: "GOOD",
    outcome: "DOT",
    target: { x: aimX, z: aimZ },
    strikerId: striker?.id || "batter",
    nonStrikerId: nonStriker?.id || "nonstriker",
    bowlerId: bowler?.id || "bowler",
    fielders,
    line: Math.abs(aimX) > 0.35 ? (aimX < 0 ? "OFF" : "LEG") : "MIDDLE",
    length: aimZ < 0.5 ? "SHORT" : aimZ > 4.7 ? "FULL" : "GOOD",
    timestamp: Date.now(),
  };
}

export const MiniMatch25DStage: React.FC<MiniMatch25DProps> = ({
  className = "",
  balls = [],
  lastBall = null,
  players,
  stadiumName = "WANKHEDE STADIUM",
  currentCamera = "BATTER_VIEW",
  aimX = 0,
  aimZ = 2.0,
  canAim = false,
  isDelivering = false,
  isBatSwinging = false,
  deliveryType = "PACE",
  bowlingSpeed = "MEDIUM",
  batIntent = "NORMAL",
  onAimChange,
  onAimLock,
  onCameraChange,
  onPresentationComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ lastBallKey: "", previewKey: "" });
  const dreamPresentationRef = useRef<DreamMatchPresentation | null>(null);
  const aimVisualRef = useRef<{ ring: THREE.Mesh; dot: THREE.Mesh; line: THREE.Line } | null>(null);
  const aimValuesRef = useRef({ x: aimX, z: aimZ, canAim });

  aimValuesRef.current = { x: aimX, z: aimZ, canAim };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07110d);
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 120);
    camera.position.set(0, 4.2, 10.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9bc8ff, 0x142018, 1.4));
    const key = new THREE.DirectionalLight(0xfff4df, 3.2);
    key.position.set(8, 16, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc7ff, 1.1);
    fill.position.set(-12, 8, -8);
    scene.add(fill);

    const dream = new DreamMatchPresentation();
    dreamPresentationRef.current = dream;
    scene.add(dream.root);

    normalisePlayers(players).forEach((p) => {
      dream.players.position(p.id, (p.role || "FIELDER") as Role, p.x, p.z, p.name);
    });
    if (currentCamera) dream.camera.setManual(currentCamera as any, true);

    // Real 3D aim target. It is driven by the same aimX/aimZ values used by submitBowlAction.
    const aimGroup = new THREE.Group();
    aimGroup.name = "auction-xi-3d-aim-target";
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.028, 8, 36),
      new THREE.MeshStandardMaterial({ color: 0x28e8ff, emissive: 0x1bd4ff, emissiveIntensity: 2.2 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.085;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffa800, emissiveIntensity: 2.5 }),
    );
    dot.position.y = 0.09;
    const guideGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.095, -7.7),
      new THREE.Vector3(0, 0.095, 2.0),
    ]);
    const guide = new THREE.Line(
      guideGeometry,
      new THREE.LineBasicMaterial({ color: 0x21e6ff, transparent: true, opacity: 0.5 }),
    );
    aimGroup.add(ring, dot, guide);
    scene.add(aimGroup);
    aimVisualRef.current = { ring, dot, line: guide };

    const updateAimVisual = () => {
      const current = aimValuesRef.current;
      const visuals = aimVisualRef.current;
      if (!visuals) return;
      const x = THREE.MathUtils.clamp(current.x, -1.45, 1.45);
      const z = THREE.MathUtils.clamp(current.z, -1.5, 6.0);
      visuals.ring.position.set(x, 0.085, z);
      visuals.dot.position.set(x, 0.095, z);
      visuals.ring.visible = current.canAim;
      visuals.dot.visible = current.canAim;
      visuals.line.visible = current.canAim;
      visuals.line.geometry.setFromPoints([
        new THREE.Vector3(0, 0.095, -7.7),
        new THREE.Vector3(x, 0.095, z),
      ]);
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pitchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
    const pointer = (event: PointerEvent) => {
      if (!aimValuesRef.current.canAim) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(pitchPlane, hit)) return;
      const x = THREE.MathUtils.clamp(hit.x, -1.45, 1.45);
      const z = THREE.MathUtils.clamp(hit.z, -1.5, 6.0);
      onAimChange?.(x, z);
    };
    let dragging = false;
    const down = (event: PointerEvent) => {
      if (!aimValuesRef.current.canAim) return;
      dragging = true;
      renderer.domElement.setPointerCapture?.(event.pointerId);
      pointer(event);
    };
    const move = (event: PointerEvent) => { if (dragging) pointer(event); };
    const up = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);

    let frame = 0;
    let previous = performance.now();
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      updateAimVisual();
      dream.update(dt, camera);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      dream.resetForNextBall();
      scene.remove(dream.root);
      scene.remove(aimGroup);
      dreamPresentationRef.current = null;
      aimVisualRef.current = null;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const ms = Array.isArray(m.material) ? m.material : [m.material];
          ms.forEach((x) => {
            (x as THREE.MeshStandardMaterial).map?.dispose();
            x.dispose();
          });
        }
      });
    };
  }, [players, stadiumName, onAimChange]);

  useEffect(() => {
    if (currentCamera && dreamPresentationRef.current && !isDelivering) {
      dreamPresentationRef.current.camera.setManual(currentCamera as any);
    }
  }, [currentCamera, isDelivering]);

  useEffect(() => {
    if (!isDelivering || !dreamPresentationRef.current) return;
    const previewKey = `${String(aimX)}|${String(aimZ)}|${deliveryType}|${String(bowlingSpeed)}|${batIntent}`;
    if (stateRef.current.previewKey === previewKey) return;
    stateRef.current.previewKey = previewKey;
    const previewEvent = buildDeliveryPreviewEvent(players, aimX, aimZ, deliveryType, bowlingSpeed, batIntent);
    dreamPresentationRef.current.startDeliveryPreview(previewEvent);
  }, [isDelivering, aimX, aimZ, deliveryType, bowlingSpeed, batIntent, players]);

  useEffect(() => {
    const ball = lastBall || balls[balls.length - 1];
    if (!ball) return;
    if (!dreamPresentationRef.current) return;

    const key = `${ball.innings || 0}-${ball.ballNumber || balls.length}-${ball.outcome || ""}-${ball.runs || 0}-${ball.timing || ""}`;
    if (key === stateRef.current.lastBallKey) return;
    stateRef.current.lastBallKey = key;
    stateRef.current.previewKey = "";

    dreamPresentationRef.current.playBall(normaliseToDreamBall(ball, players));
    const timer = setTimeout(() => onPresentationComplete?.(), 3200);
    return () => clearTimeout(timer);
  }, [balls, lastBall, players, onPresentationComplete]);

  useEffect(() => {
    if (!isDelivering && dreamPresentationRef.current?.isDeliveryPreview) {
      dreamPresentationRef.current.endDeliveryPreview();
      stateRef.current.previewKey = "";
    }
  }, [isDelivering]);

  return (
    <section className={`auctionxi-25d-stage ${className}`}>
      <div className="auctionxi-25d-canvas" ref={mountRef} />
      <div className="auctionxi-25d-vignette" />
      <div className="auctionxi-25d-topbar">
        <div>
          <div className="auctionxi-25d-kicker">AUCTION XI • LIVE MATCH</div>
          <div className="auctionxi-25d-stadium">{stadiumName}</div>
        </div>
        <div className="auctionxi-25d-status"><span className="auctionxi-live-dot" />LIVE</div>
      </div>
      <div className="auctionxi-25d-camera">
        {(["BATTER_VIEW", "BOWLER_VIEW", "BALL_FOLLOW"] as PresentationCamera[]).map((c) => (
          <button key={c} type="button" className={currentCamera === c ? "active" : ""} onClick={() => {
            dreamPresentationRef.current?.camera.setManual(c as any);
            onCameraChange?.(c);
          }}>
            {c.replace("_", " ")}
          </button>
        ))}
      </div>
      {canAim && (
        <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full border border-cyan-300/50 bg-slate-950/80 px-2 py-1.5 text-[10px] font-black tracking-wide text-cyan-200 backdrop-blur-md">
          <span>DRAG ON PITCH • AIM {aimX.toFixed(2)}, {aimZ.toFixed(2)} • {deliveryType}</span>
          <button type="button" onClick={onAimLock} className="ml-3 rounded-full border border-cyan-300/50 px-2.5 py-1 text-cyan-100 hover:bg-cyan-400/20">LOCK AIM</button>
        </div>
      )}
      <div className="auctionxi-25d-bottom">
        <div className="auctionxi-25d-ball-card"><span className="label">BALL</span><strong>{lastBall?.overNumber != null ? `${Number(lastBall.overNumber) + 1}.${lastBall.ballInOver ?? ""}` : "—"}</strong></div>
        <div className="auctionxi-25d-ball-card wide"><span className="label">COMMENTARY</span><strong>{lastBall?.commentary || (isDelivering ? "Delivery in progress — play the stroke when the ball reaches you." : "Read the delivery. Choose your response.")}</strong></div>
        <div className="auctionxi-25d-ball-card"><span className="label">RESULT</span><strong className={`result-${String(lastBall?.outcome || "DOT").toLowerCase()}`}>{lastBall?.outcome || "READY"}</strong></div>
      </div>
    </section>
  );
};

export default MiniMatch25DStage;
