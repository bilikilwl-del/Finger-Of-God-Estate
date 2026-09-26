import React from 'react';
import { Resident, EstateSettings } from '../../types/database';
import { ResidentLoginView } from './ResidentLoginView';

interface ResidentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resident: Resident) => void;
  estateSettings?: EstateSettings;
  initialTab?: 'login' | 'activate' | 'forgot';
}

export const ResidentLoginModal: React.FC<ResidentLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  estateSettings,
  initialTab = 'login'
}) => {
  if (!isOpen) return null;

  return (
    <ResidentLoginView
      isModal={true}
      onCloseModal={onClose}
      onSuccess={onSuccess}
      estateSettings={estateSettings}
      initialTab={initialTab}
    />
  );
};
