import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

// We will use standard async operations.
const COLL = {
  freelancers: 'freelancers',
  jobs: 'jobs',
  contracts: 'contracts',
  acceptanceReports: 'acceptanceReports',
  paymentSchedules: 'paymentSchedules'
};

function generateId() {
  return crypto.randomUUID();
}

// ========== Freelancers ==========
export async function getFreelancers() {
  const snapshot = await getDocs(collection(db, COLL.freelancers));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getFreelancerById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL.freelancers, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveFreelancer(freelancer) {
  if (!freelancer.id) freelancer.id = generateId();
  freelancer.updatedAt = new Date().toISOString();
  if (!freelancer.createdAt) freelancer.createdAt = new Date().toISOString();
  await setDoc(doc(db, COLL.freelancers, freelancer.id), freelancer);
  return freelancer;
}

export async function deleteFreelancer(id) {
  await deleteDoc(doc(db, COLL.freelancers, id));
}

// ========== Jobs ==========
export async function getJobs() {
  const snapshot = await getDocs(collection(db, COLL.jobs));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getJobById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL.jobs, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveJob(job) {
  if (!job.id) job.id = generateId();
  job.updatedAt = new Date().toISOString();
  if (!job.createdAt) job.createdAt = new Date().toISOString();
  await setDoc(doc(db, COLL.jobs, job.id), job);
  return job;
}

export async function deleteJob(id) {
  await deleteDoc(doc(db, COLL.jobs, id));
}

export async function getJobsByFreelancer(freelancerId) {
  const q = query(collection(db, COLL.jobs), where("freelancerId", "==", freelancerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ========== Contracts ==========
export async function getContracts() {
  const snapshot = await getDocs(collection(db, COLL.contracts));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getContractById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL.contracts, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveContract(contract) {
  if (!contract.id) contract.id = generateId();
  contract.updatedAt = new Date().toISOString();
  if (!contract.createdAt) contract.createdAt = new Date().toISOString();
  await setDoc(doc(db, COLL.contracts, contract.id), contract);
  return contract;
}

export async function deleteContract(id) {
  await deleteDoc(doc(db, COLL.contracts, id));
}

export async function getContractsByFreelancer(freelancerId) {
  const q = query(collection(db, COLL.contracts), where("freelancerId", "==", freelancerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ========== Acceptance Reports ==========
export async function getAcceptanceReports() {
  const snapshot = await getDocs(collection(db, COLL.acceptanceReports));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getAcceptanceReportById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL.acceptanceReports, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveAcceptanceReport(report) {
  if (!report.id) report.id = generateId();
  report.updatedAt = new Date().toISOString();
  if (!report.createdAt) report.createdAt = new Date().toISOString();
  await setDoc(doc(db, COLL.acceptanceReports, report.id), report);
  return report;
}

export async function deleteAcceptanceReport(id) {
  await deleteDoc(doc(db, COLL.acceptanceReports, id));
}

// ========== Payment Schedules ==========
export async function getPaymentSchedules() {
  const snapshot = await getDocs(collection(db, COLL.paymentSchedules));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPaymentScheduleById(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLL.paymentSchedules, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function savePaymentSchedule(schedule) {
  if (!schedule.id) schedule.id = generateId();
  schedule.updatedAt = new Date().toISOString();
  if (!schedule.createdAt) schedule.createdAt = new Date().toISOString();
  await setDoc(doc(db, COLL.paymentSchedules, schedule.id), schedule);
  return schedule;
}

export async function deletePaymentSchedule(id) {
  await deleteDoc(doc(db, COLL.paymentSchedules, id));
}

export async function getPaymentSchedulesByContract(contractId) {
  const q = query(collection(db, COLL.paymentSchedules), where("contractId", "==", contractId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updatePaymentStatus(id, status, paidDate = null) {
  const snap = await getDoc(doc(db, COLL.paymentSchedules, id));
  if (snap.exists()) {
    const data = snap.data();
    await updateDoc(doc(db, COLL.paymentSchedules, id), {
      status,
      paidDate: status === 'paid' ? (paidDate || new Date().toISOString().split('T')[0]) : null,
      updatedAt: new Date().toISOString()
    });
  }
}

// ========== Dashboard Stats ==========
export async function getDashboardStats() {
  const [fSnap, jSnap, cSnap, pSnap] = await Promise.all([
    getDocs(collection(db, COLL.freelancers)),
    getDocs(collection(db, COLL.jobs)),
    getDocs(collection(db, COLL.contracts)),
    getDocs(collection(db, COLL.paymentSchedules)),
  ]);
  
  const freelancers = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const jobs = jSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const contracts = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const payments = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const today = new Date().toISOString().split('T')[0];

  const updatedPayments = payments.map(p => {
    if (p.status === 'pending' && p.dueDate && p.dueDate < today) {
      updateDoc(doc(db, COLL.paymentSchedules, p.id), { status: 'overdue' }); // fire and forget
      return { ...p, status: 'overdue' };
    }
    return p;
  });

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

export async function exportAllData() {
  const [fSnap, jSnap, cSnap, aSnap, pSnap] = await Promise.all([
    getDocs(collection(db, COLL.freelancers)),
    getDocs(collection(db, COLL.jobs)),
    getDocs(collection(db, COLL.contracts)),
    getDocs(collection(db, COLL.acceptanceReports)),
    getDocs(collection(db, COLL.paymentSchedules)),
  ]);
  return JSON.stringify({
    freelancers: fSnap.docs.map(d => d.data()),
    jobs: jSnap.docs.map(d => d.data()),
    contracts: cSnap.docs.map(d => d.data()),
    acceptanceReports: aSnap.docs.map(d => d.data()),
    paymentSchedules: pSnap.docs.map(d => d.data())
  }, null, 2);
}

export async function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const promises = [];
    if (data.freelancers) data.freelancers.forEach(x => promises.push(setDoc(doc(db, COLL.freelancers, x.id), x)));
    if (data.jobs) data.jobs.forEach(x => promises.push(setDoc(doc(db, COLL.jobs, x.id), x)));
    if (data.contracts) data.contracts.forEach(x => promises.push(setDoc(doc(db, COLL.contracts, x.id), x)));
    if (data.acceptanceReports) data.acceptanceReports.forEach(x => promises.push(setDoc(doc(db, COLL.acceptanceReports, x.id), x)));
    if (data.paymentSchedules) data.paymentSchedules.forEach(x => promises.push(setDoc(doc(db, COLL.paymentSchedules, x.id), x)));
    await Promise.all(promises);
    return true;
  } catch(e) {
    console.error(e);
    return false;
  }
}
