import { familyService } from './familyService';
import { personService } from './personService';
import { schemeService } from './schemeService';
import { applicationService } from './applicationService';
import { ingestionService } from './ingestionService';
import { memoryStore } from './dbStore';
import { calculateSchemeCoverage, findRenewalsDue } from '../lib/coverage';

export const dashboardService = {
  /**
   * Aggregates stats, metrics, and chart datasets for Officer Dashboard (§15)
   */
  async getOfficerDashboardStats() {
    const [
      families,
      persons,
      schemes,
      enrollments,
      applications,
      gaps,
      eligibilityResults,
      batches,
      matchReviews
    ] = await Promise.all([
      familyService.getRawFamilies(),
      personService.getPersons(),
      schemeService.getSchemes(),
      schemeService.getEnrollments(),
      applicationService.getApplications(),
      schemeService.getBenefitGaps(),
      schemeService.getEligibilityResults(),
      ingestionService.getBatches(),
      personService.getMatchReviews()
    ]);

    // 1. Build subject district map
    const subjectDistrictMap = new Map();
    families.forEach(f => {
      if (f.district) subjectDistrictMap.set(f.family_id, f.district);
    });

    // Map family members to their family district
    if (memoryStore.familyMembers) {
      memoryStore.familyMembers.forEach(m => {
        const fam = families.find(f => f.family_id === m.family_id);
        if (fam?.district) subjectDistrictMap.set(m.person_id, fam.district);
      });
    }

    // 2. Compute Core Stat Card numbers
    const totalFamilies = families.length;
    const totalPersons = persons.length;
    const verifiedPersons = persons.filter(p => p.identity_status === 'VERIFIED').length;

    // Active enrollments
    const activeEnrollmentStatuses = new Set(['ENROLLED', 'BENEFIT_DELIVERED', 'ACTIVE', 'RENEWAL_DUE']);
    const activeEnrollments = enrollments.filter(e => activeEnrollmentStatuses.has(e.status));
    const activeBeneficiaries = new Set(activeEnrollments.map(e => e.subject_id)).size;

    // Potential beneficiaries
    const potentialResults = eligibilityResults.filter(r => r.status === 'POTENTIALLY_ELIGIBLE');
    const potentialBeneficiaries = new Set(potentialResults.map(r => r.subject_id)).size;

    // Pending applications
    const pendingApplications = applications.filter(a => 
      a.status === 'SUBMITTED' || a.status === 'UNDER_VERIFICATION'
    ).length;

    // Renewals due within 30 days
    const renewalsDueList = findRenewalsDue(enrollments, new Date(), 30);
    const renewalsDue = renewalsDueList.length;

    // Benefit gaps count
    const benefitGaps = gaps.length;

    // Open data conflicts (Task 12, empty for now)
    const openConflicts = memoryStore.dataConflicts 
      ? memoryStore.dataConflicts.filter(c => c.status === 'OPEN').length 
      : 0;

    // Pending reviews chip
    const pendingReviews = matchReviews.filter(r => r.status === 'PENDING').length;

    // Last ingestion result
    const lastIngestion = batches.length > 0 ? batches[0] : null;

    // 3. Compute Chart Datasets

    // A. Coverage by Scheme (enrolled vs gaps)
    const schemeCoverage = calculateSchemeCoverage({
      schemes,
      enrollments,
      gaps,
      applications,
      eligibilityResults,
      districtFilter: 'ALL',
      subjectDistrictMap
    });

    const coverageByScheme = schemeCoverage.map(sc => ({
      name: sc.scheme_code,
      fullName: sc.name,
      enrolled: sc.enrolled,
      gaps: sc.gaps,
      coveragePct: sc.coverage_pct
    }));

    // B. Applications by Status
    const statusCounts = {
      SUBMITTED: 0,
      UNDER_VERIFICATION: 0,
      APPROVED: 0,
      REJECTED: 0,
      REFERRED: 0
    };
    applications.forEach(a => {
      if (statusCounts[a.status] != null) statusCounts[a.status]++;
    });

    const applicationsByStatus = [
      { status: 'Submitted', count: statusCounts.SUBMITTED, color: '#3B82F6' },
      { status: 'Under Verification', count: statusCounts.UNDER_VERIFICATION, color: '#F59E0B' },
      { status: 'Approved', count: statusCounts.APPROVED, color: '#10B981' },
      { status: 'Referred (Portal)', count: statusCounts.REFERRED, color: '#8B5CF6' },
      { status: 'Rejected', count: statusCounts.REJECTED, color: '#EF4444' }
    ];

    // C. Families by District
    const districtCounts = {};
    families.forEach(f => {
      const d = f.district || 'Unassigned';
      districtCounts[d] = (districtCounts[d] || 0) + 1;
    });

    const familiesByDistrict = Object.entries(districtCounts).map(([district, count]) => ({
      district,
      families: count
    })).sort((a, b) => b.families - a.families);

    // D. Benefit Gaps by Scheme
    const gapsByScheme = schemes.map(s => ({
      scheme: s.scheme_code,
      gaps: gaps.filter(g => g.scheme_code === s.scheme_code).length
    }));

    // E. Beneficiaries by Scheme
    const beneficiariesByScheme = schemes.map(s => ({
      scheme: s.scheme_code,
      beneficiaries: activeEnrollments.filter(e => e.scheme_code === s.scheme_code).length
    }));

    return {
      totalFamilies,
      totalPersons,
      verifiedPersons,
      activeBeneficiaries,
      potentialBeneficiaries,
      pendingApplications,
      renewalsDue,
      benefitGaps,
      openConflicts,
      pendingReviews,
      lastIngestion,
      charts: {
        coverageByScheme,
        applicationsByStatus,
        familiesByDistrict,
        gapsByScheme,
        beneficiariesByScheme
      }
    };
  },

  /**
   * Get scheme coverage details and renewals due list with optional district filter (§11, §15)
   */
  async getSchemeCoverageData({ district = 'ALL' } = {}) {
    const [
      families,
      schemes,
      enrollments,
      applications,
      gaps,
      eligibilityResults,
      persons
    ] = await Promise.all([
      familyService.getRawFamilies(),
      schemeService.getSchemes(),
      schemeService.getEnrollments(),
      applicationService.getApplications(),
      schemeService.getBenefitGaps(),
      schemeService.getEligibilityResults(),
      personService.getPersons()
    ]);

    // Build subject to district map
    const subjectDistrictMap = new Map();
    families.forEach(f => {
      if (f.district) subjectDistrictMap.set(f.family_id, f.district);
    });

    if (memoryStore.familyMembers) {
      memoryStore.familyMembers.forEach(m => {
        const fam = families.find(f => f.family_id === m.family_id);
        if (fam?.district) subjectDistrictMap.set(m.person_id, fam.district);
      });
    }

    const coverage = calculateSchemeCoverage({
      schemes,
      enrollments,
      gaps,
      applications,
      eligibilityResults,
      districtFilter: district,
      subjectDistrictMap
    });

    // Renewals due
    const personMap = new Map(persons.map(p => [p.person_id, p]));
    const familyMap = new Map(families.map(f => [f.family_id, f]));

    const filteredEnrollments = district === 'ALL'
      ? enrollments
      : enrollments.filter(e => {
          const dist = subjectDistrictMap.get(e.subject_id || e.family_id);
          return dist && dist.toLowerCase() === district.toLowerCase();
        });

    const renewalsDueRaw = findRenewalsDue(filteredEnrollments, new Date(), 30);
    const renewalsDue = renewalsDueRaw.map(r => {
      const isFamily = r.subject_type === 'FAMILY';
      const subjectName = isFamily 
        ? 'Family Unit' 
        : (personMap.get(r.subject_id)?.canonical_name || r.subject_id);
      const fam = familyMap.get(r.family_id);

      return {
        ...r,
        subject_name: subjectName,
        district: fam?.district || 'Unknown',
        household_ref: fam?.household_ref || '—'
      };
    });

    // District list for filter dropdown
    const availableDistricts = Array.from(new Set(families.map(f => f.district).filter(Boolean))).sort();

    return {
      coverage,
      renewalsDue,
      availableDistricts
    };
  }
};
