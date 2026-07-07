import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Import Pages
import Dashboard from './pages/Dashboard';
import Freelancers from './pages/Freelancers';
import Jobs from './pages/Jobs';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Contracts from './pages/Contracts';
import ContractForm from './pages/ContractForm';
import ContractPreview from './pages/ContractPreview';
import AcceptanceReports from './pages/AcceptanceReports';
import AcceptanceReportForm from './pages/AcceptanceReportForm';
import AcceptanceReportPreview from './pages/AcceptanceReportPreview';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="freelancers" element={<Freelancers />} />
          <Route path="jobs" element={<Jobs />} />
          
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="contracts/:id" element={<ContractPreview />} />
          <Route path="contracts/:id/edit" element={<ContractForm />} />
          
          <Route path="acceptance-reports" element={<AcceptanceReports />} />
          <Route path="acceptance-reports/new" element={<AcceptanceReportForm />} />
          <Route path="acceptance-reports/:id" element={<AcceptanceReportPreview />} />
          <Route path="acceptance-reports/:id/edit" element={<AcceptanceReportForm />} />
          
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
