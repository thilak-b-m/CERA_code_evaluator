import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { notifications } from '../../data/studentMockData';

export default function StudentNavbar({ title, searchValue, onSearchChange, searchPlaceholder = 'Search...' }) {
  const { toggleMobileSidebar } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="sticky top-0 z-30 bg-cera-bg/80 backdrop-blur-md border-b border-cera-border">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden text-cera-muted hover:text-cera-text transition-colors p-1.5 rounded-lg hover:bg-cera-elevated"
          >
            <Menu size={22} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-cera-text">{title || `${greeting}, ${user?.name?.split(' ')[0] || 'Student'}`}</h2>
            <p className="text-xs text-cera-muted hidden sm:block">{today}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onSearchChange && (
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cera-muted pointer-events-none" />
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="input-base pl-10 w-56"
              />
            </div>
          )}
          <button
            onClick={() => navigate('/student/notifications')}
            className="relative text-cera-muted hover:text-cera-text transition-colors p-2 rounded-lg hover:bg-cera-elevated"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-cera-error rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/student/profile')}
            className="w-9 h-9 rounded-full bg-cera-secondary flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-cera-secondary/40 transition-all"
          >
            {user?.name?.charAt(0) || 'A'}
          </button>
        </div>
      </div>
    </header>
  );
}
