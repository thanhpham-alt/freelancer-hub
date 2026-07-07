import mammoth from 'mammoth';

/**
 * Normalizes keys to match freelancer model fields.
 */
const FIELD_MAPPINGS = {
  fullName: ['họ và tên', 'họ tên', 'bên b', 'họ & tên', 'name', 'full name'],
  birthDate: ['ngày sinh', 'sinh ngày', 'date of birth', 'dob'],
  phone: ['số điện thoại', 'sđt', 'phone', 'telephone', 'tel'],
  address: ['địa chỉ', 'nơi cư trú', 'địa chỉ thường trú', 'address'],
  cccd: ['số cccd', 'cccd', 'mst', 'mã số thuế', 'identity card', 'id number'],
  cccdDate: ['ngày cấp', 'cấp ngày', 'issue date'],
  cccdPlace: ['nơi cấp', 'cấp tại', 'issue place'],
  bankAccountName: ['chủ tài khoản', 'tên tài khoản', 'tên tk', 'account name'],
  bankAccountNumber: ['số tài khoản', 'stk', 'account number'],
  bankName: ['ngân hàng', 'tại ngân hàng', 'bank']
};

function matchField(headerText) {
  const cleanHeader = headerText.toLowerCase().trim().replace(/[:/]/g, '');
  for (const [field, keywords] of Object.entries(FIELD_MAPPINGS)) {
    if (keywords.some(kw => cleanHeader.includes(kw))) {
      return field;
    }
  }
  return null;
}

/**
 * Extracts and parses freelancer data from a DOCX file.
 * Returns an array of parsed freelancer objects.
 */
export async function parseDocxFreelancers(arrayBuffer) {
  try {
    // 1. Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const htmlContent = result.value;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // 2. Try parsing tables first (common for multi-freelancer lists)
    const tables = doc.querySelectorAll('table');
    let freelancers = [];
    
    if (tables.length > 0) {
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) return;
        
        // Find header mapping
        const headers = Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent.trim());
        const colMappings = headers.map(header => matchField(header));
        
        // If at least we mapped fullName and phone/cccd, parse this table
        if (colMappings.includes('fullName')) {
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length === 0) continue;
            
            const freelancer = { nationality: 'Việt Nam' };
            let hasData = false;
            
            cells.forEach((cell, cellIdx) => {
              const fieldName = colMappings[cellIdx];
              if (fieldName) {
                const text = cell.textContent.trim();
                if (text) {
                  freelancer[fieldName] = text;
                  hasData = true;
                }
              }
            });
            
            if (hasData && freelancer.fullName) {
              // Normalize dates
              if (freelancer.birthDate) freelancer.birthDate = parseDateString(freelancer.birthDate);
              if (freelancer.cccdDate) freelancer.cccdDate = parseDateString(freelancer.cccdDate);
              freelancers.push(freelancer);
            }
          }
        }
      });
    }
    
    // 3. Fallback: Parse paragraphs if no tables or tables yielded nothing
    if (freelancers.length === 0) {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const textContent = textResult.value;
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let currentFreelancer = null;
      
      // We look for patterns to start a new freelancer block
      // In the user's contract file, it starts with "BÊN B : PHẠM DUY CƯƠNG"
      // Or in other files it might start with "Họ và tên: "
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for new freelancer start
        const isNewBlock = 
          line.toUpperCase().includes('BÊN B') || 
          line.toUpperCase().startsWith('HỌ VÀ TÊN') || 
          line.toUpperCase().startsWith('HỌ TÊN') ||
          line.toUpperCase().startsWith('FREELANCER:');
          
        if (isNewBlock) {
          if (currentFreelancer && currentFreelancer.fullName) {
            freelancers.push(currentFreelancer);
          }
          currentFreelancer = { nationality: 'Việt Nam' };
          
          // Try to extract name from this line itself if it has colon or hyphen
          // e.g. "BÊN B        :        PHẠM DUY CƯƠNG"
          const parts = line.split(/[:\-]/);
          if (parts.length > 1) {
            currentFreelancer.fullName = parts.slice(1).join(' ').trim();
          }
        }
        
        if (currentFreelancer) {
          // Parse key-value pairs
          // e.g., "Sinh ngày        :         08/05/1985"
          const parts = line.split(/[:\-]/);
          if (parts.length > 1) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            const mappedField = matchField(key);
            
            if (mappedField && value) {
              if (mappedField === 'fullName' && currentFreelancer.fullName) {
                // Keep the one extracted during block initialization unless empty
              } else {
                currentFreelancer[mappedField] = value;
              }
            }
          } else {
            // Check for special lines like "Cấp ngày: 11/04/2025 Nơi cấp: CA. Xã Nhà Bè"
            if (line.includes('Cấp ngày') || line.includes('Nơi cấp')) {
              const cccdDateMatch = line.match(/(?:Cấp ngày|ngày cấp)\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})/i);
              const cccdPlaceMatch = line.match(/(?:Nơi cấp|cấp tại)\s*[:\-]?\s*(.+)$/i);
              
              if (cccdDateMatch) currentFreelancer.cccdDate = parseDateString(cccdDateMatch[1].trim());
              if (cccdPlaceMatch) currentFreelancer.cccdPlace = cccdPlaceMatch[1].trim();
            }
          }
        }
      }
      
      if (currentFreelancer && currentFreelancer.fullName) {
        freelancers.push(currentFreelancer);
      }
    }
    
    // Clean and validate parsed freelancers
    return freelancers.map(f => {
      // Force bank name in uppercase
      if (f.bankAccountName) f.bankAccountName = f.bankAccountName.toUpperCase();
      else if (f.fullName) f.bankAccountName = f.fullName.toUpperCase();
      
      // Filter out accents/special chars in bank name if needed (optional)
      
      return {
        fullName: f.fullName || '',
        birthDate: f.birthDate || '',
        address: f.address || '',
        phone: f.phone || '',
        cccd: f.cccd || '',
        cccdDate: f.cccdDate || '',
        cccdPlace: f.cccdPlace || '',
        bankAccountName: f.bankAccountName || '',
        bankAccountNumber: f.bankAccountNumber || '',
        bankName: f.bankName || '',
        nationality: f.nationality || 'Việt Nam',
        email: f.email || '',
        notes: f.notes || ''
      };
    });
    
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw error;
  }
}

/**
 * Attempts to parse date formats like DD/MM/YYYY into YYYY-MM-DD for input fields.
 */
function parseDateString(dateStr) {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const match = clean.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  // Try YYYY-MM-DD
  const matchIso = clean.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (matchIso) {
    const year = matchIso[1];
    const month = matchIso[2].padStart(2, '0');
    const day = matchIso[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}
