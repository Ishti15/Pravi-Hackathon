import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

export default function MatchStrengthBadge({ strength }) {
  switch (strength) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          <ShieldCheck size={13} className="text-purple-600" />
          Verified ID Token
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck size={13} className="text-emerald-600" />
          High Confidence
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <ShieldAlert size={13} className="text-amber-600" />
          Medium Confidence (Review Required)
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <Shield size={13} className="text-red-600" />
          Low Confidence
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          Unranked
        </span>
      );
  }
}
