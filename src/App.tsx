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
  isSupabaseConfigured 
} from './lib/supabase';

import { AdminSidebar } from './components/layout/AdminSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ResidentList } from './components/residents/ResidentList';
import { ResidentFormModal } from './components/residents/ResidentFormModal';
import { ResidentDetailModal } from './components/residents/ResidentDetailModal';
import { EstateSettingsView } from './components/settings/EstateSettingsView';
import { ActivityLogsView } from './components/activity/ActivityLogsView';
import { StagePlaceholderView } from './components/placeholders/StagePlaceholderView';
import { SupabaseSetupModal } from './components/setup/SupabaseSetupModal';
import { AuthModal } from './components/auth/AuthModal';

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State
  const [residents, setResidents] = useState<Resident[]>([]);
  const [estateSettings, setEstateSettings] = useState<EstateSettings>({
    id: 'default',
    estate_name: 'Palm Grove Residential Estate',
    estate_address: 'Plot 10-14, Security Gate Avenue, Phase 2',
    estate_state: 'Lagos',
    estate_lga: 'Eti-Osa',
    monthly_security_levy: 5000,
    payment_due_day: 1,
    currency: 'NGN',
    contact_phone: '08023456789',
    contact_email: 'security-admin@palmgroveestate.ng',
    sms_sender_name: 'PALMGROVE',
    first_payment_month: 'October 2026'
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin User State
  const [adminUser, setAdminUser] = useState<any>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<Resident | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [residentToView, setResidentToView] = useState<Resident | null>(null);

  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Initial Load
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
      } catch (err) {
        console.error('Failed to initialize app data:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Handlers for Resident Operations
  const handleOpenAddResident = () => {
    setResidentToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditResident = (resident: Resident) => {
    setResidentToEdit(resident);
    setIsFormModalOpen(true);
  };

  const handleOpenViewResident = (resident: Resident) => {
    setResidentToView(resident);
    setIsDetailModalOpen(true);
  };

  const handleResidentSaved = async (savedResident: Resident) => {
    // Refresh list and activity logs
    const [updatedList, updatedLogs] = await Promise.all([
      dbService.getResidents(),
      dbService.getActivityLogs()
    ]);
    setResidents(updatedList);
    setActivityLogs(updatedLogs);

    // If detail modal is open for this resident, update view
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

  const handleLogout = async () => {
    await authService.logout();
    setAdminUser(null);
    showToast('Signed out of administrative console.', 'info');
    const logs = await dbService.getActivityLogs();
    setActivityLogs(logs);
  };

  const handleAuthenticated = async (user: any) => {
    setAdminUser(user);
    showToast(`Welcome, ${user.full_name || user.email}!`, 'success');
    const logs = await dbService.getActivityLogs();
    setActivityLogs(logs);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Toast Notification */}
      {toast && (
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
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <AdminSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          estateSettings={estateSettings}
          adminUser={adminUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
          residentCount={residents.length}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          {/* Top Bar Header */}
          <AdminHeader
            currentTab={currentTab}
            estateSettings={estateSettings}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onAddResident={handleOpenAddResident}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />

          {/* Main View Port */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardOverview
                residents={residents}
                estateSettings={estateSettings}
                activityLogs={activityLogs}
                onNavigate={setCurrentTab}
                onAddResident={handleOpenAddResident}
                onViewResident={handleOpenViewResident}
                onOpenSqlModal={() => setIsSqlModalOpen(true)}
              />
            )}

            {currentTab === 'residents' && (
              <ResidentList
                residents={residents}
                estateSettings={estateSettings}
                onAddResident={handleOpenAddResident}
                onEditResident={handleOpenEditResident}
                onViewResident={handleOpenViewResident}
                onToggleStatus={handleToggleStatus}
                loading={loading}
              />
            )}

            {currentTab === 'settings' && (
              <EstateSettingsView
                settings={estateSettings}
                onSettingsUpdated={handleSettingsUpdated}
                adminEmail={adminUser?.email || 'admin'}
              />
            )}

            {currentTab === 'logs' && (
              <ActivityLogsView logs={activityLogs} />
            )}

            {['payments', 'outstanding', 'sms', 'reports', 'announcements', 'admins'].includes(currentTab) && (
              <StagePlaceholderView
                tab={currentTab}
                estateSettings={estateSettings}
                onOpenSqlModal={() => setIsSqlModalOpen(true)}
                onNavigateToResidents={() => setCurrentTab('residents')}
              />
            )}
          </main>
        </div>
      </div>

      {/* Resident Form Modal (Add / Edit) */}
      <ResidentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaved={handleResidentSaved}
        residentToEdit={residentToEdit}
        adminEmail={adminUser?.email || 'admin@palmgroveestate.ng'}
      />

      {/* Resident Detail & Security Badge Modal */}
      <ResidentDetailModal
        resident={residentToView}
        estateSettings={estateSettings}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleOpenEditResident}
        onToggleStatus={handleToggleStatus}
      />

      {/* Supabase Schema & Architecture Modal */}
      <SupabaseSetupModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}
