import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle, XCircle, Clock, FileText, 
  ExternalLink, Eye, AlertCircle, Shield, User, Users, CheckSquare, Gift
} from 'lucide-react';
import { applicationService } from '../../services/applicationService';
import { schemeService } from '../../services/schemeService';
import { familyService } from '../../services/familyService';
import { personService } from '../../services/personService';
import { APPLICATION_STATUSES, ENROLLMENT_STATUSES } from '../../lib/applicationFlow';

export default function Applications() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [persons, setPersons] = useState([]);
  const [families, setFamilies] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [schemeFilter, setSchemeFilter] = useState('ALL');

  // Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [allApps, allSchemes, allPersons, allFamilies, allEnrollments] = await Promise.all([
        applicationService.getApplications(),
        schemeService.getSchemes(),
        personService.getPersons(),
        familyService.getRawFamilies(),
        schemeService.getEnrollments()
      ]);

      setApplications(allApps);
      setSchemes(allSchemes);
      setPersons(allPersons);
      setFamilies(allFamilies);
      setEnrollments(allEnrollments);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenDetail = async (app) => {
    try {
      setModalLoading(true);
      setActionError(null);
      setShowRejectForm(false);
      setRejectNote('');
      const fullApp = await applicationService.getApplicationById(app.application_id);
      setSelectedApp(fullApp);
    } catch (err) {
      console.error('Failed to load application detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleReviewAction = async (action) => {
    if (!selectedApp) return;

    if (action === 'REJECT' && (!rejectNote || !rejectNote.trim())) {
      setActionError('Please provide an officer note explaining the rejection.');
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);

      const res = await applicationService.reviewApplication({
        applicationId: selectedApp.application_id,
        action,
        note: rejectNote,
        actorRole: 'Officer',
        actorName: 'Verification Officer'
      });

      // Reload
      await loadData();
      const updated = await applicationService.getApplicationById(selectedApp.application_id);
      setSelectedApp(updated);
      setShowRejectForm(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliverBenefit = async () => {
    if (!selectedApp) return;

    try {
      setProcessing(true);
      setActionError(null);

      // Find matching enrollment
      const matchingEnrollment = enrollments.find(e => 
        (e.application_id === selectedApp.application_id) ||
        (e.scheme_code === selectedApp.scheme_code && e.subject_id === selectedApp.subject_id)
      );

      if (!matchingEnrollment) {
        throw new Error('No associated enrollment found to deliver benefit.');
      }

      await applicationService.markBenefitDelivered({
        enrollmentId: matchingEnrollment.enrollment_id,
        actorRole: 'Officer',
        actorName: 'Welfare Officer'
      });

      await loadData();
      const updated = await applicationService.getApplicationById(selectedApp.application_id);
      setSelectedApp(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Filter applications
  const filteredApps = applications.filter(app => {
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (schemeFilter !== 'ALL' && app.scheme_code !== schemeFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const scheme = schemes.find(s => s.scheme_code === app.scheme_code);
      const person = persons.find(p => p.person_id === app.subject_id);
      const family = families.find(f => f.family_id === app.family_id || f.family_id === app.subject_id);

      const matchId = app.application_id.toLowerCase().includes(q);
      const matchScheme = scheme?.name?.toLowerCase().includes(q) || app.scheme_code.toLowerCase().includes(q);
      const matchPerson = person?.canonical_name?.toLowerCase().includes(q);
      const matchFamily = family?.household_ref?.toLowerCase().includes(q) || family?.family_id?.toLowerCase().includes(q);

      return matchId || matchScheme || matchPerson || matchFamily;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Submitted</span>;
      case 'UNDER_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Under Verification</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case 'REFERRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Official Portal (Referred)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Application Verification Queue</h1>
        <p className="text-xs text-slate-600 mt-1">
          Review, verify, and approve citizen scheme applications submitted across Gujarat departments.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Pending Review</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_VERIFICATION').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Approved</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {applications.filter(a => a.status === 'APPROVED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">External Referrals</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {applications.filter(a => a.status === 'REFERRED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Logged</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {applications.length}
          </div>
        </div>
      </div>

      {/* Controls: Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by application ID, applicant, or ration card..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REFERRED">Referred (Portal)</option>
          </select>

          <select
            value={schemeFilter}
            onChange={(e) => setSchemeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Schemes</option>
            {schemes.map(s => (
              <option key={s.scheme_code} value={s.scheme_code}>{s.name} ({s.scheme_code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No applications match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Application ID</th>
                  <th className="py-3 px-4">Scheme</th>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Family ID</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredApps.map(app => {
                  const scheme = schemes.find(s => s.scheme_code === app.scheme_code);
                  const person = persons.find(p => p.person_id === app.subject_id);
                  const subjectName = app.subject_type === 'FAMILY' 
                    ? 'Family Unit' 
                    : (person?.canonical_name || app.subject_id);

                  return (
                    <tr key={app.application_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {app.application_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{scheme?.name || app.scheme_code}</div>
                        <div className="text-[11px] text-slate-500">{scheme?.department || 'Department'}</div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          {app.subject_type === 'FAMILY' ? (
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{subjectName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {app.family_id || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(app.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(app)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    Application Review: {selectedApp.application_id}
                  </h3>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Submitted: {new Date(selectedApp.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Scheme Summary */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheme:</span>
                  <span className="font-bold text-slate-900">{selectedApp.scheme_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-900">{selectedApp.subject_id} ({selectedApp.subject_type})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Family ID:</span>
                  <span className="font-mono text-slate-900">{selectedApp.family_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode:</span>
                  <span className="font-semibold text-slate-700">{selectedApp.application_mode}</span>
                </div>
              </div>

              {/* Submitted Information Fields */}
              {selectedApp.application_data && Object.keys(selectedApp.application_data).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                    Submitted Details & Data
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {Object.entries(selectedApp.application_data).map(([k, v]) => (
                      <div key={k} className="p-3 flex justify-between">
                        <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                        <span className="font-semibold text-slate-900 font-mono">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Documents */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-600 text-[11px]">
                  Attached Documents ({selectedApp.documents?.length || 0})
                </h4>
                {selectedApp.documents?.length === 0 ? (
                  <div className="text-slate-400 italic p-3 bg-slate-50 rounded border border-slate-200">
                    No documents required or attached.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedApp.documents?.map(doc => (
                      <div key={doc.doc_id} className="p-3 border rounded-lg bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <div>
                            <div className="font-semibold text-slate-800">{doc.doc_type}</div>
                            <div className="text-[11px] text-slate-500">{doc.file_name} ({(doc.file_size / 1024).toFixed(0)} KB)</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Attached
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Officer Note / Rejection Reason */}
              {selectedApp.officer_note && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <div className="font-semibold">Officer Note:</div>
                  <div className="mt-0.5">{selectedApp.officer_note}</div>
                </div>
              )}

              {/* Error Message */}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Reject Note Form */}
              {showRejectForm && (
                <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <label className="font-semibold text-amber-900 block">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Enter explicit reason for rejecting this application..."
                    className="w-full p-2 border rounded border-amber-300 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1 text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction('REJECT')}
                      disabled={processing}
                      className="px-3 py-1 text-white bg-red-600 rounded hover:bg-red-700 font-semibold"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {/* 1. If SUBMITTED -> Start Verification */}
                {selectedApp.status === APPLICATION_STATUSES.SUBMITTED && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleReviewAction('START_VERIFICATION')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
                  >
                    Start Verification
                  </button>
                )}

                {/* 2. If UNDER_VERIFICATION -> Approve or Reject */}
                {selectedApp.status === APPLICATION_STATUSES.UNDER_VERIFICATION && !showRejectForm && (
                  <>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => setShowRejectForm(true)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => handleReviewAction('APPROVE')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve & Enroll</span>
                    </button>
                  </>
                )}

                {/* 3. If APPROVED -> Option to Mark Benefit Delivered */}
                {selectedApp.status === APPLICATION_STATUSES.APPROVED && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleDeliverBenefit}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 shadow-sm flex items-center gap-1.5"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Mark Benefit Delivered</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
