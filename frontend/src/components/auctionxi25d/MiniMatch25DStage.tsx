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
  if (d.includes("SWING")) return "SWING";
  if (d.includes("CUT")) return "CUTTER";
  if (d.includes("SLOW")) return "SLOWER";
  return "PACE";
}
function mapSpeed(val?: string | number): number { if (typeof val === "number" && Number.isFinite(val)) return val; if (!val) return 138; const num = parseFloat(String(val).replace(/[^\d.]/g, "")); return Number.isFinite(num) && num > 0 ? num : 138; }
function mapBatterIntent(val?: string): BatterIntent { const s = (val || "NORMAL").toUpperCase(); if (s.includes("DEF")) return "DEFENSIVE"; if (s.includes("LOFT") || s.includes("PULL") || s.includes("SIX") || s.includes("FOUR")) return "LOFT"; if (s.includes("LEAVE")) return "LEAVE"; return "NORMAL"; }
function mapTimingBand(val?: string): TimingBand { const t = (val || "GOOD").toUpperCase(); if (t.includes("PERFECT")) return "PERFECT"; if (t.includes("VERY_EARLY")) return "VERY_EARLY"; if (t.includes("EARLY")) return "EARLY"; if (t.includes("VERY_LATE")) return "VERY_LATE"; if (t.includes("LATE")) return "LATE"; return "GOOD"; }
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
  const striker = batters[0]; const nonStriker = batters[1]; const bowler = normalizedPlayers.find((p) => p.role === "BOWLER");
  const fielders = normalizedPlayers.filter((p) => p.role !== "BATTER" && p.role !== "BOWLER").map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));
  let target: { x: number; z: number } | undefined;
  if (typeof ball.aimX === "number" && typeof ball.aimZ === "number") target = { x: ball.aimX, z: ball.aimZ };
  const ballId = ball.ballNumber != null ? `${ball.innings ?? 0}-${ball.ballNumber}` : `${ball.innings ?? 0}-${ball.overNumber ?? 0}.${ball.ballInOver ?? 1}`;
  return {
    ballId, over: typeof ball.overNumber === "number" ? ball.overNumber : 0, ball: typeof ball.ballInOver === "number" ? ball.ballInOver : 1,
    deliveryKind: mapDeliveryKind(ball.delivery || ball.bowlPlan), speed: mapSpeed(ball.speed), batterIntent: mapBatterIntent(ball.shotIntent || ball.shot), timingBand: mapTimingBand(ball.timingBand || ball.timing), outcome: mapOutcome(ball), target,
    strikerId: striker?.id || ball.batterId || "batter", nonStrikerId: nonStriker?.id || "nonstriker", bowlerId: bowler?.id || ball.bowlerId || "bowler",
    line: ball.line, length: ball.length, shot: ball.shot || ball.shotIntent, wicketType: ball.wicketType, fielders, timestamp: ball.deliveryEpochMs || Date.now(),
  };
}

export const MiniMatch25DStage: React.FC<MiniMatch25DProps> = ({
  className = "",
  balls = [],
  lastBall = null,
  players,
  stadiumName = "WANKHEDE STADIUM",
  currentCamera = "BATTER_VIEW",
  onCameraChange,
  onPresentationComplete,
  aimX = 0,
  aimZ = 2,
  canAim = false,
  onAimChange,
  onAimLock,
  isDelivering = false,
  isBatSwinging = false,
  deliveryType = "PACE",
  bowlingSpeed = "MEDIUM",
  batIntent = "NORMAL",
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ lastBallKey: "", previewKey: "", wasBatSwinging: false });
  const dreamPresentationRef = useRef<DreamMatchPresentation | null>(null);
  const aimMarkerRef = useRef<THREE.Group | null>(null);
  const draggingAimRef = useRef(false);

  const updateAimFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (!canAim || !mountRef.current || !onAimChange) return;
    const rendererCanvas = event.currentTarget.querySelector('canvas');
    if (!rendererCanvas) return;
    const rect = rendererCanvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
    );
    const camera = (rendererCanvas as HTMLCanvasElement & { __auctionXiCamera?: THREE.PerspectiveCamera }).__auctionXiCamera;
    if (!camera) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    const x = THREE.MathUtils.clamp(hit.x, -1.2, 1.2);
    const z = THREE.MathUtils.clamp(hit.z, -1.5, 6);
    onAimChange(Number(x.toFixed(3)), Number(z.toFixed(3)));
  };

  const previewEvent = (): AuthoritativeBallEvent => {
    const normalized = String(bowlingSpeed || "MEDIUM").toUpperCase();
    const speed = normalized.includes("FAST") ? 150 : normalized.includes("SLOW") ? 112 : 138;
    const striker = normalisePlayers(players).find((p) => p.role === "BATTER");
    const nonStriker = normalisePlayers(players).filter((p) => p.role === "BATTER")[1];
    const bowler = normalisePlayers(players).find((p) => p.role === "BOWLER");
    const fielders = normalisePlayers(players)
      .filter((p) => p.role !== "BATTER" && p.role !== "BOWLER")
      .map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));
    const previewId = `preview-${Date.now()}`;
    return {
      ballId: previewId,
      over: 0,
      ball: 1,
      deliveryKind: mapDeliveryKind(deliveryType),
      speed,
      batterIntent: mapBatterIntent(batIntent),
      timingBand: "GOOD",
      outcome: "DOT",
      target: { x: aimX, z: aimZ },
      strikerId: striker?.id || "batter",
      nonStrikerId: nonStriker?.id || "nonstriker",
      bowlerId: bowler?.id || "bowler",
      fielders,
      timestamp: Date.now(),
    };
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050910);
    scene.fog = new THREE.FogExp2(0x07110d, 0.0065);
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 140);
    camera.position.set(0, 6.8, 17.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    (renderer.domElement as HTMLCanvasElement & { __auctionXiCamera?: THREE.PerspectiveCamera }).__auctionXiCamera = camera;

    scene.add(new THREE.HemisphereLight(0x9bc8ff, 0x102019, 1.65));
    const key = new THREE.DirectionalLight(0xfff4df, 3.8);
    key.position.set(10, 18, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 60;
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc7ff, 1.25);
    fill.position.set(-12, 10, -10);
    scene.add(fill);

    const dream = new DreamMatchPresentation();
    dreamPresentationRef.current = dream;
    scene.add(dream.root);
    normalisePlayers(players).forEach((p) =>
      dream.players.position(p.id, (p.role || "FIELDER") as Role, p.x, p.z, p.visualProfileId, p.name),
    );

    const aimMarker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.28, 32),
      new THREE.MeshBasicMaterial({ color: 0x19d9ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    aimMarker.add(ring);
    const center = new THREE.Mesh(
      new THREE.CircleGeometry(0.055, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.012;
    aimMarker.add(center);
    aimMarker.position.y = 0.17;
    scene.add(aimMarker);
    aimMarkerRef.current = aimMarker;

    if (currentCamera) dream.camera.setManual((viewMode || currentCamera) as any);

    let frame = 0;
    let previous = performance.now();
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      (renderer.domElement as HTMLCanvasElement & { __auctionXiCamera?: THREE.PerspectiveCamera }).__auctionXiCamera = camera;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const marker = aimMarkerRef.current;
      if (marker) {
        marker.visible = canAim || isDelivering;
        marker.position.x = aimX;
        marker.position.z = aimZ;
        const pulse = 1 + Math.sin(now * 0.008) * 0.08;
        marker.scale.setScalar(pulse);
      }
      dream.update(dt, camera);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      dream.resetForNextBall();
      scene.remove(dream.root);
      scene.remove(aimMarker);
      aimMarkerRef.current = null;
      dreamPresentationRef.current = null;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const ms = Array.isArray(m.material) ? m.material : [m.material];
          ms.forEach((x) => (x as THREE.MeshStandardMaterial).map?.dispose());
        }
      });
    };
  }, [players, stadiumName]);

  useEffect(() => {
    const dream = dreamPresentationRef.current;
    if (currentCamera && dream && !isDelivering) dream.camera.setManual((viewMode || currentCamera) as any);
  }, [currentCamera, viewMode, isDelivering]);

  useEffect(() => {
    const dream = dreamPresentationRef.current;
    if (!dream || !isDelivering) return;
    const key = `${deliveryType}|${bowlingSpeed}|${aimX.toFixed(3)}|${aimZ.toFixed(3)}`;
    if (key === stateRef.current.previewKey) return;
    stateRef.current.previewKey = key;
    dream.playDeliveryPreview(previewEvent());
  }, [isDelivering, deliveryType, bowlingSpeed, aimX, aimZ, players]);

  useEffect(() => {
    if (!isBatSwinging || stateRef.current.wasBatSwinging) return;
    const dream = dreamPresentationRef.current;
    const striker = normalisePlayers(players).find((p) => p.role === "BATTER");
    if (dream && striker) {
      const intent = String(batIntent || "NORMAL").toUpperCase();
      dream.players.state(striker.id, "BATTER", intent.includes("DEF") ? "DEFENSIVE" : intent.includes("LOFT") ? "LOFT" : "DRIVE");
    }
    stateRef.current.wasBatSwinging = true;
  }, [isBatSwinging, batIntent, players]);

  useEffect(() => {
    if (!isBatSwinging) stateRef.current.wasBatSwinging = false;
  }, [isBatSwinging]);

  useEffect(() => {
    const ball = lastBall || balls[balls.length - 1];
    if (!ball) return;
    if (!dreamPresentationRef.current) return;
    const key = `${ball.innings || 0}-${ball.ballNumber || balls.length}-${ball.outcome || ""}-${ball.runs || 0}-${ball.timing || ""}`;
    if (key === stateRef.current.lastBallKey) return;
    stateRef.current.lastBallKey = key;
    stateRef.current.previewKey = "";
    const dreamBall = normaliseToDreamBall(ball, players);
    dreamPresentationRef.current.playBall(dreamBall);
    const timer = setTimeout(() => onPresentationComplete?.(), 3600);
    return () => clearTimeout(timer);
  }, [balls, lastBall, players, onPresentationComplete]);

  return (
    <section
      className={`auctionxi-25d-stage ${className}`}
      onPointerDown={(event) => {
        if (!canAim) return;
        draggingAimRef.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        updateAimFromPointer(event);
      }}
      onPointerMove={(event) => { if (draggingAimRef.current) updateAimFromPointer(event); }}
      onPointerUp={(event) => {
        if (!draggingAimRef.current) return;
        draggingAimRef.current = false;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        onAimLock?.();
      }}
      onPointerCancel={() => { draggingAimRef.current = false; }}
    >
      <div className="auctionxi-25d-canvas" ref={mountRef} />
      <div className="auctionxi-25d-vignette" />
      {canAim && <div className="auctionxi-25d-aim-hint">DRAG CIRCLE TO AIM • RELEASE TO LOCK</div>}
      <div className="auctionxi-25d-topbar"><div><div className="auctionxi-25d-kicker">AUCTION XI • LIVE MATCH</div><div className="auctionxi-25d-stadium">{stadiumName}</div></div><div className="auctionxi-25d-status"><span className="auctionxi-live-dot" />LIVE</div></div>
      <div className="auctionxi-25d-camera">{(["BATTER_VIEW", "BOWLER_VIEW", "BALL_FOLLOW"] as PresentationCamera[]).map((c) => (<button key={c} type="button" className={currentCamera === c ? "active" : ""} onClick={() => { dreamPresentationRef.current?.camera.setManual(c as any); onCameraChange?.(c); }}>{c.replace("_", " ")}</button>))}</div>
      <div className="auctionxi-25d-bottom"><div className="auctionxi-25d-ball-card"><span className="label">BALL</span><strong>{lastBall?.overNumber != null ? `${Number(lastBall.overNumber) + 1}.${lastBall.ballInOver ?? ""}` : "—"}</strong></div><div className="auctionxi-25d-ball-card wide"><span className="label">COMMENTARY</span><strong>{lastBall?.commentary || (isDelivering ? "Delivery in flight…" : "Broadcast ready — awaiting delivery.")}</strong></div><div className="auctionxi-25d-ball-card"><span className="label">RESULT</span><strong className={`result-${String(lastBall?.outcome || "DOT").toLowerCase()}`}>{lastBall?.outcome || (isDelivering ? "IN FLIGHT" : "READY")}</strong></div></div>
    </section>
  );
};
export default MiniMatch25DStage;
