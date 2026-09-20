import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { familyService } from '../../services/familyService';
import { schemeService } from '../../services/schemeService';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import BenefitMatrix from '../../components/BenefitMatrix';
import {
  ArrowLeft,
  Home,
  Users,
  MapPin,
  CreditCard,
  Calendar,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Briefcase
} from 'lucide-react';

export default function FamilyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedProvenance, setExpandedProvenance] = useState({});

  const loadFamily = useCallback(async () => {
    setLoading(true);
    try {
      const data = await familyService.getFamilyById(id);
      setFamily(data);
      const mData = await schemeService.getFamilyBenefitMatrix(id);
      setMatrixData(mData);
    } catch (err) {
      console.error('Failed to load family detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const toggleProvenance = (personId) => {
    setExpandedProvenance(prev => ({ ...prev, [personId]: !prev[personId] }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
        Loading family profile...
      </div>
    );
  }

  if (!family) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/officer/families')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to Families
        </button>
        <EmptyState
          title="Family record not found"
          description={`No family profile exists with ID "${id}".`}
          icon={Home}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/officer/families')}
          className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-600 hover:text-primary transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs"
        >
          <ArrowLeft size={16} /> Back to Families Registry
        </button>
        <span className="text-xs text-gray-400 font-mono">
          Last updated: {family.updated_at ? new Date(family.updated_at).toLocaleDateString() : 'Active'}
        </span>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-[#2a4d7d] p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl md:text-3xl font-mono font-extrabold tracking-tight">
                  {family.family_id}
                </span>
                <span className="bg-accent text-white text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {family.family_status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                <span>Ration Card: <strong className="font-mono text-white">{family.household_ref || '—'}</strong></span>
                <span>•</span>
                <span>Head: <strong className="text-white">{family.head_name}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-white/10 backdrop-blur-xs border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <CreditCard size={14} />
                Category: {family.family_category || 'GENERAL'}
              </span>
              <span className="bg-white/10 backdrop-blur-xs border border-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <Users size={14} />
                {family.members?.length || 0} Members
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block font-medium">Residential Address</span>
            <span className="font-semibold text-gray-800 flex items-start gap-1 mt-0.5">
              <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
              {family.address || '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">District & Taluka</span>
            <span className="font-semibold text-gray-800 block mt-0.5">
              {family.district} {family.city_or_village ? `(${family.city_or_village})` : ''}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Household Income</span>
            <span className="font-semibold text-gray-900 block mt-0.5">
              {family.household_income != null ? (
                <>
                  ₹{Number(family.household_income).toLocaleString('en-IN')}
                  <span className="text-gray-400 font-normal ml-1">({family.income_source})</span>
                </>
              ) : (
                <span className="text-gray-400 italic">Not recorded</span>
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Head Person ID</span>
            <span className="font-mono font-bold text-primary block mt-0.5">
              {family.head_person_id || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Benefit Matrix Section */}
      <div className="space-y-4">
        <BenefitMatrix matrixData={matrixData} />
      </div>

      {/* Family Members Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Family Members ({family.members?.length || 0})
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            Unified profiles with cross-department provenance
          </span>
        </div>

        <div className="space-y-3">
          {family.members?.map((m) => {
            const isExpanded = Boolean(expandedProvenance[m.person_id]);
            const isHead = m.relationship === 'HEAD';

            return (
              <div
                key={m.person_id}
                className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Member Summary Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${isHead ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                      <User size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base font-bold text-gray-900">{m.canonical_name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isHead
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {m.relationship}
                        </span>
                        <span className="font-mono text-xs text-gray-400 font-semibold">
                          {m.person_id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          DOB: <strong className="text-gray-700">{m.dob || 'Missing'}</strong>
                        </span>
                        <span>•</span>
                        <span>Gender: <strong className="text-gray-700">{m.gender || '—'}</strong></span>
                        {m.occupation && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-gray-700">
                              <Briefcase size={13} className="text-gray-400" />
                              {m.occupation}
                            </span>
                          </>
                        )}
                        {m.is_student && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-blue-700 font-medium">
                              <GraduationCap size={13} />
                              Student
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <StatusBadge status={m.identity_status || 'UNVERIFIED'} />
                    {m.identity_reference && (
                      <span className="font-mono text-xs px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 font-semibold">
                        {m.identity_reference}
                      </span>
                    )}
                    <button
                      onClick={() => toggleProvenance(m.person_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                    >
                      <span>Provenance ({m.source_records?.length || 0})</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Source Records Provenance */}
                {isExpanded && (
                  <div className="bg-gray-50/70 p-5 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Layers size={14} className="text-primary" />
                        Linked Department Records (Immutable Audit Provenance)
                      </span>
                      <span className="text-gray-400">Total: {m.source_records?.length || 0}</span>
                    </div>

                    {m.source_records?.length === 0 ? (
                      <div className="text-xs text-gray-400 italic p-3 bg-white rounded border border-gray-200">
                        No raw department records directly attached.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {m.source_records.map((sr) => (
                          <div
                            key={sr.source_record_id}
                            className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                {sr.department}
                              </span>
                              <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                                {sr.source_key}
                              </span>
                            </div>

                            <div className="text-gray-700">
                              Recorded Name: <strong className="text-gray-900">{sr.source_person_name}</strong>
                            </div>

                            <div className="text-gray-600 flex items-start gap-1">
                              <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                              <span>{sr.source_address}, {sr.district}</span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-500">
                              <span>Match: <strong className="text-primary">{sr.match_method || 'STAGED'}</strong></span>
                              {sr.match_strength && (
                                <span className="text-gray-600">Strength: {sr.match_strength}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
