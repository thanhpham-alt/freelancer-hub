import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContracts, getFreelancers, getJobs, deleteContract } from '../data/store';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatusBadge, ConfirmDialog, useToast } from '../components';

export default function Contracts() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState(null);

  const loadData = async () => {
    const [contracts, freelancers, jobs] = await Promise.all([
      getContracts(),
      getFreelancers(),
      getJobs()
    ]);
    setContracts(contracts);
    setFreelancers(freelancers);
    setJobs(jobs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFreelancerName = (id) => {
    const f = freelancers.find(item => item.id === id);
    return f ? f.fullName : 'Chưa rõ';
  };

  const getJobName = (id) => {
    const j = jobs.find(item => item.id === id);
    return j ? j.projectName : 'Dự án vãng lai';
  };

  const filteredContracts = contracts.filter(c => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    setSelectedContractId(id);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteContract(selectedContractId);
      showToast('Đã xóa hợp đồng thành công!', 'success');
      setIsConfirmOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xóa hợp đồng.', 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Quản lý Hợp đồng CTV</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/contracts/new')}>
            <span>➕</span> Tạo Hợp Đồng Mới
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <button 
          className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Tất cả
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'draft' ? 'active' : ''}`}
          onClick={() => setStatusFilter('draft')}
        >
          Nháp
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'signed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('signed')}
        >
          Đã ký kết
        </button>
      </div>

      <div className="card">
        {filteredContracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>Không tìm thấy hợp đồng nào.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Số hợp đồng</th>
                  <th>Freelancer (Bên B)</th>
                  <th>Công việc/Dự án</th>
                  <th style={{ textAlign: 'right' }}>Giá trị HĐ (VNĐ)</th>
                  <th style={{ textAlign: 'right' }}>Thực nhận (Đã trừ thuế)</th>
                  <th>Thời hạn</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map(c => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/contracts/${c.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="bold" style={{ color: 'var(--primary)' }}>{c.contractNumber}</td>
                    <td className="bold">{getFreelancerName(c.freelancerId)}</td>
                    <td>
                      <div className="bold">{getJobName(c.jobId)}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{c.jobTitle}</div>
                    </td>
                    <td className="bold text-right">{formatCurrency(c.totalAmount)}</td>
                    <td className="bold text-right" style={{ color: 'var(--success)' }}>{formatCurrency(c.netAmount)}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {formatDate(c.startDate)} - {formatDate(c.endDate)}
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--danger)', padding: '0.25rem 0.5rem' }} 
                        onClick={(e) => handleDeleteClick(e, c.id)}
                        title="Xóa hợp đồng"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa Hợp Đồng?"
        message="Bạn có chắc chắn muốn xóa hợp đồng này? Tất cả biên bản nghiệm thu và lịch thanh toán liên quan cũng sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
      />
    </div>
  );
}
