import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContracts, getFreelancers, getJobs, getAcceptanceReportById, saveAcceptanceReport, getPaymentSchedulesByContract } from '../data/store';
import { calculateItemsTotal, calculateTax, calculateNetAmount } from '../utils/calculations';
import { useToast } from '../components/Toast';

export default function AcceptanceReportForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const isEditing = !!id;

  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [jobs, setJobs] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    contractId: '',
    reportDate: new Date().toISOString().split('T')[0],
    deliverableLink: '',
    items: [],
    // Totals auto-calculated
    totalWithTax: 0,
    taxAmount: 0,
    netAmount: 0,
    // Liquidation calculations
    contractValue: 0,
    additionalValue: 0,
    paidAmount: 0,
    remainingAmount: 0,
    status: 'draft'
  });

  // Items from original contract (read-only reference/template)
  const [originalContractItems, setOriginalContractItems] = useState([]);

  const loadData = async () => {
    const [allContracts, fls, jbs] = await Promise.all([
      getContracts(),
      getFreelancers(),
      getJobs()
    ]);
    const cts = allContracts.filter(c => c.status === 'signed');

    setContracts(cts);
    setFreelancers(fls);
    setJobs(jbs);

    if (cts.length === 0 && !isEditing) {
      showToast('Cần có ít nhất 1 Hợp đồng đã ký kết để lập biên bản nghiệm thu!', 'warning');
      navigate('/contracts');
      return;
    }

    if (isEditing) {
      const report = await getAcceptanceReportById(id);
      if (report) {
        setFormData(report);
        const originalContract = allContracts.find(c => c.id === report.contractId);
        if (originalContract) {
          setOriginalContractItems(originalContract.items || []);
        }
      } else {
        showToast('Biên bản nghiệm thu không tồn tại.', 'error');
        navigate('/acceptance-reports');
      }
    } else {
      const firstContract = cts[0];
      if (firstContract) {
        handleContractSelection(firstContract.id, cts);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id, isEditing]);

  const handleContractSelection = async (contractId, availableContracts = contracts) => {
    const contract = availableContracts.find(c => c.id === contractId);
    if (!contract) return;

    // Load paid amount from payment schedules
    const schedules = await getPaymentSchedulesByContract(contract.id);
    const paid = schedules.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Initial items copy from contract
    const contractItems = contract.items ? contract.items.map(item => ({ ...item, isOriginal: true })) : [];
    setOriginalContractItems(contractItems);

    setFormData(prev => ({
      ...prev,
      contractId: contract.id,
      items: contractItems,
      contractValue: contract.netAmount, // contract value is net amount (đã khấu trừ thuế)
      paidAmount: paid
    }));
  };

  const handleContractChange = async (e) => {
    handleContractSelection(e.target.value);
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Recalculate totals whenever items, contract value, or paid amount change
  useEffect(() => {
    // Totals of all items (original + additional)
    const total = calculateItemsTotal(formData.items);
    // Standard 10% tax rate
    const tax = calculateTax(total, 10);
    const net = calculateNetAmount(total, 10);

    // Calculate additional items value
    const additionalItems = formData.items.filter(item => !item.isOriginal);
    const additionalTotal = calculateItemsTotal(additionalItems);
    const additionalNet = calculateNetAmount(additionalTotal, 10);

    const remaining = (formData.contractValue + additionalNet) - Number(formData.paidAmount || 0);

    setFormData(prev => ({
      ...prev,
      totalWithTax: total,
      taxAmount: tax,
      netAmount: net,
      additionalValue: additionalNet,
      remainingAmount: Math.max(0, remaining)
    }));
  }, [formData.items, formData.contractValue, formData.paidAmount]);

  // Edit item table
  const handleItemChange = async (index, field, value) => {
    const list = [...formData.items];
    list[index][field] = value;
    setFormData(prev => ({ ...prev, items: list }));
  };

  const addAdditionalRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { key: `add-${Date.now()}`, name: 'Hạng mục phát sinh', unit: 'Gói', quantity: 1, unitPrice: 0, isOriginal: false }
      ]
    }));
  };

  const removeItemRow = (index) => {
    const list = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: list }));
  };

  const handleSave = async (status) => {
    if (!formData.contractId || !formData.reportDate) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc (*)', 'warning');
      return;
    }

    try {
      const savedReport = {
        ...formData,
        status: status
      };

      const saved = await saveAcceptanceReport(savedReport);
      showToast(isEditing ? 'Cập nhật biên bản thành công!' : 'Tạo biên bản thành công!', 'success');
      navigate(`/acceptance-reports/${saved.id}`);
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu biên bản.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{isEditing ? 'Chỉnh sửa Biên bản' : 'Tạo Biên bản Nghiệm thu & Thanh lý'}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            Hủy bỏ
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSave('draft')}>
            💾 Lưu bản nháp
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleSave('signed')}>
            ✍️ Lưu & Ký biên bản
          </button>
        </div>
      </div>

      {/* SECTION 1: HỢP ĐỒNG LIÊN KẾT */}
      <div className="card">
        <h3 className="section-title">1. Hợp đồng nghiệm thu</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Hợp đồng liên kết <span className="required">*</span></label>
            <select
              name="contractId"
              className="form-select"
              value={formData.contractId}
              onChange={handleContractChange}
              required
              disabled={isEditing}
            >
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.contractNumber} - {freelancers.find(f => f.id === c.freelancerId)?.fullName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ngày lập biên bản <span className="required">*</span></label>
            <input
              type="date"
              name="reportDate"
              className="form-input"
              value={formData.reportDate}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Link thư mục/file nghiệm thu sản phẩm (Google Drive, v.v.)</label>
          <input
            type="url"
            name="deliverableLink"
            className="form-input"
            value={formData.deliverableLink}
            onChange={handleInputChange}
            placeholder="VD: https://drive.google.com/drive/u/1/folders/..."
          />
        </div>
      </div>

      {/* SECTION 2: HẠNG MỤC NGHIỆM THU */}
      <div className="card">
        <div className="card-title">
          <span>2. Chi tiết hạng mục nghiệm thu</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addAdditionalRow}>
            ➕ Thêm hạng mục phát sinh
          </button>
        </div>

        <table className="items-table-edit">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>STT</th>
              <th style={{ width: '45%' }}>Hạng mục công việc / Dịch vụ</th>
              <th style={{ width: '10%' }}>Đơn vị</th>
              <th style={{ width: '10%' }}>Số lượng</th>
              <th style={{ width: '20%' }}>Đơn giá (VNĐ)</th>
              <th style={{ width: '10%' }}>Phát sinh?</th>
              <th style={{ width: '5%' }}></th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, idx) => (
              <tr key={item.key || idx} style={!item.isOriginal ? { background: 'rgba(245, 158, 11, 0.03)' } : {}}>
                <td className="text-center bold">{idx + 1}</td>
                <td>
                  <input
                    type="text"
                    className="form-input"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    required
                    disabled={item.isOriginal} // Keep original items locked
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-input text-center"
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    required
                    disabled={item.isOriginal}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input text-center"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    min="1"
                    required
                    disabled={item.isOriginal}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                    min="0"
                    required
                    disabled={item.isOriginal}
                  />
                </td>
                <td className="text-center">
                  <span className={`status-badge ${item.isOriginal ? 'status-draft' : 'status-pending'}`} style={{ fontSize: '0.7rem' }}>
                    {item.isOriginal ? 'Không' : 'Phát sinh'}
                  </span>
                </td>
                <td className="text-center">
                  {!item.isOriginal && (
                    <button type="button" className="remove-btn" onClick={() => removeItemRow(idx)}>
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SECTION 3: TÍNH TOÁN THANH LÝ */}
      <div className="card">
        <h3 className="section-title">3. Tính toán thanh lý hợp đồng</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Giá trị hợp đồng thực nhận (đã khấu trừ thuế)</label>
            <input
              type="number"
              name="contractValue"
              className="form-input"
              value={formData.contractValue}
              onChange={handleInputChange}
              disabled
            />
          </div>
          <div className="form-group">
            <label className="form-label">Giá trị phát sinh thực nhận (đã khấu trừ thuế)</label>
            <input
              type="number"
              name="additionalValue"
              className="form-input"
              value={formData.additionalValue}
              disabled
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Giá trị đã thanh toán tạm ứng (VNĐ)</label>
            <input
              type="number"
              name="paidAmount"
              className="form-input"
              value={formData.paidAmount}
              onChange={handleInputChange}
              placeholder="VD: 10000000"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Còn lại cần thanh toán thanh lý (VNĐ)</label>
            <input
              type="number"
              name="remainingAmount"
              className="form-input"
              value={formData.remainingAmount}
              disabled
              style={{ color: 'var(--success)', fontWeight: 'bold' }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1" style={{ justifyContent: 'flex-end', marginBottom: '3rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Hủy bỏ
        </button>
        <button className="btn btn-secondary" onClick={() => handleSave('draft')}>
          💾 Lưu bản nháp
        </button>
        <button className="btn btn-primary" onClick={() => handleSave('signed')}>
          ✍️ Lưu & Ký biên bản
        </button>
      </div>
    </div>
  );
}
