import React from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { APPLICATION_ROUTES, ROUTE_LABELS } from '../lib/applicationRoute';

export default function ApplicationRouteChip({ route, showIcon = true, size = 'md' }) {
  const sizeClasses = size === 'sm' 
    ? 'text-3xs px-2 py-0.5 gap-1' 
    : 'text-2xs px-2.5 py-1 gap-1.5';

  const iconSize = size === 'sm' ? 10 : 12;

  switch (route) {
    case APPLICATION_ROUTES.APPLY_HERE:
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          {showIcon && <CheckCircle2 size={iconSize} className="text-emerald-600 shrink-0" />}
          {ROUTE_LABELS[APPLICATION_ROUTES.APPLY_HERE]}
        </span>
      );

    case APPLICATION_ROUTES.ADDITIONAL_INFO_REQUIRED:
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
          {showIcon && <AlertTriangle size={iconSize} className="text-amber-600 shrink-0" />}
          {ROUTE_LABELS[APPLICATION_ROUTES.ADDITIONAL_INFO_REQUIRED]}
        </span>
      );

    case APPLICATION_ROUTES.EXTERNAL_PORTAL:
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          {showIcon && <ExternalLink size={iconSize} className="text-blue-600 shrink-0" />}
          {ROUTE_LABELS[APPLICATION_ROUTES.EXTERNAL_PORTAL]}
        </span>
      );

    case APPLICATION_ROUTES.NONE:
    default:
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-gray-100 text-gray-500 border border-gray-200 ${sizeClasses}`}>
          {showIcon && <XCircle size={iconSize} className="text-gray-400 shrink-0" />}
          {ROUTE_LABELS[APPLICATION_ROUTES.NONE]}
        </span>
      );
  }
}
