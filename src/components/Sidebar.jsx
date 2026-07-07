import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '📊', label: 'Tổng quan' },
  { path: '/freelancers', icon: '👤', label: 'Freelancers' },
  { path: '/jobs', icon: '💼', label: 'Dự án' },
  { path: '/contracts', icon: '📄', label: 'Hợp đồng' },
  { path: '/acceptance-reports', icon: '📋', label: 'Nghiệm thu' },
  { path: '/payments', icon: '💰', label: 'Thanh toán' },
  { path: '/settings', icon: '⚙️', label: 'Cài đặt' },
];

export default function Sidebar({ isOpen, onToggle }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <h2>
          <span className="nav-icon">🏢</span>
          <span>Freelancer Hub</span>
        </h2>
        <p>Quản lý CTV & Thanh toán</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => {
              // On mobile, close sidebar when link is clicked
              if (window.innerWidth <= 768) {
                onToggle();
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
