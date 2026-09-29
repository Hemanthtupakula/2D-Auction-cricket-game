from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / '.full-3d-runtime-repair-backup'
BACKUP.mkdir(parents=True, exist_ok=True)

def patch(rel, transforms):
    target = ROOT / rel
    if not target.exists():
        raise SystemExit(f'Missing target: {rel}')
    original = target.read_text(encoding='utf-8')
    updated = original
    for old, new, label in transforms:
        if old not in updated:
            raise SystemExit(f'Pattern not found in {rel}: {label}')
        updated = updated.replace(old, new, 1)
    backup = BACKUP / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, backup)
    target.write_text(updated, encoding='utf-8')
    print('PATCHED', rel)

patch('frontend/src/components/auctionxi25d/dream/players/rig.ts', [
('''export class PlayerDirector {\n  readonly v4Rig = new ProductionCricketPlayerRig();\n  readonly group: THREE.Group = this.v4Rig.group;\n\n  position(id: string, role: Role, x: number, z: number, name?: string): void {''',
'''export class PlayerDirector {\n  readonly v4Rig = new ProductionCricketPlayerRig();\n  readonly group: THREE.Group = this.v4Rig.group;\n  private activeIds = new Set<string>();\n\n  position(id: string, role: Role, x: number, z: number, name?: string): void {''','activeIds'),
('''    this.v4Rig.addPlayer(identity, new THREE.Vector3(x, 0, z));\n    this.v4Rig.setPlayerPosition(id, new THREE.Vector3(x, 0, z));\n  }\n\n  state(id: string, _role: Role, state: PresentationState): void {''',
'''    this.v4Rig.addPlayer(identity, new THREE.Vector3(x, 0, z));\n    this.v4Rig.setPlayerPosition(id, new THREE.Vector3(x, 0, z));\n    this.activeIds.add(id);\n  }\n\n  async preloadVisuals(players: Array<{ id: string; role?: Role; x: number; z: number; name?: string }>): Promise<void> {\n    const identities = players.map((player) => ({\n      id: player.id,\n      name: player.name || player.id,\n      role: player.role === "BATTER" ? "BATTER" as const : player.role === "BOWLER" ? "BOWLER" as const : player.role === "KEEPER" ? "KEEPER" as const : "FIELDER" as const,\n      visualProfileId: player.role === "KEEPER" ? "hkt-17" : player.role === "BOWLER" ? "akshay-18" : player.role === "BATTER" ? "ajay-07" : "gokul-11",\n    }));\n    await this.v4Rig.preloadVisuals(identities);\n  }\n\n  syncPlayers(players: Array<{ id: string; role?: Role; x: number; z: number; name?: string }>): void {\n    if (players.length < 7) return;\n    const nextIds = new Set(players.map((player) => player.id).filter(Boolean));\n    for (const id of this.activeIds) {\n      if (!nextIds.has(id)) this.v4Rig.removePlayer(id);\n    }\n    for (const player of players) {\n      this.position(player.id, (player.role || "FIELDER") as Role, player.x, player.z, player.name);\n    }\n    this.activeIds = nextIds;\n  }\n\n  state(id: string, _role: Role, state: PresentationState): void {''','preload and sync methods')])

patch('frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts', [
('''  addPlayer(input:PlayerIdentity,position:THREE.Vector3,yaw=0){\n    if(this.players.has(input.id))return;''',
'''  async preloadVisuals(identities: PlayerIdentity[]): Promise<void> {\n    if (!this.hybrid) return;\n    const unique = new Map<string, PlayerIdentity>();\n    for (const identity of identities) {\n      if (identity.assetUrl) unique.set(identity.visualProfileId || identity.id, identity);\n    }\n    await this.hybrid.preloadProfiles([...unique.values()]);\n  }\n\n  addPlayer(input:PlayerIdentity,position:THREE.Vector3,yaw=0){\n    if(this.players.has(input.id))return;''','preload method')])

patch('frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx', [
('''  const aimVisualRef = useRef<{ ring: THREE.Mesh; dot: THREE.Mesh; line: THREE.Line } | null>(null);\n  const aimValuesRef = useRef({ x: aimX, z: aimZ, canAim });\n\n  aimValuesRef.current = { x: aimX, z: aimZ, canAim };''',
'''  const aimVisualRef = useRef<{ ring: THREE.Mesh; dot: THREE.Mesh; line: THREE.Line } | null>(null);\n  const aimValuesRef = useRef({ x: aimX, z: aimZ, canAim });\n  const playersRef = useRef(players);\n  const onAimChangeRef = useRef(onAimChange);\n  const mountedRef = useRef(true);\n\n  aimValuesRef.current = { x: aimX, z: aimZ, canAim };\n  playersRef.current = players;\n  onAimChangeRef.current = onAimChange;''','stable refs'),
('''  const batters = normalizedPlayers.filter((p) => p.role === "BATTER");\n  const striker = batters[0];\n  const nonStriker = batters[1];\n  const bowler = normalizedPlayers.find((p) => p.role === "BOWLER");\n  const fielders = normalizedPlayers\n    .filter((p) => p.role !== "BATTER" && p.role !== "BOWLER")\n    .map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));''',
'''  const batters = normalizedPlayers.filter((p) => p.role === "BATTER");\n  const striker = normalizedPlayers.find((p) => p.id === ball.batterId) || batters[0];\n  const nonStriker = batters.find((p) => p.id !== striker?.id) || batters[1];\n  const bowler = normalizedPlayers.find((p) => p.id === ball.bowlerId) || normalizedPlayers.find((p) => p.role === "BOWLER");\n  const fielders = normalizedPlayers\n    .filter((p) => p.id !== striker?.id && p.id !== bowler?.id && p.role !== "BATTER")\n    .map((f) => ({ id: f.id, x: f.x, z: f.z, role: (f.role || "FIELDER") as Role }));''','authoritative ball participants'),
('''    normalisePlayers(players).forEach((p) => {\n      dream.players.position(p.id, (p.role || "FIELDER") as Role, p.x, p.z, p.name);\n    });''',
'''    dream.players.group.visible = false;\n    const initialPlayers = normalisePlayers(playersRef.current);\n    void dream.players.preloadVisuals(initialPlayers).then(() => {\n      if (!mountedRef.current || dreamPresentationRef.current !== dream) return;\n      dream.players.syncPlayers(initialPlayers);\n      dream.players.group.visible = true;\n    });''','initial visual preload'),
('''      onAimChange?.(x, z);''','''      onAimChangeRef.current?.(x, z);''','stable aim callback'),
('''      renderer.dispose();\n      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);''',
'''      mountedRef.current = false;\n      renderer.dispose();\n      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);''','mount lifecycle'),
('''  }, [players, stadiumName, onAimChange]);\n\n  useEffect(() => {''',
'''  }, [stadiumName]);\n\n  useEffect(() => {\n    const dream = dreamPresentationRef.current;\n    if (!dream || !players || players.length < 7) return;\n    const current = normalisePlayers(players);\n    let cancelled = false;\n    dream.players.group.visible = false;\n    void dream.players.preloadVisuals(current).then(() => {\n      if (cancelled || !mountedRef.current || dreamPresentationRef.current !== dream) return;\n      dream.players.syncPlayers(current);\n      dream.players.group.visible = true;\n    });\n    return () => { cancelled = true; };\n  }, [players]);\n\n  useEffect(() => {''','persistent scene and player sync'),
('''    const key = `${ball.innings || 0}-${ball.ballNumber || balls.length}-${ball.outcome || ""}-${ball.runs || 0}-${ball.timing || ""}`;''',
'''    const key = `${ball.innings || 0}-${ball.ballNumber || balls.length}-${ball.batterId || ""}-${ball.bowlerId || ""}-${ball.outcome || ""}-${ball.runs || 0}-${ball.timing || ""}`;''','stronger ball identity'),
('''      <div className="auctionxi-25d-camera">\n        {(["BATTER_VIEW", "BOWLER_VIEW", "BALL_FOLLOW"] as PresentationCamera[]).map((c) => (''',
'''      <div className="auctionxi-25d-camera" aria-label="Broadcast camera views">\n        {(["BATTER_VIEW", "BOWLER_VIEW", "DELIVERY_TRACK", "CONTACT_VIEW", "BALL_FOLLOW", "FIELDING_VIEW", "BOUNDARY_VIEW", "WICKET_VIEW", "CELEBRATION_VIEW"] as PresentationCamera[]).map((c) => (''','full camera suite')])

patch('frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts', [
('''  const striker = battingXi.find((player) => player.id === match.currentStrikerId);\n  const nonStriker = battingXi.find((player) => player.id === match.currentNonStrikerId);\n  const bowler = bowlingXi.find((player) => player.id === match.currentBowlerId);\n  const keeper = bowlingXi.find(isKeeper);''',
'''  const lastBall = (match.ballLog || []).length ? (match.ballLog || [])[match.ballLog.length - 1] : null;\n  const strikerIdForPresentation = lastBall?.batterId || match.currentStrikerId;\n  const bowlerIdForPresentation = lastBall?.bowlerId || match.currentBowlerId;\n  const striker = battingXi.find((player) => player.id === strikerIdForPresentation);\n  const nonStriker = battingXi.find((player) => player.id !== striker?.id && player.id === match.currentNonStrikerId) || battingXi.find((player) => player.id !== striker?.id);\n  const bowler = bowlingXi.find((player) => player.id === bowlerIdForPresentation);\n  const keeper = bowlingXi.find(isKeeper);''','ball participant binding'),
('''  const fieldPositions: Array<[number, number]> = [\n    [-6.4, 2.5], [6.4, 2.5], [-5.6, -1.5], [5.6, -1.5],\n    [-8.2, -5.5], [8.2, -5.5], [0, -11.5],\n  ];''',
'''  const fieldPositions: Array<[number, number]> = [\n    [-6.4, 2.5], [6.4, 2.5],\n    [-5.6, -1.5], [5.6, -1.5],\n    [-8.2, -5.5], [8.2, -5.5],\n    [0, -11.5], [-3.8, -8.8], [3.8, -8.8],\n  ];''','nine field positions')])

patch('frontend/src/components/auctionxi25d/dream/ball/director.ts', [
('''    this.ball = new THREE.Mesh(\n      new THREE.SphereGeometry(0.07, 18, 12),\n      new THREE.MeshStandardMaterial({ color: 0xc71818, roughness: 0.28, metalness: 0.04 }),\n    );''',
'''    this.ball = new THREE.Mesh(\n      new THREE.SphereGeometry(0.11, 22, 16),\n      new THREE.MeshStandardMaterial({ color: 0xe31b23, emissive: 0x6a0000, emissiveIntensity: 2.4, roughness: 0.22, metalness: 0.03 }),\n    );''','larger ball'),
('''      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.52 }),''',
'''      new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.78 }),''','brighter trail')])

patch('frontend/src/components/auctionxi25d/stage.css', [
('''.auctionxi-25d-camera{position:absolute;top:72px;right:20px;display:flex;gap:5px;padding:5px;border-radius:12px;background:rgba(5,9,15,.6);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(10px)}\n.auctionxi-25d-camera button{border:0;border-radius:8px;padding:7px 9px;color:#9eabc0;background:transparent;font:800 9px/1 system-ui,sans-serif;cursor:pointer}''',
'''.auctionxi-25d-camera{position:absolute;top:72px;right:20px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;padding:6px;max-width:min(760px,72%);border-radius:12px;background:rgba(5,9,15,.68);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(10px);z-index:8}\n.auctionxi-25d-camera button{border:0;border-radius:8px;padding:7px 9px;color:#9eabc0;background:transparent;font:800 8px/1 system-ui,sans-serif;cursor:pointer;white-space:nowrap}''','camera layout')])

print('Full 3D runtime repair applied.')
