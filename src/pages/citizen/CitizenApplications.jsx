import React, { useState, useEffect } from 'react';
import { useDemoSession } from '../../session/DemoSessionContext';
import { familyService } from '../../services/familyService';
import { applicationService } from '../../services/applicationService';
import PageHeader from '../../components/PageHeader';
import { FileText, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react';

export default function CitizenApplications() {
  const { session } = useDemoSession();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [session]);

  async function loadApplications() {
    try {
      const familyProfile = await familyService.getFamilyByMemberId(session.userId);
      if (familyProfile) {
        const apps = await applicationService.getApplications({ familyId: familyProfile.family_id });
        setApplications(apps);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'ENROLLED':
      case 'DELIVERED':
      case 'ACTIVE':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'REJECTED':
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'REFERRED':
        return <ExternalLink className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'ENROLLED':
      case 'DELIVERED':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'REFERRED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Applications" 
        description="Track the status of your submitted and referred scheme applications." 
      />

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading applications...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          {applications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Applications Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                You haven't submitted any applications yet. Go to the Benefits tab to explore available schemes and apply.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app.application_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      {getStatusIcon(app.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {app.application_id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(app.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-sm text-slate-900 mt-1">
                        Scheme: {app.scheme_code}
                      </h4>
                      
                      <div className="text-xs text-slate-600 mt-1">
                        Applicant: <strong className="text-slate-800">{app.applicant_person_id}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2 md:pl-4 md:border-l border-slate-100">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(app.status)}`}>
                      {app.status.replace('_', ' ')}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Mode: {app.application_mode.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
