import React from 'react';
import clsx from 'clsx';
export default function StatCard({ title, value, icon: Icon, color = 'blue', trend }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
      {Icon && (
        <div className={clsx("p-3 rounded-lg", colorMap[color] || colorMap.blue)}>
          <Icon size={24} />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
      </div>
    </div>
  );
}
