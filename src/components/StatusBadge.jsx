const STATUS_MAP = {
  draft: { label: 'Nháp', className: 'status-draft' },
  active: { label: 'Đang hoạt động', className: 'status-active' },
  signed: { label: 'Đã ký', className: 'status-signed' },
  in_progress: { label: 'Đang làm', className: 'status-in_progress' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
  pending: { label: 'Chờ thanh toán', className: 'status-pending' },
  paid: { label: 'Đã thanh toán', className: 'status-paid' },
  overdue: { label: 'Quá hạn', className: 'status-overdue' }
};

export default function StatusBadge({ status }) {
  const resolved = STATUS_MAP[status] || { label: status, className: 'status-draft' };
  return (
    <span className={`status-badge ${resolved.className}`}>
      {resolved.label}
    </span>
  );
}
