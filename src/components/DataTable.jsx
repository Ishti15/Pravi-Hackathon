import React from 'react';
import EmptyState from './EmptyState';
export default function DataTable({ columns, data, keyField = 'id', emptyMessage = "No records found", emptyIcon }) {
  if (!data || data.length === 0) return <EmptyState message={emptyMessage} icon={emptyIcon} />;
  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
            <tr>{columns.map((col, i) => <th key={i} className="px-4 py-3 tracking-wider">{col.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row[keyField]} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className="px-4 py-3 text-gray-800">
                    {col.render ? col.render(row) : row[col.field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
