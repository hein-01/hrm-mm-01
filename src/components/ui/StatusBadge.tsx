import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-100' },
  Approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  Rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  Active: { label: 'Active', color: 'text-blue-700', bg: 'bg-blue-100' },
  Completed: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-100' },
  Draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-200' },
  Disbursed: { label: 'Disbursed', color: 'text-purple-700', bg: 'bg-purple-100' },
  Paid: { label: 'Paid', color: 'text-green-700', bg: 'bg-green-100' },
  Overdue: { label: 'Overdue', color: 'text-red-800', bg: 'bg-red-200' },
  'In Progress': { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  'Pending Docs': { label: 'Pending Docs', color: 'text-orange-600', bg: 'bg-orange-50' },
  Orientation: { label: 'Orientation', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  Expiring: { label: 'Expiring Soon', color: 'text-amber-600', bg: 'bg-amber-50' },
  Expired: { label: 'Expired', color: 'text-red-600', bg: 'bg-red-50' },
  Resolved: { label: 'Resolved', color: 'text-green-600', bg: 'bg-green-50' },
  Published: { label: 'Published', color: 'text-teal-600', bg: 'bg-teal-50' },
  Acknowledged: { label: 'Acknowledged', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  Processed: { label: 'Processed', color: 'text-violet-600', bg: 'bg-violet-50' },
  Present: { label: 'Present', color: 'text-green-600', bg: 'bg-green-100' },
  Late: { label: 'Late', color: 'text-orange-600', bg: 'bg-orange-100' },
  'Missing Out': { label: 'Missing Out', color: 'text-red-600', bg: 'bg-red-100' },
  'On Leave': { label: 'On Leave', color: 'text-blue-500', bg: 'bg-blue-100' },
  'Pending Approval': { label: 'Pending Approval', color: 'text-amber-600', bg: 'bg-amber-50' },
  Terminated: { label: 'Terminated', color: 'text-red-800', bg: 'bg-red-200' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const config = STATUS_CONFIG[normalizedStatus] || { label: status, color: 'text-slate-600', bg: 'bg-slate-100' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg} ${className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
