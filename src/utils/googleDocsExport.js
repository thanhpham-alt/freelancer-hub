/**
 * Google Docs & Drive Export Utility for Freelancer Hub
 * Exports a contract to Google Docs using the template, fills placeholders,
 * uploads CCCD images to Drive, and inserts them at the end of the document.
 */

const CLIENT_ID = '118402438956-is4oo360jnbcd45u1tttodv83raaiu0p.apps.googleusercontent.com';
const TEMPLATE_DOC_ID = '1yFd2LMQh2MggR5_ImHK0M4OAJWGQiNW4g0-dLPnL66A'; // New Contract Template
const ACCEPTANCE_TEMPLATE_ID = '1WqzkXX-82ac21ZyxKCxeJK2tOy48YfAHXu42D033mos'; // Acceptance Report Template
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let accessToken = null;

// ─── OAuth Token ───────────────────────────────────────────────────────────────
export function getGoogleAccessToken() {
  return new Promise((resolve, reject) => {
    if (accessToken) { resolve(accessToken); return; }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services chưa tải xong. Vui lòng đợi vài giây rồi thử lại.'));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        accessToken = resp.access_token;
        resolve(accessToken);
      }
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '...';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function fmtCurrency(n) {
  return Number(n || 0).toLocaleString('vi-VN');
}

function numberToWords(n) {
  // Simple implementation – delegates to window if available
  if (typeof window.numberToVietnameseWords === 'function') {
    return window.numberToVietnameseWords(n);
  }
  return `${fmtCurrency(n)} đồng`;
}

// ─── Copy template on Drive ──────────────────────────────────────────────────
async function copyTemplate(token, title, templateId = TEMPLATE_DOC_ID) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${templateId}/copy`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: title })
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Không thể copy template');
  }
  const data = await res.json();
  return data.id;
}

// ─── Replace placeholders via Docs batchUpdate ──────────────────────────────
async function replacePlaceholders(token, docId, replacements) {
  const requests = replacements.map(({ from, to }) => ({
    replaceAllText: {
      containsText: { text: from, matchCase: true },
      replaceText: to
    }
  }));

  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Lỗi khi thay thế nội dung');
  }
}

// ─── Upload image (base64) to Drive, return fileId ──────────────────────────
async function uploadImageToDrive(token, base64DataUrl, filename) {
  // Convert base64 data URL to blob
  const arr = base64DataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  const blob = new Blob([u8arr], { type: mime });

  // Multipart upload
  const metadata = { name: filename, mimeType: mime };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Lỗi upload ảnh');
  }
  const data = await res.json();

  // Make publicly readable so Docs can fetch it
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });

  return data.id;
}

// ─── Get doc end index then insert image ─────────────────────────────────────
async function getDocEndIndex(token, docId) {
  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}?fields=body.content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const doc = await res.json();
  const content = doc.body?.content || [];
  // Last element is end of document sentinel
  const last = content[content.length - 1];
  return (last?.endIndex || 2) - 1;
}

async function insertImageAtEnd(token, docId, fileId, altText) {
  const endIndex = await getDocEndIndex(token, docId);
  const imageUrl = `https://drive.google.com/uc?id=${fileId}`;

  const requests = [
    // Insert a newline first
    {
      insertText: {
        location: { index: endIndex },
        text: '\n'
      }
    },
    // Insert image after the newline
    {
      insertInlineImage: {
        location: { index: endIndex + 1 },
        uri: imageUrl,
        objectSize: {
          height: { magnitude: 170, unit: 'PT' },
          width: { magnitude: 270, unit: 'PT' }
        }
      }
    }
  ];

  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Lỗi chèn ảnh vào tài liệu');
  }
}

// ─── Build items table text for placeholder ──────────────────────────────────
function buildItemsTable(items) {
  const rows = items.map((item, i) => {
    const total = (item.quantity || 1) * (item.unitPrice || 0);
    return `${i + 1}\t${item.name}\t${item.unit || 'Gói'}\t${item.quantity || 1}\t${fmtCurrency(item.unitPrice)}\t${fmtCurrency(total)}`;
  });
  return rows.join('\n');
}

// ─── Build payment schedule text ─────────────────────────────────────────────
function buildPaymentSchedule(phases) {
  return phases.map(p =>
    `* Đợt ${p.phase}: Thanh toán ${p.percentage}% giá trị Hợp đồng tương đương ${fmtCurrency(p.amount)} VNĐ. ${p.description || ''}`
  ).join('\n');
}

// ─── MAIN EXPORT FUNCTION ─────────────────────────────────────────────────────
export async function exportContractToGoogleDocs({ contract, freelancer, company, paymentPhases, onProgress }) {
  const report = onProgress || (() => {});

  report('🔐 Đang xác thực Google...');
  const token = await getGoogleAccessToken();

  const docTitle = `HDCTV_${contract.contractNumber || contract.id}`;
  report('📋 Đang copy template hợp đồng...');
  const docId = await copyTemplate(token, docTitle);

  // Build all replacements
  const totalAmount = contract.totalAmount || 0;
  const taxAmount = contract.taxAmount || 0;
  const netAmount = contract.netAmount || 0;
  const taxRate = contract.taxRate || 10;

  const signDateParts = (contract.signDate || '').split('-');
  const day = signDateParts[2] || '...';
  const month = signDateParts[1] || '...';
  const year = signDateParts[0] || '...';

  const replacements = [
    { from: 'Số: 20260420/PHAMDUYCUONG-MAC-HDCTV', to: `Số: ${contract.contractNumber}` },
    { from: 'ngày 20 tháng 04 năm 2026', to: `ngày ${day} tháng ${month} năm ${year}` },
    // Bên B
    { from: 'PHẠM DUY CƯƠNG', to: freelancer.fullName },
    { from: 'PHẠM DUY CƯƠNG', to: freelancer.fullName },
    { from: '08/05/1985', to: fmtDate(freelancer.birthDate) },
    { from: '62 Phạm Thái Bường, Phường Phước Hậu, Tỉnh Vĩnh Long', to: freelancer.address || '' },
    { from: '0909440585', to: freelancer.phone || '' },
    { from: '086085006067', to: freelancer.cccd || '' },
    { from: '11/04/2025', to: fmtDate(freelancer.cccdDate) },
    { from: 'CA. Xã Nhà Bè', to: freelancer.cccdPlace || '' },
    { from: 'Phạm Duy Cương', to: freelancer.bankAccountName || freelancer.fullName },
    { from: '0909440585', to: freelancer.bankAccountNumber || freelancer.phone },
    { from: 'Ngân hàng Quân Đội – MBbank', to: freelancer.bankName || '' },
    // Điều 1
    { from: 'Hợp đồng Cộng tác viên (không độc quyền)', to: contract.contractType || 'Hợp đồng Cộng tác viên (không độc quyền)' },
    { from: '20/04/2026 - 30/06/2026', to: `${fmtDate(contract.startDate)} - ${fmtDate(contract.endDate)}` },
    { from: 'tự do\n1.4', to: `${contract.workLocation || 'tự do'}\n1.4` },
    { from: 'Coding Website MONREI SAIGON', to: contract.jobTitle || '' },
    // Bảng hạng mục
    { from: '1\tXây dựng website MONREI SAIGON\tGói\t1\t33.000.000\t33.000.000', to: buildItemsTable(contract.items || []) },
    { from: '33.000.000\n\tTHUẾ TNCN 10%', to: `${fmtCurrency(totalAmount)}\n\tTHUẾ TNCN ${taxRate}%` },
    { from: '\t3.300.000', to: `\t${fmtCurrency(taxAmount)}` },
    { from: '\t29.700.000\n\t', to: `\t${fmtCurrency(netAmount)}\n\t` },
    // Điều 2
    { from: '29.700.000 VNĐ (Bằng chữ: Hai mươi chín triệu bảy trăm nghìn đồng chẵn)', to: `${fmtCurrency(netAmount)} VNĐ` },
    { from: '* Đợt 1: Thanh toán 50% giá trị Hợp đồng tương đương 14.850.000 VNĐ (Bằng chữ: Mười bốn triệu tám trăm năm mươi nghìn đồng) trong vòng 07 ngày làm việc kể từ ngày hai bên ký hợp đồng hợp lệ.\n* Đợt 2: Thanh toán giá trị Hợp đồng còn lại tương đương 14.850.000 VNĐ (Bằng chữ: Mười bốn triệu tám trăm năm mươi nghìn đồng) trong vòng 07 ngày làm việc kể từ khi Bên A nhận được biên bản nghiệm thu & thanh lý hợp đồng hợp lệ.', to: buildPaymentSchedule(paymentPhases) },
    { from: 'Chuyển khoản.', to: `${contract.paymentMethod || 'Chuyển khoản'}.` },
    // Hiệu lực
    { from: 'ngày 20 tháng 04 năm 2026.', to: `ngày ${day} tháng ${month} năm ${year}.` },
    // Chữ ký
    { from: 'PHẠM DUY CƯƠNG\n\tNgười sử dụng lao động', to: `${freelancer.fullName}\n\tNgười sử dụng lao động` },
    { from: 'NGUYỄN THỊ THU THẢO', to: company.representative || 'NGUYỄN THỊ THU THẢO' },
  ];

  report('✏️ Đang điền thông tin hợp đồng...');
  await replacePlaceholders(token, docId, replacements);

  // Insert CCCD images if available
  if (freelancer.cccdFront || freelancer.cccdBack) {
    report('🪪 Đang upload ảnh CCCD lên Drive...');

    if (freelancer.cccdFront) {
      const frontId = await uploadImageToDrive(token, freelancer.cccdFront, `CCCD_mat_truoc_${freelancer.fullName}.jpg`);
      report('🪪 Đang chèn ảnh mặt trước CCCD...');
      await insertImageAtEnd(token, docId, frontId, 'CCCD mặt trước');
    }
    if (freelancer.cccdBack) {
      const backId = await uploadImageToDrive(token, freelancer.cccdBack, `CCCD_mat_sau_${freelancer.fullName}.jpg`);
      report('🪪 Đang chèn ảnh mặt sau CCCD...');
      await insertImageAtEnd(token, docId, backId, 'CCCD mặt sau');
    }
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  report('✅ Hoàn tất!');
  return { docId, docUrl };
}

// ─── ACCEPTANCE REPORT EXPORT ────────────────────────────────────────────────
export async function exportAcceptanceReportToGoogleDocs({ report: rpt, contract, freelancer, company, onProgress }) {
  const report = onProgress || (() => {});

  report('🔐 Đang xác thực Google...');
  const token = await getGoogleAccessToken();

  const docTitle = `BBNT_${contract.contractNumber || contract.id}`;
  report('📋 Đang copy template nghiệm thu...');
  const docId = await copyTemplate(token, docTitle, ACCEPTANCE_TEMPLATE_ID);

  const contractDateParts = (contract.signDate || '').split('-');
  const reportDateParts = (rpt.reportDate || '').split('-');
  const day = reportDateParts[2] || '...';
  const month = reportDateParts[1] || '...';
  const year = reportDateParts[0] || '...';

  const replacements = [
    { from: '20251118/PHAMDUYCUONG -MAC-HĐCTV', to: contract.contractNumber },
    { from: 'ngày  15  tháng  03   năm 2026', to: `ngày ${day} tháng ${month} năm ${year}` },
    // Bên B
    { from: 'PHẠM DUY CƯƠNG', to: freelancer.fullName },
    { from: 'PHẠM DUY CƯƠNG', to: freelancer.fullName },
    { from: '08/05/1985', to: fmtDate(freelancer.birthDate) },
    { from: '62 Phạm Thái Bường, Phường Phước Hậu, Tỉnh Vĩnh Long', to: freelancer.address || '' },
    { from: '086085006067', to: freelancer.cccd || '' },
    { from: '11/04/2025', to: fmtDate(freelancer.cccdDate) },
    { from: 'CA. Xã Nhà Bè', to: freelancer.cccdPlace || '' },
    { from: 'Phạm Duy Cương', to: freelancer.bankAccountName || freelancer.fullName },
    { from: '0909440585', to: freelancer.bankAccountNumber || freelancer.phone },
    { from: 'Ngân hàng Quân Đội – MBbank', to: freelancer.bankName || '' },
    // Nội dung
    { from: 'Dựng video clip Tiktok', to: contract.jobTitle || 'Dự án' },
    // Số tiền
    { from: '21.000.000 VNĐ', to: `${fmtCurrency(rpt.contractValue)} VNĐ` },
    { from: 'Hai mươi mốt triệu đồng chẵn', to: numberToWords(rpt.contractValue) },
    { from: '400.000 VNĐ', to: `${fmtCurrency(rpt.additionalValue || 0)} VNĐ` },
    { from: 'Bốn trăm nghìn đồng chẵn', to: numberToWords(rpt.additionalValue || 0) },
    { from: '10.500.000 VNĐ', to: `${fmtCurrency(rpt.paidAmount || 0)} VNĐ` },
    { from: 'Mười triệu năm trăm ngàn đồng chẵn', to: numberToWords(rpt.paidAmount || 0) },
    { from: '10.900.000 VNĐ', to: `${fmtCurrency(rpt.remainingAmount)} VNĐ` },
    { from: 'Mười triệu chín trăm nghìn đồng chẵn', to: numberToWords(rpt.remainingAmount) }
  ];

  report('✏️ Đang điền thông tin biên bản...');
  await replacePlaceholders(token, docId, replacements);

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  report('✅ Hoàn tất!');
  return { docId, docUrl };
}
