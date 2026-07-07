import { NavLink } from 'react-router-dom';
import AppIcon from './AppIcon';

const navItems = [
  { path: '/', icon: 'gauge', label: 'Tổng quan' },
  { path: '/freelancers', icon: 'users', label: 'Freelancers' },
  { path: '/jobs', icon: 'briefcase', label: 'Dự án' },
  { path: '/contracts', icon: 'file', label: 'Hợp đồng' },
  { path: '/acceptance-reports', icon: 'fileCheck', label: 'Nghiệm thu' },
  { path: '/payments', icon: 'dollar', label: 'Thanh toán' },
  { path: '/settings', icon: 'settings', label: 'Cài đặt' },
];

export default function Sidebar({ isOpen, onToggle }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <h2>
          <span className="nav-icon"><AppIcon name="building" size={21} /></span>
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
            <span className="nav-icon"><AppIcon name={item.icon} size={19} /></span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
