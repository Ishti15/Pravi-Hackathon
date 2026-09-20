import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, UserCheck, ShieldCheck, Activity, AlertTriangle, FileText, 
  Clock, HeartHandshake, Database, ArrowRight, RefreshCw, Layers, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import { dashboardService } from '../../services/dashboardService';

export default function OfficerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await dashboardService.getOfficerDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load officer dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      label: 'Total Families',
      value: stats?.totalFamilies || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/5',
      to: '/officer/families',
      subtext: 'Reconciled Family IDs'
    },
    {
      label: 'Total Persons',
      value: stats?.totalPersons || 0,
      icon: UserCheck,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      to: '/officer/families',
      subtext: 'Canonical registry persons'
    },
    {
      label: 'Verified Persons',
      value: stats?.verifiedPersons || 0,
      icon: ShieldCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      to: '/officer/families',
      subtext: 'ID token verified'
    },
    {
      label: 'Active Beneficiaries',
      value: stats?.activeBeneficiaries || 0,
      icon: HeartHandshake,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      to: '/officer/scheme-coverage',
      subtext: 'Enrolled in >= 1 scheme'
    },
    {
      label: 'Potential Beneficiaries',
      value: stats?.potentialBeneficiaries || 0,
      icon: Activity,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      to: '/officer/scheme-coverage',
      subtext: 'Needs verification'
    },
    {
      label: 'Pending Applications',
      value: stats?.pendingApplications || 0,
      icon: FileText,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      to: '/officer/applications',
      subtext: 'Awaiting officer action'
    },
    {
      label: 'Renewals Due',
      value: stats?.renewalsDue || 0,
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      to: '/officer/scheme-coverage',
      subtext: 'Due within 30 days'
    },
    {
      label: 'Benefit Gaps',
      value: stats?.benefitGaps || 0,
      icon: AlertTriangle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      to: '/officer/benefit-gaps',
      subtext: 'Eligible with no coverage'
    },
    {
      label: 'Open Data Conflicts',
      value: stats?.openConflicts || 0,
      icon: RefreshCw,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      to: '/officer/dashboard', // P1 route fallback
      subtext: 'Conflicting source records'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Identity Review Chip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Executive Officer Dashboard" 
          description="Consolidated overview of Gujarat citizen registry, scheme enrollments, benefit gaps, and operational metrics." 
        />

        {stats?.pendingReviews > 0 && (
          <Link
            to="/officer/identity-review"
            className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>{stats.pendingReviews} record{stats.pendingReviews > 1 ? 's' : ''} awaiting review</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-amber-700" />
          </Link>
        )}
      </div>

      {/* Core Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.to}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 hover:shadow transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase text-[10px]">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className={`text-2xl font-bold tracking-tight ${card.color}`}>
                  {loading ? '—' : card.value.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>{card.subtext}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Scheme Coverage (Enrolled vs Gaps) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Scheme Coverage (Enrolled vs Gaps)</h3>
              <p className="text-xs text-slate-500">Beneficiaries covered vs eligible gaps by scheme</p>
            </div>
            <Link to="/officer/scheme-coverage" className="text-xs font-semibold text-primary hover:underline">
              Full Details →
            </Link>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : stats?.charts?.coverageByScheme?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No scheme data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.coverageByScheme} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val, name, item) => [
                      `${val} ${name === 'enrolled' ? '(Coverage: ' + item.payload.coveragePct + '%)' : ''}`,
                      name === 'enrolled' ? 'Enrolled' : 'Gaps'
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gaps" name="Benefit Gaps" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Applications by Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Applications by Status</h3>
              <p className="text-xs text-slate-500">Distribution across review pipeline stages</p>
            </div>
            <Link to="/officer/applications" className="text-xs font-semibold text-primary hover:underline">
              Applications Queue →
            </Link>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.applicationsByStatus} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Applications" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    {stats?.charts?.applicationsByStatus?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Second Row Charts + Integration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Families by District */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Families by District</h3>
              <p className="text-xs text-slate-500">Household density across Gujarat</p>
            </div>
            <Link to="/officer/families" className="text-xs font-semibold text-primary hover:underline">
              View Families →
            </Link>
          </div>

          <div className="h-56 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : stats?.charts?.familiesByDistrict?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No families registered</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.familiesByDistrict} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <XAxis dataKey="district" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="families" name="Families" fill="#1F3A5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Benefit Gaps by Scheme */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Benefit Gaps by Scheme</h3>
              <p className="text-xs text-slate-500">Uncovered eligible populations</p>
            </div>
            <Link to="/officer/benefit-gaps" className="text-xs font-semibold text-primary hover:underline">
              Gaps Explorer →
            </Link>
          </div>

          <div className="h-56 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.charts?.gapsByScheme} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <XAxis dataKey="scheme" tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="gaps" name="Gaps" fill="#D9730D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Small Data Integration Card (§15) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Data Integration</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Latest Batch
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Summary of most recent department CSV ingestion</p>
          </div>

          {stats?.lastIngestion ? (
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">File & Dept:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[140px]" title={stats.lastIngestion.file_name}>
                  {stats.lastIngestion.file_name} ({stats.lastIngestion.department})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Imported Rows:</span>
                <span className="font-bold text-slate-900">{stats.lastIngestion.imported_rows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auto-Linked:</span>
                <span className="font-semibold text-emerald-700">{stats.lastIngestion.linked_records}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Review Queued:</span>
                <span className="font-semibold text-amber-700">{stats.lastIngestion.review_queued}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">New Persons:</span>
                <span className="font-semibold text-blue-700">{stats.lastIngestion.new_persons}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
              No department CSV has been ingested yet.
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/admin/data-ingestion"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Ingestion Batches</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
