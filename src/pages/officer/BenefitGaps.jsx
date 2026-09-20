import React, { useState, useEffect, useCallback } from 'react';
import { schemeService } from '../../services/schemeService';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ReasonList from '../../components/ReasonList';
import ApplicationRouteChip from '../../components/ApplicationRouteChip';
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  ExternalLink,
  Users,
  Home
} from 'lucide-react';

const GUJARAT_DISTRICTS = [
  'ALL',
  'Gandhinagar',
  'Ahmedabad',
  'Mehsana',
  'Surat',
  'Vadodara',
  'Rajkot',
  'Sabarkantha'
];

export default function BenefitGaps() {
  const [gaps, setGaps] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedScheme, setSelectedScheme] = useState('ALL');
  const [actionLoading, setActionLoading] = useState({});

  const loadGaps = useCallback(async () => {
    setLoading(true);
    try {
      const allSchemes = await schemeService.getSchemes();
      setSchemes(allSchemes);

      const allGaps = await schemeService.getBenefitGaps({
        district: selectedDistrict !== 'ALL' ? selectedDistrict : null,
        schemeCode: selectedScheme !== 'ALL' ? selectedScheme : null
      });
      setGaps(allGaps);
    } catch (err) {
      console.error('Failed to load benefit gaps:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, selectedScheme]);

  useEffect(() => {
    loadGaps();
  }, [loadGaps]);

  const handleInitiateOutreach = async (gap) => {
    setActionLoading(prev => ({ ...prev, [gap.gap_id]: true }));
    try {
      await schemeService.initiateOutreach(gap.eligibility_id, 'Officer', 'Field Verification Officer');
      // Update local state
      setGaps(prev => prev.map(g => {
        if (g.gap_id === gap.gap_id) {
          return { ...g, outreach_status: 'NOTIFIED' };
        }
        return g;
      }));
    } catch (err) {
      console.error('Failed to initiate outreach:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [gap.gap_id]: false }));
    }
  };

  const filteredGaps = gaps.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (g.subject_name && g.subject_name.toLowerCase().includes(q)) ||
      (g.family_id && g.family_id.toLowerCase().includes(q)) ||
      (g.scheme_name && g.scheme_name.toLowerCase().includes(q)) ||
      (g.scheme_code && g.scheme_code.toLowerCase().includes(q)) ||
      (g.district && g.district.toLowerCase().includes(q))
    );
  });

  const totalGapsCount = gaps.length;
  const familyGapsCount = gaps.filter(g => g.scope === 'FAMILY').length;
  const individualGapsCount = gaps.filter(g => g.scope === 'INDIVIDUAL').length;
  const notifiedCount = gaps.filter(g => g.outreach_status === 'NOTIFIED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Benefit Gaps & Proactive Outreach"
        subtitle="Un-enrolled eligible citizens and households identified across Gujarat through unified Family ID records."
        action={
          <button
            onClick={loadGaps}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
            Refresh Evaluation
          </button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-gray-400 block">Total Benefit Gaps</span>
          <div className="text-2xl font-black text-amber-600 mt-1 flex items-center gap-1.5">
            <Sparkles size={20} />
            {totalGapsCount}
          </div>
          <span className="text-3xs text-gray-400 mt-1 block">Eligible but un-enrolled</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-gray-400 block">Family Scheme Gaps</span>
          <div className="text-2xl font-black text-purple-700 mt-1 flex items-center gap-1.5">
            <Home size={20} />
            {familyGapsCount}
          </div>
          <span className="text-3xs text-gray-400 mt-1 block">Health, Food, Housing</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-gray-400 block">Individual Member Gaps</span>
          <div className="text-2xl font-black text-cyan-700 mt-1 flex items-center gap-1.5">
            <Users size={20} />
            {individualGapsCount}
          </div>
          <span className="text-3xs text-gray-400 mt-1 block">Students, Girls, Workers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-gray-400 block">Outreach Initiated</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center gap-1.5">
            <Send size={18} />
            {notifiedCount}
          </div>
          <span className="text-3xs text-gray-400 mt-1 block">Field action recorded</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by Citizen Name, Family ID, Scheme Code, District..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* District Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-gray-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {GUJARAT_DISTRICTS.map(d => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Districts' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Scheme Filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All Schemes</option>
              {schemes.map(s => (
                <option key={s.scheme_code} value={s.scheme_code}>
                  {s.scheme_code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gaps List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            Evaluating beneficiary records and computing scheme gaps...
          </div>
        ) : filteredGaps.length === 0 ? (
          <div className="p-10">
            <EmptyState
              title="No Benefit Gaps Found"
              description="No eligible un-enrolled beneficiaries match your selected district and scheme filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-3xs font-bold uppercase text-gray-500 tracking-wider">
                  <th className="py-3 px-4">Beneficiary Subject</th>
                  <th className="py-3 px-4">Scheme Details</th>
                  <th className="py-3 px-4">Eligibility Proof / Reasons</th>
                  <th className="py-3 px-4 text-center">Application Route</th>
                  <th className="py-3 px-4 text-center">Outreach Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {filteredGaps.map((gap) => {
                  const isNotified = gap.outreach_status === 'NOTIFIED';
                  const isActing = Boolean(actionLoading[gap.gap_id]);

                  return (
                    <tr key={gap.gap_id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Subject */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-gray-900 text-sm">
                          {gap.subject_name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.2 rounded text-3xs font-bold ${
                            gap.scope === 'FAMILY' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {gap.scope}
                          </span>
                          {gap.family_id && (
                            <span className="font-mono text-xs font-semibold text-primary">
                              {gap.family_id}
                            </span>
                          )}
                        </div>
                        <div className="text-3xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin size={10} />
                          {gap.district}
                        </div>
                      </td>

                      {/* Scheme */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-gray-900">
                          {gap.scheme_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-3xs text-gray-500">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-700">
                            {gap.scheme_code}
                          </span>
                          <span>•</span>
                          <span>{gap.department}</span>
                        </div>
                      </td>

                      {/* Reasons */}
                      <td className="py-3.5 px-4 align-top max-w-sm">
                        <ReasonList reasons={gap.reasons} />
                        {gap.missing_information?.length > 0 && (
                          <div className="mt-2 text-3xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                            <strong>Additional requirements:</strong> {gap.missing_information.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Application Route */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ApplicationRouteChip route={gap.route} size="md" />
                          {gap.official_url && (
                            <a
                              href={gap.official_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-3xs text-primary hover:underline font-medium mt-1"
                            >
                              Official Portal <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 align-top text-center">
                        {isNotified ? (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Outreach Notified
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInitiateOutreach(gap)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Send size={13} className={isActing ? 'animate-pulse' : ''} />
                            {isActing ? 'Recording...' : 'Initiate Outreach'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
