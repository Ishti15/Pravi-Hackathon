// In-memory data store fallback & state manager for local prototype mode
export const initialSchemes = [
  {
    scheme_code: 'STU-EDU',
    name: 'Student Education Assistance',
    department: 'Education',
    description: 'Financial support for school students in low-income families.',
    scope: 'INDIVIDUAL',
    rule: {
      logic: 'ALL',
      conditions: [
        { fact: 'age', op: 'between', value: [6, 18], label: 'Age between 6 and 18' },
        { fact: 'is_student', op: 'eq', value: true, label: 'Currently a student' },
        { fact: 'family_income', op: 'lt', value: 300000, label: 'Family income below ₹3,00,000', needs_verified: true }
      ]
    },
    application_mode: 'INTERNAL',
    official_application_url: null,
    required_information: [],
    required_documents: [],
    benefit_description: 'Annual scholarship of ₹12,000 per eligible student.',
    renewal_months: 12,
    active: true
  },
  {
    scheme_code: 'GIRL-CHILD',
    name: 'Girl Child Support',
    department: 'Social Welfare',
    description: 'Financial assistance and health grant for minor girls.',
    scope: 'INDIVIDUAL',
    rule: {
      logic: 'ALL',
      conditions: [
        { fact: 'gender', op: 'eq', value: 'F', label: 'Female gender' },
        { fact: 'age', op: 'lt', value: 18, label: 'Age under 18' },
        { fact: 'family_income', op: 'lt', value: 300000, label: 'Family income below ₹3,00,000', needs_verified: true }
      ]
    },
    application_mode: 'INTERNAL',
    official_application_url: null,
    required_information: [
      { key: 'bank_account_last4', label: 'Bank Account (Last 4 Digits)', source: 'USER_INPUT' }
    ],
    required_documents: [
      { key: 'birth_certificate', label: 'Birth Certificate' }
    ],
    benefit_description: 'Monthly benefit of ₹1,500 for education & health needs.',
    renewal_months: 12,
    active: true
  },
  {
    scheme_code: 'FAM-HEALTH',
    name: 'Family Health Cover',
    department: 'Health',
    description: 'Comprehensive health insurance for vulnerable households.',
    scope: 'FAMILY',
    rule: {
      logic: 'ALL',
      conditions: [
        { fact: 'family_income', op: 'lt', value: 500000, label: 'Family income below ₹5,00,000', needs_verified: true }
      ]
    },
    application_mode: 'INTERNAL',
    official_application_url: null,
    required_information: [],
    required_documents: [],
    benefit_description: 'Cashless health coverage up to ₹5,00,000 per family per year.',
    renewal_months: 12,
    active: true
  },
  {
    scheme_code: 'FOOD-SEC',
    name: 'Food Security Support',
    department: 'Food & Civil Supplies',
    description: 'Subsidized food grains for low-income or priority card families.',
    scope: 'FAMILY',
    rule: {
      logic: 'ANY',
      conditions: [
        { fact: 'family_income', op: 'lt', value: 250000, label: 'Family income below ₹2,50,000', needs_verified: true },
        { fact: 'card_type', op: 'eq', value: 'PRIORITY', label: 'Priority ration card holder' }
      ]
    },
    application_mode: 'INTERNAL',
    official_application_url: null,
    required_information: [],
    required_documents: [],
    benefit_description: 'Monthly quota of subsidized food grains per household.',
    renewal_months: 12,
    active: true
  },
  {
    scheme_code: 'HOUSING',
    name: 'Housing Assistance',
    department: 'Housing',
    description: 'Financial assistance to build permanent housing for families with Kutcha/No houses.',
    scope: 'FAMILY',
    rule: {
      logic: 'ALL',
      conditions: [
        { fact: 'housing_status', op: 'in', value: ['KUTCHA', 'NONE'], label: 'Housing status Kutcha or None' },
        { fact: 'family_income', op: 'lt', value: 300000, label: 'Family income below ₹3,00,000', needs_verified: true }
      ]
    },
    application_mode: 'EXTERNAL',
    official_application_url: 'https://example.org/official-portal/housing',
    required_information: [
      { key: 'land_ownership', label: 'Land Ownership Details', source: 'USER_INPUT' }
    ],
    required_documents: [
      { key: 'house_photo', label: 'Current House Photograph' },
      { key: 'income_certificate', label: 'Income Certificate' }
    ],
    benefit_description: 'One-time financial grant of ₹1,20,000 for house construction.',
    renewal_months: 36,
    active: true
  },
  {
    scheme_code: 'LABOUR-WELFARE',
    name: 'Registered Worker Welfare',
    department: 'Labour',
    description: 'Welfare scheme and safety kit support for registered workers.',
    scope: 'INDIVIDUAL',
    rule: {
      logic: 'ALL',
      conditions: [
        { fact: 'age', op: 'between', value: [18, 60], label: 'Age between 18 and 60' },
        { fact: 'occupation', op: 'in', value: ['LABOUR', 'WORKER', 'CONSTRUCTION', 'FACTORY', 'DAILY_WAGER', 'AGRICULTURAL_LABOUR'], label: 'Registered worker category' }
      ]
    },
    application_mode: 'EXTERNAL',
    official_application_url: 'https://example.org/official-portal/labour-welfare',
    required_information: [
      { key: 'trade_union_no', label: 'Trade Union / Registration Number', source: 'USER_INPUT' }
    ],
    required_documents: [
      { key: 'worker_id_card', label: 'Worker ID Card / Passbook' }
    ],
    benefit_description: 'Annual worker welfare stipend of ₹5,000 and safety equipment kit.',
    renewal_months: 12,
    active: true
  }
];

class MemoryStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.persons = [];
    this.sourceRecords = [];
    this.ingestionBatches = [];
    this.matchReviews = [];
    this.families = [];
    this.familyMembers = [];
    this.schemes = [...initialSchemes];
    this.eligibilityResults = [];
    this.applications = [];
    this.enrollments = [];
    this.dataConflicts = [];
    this.changeRequests = [];
    this.identityVerifications = [];
    this.documents = [];
    this.auditLogs = [];
    this.lastResetAt = new Date(Date.now() - 1000).toISOString();
    
    this.personSeq = 1;
    this.familySeq = 1;
    this.applicationSeq = 1;
  }

  getNextPersonId() {
    const id = `P${String(this.personSeq).padStart(6, '0')}`;
    this.personSeq++;
    return id;
  }

  getNextFamilyId() {
    const id = `FAM-GJ-${String(this.familySeq).padStart(6, '0')}`;
    this.familySeq++;
    return id;
  }

  getNextApplicationId() {
    const id = `APP-GJ-${String(this.applicationSeq).padStart(6, '0')}`;
    this.applicationSeq++;
    return id;
  }
}

export const memoryStore = new MemoryStore();
