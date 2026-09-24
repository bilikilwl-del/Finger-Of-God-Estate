import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Send, 
  Users, 
  CheckCircle2 
} from 'lucide-react';
import { SecurityAlert, SecurityAlertCategory } from '../../types/database';

interface SecurityAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAlert: (alertData: {
    title: string;
    message: string;
    category: SecurityAlertCategory;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    start_time: string;
    expiry_time: string;
    target_audience: 'All Residents' | 'Phase 1' | 'Phase 2' | 'Commercial Area' | 'Security Personnel';
  }) => Promise<SecurityAlert | null>;
  currentUser?: {
    full_name?: string;
    email?: string;
  } | null;
}

const CATEGORIES: SecurityAlertCategory[] = [
  'Security warning',
  'Gate restriction',
  'Suspicious activity warning',
  'Emergency announcement',
  'Missing person alert',
  'Weather/environmental warning',
  'Estate-wide security notice'
];

export const SecurityAlertModal: React.FC<SecurityAlertModalProps> = ({
  isOpen,
  onClose,
  onSubmitAlert,
  currentUser
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<SecurityAlertCategory>('Security warning');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('High');
  const [targetAudience, setTargetAudience] = useState<'All Residents' | 'Phase 1' | 'Phase 2' | 'Commercial Area' | 'Security Personnel'>('All Residents');
  
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [expiryTime, setExpiryTime] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16) // Default 3 days
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await onSubmitAlert({
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        start_time: startTime,
        expiry_time: expiryTime,
        target_audience: targetAudience
      });
      if (created) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to create security alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden text-slate-900 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                Security Advisory
              </span>
              <h2 className="text-lg font-black font-display tracking-tight text-white mt-0.5">
                BROADCAST SECURITY ALERT
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Alert Headline / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Heightened Gate Verification After 22:00"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Alert Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SecurityAlertCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Low">Low (Informational)</option>
                <option value="Medium">Medium (Advisory)</option>
                <option value="High">High (Heightened Vigilance)</option>
                <option value="Critical">Critical (Immediate Action)</option>
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All Residents">All Estate Residents</option>
              <option value="Phase 1">Phase 1 Residents Only</option>
              <option value="Phase 2">Phase 2 Residents Only</option>
              <option value="Commercial Area">Commercial / Facility Operators</option>
              <option value="Security Personnel">Security Guards & Patrol Only</option>
            </select>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Advisory Message & Directives *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="State the security warning, instructions for residents, gates affected, and emergency telephone numbers..."
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Start & Expiry Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Active From
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Auto-Expire After
              </label>
              <input
                type="datetime-local"
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !message.trim()}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
