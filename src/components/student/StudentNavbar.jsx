import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '../../data/studentMockData';

const searchablePages = [
  { label: 'Dashboard', path: '/student/dashboard' },
  { label: 'Assignments', path: '/student/assignments' },
  { label: 'Submissions', path: '/student/submissions' },
  { label: 'Results', path: '/student/results' },
  { label: 'Leaderboard', path: '/student/leaderboard' },
  { label: 'Notifications', path: '/student/notifications' },
  { label: 'Profile', path: '/student/profile' },
];

export default function StudentNavbar({ title }) {
  const { theme, setTheme, toggleMobileSidebar } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleGlobalSearch = (event) => {
    if (event.key !== 'Enter') return;

    const query = event.target.value.trim().toLowerCase();
    if (!query) return;

    const match = searchablePages.find(({ label }) => label.toLowerCase().startsWith(query))
      || searchablePages.find(({ label }) => label.toLowerCase().includes(query));

    if (match) {
      navigate(match.path);
      event.target.value = '';
    }
  };

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
        <div className="text-xs text-cera-muted capitalize">
          Workspace
          <span className="mx-2 opacity-50">/</span>
          <span className="text-cera-text">{title.toLowerCase()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="search-box hide-mobile">
          <Search size={15} />
          <input
            className="input"
            placeholder="Search CERA..."
            aria-label="Search CERA"
            onKeyDown={handleGlobalSearch}
          />
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={() => navigate('/student/notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                margin: '-18px 0 0 16px',
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--accent)',
              }}
            />
          )}
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
