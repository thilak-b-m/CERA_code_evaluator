import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Moon, Sun, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function StudentNavbar({ title }) {
  const { theme, setTheme, toggleMobileSidebar, mobileSidebarOpen, sidebarCollapsed, toggleSidebar } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || 'Student').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        {/* Desktop sidebar toggle */}
        <button
          type="button"
          className="icon-btn sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="icon-btn mobile-menu"
          onClick={toggleMobileSidebar}
          aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileSidebarOpen}
        >
          {mobileSidebarOpen ? <PanelLeftClose size={19} /> : <Menu size={19} />}
        </button>

        <nav className="text-xs text-cera-muted" aria-label="Breadcrumb">
          Workspace
          <span className="mx-2 opacity-50">/</span>
          <span className="text-cera-text font-medium">{title}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="icon-btn"
          style={{ position: 'relative' }}
          onClick={() => navigate('/student/notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 6,
              height: 6,
              borderRadius: 6,
              background: 'var(--accent)',
            }}
          />
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          data-testid="button-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="avatar"
          style={{ width: 33, height: 33, border: 0, cursor: 'pointer' }}
          onClick={() => navigate('/student/profile')}
          aria-label="Open profile"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
