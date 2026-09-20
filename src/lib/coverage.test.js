import { describe, it, expect } from 'vitest';
import { calculateSchemeCoverage, findRenewalsDue } from './coverage';

describe('Task 9 — Pure Coverage & Renewals Due Calculations (§11, §15)', () => {
  const sampleSchemes = [
    { scheme_code: 'STU-EDU', name: 'Student Education Assistance', department: 'Education', scope: 'INDIVIDUAL' },
    { scheme_code: 'FAM-HEALTH', name: 'Family Health Cover', department: 'Health', scope: 'FAMILY' }
  ];

  it('calculates coverage percentage as enrolled / (enrolled + gaps)', () => {
    const enrollments = [
      { scheme_code: 'STU-EDU', status: 'ENROLLED', subject_id: 'P1' },
      { scheme_code: 'STU-EDU', status: 'ACTIVE', subject_id: 'P2' }
    ];
    const gaps = [
      { scheme_code: 'STU-EDU', subject_id: 'P3' },
      { scheme_code: 'STU-EDU', subject_id: 'P4' }
    ];

    const result = calculateSchemeCoverage({
      schemes: sampleSchemes,
      enrollments,
      gaps
    });

    const edu = result.find(r => r.scheme_code === 'STU-EDU');
    expect(edu.enrolled).toBe(2);
    expect(edu.gaps).toBe(2);
    // 2 / (2 + 2) = 50%
    expect(edu.coverage_pct).toBe(50);
  });

  it('returns 0% coverage when denominator is 0 (no enrolled and no gaps)', () => {
    const result = calculateSchemeCoverage({
      schemes: sampleSchemes,
      enrollments: [],
      gaps: []
    });

    const health = result.find(r => r.scheme_code === 'FAM-HEALTH');
    expect(health.enrolled).toBe(0);
    expect(health.gaps).toBe(0);
    expect(health.coverage_pct).toBe(0);
  });

  it('filters metrics by district when districtFilter is applied', () => {
    const enrollments = [
      { scheme_code: 'STU-EDU', status: 'ENROLLED', subject_id: 'P1' },
      { scheme_code: 'STU-EDU', status: 'ENROLLED', subject_id: 'P2' }
    ];
    const subjectDistrictMap = new Map([
      ['P1', 'Gandhinagar'],
      ['P2', 'Ahmedabad']
    ]);

    const result = calculateSchemeCoverage({
      schemes: sampleSchemes,
      enrollments,
      gaps: [],
      districtFilter: 'Gandhinagar',
      subjectDistrictMap
    });

    const edu = result.find(r => r.scheme_code === 'STU-EDU');
    expect(edu.enrolled).toBe(1);
  });

  it('identifies renewals due within the window days', () => {
    const enrollments = [
      {
        enrollment_id: 'E1',
        scheme_code: 'STU-EDU',
        status: 'ENROLLED',
        next_renewal_date: '2024-10-15' // within 15 days of 2024-10-01
      },
      {
        enrollment_id: 'E2',
        scheme_code: 'FAM-HEALTH',
        status: 'ENROLLED',
        next_renewal_date: '2025-05-01' // way out
      },
      {
        enrollment_id: 'E3',
        scheme_code: 'HOUSING',
        status: 'ENROLLED',
        next_renewal_date: '2024-09-20' // overdue
      }
    ];

    const dues = findRenewalsDue(enrollments, '2024-10-01', 30);
    expect(dues.length).toBe(2);
    expect(dues.some(d => d.enrollment_id === 'E1')).toBe(true);
    expect(dues.some(d => d.enrollment_id === 'E3')).toBe(true);
    expect(dues.some(d => d.enrollment_id === 'E2')).toBe(false);
  });
});
