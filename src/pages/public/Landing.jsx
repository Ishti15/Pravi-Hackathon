import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoSession } from '../../session/DemoSessionContext';
import { User, Shield, Settings } from 'lucide-react';

export default function Landing() {
  const { login } = useDemoSession();
  const navigate = useNavigate();

  const handleLogin = (role, personId = null) => {
    login(role, personId);
    navigate(`/${role}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold tracking-wide uppercase">
            Government of Gujarat Initiative
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight">Kutumb Setu Gujarat</h1>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            કુટુંબ સેતુ — એકીકૃત કુટુંબ લાભાર્થી વ્યવસ્થાપન પોર્ટલ
          </p>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto font-normal">
            Unified Family Beneficiary Discovery, Management & Entitlement Platform
          </p>
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
