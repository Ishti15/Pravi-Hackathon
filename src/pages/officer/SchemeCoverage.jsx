import React, { useState, useEffect } from 'react';
import { 
  Shield, Filter, Clock, AlertTriangle, CheckCircle2, 
  ArrowRight, Users, User, RefreshCw, BarChart3, AlertCircle 
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { dashboardService } from '../../services/dashboardService';

export default function SchemeCoverage() {
  const [loading, setLoading] = useState(true);
  const [coverageData, setCoverageData] = useState([]);
  const [renewalsDue, setRenewalsDue] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');

  useEffect(() => {
    loadCoverage(selectedDistrict);
  }, [selectedDistrict]);

  async function loadCoverage(district) {
    try {
      setLoading(true);
      const res = await dashboardService.getSchemeCoverageData({ district });
      setCoverageData(res.coverage || []);
      setRenewalsDue(res.renewalsDue || []);
      if (res.availableDistricts?.length > 0) {
        setAvailableDistricts(res.availableDistricts);
      }
    } catch (err) {
      console.error('Failed to load scheme coverage:', err);
    } finally {
      setLoading(false);
    }
  }

  // Summary totals
  const totalEnrolled = coverageData.reduce((sum, s) => sum + s.enrolled, 0);
  const totalGaps = coverageData.reduce((sum, s) => sum + s.gaps, 0);
  const totalInProgress = coverageData.reduce((sum, s) => sum + s.in_progress, 0);
  const overallCoveragePct = (totalEnrolled + totalGaps) > 0
    ? Math.round((totalEnrolled / (totalEnrolled + totalGaps)) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Scheme Coverage & Renewal Monitoring" 
          description="Detailed scheme penetration metrics, eligible gaps, in-progress referrals, and upcoming benefit renewals." 
        />

        {/* District Filter Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          <span className="text-xs font-semibold text-slate-600">District:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="text-xs font-medium border-0 bg-transparent text-slate-800 focus:outline-none cursor-pointer pr-2"
          >
            <option value="ALL">All Gujarat Districts</option>
            {availableDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aggregate KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Overall Coverage
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {overallCoveragePct}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Enrolled / (Enrolled + Gaps)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Total Enrolled
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {totalEnrolled}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active scheme beneficiaries</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Eligible Gaps
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {totalGaps}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Eligible without coverage</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            Renewals Due (30 Days)
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {renewalsDue.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Upcoming verification required</div>
        </div>
      </div>

      {/* 1. Scheme Coverage Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Scheme Coverage Metrics</h3>
            <p className="text-xs text-slate-500">Coverage formula = Enrolled / (Enrolled + Gaps)</p>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {coverageData.length} active schemes
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Scheme</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4 text-center">Enrolled</th>
                <th className="py-3 px-4 text-center">Benefit Gaps</th>
                <th className="py-3 px-4 text-center">In Progress</th>
                <th className="py-3 px-4 text-center">Needs Verification</th>
                <th className="py-3 px-4 w-48">Coverage Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {coverageData.map(scheme => {
                const isHigh = scheme.coverage_pct >= 70;
                const isMed = scheme.coverage_pct >= 40 && scheme.coverage_pct < 70;

                return (
                  <tr key={scheme.scheme_code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{scheme.name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{scheme.scheme_code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {scheme.department}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {scheme.scope}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {scheme.enrolled}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-red-600">
                      {scheme.gaps}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-blue-700">
                      {scheme.in_progress}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-amber-700">
                      {scheme.needs_verification}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isHigh ? 'bg-emerald-600' : isMed ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(scheme.coverage_pct, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-xs w-12 text-right">
                          {scheme.coverage_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Renewals Due Table (§11, §15) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Renewals Due (Expiring within 30 days)</h3>
              <p className="text-xs text-slate-500">Beneficiaries requiring renewal verification or re-certification</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {renewalsDue.length} Action{renewalsDue.length === 1 ? '' : 's'} Required
          </span>
        </div>

        {renewalsDue.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
            No scheme enrollments are currently due for renewal within the next 30 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Scheme</th>
                  <th className="py-3 px-4">Family ID</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Renewal Date</th>
                  <th className="py-3 px-4">Days Remaining</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {renewalsDue.map(r => (
                  <tr key={r.enrollment_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {r.subject_type === 'FAMILY' ? (
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{r.subject_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {r.scheme_code}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.family_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.district}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {r.next_renewal_date}
                    </td>
                    <td className="py-3 px-4">
                      {r.is_overdue ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                          Overdue ({Math.abs(r.days_remaining)}d ago)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                          Due in {r.days_remaining} days
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Renewal notification queued for ${r.subject_name} (${r.scheme_code})`)}
                        className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 shadow-xs"
                      >
                        Notify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
