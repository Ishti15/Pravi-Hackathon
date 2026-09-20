const fs = require('fs');
const path = require('path');

const dirs = [
  'src/session',
  'src/components',
  'src/pages/public',
  'src/pages/citizen',
  'src/pages/officer',
  'src/pages/admin',
];

dirs.forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

const files = {
  'src/session/DemoSessionContext.jsx': `import React, { createContext, useContext, useState, useEffect } from 'react';
const DemoSessionContext = createContext();
export function DemoSessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('demo_session');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (session) {
      localStorage.setItem('demo_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('demo_session');
    }
  }, [session]);
  const login = (role, personId = null) => setSession({ role, personId });
  const logout = () => setSession(null);
  return (
    <DemoSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </DemoSessionContext.Provider>
  );
}
export const useDemoSession = () => useContext(DemoSessionContext);
`,

  'src/App.jsx': `import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoSessionProvider, useDemoSession } from './session/DemoSessionContext';
import AppShell from './components/AppShell';
import Landing from './pages/public/Landing';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session } = useDemoSession();
  if (!session) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <DemoSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Landing />} />
          
          <Route element={<AppShell />}>
            <Route path="/citizen/*" element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Routes>
                  <Route path="dashboard" element={<CitizenDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
            <Route path="/officer/*" element={
              <ProtectedRoute allowedRoles={['officer']}>
                <Routes>
                  <Route path="dashboard" element={<OfficerDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </DemoSessionProvider>
  );
}
`,

  'src/components/AppShell.jsx': `import React from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useDemoSession } from '../session/DemoSessionContext';
import Sidebar from './Sidebar';
import { LogOut } from 'lucide-react';

export default function AppShell() {
  const { session, logout } = useDemoSession();
  const navigate = useNavigate();

  if (!session) return <Navigate to="/" replace />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900 font-sans">
      <Sidebar role={session.role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-primary text-white p-2 flex justify-between items-center text-sm shadow-md z-10 relative">
          <div className="font-semibold px-4 flex items-center gap-2">
            <span>Family ID Gujarat</span>
            <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
              Prototype — synthetic data only. Not an official Government of Gujarat service.
            </span>
          </div>
          <div className="flex items-center gap-4 px-4">
            <span className="opacity-80">Demo session: {session.role.toUpperCase()}</span>
            <button onClick={handleLogout} className="hover:text-accent flex items-center gap-1 transition-colors font-medium">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
`,

  'src/components/Sidebar.jsx': `import React from 'react';
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
        <h2 className="text-xl font-bold text-primary tracking-tight">Family ID</h2>
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
                \`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all \${
                  isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }\`
              }
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
`,

  'src/pages/public/Landing.jsx': `import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../../session/DemoSessionContext';
import { User, Shield, Settings } from 'lucide-react';

export default function Landing() {
  const { login } = useDemoSession();
  const navigate = useNavigate();

  const handleLogin = (role, personId = null) => {
    login(role, personId);
    navigate(\`/\${role}/dashboard\`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">Family ID Gujarat</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
            Unified Family Beneficiary Management Platform
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg inline-block max-w-3xl text-sm font-medium shadow-sm">
            <strong>Prototype (6-hour build) — Synthetic data only.</strong> Not an official Government of Gujarat service and not connected to UIDAI or any real government system.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
          <button onClick={() => handleLogin('citizen', 'P000001')} className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col items-center text-center group">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <User size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Citizen</h3>
            <p className="text-sm text-gray-500 font-medium">Log in as Rameshbhai Patel to view family benefits and apply for schemes.</p>
          </button>
          <button onClick={() => handleLogin('officer')} className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col items-center text-center group">
            <div className="bg-emerald-50 p-4 rounded-full text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Officer</h3>
            <p className="text-sm text-gray-500 font-medium">Manage families, review applications, and identify benefit gaps.</p>
          </button>
          <button onClick={() => handleLogin('admin')} className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 flex flex-col items-center text-center group">
            <div className="bg-purple-50 p-4 rounded-full text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <Settings size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Administrator</h3>
            <p className="text-sm text-gray-500 font-medium">Ingest department data, view system stats, and configure schemes.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
`,

  'src/components/PageHeader.jsx': `import React from 'react';
export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
`,

  'src/components/StatCard.jsx': `import React from 'react';
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
`,

  'src/components/StatusBadge.jsx': `import React from 'react';
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
`,

  'src/components/DataTable.jsx': `import React from 'react';
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
`,

  'src/components/EmptyState.jsx': `import React from 'react';
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
`,

  'src/pages/citizen/CitizenDashboard.jsx': `import React from 'react';
import PageHeader from '../../components/PageHeader';
import { useDemoSession } from '../../session/DemoSessionContext';
export default function CitizenDashboard() {
  const { session } = useDemoSession();
  return (
    <div>
      <PageHeader title="Citizen Dashboard" description={\`Welcome, viewing data for person \${session.personId || 'Unknown'}\`} />
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-600">This is a placeholder for the Citizen dashboard.</p>
      </div>
    </div>
  );
}
`,

  'src/pages/officer/OfficerDashboard.jsx': `import React from 'react';
import PageHeader from '../../components/PageHeader';
export default function OfficerDashboard() {
  return (
    <div>
      <PageHeader title="Officer Dashboard" description="Overview of families, beneficiaries, and system status" />
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-600">This is a placeholder for the Officer dashboard.</p>
      </div>
    </div>
  );
}
`,

  'src/pages/admin/AdminDashboard.jsx': `import React from 'react';
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
`,

  'vitest.config.js': `import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
`,

  'src/App.test.jsx': `import { describe, it, expect } from 'vitest';
describe('App', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });
});
`,

  'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(__dirname, filepath), content);
}
console.log('Done scaffolding Task 1 files.');
