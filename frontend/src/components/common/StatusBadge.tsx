import React from 'react';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/statusColors';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadgeClass(
        status
      )} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  );
};
