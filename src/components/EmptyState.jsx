import React from 'react';
import { Inbox } from 'lucide-react';
export default function EmptyState({ title = "No data", message = "Nothing to display here right now.", icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 border-dashed text-center">
      <div className="text-gray-400 mb-3"><Icon size={48} strokeWidth={1} /></div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
