import { supabase } from '../supabase';

const TABLE = 'app_records';

const COLL = {
  freelancers: 'freelancers',
  jobs: 'jobs',
  contracts: 'contracts',
  acceptanceReports: 'acceptanceReports',
  paymentSchedules: 'paymentSchedules'
};

const DEFAULT_DASHBOARD_STATS = {
  totalFreelancers: 0,
  activeJobs: 0,
  activeContracts: 0,
  pendingPayments: 0,
  overduePayments: 0,
  totalPaidAmount: 0,
  upcomingPayments: [],
  recentContracts: [],
  recentJobs: []
};

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanData(value) {
  if (Array.isArray(value)) {
    return value.map(item => cleanData(item)).filter(item => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanData(item)])
        .filter(([, item]) => item !== undefined)
    );
  }

  return value;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình. Vui lòng kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
  }
}

async function getCollectionRows(collectionName) {
  requireSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,data,created_at,updated_at')
    .eq('collection', collectionName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Failed to load ${collectionName} from Supabase`, error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    ...(row.data || {}),
    createdAt: row.data?.createdAt || row.created_at,
    updatedAt: row.data?.updatedAt || row.updated_at
  }));
}

async function getRecordById(collectionName, id) {
  if (!id) return null;
  requireSupabase();

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,data,created_at,updated_at')
    .eq('collection', collectionName)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load ${collectionName}/${id} from Supabase`, error);
    return null;
  }

  if (!data) return null;
  return {
    id: data.id,
    ...(data.data || {}),
    createdAt: data.data?.createdAt || data.created_at,
    updatedAt: data.data?.updatedAt || data.updated_at
  };
}

async function saveRecord(collectionName, record) {
  requireSupabase();

  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    id: record.id || generateId(),
    updatedAt: now,
    createdAt: record.createdAt || now
  };
  const cleanedRecord = cleanData(nextRecord);

  const { error } = await supabase
    .from(TABLE)
    .upsert({
      collection: collectionName,
      id: cleanedRecord.id,
      data: cleanedRecord,
      updated_at: now,
      created_at: cleanedRecord.createdAt
    }, { onConflict: 'collection,id' });

  if (error) throw error;
  return nextRecord;
}

async function saveRecords(collectionName, records) {
  requireSupabase();

  const now = new Date().toISOString();
  const nextRecords = records.map(record => ({
    ...record,
    id: record.id || generateId(),
    updatedAt: now,
    createdAt: record.createdAt || now
  }));

  const rows = nextRecords.map(record => {
    const cleanedRecord = cleanData(record);
    return {
      collection: collectionName,
      id: cleanedRecord.id,
      data: cleanedRecord,
      updated_at: now,
      created_at: cleanedRecord.createdAt
    };
  });

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'collection,id' });

  if (error) throw error;
  return nextRecords;
}

async function deleteRecord(collectionName, id) {
  requireSupabase();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('collection', collectionName)
    .eq('id', id);

  if (error) throw error;
}

// ========== Freelancers ==========
export async function getFreelancers() {
  return getCollectionRows(COLL.freelancers);
}

export async function getFreelancerById(id) {
  return getRecordById(COLL.freelancers, id);
}

export async function saveFreelancer(freelancer) {
  return saveRecord(COLL.freelancers, freelancer);
}

export async function saveFreelancers(freelancers) {
  return saveRecords(COLL.freelancers, freelancers);
}

export async function deleteFreelancer(id) {
  return deleteRecord(COLL.freelancers, id);
}

// ========== Jobs ==========
export async function getJobs() {
  return getCollectionRows(COLL.jobs);
}

export async function getJobById(id) {
  return getRecordById(COLL.jobs, id);
}

export async function saveJob(job) {
  return saveRecord(COLL.jobs, job);
}

export async function deleteJob(id) {
  return deleteRecord(COLL.jobs, id);
}

export async function getJobsByFreelancer(freelancerId) {
  const jobs = await getJobs();
  return jobs.filter(job => job.freelancerId === freelancerId);
}

// ========== Contracts ==========
export async function getContracts() {
  return getCollectionRows(COLL.contracts);
}

export async function getContractById(id) {
  return getRecordById(COLL.contracts, id);
}

export async function saveContract(contract) {
  return saveRecord(COLL.contracts, contract);
}

export async function deleteContract(id) {
  return deleteRecord(COLL.contracts, id);
}

export async function getContractsByFreelancer(freelancerId) {
  const contracts = await getContracts();
  return contracts.filter(contract => contract.freelancerId === freelancerId);
}

// ========== Acceptance Reports ==========
export async function getAcceptanceReports() {
  return getCollectionRows(COLL.acceptanceReports);
}

export async function getAcceptanceReportById(id) {
  return getRecordById(COLL.acceptanceReports, id);
}

export async function saveAcceptanceReport(report) {
  return saveRecord(COLL.acceptanceReports, report);
}

export async function deleteAcceptanceReport(id) {
  return deleteRecord(COLL.acceptanceReports, id);
}

// ========== Payment Schedules ==========
export async function getPaymentSchedules() {
  return getCollectionRows(COLL.paymentSchedules);
}

export async function getPaymentScheduleById(id) {
  return getRecordById(COLL.paymentSchedules, id);
}

export async function savePaymentSchedule(schedule) {
  return saveRecord(COLL.paymentSchedules, schedule);
}

export async function deletePaymentSchedule(id) {
  return deleteRecord(COLL.paymentSchedules, id);
}

export async function getPaymentSchedulesByContract(contractId) {
  const schedules = await getPaymentSchedules();
  return schedules.filter(schedule => schedule.contractId === contractId);
}

export async function updatePaymentStatus(id, status, paidDate = null) {
  const schedule = await getPaymentScheduleById(id);
  if (!schedule) return;

  await savePaymentSchedule({
    ...schedule,
    status,
    paidDate: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null,
    updatedAt: new Date().toISOString()
  });
}

// ========== Dashboard Stats ==========
export async function getDashboardStats() {
  try {
    const [freelancers, jobs, contracts, payments] = await Promise.all([
      getFreelancers(),
      getJobs(),
      getContracts(),
      getPaymentSchedules(),
    ]);

    const today = new Date().toISOString().split('T')[0];

    const updatedPayments = payments.map(payment => {
      if (payment.status === 'pending' && payment.dueDate && payment.dueDate < today) {
        savePaymentSchedule({ ...payment, status: 'overdue' });
        return { ...payment, status: 'overdue' };
      }
      return payment;
    });

    const pendingPayments = updatedPayments.filter(payment => payment.status === 'pending');
    const overduePayments = updatedPayments.filter(payment => payment.status === 'overdue');
    const paidPayments = updatedPayments.filter(payment => payment.status === 'paid');

    return {
      totalFreelancers: freelancers.length,
      activeJobs: jobs.filter(job => job.status === 'in_progress').length,
      activeContracts: contracts.filter(contract => contract.status === 'signed').length,
      pendingPayments: pendingPayments.length + overduePayments.length,
      overduePayments: overduePayments.length,
      totalPaidAmount: paidPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
      upcomingPayments: [...pendingPayments, ...overduePayments]
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 5)
        .map(payment => {
          const contract = contracts.find(item => item.id === payment.contractId);
          const freelancer = contract ? freelancers.find(item => item.id === contract.freelancerId) : null;
          const job = contract ? jobs.find(item => item.id === contract.jobId) : null;
          return { ...payment, contract, freelancer, job };
        }),
      recentContracts: contracts
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5)
        .map(contract => {
          const freelancer = freelancers.find(item => item.id === contract.freelancerId);
          const job = jobs.find(item => item.id === contract.jobId);
          return { ...contract, freelancer, job };
        }),
      recentJobs: jobs
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 5)
        .map(job => {
          const freelancer = freelancers.find(item => item.id === job.freelancerId);
          return { ...job, freelancer };
        })
    };
  } catch (err) {
    console.error('Failed to load dashboard stats from Supabase', err);
    return DEFAULT_DASHBOARD_STATS;
  }
}

export async function exportAllData() {
  const [freelancers, jobs, contracts, acceptanceReports, paymentSchedules] = await Promise.all([
    getFreelancers(),
    getJobs(),
    getContracts(),
    getAcceptanceReports(),
    getPaymentSchedules(),
  ]);

  return JSON.stringify({
    freelancers,
    jobs,
    contracts,
    acceptanceReports,
    paymentSchedules
  }, null, 2);
}

export async function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    await Promise.all([
      data.freelancers?.length ? saveRecords(COLL.freelancers, data.freelancers) : Promise.resolve(),
      data.jobs?.length ? saveRecords(COLL.jobs, data.jobs) : Promise.resolve(),
      data.contracts?.length ? saveRecords(COLL.contracts, data.contracts) : Promise.resolve(),
      data.acceptanceReports?.length ? saveRecords(COLL.acceptanceReports, data.acceptanceReports) : Promise.resolve(),
      data.paymentSchedules?.length ? saveRecords(COLL.paymentSchedules, data.paymentSchedules) : Promise.resolve()
    ]);
    return true;
  } catch (err) {
    console.error('Failed to import data into Supabase', err);
    return false;
  }
}
