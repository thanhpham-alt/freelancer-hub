import { useState, useEffect } from 'react';
import { getPaymentSchedules, getContracts, getFreelancers, updatePaymentStatus, deletePaymentSchedule } from '../data/store';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { AppIcon, StatusBadge } from '../components';
import { safeArray } from '../utils/dataGuards';

export default function Payments() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    const [paymentSchedules, contractsData, freelancersData] = await Promise.all([
      getPaymentSchedules(),
      getContracts(),
      getFreelancers()
    ]);

    setSchedules(safeArray(paymentSchedules));
    setContracts(safeArray(contractsData));
    setFreelancers(safeArray(freelancersData));
  };

  useEffect(() => {
    loadData();
  }, []);

  const contractMap = new Map(safeArray(contracts).map(contract => [contract.id, contract]));
  const freelancerMap = new Map(safeArray(freelancers).map(freelancer => [freelancer.id, freelancer]));

  const getContractDetails = (contract) => {
    if (!contract) return null;
    const freelancer = freelancerMap.get(contract.freelancerId);
    return {
      number: contract.contractNumber || 'Chưa có số HĐ',
      freelancerName: freelancer?.fullName || contract.freelancerName || 'Chưa có Freelancer'
    };
  };

  const handleCleanupInvalidSchedules = async () => {
    const invalidSchedules = safeArray(schedules).filter(schedule => !contractMap.has(schedule.contractId));
    if (invalidSchedules.length === 0) {
      showToast('Không có dữ liệu lỗi cần dọn.', 'success');
      return;
    }

    try {
      await Promise.all(invalidSchedules.map(schedule => deletePaymentSchedule(schedule.id)));
      showToast(`Đã dọn ${invalidSchedules.length} đợt thanh toán lỗi.`, 'success');
      loadData();
    } catch (err) {
      console.error('Failed to cleanup invalid payment schedules', err);
      showToast('Có lỗi xảy ra khi dọn dữ liệu thanh toán.', 'error');
    }
  };

  const safeSchedules = safeArray(schedules);
  const enrichedSchedules = safeSchedules
    .map(schedule => {
      const contract = contractMap.get(schedule.contractId);
      const details = getContractDetails(contract);
      return { ...schedule, contract, details };
    });
  const validSchedules = enrichedSchedules.filter(schedule => schedule.contract && schedule.details);
  const invalidSchedules = enrichedSchedules.filter(schedule => !schedule.contract);

  const filteredSchedules = validSchedules.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Calculate summary metrics
  const totalAmount = validSchedules.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paidAmount = validSchedules.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingAmount = validSchedules.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Lịch thanh toán & công nợ</h1>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-indigo">
          <div className="stat-icon"><AppIcon name="dollar" size={23} /></div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(totalAmount)}đ</div>
            <div className="stat-label">Tổng phải trả</div>
          </div>
        </div>
        <div className="stat-card stat-card-emerald">
          <div className="stat-icon"><AppIcon name="check" size={23} /></div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(paidAmount)}đ</div>
            <div className="stat-label">Đã thanh toán</div>
          </div>
        </div>
        <div className="stat-card stat-card-amber">
          <div className="stat-icon"><AppIcon name="clock" size={23} /></div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(pendingAmount)}đ</div>
            <div className="stat-label">Còn lại cần trả</div>
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

      {invalidSchedules.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div className="bold" style={{ color: 'var(--warning)' }}>Phát hiện {invalidSchedules.length} đợt thanh toán lỗi</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
                Các dòng này không còn liên kết với hợp đồng nào nên đã được ẩn khỏi bảng và tổng tiền.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleCleanupInvalidSchedules}>
              Dọn dữ liệu lỗi
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {filteredSchedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><AppIcon name="banknote" size={44} /></div>
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
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(p => {
                  const details = p.details;
                  return (
                    <tr 
                      key={p.id} 
                      className={p.status === 'overdue' ? 'overdue' : ''}
                    >
                      <td className="bold">{details.freelancerName}</td>
                      <td className="bold" style={{ color: 'var(--primary)' }}>{details.number}</td>
                      <td>Đợt {p.phase} ({p.percentage}%)</td>
                      <td className="bold text-right">{formatCurrency(p.amount)}</td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.status !== 'paid' ? (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={async () => {
                              try {
                                await updatePaymentStatus(p.id, 'paid', new Date().toISOString().split('T')[0]);
                                showToast('Đã đánh dấu thanh toán', 'success');
                                loadData();
                              } catch (err) {
                                showToast('Có lỗi xảy ra.', 'error');
                              }
                            }}
                          >
                            Xác nhận TT
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={async () => {
                              try {
                                await updatePaymentStatus(p.id, 'pending', '');
                                showToast('Đã hủy thanh toán', 'success');
                                loadData();
                              } catch (err) {
                                showToast('Có lỗi xảy ra.', 'error');
                              }
                            }}
                          >
                            Hủy thanh toán
                          </button>
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
