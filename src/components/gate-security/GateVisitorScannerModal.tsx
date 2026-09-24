import React, { useState } from 'react';
import { 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  X, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Ban, 
  Car, 
  Home, 
  Phone, 
  Calendar,
  Sparkles,
  Camera,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { VisitorPass, VisitorStatus } from '../../types/database';
import { dbService } from '../../lib/supabase';
import { QRCodeDisplay } from '../common/QRCodeDisplay';

interface GateVisitorScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVisitorUpdated?: (pass: VisitorPass) => void;
}

export const GateVisitorScannerModal: React.FC<GateVisitorScannerModalProps> = ({
  isOpen,
  onClose,
  onVisitorUpdated
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchedPass, setMatchedPass] = useState<VisitorPass | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [isDenying, setIsDenying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (codeToSearch?: string) => {
    const term = (codeToSearch || query).trim();
    if (!term) return;

    setLoading(true);
    setMessage(null);
    try {
      const passes = await dbService.getVisitorPasses();
      const cleanTerm = term.toUpperCase().replace(/[\s-]/g, '');

      const found = passes.find(p => {
        const cleanPass = p.pass_code.toUpperCase().replace(/[\s-]/g, '');
        const cleanQr = p.qr_code_data.toUpperCase().replace(/[\s-]/g, '');
        const cleanName = p.visitor_name.toUpperCase();
        const cleanPhone = p.visitor_phone.replace(/[\s-]/g, '');
        const cleanPlate = p.vehicle_number ? p.vehicle_number.toUpperCase().replace(/[\s-]/g, '') : '';

        return cleanPass === cleanTerm ||
               cleanQr === cleanTerm ||
               cleanQr.includes(cleanTerm) ||
               cleanPass.includes(cleanTerm) ||
               cleanName.includes(term.toUpperCase()) ||
               cleanPhone.includes(cleanTerm) ||
               (cleanPlate && cleanPlate.includes(cleanTerm));
      });

      if (found) {
        setMatchedPass(found);
      } else {
        setMatchedPass(null);
        setMessage({ type: 'error', text: `No visitor pass found matching "${term}". Verify visitor reference or proceed to Walk-In intake.` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to pass database.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!matchedPass) return;
    setLoading(true);
    try {
      const res = await dbService.updateVisitorStatus(matchedPass.id, 'Arrived', 'Gate Controller');
      if (res.success && res.pass) {
        setMatchedPass(res.pass);
        setMessage({ type: 'success', text: `Checked in ${res.pass.visitor_name}. Status updated to INSIDE ESTATE and logged to access log.` });
        if (onVisitorUpdated) onVisitorUpdated(res.pass);
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to check in.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Server error updating pass status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!matchedPass) return;
    setLoading(true);
    try {
      const res = await dbService.updateVisitorStatus(matchedPass.id, 'Departed', 'Gate Controller');
      if (res.success && res.pass) {
        setMatchedPass(res.pass);
        setMessage({ type: 'success', text: `Checked out ${res.pass.visitor_name}. Status updated to EXITED.` });
        if (onVisitorUpdated) onVisitorUpdated(res.pass);
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to check out.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Server error updating pass status.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!matchedPass) return;
    setLoading(true);
    try {
      const res = await dbService.updateVisitorStatus(matchedPass.id, 'Denied', 'Gate Controller', denialReason || 'Access denied by gate control');
      if (res.success && res.pass) {
        setMatchedPass(res.pass);
        setIsDenying(false);
        setMessage({ type: 'error', text: `Visitor access DENIED for ${res.pass.visitor_name}.` });
        if (onVisitorUpdated) onVisitorUpdated(res.pass);
      }
    } catch {
      setMessage({ type: 'error', text: 'Server error denying pass.' });
    } finally {
      setLoading(false);
    }
  };

  // Helper to test pre-registered passes
  const handleSimulateScan = (passCode: string) => {
    setQuery(passCode);
    setIsSimulatingCamera(true);
    setTimeout(() => {
      setIsSimulatingCamera(false);
      handleSearch(passCode);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-display text-white uppercase tracking-tight">
                Gate Visitor Pass Verifier & Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Scan QR Code, enter Reference Code (FOG-VIS-XXXX) or search guest plate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Camera Input Bar */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Pass Code (e.g. FOG-VIS-9812), visitor name, or plate..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-blue-500 font-mono font-medium"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-blue-950 flex items-center gap-2 transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Pass'}
            </button>
          </form>

          {/* Quick Scanner Presets */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <Camera className="w-3 h-3 text-blue-400" /> Quick Scan Passes:
            </span>
            <button
              type="button"
              onClick={() => handleSimulateScan('FOG-VIS-9812')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
            >
              FOG-VIS-9812 (Expected)
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan('FOG-VIS-4219')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer border border-slate-700 font-mono"
            >
              FOG-VIS-4219 (Inside)
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {message && (
            <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {isSimulatingCamera ? (
            <div className="p-12 text-center rounded-2xl bg-slate-950 border border-blue-500/40 flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin flex items-center justify-center" />
              <p className="text-sm font-bold text-blue-300 uppercase tracking-wider">Scanning QR Pass with Gate Camera...</p>
            </div>
          ) : !matchedPass ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-300">Ready for Visitor Pass Verification</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Scan guest QR badge or search reference code. The system checks live database clearance status, vehicle number and host authorization.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Pass Validity Header */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                matchedPass.status === 'Expected'
                  ? 'bg-blue-950/70 border-blue-500/60 text-blue-200'
                  : matchedPass.status === 'Arrived'
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : matchedPass.status === 'Departed'
                  ? 'bg-slate-800/80 border-slate-600 text-slate-300'
                  : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-3">
                  {matchedPass.status === 'Expected' && (
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                      <Clock className="w-5 h-5" />
                    </div>
                  )}
                  {matchedPass.status === 'Arrived' && (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {matchedPass.status === 'Departed' && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center">
                      <LogOut className="w-5 h-5" />
                    </div>
                  )}
                  {matchedPass.status === 'Denied' && (
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <Ban className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pass Clearance Status</div>
                    <div className="text-lg font-black font-display uppercase tracking-tight">
                      {matchedPass.status === 'Arrived' ? 'INSIDE ESTATE' : matchedPass.status === 'Departed' ? 'EXITED ESTATE' : matchedPass.status}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-black text-white px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
                    {matchedPass.pass_code}
                  </span>
                </div>
              </div>

              {/* Pass Card Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Visitor Details</span>
                    <h4 className="text-xl font-black text-white mt-0.5">{matchedPass.visitor_name}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {matchedPass.visitor_phone}
                    </p>
                  </div>

                  <div className="shrink-0 flex justify-center">
                    <QRCodeDisplay value={matchedPass.qr_code_data} size={90} subtitle={matchedPass.pass_code} />
                  </div>
                </div>

                {/* Host Resident Box */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                    Host Resident & Destination
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400">Host Name:</span>{' '}
                      <strong className="text-white">{matchedPass.resident_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">House / Plot:</span>{' '}
                      <strong className="text-emerald-400">{matchedPass.house_number}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Host Phone:</span>{' '}
                      <strong className="text-white font-mono">{matchedPass.resident_phone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Visit Purpose:</span>{' '}
                      <strong className="text-white">{matchedPass.purpose_of_visit}</strong>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Timestamps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                    <Car className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Vehicle Plate</div>
                      <div className="font-mono font-bold text-white">
                        {matchedPass.vehicle_number || 'None (Pedestrian)'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Arrival / Departure</div>
                      <div className="font-bold text-white truncate">
                        {matchedPass.entry_time
                          ? `Inside since ${new Date(matchedPass.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : `Expected ${new Date(matchedPass.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-3">
                  {matchedPass.status === 'Expected' && (
                    <>
                      <button
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950 transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Authorize Check-In (Inside Estate)</span>
                      </button>

                      <button
                        onClick={() => setIsDenying(!isDenying)}
                        disabled={loading}
                        className="py-3 px-4 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-rose-700 transition-colors"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Deny Entry</span>
                      </button>
                    </>
                  )}

                  {matchedPass.status === 'Arrived' && (
                    <button
                      onClick={handleCheckOut}
                      disabled={loading}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Record Check-Out (Exited Estate)</span>
                    </button>
                  )}

                  {matchedPass.status === 'Departed' && (
                    <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-slate-400 text-center text-xs font-semibold">
                      This visitor has completed their visit and departed the estate.
                    </div>
                  )}
                </div>

                {/* Denial Reason Prompt */}
                {isDenying && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 space-y-3 animate-in fade-in">
                    <label className="text-xs font-bold uppercase text-rose-300">
                      Reason for Gate Denial:
                    </label>
                    <input
                      type="text"
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                      placeholder="e.g. Host resident unavailable, invalid ID, expired pass..."
                      className="w-full p-2.5 bg-slate-950 border border-rose-700 rounded-xl text-white text-xs"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsDenying(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeny}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirm Denial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Gate Pass Clearance System</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
