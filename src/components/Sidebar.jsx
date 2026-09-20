import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Database, Activity } from 'lucide-react';

export default function Sidebar({ role }) {
  const getNavItems = () => {
    switch(role) {
      case 'citizen':
        return [
          { name: 'Dashboard', to: '/citizen/dashboard', icon: LayoutDashboard },
          { name: 'Family Profile', to: '/citizen/family', icon: Users },
          { name: 'Benefits', to: '/citizen/benefits', icon: Activity },
          { name: 'Applications', to: '/citizen/applications', icon: FileText },
        ];
      case 'officer':
        return [
          { name: 'Dashboard', to: '/officer/dashboard', icon: LayoutDashboard },
          { name: 'Families', to: '/officer/families', icon: Users },
          { name: 'Benefit Gaps', to: '/officer/benefit-gaps', icon: Activity },
          { name: 'Scheme Coverage', to: '/officer/scheme-coverage', icon: Activity },
          { name: 'Applications', to: '/officer/applications', icon: FileText },
          { name: 'Identity Review', to: '/officer/identity-review', icon: Users },
        ];
      case 'admin':
        return [
          { name: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Data Ingestion', to: '/admin/data-ingestion', icon: Database },
          { name: 'Schemes', to: '/admin/schemes', icon: FileText },
        ];
      default: return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm z-20">
      <div className="p-4 border-b border-gray-100 mb-2 bg-gray-50/50">
        <h2 className="text-xl font-bold text-primary tracking-tight">Kutumb Setu</h2>
        <p className="text-xs text-gray-500 uppercase font-semibold mt-1 tracking-wider">{role} Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
