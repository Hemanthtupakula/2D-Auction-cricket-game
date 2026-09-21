import React, { useEffect, useState } from 'react';
import { MiniMatchProposal, MiniMatchOvers } from '../types';
import {
  createMiniMatchProposal,
  getMiniMatchProposals,
  acceptMiniMatchProposal,
  declineMiniMatchProposal,
  cancelMiniMatchProposal
} from '../services/api';
import { Swords, Check, X, ShieldAlert, Clock } from 'lucide-react';

interface MiniMatchLobbyModalProps {
  roomId: string;
  currentOwnerId: string;
  myFranchiseCode: string;
  availableFranchises: string[];
  onMatchStarted: (matchId: string) => void;
  onClose: () => void;
}

export const MiniMatchLobbyModal: React.FC<MiniMatchLobbyModalProps> = ({
  roomId,
  currentOwnerId,
  myFranchiseCode,
  availableFranchises,
  onMatchStarted,
  onClose
}) => {
  const [opponentCode, setOpponentCode] = useState<string>('');
  const [overs, setOvers] = useState<MiniMatchOvers>(5);
  const [proposals, setProposals] = useState<MiniMatchProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async () => {
    try {
      const list = await getMiniMatchProposals(roomId);
      setProposals(list);
    } catch (e) {
      console.error('Failed to fetch proposals:', e);
    }
  };

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const handleCreateProposal = async () => {
    if (!opponentCode || opponentCode === myFranchiseCode) {
      setError('Select a valid opponent franchise.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createMiniMatchProposal({
        roomId,
        creatorOwnerId: currentOwnerId,
        opponentOwnerId: 'opponent',
        franchiseA: myFranchiseCode,
        franchiseB: opponentCode,
        overs
      });
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to send challenge proposal.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (proposalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const match = await acceptMiniMatchProposal(proposalId, currentOwnerId);
      onMatchStarted(match.matchId);
    } catch (err: any) {
      setError(err.message || 'Failed to accept challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (proposalId: string) => {
    try {
      await declineMiniMatchProposal(proposalId, currentOwnerId);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to decline proposal.');
    }
  };

  const handleCancel = async (proposalId: string) => {
    try {
      await cancelMiniMatchProposal(proposalId, currentOwnerId);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel proposal.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Swords className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-wide">2D Mini Match Challenge Lobby</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Challenge Proposal Creator Form */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Challenge Rival Franchise</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Opponent Franchise</label>
              <select
                value={opponentCode}
                onChange={(e) => setOpponentCode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Opponent</option>
                {availableFranchises
                  .filter((f) => f !== myFranchiseCode)
                  .map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Overs Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {([2, 5, 10, 20] as MiniMatchOvers[]).map((ov) => (
                  <button
                    key={ov}
                    type="button"
                    onClick={() => setOvers(ov)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      overs === ov
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {ov} OV
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateProposal}
            disabled={loading || !opponentCode}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-black text-sm rounded-xl transition shadow-lg"
          >
            SEND MATCH PROPOSAL
          </button>
        </div>

        {/* Incoming & Sent Proposals List */}
        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Active Challenges</h3>
          {proposals.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-4">No pending match challenges in room.</p>
          ) : (
            proposals.map((p) => {
              const isIncoming = p.franchiseB === myFranchiseCode;
              const isMine = p.franchiseA === myFranchiseCode;
              return (
                <div
                  key={p.proposalId}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-sm font-bold">
                      <span className="text-amber-400">{p.franchiseA}</span>
                      <span className="text-slate-500 text-xs">vs</span>
                      <span className="text-sky-400">{p.franchiseB}</span>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md ml-2">
                        {p.overs} OVERS
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Status: {p.status}</span>
                    </div>
                  </div>

                  {p.status === 'PROPOSED' && (
                    <div className="flex items-center space-x-2">
                      {isIncoming && (
                        <>
                          <button
                            onClick={() => handleAccept(p.proposalId)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 transition"
                            title="Accept Match"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDecline(p.proposalId)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 transition"
                            title="Decline Match"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isMine && (
                        <button
                          onClick={() => handleCancel(p.proposalId)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
