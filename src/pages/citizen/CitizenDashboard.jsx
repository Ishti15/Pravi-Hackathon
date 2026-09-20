import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDemoSession } from '../../session/DemoSessionContext';
import { familyService } from '../../services/familyService';
import { schemeService } from '../../services/schemeService';
import { applicationService } from '../../services/applicationService';
import PageHeader from '../../components/PageHeader';
import { ShieldCheck, Users, Activity, FileText, ChevronRight } from 'lucide-react';

export default function CitizenDashboard() {
  const { session } = useDemoSession();
  const [family, setFamily] = useState(null);
  const [stats, setStats] = useState({ schemes: 0, apps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [session]);

  async function loadDashboard() {
    try {
      const familyProfile = await familyService.getFamilyByMemberId(session.userId);
      if (familyProfile) {
        const fullProfile = await familyService.getFamily(familyProfile.family_id);
        setFamily(fullProfile);

        const [allSchemes, allApps] = await Promise.all([
          schemeService.getSchemes(),
          applicationService.getApplications({ familyId: fullProfile.family_id })
        ]);

        setStats({ schemes: allSchemes.length, apps: allApps.length });
      }
    } catch (err) {
      console.error('Failed to load citizen dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Citizen Services Portal" 
        description="Welcome to Kutumb Setu Gujarat. Manage your family profile and scheme benefits." 
      />

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading citizen profile...</div>
      ) : (
        <>
          {/* Family ID Header Summary */}
          {family && (
            <div className="bg-gradient-to-r from-[#1F3A5F] to-[#152842] text-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified Gujarat Family ID</span>
                </div>
                <h2 className="text-2xl font-bold font-mono tracking-tight mt-1">{family.family_id}</h2>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                  <span>Ration Card: <strong className="font-mono text-white">{family.household_ref || 'N/A'}</strong></span>
                  <span>?</span>
                  <span>District: <strong className="text-white">{family.district}</strong></span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-white/20 text-xs">
                <span className="text-slate-300 block">Annual Household Income</span>
                <span className="text-base font-bold text-white">
                  ,1{Number(family.household_income || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/citizen/family" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Users size={24} />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">My Family</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">{family?.members?.length || 0} Registered Members</p>
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>View Profile & Matrix</span>
                <ChevronRight size={16} />
              </div>
            </Link>

            <Link to="/citizen/benefits" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <Activity size={24} />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">Benefits</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">{stats.schemes} Available Schemes</p>
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>Check Eligibility</span>
                <ChevronRight size={16} />
              </div>
            </Link>

            <Link to="/citizen/applications" className="bg-white border border-slate-200 p-5 rounded-xl hover:border-primary hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                  <FileText size={24} />
                </div>
                <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">Applications</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">{stats.apps} Submitted Applications</p>
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>Track Status</span>
                <ChevronRight size={16} />
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
