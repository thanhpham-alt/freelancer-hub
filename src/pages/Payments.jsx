import { useState, useEffect } from 'react';
import { getPaymentSchedules, getContracts, getFreelancers, updatePaymentStatus } from '../data/store';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { StatusBadge } from '../components';

export default function Payments() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = () => {
    setSchedules(getPaymentSchedules());
    setContracts(getContracts());
    setFreelancers(getFreelancers());
  };

  useEffect(() => {
    loadData();
  }, []);

  const getContractDetails = (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return { number: 'Chưa rõ', freelancerName: 'Chưa rõ' };
    const freelancer = freelancers.find(f => f.id === contract.freelancerId);
    return {
      number: contract.contractNumber,
      freelancerName: freelancer ? freelancer.fullName : 'Chưa rõ'
    };
  };

  const handleMarkAsPaid = (id) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      updatePaymentStatus(id, 'paid', today);
      showToast('Đánh dấu thanh toán thành công!', 'success');
      loadData();
    } catch (err) {
      showToast('Có lỗi xảy ra khi cập nhật.', 'error');
    }
  };

  const filteredSchedules = schedules.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Calculate summary metrics
  const totalAmount = schedules.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidAmount = schedules.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingAmount = schedules.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const overdueAmount = schedules.filter(p => p.status === 'overdue').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Lịch thanh toán & công nợ</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-indigo">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(totalAmount)}đ</div>
            <div className="stat-label">Tổng phải trả</div>
          </div>
        </div>
        <div className="stat-card stat-card-emerald">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(paidAmount)}đ</div>
            <div className="stat-label">Đã thanh toán</div>
          </div>
        </div>
        <div className="stat-card stat-card-amber">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(pendingAmount)}đ</div>
            <div className="stat-label">Còn lại cần trả</div>
          </div>
        </div>
        <div className="stat-card stat-card-rose">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(overdueAmount)}đ</div>
            <div className="stat-label">Tổng nợ quá hạn</div>
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <button 
          className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Tất cả đợt
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Chờ thanh toán
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'paid' ? 'active' : ''}`}
          onClick={() => setStatusFilter('paid')}
        >
          Đã thanh toán
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'overdue' ? 'active' : ''}`}
          onClick={() => setStatusFilter('overdue')}
        >
          Quá hạn
        </button>
      </div>

      <div className="card">
        {filteredSchedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <p>Không có đợt thanh toán nào phù hợp.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Freelancer</th>
                  <th>Số hợp đồng</th>
                  <th>Đợt</th>
                  <th style={{ textAlign: 'right' }}>Số tiền (VNĐ)</th>
                  <th>Hạn thanh toán</th>
                  <th>Ngày thanh toán</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(p => {
                  const details = getContractDetails(p.contractId);
                  return (
                    <tr 
                      key={p.id} 
                      className={p.status === 'overdue' ? 'overdue' : ''}
                    >
                      <td className="bold">{details.freelancerName}</td>
                      <td className="bold" style={{ color: 'var(--primary)' }}>{details.number}</td>
                      <td>Đợt {p.phase} ({p.percentage}%)</td>
                      <td className="bold text-right">{formatCurrency(p.amount)}</td>
                      <td>{formatDate(p.dueDate)}</td>
                      <td>{p.paidDate ? formatDate(p.paidDate) : '—'}</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status !== 'paid' ? (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleMarkAsPaid(p.id)}
                          >
                            Xác nhận TT
                          </button>
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>✓ Đã chuyển</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
