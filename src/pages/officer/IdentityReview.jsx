import React, { useState, useEffect, useCallback } from 'react';
import { personService } from '../../services/personService';
import { useDemoSession } from '../../session/DemoSessionContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import MatchStrengthBadge from '../../components/MatchStrengthBadge';
import ReasonList from '../../components/ReasonList';
import EmptyState from '../../components/EmptyState';
import { Check, X, UserCheck, ShieldAlert, FileSpreadsheet, Building2, MapPin, Calendar, User, RefreshCw } from 'lucide-react';

export default function IdentityReview() {
  const { session } = useDemoSession();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | ALL
  const [notes, setNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await personService.getMatchReviewsWithDetails(activeTab === 'ALL' ? null : activeTab);
      setReviews(data || []);
    } catch (err) {
      console.error('Failed to load match reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleApprove = async (reviewId) => {
    setProcessingId(reviewId);
    setActionFeedback(null);
    try {
      const note = notes[reviewId] || 'Officer approved after reviewing matching identity attributes.';
      const res = await personService.approveMatchReview(
        reviewId,
        session?.role || 'Officer',
        session?.name || 'Verification Officer',
        note
      );
      setActionFeedback({
        type: 'success',
        message: `Match approved! Record ${res.sourceRecord?.source_key || ''} linked to Person ${res.review?.candidate_person_id}.`
      });
      await loadReviews();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Failed to approve match: ${err.message}`
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId) => {
    setProcessingId(reviewId);
    setActionFeedback(null);
    try {
      const note = notes[reviewId] || 'Officer rejected match. Established new distinct person profile.';
      const res = await personService.rejectMatchReview(
        reviewId,
        session?.role || 'Officer',
        session?.name || 'Verification Officer',
        note
      );
      setActionFeedback({
        type: 'info',
        message: `Match rejected. Created new Person profile ${res.newPerson?.person_id} for record ${res.sourceRecord?.source_key || ''}.`
      });
      await loadReviews();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Failed to reject match: ${err.message}`
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleNoteChange = (reviewId, text) => {
    setNotes(prev => ({ ...prev, [reviewId]: text }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Identity Match Review Queue"
          subtitle="Review and resolve ambiguous record linking candidates where names match but addresses or locations differ"
        />
        <button
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {actionFeedback && (
        <div
          className={`p-4 rounded-lg border text-sm font-medium transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : actionFeedback.type === 'info'
              ? 'bg-blue-50 text-blue-900 border-blue-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PENDING'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Review
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
            {activeTab === 'PENDING' ? reviews.length : '...'}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ALL')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'ALL'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Reviews History
        </button>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          Loading identity match reviews...
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No ambiguous links awaiting review"
          description={
            activeTab === 'PENDING'
              ? 'All staged department records have been auto-linked with high confidence or created as unique person profiles.'
              : 'No record review history found.'
          }
          icon={UserCheck}
        />
      ) : (
        <div className="space-y-6">
          {reviews.map((rev) => {
            const sr = rev.sourceRecord;
            const cp = rev.candidatePerson;
            const isPending = rev.status === 'PENDING';
            const isProcessing = processingId === rev.review_id;

            return (
              <div
                key={rev.review_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:border-gray-300"
              >
                {/* Header */}
                <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-semibold">
                      Review #{rev.review_id.slice(0, 8)}
                    </span>
                    <StatusBadge status={rev.status} />
                    <MatchStrengthBadge strength={rev.strength} />
                  </div>
                  {rev.reviewed_at && (
                    <div className="text-xs text-gray-500">
                      Resolved by <strong className="text-gray-700">{rev.reviewed_by}</strong> on {new Date(rev.reviewed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Side by Side Comparison */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                  {/* Left: Incoming Staged Record */}
                  <div className="space-y-4 lg:pr-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-blue-600" />
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Incoming Source Record
                        </h4>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                        {sr?.department || 'Department Record'}
                      </span>
                    </div>

                    <div className="bg-blue-50/40 rounded-lg p-4 border border-blue-100/80 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{sr?.source_person_name || 'N/A'}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            Normalized: <span className="font-semibold text-gray-700">{sr?.normalized_name || '—'}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold bg-white px-2 py-1 rounded shadow-2xs border border-gray-200 text-gray-800">
                          {sr?.source_key || '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar size={13} className="text-gray-400" />
                          <span>DOB: <strong>{sr?.source_dob || 'Missing'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <User size={13} className="text-gray-400" />
                          <span>Gender: <strong>{sr?.source_gender || '—'}</strong></span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-700 pt-1 border-t border-blue-100 flex items-start gap-1.5">
                        <MapPin size={13} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <div>{sr?.source_address || 'No address provided'}</div>
                          <div className="font-semibold text-blue-950 mt-0.5">District: {sr?.district || '—'}</div>
                        </div>
                      </div>

                      {sr?.household_ref && (
                        <div className="text-xs bg-white/80 p-2 rounded border border-blue-100/60">
                          <span className="text-gray-500">Ration Card:</span> <strong className="text-gray-800">{sr.household_ref}</strong>
                          {sr.relationship_to_head && (
                            <span className="ml-2 text-gray-500">({sr.relationship_to_head})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Candidate Existing Person */}
                  <div className="space-y-4 pt-6 lg:pt-0 lg:pl-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-emerald-600" />
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                          Existing Person Profile
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                        {cp?.person_id || 'Candidate Profile'}
                      </span>
                    </div>

                    {cp ? (
                      <div className="bg-emerald-50/40 rounded-lg p-4 border border-emerald-100/80 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-lg font-bold text-gray-900">{cp.canonical_name}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                              Identity: <span className="font-semibold text-emerald-800">{cp.identity_status}</span>
                            </div>
                          </div>
                          {cp.identity_reference && (
                            <span className="text-xs font-mono bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                              {cp.identity_reference}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400" />
                            <span>DOB: <strong>{cp.dob || '—'}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <User size={13} className="text-gray-400" />
                            <span>Gender: <strong>{cp.gender || '—'}</strong></span>
                          </div>
                        </div>

                        {/* Known Addresses from linked source records */}
                        <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                          <div className="text-xs font-semibold text-gray-700">Previously Linked Records:</div>
                          {rev.candidateSourceRecords && rev.candidateSourceRecords.length > 0 ? (
                            <div className="space-y-1 max-h-28 overflow-y-auto">
                              {rev.candidateSourceRecords.map((csr, idx) => (
                                <div key={idx} className="text-xs bg-white p-1.5 rounded border border-emerald-100/60 flex items-start gap-1.5">
                                  <span className="font-semibold text-gray-800 shrink-0">[{csr.department} - {csr.source_key}]:</span>
                                  <span className="text-gray-600 truncate">{csr.source_address}, {csr.district}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic">No previous records attached.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-500 italic">
                        Candidate person profile data not available.
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Reasons Analysis */}
                <div className="px-6 py-4 bg-amber-50/50 border-t border-amber-100 flex flex-col sm:flex-row items-start gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase shrink-0 mt-0.5">
                    <ShieldAlert size={15} className="text-amber-600" />
                    Linking Analysis:
                  </div>
                  <div className="flex-1">
                    <ReasonList reasons={rev.reasons || []} />
                  </div>
                </div>

                {/* Officer Decision Controls (Only for PENDING) */}
                {isPending ? (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-1/2">
                      <input
                        type="text"
                        placeholder="Add review remarks or justification note (optional)..."
                        value={notes[rev.review_id] || ''}
                        onChange={(e) => handleNoteChange(rev.review_id, e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 bg-white"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      <button
                        onClick={() => handleReject(rev.review_id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 hover:text-red-700 transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <X size={14} className="text-red-600" />
                        Reject (Create New Person)
                      </button>
                      <button
                        onClick={() => handleApprove(rev.review_id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Check size={14} />
                        Approve (Link to {cp?.person_id || 'Person'})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-600 flex items-center justify-between">
                    <span>
                      Decision: <strong className="text-gray-800">{rev.status}</strong>
                    </span>
                    {rev.note && <span className="text-gray-500 italic">Note: "{rev.note}"</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
