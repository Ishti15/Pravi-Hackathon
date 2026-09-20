import React from 'react';
import PageHeader from '../../components/PageHeader';
export default function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Administrator Dashboard" description="System metrics and data management" />
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-600">This is a placeholder for the Admin dashboard.</p>
      </div>
    </div>
  );
}
