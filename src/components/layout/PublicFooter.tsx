import React from 'react';
import {
  Shield,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  Lock,
  ChevronRight,
  ExternalLink,
  Coins,
  Zap,
  CreditCard,
  FileText
} from 'lucide-react';
import { NavigationTab, EstateSettings } from '../../types/database';
import { EstateLogo } from '../common/EstateLogo';

interface PublicFooterProps {
  estateSettings: EstateSettings;
  onNavigate: (tab: NavigationTab) => void;
  onOpenAdminLogin: () => void;
  onOpenResidentLogin: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  estateSettings,
  onNavigate,
  onOpenAdminLogin,
  onOpenResidentLogin
}) => {
  const currentYear = new Date().getFullYear();

  const handleNav = (tab: NavigationTab) => {
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 pt-14 pb-8 border-t border-slate-800">
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
              Finger of God Estate is a secure, serene, and well-managed residential community committed to first-class security, modern infrastructure, and transparent community stewardship.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{estateSettings.estate_address || 'Phase 1, Iyiaba, Asaba, Delta State, Nigeria'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hotline: {estateSettings.contact_phone || '08023456789'} (Gate & Security)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{estateSettings.contact_email || 'admin@fingerofgodestate.ng'}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Estate Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Estate Services
            </h4>
            <ul className="space-y-2 text-xs">
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
                  <span>Monthly Estate Levy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('public_residents')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Resident Portal & Account</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('verify_receipt')}
                  className="text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Verify Payment Receipt</span>
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

          {/* Col 3: Estate Projects */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Estate Projects
            </h4>
            <ul className="space-y-2 text-xs">
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
                  <span>Light & Power Project</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('projects_overview')}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Projects Overview Hub</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('road_project')}
                  className="text-slate-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Public Financial Ledger</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Community & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Community & Info
            </h4>
            <ul className="space-y-2 text-xs">
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
                  <span>Estate Bylaws & Docs</span>
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
                  onClick={() => handleNav('home')}
                  className="text-slate-400 hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span>Estate Overview</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Security Notice, & Discreet Management Login */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} Finger of God Estate Management Committee. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-600">Official Resident & Community Portal</span>
            <span className="text-slate-700">•</span>
            <button
              onClick={onOpenAdminLogin}
              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Estate Executive Management Console"
            >
              <Lock className="w-3 h-3 text-slate-600" />
              <span>Management Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
