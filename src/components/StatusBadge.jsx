import React from 'react';
import clsx from 'clsx';
export default function StatusBadge({ status, text }) {
  const colorMap = {
    ELIGIBLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ENROLLED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    POTENTIALLY_ELIGIBLE: 'bg-amber-100 text-amber-800 border-amber-200',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    PENDING_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    RENEWAL_DUE: 'bg-amber-100 text-amber-800 border-amber-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    NOT_ELIGIBLE: 'bg-red-100 text-red-800 border-red-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CONFLICT: 'bg-red-100 text-red-800 border-red-200',
    GAP: 'bg-red-100 text-red-800 border-red-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
    STARTED: 'bg-blue-100 text-blue-800 border-blue-200',
    UNDER_VERIFICATION: 'bg-blue-100 text-blue-800 border-blue-200',
    HIGH: 'bg-blue-100 text-blue-800 border-blue-200',
    UNKNOWN: 'bg-gray-100 text-gray-800 border-gray-200',
    UNVERIFIED: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  const style = colorMap[status] || colorMap.UNKNOWN;
  const display = text || status.replace(/_/g, ' ');
  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center", style)}>
      {display}
    </span>
  );
}
