import React from 'react';
import { RoomMember } from '../types';
import { Crown, User, Scale, Plus, Minus, CheckCircle, AlertTriangle } from 'lucide-react';

interface MemberListProps {
  members: RoomMember[];
  currentMemberId: string | null;
  isHost: boolean;
  isRoomMutable: boolean;
  totalRequestedQuota: number;
  onSetQuota: (memberId: string, quota: number) => void;
  onApplyRecommended: () => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentMemberId,
  isHost,
  isRoomMutable,
  totalRequestedQuota,
  onSetQuota,
  onApplyRecommended,
}) => {
  const memberCount = members.length;
  const isSumValid = totalRequestedQuota === 10;
  const maxAllowedPerPerson = Math.max(1, 10 - (memberCount - 1));

  return (
    <div className="bg-[#0e1424]/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
      {/* Header with Title & Reset Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <User className="w-4 h-4 text-blue-400" />
          <span>Human Participants ({members.length}/10)</span>
        </h3>

        {isHost && isRoomMutable && (
          <button
            type="button"
            onClick={onApplyRecommended}
            title="Reset quotas to the fair mathematical balanced distribution"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Balanced Preset</span>
          </button>
        )}
      </div>

      {/* Quota Sum Status Ticker */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <span className="text-slate-400">Total Quota Sum:</span>
        <div className="flex items-center space-x-1.5">
          <span className="font-mono font-bold text-slate-200">
            {totalRequestedQuota} / 10
          </span>
          {isSumValid ? (
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" />
              <span>Valid</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              <span>Needs 10</span>
            </span>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-2.5">
        {members.map((member) => {
          const isCurrent = member.memberId === currentMemberId;
          const isQuotaMet = member.heldCount === member.targetQuota;
          const canEditThisMember = isRoomMutable && (isHost || isCurrent);
          const currentQuota = member.requestedQuota > 0 ? member.requestedQuota : member.targetQuota;

          return (
            <div
              key={member.memberId}
              className={`p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'border-amber-500/40 bg-amber-500/5 shadow-sm'
                  : 'border-slate-800/80 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      member.isHost
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {member.isHost ? <Crown className="w-3.5 h-3.5" /> : member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-slate-200">
                        {member.displayName}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1 rounded bg-amber-500/20 text-amber-400">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {member.isHost ? 'Host' : 'Participant'}
                    </span>
                  </div>
                </div>

                {/* Quota Counter & Adjusters */}
                <div className="flex items-center space-x-2">
                  {canEditThisMember && (
                    <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => onSetQuota(member.memberId, currentQuota - 1)}
                        disabled={currentQuota <= 1}
                        title="Decrease quota"
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold px-1 text-amber-300">
                        {currentQuota}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSetQuota(member.memberId, currentQuota + 1)}
                        disabled={currentQuota >= maxAllowedPerPerson}
                        title={`Increase quota (Max ${maxAllowedPerPerson})`}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      isQuotaMet
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {member.heldCount} / {member.targetQuota} Teams
                  </span>
                </div>
              </div>

              {/* Owned franchises tags */}
              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/60">
                {member.ownedFranchises.length > 0 ? (
                  member.ownedFranchises.map((code) => (
                    <span
                      key={code}
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400"
                    >
                      {code}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] italic text-slate-500">No teams claimed yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
