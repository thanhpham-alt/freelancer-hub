export default function StatCard({ icon, label, value, variant = 'indigo', onClick }) {
  return (
    <div className={`stat-card stat-card-${variant}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
