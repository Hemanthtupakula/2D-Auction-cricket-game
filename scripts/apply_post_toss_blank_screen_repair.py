from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / '.post-toss-repair-backup'
BACKUP.mkdir(parents=True, exist_ok=True)


def patch_file(rel: str, transforms):
    target = ROOT / rel
    if not target.exists():
        raise SystemExit(f'Missing required file: {rel}')
    backup = BACKUP / rel
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(target, backup)
    text = target.read_text(encoding='utf-8')
    original = text
    for old, new in transforms:
        if old in text:
            text = text.replace(old, new, 1)
    if text == original:
        raise SystemExit(f'No changes applied to {rel}; expected baseline text was not found.')
    target.write_text(text, encoding='utf-8')
    print(f'patched: {rel}')

match_transforms = [
(
"  if (!isOpen) return null;\n",
"""  if (!isOpen) return null;\n\n  // Defensive normalization: the authoritative API normally supplies both\n  // Playing XIs, but a transient post-toss snapshot must never crash React.\n  const safeHomeXi: Player[] = Array.isArray(match?.homeXi) ? match!.homeXi : [];\n  const safeAwayXi: Player[] = Array.isArray(match?.awayXi) ? match!.awayXi : [];\n  const battingXi: Player[] = match?.innings === 1 ? safeHomeXi : safeAwayXi;\n  const bowlingXi: Player[] = match?.innings === 1 ? safeAwayXi : safeHomeXi;\n"""
),
("(match.innings === 1 ? match.homeXi : match.awayXi).map", "battingXi.map"),
("(match.innings === 1 ? match.awayXi : match.homeXi).map", "bowlingXi.map"),
(
"(match.innings === 1 ? match.homeXi : match.awayXi)\n                      .filter",
"battingXi\n                      .filter"
),
(
"  // 10-second XI preview timer trigger\n",
"""  // Post-toss setup states are polled briefly as a safety net in case\n  // a Cloudflare/WebSocket delivery is delayed during owner hand-off.\n  const POST_TOSS_REFRESH_INTERVAL = 1500;\n  useEffect(() => {\n    if (!isOpen || !activeMatchId) return;\n    const setupStates = new Set([\n      'XI_PREVIEW', 'TOSS_SELECTION', 'TOSS_LOCKED', 'TOSS_RESULT',\n      'BAT_OR_BOWL_SELECTION', 'INITIAL_BATTER_SELECTION',\n      'BOWLER_SELECTION', 'BATTERS_LOCKED', 'BOWLER_LOCKED', 'BALL_READY',\n    ]);\n    if (!match || !setupStates.has(match.status)) return;\n\n    const timer = window.setInterval(() => {\n      api.getMatch(roomCode, activeMatchId)\n        .then((next) => {\n          setMatch(next);\n          setBalls(next.ballLog || []);\n        })\n        .catch(() => {});\n    }, POST_TOSS_REFRESH_INTERVAL);\n\n    return () => window.clearInterval(timer);\n  }, [isOpen, activeMatchId, roomCode, match?.status]);\n\n  // 10-second XI preview timer trigger\n"""
)
]

patch_file('frontend/src/components/MatchScreen.tsx', match_transforms)

app_transforms = [
(
"function parseRoute(): { route: AppRoute; roomCode?: string } {\n",
"""class MatchScreenErrorBoundary extends React.Component<\n  { children: React.ReactNode },\n  { error: Error | null }\n> {\n  state = { error: null as Error | null };\n\n  static getDerivedStateFromError(error: Error) {\n    return { error };\n  }\n\n  componentDidCatch(error: Error) {\n    console.error('[MATCH_SCREEN_RUNTIME]', error);\n  }\n\n  render() {\n    if (this.state.error) {\n      return (\n        <div className=\"fixed inset-0 z-[80] bg-[#070a12] text-white flex items-center justify-center p-6\">\n          <div className=\"w-full max-w-lg rounded-3xl border border-rose-500/30 bg-slate-950 p-6 shadow-2xl\">\n            <div className=\"text-xs font-black tracking-[0.18em] text-rose-400 uppercase\">Match Runtime Recovery</div>\n            <h2 className=\"mt-2 text-xl font-black\">The match screen hit a runtime error.</h2>\n            <p className=\"mt-2 text-sm text-slate-400\">Your authoritative server match is preserved. Reload to resume from its current state.</p>\n            <pre className=\"mt-4 max-h-28 overflow-auto rounded-xl bg-black/40 p-3 text-[10px] text-rose-300 whitespace-pre-wrap\">{this.state.error.message}</pre>\n            <div className=\"mt-4 flex gap-2\">\n              <button type=\"button\" onClick={() => window.location.reload()} className=\"px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs\">RELOAD MATCH</button>\n              <button type=\"button\" onClick={() => this.setState({ error: null })} className=\"px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-black text-xs\">TRY AGAIN</button>\n            </div>\n          </div>\n        </div>\n      );\n    }\n    return this.props.children;\n  }\n}\n\nfunction parseRoute(): { route: AppRoute; roomCode?: string } {\n"""
),
(
"        <Suspense fallback={null}>\n          <MatchScreen\n",
"""        <Suspense fallback={\n          <div className=\"fixed inset-0 z-[80] bg-[#070a12] flex items-center justify-center text-white\">\n            <div className=\"text-center\">\n              <div className=\"w-9 h-9 mx-auto border-2 border-amber-500 border-t-transparent rounded-full animate-spin\" />\n              <div className=\"mt-3 text-xs font-black text-slate-300\">LOADING MATCH ENGINE...</div>\n            </div>\n          </div>\n        }>\n          <MatchScreenErrorBoundary>\n            <MatchScreen\n"""
),
(
"            onMatchStarted={(id) => setActiveMatchId(id)}\n          />\n          <SeasonScreen\n",
"""              onMatchStarted={(id) => setActiveMatchId(id)}\n            />\n          </MatchScreenErrorBoundary>\n          <SeasonScreen\n"""
)
]

patch_file('frontend/src/App.tsx', app_transforms)
print('Post-toss blank-screen repair installed.')
