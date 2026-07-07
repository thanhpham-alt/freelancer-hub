import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAcceptanceReportById, getContractById, getFreelancerById, getJobById, saveAcceptanceReport } from '../data/store';
import { getCompanyInfo } from '../data/companyInfo';
import { formatCurrency, formatDate, formatDateLong, numberToVietnameseWords, extractDate, generateReportNumber } from '../utils/formatters';
import { exportAcceptanceReportToGoogleDocs } from '../utils/googleDocsExport';
import { AppIcon } from '../components';
import '../print.css';

export default function AcceptanceReportPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [contract, setContract] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [company, setCompany] = useState({});
  const [job, setJob] = useState(null);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const r = await getAcceptanceReportById(id);
      if (r) {
        setReport(r);
        const c = await getContractById(r.contractId);
        if (c) {
          setContract(c);
          setFreelancer(await getFreelancerById(c.freelancerId));
          if (c.jobId) {
            setJob(await getJobById(c.jobId));
          }
        }
        if (r.googleDocUrl) setGoogleDocUrl(r.googleDocUrl);
      }
      setCompany(getCompanyInfo());
    };
    fetchData();
  }, [id]);

  if (!report || !contract || !freelancer) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>Đang tải biên bản nghiệm thu...</p>
        </div>
      </div>
    );
  }

  const reportDateParts = extractDate(report.reportDate);
  const contractDateParts = extractDate(contract.signDate);

  const handlePrint = async () => {
    window.print();
  };

  const handleGoogleDocsExport = async () => {
    setIsExporting(true);
    setExportProgress('Đang xác thực Google...');
    try {
      const { docUrl } = await exportAcceptanceReportToGoogleDocs({
        report, contract, freelancer, company, onProgress: setExportProgress
      });
      await saveAcceptanceReport({ ...report, googleDocUrl: docUrl });
      setGoogleDocUrl(docUrl);
      setExportProgress('Hoàn tất! Đang mở Google Docs...');
      setTimeout(() => { window.open(docUrl, '_blank'); setIsExporting(false); }, 1000);
    } catch (err) {
      console.error(err);
      setExportProgress(`Lỗi: ${err.message}`);
      setTimeout(() => setIsExporting(false), 3000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Xem trước Biên bản nghiệm thu</h1>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/acceptance-reports')}>
            ⬅ Quay lại danh sách
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/acceptance-reports/${report.id}/edit`)}>
            <AppIcon name="pencil" size={16} /> Chỉnh sửa
          </button>
          {googleDocUrl ? (
            <a href={googleDocUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <AppIcon name="external" size={16} /> Mở Google Docs
            </a>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleGoogleDocsExport} disabled={isExporting}>
              {isExporting ? <><AppIcon name="loader" size={16} className="spin-icon" /> Đang xuất...</> : <><AppIcon name="file" size={16} /> Xuất Google Docs</>}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <AppIcon name="printer" size={16} /> In biên bản (PDF)
          </button>
        </div>
      </div>

      <div className="document-preview-container">
        <div className="document-preview">
          
          {/* Quốc hiệu tiêu ngữ */}
          <div className="document-header-national">
            <div className="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="national-subtitle">Độc lập – Tự do – Hạnh phúc</div>
            <div className="separator">-----🙞✯🙜-----</div>
          </div>

          {/* Tiêu đề biên bản */}
          <div className="document-title">BIÊN BẢN NGHIỆM THU VÀ THANH LÝ HỢP ĐỒNG</div>
          
          {/* Căn cứ */}
          <div className="document-basis" style={{ marginTop: '1rem', fontStyle: 'normal' }}>
            - Căn cứ Hợp đồng cộng tác viên số: {contract.contractNumber};<br />
            - Căn cứ kết quả thực hiện hợp đồng của Hai Bên.
          </div>

          {/* Ngày tháng lập */}
          <div className="document-intro">
            Hôm nay, ngày {reportDateParts.day || '...'} tháng {reportDateParts.month || '...'} năm {reportDateParts.year || '...'}, chúng tôi gồm:
          </div>

          {/* THÔNG TIN BÊN A */}
          <div className="party-section">
            <div className="party-label">BÊN A : {company.name}</div>
            <div className="info-row">
              <div className="info-label">Đại diện</div>
              <div className="info-value">: {company.representative}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Chức vụ</div>
              <div className="info-value">: {company.position}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Địa chỉ</div>
              <div className="info-value">: {company.address}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Mã số thuế</div>
              <div className="info-value">: {company.taxCode}</div>
            </div>
            <div className="info-row" style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '0.1rem' }}>
              (Sau đây gọi là “Người sử dụng lao động” hoặc “NSDLĐ”)
            </div>
          </div>

          <div style={{ margin: '0.75rem 0', fontWeight: 'bold' }}>Và</div>

          {/* THÔNG TIN BÊN B */}
          <div className="party-section">
            <div className="party-label">BÊN B : Ông/Bà {freelancer.fullName}</div>
            <div className="info-row">
              <div className="info-label">Sinh ngày</div>
              <div className="info-value">: {formatDate(freelancer.birthDate)}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Địa chỉ</div>
              <div className="info-value">: {freelancer.address || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Số CMND/CCCD</div>
              <div className="info-value">: {freelancer.cccd} {freelancer.cccdDate ? ` Cấp ngày: ${formatDate(freelancer.cccdDate)}` : ''} {freelancer.cccdPlace ? ` Nơi cấp: ${freelancer.cccdPlace}` : ''}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Tên tài khoản</div>
              <div className="info-value">: {freelancer.bankAccountName}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Số tài khoản</div>
              <div className="info-value">: {freelancer.bankAccountNumber}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Ngân hàng</div>
              <div className="info-value">: {freelancer.bankName}</div>
            </div>
            <div className="info-row" style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '0.1rem' }}>
              (Sau đây gọi là “Người lao động” hoặc “NLĐ”)
            </div>
          </div>

          <div style={{ margin: '1.25rem 0' }}>
            Sau khi bàn bạc và thảo luận hai bên đồng ý ký kết Biên bản nghiệm thu và thanh lý hợp đồng (Sau đây gọi tắt là “Biên bản”) đối với Hợp đồng cộng tác viên số {contract.contractNumber} ngày {contractDateParts.day} tháng {contractDateParts.month} năm {contractDateParts.year} với những điều khoản sau:
          </div>

          {/* ĐIỀU 1 */}
          <div className="document-section-title">ĐIỀU 1: NỘI DUNG NGHIỆM THU</div>
          <div className="document-section-content">
            <p>NLĐ đã hoàn thành việc cung cấp cho NSDLĐ dịch vụ theo đúng thỏa thuận trong Hợp đồng cho dự án <strong style={{ textTransform: 'uppercase' }}>{job ? job.projectName : (contract.jobTitle || 'MONREI SAIGON')}</strong>, cụ thể:</p>
            {report.deliverableLink && (
              <p style={{ marginTop: '0.4rem', marginBottom: '0.8rem' }}>
                * File nghiệm thu công việc: <a href={report.deliverableLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'blue' }}>{report.deliverableLink}</a>
              </p>
            )}

            <table className="document-table">
              <thead>
                <tr>
                  <th className="num-col">STT</th>
                  <th>HẠNG MỤC</th>
                  <th className="unit-col">ĐƠN VỊ</th>
                  <th className="qty-col">SỐ LƯỢNG</th>
                  <th className="price-col">ĐƠN GIÁ (đ)</th>
                  <th className="amount-col">THÀNH TIỀN (đ)</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, idx) => (
                  <tr key={idx} style={!item.isOriginal ? { fontStyle: 'italic' } : {}}>
                    <td className="num-col">{idx + 1}</td>
                    <td>{item.name} {!item.isOriginal && '(Phát sinh ngoài HĐ)'}</td>
                    <td className="unit-col">{item.unit}</td>
                    <td className="qty-col">{item.quantity}</td>
                    <td className="price-col">{formatCurrency(item.unitPrice)}</td>
                    <td className="amount-col">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
                <tr className="summary-row">
                  <td colSpan="5">TỔNG CỘNG (ĐÃ BAO GỒM THUẾ TNCN)</td>
                  <td className="val">{formatCurrency(report.totalWithTax)}</td>
                </tr>
                <tr className="summary-row">
                  <td colSpan="5">THUẾ TNCN KHẤU TRỪ (10%)</td>
                  <td className="val">{formatCurrency(report.taxAmount)}</td>
                </tr>
                <tr className="summary-row">
                  <td colSpan="5">SỐ TIỀN THỰC NHẬN</td>
                  <td className="val">{formatCurrency(report.netAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ĐIỀU 2 */}
          <div className="document-section-title">ĐIỀU 2: TỔNG GIÁ TRỊ THANH LÝ HỢP ĐỒNG:</div>
          <div className="document-section-content">
            <p>NSDLĐ xác nhận rằng NLĐ đã hoàn thành đầy đủ nghĩa vụ theo Hợp đồng cộng tác viên Số: {contract.contractNumber} ngày {contractDateParts.day} tháng {contractDateParts.month} năm {contractDateParts.year}.</p>
            <p style={{ marginTop: '0.5rem' }}>
              * Giá trị hợp đồng: <strong>{formatCurrency(report.contractValue)} VNĐ</strong> (Bằng chữ: <em>{numberToVietnameseWords(report.contractValue)}</em>) (Đã khấu trừ thuế TNCN).
            </p>
            <p>
              * Giá trị phát sinh: <strong>{formatCurrency(report.additionalValue)} VNĐ</strong> (Bằng chữ: <em>{numberToVietnameseWords(report.additionalValue)}</em>) (Đã khấu trừ thuế TNCN).
            </p>
            <p>
              * Giá trị đã thanh toán: <strong>{formatCurrency(report.paidAmount)} VNĐ</strong> (Bằng chữ: <em>{numberToVietnameseWords(report.paidAmount)}</em>)
            </p>
            <p>
              * Số tiền còn lại cần thanh toán: <strong style={{ textDecoration: 'underline' }}>{formatCurrency(report.remainingAmount)} VNĐ</strong> (Bằng chữ: <em>{numberToVietnameseWords(report.remainingAmount)}</em>) (Đã khấu trừ thuế TNCN).
            </p>
          </div>

          {/* ĐIỀU 3 */}
          <div className="document-section-title">ĐIỀU 3: ĐIỀU KHOẢN CHUNG:</div>
          <div className="document-section-content">
            <p>* Biên bản Nghiệm thu và thanh lý hợp đồng đã được hai bên thống nhất và cùng ký tên.</p>
            <p>* Hai bên cam kết thực hiện các điều khoản trên và không có bất cứ khiếu nại, tranh chấp nào. Hợp đồng cộng tác viên số {contract.contractNumber} chấm dứt hiệu lực sau khi hai bên thực hiện đầy đủ nghĩa vụ của mỗi bên.</p>
            <p>* Biên bản này được lập thành 02 (hai) bản, NSDLĐ giữ 01 (một) bản, NLĐ giữ 01 (một) bản và có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.</p>
          </div>

          {/* Chữ ký hai bên */}
          <div className="signature-row">
            <div className="signature-block">
              <div className="title">BÊN B</div>
              <div className="subtitle">Người lao động</div>
              <div className="signature-space"></div>
              <div className="name">{freelancer.fullName}</div>
            </div>
            <div className="signature-block">
              <div className="title">BÊN A</div>
              <div className="subtitle">Người sử dụng lao động<br />Giám đốc</div>
              <div className="signature-space"></div>
              <div className="name">{company.representative}</div>
            </div>
          </div>

        </div>
      </div>

      {isExporting && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,10,19,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, flexDirection: 'column', gap: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-lg)', padding: '2.5rem 3rem',
            textAlign: 'center', boxShadow: 'var(--shadow-glow)', maxWidth: '400px'
          }}>
            <div className="empty-icon"><AppIcon name="fileCheck" size={44} /></div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
              Xuất Google Docs
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {exportProgress}
            </div>
            <div className="loading-spinner" style={{ width: '32px', height: '32px', margin: '1.25rem auto 0', display: exportProgress.startsWith('Lỗi:') || exportProgress.startsWith('Hoàn tất') ? 'none' : 'block' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
