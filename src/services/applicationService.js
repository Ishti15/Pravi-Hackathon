import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';
import { schemeService } from './schemeService';
import {
  APPLICATION_STATUSES,
  ENROLLMENT_STATUSES,
  validateTransition,
  checkDuplicateApplication,
  checkRequirementsCompletion,
  calculateRenewalDate
} from '../lib/applicationFlow';

export const applicationService = {
  /**
   * Get applications matching optional filters
   */
  async getApplications({ familyId = null, subjectId = null, schemeCode = null, status = null } = {}) {
    let applications = [...memoryStore.applications];

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('application').select('*');
        if (familyId) query = query.eq('family_id', familyId);
        if (subjectId) query = query.eq('subject_id', subjectId);
        if (schemeCode) query = query.eq('scheme_code', schemeCode);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (!error && data) {
          const map = new Map();
          applications.forEach(a => map.set(a.application_id, a));
          data.forEach(a => map.set(a.application_id, a));
          applications = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Supabase fetch applications error:', err.message);
      }
    }

    if (familyId) applications = applications.filter(a => a.family_id === familyId);
    if (subjectId) applications = applications.filter(a => a.subject_id === subjectId);
    if (schemeCode) applications = applications.filter(a => a.scheme_code === schemeCode);
    if (status) applications = applications.filter(a => a.status === status);

    return applications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Get single application by ID with attached documents
   */
  async getApplicationById(applicationId) {
    const apps = await this.getApplications();
    const app = apps.find(a => a.application_id === applicationId) || null;
    if (!app) return null;

    // Attach documents
    let documents = memoryStore.documents.filter(d => d.application_id === applicationId);

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('document').select('*').eq('application_id', applicationId);
        if (data) {
          const map = new Map();
          documents.forEach(d => map.set(d.doc_id, d));
          data.forEach(d => map.set(d.doc_id, d));
          documents = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Supabase fetch documents error:', err.message);
      }
    }

    return {
      ...app,
      documents
    };
  },

  /**
   * Starts a draft application (Route A / B) (§12)
   * Enforces duplicate benefit prevention.
   */
  async startApplication({
    schemeCode,
    subjectId,
    subjectType = 'PERSON',
    familyId = null,
    initialData = {},
    actorRole = 'Citizen',
    actorName = 'Citizen'
  }) {
    const scheme = await schemeService.getSchemeByCode(schemeCode);
    if (!scheme) throw new Error(`Scheme ${schemeCode} not found.`);

    // 1. Enforce duplicate check
    const existingEnrollments = await schemeService.getEnrollments();
    const existingApps = await this.getApplications();

    const dupCheck = checkDuplicateApplication(existingEnrollments, existingApps, scheme, subjectId);
    if (dupCheck.isDuplicate) {
      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'DUPLICATE_BENEFIT_BLOCKED',
        entity_type: 'SCHEME',
        entity_id: schemeCode,
        details: {
          scheme_code: schemeCode,
          subject_id: subjectId,
          subject_type: subjectType,
          reason: dupCheck.reason,
          message: dupCheck.message
        }
      });
      throw new Error(dupCheck.message);
    }

    const applicationId = memoryStore.getNextApplicationId();
    const newApp = {
      application_id: applicationId,
      scheme_code: schemeCode,
      subject_type: subjectType,
      subject_id: subjectId,
      family_id: familyId,
      application_mode: scheme.application_mode || 'INTERNAL',
      status: APPLICATION_STATUSES.STARTED,
      application_data: initialData || {},
      consent_given: false,
      consent_timestamp: null,
      officer_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.applications.push(newApp);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('application').insert([newApp]);
      } catch (err) {
        console.warn('Supabase startApplication error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'APPLICATION_STARTED',
      entity_type: 'APPLICATION',
      entity_id: applicationId,
      details: {
        scheme_code: schemeCode,
        subject_id: subjectId,
        subject_type: subjectType
      }
    });

    return newApp;
  },

  /**
   * Submits an application (Route A / B) (§12)
   * Validates required info & documents, sets SUBMITTED, updates audit log, triggers evaluateAll.
   */
  async submitApplication({
    applicationId,
    applicationData = {},
    documents = [],
    consent = true,
    actorRole = 'Citizen',
    actorName = 'Citizen'
  }) {
    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    const scheme = await schemeService.getSchemeByCode(app.scheme_code);

    // Validate completion of requirements
    const mergedData = { ...(app.application_data || {}), ...applicationData };
    const mergedDocs = [...(app.documents || []), ...documents];

    const reqCheck = checkRequirementsCompletion(scheme, mergedData, mergedDocs);
    const transitionCheck = validateTransition({
      currentStatus: app.status,
      nextStatus: APPLICATION_STATUSES.SUBMITTED,
      actorRole,
      hasMissingRequirements: !reqCheck.isComplete
    });

    if (!transitionCheck.valid) {
      throw new Error(transitionCheck.error);
    }

    if (!consent) {
      throw new Error('Citizen consent is required to submit application.');
    }

    // Save attached documents
    const newDocEntities = documents.map(d => ({
      doc_id: d.doc_id || crypto.randomUUID(),
      application_id: applicationId,
      person_id: app.subject_type === 'PERSON' ? app.subject_id : null,
      doc_type: d.doc_type || d.key,
      file_name: d.file_name || `${d.doc_type}.pdf`,
      file_size: d.file_size || 102400,
      uploaded_at: new Date().toISOString()
    }));

    if (newDocEntities.length > 0) {
      memoryStore.documents.push(...newDocEntities);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('document').insert(newDocEntities);
        } catch (err) {
          console.warn('Supabase document insert error:', err.message);
        }
      }
    }

    // Update application
    app.status = APPLICATION_STATUSES.SUBMITTED;
    app.application_data = mergedData;
    app.consent_given = true;
    app.consent_timestamp = new Date().toISOString();
    app.updated_at = new Date().toISOString();

    const memIdx = memoryStore.applications.findIndex(a => a.application_id === applicationId);
    if (memIdx !== -1) memoryStore.applications[memIdx] = app;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('application')
          .update({
            status: APPLICATION_STATUSES.SUBMITTED,
            application_data: app.application_data,
            consent_given: true,
            consent_timestamp: app.consent_timestamp,
            updated_at: app.updated_at
          })
          .eq('application_id', applicationId);
      } catch (err) {
        console.warn('Supabase submitApplication error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'APPLICATION_SUBMITTED',
      entity_type: 'APPLICATION',
      entity_id: applicationId,
      details: {
        scheme_code: app.scheme_code,
        subject_id: app.subject_id,
        documents_count: newDocEntities.length
      }
    });

    // Re-evaluate to clear gaps and update matrix
    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-submission evaluation error:', err.message);
    }

    return app;
  },

  /**
   * Records an external portal referral (Route C) (§12)
   * Sets status REFERRED, logs EXTERNAL_REFERRAL, triggers evaluateAll.
   */
  async recordExternalReferral({
    schemeCode,
    subjectId,
    subjectType = 'FAMILY',
    familyId = null,
    actorRole = 'Citizen',
    actorName = 'Citizen'
  }) {
    const scheme = await schemeService.getSchemeByCode(schemeCode);
    if (!scheme) throw new Error(`Scheme ${schemeCode} not found.`);

    // Check duplicate
    const existingEnrollments = await schemeService.getEnrollments();
    const existingApps = await this.getApplications();
    const dupCheck = checkDuplicateApplication(existingEnrollments, existingApps, scheme, subjectId);
    if (dupCheck.isDuplicate) {
      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'DUPLICATE_BENEFIT_BLOCKED',
        entity_type: 'SCHEME',
        entity_id: schemeCode,
        details: {
          scheme_code: schemeCode,
          subject_id: subjectId,
          reason: dupCheck.reason,
          message: dupCheck.message
        }
      });
      throw new Error(dupCheck.message);
    }

    const applicationId = memoryStore.getNextApplicationId();
    const referralApp = {
      application_id: applicationId,
      scheme_code: schemeCode,
      subject_type: subjectType,
      subject_id: subjectId,
      family_id: familyId,
      application_mode: 'EXTERNAL',
      status: APPLICATION_STATUSES.REFERRED,
      application_data: {
        official_portal_url: scheme.official_application_url || null,
        referred_at: new Date().toISOString()
      },
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      officer_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.applications.push(referralApp);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('application').insert([referralApp]);
      } catch (err) {
        console.warn('Supabase recordExternalReferral error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'EXTERNAL_REFERRAL',
      entity_type: 'APPLICATION',
      entity_id: applicationId,
      details: {
        scheme_code: schemeCode,
        subject_id: subjectId,
        subject_type: subjectType,
        official_portal_url: scheme.official_application_url
      }
    });

    // Re-evaluate to clear gap and update matrix to IN_PROGRESS
    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-referral evaluation error:', err.message);
    }

    return referralApp;
  },

  /**
   * Officer review: Start verification, Approve, or Reject (§12)
   */
  async reviewApplication({
    applicationId,
    action, // 'START_VERIFICATION' | 'APPROVE' | 'REJECT'
    note = '',
    actorRole = 'Officer',
    actorName = 'Officer'
  }) {
    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found.`);

    let nextStatus;
    if (action === 'START_VERIFICATION') nextStatus = APPLICATION_STATUSES.UNDER_VERIFICATION;
    else if (action === 'APPROVE') nextStatus = APPLICATION_STATUSES.APPROVED;
    else if (action === 'REJECT') nextStatus = APPLICATION_STATUSES.REJECTED;
    else throw new Error(`Unsupported review action "${action}".`);

    const validation = validateTransition({
      currentStatus: app.status,
      nextStatus,
      actorRole,
      note
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    app.status = nextStatus;
    app.officer_note = note || null;
    app.updated_at = new Date().toISOString();

    const memIdx = memoryStore.applications.findIndex(a => a.application_id === applicationId);
    if (memIdx !== -1) memoryStore.applications[memIdx] = app;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('application')
          .update({
            status: nextStatus,
            officer_note: app.officer_note,
            updated_at: app.updated_at
          })
          .eq('application_id', applicationId);
      } catch (err) {
        console.warn('Supabase reviewApplication error:', err.message);
      }
    }

    let createdEnrollment = null;

    // On APPROVED -> Create ENROLLED enrollment
    if (nextStatus === APPLICATION_STATUSES.APPROVED) {
      const enrollment = {
        enrollment_id: crypto.randomUUID(),
        scheme_code: app.scheme_code,
        subject_type: app.subject_type,
        subject_id: app.subject_id,
        family_id: app.family_id,
        status: ENROLLMENT_STATUSES.ENROLLED,
        source: 'APPLICATION',
        source_department: null,
        application_id: applicationId,
        enrolled_at: new Date().toISOString(),
        last_benefit_date: null,
        next_renewal_date: null
      };

      memoryStore.enrollments.push(enrollment);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('enrollment').insert([enrollment]);
        } catch (err) {
          console.warn('Supabase enrollment insert error:', err.message);
        }
      }

      createdEnrollment = enrollment;

      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'APPLICATION_APPROVED',
        entity_type: 'APPLICATION',
        entity_id: applicationId,
        details: {
          scheme_code: app.scheme_code,
          subject_id: app.subject_id,
          enrollment_id: enrollment.enrollment_id
        }
      });
    } else if (nextStatus === APPLICATION_STATUSES.REJECTED) {
      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'APPLICATION_REJECTED',
        entity_type: 'APPLICATION',
        entity_id: applicationId,
        details: {
          scheme_code: app.scheme_code,
          subject_id: app.subject_id,
          note
        }
      });
    } else {
      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'APPLICATION_STATUS_UPDATED',
        entity_type: 'APPLICATION',
        entity_id: applicationId,
        details: {
          scheme_code: app.scheme_code,
          subject_id: app.subject_id,
          from_status: app.status,
          to_status: nextStatus
        }
      });
    }

    // Re-evaluate eligibility and matrix
    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-review evaluation error:', err.message);
    }

    return { application: app, enrollment: createdEnrollment };
  },

  /**
   * Officer marks benefit delivered: sets ACTIVE and calculates renewal date (§12)
   */
  async markBenefitDelivered({
    enrollmentId,
    actorRole = 'Officer',
    actorName = 'Officer'
  }) {
    let enrollment = memoryStore.enrollments.find(e => e.enrollment_id === enrollmentId);
    if (!enrollment && isSupabaseConfigured) {
      const { data } = await supabase.from('enrollment').select('*').eq('enrollment_id', enrollmentId).single();
      if (data) enrollment = data;
    }

    if (!enrollment) throw new Error(`Enrollment ${enrollmentId} not found.`);

    const scheme = await schemeService.getSchemeByCode(enrollment.scheme_code);
    const today = new Date().toISOString().split('T')[0];
    const renewalDate = calculateRenewalDate(today, scheme?.renewal_months || 12);

    enrollment.status = ENROLLMENT_STATUSES.ACTIVE;
    enrollment.last_benefit_date = today;
    enrollment.next_renewal_date = renewalDate;

    const memIdx = memoryStore.enrollments.findIndex(e => e.enrollment_id === enrollmentId);
    if (memIdx !== -1) memoryStore.enrollments[memIdx] = enrollment;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('enrollment')
          .update({
            status: ENROLLMENT_STATUSES.ACTIVE,
            last_benefit_date: today,
            next_renewal_date: renewalDate
          })
          .eq('enrollment_id', enrollmentId);
      } catch (err) {
        console.warn('Supabase markBenefitDelivered error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'BENEFIT_DELIVERED',
      entity_type: 'ENROLLMENT',
      entity_id: enrollmentId,
      details: {
        scheme_code: enrollment.scheme_code,
        subject_id: enrollment.subject_id,
        last_benefit_date: today,
        next_renewal_date: renewalDate
      }
    });

    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-benefit-delivery evaluation error:', err.message);
    }

    return enrollment;
  }
};
