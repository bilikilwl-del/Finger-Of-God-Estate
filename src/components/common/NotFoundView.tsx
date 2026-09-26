import React from 'react';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';
import { EstateLogo } from './EstateLogo';
import { SEOHead } from './SEOHead';
import { EstateSettings } from '../../types/database';

interface NotFoundViewProps {
  estateSettings?: EstateSettings;
  onNavigateHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  estateSettings,
  onNavigateHome
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      <SEOHead
        title="Page Not Found (404) — Finger of God Estate"
        description="The requested page could not be found."
        noIndex={true}
      />

      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between border-b border-slate-200">
        <div 
          onClick={onNavigateHome}
          className="cursor-pointer"
        >
          <EstateLogo
            size="sm"
            variant="horizontal"
            theme="light"
            estateName={estateSettings?.estate_name || 'Finger of God Estate'}
            subtitle="ESTATE MANAGEMENT & RESIDENT PLATFORM"
          />
        </div>
      </header>

      {/* Main 404 Area */}
      <main className="max-w-md w-full mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="w-8 h-8 text-emerald-700" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700">404 Error</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            The page you are looking for does not exist, has been moved, or the link is incorrect.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm hover:shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} {estateSettings?.estate_name || 'Finger of God Estate'} Management Committee • Asaba, Delta State
      </footer>
    </div>
  );
};
