import React from 'react';
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
          <div className="font-semibold px-4 flex items-center gap-3">
            <span className="text-base tracking-wide font-bold">Kutumb Setu Gujarat</span>
            <span className="bg-white/10 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-medium border border-white/20">
              સંકલિત કુટુંબ પોર્ટલ
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
