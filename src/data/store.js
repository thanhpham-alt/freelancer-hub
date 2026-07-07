import { isSupabaseConfigured } from '../supabase';
import * as firebaseStore from './firebaseStore';
import * as supabaseStore from './supabaseStore';

const useSupabase = import.meta.env.VITE_DATA_BACKEND === 'supabase' && isSupabaseConfigured;
const store = useSupabase ? supabaseStore : firebaseStore;

if (import.meta.env.DEV) {
  console.info(`Freelancer Hub data backend: ${useSupabase ? 'Supabase' : 'Firebase'}`);
}

export const getFreelancers = store.getFreelancers;
export const getFreelancerById = store.getFreelancerById;
export const saveFreelancer = store.saveFreelancer;
export const saveFreelancers = store.saveFreelancers;
export const deleteFreelancer = store.deleteFreelancer;

export const getJobs = store.getJobs;
export const getJobById = store.getJobById;
export const saveJob = store.saveJob;
export const deleteJob = store.deleteJob;
export const getJobsByFreelancer = store.getJobsByFreelancer;

export const getContracts = store.getContracts;
export const getContractById = store.getContractById;
export const saveContract = store.saveContract;
export const deleteContract = store.deleteContract;
export const getContractsByFreelancer = store.getContractsByFreelancer;

export const getAcceptanceReports = store.getAcceptanceReports;
export const getAcceptanceReportById = store.getAcceptanceReportById;
export const saveAcceptanceReport = store.saveAcceptanceReport;
export const deleteAcceptanceReport = store.deleteAcceptanceReport;

export const getPaymentSchedules = store.getPaymentSchedules;
export const getPaymentScheduleById = store.getPaymentScheduleById;
export const savePaymentSchedule = store.savePaymentSchedule;
export const deletePaymentSchedule = store.deletePaymentSchedule;
export const getPaymentSchedulesByContract = store.getPaymentSchedulesByContract;
export const updatePaymentStatus = store.updatePaymentStatus;

export const getDashboardStats = store.getDashboardStats;
export const exportAllData = store.exportAllData;
export const importAllData = store.importAllData;
