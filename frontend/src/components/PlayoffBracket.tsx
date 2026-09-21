import React from 'react';
import { SeasonFixture } from '../types';
import { resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';

interface PlayoffBracketProps {
  fixtures: SeasonFixture[];
}

/**
 * Phase 5, Section 7.5 — IPL-style playoff bracket that fills in as results
 * come in. Renders Q1 / Eliminator / Q2 / Final cards; unresolved slots show
 * TBD until the backend appends those fixtures.
 */
export const PlayoffBracket: React.FC<PlayoffBracketProps> = ({ fixtures }) => {
  const playoffs = fixtures.filter((f) => f.stage === 'PLAYOFF');
  if (playoffs.length === 0) return null;

  const find = (id: string) => playoffs.find((f) => f.fixtureId === id);
  const q1 = find('Q1');
  const e1 = find('E1');
  const q2 = find('Q2');
  const f1 = find('F1');

  const TeamSlot: React.FC<{ code?: string | null; winner?: boolean; score?: string }> = ({ code, winner, score }) => (
    <div
      className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all ${
        winner ? 'bg-amber-500/15 border-amber-500/50' : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      {code ? (
        <>
          <img src={resolveTeamLogo(code)} alt="" className="w-6 h-6 rounded-full object-cover" onError={handleImageFallback} />
          <span className={`text-sm font-black ${winner ? 'text-amber-300' : 'text-slate-200'}`}>{code}</span>
          {score && <span className="text-[11px] font-mono text-slate-400 ml-auto">{score}</span>}
          {winner && <span className="text-amber-400 text-xs ml-auto">✓</span>}
        </>
      ) : (
        <span className="text-xs font-bold text-slate-600 italic">TBD</span>
      )}
    </div>
  );

  const FixtureCard: React.FC<{ title: string; fixture?: SeasonFixture; subtitle?: string }> = ({ title, fixture, subtitle }) => {
    const done = fixture?.status === 'COMPLETED';
    const live = fixture?.status === 'IN_PROGRESS';
    const overs = (b: number) => `${Math.floor(b / 6)}.${b % 6}`;
    const homeScore = fixture && done ? `${fixture.homeRuns} (${overs(fixture.homeBalls)})` : undefined;
    const awayScore = fixture && done ? `${fixture.awayRuns} (${overs(fixture.awayBalls)})` : undefined;
    return (
      <div
        className={`rounded-2xl border p-3 space-y-2 min-w-[190px] transition-all ${
          live
            ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10 animate-pulse'
            : done
            ? 'bg-slate-900/80 border-slate-700'
            : 'bg-slate-950/60 border-slate-800/60 border-dashed'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-black uppercase tracking-wider ${live ? 'text-red-300' : done ? 'text-slate-400' : 'text-slate-600'}`}>
            {title}
          </span>
          {live && <span className="text-[9px] font-black text-red-400 uppercase">Live</span>}
        </div>
        {subtitle && <div className="text-[9px] text-slate-600 -mt-1">{subtitle}</div>}
        <TeamSlot code={fixture?.homeFranchise} winner={done && fixture?.winnerFranchise === fixture?.homeFranchise} score={homeScore} />
        <TeamSlot code={fixture?.awayFranchise} winner={done && fixture?.winnerFranchise === fixture?.awayFranchise} score={awayScore} />
        {done && fixture?.resultText && (
          <div className="text-[10px] text-slate-500 truncate" title={fixture.resultText}>
            {fixture.resultText}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-stretch gap-4 min-w-max">
        {(q1 || e1) && (
          <div className="flex flex-col justify-center gap-4">
            {q1 && <FixtureCard title="Qualifier 1" fixture={q1} subtitle="Winner → Final" />}
            {e1 && <FixtureCard title="Eliminator" fixture={e1} subtitle="Loser is out" />}
          </div>
        )}
        {(q1 || e1) && <div className="flex items-center text-slate-700 font-black text-2xl">→</div>}
        {(q1 || e1) && (
          <div className="flex flex-col justify-center">
            <FixtureCard title="Qualifier 2" fixture={q2} subtitle="Winner → Final" />
          </div>
        )}
        {(q1 || e1) && <div className="flex items-center text-slate-700 font-black text-2xl">→</div>}
        <div className="flex flex-col justify-center">
          <FixtureCard title="🏆 Final" fixture={f1} />
        </div>
      </div>
    </div>
  );
};
