import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { familyService } from '../../services/familyService';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { Users, Search, Filter, Eye, UserX, RefreshCw, Home } from 'lucide-react';

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

export default function FamiliesList() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('FAMILIES'); // FAMILIES | UNASSIGNED
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fams, unass] = await Promise.all([
        familyService.getFamilies({ district: districtFilter, search: searchQuery }),
        familyService.getUnassignedPersons()
      ]);
      setFamilies(fams || []);
      setUnassigned(unass || []);
    } catch (err) {
      console.error('Failed to load families:', err);
    } finally {
      setLoading(false);
    }
  }, [districtFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Family Registry & Beneficiary Households"
          subtitle="Unified family records formed from department data, assigned Family IDs, and unassigned individuals"
        />
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors self-start md:self-auto"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Registry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('FAMILIES')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'FAMILIES'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} />
          Active Families
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
            {families.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('UNASSIGNED')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'UNASSIGNED'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserX size={16} />
          Unassigned Persons
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
            {unassigned.length}
          </span>
        </button>
      </div>

      {/* Filter Controls (for Families tab) */}
      {activeTab === 'FAMILIES' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Family ID (FAM-GJ-...), Ration card, Head name, or Address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary/20 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400 shrink-0" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-medium cursor-pointer"
            >
              {GUJARAT_DISTRICTS.map(d => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Gujarat Districts' : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-2xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          Loading family registry...
        </div>
      ) : activeTab === 'FAMILIES' ? (
        families.length === 0 ? (
          <EmptyState
            title="No families found"
            description={
              searchQuery || districtFilter !== 'ALL'
                ? "No registered families match the selected filters. Try broadening your search or choosing 'All Districts'."
                : "No families have been formed yet. Load the demo dataset from the Admin Ingestion page to populate the registry."
            }
            icon={Home}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Family ID</th>
                    <th className="py-3.5 px-4">Ration Card</th>
                    <th className="py-3.5 px-4">Head of Household</th>
                    <th className="py-3.5 px-4">District & Address</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Annual Income</th>
                    <th className="py-3.5 px-4 text-center">Members</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {families.map((fam) => (
                    <tr
                      key={fam.family_id}
                      onClick={() => navigate(`/officer/families/${fam.family_id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-primary group-hover:underline">
                          {fam.family_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-700">
                        {fam.household_ref || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{fam.head_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{fam.head_person_id}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-xs text-gray-900 truncate">{fam.address || '—'}</div>
                        <div className="text-xs text-gray-500 font-semibold">{fam.district}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={fam.family_category || 'GENERAL'} />
                      </td>
                      <td className="py-3.5 px-4">
                        {fam.household_income != null ? (
                          <div>
                            <div className="font-semibold text-gray-900">₹{Number(fam.household_income).toLocaleString('en-IN')}</div>
                            <div className="text-xs text-gray-400">via {fam.income_source}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Not recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-100">
                          {fam.member_count} {fam.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/families/${fam.family_id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/5 hover:bg-primary hover:text-white transition-all shadow-2xs"
                        >
                          <Eye size={13} />
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Unassigned Persons Tab */
        unassigned.length === 0 ? (
          <EmptyState
            title="No unassigned persons"
            description="All persons in the registry have been linked to an active family household."
            icon={Users}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
              These individuals do not possess a ration card (household reference) or belong to a household whose linking records are pending review. They are tracked as individual beneficiaries.
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4">Person ID</th>
                      <th className="py-3.5 px-4">Full Name</th>
                      <th className="py-3.5 px-4">DOB / Gender</th>
                      <th className="py-3.5 px-4">District</th>
                      <th className="py-3.5 px-4">Linked Departments</th>
                      <th className="py-3.5 px-4">Identity Status</th>
                      <th className="py-3.5 px-4 text-right">Registry Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {unassigned.map((p) => (
                      <tr key={p.person_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                          {p.person_id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {p.canonical_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <div>{p.dob || 'Missing DOB'}</div>
                          <div className="text-gray-400">Gender: {p.gender || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-gray-800">
                          {p.district}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.departments.map(dept => (
                              <span key={dept} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 border border-gray-200">
                                {dept}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={p.identity_status || 'UNVERIFIED'} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Unassigned
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
