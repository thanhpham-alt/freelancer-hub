import { useState, useEffect } from 'react';
import { getCompanyInfo, saveCompanyInfo, resetCompanyInfo } from '../data/companyInfo';
import { exportAllData, importAllData } from '../data/store';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { showToast } = useToast();
  
  // Company Info State
  const [company, setCompany] = useState({
    name: '',
    representative: '',
    position: '',
    address: '',
    taxCode: '',
    shortName: ''
  });

  // Default Tax Rate State
  const [taxRate, setTaxRate] = useState(10);

  useEffect(() => {
    setCompany(getCompanyInfo());
    const storedTax = localStorage.getItem('fh_default_tax_rate');
    if (storedTax) setTaxRate(Number(storedTax));
  }, []);

  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompany(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCompany = (e) => {
    e.preventDefault();
    try {
      saveCompanyInfo(company);
      showToast('Lưu thông tin công ty thành công!', 'success');
    } catch (err) {
      showToast('Không thể lưu thông tin công ty.', 'error');
    }
  };

  const handleResetCompany = () => {
    const fresh = resetCompanyInfo();
    setCompany(fresh);
    showToast('Đã khôi phục thông tin công ty mặc định.', 'info');
  };

  const handleSaveTax = () => {
    try {
      localStorage.setItem('fh_default_tax_rate', String(taxRate));
      showToast('Lưu thuế suất mặc định thành công!', 'success');
    } catch (err) {
      showToast('Không thể lưu thuế suất.', 'error');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `freelancer_hub_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Xuất sao lưu dữ liệu thành công!', 'success');
    } catch (err) {
      showToast('Có lỗi xảy ra khi xuất sao lưu.', 'error');
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result;
        if (typeof json === 'string') {
          const success = importAllData(json);
          if (success) {
            showToast('Nhập dữ liệu thành công! Vui lòng tải lại trang.', 'success');
            // Refresh settings values too
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showToast('Dữ liệu không đúng định dạng sao lưu.', 'error');
          }
        }
      } catch (err) {
        showToast('Có lỗi xảy ra khi nhập file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cài đặt hệ thống</h1>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Thông tin đơn vị chủ quản (Bên A)</span>
        </div>
        <form onSubmit={handleSaveCompany}>
          <div className="form-group">
            <label className="form-label">Tên đầy đủ công ty</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={company.name}
              onChange={handleCompanyChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Người đại diện pháp luật</label>
              <input
                type="text"
                name="representative"
                className="form-input"
                value={company.representative}
                onChange={handleCompanyChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Chức vụ đại diện</label>
              <input
                type="text"
                name="position"
                className="form-input"
                value={company.position}
                onChange={handleCompanyChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mã số thuế doanh nghiệp</label>
              <input
                type="text"
                name="taxCode"
                className="form-input"
                value={company.taxCode}
                onChange={handleCompanyChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tên viết tắt (Dùng tạo mã HĐ)</label>
              <input
                type="text"
                name="shortName"
                className="form-input"
                value={company.shortName}
                onChange={handleCompanyChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trụ sở chính công ty</label>
            <input
              type="text"
              name="address"
              className="form-input"
              value={company.address}
              onChange={handleCompanyChange}
              required
            />
          </div>

          <div className="flex gap-1" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm">
              Lưu thông tin Bên A
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetCompany}>
              Khôi phục mặc định
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          <span>Thuế suất mặc định</span>
        </div>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Thuế thu nhập cá nhân (TNCN %)</label>
            <div className="flex gap-05" style={{ alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min="0"
                max="100"
                style={{ maxWidth: '120px' }}
              />
              <span className="bold" style={{ fontSize: '1.2rem' }}>%</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSaveTax}>
            Cập nhật thuế suất
          </button>
        </div>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
        <div className="card-title">
          <span style={{ color: 'var(--danger)' }}>Sao lưu & Khôi phục dữ liệu</span>
        </div>
        <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Ứng dụng lưu dữ liệu trực tiếp trong localStorage của trình duyệt này.
          Nhớ xuất file sao lưu định kỳ để không bị mất dữ liệu khi xóa lịch sử trình duyệt hoặc đổi thiết bị.
        </p>
        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
            📥 Xuất sao lưu (JSON)
          </button>
          <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
            📤 Nhập sao lưu (JSON)
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
