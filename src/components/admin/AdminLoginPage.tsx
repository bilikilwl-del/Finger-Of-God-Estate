import React, { useState } from 'react';
import { Lock, Mail, User, ShieldCheck, Check, AlertCircle, ArrowLeft, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { authService } from '../../lib/supabase';
import { EstateLogo } from '../common/EstateLogo';
import { SEOHead } from '../common/SEOHead';
import { EstateSettings } from '../../types/database';

interface AdminLoginPageProps {
  estateSettings?: EstateSettings;
  onAuthenticated: (user: any) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  estateSettings,
  onAuthenticated,
  onNavigateHome
}) => {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await authService.login(email.trim(), password);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid administrator credentials. Access denied.');
        } else {
          onAuthenticated(res.user);
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMessage('Please enter your administrator email address.');
          setLoading(false);
          return;
        }
        const res = await authService.resetPassword(email.trim());
        if (!res.success) {
          setErrorMessage(res.error || 'Unable to process password reset.');
        } else {
          setSuccessMessage(res.message || 'Password reset instructions dispatched to your registered email.');
        }
      }
    } catch {
      setErrorMessage('Authentication service temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-emerald-600 selection:text-white relative overflow-hidden">
      <SEOHead
        title="Estate Administration Login — Finger of God Estate"
        description="Private administrative portal for authorized Finger of God Estate management."
        noIndex={true}
      />

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none opacity-80" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div 
          onClick={onNavigateHome}
          className="cursor-pointer"
        >
          <EstateLogo
            size="sm"
            variant="horizontal"
            theme="dark"
            estateName={estateSettings?.estate_name || 'Finger of God Estate'}
            subtitle="EXECUTIVE MANAGEMENT CONSOLE"
          />
        </div>

        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Website</span>
        </button>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Authorized Personnel Only
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
              {mode === 'login' ? 'Estate Administration' : 'Reset Admin Password'}
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {mode === 'login'
                ? 'Sign in to access resident registry, gate control, and financial operations.'
                : 'Enter your registered administrator email to receive a recovery link.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-200 flex items-start gap-2.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fingerofgodestate.ng"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Authenticate & Enter' : 'Dispatch Reset Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to Administrator Sign In
                </button>
              </div>
            )}
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>All administrative access attempts are audited and logged with IP timestamping.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} {estateSettings?.estate_name || 'Finger of God Estate'} Management Committee • Asaba, Delta State
      </footer>
    </div>
  );
};
