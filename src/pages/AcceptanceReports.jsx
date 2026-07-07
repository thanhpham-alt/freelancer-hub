import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAcceptanceReports, getContracts, getFreelancers, getJobs, deleteAcceptanceReport } from '../data/store';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatusBadge, ConfirmDialog, useToast } from '../components';

export default function AcceptanceReports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const loadData = async () => {
    setReports(getAcceptanceReports());
    getContracts().then(setContracts);
    getFreelancers().then(setFreelancers);
    getJobs().then(setJobs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getContractDetails = (contractId) => {
    const c = contracts.find(item => item.id === contractId);
    if (!c) return { number: 'Chưa rõ', freelancerName: 'Chưa rõ', projectName: 'Chưa rõ' };
    const f = freelancers.find(item => item.id === c.freelancerId);
    const j = jobs.find(item => item.id === c.jobId);
    return {
      number: c.contractNumber,
      freelancerName: f ? f.fullName : 'Chưa rõ',
      projectName: j ? j.projectName : 'Dự án vãng lai'
    };
  };

  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    setSelectedReportId(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteAcceptanceReport(selectedReportId);
      showToast('Đã xóa biên bản nghiệm thu thành công!', 'success');
      setIsConfirmOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xóa biên bản nghiệm thu.', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Biên bản nghiệm thu & Thanh lý</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/acceptance-reports/new')}>
            <span>➕</span> Tạo Biên Bản Nghiệm Thu
          </button>
        </div>
      </div>

      <div className="card">
        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Chưa có biên bản nghiệm thu nào.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Số HĐ liên kết</th>
                  <th>Freelancer (Bên B)</th>
                  <th>Dự án nghiệm thu</th>
                  <th style={{ textAlign: 'right' }}>Giá trị thực nhận (đ)</th>
                  <th>Ngày lập</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const details = getContractDetails(r.contractId);
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => navigate(`/acceptance-reports/${r.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="bold" style={{ color: 'var(--primary)' }}>{details.number}</td>
                      <td className="bold">{details.freelancerName}</td>
                      <td>{details.projectName}</td>
                      <td className="bold text-right" style={{ color: 'var(--success)' }}>
                        {formatCurrency(r.netAmount)}
                      </td>
                      <td>{formatDate(r.reportDate)}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }} 
                          onClick={(e) => handleDeleteClick(e, r.id)}
                          title="Xóa biên bản nghiệm thu"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa Biên Bản Nghiệm Thu?"
        message="Bạn có chắc chắn muốn xóa biên bản nghiệm thu này? Hành động này không thể hoàn tác."
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
      />
    </div>
  );
}
