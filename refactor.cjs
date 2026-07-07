const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Refactor data loading
  content = content.replace(/setFreelancers\(getFreelancers\(\)\);/g, 'getFreelancers().then(setFreelancers);');
  content = content.replace(/setJobs\(getJobs\(\)\);/g, 'getJobs().then(setJobs);');
  content = content.replace(/setContracts\(getContracts\(\)\);/g, 'getContracts().then(setContracts);');
  content = content.replace(/setAcceptanceReports\(getAcceptanceReports\(\)\);/g, 'getAcceptanceReports().then(setAcceptanceReports);');
  content = content.replace(/setPaymentSchedules\(getPaymentSchedules\(\)\);/g, 'getPaymentSchedules().then(setPaymentSchedules);');
  content = content.replace(/setStats\(getDashboardStats\(\)\);/g, 'getDashboardStats().then(setStats);');

  // Async saves and deletes
  // saveFreelancer(data) -> await saveFreelancer(data)
  content = content.replace(/saveFreelancer\(/g, 'await saveFreelancer(');
  content = content.replace(/deleteFreelancer\(/g, 'await deleteFreelancer(');
  
  content = content.replace(/saveJob\(/g, 'await saveJob(');
  content = content.replace(/deleteJob\(/g, 'await deleteJob(');
  
  content = content.replace(/saveContract\(/g, 'await saveContract(');
  content = content.replace(/deleteContract\(/g, 'await deleteContract(');
  
  content = content.replace(/saveAcceptanceReport\(/g, 'await saveAcceptanceReport(');
  content = content.replace(/deleteAcceptanceReport\(/g, 'await deleteAcceptanceReport(');
  
  content = content.replace(/savePaymentSchedule\(/g, 'await savePaymentSchedule(');
  content = content.replace(/deletePaymentSchedule\(/g, 'await deletePaymentSchedule(');
  content = content.replace(/updatePaymentStatus\(/g, 'await updatePaymentStatus(');

  // But if we put await, we need the enclosing function to be async.
  // E.g. const handleSubmit = (e) => { ... await saveFreelancer(...) }
  // We can just add async to handleSubmit, handleDelete, etc.
  content = content.replace(/const (handle[a-zA-Z0-9_]+) = \(([^)]*)\) => \{/g, 'const $1 = async ($2) => {');
  content = content.replace(/const (handle[a-zA-Z0-9_]+) = ([a-zA-Z0-9_]+) => \{/g, 'const $1 = async ($2) => {');
  content = content.replace(/const (load[a-zA-Z0-9_]+) = \(([^)]*)\) => \{/g, 'const $1 = async ($2) => {');

  // get...ById
  content = content.replace(/getContractById\((.*?)\)/g, 'await getContractById($1)');
  content = content.replace(/getFreelancerById\((.*?)\)/g, 'await getFreelancerById($1)');
  content = content.replace(/getJobById\((.*?)\)/g, 'await getJobById($1)');
  content = content.replace(/getAcceptanceReportById\((.*?)\)/g, 'await getAcceptanceReportById($1)');
  content = content.replace(/getPaymentSchedulesByContract\((.*?)\)/g, 'await getPaymentSchedulesByContract($1)');

  // Fix useEffects for ...ById
  // E.g. useEffect(() => { const c = await getContractById(id); ... })
  // This is invalid in React. useEffect cannot be async.
  // We need to wrap it in an async function.
  // So instead of regex, I should manually fix the ...ById calls for Form and Preview components.

  fs.writeFileSync(filePath, content);
});

console.log('Refactor script done (part 1). Please check.');
