import React, { useState } from 'react';
import { Player } from '../types';
import { submitMiniMatchXi } from '../services/api';
import { UserCheck, ShieldAlert, Crown } from 'lucide-react';

interface MiniMatchXIPickerModalProps {
  matchId: string;
  ownerId: string;
  franchiseCode: string;
  squad: Player[];
  onXiSubmitted: () => void;
  onClose: () => void;
}

export const MiniMatchXIPickerModal: React.FC<MiniMatchXIPickerModalProps> = ({
  matchId,
  ownerId,
  franchiseCode,
  squad,
  onXiSubmitted,
  onClose
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(squad.slice(0, 11).map((p) => p.id));
  const [captainId, setCaptainId] = useState<string>(squad[0]?.id || '');
  const [wkId, setWkId] = useState<string>(squad[1]?.id || squad[0]?.id || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlayerSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 11) {
        setSelectedIds(selectedIds.filter((pId) => pId !== id));
      }
    } else {
      if (selectedIds.length < 11) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleLockXi = async () => {
    if (selectedIds.length !== 11) {
      setError('You must select exactly 11 players for your Playing XI.');
      return;
    }
    if (!captainId || !selectedIds.includes(captainId)) {
      setError('Select a valid Captain from your Playing XI.');
      return;
    }
    if (!wkId || !selectedIds.includes(wkId)) {
      setError('Select a valid Wicketkeeper from your Playing XI.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitMiniMatchXi(matchId, {
        ownerId,
        franchiseCode,
        playerIds: selectedIds,
        captainId,
        wicketkeeperId: wkId
      });
      onXiSubmitted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit Playing XI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold">Select Playing XI ({franchiseCode})</h2>
              <p className="text-xs text-slate-400">Lock 11 players from your squad, designate Captain & WK</p>
            </div>
          </div>
          <div className="text-xs font-black bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
            {selectedIds.length} / 11 SELECTED
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Squad Selection List */}
        <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
          {squad.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            const isCap = captainId === player.id;
            const isWk = wkId === player.id;

            return (
              <div
                key={player.id}
                onClick={() => togglePlayerSelect(player.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-md'
                    : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center text-xs ${isSelected ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold' : 'border-slate-700'}`}>
                    {isSelected && '✓'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                      <span>{player.fullName}</span>
                      {isCap && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                      {isWk && <span className="text-[10px] font-black bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30">WK</span>}
                    </div>
                    <div className="text-xs text-slate-400">{player.role} • {player.nationality}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setCaptainId(player.id)}
                      className={`px-2 py-1 rounded text-xs font-bold transition ${isCap ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      (C)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWkId(player.id)}
                      className={`px-2 py-1 rounded text-xs font-bold transition ${isWk ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                      (WK)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center space-x-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleLockXi}
            disabled={loading || selectedIds.length !== 11}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black text-sm rounded-xl transition shadow-lg"
          >
            LOCK PLAYING XI
          </button>
        </div>
      </div>
    </div>
  );
};
