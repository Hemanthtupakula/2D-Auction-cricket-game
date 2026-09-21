import React from 'react';
import { FranchiseSeat, RoomMember } from '../types';
import { Shield, User, Check, ArrowRightLeft, X, Sparkles, BarChart3 } from 'lucide-react';
import { resolveTeamLogo } from '../services/mediaResolver';

interface FranchiseCardProps {
  seat: FranchiseSeat;
  currentMember: RoomMember | null;
  isRoomMutable: boolean;
  rebalancePending: boolean;
  onClaim: (code: string) => void;
  onRelease: (code: string) => void;
  onSwitch: (oldCode: string, newCode: string) => void;
  onOpenAnalysis?: (code: string) => void;
}

export const FranchiseCard: React.FC<FranchiseCardProps> = ({
  seat,
  currentMember,
  isRoomMutable,
  rebalancePending,
  onClaim,
  onRelease,
  onSwitch,
  onOpenAnalysis,
}) => {
  const isMine = currentMember ? seat.ownerMemberId === currentMember.memberId : false;
  const myTeams = currentMember ? currentMember.ownedFranchises : [];
  const targetQuota = currentMember ? (currentMember.requestedQuota || currentMember.targetQuota || 0) : 0;
  const heldCount = currentMember ? (currentMember.heldCount ?? myTeams.length) : 0;
  const canClaimMore = currentMember ? heldCount < targetQuota : false;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        isMine
          ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-[#101726] to-[#0a0f1d] shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.02]'
          : seat.isOpen
          ? 'border-slate-800 bg-[#0d1322]/80 hover:border-slate-700 hover:bg-[#11182c]'
          : 'border-blue-900/40 bg-[#0d1424]'
      }`}
    >
      {/* Top accent banner with team colors */}
      <div
        className="h-2 w-full"
        style={{
          background: `linear-gradient(90deg, ${seat.primaryColor}, ${seat.secondaryColor})`,
        }}
      />

      <div className="p-5">
        {/* Header: Team Code & Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
              style={{
                borderColor: `${seat.primaryColor}80`,
                backgroundColor: `${seat.primaryColor}20`,
                color: seat.primaryColor === '#FFFF00' ? '#eab308' : seat.primaryColor,
              }}
            >
              {seat.code}
            </span>
            <span className="text-xs text-slate-400 truncate max-w-[120px]">{seat.city}</span>
          </div>

          {/* Status Badge */}
          {isMine ? (
            <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
              <Check className="w-3 h-3" />
              <span>YOUR TEAM (HUMAN)</span>
            </span>
          ) : seat.isHuman ? (
            <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <User className="w-3 h-3" />
              <span>HUMAN</span>
            </span>
          ) : seat.isInactive ? (
            <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              <span>INACTIVE (NO AI)</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3 h-3" />
              <span>OPEN</span>
            </span>
          )}
        </div>

        {/* Team Name and Logo representation (Clickable to inspect squad & analysis) */}
        <div
          onClick={() => onOpenAnalysis?.(seat.code)}
          className={`flex items-center space-x-3 mb-3 ${
            onOpenAnalysis ? 'cursor-pointer group' : ''
          }`}
          title={onOpenAnalysis ? `Click to inspect ${seat.name} squad and analysis` : undefined}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg tracking-wider border shadow-md overflow-hidden p-1 flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${seat.primaryColor}30, ${seat.secondaryColor}20)`,
              borderColor: `${seat.primaryColor}60`,
              color: '#ffffff',
            }}
          >
            <img
              src={resolveTeamLogo(seat.code, 80)}
              alt={seat.code}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="only:block hidden">{seat.code}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-100 leading-snug group-hover:text-amber-400 transition-colors truncate">
                {seat.name}
              </h3>
              {onOpenAnalysis && (
                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-0.5 ml-1 flex-shrink-0">
                  <span>View</span>
                  <BarChart3 className="w-3 h-3" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium truncate">
              {seat.ownerDisplayName ? (
                <span>Owner: <strong className="text-amber-400">{seat.ownerDisplayName}</strong></span>
              ) : seat.isInactive ? (
                <span className="text-slate-500 italic">Unselected — Inactive in auction</span>
              ) : (
                <span className="text-slate-500 italic">Available for claiming</span>
              )}
            </p>
          </div>
        </div>

        {/* View Squad & Team Analysis Button */}
        {onOpenAnalysis && (
          <button
            type="button"
            onClick={() => onOpenAnalysis(seat.code)}
            className="w-full mb-2.5 py-1.5 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 border border-blue-500/30 hover:border-blue-500/60 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>View Squad & Team Analysis</span>
          </button>
        )}

        {/* Action Buttons */}
        {isRoomMutable && (
          <div className="pt-2 border-t border-slate-800/80">
            {isMine ? (
              <button
                onClick={() => onRelease(seat.code)}
                disabled={rebalancePending}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Release Team</span>
              </button>
            ) : seat.isOpen ? (
              <div className="space-y-1.5">
                {canClaimMore ? (
                  <button
                    onClick={() => onClaim(seat.code)}
                    disabled={rebalancePending}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Claim {seat.code}</span>
                  </button>
                ) : (
                  <div className="text-center py-1 text-xs text-slate-500 font-medium">
                    Quota Reached ({heldCount}/{targetQuota})
                  </div>
                )}

                {myTeams.length > 0 && (
                  <button
                    onClick={() => onSwitch(myTeams[0], seat.code)}
                    disabled={rebalancePending}
                    className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                    <span>Swap {myTeams[0]} for {seat.code}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-1.5 text-xs text-slate-400 font-medium">
                Assigned to {seat.ownerDisplayName}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
