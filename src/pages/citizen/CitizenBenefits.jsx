import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDemoSession } from '../../session/DemoSessionContext';
import { schemeService } from '../../services/schemeService';
import { familyService } from '../../services/familyService';
import { deriveApplicationRoute } from '../../lib/applicationRoute';
import PageHeader from '../../components/PageHeader';
import ApplicationRouteChip from '../../components/ApplicationRouteChip';
import ReasonList from '../../components/ReasonList';
import { ChevronRight, Filter } from 'lucide-react';

export default function CitizenBenefits() {
  const { session } = useDemoSession();
  const [activeTab, setActiveTab] = useState('family');
  const [family, setFamily] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [eligibilityMap, setEligibilityMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [session]);

  async function loadData() {
    try {
      const familyProfile = await familyService.getFamilyByMemberId(session.personId);
      if (familyProfile) {
        setFamily(familyProfile);

        const [allSchemes, allEval] = await Promise.all([
          schemeService.getSchemes(),
          schemeService.getEligibilityResults({ familyId: familyProfile.family_id })
        ]);

        setSchemes(allSchemes);

        const eMap = {};
        allEval.forEach(res => {
          eMap[`${res.subject_id}_${res.scheme_code}`] = res;
        });
        setEligibilityMap(eMap);
      }
    } catch (err) {
      console.error('Failed to load benefits:', err);
    } finally {
      setLoading(false);
    }
  }

  const familySchemes = schemes.filter(s => s.scope === 'FAMILY');
  const individualSchemes = schemes.filter(s => s.scope === 'INDIVIDUAL');

  const renderSchemeCard = (scheme, targetId, targetName = null) => {
    const evalRes = eligibilityMap[`${targetId}_${scheme.scheme_code}`];
    const status = evalRes?.status || 'NOT_ELIGIBLE';
    const routeInfo = deriveApplicationRoute(
      scheme,
      status,
      evalRes?.missing_information || []
    );

    return (
      <div key={`${scheme.scheme_code}_${targetId}`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {scheme.department}
            </span>
            <ApplicationRouteChip route={routeInfo.route} />
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {scheme.name}
            </h4>
            {targetName && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">For: {targetName}</span>
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
              {scheme.benefit_description || scheme.description}
            </p>
          </div>

          {/* Eligibility Badge */}
          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
             <div className="flex items-center justify-between text-xs font-semibold mb-2">
               <span className="text-gray-600">Eligibility Status</span>
               <span className={`px-2 py-0.5 rounded border ${
                  status === 'ELIGIBLE' ? 'bg-green-50 text-green-700 border-green-200' :
                  status === 'POTENTIALLY_ELIGIBLE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  status === 'ENROLLED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-red-50 text-red-700 border-red-200'
               }`}>
                 {status.replace('_', ' ')}
               </span>
             </div>
             {evalRes?.reasons && (
               <div className="mt-2 text-xs">
                 <ReasonList reasons={evalRes.reasons} />
               </div>
             )}
          </div>
        </div>

        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end">
          {routeInfo.route !== 'NONE' && (
            <Link
              to={`/citizen/apply/${scheme.scheme_code}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary px-4 py-2 rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
            >
              <span>Apply Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Scheme Benefits" 
        description="Check your eligibility for family-level and individual-level schemes." 
      />

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading benefits...</div>
      ) : (
        <>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('family')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'family' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Family Schemes
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'individual' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Individual Schemes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'family' && (
              familySchemes.map(scheme => renderSchemeCard(scheme, family?.family_id))
            )}
            
            {activeTab === 'individual' && family?.members?.length > 0 && (
              individualSchemes.flatMap(scheme => 
                family.members.map(member => 
                  renderSchemeCard(scheme, member.person_id, member.canonical_name)
                )
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
