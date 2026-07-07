// Calculate total from items array
export function calculateItemsTotal(items) {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);
}

// Calculate tax amount
export function calculateTax(totalAmount, taxRate = 10) {
  return Math.round((Number(totalAmount) || 0) * (Number(taxRate) || 0) / 100);
}

// Calculate net amount (after tax)
export function calculateNetAmount(totalAmount, taxRate = 10) {
  const total = Number(totalAmount) || 0;
  const tax = calculateTax(total, taxRate);
  return total - tax;
}

// Calculate payment amounts from percentages
export function calculatePaymentAmounts(netAmount, paymentTerms) {
  if (!paymentTerms || !Array.isArray(paymentTerms)) return [];
  return paymentTerms.map(term => ({
    ...term,
    amount: Math.round((Number(netAmount) || 0) * (Number(term.percentage) || 0) / 100)
  }));
}

// Check if payment is overdue
export function isPaymentOverdue(dueDate, status) {
  if (status === 'paid') return false;
  if (!dueDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}
