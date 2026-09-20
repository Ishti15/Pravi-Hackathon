import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, ExternalLink, AlertTriangle, ShieldCheck, 
  FileText, User, Users, Clock, AlertCircle, Building2 
} from 'lucide-react';
import { schemeService } from '../../services/schemeService';
import { familyService } from '../../services/familyService';
import { applicationService } from '../../services/applicationService';
import { deriveApplicationRoute, APPLICATION_ROUTES } from '../../lib/applicationRoute';
import { checkDuplicateApplication, checkRequirementsCompletion } from '../../lib/applicationFlow';
import RequirementsChecklist from '../../components/RequirementsChecklist';
import ApplicationRouteChip from '../../components/ApplicationRouteChip';

export default function ApplyScheme() {
  const { schemeCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheme, setScheme] = useState(null);
  const [family, setFamily] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  
  // Route determination
  const [routeInfo, setRouteInfo] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState({ isDuplicate: false });

  // Form state
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);

  useEffect(() => {
    loadData();
  }, [schemeCode]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const schemeObj = await schemeService.getSchemeByCode(schemeCode);
      if (!schemeObj) {
        throw new Error(`Scheme "${schemeCode}" was not found.`);
      }
      setScheme(schemeObj);

      // Fetch demo citizen family (Patel family GJ-RC-100001)
      const families = await familyService.getFamilies();
      const heroFamily = families.find(f => f.household_ref === 'GJ-RC-100001') || families[0];
      if (!heroFamily) {
        throw new Error('No family profile available for citizen session.');
      }

      const fullProfile = await familyService.getFamilyById(heroFamily.family_id);
      setFamily(fullProfile);

      // Select default applicant subject
      let defaultSubjectId = fullProfile.family_id;
      if (schemeObj.scope === 'INDIVIDUAL' && fullProfile.members?.length > 0) {
        // Choose first eligible or first member
        defaultSubjectId = fullProfile.members[0].person_id;
      }
      setSelectedMemberId(defaultSubjectId);

      await updateEligibilityAndRoute(schemeObj, fullProfile, defaultSubjectId);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateEligibilityAndRoute(schemeObj, familyObj, subjectId) {
    const isFamilyScope = schemeObj.scope === 'FAMILY';
    const targetId = isFamilyScope ? familyObj.family_id : subjectId;

    // Check duplicate
    const existingEnrollments = await schemeService.getEnrollments();
    const existingApps = await applicationService.getApplications();
    const dupResult = checkDuplicateApplication(existingEnrollments, existingApps, schemeObj, targetId);
    setDuplicateCheck(dupResult);

    // Get eligibility results for this subject
    const evalResults = await schemeService.getEligibilityResults({
      subjectId: targetId,
      schemeCode: schemeObj.scheme_code
    });

    const evalRes = evalResults[0] || null;
    const derived = deriveApplicationRoute(
      schemeObj,
      evalRes?.status || 'NOT_ELIGIBLE',
      evalRes?.missing_information || []
    );
    setRouteInfo(derived);
  }

  const handleMemberChange = async (newMemberId) => {
    setSelectedMemberId(newMemberId);
    if (scheme && family) {
      await updateEligibilityAndRoute(scheme, family, newMemberId);
    }
  };

  const handleRouteCReferral = async () => {
    try {
      setSubmitting(true);
      const isFamily = scheme.scope === 'FAMILY';
      const subjectId = isFamily ? family.family_id : selectedMemberId;

      // Open external portal in new tab
      if (scheme.official_application_url) {
        window.open(scheme.official_application_url, '_blank', 'noopener,noreferrer');
      }

      // Record external referral
      const app = await applicationService.recordExternalReferral({
        schemeCode: scheme.scheme_code,
        subjectId,
        subjectType: isFamily ? 'FAMILY' : 'PERSON',
        familyId: family.family_id,
        actorRole: 'Citizen',
        actorName: 'Citizen'
      });

      setSubmittedApp(app);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitInternal = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const isFamily = scheme.scope === 'FAMILY';
      const subjectId = isFamily ? family.family_id : selectedMemberId;

      // 1. Start application
      const app = await applicationService.startApplication({
        schemeCode: scheme.scheme_code,
        subjectId,
        subjectType: isFamily ? 'FAMILY' : 'PERSON',
        familyId: family.family_id,
        initialData: formData,
        actorRole: 'Citizen',
        actorName: 'Citizen'
      });

      // 2. Submit application with attached documents & consent
      const finalized = await applicationService.submitApplication({
        applicationId: app.application_id,
        applicationData: formData,
        documents,
        consent,
        actorRole: 'Citizen',
        actorName: 'Citizen'
      });

      setSubmittedApp(finalized);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-slate-600">Loading scheme application details...</p>
      </div>
    );
  }

  if (error && !scheme) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={() => navigate(-1)} className="mt-4 text-xs font-semibold text-slate-700 underline">
          Go back
        </button>
      </div>
    );
  }

  // Submitted Success Confirmation View
  if (submittedApp) {
    const isExternal = submittedApp.application_mode === 'EXTERNAL';

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isExternal ? 'Redirected to Official Portal' : 'Application Submitted Successfully'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isExternal 
                ? 'Your external referral has been recorded in Kutumb Setu for progress tracking.'
                : 'Your scheme application has been registered and routed to verification officers.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Application Reference:</span>
              <span className="font-mono font-bold text-slate-900">{submittedApp.application_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scheme:</span>
              <span className="font-semibold text-slate-900">{scheme?.name} ({scheme?.scheme_code})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {submittedApp.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Timestamp:</span>
              <span className="text-slate-700">{new Date(submittedApp.created_at).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/citizen/dashboard"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Back to Citizen Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedMember = family?.members?.find(m => m.person_id === selectedMemberId);
  const isReqComplete = checkRequirementsCompletion(scheme, formData, documents).isComplete;
  const isSubmitDisabled = submitting || duplicateCheck.isDuplicate || !consent || !isReqComplete;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Top navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {scheme.department} Department
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">{scheme.scope} Scheme</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Apply for {scheme.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              {scheme.description}
            </p>
          </div>

          <div className="shrink-0">
            {routeInfo && <ApplicationRouteChip route={routeInfo.route} />}
          </div>
        </div>

        {scheme.benefit_description && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Benefit Entitlement:</strong> {scheme.benefit_description}</span>
          </div>
        )}
      </div>

      {/* Duplicate Prevention Alert */}
      {duplicateCheck.isDuplicate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">Application Restricted</h4>
            <p className="text-xs text-amber-800">{duplicateCheck.message}</p>
            <p className="text-[11px] text-amber-700">
              Under Gujarat state scheme rules, duplicate benefit enrollments and redundant concurrent applications are automatically blocked.
            </p>
          </div>
        </div>
      )}

      {/* Subject Selection (for Individual Schemes) */}
      {scheme.scope === 'INDIVIDUAL' && family?.members?.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Select Beneficiary Family Member
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {family.members.map(member => {
              const isSelected = member.person_id === selectedMemberId;
              return (
                <button
                  key={member.person_id}
                  type="button"
                  onClick={() => handleMemberChange(member.person_id)}
                  className={`p-3 text-left border rounded-lg transition-all ${
                    isSelected 
                      ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800/10' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-900">
                    {member.canonical_name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {member.relationship} • {member.gender || 'Unknown'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ROUTE C: External Referral Card */}
      {routeInfo?.route === APPLICATION_ROUTES.EXTERNAL_PORTAL ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Official Department Portal Required</span>
            </div>
            <p className="text-xs text-slate-600">
              Applications for {scheme.name} are officially administered through the Gujarat Department portal. 
              Clicking below will record an in-progress referral in Kutumb Setu and open the official submission portal.
            </p>
          </div>

          {/* Requirements to have ready */}
          {(scheme.required_information?.length > 0 || scheme.required_documents?.length > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <h5 className="text-xs font-bold text-slate-800">Have these documents ready:</h5>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                {scheme.required_documents?.map(d => (
                  <li key={d.key}><strong>{d.label || d.key}</strong></li>
                ))}
                {scheme.required_information?.map(i => (
                  <li key={i.key}><strong>{i.label || i.key}</strong></li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={submitting || duplicateCheck.isDuplicate}
              onClick={handleRouteCReferral}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-[#1F3A5F] text-white rounded-lg text-xs font-semibold hover:bg-[#152842] transition-colors shadow-sm disabled:opacity-50"
            >
              <span>Apply on Official Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* ROUTE A & B: Internal Application Form */
        <form onSubmit={handleSubmitInternal} className="space-y-6">
          {/* Pre-filled Subject Verification Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Pre-filled Citizen Profile (Kutumb Setu Verified Data)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Beneficiary Name:</span>
                <span className="font-semibold text-slate-900">
                  {scheme.scope === 'FAMILY' ? 'Patel Family Unit' : (selectedMember?.canonical_name || 'Selected Member')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Family ID:</span>
                <span className="font-mono font-semibold text-slate-900">{family.family_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Ration Card Reference:</span>
                <span className="font-mono font-semibold text-slate-900">{family.household_ref || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Household Income:</span>
                <span className="font-semibold text-slate-900">
                  {family.household_income != null ? `₹${Number(family.household_income).toLocaleString('en-IN')}` : 'Not recorded'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">District:</span>
                <span className="font-semibold text-slate-900">{family.district || 'Gujarat'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Verification Status:</span>
                <span className="font-semibold text-emerald-700">Verified by Food/Health Dept</span>
              </div>
            </div>
          </div>

          {/* Route B: Additional Information & Documents Checklist */}
          {(scheme.required_information?.length > 0 || scheme.required_documents?.length > 0) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Additional Scheme Requirements
              </h3>

              <RequirementsChecklist
                scheme={scheme}
                formData={formData}
                onFormDataChange={setFormData}
                documents={documents}
                onDocumentsChange={setDocuments}
              />
            </div>
          )}

          {/* Consent Checkbox (§12) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={duplicateCheck.isDuplicate}
                className="mt-0.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I confirm these details and consent to their use for this application under the Government of Gujarat Kutumb Setu scheme rules. 
                I declare that the information provided is accurate and verifiable.
              </span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="px-6 py-2 bg-[#1F3A5F] text-white rounded-lg text-xs font-semibold hover:bg-[#152842] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
