const DEFAULT_COMPANY = {
  name: 'CÔNG TY TNHH MAC MEDIA',
  representative: 'Bà NGUYỄN THỊ THU THẢO',
  position: 'Giám Đốc',
  address: '80 Đinh Bộ Lĩnh, Phường Bình Thạnh, TP. HCM',
  taxCode: '0312420666',
  shortName: 'MAC'
};

const STORAGE_KEY = 'fh_company_info';

export function getCompanyInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COMPANY, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error loading company info:', e);
  }
  return { ...DEFAULT_COMPANY };
}

export function saveCompanyInfo(info) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function resetCompanyInfo() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_COMPANY };
}

export { DEFAULT_COMPANY };
