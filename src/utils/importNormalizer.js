const VALID_ROLES = new Set(['coder', 'voice_off', 'camop', 'other']);

export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeDate(value) {
  const clean = normalizeText(value);
  if (!clean) return '';

  const iso = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const viDate = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (viDate) {
    const [, day, month, year] = viDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return '';
}

export function normalizeNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const clean = normalizeText(value).replace(/[^\d,.-]/g, '');
  if (!clean) return fallback;

  const compact = clean.replace(/\s+/g, '');
  const normalized = /^-?\d{1,3}([.,]\d{3})+$/.test(compact)
    ? compact.replace(/[.,]/g, '')
    : compact.replace(/,/g, '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeFreelancerImport(freelancer = {}) {
  const fullName = normalizeText(freelancer.fullName);
  const bankAccountName = normalizeText(freelancer.bankAccountName || fullName).toUpperCase();
  const role = normalizeText(freelancer.role).toLowerCase();

  return {
    ...freelancer,
    fullName,
    birthDate: normalizeDate(freelancer.birthDate),
    address: normalizeText(freelancer.address),
    phone: normalizeText(freelancer.phone).replace(/\s+/g, ''),
    cccd: normalizeText(freelancer.cccd),
    cccdDate: normalizeDate(freelancer.cccdDate),
    cccdPlace: normalizeText(freelancer.cccdPlace),
    bankAccountName,
    bankAccountNumber: normalizeText(freelancer.bankAccountNumber),
    bankName: normalizeText(freelancer.bankName),
    nationality: normalizeText(freelancer.nationality) || 'Việt Nam',
    email: normalizeText(freelancer.email),
    role: VALID_ROLES.has(role) ? role : 'other',
    notes: normalizeText(freelancer.notes),
    cccdFront: freelancer.cccdFront || '',
    cccdBack: freelancer.cccdBack || ''
  };
}

export function normalizeContractImport(contract = {}, today = new Date().toISOString().split('T')[0]) {
  return {
    ...contract,
    contractNumber: normalizeText(contract.contractNumber),
    jobTitle: normalizeText(contract.jobTitle),
    contractType: normalizeText(contract.contractType) || 'Hợp đồng Cộng tác viên (không độc quyền)',
    startDate: normalizeDate(contract.startDate),
    endDate: normalizeDate(contract.endDate),
    signDate: normalizeDate(contract.signDate) || today,
    workLocation: normalizeText(contract.workLocation) || 'tự do',
    paymentMethod: normalizeText(contract.paymentMethod) || 'Chuyển khoản',
    taxRate: normalizeNumber(contract.taxRate, 10),
    freelancerId: normalizeText(contract.freelancerId),
    items: Array.isArray(contract.items)
      ? contract.items.map((item, index) => ({
          key: item.key || `${Date.now()}-${index}`,
          name: normalizeText(item.name),
          unit: normalizeText(item.unit) || 'Gói',
          quantity: normalizeNumber(item.quantity, 1) || 1,
          unitPrice: normalizeNumber(item.unitPrice, 0)
        })).filter(item => item.name || item.unitPrice > 0)
      : [],
    paymentPhases: Array.isArray(contract.paymentPhases)
      ? contract.paymentPhases.map((phase, index) => ({
          key: phase.key || `ai-phase-${Date.now()}-${index}`,
          phase: normalizeNumber(phase.phase, index + 1),
          percentage: normalizeNumber(phase.percentage, 0),
          amount: normalizeNumber(phase.amount, 0),
          description: normalizeText(phase.description),
          dueDate: normalizeDate(phase.dueDate)
        }))
      : []
  };
}
