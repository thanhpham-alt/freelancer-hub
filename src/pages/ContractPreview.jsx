import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getContractById, getFreelancerById, getJobById, getPaymentSchedulesByContract, saveContract } from '../data/store';
import { getCompanyInfo } from '../data/companyInfo';
import { formatCurrency, formatDate, formatDateLong, numberToVietnameseWords, extractDate } from '../utils/formatters';
import { exportContractToGoogleDocs } from '../utils/googleDocsExport';
import '../print.css';

export default function ContractPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [company, setCompany] = useState({});
  const [job, setJob] = useState(null);
  const [payments, setPayments] = useState([]);
  const [zoomImg, setZoomImg] = useState(null);

  // Google Docs export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [googleDocUrl, setGoogleDocUrl] = useState('');

  useEffect(() => {
    const c = await getContractById(id);
    if (c) {
      setContract(c);
      setFreelancer(await getFreelancerById(c.freelancerId));
      if (c.jobId) setJob(await getJobById(c.jobId));
      setPayments(await getPaymentSchedulesByContract(c.id).sort((a, b) => a.phase - b.phase));
      if (c.googleDocUrl) setGoogleDocUrl(c.googleDocUrl);
    }
    setCompany(getCompanyInfo());
  }, [id]);

  if (!contract || !freelancer) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>Đang tải hợp đồng...</p>
        </div>
      </div>
    );
  }

  const signDateParts = extractDate(contract.signDate);
  const birthParts = extractDate(freelancer.birthDate);

  const handlePrint = () => window.print();

  const handleGoogleDocsExport = async () => {
    setIsExporting(true);
    setExportProgress('🔐 Đang xác thực Google...');
    try {
      const { docUrl } = await exportContractToGoogleDocs({
        contract,
        freelancer,
        company,
        paymentPhases: payments,
        onProgress: setExportProgress
      });
      // Save link back to contract
      await saveContract({ ...contract, googleDocUrl: docUrl });
      setGoogleDocUrl(docUrl);
      setExportProgress('✅ Hoàn tất! Đang mở Google Docs...');
      setTimeout(() => { window.open(docUrl, '_blank'); setIsExporting(false); }, 1000);
    } catch (err) {
      console.error(err);
      setExportProgress(`❌ Lỗi: ${err.message}`);
      setTimeout(() => setIsExporting(false), 3000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Xem trước hợp đồng</h1>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/contracts')}>
            ⬅ Quay lại danh sách
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
            ✏️ Chỉnh sửa
          </button>
          {googleDocUrl ? (
            <a href={googleDocUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              📄 Mở Google Docs
            </a>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleGoogleDocsExport} disabled={isExporting}>
              {isExporting ? '⏳ Đang xuất...' : '📄 Xuất Google Docs'}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            🖨️ In hợp đồng (PDF)
          </button>
        </div>
      </div>

      <div className="document-preview-container">
        <div className="document-preview">
          
          {/* Quốc hiệu tiêu ngữ */}
          <div className="document-header-national">
            <div className="national-title">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="national-subtitle">Độc lập - Tự do - Hạnh phúc</div>
            <div className="separator">----o0o----</div>
          </div>

          {/* Tiêu đề hợp đồng */}
          <div className="document-title">HỢP ĐỒNG LAO ĐỘNG</div>
          <div className="document-subtitle">CỘNG TÁC VIÊN</div>
          <div className="document-number">Số: {contract.contractNumber}</div>

          {/* Căn cứ pháp lý */}
          <div className="document-basis">
            Căn cứ vào Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;<br />
            Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;<br />
            Luật Thương mại số 36/2005/QH11 ngày 14/06/2005;<br />
            Luật Quảng cáo số 16/2012/QH13 ngày 21/06/2012 (sửa đổi, bổ sung năm 2018);<br />
            Luật Sở hữu trí tuệ số 50/2005/QH11 ngày 29/11/2005 (sửa đổi, bổ sung năm 2022);<br />
            Thông tư 86/2024/TT-BTC ngày 28/12/2024 của Bộ Tài chính;<br />
            Và sự thỏa thuận tự nguyện của các Bên
          </div>

          {/* Ngày tháng địa điểm ký */}
          <div className="document-intro">
            Hôm nay, ngày {signDateParts.day || '...'} tháng {signDateParts.month || '...'} năm {signDateParts.year || '...'}, tại Tp. Hồ Chí Minh, chúng tôi gồm:
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
              (Sau đây gọi là Bên A)
            </div>
          </div>

          <div style={{ margin: '0.75rem 0', fontWeight: 'bold' }}>Và</div>

          {/* THÔNG TIN BÊN B */}
          <div className="party-section">
            <div className="party-label">BÊN B : {freelancer.fullName}</div>
            <div className="info-row">
              <div className="info-label">Sinh ngày</div>
              <div className="info-value">: {formatDate(freelancer.birthDate)}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Địa chỉ</div>
              <div className="info-value">: {freelancer.address || '—'}</div>
            </div>
            <div className="info-row">
              <div className="info-label">Số điện thoại</div>
              <div className="info-value">: {freelancer.phone}</div>
            </div>
            <div className="info-row">
              <div className="info-label">MST/ Số CCCD</div>
              <div className="info-value">: {freelancer.cccd}</div>
            </div>
            {freelancer.cccdDate && (
              <div className="info-row">
                <div className="info-label">Cấp ngày</div>
                <div className="info-value">: {formatDate(freelancer.cccdDate)} {freelancer.cccdPlace ? ` tại ${freelancer.cccdPlace}` : ''}</div>
              </div>
            )}
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
              (Sử dụng làm MST từ 01/07/2025 theo TT 86/2024/TT-BTC)
            </div>
            <div className="info-row" style={{ fontStyle: 'italic', fontSize: '11pt' }}>
              (Sau đây gọi là Bên B)
            </div>
          </div>

          <div style={{ margin: '1.25rem 0' }}>
            Thỏa thuận ký kết hợp đồng lao động và cam kết thực hiện đúng những điều khoản sau đây:
          </div>

          {/* ĐIỀU 1 */}
          <div className="document-section-title">Điều 1. Chi tiết công việc</div>
          <div className="document-section-content">
            <p>1.1. Loại Hợp đồng: {contract.contractType}.</p>
            <p>1.2. Thời gian làm việc: Từ {formatDate(contract.startDate)} đến {formatDate(contract.endDate)}</p>
            <p>1.3. Địa điểm làm việc: {contract.workLocation}.</p>
            <p>1.4. Phương tiện đi lại làm việc: Do cá nhân tự túc.</p>
            <p>1.5. Chức danh chuyên môn (vị trí công tác): {contract.jobTitle}.</p>
            <p>1.6. Công việc: Bên B đồng ý cung cấp dịch vụ và Bên A đồng ý sử dụng dịch vụ {contract.jobTitle} chi tiết hạng mục như sau:</p>

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
                {contract.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="num-col">{idx + 1}</td>
                    <td>{item.name}</td>
                    <td className="unit-col">{item.unit}</td>
                    <td className="qty-col">{item.quantity}</td>
                    <td className="price-col">{formatCurrency(item.unitPrice)}</td>
                    <td className="amount-col">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
                <tr className="summary-row">
                  <td colSpan="5">TỔNG CỘNG</td>
                  <td className="val">{formatCurrency(contract.totalAmount)}</td>
                </tr>
                <tr className="summary-row">
                  <td colSpan="5">THUẾ TNCN {contract.taxRate}%</td>
                  <td className="val">{formatCurrency(contract.taxAmount)}</td>
                </tr>
                <tr className="summary-row" style={{ color: '#000' }}>
                  <td colSpan="5">THỰC NHẬN</td>
                  <td className="val">{formatCurrency(contract.netAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ĐIỀU 2 */}
          <div className="document-section-title">Điều 2. Thù lao và thanh toán</div>
          <div className="document-section-content">
            <p>2.1. Thù lao Người lao động được thanh toán là: <strong style={{ textDecoration: 'underline' }}>{formatCurrency(contract.netAmount)} VNĐ</strong> (Bằng chữ: <span style={{ fontStyle: 'italic' }}>{numberToVietnameseWords(contract.netAmount)}</span>) (Đã trừ thuế Bên A đóng cho Bên B).</p>
            <p>2.2. Thời gian thanh toán: chia thành {payments.length} đợt</p>
            {payments.map(p => (
              <p key={p.id} style={{ paddingLeft: '1rem' }}>
                * Đợt {p.phase}: Thanh toán {p.percentage}% giá trị Hợp đồng tương đương <strong>{formatCurrency(p.amount)} VNĐ</strong> {p.description} {p.dueDate ? `Hạn thanh toán dự kiến: ${formatDate(p.dueDate)}.` : ''}
              </p>
            ))}
            <p>2.3. Hình thức thanh toán: {contract.paymentMethod}.</p>
          </div>

          {/* ĐIỀU 3 */}
          <div className="document-section-title">Điều 3. Quyền và nghĩa vụ của Bên B</div>
          <div className="document-section-content">
            <p><strong>3.1. Quyền:</strong></p>
            <p>* Được trả thù lao và đóng thuế TNCN theo thỏa thuận tại Hợp đồng này.</p>
            <p>* Quyền sử dụng hình ảnh và sở hữu trí tuệ thuộc về Bên B.</p>
            <p>* Có quyền đề xuất, khiếu nại, thay đổi, tạm hoãn, chấm dứt hợp đồng lao động theo quy định của Pháp luật lao động hiện hành.</p>
            <p>* Được cung cấp thông tin, phương tiện vào mục đích hỗ trợ công việc. Có quyền từ chối thực hiện nếu nội dung yêu cầu vi phạm pháp luật hoặc thông tin về sản phẩm vi phạm bản quyền, nhãn hiệu.</p>
            
            <p style={{ marginTop: '0.4rem' }}><strong>3.2. Nghĩa vụ:</strong></p>
            <p>* Trong công việc, chịu sự điều phối, quản lý của Bên A và thực hiện đầy đủ nội dung và thành phẩm dựa theo những gì đã thống nhất với nhãn hàng.</p>
            <p>* Nắm rõ, chấp hành nghiêm túc và hoàn thành mọi công việc đã thỏa thuận đúng theo quy định.</p>
            <p>* Báo cáo công việc theo yêu cầu của Bên A.</p>
            <p>* Bồi thường thiệt hại theo Quy định của Công ty trong trường hợp làm hư hỏng, tổn thất đến uy tín, công việc của Công ty.</p>
            <p>* Trong trường hợp Bên B bị kết án bằng một bản án hoặc quyết định của Tòa án hoặc liên quan đến bất kỳ sự cố, sự việc nào dẫn đến việc gây tranh cãi, làm giảm hình ảnh, uy tín của Bên A cũng như các chủ thể liên quan khác và gây ra thiệt hại thì Bên A có quyền đơn phương chấm dứt HĐLĐ. Đồng thời, Bên B phải bồi thường cho Bên A toàn bộ giá trị thiệt hại thực tế đã xảy ra.</p>
            <p>* Thực hiện đúng và đầy đủ công việc được giao một cách tận tâm, thiện chí, hợp pháp, tuân thủ các quy định pháp luật, và không trái với các tập quán, văn hóa và thuần phong mỹ tục của Việt Nam.</p>
            <p>* Không được thực hiện bất kỳ hành động, cử chỉ, tuyên bố, phát ngôn, hoặc có bất kỳ hình ảnh hay hành vi nào khác làm ảnh hưởng theo bất kỳ hình thức nào đến uy tín, hình ảnh và thương hiệu của công ty cùng các bên liên quan trong quá trình thực hiện công việc.</p>
            <p>* Thông báo ngay cho Bên A nếu có vấn đề phát sinh liên quan đến công việc (các kênh cá nhân có sự cố hoặc có sự kiện bất khả kháng không thể tiếp tục thực hiện công việc dù đã thực hiện mọi cách khắc phục,…)</p>
            <p>* Không được xóa bài đăng trên kênh trừ trường hợp bất khả kháng hoặc thỏa thuận của các bên.</p>
          </div>

          {/* ĐIỀU 4 */}
          <div className="document-section-title">Điều 4. Quyền và nghĩa vụ của Bên A</div>
          <div className="document-section-content">
            <p><strong>4.1. Quyền:</strong></p>
            <p>* Có quyền tạm ngừng việc, thay đổi, tạm hoãn, chấm dứt hợp đồng lao động; áp dụng các biện pháp kỷ luật hoặc yêu cầu bồi thường hoặc khiếu nại tới các cơ quan có thẩm quyền trong trường hợp Người lao động không tuân thủ công việc và vi phạm các thỏa thuận theo Hợp đồng này cũng như các quy định khác của pháp luật.</p>
            <p>* Có quyền kiểm tra, giám sát việc thực hiện công việc của Bên B.</p>
            <p>* Có quyền yêu cầu Bên B báo cáo tiến độ thực hiện công việc.</p>
            <p>* Có quyền yêu cầu Bên B gỡ bỏ những sản phẩm làm ảnh hưởng uy tín của công ty hoặc sai lệch thông tin trên các nền tảng đã đăng tải.</p>
            
            <p style={{ marginTop: '0.4rem' }}><strong>4.2. Nghĩa vụ:</strong></p>
            <p>* Thanh toán đầy đủ thù lao, đóng thuế TNCN và cung cấp đầy đủ những điều kiện, phương tiện, thông tin liên quan đến công việc cho Bên B.</p>
            <p>* Đảm bảo cung cấp thông tin cho Bên B trung thực, chính xác và chịu trách nhiệm trong trường hợp những thông tin đó có vấn đề phát sinh (sai, tranh chấp, bản quyền,..)</p>
            <p>* Đảm bảo thông báo những thay đổi về nội dung công việc cho Bên B và chịu trách nhiệm về mọi hậu quả trong trường hợp không thông báo kịp thời đến Bên B.</p>
            <p>* Không xóa/ gỡ bỏ những sản phẩm của Bên B, trừ trường hợp sản phẩm đó vi phạm pháp luật, các chuẩn mực đạo đức xã hội, trái với thuần phong mỹ tục hoặc Bên B vi phạm các nghĩa vụ theo điều 3.2.</p>
          </div>

          {/* ĐIỀU 5 */}
          <div className="document-section-title">Điều 5. Bảo mật thông tin</div>
          <div className="document-section-content">
            <p>* Bên B cam kết không tiết lộ bất kỳ thông tin nào liên quan đến Bên A hoặc do Bên A cung cấp, trừ thông tin phục vụ mục đích quảng cáo.</p>
            <p>* Không sử dụng các tài liệu, sản phẩm, nội dung quảng cáo cho bất kỳ mục đích nào khác ngoài việc thực hiện hợp đồng.</p>
          </div>

          {/* ĐIỀU 6 */}
          <div className="document-section-title">Điều 6. Giải quyết tranh chấp</div>
          <div className="document-section-content">
            <p>* Mọi tranh chấp phát sinh liên quan đến việc thực hiện hoặc giải thích Hợp đồng này sẽ được các Bên ưu tiên giải quyết thông qua thương lượng và hòa giải trên tinh thần hợp tác, thiện chí và tôn trọng lẫn nhau.</p>
            <p>* Trong trường hợp thương lượng không thành trong vòng 15 (mười lăm) ngày kể từ ngày một bên gửi văn bản yêu cầu giải quyết tranh chấp, tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền tại nơi Bên A đặt trụ sở chính, trừ khi hai bên có thỏa thuận khác bằng văn bản.</p>
            <p>* Trong quá trình giải quyết tranh chấp, các Bên vẫn phải tiếp tục thực hiện các nghĩa vụ không có liên quan đến nội dung tranh chấp (nếu có) theo Hợp đồng này, trừ khi việc thực hiện tiếp tục sẽ gây tổn hại nghiêm trọng đến quyền lợi của một trong hai bên.</p>
          </div>

          {/* ĐIỀU 7 */}
          <div className="document-section-title">Điều 7. Các thỏa thuận khác</div>
          <div className="document-section-content">
            <p>7.1. Hai bên phải tuân thủ những thỏa thuận đã giao kết tại hợp đồng này.</p>
            <p>7.2. Khi hợp đồng lao động này hết hạn mà người lao động vẫn tiếp tục làm việc hoặc hai bên có nhu cầu tiếp tục thực hiện thì trong thời gian 30 (ba mươi) ngày kể từ ngày hết hạn hợp đồng, hai bên phải ký kết hợp đồng lao động mới hoặc phụ lục điều chỉnh thời gian. Trong thời gian chưa ký kết hợp đồng hoặc phụ lục mới, hai bên vẫn phải tuân theo hợp đồng lao động đã giao kết.</p>
            <p>7.3. Trong quá trình thực hiện hợp đồng nếu một bên có nhu cầu thay đổi nội dung trong hợp đồng phải báo cho bên kia biết trước ít nhất 15 (mười lăm) ngày và hai bên sẽ tiến hành ký kết bản phụ lục hợp đồng điều chỉnh. Trong thời gian tiến hành thỏa thuận hai bên vẫn tuân theo những nội dung đã có hiệu lực tại hợp đồng này.</p>
            <p>7.4. Hai bên đã đọc kỹ, hiểu rõ và cam kết thực hiện các điều khoản và quy định ghi tại hợp đồng lao động này.</p>
            <p>7.5. Hợp đồng sẽ tự thanh lý khi hai bên hoàn tất mọi nghĩa vụ đã thoả thuận.</p>
          </div>

          {/* ĐIỀU 8 */}
          <div className="document-section-title">Điều 8. Điều khoản thi hành</div>
          <div className="document-section-content">
            <p>8.1. Những vấn đề về lao động không thể hiện trong hợp đồng này sẽ áp dụng theo quy định của pháp luật lao động hiện hành.</p>
            <p>8.2. Hợp đồng lao động này làm thành 02 (hai) bản tiếng việt có giá trị như nhau:</p>
            <p style={{ paddingLeft: '1rem' }}>- 01 bản do Người lao động giữ.</p>
            <p style={{ paddingLeft: '1rem' }}>- 01 bản do Người sử dụng lao động giữ.</p>
            <p>Khi hai bên ký kết Phụ lục hợp đồng thì nội dung của Phụ lục vẫn có hiệu lực và có giá trị pháp lý.</p>
            <p>Hợp đồng lao động này có hiệu lực từ ngày {signDateParts.day || '...'} tháng {signDateParts.month || '...'} năm {signDateParts.year || '...'}.</p>
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

          {/* CCCD 2 mặt */}
          {(freelancer.cccdFront || freelancer.cccdBack) && (
            <div className="cccd-contract-section">
              <div className="cccd-contract-divider"></div>
              <div className="cccd-contract-title">HÌNH ẢNH CĂN CƯỜC CÔNG DÂN (2 MẶT)</div>
              <div className="cccd-contract-images">
                {freelancer.cccdFront && (
                  <div className="cccd-contract-img-wrap">
                    <div className="cccd-contract-img-label">Mặt trước</div>
                    <img
                      src={freelancer.cccdFront}
                      alt="CCCD mặt trước"
                      className="cccd-contract-img"
                      onClick={() => setZoomImg(freelancer.cccdFront)}
                    />
                  </div>
                )}
                {freelancer.cccdBack && (
                  <div className="cccd-contract-img-wrap">
                    <div className="cccd-contract-img-label">Mặt sau</div>
                    <img
                      src={freelancer.cccdBack}
                      alt="CCCD mặt sau"
                      className="cccd-contract-img"
                      onClick={() => setZoomImg(freelancer.cccdBack)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Export progress overlay */}
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
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
              Xuất Google Docs
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {exportProgress}
            </div>
            <div className="loading-spinner" style={{ width: '32px', height: '32px', margin: '1.25rem auto 0', display: exportProgress.startsWith('❌') || exportProgress.startsWith('✅') ? 'none' : 'block' }}></div>
          </div>
        </div>
      )}

      {/* Image zoom overlay */}
      {zoomImg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}
          onClick={() => setZoomImg(null)}
        >
          <img src={zoomImg} alt="CCCD zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 60px rgba(139,92,246,0.4)' }} />
        </div>
      )}
    </div>
  );
}
