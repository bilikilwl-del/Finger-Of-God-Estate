import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Shield,
  Coins,
  Zap,
  CreditCard,
  FileText,
  Bell
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

interface PublicFooterProps {
  estateSettings: EstateSettings;
  onNavigate: (tab: NavigationTab) => void;
  onOpenResidentLogin: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  estateSettings,
  onNavigate,
  onOpenResidentLogin
}) => {
  const currentYear = new Date().getFullYear();

  const handleNav = (tab: NavigationTab) => {
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-14 pb-8 border-t border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 pb-12 border-b border-slate-800/80">
          {/* Col 1: Estate Identity */}
          <div className="lg:col-span-2 space-y-4">
            <EstateLogo
              size="md"
              variant="stacked"
              theme="dark"
              estateName={estateSettings.estate_name || 'Finger of God Estate'}
              subtitle="RESIDENTIAL COMMUNITY & ESTATE MANAGEMENT"
            />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Finger of God Estate is a secure, serene, and well-managed residential community committed to 24/7 security, modern infrastructure, and transparent community stewardship.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{estateSettings.estate_address || 'Phase 1, Iyiaba, Asaba, Delta State, Nigeria'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hotline: {estateSettings.contact_phone || '08023456789'} (Gate & Security Desk)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{estateSettings.contact_email || 'admin@fingerofgodestate.ng'}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Security & Levy */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Security & Levies
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => handleNav('security_public')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Security Department</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('estate_levy')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Monthly Security Levy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('resident_portal')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Resident Portal & Dashboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('verify_receipt')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Verify Stamped Receipt</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Community Projects */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Estate Projects
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => handleNav('road_project')}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Road Paving Project</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('light_project')}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Light & Electrification</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Community & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Community Info
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => handleNav('public_announcements')}
                  className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Official Announcements</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('documents')}
                  className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Estate Bylaws & Documents</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('contact')}
                  className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Contact & Support</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenResidentLogin}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Resident Sign In</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright Only (Zero Admin Link) */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} {estateSettings.estate_name || 'Finger of God Estate'} Management Committee. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Phase 1, Iyiaba, Asaba • Delta State, Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
