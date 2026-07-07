import { useState, useEffect, useRef } from 'react';
import { getFreelancers, saveFreelancer, deleteFreelancer } from '../data/store';
import { formatDate } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { Modal, ConfirmDialog } from '../components';
import { parseTextWithAI } from '../utils/aiParser';
import { compressImage } from '../utils/imageCompressor';

export default function Freelancers() {
  const { showToast } = useToast();
  const [freelancers, setFreelancers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');

  const ROLES = {
    coder: { label: '💻 Coder', color: '#8b5cf6' },
    voice_off: { label: '🎙️ Voice off', color: '#ec4899' },
    camop: { label: '🎥 Camop', color: '#06b6d4' },
    other: { label: '⚙️ Khác', color: '#64748b' }
  };
  
  // Import DOCX State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedFreelancers, setParsedFreelancers] = useState([]);
  const [importSelections, setImportSelections] = useState({});
  const [activeImportIdx, setActiveImportIdx] = useState(0);

  // AI Import State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('fh_gemini_api_key') || '');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [zoomImg, setZoomImg] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    birthDate: '',
    address: '',
    phone: '',
    cccd: '',
    cccdDate: '',
    cccdPlace: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    nationality: 'Việt Nam',
    email: '',
    role: 'other',
    notes: ''
  });

  const loadFreelancers = () => {
    const list = getFreelancers();
    setFreelancers(list);
    setSelectedIds(prev => prev.filter(id => list.some(f => f.id === id)));
  };

  useEffect(() => {
    loadFreelancers();
  }, []);

  const filteredFreelancers = freelancers.filter(f => {
    if (roleFilter === 'all') return true;
    return (f.role || 'other') === roleFilter;
  });

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredFreelancers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFreelancers.map(f => f.id));
    }
  };

  const handleBulkDelete = () => {
    try {
      selectedIds.forEach(id => {
        deleteFreelancer(id);
      });
      showToast(`Đã xóa thành công ${selectedIds.length} freelancer!`, 'success');
      setSelectedIds([]);
      setIsBulkConfirmOpen(false);
      loadFreelancers();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xóa.', 'error');
    }
  };



  const handleConfirmImport = () => {
    const toImport = parsedFreelancers.filter((_, idx) => importSelections[idx]);
    if (toImport.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 freelancer để import.', 'warning');
      return;
    }

    // Validation check: only fullName is strictly required
    const invalidFreelancers = toImport.filter(f => !f.fullName.trim());

    if (invalidFreelancers.length > 0) {
      showToast(`Có ${invalidFreelancers.length} freelancer thiếu Họ và tên.`, 'warning');
      return;
    }
    
    let count = 0;
    toImport.forEach(f => {
      saveFreelancer(f);
      count++;
    });
    
    showToast(`Đã import thành công ${count} freelancer!`, 'success');
    setIsImportModalOpen(false);
    loadFreelancers();
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) {
      showToast('Vui lòng nhập văn bản cần phân tích.', 'warning');
      return;
    }
    if (!geminiKey.trim()) {
      showToast('Vui lòng nhập Gemini API Key.', 'warning');
      return;
    }

    setIsAiLoading(true);
    try {
      localStorage.setItem('fh_gemini_api_key', geminiKey);
      const results = await parseTextWithAI(aiText, geminiKey);
      
      if (results.length === 0) {
        showToast('Không tìm thấy thông tin freelancer nào.', 'warning');
        return;
      }

      setParsedFreelancers(results);
      const selections = {};
      results.forEach((_, idx) => { selections[idx] = true; });
      setImportSelections(selections);
      setActiveImportIdx(0);
      setIsAiModalOpen(false);
      setIsImportModalOpen(true);
      showToast(`Đã nhận diện được ${results.length} freelancer từ AI!`, 'success');
      setAiText('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi khi gọi API Gemini.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleImportSelection = (idx) => {
    setImportSelections(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleParsedFieldChange = (idx, field, value) => {
    setParsedFreelancers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      
      // Auto-fill bank account name if full name changes
      if (field === 'fullName' && !copy[idx].bankAccountName) {
        copy[idx].bankAccountName = value.toUpperCase();
      }
      return copy;
    });
  };

  const openAddModal = () => {
    setSelectedFreelancer(null);
    setFormData({
      id: '',
      fullName: '',
      birthDate: '',
      address: '',
      phone: '',
      cccd: '',
      cccdDate: '',
      cccdPlace: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankName: '',
      nationality: 'Việt Nam',
      email: '',
      role: 'other',
      cccdFront: '',
      cccdBack: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (freelancer) => {
    setSelectedFreelancer(freelancer);
    setFormData({
      id: freelancer.id || '',
      fullName: freelancer.fullName || '',
      birthDate: freelancer.birthDate || '',
      address: freelancer.address || '',
      phone: freelancer.phone || '',
      cccd: freelancer.cccd || '',
      cccdDate: freelancer.cccdDate || '',
      cccdPlace: freelancer.cccdPlace || '',
      bankAccountName: freelancer.bankAccountName || '',
      bankAccountNumber: freelancer.bankAccountNumber || '',
      bankName: freelancer.bankName || '',
      nationality: freelancer.nationality || 'Việt Nam',
      email: freelancer.email || '',
      role: freelancer.role || 'other',
      cccdFront: freelancer.cccdFront || '',
      cccdBack: freelancer.cccdBack || '',
      notes: freelancer.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-fill bank account name with uppercase version of fullname if empty or modified
    if (name === 'fullName' && !formData.bankAccountName) {
      setFormData(prev => ({
        ...prev,
        bankAccountName: value.toUpperCase()
      }));
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      setFormData(prev => ({
        ...prev,
        [field]: base64
      }));
      showToast('Tải lên ảnh thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải lên và nén ảnh.', 'error');
    }
  };

  const handleParsedImageUpload = async (e, idx, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      handleParsedFieldChange(idx, field, base64);
      showToast('Tải lên ảnh thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải lên và nén ảnh.', 'error');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.fullName) {
      showToast('Vui lòng nhập Họ và tên (*)', 'warning');
      return;
    }

    try {
      saveFreelancer(formData);
      showToast(selectedFreelancer ? 'Cập nhật freelancer thành công!' : 'Thêm freelancer thành công!', 'success');
      setIsModalOpen(false);
      loadFreelancers();
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu freelancer.', 'error');
    }
  };

  const handleDelete = () => {
    if (selectedFreelancer) {
      try {
        deleteFreelancer(selectedFreelancer.id);
        showToast('Xóa freelancer thành công!', 'success');
        setIsModalOpen(false);
        setIsConfirmOpen(false);
        loadFreelancers();
      } catch (err) {
        showToast('Có lỗi xảy ra khi xóa.', 'error');
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Quản lý Freelancer</h1>
        <div className="header-actions">
          {selectedIds.length > 0 && (
            <button className="btn btn-danger" onClick={() => setIsBulkConfirmOpen(true)} style={{ marginRight: '0.75rem' }}>
              <span>🗑️</span> Xóa đã chọn ({selectedIds.length})
            </button>
          )}

          <button className="btn btn-secondary" onClick={() => setIsAiModalOpen(true)} style={{ marginRight: '0.75rem' }}>
            <span>🤖</span> Nhập bằng AI
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <span>➕</span> Thêm Freelancer
          </button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <button 
          className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`}
          onClick={() => setRoleFilter('all')}
        >
          Tất cả
        </button>
        {Object.entries(ROLES).map(([key, value]) => (
          <button 
            key={key}
            className={`filter-chip ${roleFilter === key ? 'active' : ''}`}
            onClick={() => setRoleFilter(key)}
          >
            {value.label}
          </button>
        ))}
      </div>

      <div className="card">
        {filteredFreelancers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>Chưa có freelancer nào. Hãy thêm freelancer đầu tiên!</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredFreelancers.length > 0 && selectedIds.length === filteredFreelancers.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Họ tên</th>
                  <th>Chuyên môn</th>
                  <th>Số điện thoại</th>
                  <th>Số CCCD/MST</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredFreelancers.map(f => (
                  <tr 
                    key={f.id} 
                    onClick={() => openEditModal(f)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(f.id)}
                        onChange={() => handleSelectRow(f.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td className="bold" style={{ color: 'var(--primary)' }}>{f.fullName}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: '600',
                        backgroundColor: `${ROLES[f.role || 'other']?.color}15`, 
                        color: ROLES[f.role || 'other']?.color,
                        border: `1px solid ${ROLES[f.role || 'other']?.color}30`
                      }}>
                        {ROLES[f.role || 'other']?.label}
                      </span>
                    </td>
                    <td>{f.phone}</td>
                    <td>{f.cccd}</td>
                    <td>{formatDate(f.createdAt ? f.createdAt.split('T')[0] : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Freelancer Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFreelancer ? 'Chỉnh sửa Freelancer' : 'Thêm Freelancer Mới'}
        size="lg"
        footer={
          <>
            {selectedFreelancer && (
              <button 
                className="btn btn-danger btn-sm" 
                onClick={() => setIsConfirmOpen(true)}
                style={{ marginRight: 'auto' }}
              >
                Xóa Freelancer
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              Lưu thay đổi
            </button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <h3 className="section-title">Thông tin cá nhân</h3>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Họ và tên <span className="required">*</span></label>
              <input
                type="text"
                name="fullName"
                className="form-input"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                placeholder="VD: Phạm Duy Cương"
              />
            </div>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label className="form-label">Chuyên môn</label>
              <select
                name="role"
                className="form-input"
                value={formData.role || 'other'}
                onChange={handleInputChange}
              >
                <option value="coder">💻 Coder</option>
                <option value="voice_off">🎙️ Voice off</option>
                <option value="camop">🎥 Camop</option>
                <option value="other">⚙️ Khác</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Ngày sinh</label>
              <input
                type="date"
                name="birthDate"
                className="form-input"
                value={formData.birthDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="VD: 0909440585"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quốc tịch</label>
              <input
                type="text"
                name="nationality"
                className="form-input"
                value={formData.nationality}
                onChange={handleInputChange}
                placeholder="VD: Việt Nam"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="VD: cuong.pham@gmail.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Địa chỉ liên hệ</label>
              <input
                type="text"
                name="address"
                className="form-input"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="VD: 62 Phạm Thái Bường, Phường Phước Hậu, Tỉnh Vĩnh Long"
              />
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Số CCCD / Mã số thuế</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mã số thuế / Số CCCD</label>
              <input
                type="text"
                name="cccd"
                className="form-input"
                value={formData.cccd}
                onChange={handleInputChange}
                placeholder="Sử dụng làm MST theo TT 86/2024"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngày cấp CCCD</label>
              <input
                type="date"
                name="cccdDate"
                className="form-input"
                value={formData.cccdDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nơi cấp CCCD</label>
            <input
              type="text"
              name="cccdPlace"
              className="form-input"
              value={formData.cccdPlace}
              onChange={handleInputChange}
              placeholder="VD: Cục Cảnh sát QLHC về trậty tự xã hội hoặc CA Tỉnh..."
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Ảnh CCCD (2 mặt)</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Mặt trước */}
              <div className="cccd-upload-box" style={{ flex: 1 }}>
                <div className="cccd-upload-label">Mặt trước</div>
                {formData.cccdFront ? (
                  <div className="cccd-preview-container">
                    <img src={formData.cccdFront} alt="Mặt trước CCCD" className="cccd-preview-img" onClick={() => setZoomImg(formData.cccdFront)} />
                    <button type="button" className="cccd-remove-btn" onClick={() => setFormData(prev => ({ ...prev, cccdFront: '' }))}>✕</button>
                  </div>
                ) : (
                  <label className="cccd-upload-placeholder">
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'cccdFront')} />
                    <span style={{ fontSize: '1.5rem' }}>📷</span>
                    <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tải lên mặt trước</span>
                  </label>
                )}
              </div>

              {/* Mặt sau */}
              <div className="cccd-upload-box" style={{ flex: 1 }}>
                <div className="cccd-upload-label">Mặt sau</div>
                {formData.cccdBack ? (
                  <div className="cccd-preview-container">
                    <img src={formData.cccdBack} alt="Mặt sau CCCD" className="cccd-preview-img" onClick={() => setZoomImg(formData.cccdBack)} />
                    <button type="button" className="cccd-remove-btn" onClick={() => setFormData(prev => ({ ...prev, cccdBack: '' }))}>✕</button>
                  </div>
                ) : (
                  <label className="cccd-upload-placeholder">
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'cccdBack')} />
                    <span style={{ fontSize: '1.5rem' }}>📷</span>
                    <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tải lên mặt sau</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Tài khoản nhận thanh toán</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tên chủ tài khoản</label>
              <input
                type="text"
                name="bankAccountName"
                className="form-input"
                value={formData.bankAccountName}
                onChange={handleInputChange}
                placeholder="Tên viết hoa không dấu"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số tài khoản</label>
              <input
                type="text"
                name="bankAccountNumber"
                className="form-input"
                value={formData.bankAccountNumber}
                onChange={handleInputChange}
                placeholder="VD: 0909440585"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ngân hàng thụ hưởng</label>
            <input
              type="text"
              name="bankName"
              className="form-input"
              value={formData.bankName}
              onChange={handleInputChange}
              placeholder="VD: Ngân hàng Quân Đội – MBbank"
            />
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Ghi chú</label>
            <textarea
              name="notes"
              className="form-input"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Ghi chú về chuyên môn, năng lực, kỹ năng..."
              style={{ minHeight: '80px' }}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Xóa Freelancer?"
        message={`Bạn có chắc chắn muốn xóa freelancer "${selectedFreelancer?.fullName}"? Hành động này không thể hoàn tác.`}
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Xóa nhiều Freelancer?"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.length} freelancer đã chọn? Hành động này không thể hoàn tác.`}
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
      />

      {/* DOCX Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Import Freelancer từ file DOCX (${parsedFreelancers.length} được tìm thấy)`}
        size="xl"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsImportModalOpen(false)}>
              Hủy bỏ
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleConfirmImport}>
              Xác nhận Import ({Object.values(importSelections).filter(Boolean).length} người)
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '1.5rem', minHeight: '450px' }}>
          {/* Left Column: List of parsed freelancers */}
          <div style={{ width: '35%', borderRight: '1px solid var(--border)', paddingRight: '1rem', overflowY: 'auto', maxHeight: '550px' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Danh sách Freelancer</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {parsedFreelancers.map((f, idx) => {
                const isSelected = !!importSelections[idx];
                const isActive = idx === activeImportIdx;
                const isInvalid = !f.fullName;
                
                return (
                  <div 
                    key={idx} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setActiveImportIdx(idx)}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleImportSelection(idx)}
                      onClick={(e) => e.stopPropagation()} // Prevent setting active item
                      style={{ marginRight: '0.75rem', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bold" style={{ 
                        color: isSelected ? 'var(--text)' : 'var(--text-muted)',
                        textDecoration: isSelected ? 'none' : 'line-through',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {f.fullName || '(Chưa có tên)'}
                        <span>{ROLES[f.role || 'other']?.label.split(' ')[0]}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {f.phone || 'Chưa có SĐT'}
                      </div>
                    </div>
                    {isInvalid && (
                      <span title="Thiếu thông tin bắt buộc" style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>⚠️</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Edit active freelancer details */}
          <div style={{ width: '65%', overflowY: 'auto', maxHeight: '550px', paddingRight: '0.5rem' }}>
            {parsedFreelancers[activeImportIdx] ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--primary)' }}>Chi tiết Thông tin</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Đang chỉnh sửa người thứ {activeImportIdx + 1}/{parsedFreelancers.length}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Họ và tên <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].fullName}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'fullName', e.target.value)}
                      placeholder="Họ và tên"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label className="form-label">Chuyên môn</label>
                    <select
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].role || 'other'}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'role', e.target.value)}
                    >
                      <option value="coder">💻 Coder</option>
                      <option value="voice_off">🎙️ Voice off</option>
                      <option value="camop">🎥 Camop</option>
                      <option value="other">⚙️ Khác</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].birthDate || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'birthDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].phone || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'phone', e.target.value)}
                      placeholder="Số điện thoại"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quốc tịch</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].nationality}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'nationality', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].email}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'email', e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].address}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'address', e.target.value)}
                      placeholder="Địa chỉ thường trú"
                    />
                  </div>
                </div>

                <h5 className="section-title" style={{ marginTop: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>CCCD / Mã số thuế</h5>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số CCCD/MST</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].cccd || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'cccd', e.target.value)}
                      placeholder="Mã số thuế / Số CCCD"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày cấp</label>
                    <input
                      type="date"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].cccdDate || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'cccdDate', e.target.value)}
                    />
                  </div>
                </div>
                 <div className="form-group">
                   <label className="form-label">Nơi cấp</label>
                   <input
                     type="text"
                     className="form-input"
                     value={parsedFreelancers[activeImportIdx].cccdPlace}
                     onChange={(e) => handleParsedFieldChange(activeImportIdx, 'cccdPlace', e.target.value)}
                     placeholder="Nơi cấp CCCD"
                   />
                 </div>

                 <div className="form-group" style={{ marginTop: '1rem' }}>
                   <label className="form-label">Ảnh CCCD (2 mặt)</label>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     {/* Mặt trước */}
                     <div className="cccd-upload-box" style={{ flex: 1 }}>
                       <div className="cccd-upload-label">Mặt trước</div>
                       {parsedFreelancers[activeImportIdx].cccdFront ? (
                         <div className="cccd-preview-container">
                           <img src={parsedFreelancers[activeImportIdx].cccdFront} alt="Mặt trước CCCD" className="cccd-preview-img" onClick={() => setZoomImg(parsedFreelancers[activeImportIdx].cccdFront)} />
                           <button type="button" className="cccd-remove-btn" onClick={() => handleParsedFieldChange(activeImportIdx, 'cccdFront', '')}>✕</button>
                         </div>
                       ) : (
                         <label className="cccd-upload-placeholder">
                           <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleParsedImageUpload(e, activeImportIdx, 'cccdFront')} />
                           <span style={{ fontSize: '1.5rem' }}>📷</span>
                           <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tải lên mặt trước</span>
                         </label>
                       )}
                     </div>

                     {/* Mặt sau */}
                     <div className="cccd-upload-box" style={{ flex: 1 }}>
                       <div className="cccd-upload-label">Mặt sau</div>
                       {parsedFreelancers[activeImportIdx].cccdBack ? (
                         <div className="cccd-preview-container">
                           <img src={parsedFreelancers[activeImportIdx].cccdBack} alt="Mặt sau CCCD" className="cccd-preview-img" onClick={() => setZoomImg(parsedFreelancers[activeImportIdx].cccdBack)} />
                           <button type="button" className="cccd-remove-btn" onClick={() => handleParsedFieldChange(activeImportIdx, 'cccdBack', '')}>✕</button>
                         </div>
                       ) : (
                         <label className="cccd-upload-placeholder">
                           <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleParsedImageUpload(e, activeImportIdx, 'cccdBack')} />
                           <span style={{ fontSize: '1.5rem' }}>📷</span>
                           <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Tải lên mặt sau</span>
                         </label>
                       )}
                     </div>
                   </div>
                 </div>

                <h5 className="section-title" style={{ marginTop: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>Tài khoản Ngân hàng</h5>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].bankAccountName || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'bankAccountName', e.target.value)}
                      placeholder="Chủ tài khoản (VIẾT HOA KHÔNG DẤU)"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số tài khoản</label>
                    <input
                      type="text"
                      className="form-input"
                      value={parsedFreelancers[activeImportIdx].bankAccountNumber || ''}
                      onChange={(e) => handleParsedFieldChange(activeImportIdx, 'bankAccountNumber', e.target.value)}
                      placeholder="Số tài khoản ngân hàng"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ngân hàng thụ hưởng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={parsedFreelancers[activeImportIdx].bankName || ''}
                    onChange={(e) => handleParsedFieldChange(activeImportIdx, 'bankName', e.target.value)}
                    placeholder="Tên ngân hàng"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    className="form-input"
                    value={parsedFreelancers[activeImportIdx].notes}
                    onChange={(e) => handleParsedFieldChange(activeImportIdx, 'notes', e.target.value)}
                    placeholder="Ghi chú về freelancer..."
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state">Chọn một freelancer từ danh sách bên trái để chỉnh sửa thông tin.</div>
            )}
          </div>
        </div>
      </Modal>

      {/* AI Parsing Input Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Nhập liệu bằng AI (Gemini)"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAiModalOpen(false)} disabled={isAiLoading}>
              Hủy
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAiParse} disabled={isAiLoading}>
              {isAiLoading ? 'Đang phân tích...' : 'Phân tích & Trích xuất'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Dán bất kỳ đoạn văn bản thô nào (email, chat Zalo/Skype, CV...) chứa thông tin của một hoặc nhiều freelancer. AI sẽ tự động bóc tách thông tin giúp bạn.
          </p>
          
          <div className="form-group">
            <label className="form-label">Gemini API Key <span className="required">*</span></label>
            <input
              type="password"
              className="form-input"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Nhập API Key của bạn"
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Bạn có thể lấy khóa API miễn phí tại <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Google AI Studio</a>.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Văn bản thô chứa thông tin <span className="required">*</span></label>
            <textarea
              className="form-input"
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder={`Ví dụ: 
Họ và tên: Nguyễn Văn A
SĐT: 0912345678
CCCD: 012345678901
Tài khoản MBBank 1234567890 tên NGUYEN VAN A...`}
              style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.9rem' }}
              disabled={isAiLoading}
            />
          </div>
        </div>
      </Modal>

      {/* Image Zoom Overlay */}
      {zoomImg && (
        <div className="image-zoom-overlay" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="CCCD Zoom" className="image-zoom-content" />
        </div>
      )}
    </div>
  );
}
