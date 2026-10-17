import React from 'react';
import { Resident, EstateSettings, ActivityLog, NavigationTab } from '../../types/database';
import { DashboardOverview } from './DashboardOverview';

interface AdvancedManagementDashboardProps {
  residents: Resident[];
  estateSettings: EstateSettings;
  activityLogs: ActivityLog[];
  onNavigate: (tab: NavigationTab) => void;
  onAddResident: () => void;
  onViewResident: (resident: Resident) => void;
  onOpenSqlModal: () => void;
}

export const AdvancedManagementDashboard: React.FC<AdvancedManagementDashboardProps> = (props) => {
  return (
    <div className="space-y-6">
      <DashboardOverview {...props} />
    </div>
  );
};
