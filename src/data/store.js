import * as supabaseStore from './supabaseStore';

if (import.meta.env.DEV) {
  console.info('Freelancer Hub data backend: Supabase');
}

export const getFreelancers = supabaseStore.getFreelancers;
export const getFreelancerById = supabaseStore.getFreelancerById;
export const saveFreelancer = supabaseStore.saveFreelancer;
export const saveFreelancers = supabaseStore.saveFreelancers;
export const deleteFreelancer = supabaseStore.deleteFreelancer;

export const getJobs = supabaseStore.getJobs;
export const getJobById = supabaseStore.getJobById;
export const saveJob = supabaseStore.saveJob;
export const deleteJob = supabaseStore.deleteJob;
export const getJobsByFreelancer = supabaseStore.getJobsByFreelancer;

export const getContracts = supabaseStore.getContracts;
export const getContractById = supabaseStore.getContractById;
export const saveContract = supabaseStore.saveContract;
export const deleteContract = supabaseStore.deleteContract;
export const getContractsByFreelancer = supabaseStore.getContractsByFreelancer;

export const getAcceptanceReports = supabaseStore.getAcceptanceReports;
export const getAcceptanceReportById = supabaseStore.getAcceptanceReportById;
export const saveAcceptanceReport = supabaseStore.saveAcceptanceReport;
export const deleteAcceptanceReport = supabaseStore.deleteAcceptanceReport;

export const getPaymentSchedules = supabaseStore.getPaymentSchedules;
export const getPaymentScheduleById = supabaseStore.getPaymentScheduleById;
export const savePaymentSchedule = supabaseStore.savePaymentSchedule;
export const deletePaymentSchedule = supabaseStore.deletePaymentSchedule;
export const getPaymentSchedulesByContract = supabaseStore.getPaymentSchedulesByContract;
export const updatePaymentStatus = supabaseStore.updatePaymentStatus;

export const getDashboardStats = supabaseStore.getDashboardStats;
export const exportAllData = supabaseStore.exportAllData;
export const importAllData = supabaseStore.importAllData;
