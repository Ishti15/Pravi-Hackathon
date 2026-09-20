import React, { useState, useEffect } from 'react';
import { useDemoSession } from '../../session/DemoSessionContext';
import { familyService } from '../../services/familyService';
import { schemeService } from '../../services/schemeService';
import PageHeader from '../../components/PageHeader';
import BenefitMatrix from '../../components/BenefitMatrix';
import { Users, ShieldCheck, User, Calendar, Briefcase, GraduationCap } from 'lucide-react';

export default function CitizenFamily() {
  const { session } = useDemoSession();
  const [family, setFamily] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamily();
  }, [session]);

  async function loadFamily() {
    try {
      const familyProfile = await familyService.getFamilyByMemberId(session.userId);
      if (familyProfile) {
        const fullProfile = await familyService.getFamily(familyProfile.family_id);
        setFamily(fullProfile);

        const [schemes, apps, evals] = await Promise.all([
          schemeService.getSchemes(),
          import('../../services/applicationService').then(m => m.applicationService.getApplications({ familyId: fullProfile.family_id })),
          schemeService.getEligibilityResults({ familyId: fullProfile.family_id })
        ]);

        setMatrixData({
          family: fullProfile,
          schemes,
          applications: apps,
          evaluations: evals
        });
      }
    } catch (err) {
      console.error('Failed to load family:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Family Profile" 
        description="View your unified family profile, members, and benefit matrix." 
      />

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading family data...</div>
      ) : (
        <>
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
                  <span>?</span>
                  <span>Members: <strong className="text-white">{family.members?.length || 0} Registered</strong></span>
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

          {matrixData && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Benefit Matrix</h3>
              <BenefitMatrix matrixData={matrixData} />
            </div>
          )}

          {family && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Family Members ({family.members?.length || 0})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {family.members?.map((m) => {
                  const isHead = m.relationship === 'HEAD';
                  return (
                    <div key={m.person_id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
                      <div className={`p-3 rounded-full shrink-0 ${isHead ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                        <User size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-base font-bold text-gray-900">{m.canonical_name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isHead ? 'bg-purple-100 text-purple-900 border-purple-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {m.relationship}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-gray-400 font-semibold mt-1">ID: {m.person_id}</div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1"><Calendar size={13} /> DOB: {m.dob || 'Missing'}</span>
                          <span>?</span>
                          <span>Gender: {m.gender || '?"'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
