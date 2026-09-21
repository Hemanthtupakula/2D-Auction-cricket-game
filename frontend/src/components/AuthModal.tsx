/**
 * Optional account modal: login / register (with security question) / recover.
 * Guests can simply close this and keep playing — accounts only add the ability
 * to resume rooms from any device (host paused, closed tab, playing later).
 */
import React, { useState } from 'react';
import * as api from '../services/api';
import { X } from 'lucide-react';

type Mode = 'login' | 'register' | 'recover';

const SECURITY_QUESTIONS = [
  'What was your childhood nickname?',
  'What is your favorite cricket player?',
  'What city were you born in?',
  'What was the name of your first school?',
  'What is your lucky number?',
];

interface AuthModalProps {
  onClose: () => void;
  onAuth: (result: api.AuthResult) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuth }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputCls =
    'w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'register'
          ? await api.authRegister(email, password, displayName, securityQuestion, securityAnswer)
          : mode === 'recover'
            ? await api.authRecover(email, securityAnswer, newPassword)
            : await api.authLogin(email, password);
      onAuth(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            🔐 Player Account <span className="text-slate-500 normal-case font-medium">(optional)</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Mode tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/60 p-1 border border-slate-800">
            {(['login', 'register', 'recover'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
                  mode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Login' : m === 'register' ? 'Register' : 'Recover'}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            {mode === 'login' && 'Log in to resume your rooms from any device — even if the host paused or you closed the tab.'}
            {mode === 'register' && 'Create an account so your game is saved: email + password + a security question.'}
            {mode === 'recover' && 'Forgot your password? Answer your security question to set a new one.'}
          </p>

          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

          {mode === 'register' && (
            <>
              <input className={inputCls} placeholder="Display name (shown in game)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <input className={inputCls} type="password" placeholder="Password (min 4 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
              <select className={inputCls} value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)}>
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <input className={inputCls} placeholder="Security answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
            </>
          )}

          {mode === 'login' && (
            <input className={inputCls} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}

          {mode === 'recover' && (
            <>
              <input className={inputCls} placeholder="Security answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} />
              <input className={inputCls} type="password" placeholder="New password (min 4 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </>
          )}

          {error && <p className="text-[11px] text-red-400 font-bold">{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'register' ? 'CREATE ACCOUNT' : mode === 'recover' ? 'RESET PASSWORD' : 'LOG IN'}
          </button>

          <button onClick={onClose} className="w-full py-2 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
            Continue as guest instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
