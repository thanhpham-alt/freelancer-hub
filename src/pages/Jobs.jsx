import { useState, useEffect } from 'react';
import { getJobs, saveJob, deleteJob, getFreelancers } from '../data/store';
import { formatDate } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { Modal, ConfirmDialog, StatusBadge } from '../components';

export default function Jobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    projectName: '',
    description: '',
    freelancerId: '',
    status: 'draft'
  });

  const loadData = async () => {
    const [jobs, freelancers] = await Promise.all([getJobs(), getFreelancers()]);
    setJobs(jobs);
    setFreelancers(freelancers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredJobs = jobs.filter(j => {
    if (statusFilter === 'all') return true;
    return j.status === statusFilter;
  });

  const openAddModal = () => {
    if (freelancers.length === 0) {
      showToast('Bạn phải tạo Freelancer trước khi tạo Dự án!', 'warning');
      return;
    }
    setSelectedJob(null);
    setFormData({
      id: '',
      projectName: '',
      description: '',
      freelancerId: freelancers[0]?.id || '',
      status: 'draft'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setSelectedJob(job);
    setFormData({
      id: job.id || '',
      projectName: job.projectName || '',
      description: job.description || '',
      freelancerId: job.freelancerId || '',
      status: job.status || 'draft'
    });
    setIsModalOpen(true);
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.projectName || !formData.freelancerId) {
      showToast('Vui lòng nhập tên dự án và gán Freelancer!', 'warning');
      return;
    }

    try {
      await saveJob(formData);
      showToast(selectedJob ? 'Cập nhật dự án thành công!' : 'Tạo dự án thành công!', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu.', 'error');
    }
  };

  const handleDelete = async () => {
    if (selectedJob) {
      try {
        await deleteJob(selectedJob.id);
        showToast('Xóa dự án thành công!', 'success');
        setIsModalOpen(false);
        setIsConfirmOpen(false);
        loadData();
      } catch (err) {
        showToast('Có lỗi xảy ra khi xóa.', 'error');
      }
    }
  };

  const getFreelancerName = (id) => {
    const f = freelancers.find(item => item.id === id);
    return f ? f.fullName : 'Chưa gán';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Quản lý Dự án (Jobs)</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            <span>➕</span> Thêm Dự Án
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
          className={`filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setStatusFilter('in_progress')}
        >
          Đang thực hiện
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          Hoàn thành
        </button>
        <button 
          className={`filter-chip ${statusFilter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          Đã hủy
        </button>
      </div>

      <div className="card">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💼</div>
            <p>Không tìm thấy dự án nào.</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên dự án</th>
                  <th>Freelancer đảm nhận</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(j => (
                  <tr 
                    key={j.id} 
                    onClick={() => openEditModal(j)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="bold" style={{ color: 'var(--primary)' }}>{j.projectName}</td>
                    <td className="bold">{getFreelancerName(j.freelancerId)}</td>
                    <td>
                      <StatusBadge status={j.status} />
                    </td>
                    <td>{formatDate(j.createdAt ? j.createdAt.split('T')[0] : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedJob ? 'Chỉnh sửa Dự án' : 'Tạo Dự án Mới'}
        size="md"
        footer={
          <>
            {selectedJob && (
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => setIsConfirmOpen(true)}
                style={{ marginRight: 'auto' }}
              >
                Xóa Dự án
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Lưu lại
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Tên dự án <span className="required">*</span></label>
            <input
              type="text"
              name="projectName"
              className="form-input"
              value={formData.projectName}
              onChange={handleInputChange}
              required
              placeholder="VD: Xây dựng website MONREI SAIGON"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Freelancer phụ trách <span className="required">*</span></label>
            <select
              name="freelancerId"
              className="form-select"
              value={formData.freelancerId}
              onChange={handleInputChange}
              required
            >
              {freelancers.map(f => (
                <option key={f.id} value={f.id}>{f.fullName} ({f.phone})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Trạng thái dự án</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="draft">Nháp (Draft)</option>
              <option value="in_progress">Đang thực hiện (In Progress)</option>
              <option value="completed">Hoàn thành (Completed)</option>
              <option value="cancelled">Đã hủy (Cancelled)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả công việc</label>
            <textarea
              name="description"
              className="form-input"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Mô tả chi tiết các hạng mục và yêu cầu dự án..."
              style={{ minHeight: '120px' }}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Xóa Dự án?"
        message={`Bạn có chắc muốn xóa dự án "${selectedJob?.projectName}"?`}
        confirmText="Xóa dự án"
        cancelText="Hủy"
      />
    </div>
  );
}
