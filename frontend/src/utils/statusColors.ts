export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export const getStatusLabel = (status?: string): string => {
  if (!status) return 'Unknown';
  switch (status.toLowerCase()) {
    case 'pending_admin_review':
    case 'pending_review':
      return 'Pending Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'action_assigned':
      return 'Action Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
    case 'resolved':
      return 'Completed';
    case 'overdue':
      return 'Overdue';
    case 'active':
      return 'Active';
    case 'on_hold':
      return 'On Hold';
    case 'archived':
      return 'Archived';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const getStatusBadgeClass = (status?: string): string => {
  if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
  switch (status.toLowerCase()) {
    case 'pending_admin_review':
    case 'pending_review':
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    case 'approved':
    case 'completed':
    case 'resolved':
    case 'pass':
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    case 'rejected':
    case 'fail':
    case 'critical':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
    case 'action_assigned':
    case 'in_progress':
      return 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    case 'overdue':
      return 'bg-red-50 text-red-800 border-red-300 font-semibold';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};
