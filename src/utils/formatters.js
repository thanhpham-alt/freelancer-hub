// Format number as Vietnamese currency: 1000000 -> '1.000.000'
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('vi-VN');
}

// Format date: '2026-04-20' -> '20/04/2026'
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Format date long: '2026-04-20' -> '20 tháng 04 năm 2026'
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
}

// Extract day, month, year from date string
export function extractDate(dateStr) {
  if (!dateStr) return { day: '...', month: '...', year: '...' };
  const parts = dateStr.split('-');
  return { day: parts[2], month: parts[1], year: parts[0] };
}

// Chuyển số thành chữ Tiếng Việt chuyên nghiệp
export function numberToVietnameseWords(num) {
  if (num === 0) return 'Không đồng';
  if (!num || isNaN(num)) return '';
  
  num = Math.round(Number(num));
  
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const positions = ['', 'nghìn', 'triệu', 'tỷ'];
  
  function readThreeDigits(n, showZeroHundred) {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const one = n % 10;
    let result = '';
    
    if (hundred > 0) {
      result += ones[hundred] + ' trăm';
      if (ten === 0 && one > 0) {
        result += ' lẻ';
      }
    } else if (showZeroHundred) {
      result += 'không trăm';
      if (ten === 0 && one > 0) {
        result += ' lẻ';
      }
    }
    
    if (ten > 1) {
      result += ' ' + ones[ten] + ' mươi';
      if (one === 1) {
        result += ' mốt';
      } else if (one === 5) {
        result += ' lăm';
      } else if (one > 0) {
        result += ' ' + ones[one];
      }
    } else if (ten === 1) {
      result += ' mười';
      if (one === 5) {
        result += ' lăm';
      } else if (one > 0) {
        result += ' ' + ones[one];
      }
    } else if (one > 0) {
      result += ' ' + ones[one];
    }
    
    return result.trim();
  }
  
  if (num < 0) {
    return 'Âm ' + numberToVietnameseWords(-num);
  }
  
  let result = '';
  let groups = [];
  let temp = num;
  
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }
  
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) {
      // Nếu nhóm tỉ (i = 3) hoặc nhóm triệu (i = 2) nhưng có giá trị cao hơn
      if (i % 3 === 0 && groups.slice(i).some(x => x > 0)) {
        result += 'tỷ ';
      }
      continue;
    }
    const showZero = i < groups.length - 1;
    const text = readThreeDigits(groups[i], showZero);
    if (text) {
      result += text + ' ' + positions[i] + ' ';
    }
  }
  
  result = result.trim();
  
  // Xử lý các khoảng trắng thừa
  result = result.replace(/\s+/g, ' ');
  
  // Viết hoa chữ cái đầu tiên
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  // Thêm chữ "đồng chẵn" hoặc "đồng" ở cuối
  result += ' đồng chẵn';
  
  return result;
}

// Remove Vietnamese diacritics
export function removeDiacritics(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
    .replace(/\s+/g, '')
    .toUpperCase();
}

// Generate contract number: YYYYMMDD/NAME-MAC-HDCTV
export function generateContractNumber(freelancerName, date, companyShortName = 'MAC') {
  const d = date ? date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '');
  const name = removeDiacritics(freelancerName);
  return `${d}/${name}-${companyShortName}-HDCTV`;
}

// Generate report reference from contract number
export function generateReportNumber(contractNumber) {
  return contractNumber ? contractNumber.replace('HDCTV', 'BBNT') : '';
}
