/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Resident, 
  EstateSettings, 
  ActivityLog, 
  NavigationTab 
} from './types/database';
import { 
  dbService, 
  authService, 
  residentSessionService 
} from './lib/supabase';

// Layout & Admin Components
import { AdminSidebar } from './components/layout/AdminSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { AdvancedManagementDashboard } from './components/dashboard/AdvancedManagementDashboard';
import { ResidentList } from './components/residents/ResidentList';
import { ResidentProfileView } from './components/residents/ResidentProfileView';
import { ResidentFormModal } from './components/residents/ResidentFormModal';
import { ResidentDetailModal } from './components/residents/ResidentDetailModal';
import { EstateSettingsView } from './components/settings/EstateSettingsView';
import { ActivityLogsView } from './components/activity/ActivityLogsView';
import { PaymentsView } from './components/payments/PaymentsView';
import { PaidResidentsView } from './components/admin/PaidResidentsView';
import { UnpaidResidentsView } from './components/admin/UnpaidResidentsView';
import { OutstandingPaymentsView } from './components/admin/OutstandingPaymentsView';
import { FinancialReportsView } from './components/admin/FinancialReportsView';
import { SMSDashboardView } from './components/sms/SMSDashboardView';
import { AnnouncementsView } from './components/admin/AnnouncementsView';
import { RoadProjectAdminView } from './components/admin/RoadProjectAdminView';
import { SecurityOperationsView } from './components/security/SecurityOperationsView';
import { GateSecurityDashboard } from './components/gate-security/GateSecurityDashboard';

// Resident Portal Components
import { ResidentDashboardView } from './components/resident-portal/ResidentDashboardView';
import { ResidentLoginView } from './components/resident-portal/ResidentLoginView';
import { ResidentLoginModal } from './components/resident-portal/ResidentLoginModal';
import { ReceiptVerificationView } from './components/receipts/ReceiptVerificationView';

// Public Pages
import { PublicHomeView } from './components/public/PublicHomeView';
import { PublicSecurityView } from './components/public/PublicSecurityView';
import { PublicRoadProjectView } from './components/public/PublicRoadProjectView';
import { PublicLightProjectView } from './components/public/PublicLightProjectView';
import { PublicEstateLevyView } from './components/public/PublicEstateLevyView';
import { PublicDocumentsView } from './components/public/PublicDocumentsView';
import { PublicContactView } from './components/public/PublicContactView';
import { PublicAnnouncementsView } from './components/public/PublicAnnouncementsView';
import { AnnouncementDetailView } from './components/public/AnnouncementDetailView';
import { NotFoundView } from './components/common/NotFoundView';

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

function getNavFromPathname(pathname: string): { tab: NavigationTab; slug: string } {
  const path = pathname.toLowerCase().replace(/\/$/, '') || '/';

  if (path === '/' || path === '/home') {
    return { tab: 'home', slug: '' };
  }
  if (path === '/security') {
    return { tab: 'security_public', slug: '' };
  }
  if (path === '/road-project' || path === '/road') {
    return { tab: 'road_project', slug: '' };
  }
  if (path === '/light-project' || path === '/light') {
    return { tab: 'light_project', slug: '' };
  }
  if (path === '/estate-levy' || path === '/levy') {
    return { tab: 'estate_levy', slug: '' };
  }
  if (path === '/resident-portal' || path === '/portal') {
    return { tab: 'resident_portal', slug: '' };
  }
  if (path === '/login' || path === '/activate' || path === '/resident-login') {
    return { tab: 'login', slug: '' };
  }
  if (path === '/announcements') {
    return { tab: 'public_announcements', slug: '' };
  }
  if (path.startsWith('/announcements/')) {
    const slug = pathname.replace(/^\/announcements\//i, '').replace(/\/$/, '');
    return { tab: 'announcement_detail', slug };
  }
  if (path === '/documents' || path === '/docs') {
    return { tab: 'documents', slug: '' };
  }
  if (path === '/contact' || path === '/support') {
    return { tab: 'contact', slug: '' };
  }
  if (path === '/verify-receipt' || path === '/verify_receipt') {
    return { tab: 'verify_receipt', slug: '' };
  }
  // Private Admin Routes
  if (path === '/admin-login' || path === '/admin/login' || path === '/admin' || path === '/admin/dashboard' || path === '/dashboard') {
    return { tab: 'dashboard', slug: '' };
  }

  // 404 for any unexpected route
  return { tab: 'not_found', slug: '' };
}

function getPathnameFromTab(tab: NavigationTab, slug?: string): string {
  switch (tab) {
    case 'home': return '/';
    case 'security_public': return '/security';
    case 'road_project': return '/road-project';
    case 'light_project': return '/light-project';
    case 'estate_levy': return '/estate-levy';
    case 'resident_portal': return '/resident-portal';
    case 'login': return '/login';
    case 'public_announcements': return '/announcements';
    case 'announcement_detail': return slug ? `/announcements/${slug}` : '/announcements';
    case 'documents': return '/documents';
    case 'contact': return '/contact';
    case 'verify_receipt': return '/verify-receipt';
    case 'admin_login':
    case 'dashboard':
    case 'residents':
    case 'payments':
    case 'paid_residents':
    case 'unpaid_residents':
    case 'outstanding':
    case 'reports':
    case 'sms':
    case 'announcements':
    case 'settings':
    case 'logs':
    case 'gate_security':
    case 'security_ops':
    case 'road_project_admin':
      return '/admin';
    default: return '/';
  }
}

export default function App() {
  const initialNav = getNavFromPathname(window.location.pathname);
  const [currentTab, setCurrentTab] = useState<NavigationTab>(initialNav.tab);
  const [selectedNoticeSlug, setSelectedNoticeSlug] = useState<string>(initialNav.slug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewingResidentProfile, setViewingResidentProfile] = useState<Resident | null>(null);

  // Core Data State
  const [residents, setResidents] = useState<Resident[]>([]);
  const [estateSettings, setEstateSettings] = useState<EstateSettings>({
    id: 'default',
    estate_name: 'Finger of God Estate',
    estate_address: 'Phase 1, Iyiaba, Asaba, Delta State, Nigeria',
    estate_state: 'Delta',
    estate_lga: 'Oshimili South',
    monthly_security_levy: 5000,
    payment_due_day: 1,
    currency: 'NGN',
    contact_phone: '08023456789',
    contact_email: 'admin@fingerofgodestate.ng',
    sms_sender_name: 'FINGEROFGOD',
    first_payment_month: 'October 2026'
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin User State
  const [adminUser, setAdminUser] = useState<any>(null);

  // Resident Portal State
  const [currentResident, setCurrentResident] = useState<Resident | null>(null);
  const [isResidentLoginOpen, setIsResidentLoginOpen] = useState(false);
  const [residentLoginInitialTab, setResidentLoginInitialTab] = useState<'login' | 'activate'>('login');
  const [receiptToVerify, setReceiptToVerify] = useState<string>('');

  // Modals for Admin Resident Management
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [residentToView, setResidentToView] = useState<Resident | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Browser Navigation History (popstate) Sync
  useEffect(() => {
    const handlePopState = () => {
      const nav = getNavFromPathname(window.location.pathname);
      setCurrentTab(nav.tab);
      if (nav.slug) setSelectedNoticeSlug(nav.slug);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (tab: NavigationTab, slug: string = '') => {
    setCurrentTab(tab);
    if (slug) setSelectedNoticeSlug(slug);
    const targetUrl = getPathnameFromTab(tab, slug);
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ tab, slug }, '', targetUrl);
    }
  };

  // Initial Data Initialization
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const user = authService.getCurrentUser();
        setAdminUser(user);

        const [loadedSettings, loadedResidents, loadedLogs] = await Promise.all([
          dbService.getSettings(),
          dbService.getResidents(),
          dbService.getActivityLogs()
        ]);

        setEstateSettings(loadedSettings);
        setResidents(loadedResidents);
        setActivityLogs(loadedLogs);

        // Load saved resident session if exists
        const savedRes = residentSessionService.getCurrentResident();
        if (savedRes) {
          setCurrentResident(savedRes);
        }
      } catch (err) {
        console.warn('Notice initializing app data:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleOpenResidentLogin = (initialTab: 'login' | 'activate' = 'login') => {
    setResidentLoginInitialTab(initialTab);
    setIsResidentLoginOpen(true);
  };

  const handleOpenAddResident = () => {
    setResidentToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditResident = (resident: Resident) => {
    setResidentToEdit(resident);
    setIsFormModalOpen(true);
  };

  const handleOpenViewResident = (resident: Resident) => {
    setViewingResidentProfile(resident);
    navigateTo('residents');
  };

  const handleSelectAdminTab = (tab: NavigationTab) => {
    setViewingResidentProfile(null);
    navigateTo(tab);
  };

  const handleResidentSaved = async (savedResident: Resident) => {
    const [updatedList, updatedLogs] = await Promise.all([
      dbService.getResidents(),
      dbService.getActivityLogs()
    ]);
    setResidents(updatedList);
    setActivityLogs(updatedLogs);

    if (viewingResidentProfile?.id === savedResident.id) {
      setViewingResidentProfile(savedResident);
    }
    if (residentToView?.id === savedResident.id) {
      setResidentToView(savedResident);
    }

    showToast(
      residentToEdit 
        ? `Updated profile for Resident #${savedResident.resident_number} (${savedResident.full_name})`
        : `Successfully registered Resident #${savedResident.resident_number} (${savedResident.full_name})`
    );
  };

  const handleToggleStatus = async (resident: Resident) => {
    const newStatus = resident.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const updated = await dbService.toggleResidentStatus(
        resident.id,
        newStatus,
        adminUser?.email || 'admin'
      );

      const [updatedList, updatedLogs] = await Promise.all([
        dbService.getResidents(),
        dbService.getActivityLogs()
      ]);
      setResidents(updatedList);
      setActivityLogs(updatedLogs);

      if (viewingResidentProfile?.id === resident.id) {
        setViewingResidentProfile(updated);
      }
      if (residentToView?.id === resident.id) {
        setResidentToView(updated);
      }

      showToast(
        `Resident #${resident.resident_number} status changed to ${newStatus}.`,
        newStatus === 'Active' ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update resident status', 'error');
    }
  };

  const handleSettingsUpdated = async (updated: EstateSettings) => {
    setEstateSettings(updated);
    const updatedLogs = await dbService.getActivityLogs();
    setActivityLogs(updatedLogs);
    showToast('Estate settings successfully saved.');
  };

  const handleAdminLogout = async () => {
    await authService.logout();
    setAdminUser(null);
    showToast('Signed out of administrative console.', 'info');
    navigateTo('home');
  };

  const handleAdminAuthenticated = async (user: any) => {
    setAdminUser(user);
    showToast(`Welcome, ${user.full_name || user.email}!`, 'success');
    navigateTo('dashboard');
    const logs = await dbService.getActivityLogs();
    setActivityLogs(logs);
  };

  // Toast component renderer
  const renderToast = () => {
    if (!toast) return null;
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 max-w-md ${
          toast.type === 'success' 
            ? 'bg-slate-900 text-white border-slate-800' 
            : toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-800'
            : 'bg-slate-800 text-slate-100 border-slate-700'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // 1. PUBLIC ROUTE: HOME
  // ----------------------------------------------------
  if (currentTab === 'home') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicHomeView
          estateSettings={estateSettings}
          currentResident={currentResident}
          onNavigate={(tab) => {
            if (tab === 'resident_portal') {
              const active = currentResident || residentSessionService.getCurrentResident();
              if (!active) handleOpenResidentLogin('login');
            }
            navigateTo(tab);
          }}
          onNavigateToAnnouncementDetail={(slug) => {
            setSelectedNoticeSlug(slug);
            navigateTo('announcement_detail', slug);
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. PUBLIC ROUTE: SECURITY
  // ----------------------------------------------------
  if (currentTab === 'security_public') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicSecurityView
          estateSettings={estateSettings}
          onNavigateHome={() => navigateTo('home')}
          onNavigateToRoadProject={() => navigateTo('road_project')}
          onNavigateToAnnouncements={() => navigateTo('public_announcements')}
          onNavigateToAnnouncementDetail={(slug) => {
            setSelectedNoticeSlug(slug);
            navigateTo('announcement_detail', slug);
          }}
          onNavigateToVerifyReceipt={() => navigateTo('verify_receipt')}
          onNavigateToPortal={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
          onOpenPayLevy={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. PUBLIC ROUTE: ROAD PROJECT
  // ----------------------------------------------------
  if (currentTab === 'road_project') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicRoadProjectView
          estateSettings={estateSettings}
          onNavigateHome={() => navigateTo('home')}
          onNavigateToSecurity={() => navigateTo('security_public')}
          onNavigateToAnnouncements={() => navigateTo('public_announcements')}
          onNavigateToPortal={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
          onNavigateToVerifyReceipt={() => navigateTo('verify_receipt')}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 4. PUBLIC ROUTE: LIGHT PROJECT
  // ----------------------------------------------------
  if (currentTab === 'light_project') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicLightProjectView
          estateSettings={estateSettings}
          currentResident={currentResident}
          onNavigate={(tab) => {
            if (tab === 'resident_portal') {
              const active = currentResident || residentSessionService.getCurrentResident();
              if (!active) handleOpenResidentLogin('login');
            }
            navigateTo(tab);
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 5. PUBLIC ROUTE: ESTATE LEVY
  // ----------------------------------------------------
  if (currentTab === 'estate_levy') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicEstateLevyView
          estateSettings={estateSettings}
          currentResident={currentResident}
          onNavigate={(tab) => {
            if (tab === 'resident_portal') {
              const active = currentResident || residentSessionService.getCurrentResident();
              if (!active) handleOpenResidentLogin('login');
            }
            navigateTo(tab);
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 6. PUBLIC ROUTE: RESIDENT PORTAL / LOGIN / ACTIVATION
  // ----------------------------------------------------
  if (currentTab === 'login') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <ResidentLoginView
          isModal={false}
          estateSettings={estateSettings}
          onNavigateToHome={() => navigateTo('home')}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  if (currentTab === 'resident_portal') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        {currentResident ? (
          <ResidentDashboardView
            currentResident={currentResident}
            onLogout={() => {
              residentSessionService.logoutResident();
              setCurrentResident(null);
              showToast('Signed out of resident portal', 'info');
              navigateTo('home');
            }}
            onSwitchResident={() => setIsResidentLoginOpen(true)}
            onNavigateToVerifyReceipt={(recNum) => {
              if (recNum) setReceiptToVerify(recNum);
              navigateTo('verify_receipt');
            }}
            onNavigateToHome={() => navigateTo('home')}
            onNavigateToRoadProject={() => navigateTo('road_project')}
            onNavigateToSecurity={() => navigateTo('security_public')}
            estateSettings={estateSettings}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 font-sans">
            <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl max-w-md w-full text-center space-y-5 border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Resident Portal Sign In</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sign in with your Resident Number and Phone Number to access your security levy dashboard and gate clearance.
                </p>
              </div>
              <button
                onClick={() => setIsResidentLoginOpen(true)}
                className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-sm hover:shadow cursor-pointer"
              >
                Sign In to Resident Portal
              </button>
              <button
                onClick={() => navigateTo('home')}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline block mx-auto cursor-pointer"
              >
                Return to Public Homepage
              </button>
            </div>
          </div>
        )}

        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => {
            setIsResidentLoginOpen(false);
            if (!currentResident) navigateTo('home');
          }}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            setIsResidentLoginOpen(false);
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 7. PUBLIC ROUTE: ANNOUNCEMENTS
  // ----------------------------------------------------
  if (currentTab === 'public_announcements') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicAnnouncementsView
          estateSettings={estateSettings}
          onSelectAnnouncement={(slug) => {
            setSelectedNoticeSlug(slug);
            navigateTo('announcement_detail', slug);
          }}
          onNavigateHome={() => navigateTo('home')}
          onNavigateToSecurity={() => navigateTo('security_public')}
          onNavigateToRoadProject={() => navigateTo('road_project')}
          onNavigateToVerifyReceipt={() => navigateTo('verify_receipt')}
          onOpenResidentLogin={handleOpenResidentLogin}
          onOpenPayLevy={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  if (currentTab === 'announcement_detail') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <AnnouncementDetailView
          slug={selectedNoticeSlug}
          estateSettings={estateSettings}
          onBackToAnnouncements={() => navigateTo('public_announcements')}
          onNavigateHome={() => navigateTo('home')}
          onNavigateToRoadProject={() => navigateTo('road_project')}
          onNavigateToSecurity={() => navigateTo('security_public')}
          onNavigateToVerifyReceipt={() => navigateTo('verify_receipt')}
          onOpenResidentLogin={handleOpenResidentLogin}
          onOpenPayLevy={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 8. PUBLIC ROUTE: DOCUMENTS
  // ----------------------------------------------------
  if (currentTab === 'documents') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicDocumentsView
          estateSettings={estateSettings}
          currentResident={currentResident}
          onNavigate={(tab) => {
            if (tab === 'resident_portal') {
              const active = currentResident || residentSessionService.getCurrentResident();
              if (!active) handleOpenResidentLogin('login');
            }
            navigateTo(tab);
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 9. PUBLIC ROUTE: CONTACT / SUPPORT
  // ----------------------------------------------------
  if (currentTab === 'contact') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <PublicContactView
          estateSettings={estateSettings}
          currentResident={currentResident}
          onNavigate={(tab) => {
            if (tab === 'resident_portal') {
              const active = currentResident || residentSessionService.getCurrentResident();
              if (!active) handleOpenResidentLogin('login');
            }
            navigateTo(tab);
          }}
          onOpenResidentLogin={handleOpenResidentLogin}
        />
        <ResidentLoginModal
          isOpen={isResidentLoginOpen}
          initialTab={residentLoginInitialTab}
          onClose={() => setIsResidentLoginOpen(false)}
          onSuccess={(res) => {
            setCurrentResident(res);
            residentSessionService.setCurrentResident(res);
            showToast(`Welcome, ${res.full_name}!`, 'success');
            navigateTo('resident_portal');
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 10. PUBLIC ROUTE: VERIFY STAMPED RECEIPT
  // ----------------------------------------------------
  if (currentTab === 'verify_receipt') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <ReceiptVerificationView
          initialReceiptNumber={receiptToVerify}
          onNavigateToPortal={() => {
            const active = currentResident || residentSessionService.getCurrentResident();
            if (!active) handleOpenResidentLogin('login');
            navigateTo('resident_portal');
          }}
          onNavigateToHome={() => navigateTo('home')}
          onNavigateToRoadProject={() => navigateTo('road_project')}
          onNavigateToSecurity={() => navigateTo('security_public')}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 11. 404 NOT FOUND PAGE
  // ----------------------------------------------------
  if (currentTab === 'not_found') {
    return (
      <div className="min-h-screen bg-slate-50">
        {renderToast()}
        <NotFoundView
          estateSettings={estateSettings}
          onNavigateHome={() => navigateTo('home')}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // 12. PRIVATE PROTECTED ADMINISTRATOR ROUTE
  // ----------------------------------------------------
  // If user is accessing an admin tab but NOT authenticated as admin:
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-950">
        {renderToast()}
        <AdminLoginPage
          estateSettings={estateSettings}
          onAuthenticated={handleAdminAuthenticated}
          onNavigateHome={() => navigateTo('home')}
        />
      </div>
    );
  }

  // When properly authenticated as admin: render Admin Management Dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {renderToast()}

      {/* Main Admin Layout Container */}
      <div className="flex-1 flex">
        {/* Admin Sidebar */}
        <AdminSidebar
          currentTab={currentTab}
          onSelectTab={handleSelectAdminTab}
          estateSettings={estateSettings}
          adminUser={adminUser}
          onOpenAuth={() => navigateTo('admin_login')}
          onLogout={handleAdminLogout}
          residentCount={residents.length}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Admin Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <AdminHeader
            currentTab={currentTab}
            estateSettings={estateSettings}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onAddResident={handleOpenAddResident}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentTab === 'dashboard' && (
              <AdvancedManagementDashboard
                residents={residents}
                estateSettings={estateSettings}
                activityLogs={activityLogs}
                onNavigate={handleSelectAdminTab}
                onAddResident={handleOpenAddResident}
                onViewResident={handleOpenViewResident}
                onOpenSqlModal={() => {}}
              />
            )}

            {currentTab === 'gate_security' && (
              <GateSecurityDashboard
                estateSettings={estateSettings}
                adminUser={adminUser}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'security_ops' && (
              <SecurityOperationsView
                estateSettings={estateSettings}
                adminUser={adminUser}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'residents' && (
              viewingResidentProfile ? (
                <ResidentProfileView
                  resident={viewingResidentProfile}
                  estateSettings={estateSettings}
                  onBack={() => setViewingResidentProfile(null)}
                  onEdit={handleOpenEditResident}
                  onToggleStatus={handleToggleStatus}
                />
              ) : (
                <ResidentList
                  residents={residents}
                  estateSettings={estateSettings}
                  onAddResident={handleOpenAddResident}
                  onEditResident={handleOpenEditResident}
                  onViewResident={handleOpenViewResident}
                  onToggleStatus={handleToggleStatus}
                  loading={loading}
                />
              )
            )}

            {currentTab === 'paid_residents' && (
              <PaidResidentsView
                estateSettings={estateSettings}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'unpaid_residents' && (
              <UnpaidResidentsView
                estateSettings={estateSettings}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'outstanding' && (
              <OutstandingPaymentsView
                estateSettings={estateSettings}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                estateSettings={estateSettings}
                onNavigateToResident={(resNum) => {
                  const target = residents.find(r => r.resident_number === resNum);
                  if (target) {
                    setViewingResidentProfile(target);
                    navigateTo('residents');
                  }
                }}
              />
            )}

            {currentTab === 'road_project_admin' && (
              <RoadProjectAdminView
                estateSettings={estateSettings}
                onNavigateToDashboard={() => navigateTo('dashboard')}
              />
            )}

            {currentTab === 'reports' && (
              <FinancialReportsView
                estateSettings={estateSettings}
              />
            )}

            {currentTab === 'sms' && (
              <SMSDashboardView
                residents={residents}
                onSelectResident={(res) => {
                  setViewingResidentProfile(res);
                  navigateTo('residents');
                }}
              />
            )}

            {currentTab === 'announcements' && (
              <AnnouncementsView
                adminUser={adminUser}
                estateSettings={estateSettings}
                onPreviewPublic={(slug) => {
                  setSelectedNoticeSlug(slug);
                  navigateTo('announcement_detail', slug);
                }}
              />
            )}

            {currentTab === 'settings' && (
              <EstateSettingsView
                settings={estateSettings}
                onSettingsUpdated={handleSettingsUpdated}
                adminEmail={adminUser?.email || 'admin@fingerofgodestate.ng'}
                onOpenSqlModal={() => {}}
              />
            )}

            {currentTab === 'logs' && (
              <ActivityLogsView logs={activityLogs} />
            )}
          </main>
        </div>
      </div>

      {/* Admin Resident Form Modal (Add / Edit) */}
      <ResidentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleResidentSaved}
        residentToEdit={residentToEdit}
        adminEmail={adminUser?.email || 'admin@fingerofgodestate.ng'}
      />

      {/* Admin Resident Detail Modal */}
      <ResidentDetailModal
        resident={residentToView}
        estateSettings={estateSettings}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleOpenEditResident}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
