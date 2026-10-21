import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function StudentNavbar({ title }) {
  const { theme, setTheme, toggleMobileSidebar } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="icon-btn mobile-menu"
          onClick={toggleMobileSidebar}
          aria-label="Open menu"
        >
          <Menu size={19} />
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
          onClick={() => navigate('/student/notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} />
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
          {(user?.name || 'Student').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
