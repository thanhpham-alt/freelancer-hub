import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFreelancers, getJobs, getContractById, saveContract, savePaymentSchedule, getPaymentSchedulesByContract, deletePaymentSchedule } from '../data/store';
import { getCompanyInfo } from '../data/companyInfo';
import { generateContractNumber, numberToVietnameseWords } from '../utils/formatters';
import { calculateItemsTotal, calculateTax, calculateNetAmount } from '../utils/calculations';
import { useToast } from '../components/Toast';
import { Modal } from '../components';

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const isEditing = !!id;

  const [freelancers, setFreelancers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({});
  const [defaultTaxRate, setDefaultTaxRate] = useState(10);

  // AI Fill Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiContractText, setAiContractText] = useState('');
  const [aiGeminiKey, setAiGeminiKey] = useState(localStorage.getItem('fh_gemini_api_key') || '');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    contractNumber: '',
    jobId: '',
    freelancerId: '',
    contractType: 'Hợp đồng Cộng tác viên (không độc quyền)',
    startDate: '',
    endDate: '',
    workLocation: 'tự do',
    jobTitle: '',
    items: [{ key: Date.now(), name: '', unit: 'Gói', quantity: 1, unitPrice: 0 }],
    totalAmount: 0,
    taxRate: 10,
    taxAmount: 0,
    netAmount: 0,
    paymentMethod: 'Chuyển khoản',
    signDate: new Date().toISOString().split('T')[0],
    status: 'draft'
  });

  // Payment Schedules (Phases) State
  const [paymentPhases, setPaymentPhases] = useState([
    { key: 'p1', phase: 1, percentage: 50, amount: 0, description: 'Thanh toán đợt 1 trong vòng 07 ngày làm việc kể từ ngày hai bên ký hợp đồng hợp lệ.', dueDate: '' },
    { key: 'p2', phase: 2, percentage: 50, amount: 0, description: 'Thanh toán đợt 2 trong vòng 07 ngày làm việc kể từ khi Bên A nhận được biên bản nghiệm thu & thanh lý hợp đồng hợp lệ.', dueDate: '' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
    const [fls, jbs] = await Promise.all([getFreelancers(), getJobs()]);
    const comp = getCompanyInfo();
    const tax = Number(localStorage.getItem('fh_default_tax_rate') || 10);
    
    setFreelancers(fls);
    setJobs(jbs);
    setCompanyInfo(comp);
    setDefaultTaxRate(tax);

    if (fls.length === 0) {
      showToast('Cần có ít nhất 1 Freelancer trong hệ thống để tạo hợp đồng!', 'warning');
      navigate('/freelancers');
      return;
    }

    if (isEditing) {
      const contract = await getContractById(id);
      if (contract) {
        setFormData({
          ...contract,
          items: contract.items || []
        });
        
        // Load associated payment phases
        const phases = await getPaymentSchedulesByContract(id);
        if (phases && phases.length > 0) {
          setPaymentPhases(phases.map((p, idx) => ({
            ...p,
            key: p.id || `loaded-${idx}`
          })).sort((a, b) => a.phase - b.phase));
        }
      } else {
        showToast('Hợp đồng không tồn tại.', 'error');
        navigate('/contracts');
      }
    } else {
      // Pre-select first freelancer
      const firstFreelancer = fls[0];
      setFormData(prev => ({
        ...prev,
        freelancerId: firstFreelancer.id,
        taxRate: tax,
        contractNumber: generateContractNumber(firstFreelancer.fullName, prev.signDate, comp.shortName)
      }));
    }
    };
    fetchData();
  }, [id, isEditing]);

  // Recalculate totals when items or tax rate change
  useEffect(() => {
    const total = calculateItemsTotal(formData.items);
    const tax = calculateTax(total, formData.taxRate);
    const net = calculateNetAmount(total, formData.taxRate);

    setFormData(prev => ({
      ...prev,
      totalAmount: total,
      taxAmount: tax,
      netAmount: net
    }));

    // Update payment phase amounts based on percentages
    setPaymentPhases(prev => 
      prev.map(p => ({
        ...p,
        amount: Math.round(net * (Number(p.percentage) || 0) / 100)
      }))
    );
  }, [formData.items, formData.taxRate]);

  // Auto-generate contract number when freelancer or sign date changes
  const handleFreelancerChange = async (e) => {
    const fId = e.target.value;
    const f = freelancers.find(item => item.id === fId);
    if (f) {
      const contractNumber = generateContractNumber(f.fullName, formData.signDate, companyInfo.shortName);
      setFormData(prev => ({
        ...prev,
        freelancerId: fId,
        contractNumber
      }));
    }
  };

  const handleSignDateChange = async (e) => {
    const dateStr = e.target.value;
    const f = freelancers.find(item => item.id === formData.freelancerId);
    setFormData(prev => {
      const cNum = f ? generateContractNumber(f.fullName, dateStr, companyInfo.shortName) : prev.contractNumber;
      return {
        ...prev,
        signDate: dateStr,
        contractNumber: cNum
      };
    });
  };

  // General field changes
  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Item table handlers
  const handleItemChange = async (index, field, value) => {
    const list = [...formData.items];
    list[index][field] = value;
    setFormData(prev => ({ ...prev, items: list }));
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { key: Date.now(), name: '', unit: 'Gói', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length === 1) {
      showToast('Hợp đồng phải có ít nhất 1 hạng mục công việc.', 'warning');
      return;
    }
    const list = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: list }));
  };

  // Move item up/down for reordering
  const moveItem = (index, direction) => {
    const list = [...formData.items];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    [list[index], list[swapIdx]] = [list[swapIdx], list[index]];
    setFormData(prev => ({ ...prev, items: list }));
  };

  // Drag-and-drop reorder
  const dragItem = { current: null };
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = async (idx) => { dragItem.current = idx; };
  const handleDragEnter = async (idx) => { setDragOverIdx(idx); };
  const handleDragEnd = async () => {
    if (dragItem.current !== null && dragOverIdx !== null && dragItem.current !== dragOverIdx) {
      const list = [...formData.items];
      const dragged = list.splice(dragItem.current, 1)[0];
      list.splice(dragOverIdx, 0, dragged);
      setFormData(prev => ({ ...prev, items: list }));
    }
    dragItem.current = null;
    setDragOverIdx(null);
  };

  // Payment Phase handlers
  const handlePhaseChange = async (index, field, value) => {
    const list = [...paymentPhases];
    list[index][field] = value;
    
    if (field === 'percentage') {
      const val = Number(value) || 0;
      list[index].amount = Math.round(formData.netAmount * val / 100);
    }
    
    setPaymentPhases(list);
  };

  const addPhase = () => {
    const nextPhase = paymentPhases.length + 1;
    const currentTotalPercent = paymentPhases.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
    const remainingPercent = Math.max(0, 100 - currentTotalPercent);

    setPaymentPhases(prev => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        phase: nextPhase,
        percentage: remainingPercent,
        amount: Math.round(formData.netAmount * remainingPercent / 100),
        description: `Thanh toán đợt ${nextPhase} trong vòng 07 ngày làm việc kể từ khi hoàn thành các điều kiện thống nhất.`,
        dueDate: ''
      }
    ]);
  };

  const removePhase = (index) => {
    if (paymentPhases.length === 1) {
      showToast('Phải có ít nhất 1 đợt thanh toán.', 'warning');
      return;
    }
    const list = paymentPhases.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      phase: i + 1
    }));
    setPaymentPhases(list);
  };

  const handleSave = async (status) => {
    // Validation
    if (!formData.contractNumber || !formData.jobTitle || !formData.startDate || !formData.endDate) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc (*)', 'warning');
      return;
    }

    // Verify percentages sum to 100%
    const totalPercentage = paymentPhases.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
    if (totalPercentage !== 100) {
      showToast(`Tổng tỷ lệ các đợt thanh toán phải bằng 100% (Hiện tại là ${totalPercentage}%)`, 'warning');
      return;
    }

    try {
      const finalContract = {
        ...formData,
        status: status
      };

      // Save contract
      const saved = await saveContract(finalContract);

      // Save payment phases
      if (isEditing) {
        const oldPhases = await getPaymentSchedulesByContract(id);
        await Promise.all(oldPhases.map(op => deletePaymentSchedule(op.id)));
      }

      await Promise.all(paymentPhases.map(p => savePaymentSchedule({
        contractId: saved.id,
        phase: p.phase,
        percentage: Number(p.percentage),
        amount: p.amount,
        description: p.description,
        dueDate: p.dueDate || finalContract.endDate,
        status: 'pending',
        paidDate: null
      })));

      showToast(isEditing ? 'Cập nhật hợp đồng thành công!' : 'Tạo hợp đồng thành công!', 'success');
      navigate(`/contracts/${saved.id}`);
    } catch (err) {
      showToast('Có lỗi xảy ra khi lưu hợp đồng.', 'error');
    }
  };

  // ========== AI Auto-Fill Contract ==========
  const handleAiFill = async () => {
    if (!aiContractText.trim()) {
      showToast('Vui lòng nhập văn bản hợp đồng.', 'warning');
      return;
    }
    const key = aiGeminiKey.trim();
    if (!key) {
      showToast('Vui lòng nhập Gemini API Key.', 'warning');
      return;
    }

    localStorage.setItem('fh_gemini_api_key', key);
    setIsAiLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const freelancerNames = freelancers.map(f => `${f.fullName} (id: ${f.id})`).join(', ');

    const prompt = `Bạn là trợ lý phân tích hợp đồng tiếng Việt. Hãy phân tích văn bản hợp đồng sau và trả về JSON (đầy đủ, không giải thích thêm) chứa các trường sau:

{
  "contractNumber": "Số hợp đồng (chuỗi)",
  "jobTitle": "Tên công việc/dịch vụ chính",
  "contractType": "Loại hợp đồng (chuỗi, mặc định: Hợp đồng Cộng tác viên (không độc quyền))",
  "startDate": "Ngày bắt đầu (YYYY-MM-DD)",
  "endDate": "Ngày kết thúc (YYYY-MM-DD)",
  "signDate": "Ngày ký (YYYY-MM-DD, mặc định ${today} nếu không có)",
  "workLocation": "Nơi làm việc (mặc định: tự do)",
  "paymentMethod": "Phương thức thanh toán (mặc định: Chuyển khoản)",
  "taxRate": số thuế suất (số nguyên 0-100, mặc định 10),
  "freelancerId": "id của freelancer gần nhất từ danh sách sau nếu tển trung khớp: ${freelancerNames}. Nếu không khớp, để rỗng.",
  "items": [
    { "name": "Tên hạng mục", "unit": "Đơn vị (Gói/Buổi/Video/...)", "quantity": 1, "unitPrice": 0 }
  ],
  "paymentPhases": [
    { "phase": 1, "percentage": 50, "description": "Mô tả đợt thanh toán", "dueDate": "" }
  ]
}

Văn bản hợp đồng:
---
${aiContractText}
---

Chỉ trả về JSON thuần túy, không markdown, không giải thích.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Lỗi kết nối Gemini');
      }

      const data = await res.json();
      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) throw new Error('Không có kết quả từ AI');

      const parsed = JSON.parse(jsonText);

      // Apply parsed data to formData
      setFormData(prev => ({
        ...prev,
        contractNumber: parsed.contractNumber || prev.contractNumber,
        jobTitle: parsed.jobTitle || prev.jobTitle,
        contractType: parsed.contractType || prev.contractType,
        startDate: parsed.startDate || prev.startDate,
        endDate: parsed.endDate || prev.endDate,
        signDate: parsed.signDate || prev.signDate,
        workLocation: parsed.workLocation || prev.workLocation,
        paymentMethod: parsed.paymentMethod || prev.paymentMethod,
        taxRate: parsed.taxRate ?? prev.taxRate,
        freelancerId: parsed.freelancerId || prev.freelancerId,
        items: (parsed.items && parsed.items.length > 0)
          ? parsed.items.map((it, i) => ({ key: Date.now() + i, ...it, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || 0 }))
          : prev.items
      }));

      // Apply payment phases
      if (parsed.paymentPhases && parsed.paymentPhases.length > 0) {
        setPaymentPhases(parsed.paymentPhases.map((p, i) => ({
          key: `ai-${Date.now()}-${i}`,
          phase: p.phase || (i + 1),
          percentage: Number(p.percentage) || 0,
          amount: 0, // will be recalculated
          description: p.description || '',
          dueDate: p.dueDate || ''
        })));
      }

      showToast('✅ AI đã điền thông tin hợp đồng! Hãy kiểm tra và chỉnh sửa nếu cần.', 'success');
      setIsAiModalOpen(false);
      setAiContractText('');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Lỗi khi gọi AI.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">{isEditing ? 'Chỉnh sửa Hợp đồng' : 'Tạo Hợp đồng Cộng tác viên'}</h1>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            Hủy bỏ
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsAiModalOpen(true)}
            title="Dán văn bản hợp đồng cũ, AI sẽ điền tự động"
          >
            🤖 Điền bằng AI
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSave('draft')}>
            💾 Lưu bản nháp
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleSave('signed')}>
            ✍️ Lưu &amp; Ký kết
          </button>
        </div>
      </div>

      {/* SECTION 1: THÔNG TIN CHUNG */}
      <div className="card">
        <h3 className="section-title">1. Thông tin chung</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Freelancer (Bên B) <span className="required">*</span></label>
            <select
              name="freelancerId"
              className="form-select"
              value={formData.freelancerId}
              onChange={handleFreelancerChange}
              required
              disabled={isEditing}
            >
              {freelancers.map(f => (
                <option key={f.id} value={f.id}>{f.fullName} ({f.phone})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Liên kết dự án (Job)</label>
            <select
              name="jobId"
              className="form-select"
              value={formData.jobId}
              onChange={handleInputChange}
            >
              <option value="">— Không liên kết dự án nào —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.projectName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Số hợp đồng <span className="required">*</span></label>
            <input
              type="text"
              name="contractNumber"
              className="form-input"
              value={formData.contractNumber}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Chức danh chuyên môn <span className="required">*</span></label>
            <input
              type="text"
              name="jobTitle"
              className="form-input"
              value={formData.jobTitle}
              onChange={handleInputChange}
              required
              placeholder="VD: Coding Website MONREI SAIGON"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ngày bắt đầu hiệu lực <span className="required">*</span></label>
            <input
              type="date"
              name="startDate"
              className="form-input"
              value={formData.startDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ngày kết thúc hiệu lực <span className="required">*</span></label>
            <input
              type="date"
              name="endDate"
              className="form-input"
              value={formData.endDate}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Địa điểm làm việc</label>
            <input
              type="text"
              name="workLocation"
              className="form-input"
              value={formData.workLocation}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ngày ký kết</label>
            <input
              type="date"
              name="signDate"
              className="form-input"
              value={formData.signDate}
              onChange={handleSignDateChange}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: HẠNG MỤC CÔNG VIỆC */}
      <div className="card">
        <h3 className="section-title">2. Hạng mục công việc & Thù lao</h3>
        
        <table className="items-table-edit">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>↕</th>
              <th style={{ width: '4%', textAlign: 'center' }}>STT</th>
              <th style={{ width: '43%' }}>Hạng mục công việc / Dịch vụ</th>
              <th style={{ width: '9%' }}>Đơn vị</th>
              <th style={{ width: '9%' }}>Số lượng</th>
              <th style={{ width: '18%' }}>Đơn giá (VNĐ)</th>
              <th style={{ width: '9%' }}></th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((item, idx) => (
              <tr
                key={item.key || idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  opacity: dragOverIdx === idx ? 0.5 : 1,
                  background: dragOverIdx === idx ? 'rgba(139,92,246,0.08)' : undefined,
                  transition: 'background 0.15s'
                }}
              >
                <td style={{ textAlign: 'center', cursor: 'grab', userSelect: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      style={{
                        background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        color: idx === 0 ? 'var(--text-muted)' : 'var(--primary)',
                        padding: '1px 4px', lineHeight: 1, fontSize: '0.85rem'
                      }}
                      title="Di chuyển lên"
                    >↑</button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1 }}>⋮</span>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === formData.items.length - 1}
                      style={{
                        background: 'none', border: 'none', cursor: idx === formData.items.length - 1 ? 'not-allowed' : 'pointer',
                        color: idx === formData.items.length - 1 ? 'var(--text-muted)' : 'var(--primary)',
                        padding: '1px 4px', lineHeight: 1, fontSize: '0.85rem'
                      }}
                      title="Di chuyển xuống"
                    >↓</button>
                  </div>
                </td>
                <td className="text-center bold">{idx + 1}</td>
                <td>
                  <input
                    type="text"
                    className="form-input"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    required
                    placeholder="VD: Xây dựng Landingpage dự án"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-input text-center"
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    required
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
                  />
                </td>
                <td className="text-center">
                  <button type="button" className="remove-btn" onClick={() => removeItemRow(idx)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className="btn btn-secondary btn-sm mt-1" onClick={addItemRow}>
          ➕ Thêm hạng mục
        </button>

        <div style={{ float: 'right', width: '320px', marginTop: '1.5rem' }}>
          <div className="flex-between mb-05">
            <span style={{ opacity: 0.8 }}>TỔNG CỘNG:</span>
            <span className="bold">{formData.totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="flex-between mb-05" style={{ alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>THUẾ TNCN KHẤU TRỪ:</span>
            <div className="flex gap-05" style={{ alignItems: 'center' }}>
              <input
                type="number"
                className="form-input text-center"
                value={formData.taxRate}
                onChange={(e) => setFormData(prev => ({ ...prev, taxRate: Number(e.target.value) }))}
                style={{ width: '55px', padding: '0.2rem' }}
              />
              <span className="bold">%</span>
              <span className="bold">({formData.taxAmount.toLocaleString('vi-VN')} đ)</span>
            </div>
          </div>
          <div className="flex-between pt-05" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="bold">THỰC NHẬN:</span>
            <span className="bold" style={{ color: 'var(--success)', fontSize: '1.2rem' }}>
              {formData.netAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
        <div style={{ clear: 'both' }}></div>

        {formData.netAmount > 0 && (
          <div className="mt-15" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <span className="bold">Bằng chữ thực nhận:</span> <span style={{ fontStyle: 'italic' }}>{numberToVietnameseWords(formData.netAmount)}</span>
          </div>
        )}
      </div>

      {/* SECTION 3: LỊCH THANH TOÁN */}
      <div className="card">
        <div className="card-title">
          <span>3. Lịch thanh toán các đợt</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addPhase}>
            ➕ Thêm đợt thanh toán
          </button>
        </div>

        {paymentPhases.map((phase, idx) => (
          <div key={phase.key || idx} className="payment-phase-card">
            <div className="payment-phase-header">
              <span>Đợt {phase.phase}</span>
              <button type="button" className="remove-btn" onClick={() => removePhase(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ✕ Xóa đợt này
              </button>
            </div>
            <div className="form-group">
                <label className="form-label">Tỷ lệ thanh toán (%)</label>
                <div className="flex gap-05" style={{ alignItems: 'center' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={phase.percentage}
                    onChange={(e) => handlePhaseChange(idx, 'percentage', Number(e.target.value))}
                    min="1"
                    max="100"
                    required
                    style={{ maxWidth: '100px' }}
                  />
                  <span className="bold">%</span>
                  <span style={{ marginLeft: '1rem', opacity: 0.7 }}>
                    Tương đương: <strong style={{ color: 'var(--primary)' }}>{phase.amount.toLocaleString('vi-VN')} đ</strong>
                  </span>
                </div>
              </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Điều kiện giải ngân</label>
              <textarea
                className="form-input"
                value={phase.description}
                onChange={(e) => handlePhaseChange(idx, 'description', e.target.value)}
                placeholder="VD: Trong vòng 7 ngày làm việc kể từ khi ký hợp đồng..."
                style={{ minHeight: '60px' }}
              />
            </div>
          </div>
        ))}
        
        <div style={{ textAlign: 'right', fontSize: '0.9rem', opacity: 0.8 }}>
          Tổng tỷ lệ: <strong style={{ color: paymentPhases.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0) === 100 ? 'var(--success)' : 'var(--danger)' }}>
            {paymentPhases.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0)}%
          </strong> / 100%
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
          ✍️ Lưu &amp; Ký kết
        </button>
      </div>

      {/* AI Fill Modal */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="🤖 Điền hợp đồng bằng AI"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsAiModalOpen(false)} disabled={isAiLoading}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={handleAiFill} disabled={isAiLoading}>
              {isAiLoading ? (
                <><span className="loading-spinner" style={{ width: '14px', height: '14px' }}></span> Đang phân tích...</>
              ) : (
                <>🤖 Phân tích và Điền vào Form</>
              )}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Gemini Key */}
          <div className="form-group">
            <label className="form-label">🔑 Gemini API Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="AIza..."
              value={aiGeminiKey}
              onChange={(e) => setAiGeminiKey(e.target.value)}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Lấy tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>aistudio.google.com</a>. Key được lưu cục bộ vào trình duyệt.
            </p>
          </div>

          {/* Contract text input */}
          <div className="form-group">
            <label className="form-label">📝 Dán văn bản hợp đồng cũ vào đây</label>
            <textarea
              className="form-input"
              rows={14}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', minHeight: '250px' }}
              placeholder={`Dán toàn bộ nội dung hợp đồng cũ vào đây...\n\nAI sẽ tự động nhận diện:\n- Số hợp đồng\n- Tên công việc\n- Thời gian thực hiện\n- Hạng mục và giá trị\n- Lịch thanh toán theo đợt\n- Thuế suất`}
              value={aiContractText}
              onChange={(e) => setAiContractText(e.target.value)}
              disabled={isAiLoading}
            />
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.83rem',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--primary)' }}>💡 Mẹo:</strong> Bạn có thể dán văn bản hợp đồng cũ dưới bất kỳ định dạng nào — PDF copy, Word, hay email. AI sẽ hiểu và điền vào form. Sau khi điền, kiểm tra lại các trường trước khi lưu.
          </div>
        </div>
      </Modal>
    </div>
  );
}
