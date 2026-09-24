import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { authService, isSupabaseConfigured } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email, password);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid email or password.');
        } else {
          onAuthenticated(res.user);
          onClose();
        }
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMessage('Full name is required.');
          setLoading(false);
          return;
        }
        const res = await authService.register(email, password, fullName);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create administrator account.');
        } else {
          onAuthenticated(res.user);
          onClose();
        }
      } else if (mode === 'forgot') {
        const res = await authService.resetPassword(email);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to send reset link.');
        } else {
          setSuccessMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">
                {mode === 'login' && 'Administrator Sign In'}
                {mode === 'register' && 'Register Administrator'}
                {mode === 'forgot' && 'Reset Security Password'}
              </h3>
              <p className="text-xs text-slate-400">
                {isSupabaseConfigured ? 'Supabase Auth Backend' : 'Estate Security Console Access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Administrator Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Chief Security Officer"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@palmgroveestate.ng"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-emerald-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 mt-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <span>
              {mode === 'login' && 'Sign In to Console'}
              {mode === 'register' && 'Create Admin Account'}
              {mode === 'forgot' && 'Send Password Reset Link'}
            </span>
          </button>

          {/* Toggle Modes */}
          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' && (
              <p>
                Need a new administrator account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  Create Account
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p>
                Already have an admin account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-emerald-600 font-semibold hover:underline"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
