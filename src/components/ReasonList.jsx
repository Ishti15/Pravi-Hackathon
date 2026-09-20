import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReasonList({ reasons = [] }) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <ul className="space-y-1.5 text-xs">
      {reasons.map((reason, idx) => {
        const isDiff = reason.toLowerCase().includes('differ') || reason.toLowerCase().includes('lack') || reason.toLowerCase().includes('conflict');
        return (
          <li key={idx} className="flex items-start gap-2">
            {isDiff ? (
              <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
            )}
            <span className={isDiff ? 'text-amber-900 font-medium' : 'text-gray-700'}>
              {reason}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
