import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { DreamMatchPresentation } from "./dream/presentation/director";
import type {
  AuthoritativeBallEvent,
  DeliveryKind,
  BatterIntent,
  TimingBand,
  Outcome,
  Role,
} from "./dream/core/types";
import type {
  MiniMatch25DProps,
  PresentationCamera,
  PresentationPlayer,
  PresentationBall,
} from "./types";
export type { MiniMatch25DProps };
import "./stage.css";

function normalisePlayers(input: PresentationPlayer[] | undefined): PresentationPlayer[] {
  if (input?.length) return input;
  return [
    { id: "bowler", name: "Bowler", role: "BOWLER", x: 0, z: -7.5 },
    { id: "batter", name: "Batter", role: "BATTER", x: 0, z: 8.2 },
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

function mapSpeed(val?: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 138;
  const num = parseFloat(String(val).replace(/[^\d.]/g, ""));
  return isNaN(num) || num <= 0 ? 138 : num;
}

function mapBatterIntent(val?: string): BatterIntent {
  const s = (val || "NORMAL").toUpperCase();
  if (s.includes("DEF")) return "DEFENSIVE";
  if (
    s.includes("LOFT") ||
    s.includes("PULL") ||
    s.includes("SIX") ||
    s.includes("FOUR")
  )
    return "LOFT";
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
  if (o.includes("BYE")) return "BYE";
  return "DOT";
}

function normalizeToDreamBall(
  ball: PresentationBall,
  players?: PresentationPlayer[]
): AuthoritativeBallEvent {
  const normalizedPlayers = normalisePlayers(players);
  const striker = normalizedPlayers.find((p) => p.role === "BATTER");
  const bowler = normalizedPlayers.find((p) => p.role === "BOWLER");
  const fielders = normalizedPlayers
    .filter((p) => p.role !== "BATTER" && p.role !== "BOWLER")
    .map((f) => ({
      id: f.id,
      x: f.x,
      z: f.z,
      role: (f.role || "FIELDER") as Role,
    }));

  let target: { x: number; z: number } | undefined = undefined;
  if (typeof ball.aimX === "number" && typeof ball.aimZ === "number") {
    target = { x: ball.aimX, z: ball.aimZ };
  }

  const ballId =
    ball.ballNumber != null
      ? String(ball.ballNumber)
      : `${ball.overNumber ?? 0}.${ball.ballInOver ?? 1}`;

  return {
    ballId,
    over: typeof ball.overNumber === "number" ? ball.overNumber : 0,
    ball: typeof ball.ballInOver === "number" ? ball.ballInOver : 1,
    deliveryKind: mapDeliveryKind(ball.delivery || ball.bowlPlan),
    speed: mapSpeed(ball.speed),
    batterIntent: mapBatterIntent(ball.shotIntent),
    timingBand: mapTimingBand(
      (ball as any).timing || (ball as any).timingBand || ball.shotIntent
    ),
    outcome: mapOutcome(ball),
    target,
    strikerId: striker?.id || "batter",
    nonStrikerId: "nonstriker",
    bowlerId: bowler?.id || "bowler",
    fielders,
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
  onCameraChange,
  onPresentationComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ lastBallKey: "" });
  const dreamPresentationRef = useRef<DreamMatchPresentation | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07110d);
    const camera = new THREE.PerspectiveCamera(
      48,
      mount.clientWidth / Math.max(1, mount.clientHeight),
      0.1,
      100
    );
    camera.position.set(0, 4.2, 10.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9bc8ff, 0x142018, 1.4));
    const key = new THREE.DirectionalLight(0xfff4df, 3.2);
    key.position.set(8, 16, 8);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9fc7ff, 1.1);
    fill.position.set(-12, 8, -8);
    scene.add(fill);

    const dream = new DreamMatchPresentation();
    dreamPresentationRef.current = dream;
    scene.add(dream.root);

    normalisePlayers(players).forEach((p) => {
      dream.players.position(p.id, (p.role || "FIELDER") as Role, p.x, p.z);
    });

    if (currentCamera) {
      dream.camera.set(currentCamera as any);
    }

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
      dream.update(dt, camera);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      dream.resetForNextBall();
      scene.remove(dream.root);
      dreamPresentationRef.current = null;
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
  }, [players, stadiumName]);

  useEffect(() => {
    if (currentCamera && dreamPresentationRef.current) {
      dreamPresentationRef.current.camera.set(currentCamera as any);
    }
  }, [currentCamera]);

  useEffect(() => {
    const ball = lastBall || balls[balls.length - 1];
    if (!ball) {
      dreamPresentationRef.current?.resetForNextBall();
      return;
    }
    if (!dreamPresentationRef.current) return;

    const key = `${ball.innings || 0}-${ball.ballNumber || balls.length}-${ball.outcome || ""}-${ball.runs || 0}`;
    if (key === stateRef.current.lastBallKey) return;
    stateRef.current.lastBallKey = key;

    const dreamBall = normalizeToDreamBall(ball, players);
    dreamPresentationRef.current.playBall(dreamBall);

    const timer = setTimeout(() => {
      onPresentationComplete?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, [balls, lastBall, players, onPresentationComplete]);

  return (
    <section className={`auctionxi-25d-stage ${className}`}>
      <div className="auctionxi-25d-canvas" ref={mountRef} />
      <div className="auctionxi-25d-vignette" />
      <div className="auctionxi-25d-topbar">
        <div>
          <div className="auctionxi-25d-kicker">AUCTION XI • LIVE MATCH</div>
          <div className="auctionxi-25d-stadium">{stadiumName}</div>
        </div>
        <div className="auctionxi-25d-status">
          <span className="auctionxi-live-dot" />
          LIVE
        </div>
      </div>
      <div className="auctionxi-25d-camera">
        {(["BATTER_VIEW", "BOWLER_VIEW", "BALL_FOLLOW"] as PresentationCamera[]).map(
          (c) => (
            <button
              key={c}
              type="button"
              className={currentCamera === c ? "active" : ""}
              onClick={() => {
                dreamPresentationRef.current?.camera.set(c as any);
                onCameraChange?.(c);
              }}
            >
              {c.replace("_", " ")}
            </button>
          )
        )}
      </div>
      <div className="auctionxi-25d-bottom">
        <div className="auctionxi-25d-ball-card">
          <span className="label">BALL</span>
          <strong>
            {lastBall?.overNumber != null
              ? `${Number(lastBall.overNumber) + 1}.${lastBall.ballInOver ?? ""}`
              : "—"}
          </strong>
        </div>
        <div className="auctionxi-25d-ball-card wide">
          <span className="label">COMMENTARY</span>
          <strong>
            {lastBall?.commentary || "Read the delivery. Choose your response."}
          </strong>
        </div>
        <div className="auctionxi-25d-ball-card">
          <span className="label">RESULT</span>
          <strong
            className={`result-${String(lastBall?.outcome || "DOT").toLowerCase()}`}
          >
            {lastBall?.outcome || "READY"}
          </strong>
        </div>
      </div>
    </section>
  );
};
export default MiniMatch25DStage;

