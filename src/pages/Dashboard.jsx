import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../data/store';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatCard, StatusBadge } from '../components';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFreelancers: 0,
    activeJobs: 0,
    activeContracts: 0,
    pendingPayments: 0,
    overduePayments: 0,
    totalPaidAmount: 0,
    upcomingPayments: [],
    recentContracts: [],
    recentJobs: []
  });

  useEffect(() => {
    setStats(getDashboardStats());
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tổng quan</h1>
      </div>

      <div className="stat-grid">
        <StatCard
          icon="👤"
          label="Tổng Freelancer"
          value={stats.totalFreelancers}
          variant="indigo"
          onClick={() => navigate('/freelancers')}
        />
        <StatCard
          icon="💼"
          label="Dự án đang làm"
          value={stats.activeJobs}
          variant="emerald"
          onClick={() => navigate('/jobs')}
        />
        <StatCard
          icon="📄"
          label="Hợp đồng đang ký"
          value={stats.activeContracts}
          variant="amber"
          onClick={() => navigate('/contracts')}
        />
        <StatCard
          icon="💰"
          label="Thanh toán cần TT"
          value={stats.pendingPayments}
          variant="rose"
          onClick={() => navigate('/payments')}
        />
      </div>

      <div className="card">
        <div className="card-title">
          <span>Thanh toán đến hạn & quá hạn</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/payments')}>
            Xem tất cả
          </button>
        </div>
        
        {stats.upcomingPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p>Không có thanh toán nào sắp đến hạn!</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Freelancer</th>
                  <th>Dự án</th>
                  <th>Đợt</th>
                  <th style={{ textAlign: 'right' }}>Số tiền (VNĐ)</th>
                  <th>Hạn thanh toán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingPayments.map(p => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate('/payments')}
                    style={{ cursor: 'pointer' }}
                    className={p.status === 'overdue' ? 'overdue' : ''}
                  >
                    <td>
                      <div className="bold">{p.freelancer ? p.freelancer.fullName : 'Chưa rõ'}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{p.freelancer ? p.freelancer.phone : ''}</div>
                    </td>
                    <td>{p.job ? p.job.projectName : 'Chưa rõ'}</td>
                    <td className="bold">Đợt {p.phase} ({p.percentage}%)</td>
                    <td className="bold text-right" style={{ color: p.status === 'overdue' ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="card">
          <div className="card-title">
            <span>Hợp đồng mới tạo</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/contracts')}>
              Xem tất cả
            </button>
          </div>
          {stats.recentContracts.length === 0 ? (
            <div className="empty-state">
              <p>Chưa có hợp đồng nào.</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Số HĐ</th>
                    <th>Freelancer</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentContracts.map(c => (
                    <tr 
                      key={c.id} 
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="bold">{c.contractNumber}</td>
                      <td>{c.freelancer ? c.freelancer.fullName : 'Chưa rõ'}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <span>Dự án mới cập nhật</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobs')}>
              Xem tất cả
            </button>
          </div>
          {stats.recentJobs.length === 0 ? (
            <div className="empty-state">
              <p>Chưa có dự án nào.</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên dự án</th>
                    <th>Freelancer</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentJobs.map(j => (
                    <tr 
                      key={j.id} 
                      onClick={() => navigate('/jobs')}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="bold">{j.projectName}</td>
                      <td>{j.freelancer ? j.freelancer.fullName : 'Chưa gán'}</td>
                      <td>
                        <StatusBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
