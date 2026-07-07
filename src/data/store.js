// Collection keys in localStorage
const KEYS = {
  freelancers: 'fh_freelancers',
  jobs: 'fh_jobs',
  contracts: 'fh_contracts',
  acceptanceReports: 'fh_acceptance_reports',
  paymentSchedules: 'fh_payment_schedules'
};

// Generic helpers
function getCollection(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return [];
  }
}

function saveCollection(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return crypto.randomUUID();
}

// ========== Freelancers ==========
export function getFreelancers() {
  return getCollection(KEYS.freelancers);
}

export function getFreelancerById(id) {
  return getFreelancers().find(f => f.id === id) || null;
}

export function saveFreelancer(freelancer) {
  const all = getFreelancers();
  if (freelancer.id) {
    const index = all.findIndex(f => f.id === freelancer.id);
    if (index >= 0) {
      all[index] = { ...all[index], ...freelancer, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...freelancer, createdAt: new Date().toISOString() });
    }
  } else {
    freelancer.id = generateId();
    freelancer.createdAt = new Date().toISOString();
    all.push(freelancer);
  }
  saveCollection(KEYS.freelancers, all);
  return freelancer;
}

export function deleteFreelancer(id) {
  // Delete all associated contracts, jobs, etc. or leave them? We just delete the freelancer.
  const all = getFreelancers().filter(f => f.id !== id);
  saveCollection(KEYS.freelancers, all);
}

// ========== Jobs ==========
export function getJobs() {
  return getCollection(KEYS.jobs);
}

export function getJobById(id) {
  return getJobs().find(j => j.id === id) || null;
}

export function saveJob(job) {
  const all = getJobs();
  if (job.id) {
    const index = all.findIndex(j => j.id === job.id);
    if (index >= 0) {
      all[index] = { ...all[index], ...job, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...job, createdAt: new Date().toISOString() });
    }
  } else {
    job.id = generateId();
    job.createdAt = new Date().toISOString();
    all.push(job);
  }
  saveCollection(KEYS.jobs, all);
  return job;
}

export function deleteJob(id) {
  const all = getJobs().filter(j => j.id !== id);
  saveCollection(KEYS.jobs, all);
}

export function getJobsByFreelancer(freelancerId) {
  return getJobs().filter(j => j.freelancerId === freelancerId);
}

// ========== Contracts ==========
export function getContracts() {
  return getCollection(KEYS.contracts);
}

export function getContractById(id) {
  return getContracts().find(c => c.id === id) || null;
}

export function saveContract(contract) {
  const all = getContracts();
  if (contract.id) {
    const index = all.findIndex(c => c.id === contract.id);
    if (index >= 0) {
      all[index] = { ...all[index], ...contract, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...contract, createdAt: new Date().toISOString() });
    }
  } else {
    contract.id = generateId();
    contract.createdAt = new Date().toISOString();
    all.push(contract);
  }
  saveCollection(KEYS.contracts, all);
  return contract;
}

export function deleteContract(id) {
  const all = getContracts().filter(c => c.id !== id);
  saveCollection(KEYS.contracts, all);
  
  // Also delete associated payment schedules and acceptance reports
  const payments = getPaymentSchedules().filter(p => p.contractId !== id);
  saveCollection(KEYS.paymentSchedules, payments);
  
  const reports = getAcceptanceReports().filter(r => r.contractId !== id);
  saveCollection(KEYS.acceptanceReports, reports);
}

export function getContractsByFreelancer(freelancerId) {
  return getContracts().filter(c => c.freelancerId === freelancerId);
}

export function getContractsByJob(jobId) {
  return getContracts().filter(c => c.jobId === jobId);
}

// ========== Acceptance Reports ==========
export function getAcceptanceReports() {
  return getCollection(KEYS.acceptanceReports);
}

export function getAcceptanceReportById(id) {
  return getAcceptanceReports().find(r => r.id === id) || null;
}

export function saveAcceptanceReport(report) {
  const all = getAcceptanceReports();
  if (report.id) {
    const index = all.findIndex(r => r.id === report.id);
    if (index >= 0) {
      all[index] = { ...all[index], ...report, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...report, createdAt: new Date().toISOString() });
    }
  } else {
    report.id = generateId();
    report.createdAt = new Date().toISOString();
    all.push(report);
  }
  saveCollection(KEYS.acceptanceReports, all);
  return report;
}

export function deleteAcceptanceReport(id) {
  const all = getAcceptanceReports().filter(r => r.id !== id);
  saveCollection(KEYS.acceptanceReports, all);
}

export function getAcceptanceReportsByContract(contractId) {
  return getAcceptanceReports().filter(r => r.contractId === contractId);
}

// ========== Payment Schedules ==========
export function getPaymentSchedules() {
  return getCollection(KEYS.paymentSchedules);
}

export function getPaymentScheduleById(id) {
  return getPaymentSchedules().find(p => p.id === id) || null;
}

export function savePaymentSchedule(schedule) {
  const all = getPaymentSchedules();
  if (schedule.id) {
    const index = all.findIndex(p => p.id === schedule.id);
    if (index >= 0) {
      all[index] = { ...all[index], ...schedule, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...schedule, createdAt: new Date().toISOString() });
    }
  } else {
    schedule.id = generateId();
    schedule.createdAt = new Date().toISOString();
    all.push(schedule);
  }
  saveCollection(KEYS.paymentSchedules, all);
  return schedule;
}

export function deletePaymentSchedule(id) {
  const all = getPaymentSchedules().filter(p => p.id !== id);
  saveCollection(KEYS.paymentSchedules, all);
}

export function getPaymentSchedulesByContract(contractId) {
  return getPaymentSchedules().filter(p => p.contractId === contractId);
}

export function updatePaymentStatus(id, status, paidDate = null) {
  const all = getPaymentSchedules();
  const index = all.findIndex(p => p.id === id);
  if (index >= 0) {
    all[index] = { 
      ...all[index], 
      status, 
      paidDate: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null, 
      updatedAt: new Date().toISOString() 
    };
    saveCollection(KEYS.paymentSchedules, all);
  }
}

// ========== Bulk Export/Import ==========
export function exportAllData() {
  const data = {};
  Object.entries(KEYS).forEach(([name, key]) => {
    data[name] = getCollection(key);
  });
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(KEYS).forEach(([name, key]) => {
      if (Array.isArray(data[name])) {
        saveCollection(key, data[name]);
      }
    });
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

// ========== Dashboard Stats ==========
export function getDashboardStats() {
  const freelancers = getFreelancers();
  const jobs = getJobs();
  const contracts = getContracts();
  const payments = getPaymentSchedules();
  
  const today = new Date().toISOString().split('T')[0];
  
  // Auto-detect overdue payments and update them in place
  let updatedCount = 0;
  const updatedPayments = payments.map(p => {
    if (p.status === 'pending' && p.dueDate && p.dueDate < today) {
      updatedCount++;
      return { ...p, status: 'overdue', updatedAt: new Date().toISOString() };
    }
    return p;
  });
  if (updatedCount > 0) {
    saveCollection(KEYS.paymentSchedules, updatedPayments);
  }

  const activePayments = updatedPayments;
  const pendingPayments = activePayments.filter(p => p.status === 'pending');
  const overduePayments = activePayments.filter(p => p.status === 'overdue');
  const paidPayments = activePayments.filter(p => p.status === 'paid');
  
  return {
    totalFreelancers: freelancers.length,
    activeJobs: jobs.filter(j => j.status === 'in_progress').length,
    activeContracts: contracts.filter(c => c.status === 'signed').length,
    pendingPayments: pendingPayments.length + overduePayments.length,
    overduePayments: overduePayments.length,
    totalPaidAmount: paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    upcomingPayments: [...pendingPayments, ...overduePayments]
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5)
      .map(p => {
        const contract = contracts.find(c => c.id === p.contractId);
        const freelancer = contract ? freelancers.find(f => f.id === contract.freelancerId) : null;
        const job = contract ? jobs.find(j => j.id === contract.jobId) : null;
        return { ...p, contract, freelancer, job };
      }),
    recentContracts: contracts
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5)
      .map(c => {
        const freelancer = freelancers.find(f => f.id === c.freelancerId);
        const job = jobs.find(j => j.id === c.jobId);
        return { ...c, freelancer, job };
      }),
    recentJobs: jobs
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 5)
      .map(j => {
        const freelancer = freelancers.find(f => f.id === j.freelancerId);
        return { ...j, freelancer };
      })
  };
}

// ========== Seed Data on First Load ==========
function seedData() {
  if (localStorage.getItem(KEYS.freelancers)) return;

  const freelancerId = generateId();
  const jobId = generateId();
  const contractId = generateId();

  const f = {
    id: freelancerId,
    name: 'PHẠM DUY CƯƠNG',
    dob: '1985-05-08',
    address: '62 Phạm Thái Bường, Phường Phước Hậu, Tỉnh Vĩnh Long',
    phone: '0909440585',
    idNumber: '086085006067',
    idIssueDate: '2025-04-11',
    idIssuePlace: 'CA. Xã Nhà Bè',
    bankAccountName: 'Phạm Duy Cương',
    bankAccountNumber: '0909440585',
    bankName: 'Ngân hàng Quân Đội – MBbank',
    status: 'active',
    role: 'coder',
    createdAt: new Date().toISOString()
  };

  const j = {
    id: jobId,
    freelancerId: freelancerId,
    title: 'Xây dựng website MONREI SAIGON',
    description: 'Xây dựng website MONREI SAIGON',
    status: 'in_progress',
    createdAt: new Date().toISOString()
  };

  const c = {
    id: contractId,
    freelancerId: freelancerId,
    jobId: jobId,
    contractNumber: '20260420/PHAMDUYCUONG-MAC-HDCTV',
    type: 'CTV',
    startDate: '2026-04-20',
    endDate: '2026-06-30',
    role: 'Coding Website MONREI SAIGON',
    value: 33000000,
    taxAmount: 3300000,
    netValue: 29700000,
    status: 'signed',
    createdAt: new Date().toISOString()
  };

  const p1 = {
    id: generateId(),
    contractId: contractId,
    title: 'Thanh toán đợt 1',
    amount: 14850000,
    dueDate: '2026-04-27',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const p2 = {
    id: generateId(),
    contractId: contractId,
    title: 'Thanh toán đợt 2',
    amount: 14850000,
    dueDate: '2026-07-07',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(KEYS.freelancers, JSON.stringify([f]));
  localStorage.setItem(KEYS.jobs, JSON.stringify([j]));
  localStorage.setItem(KEYS.contracts, JSON.stringify([c]));
  localStorage.setItem(KEYS.paymentSchedules, JSON.stringify([p1, p2]));
}

seedData();

