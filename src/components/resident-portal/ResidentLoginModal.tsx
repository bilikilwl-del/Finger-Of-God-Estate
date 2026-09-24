import React from 'react';
import { Resident, EstateSettings } from '../../types/database';
import { ResidentLoginView } from './ResidentLoginView';

interface ResidentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (resident: Resident) => void;
  estateSettings?: EstateSettings;
}

export const ResidentLoginModal: React.FC<ResidentLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  estateSettings
}) => {
  if (!isOpen) return null;

  return (
    <ResidentLoginView
      isModal={true}
      onCloseModal={onClose}
      onSuccess={onSuccess}
      estateSettings={estateSettings}
    />
  );
};
