import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { ToastProvider } from './Toast';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <ToastProvider>
      <div className={`app-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <button 
          className="sidebar-toggle" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle Navigation"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
