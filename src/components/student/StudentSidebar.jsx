import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronDown,
  FileCode2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PanelLeftClose,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import ceraLogo from '../../assets/images/cera-logo.png';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navSections = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', '/student/dashboard', LayoutDashboard],
      ['Assignments', '/student/assignments', ListChecks],
      ['Submissions', '/student/submissions', FileCode2],
      ['Results', '/student/results', BarChart3],
    ],
  },
  {
    label: 'Learn',
    items: [
      ['Leaderboard', '/student/leaderboard', Trophy],
      ['Profile', '/student/profile', User],
    ],
  },
];

export default function StudentSidebar() {
  const { mobileSidebarOpen, closeMobileSidebar } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const nameParts = (user?.name || 'Student').trim().split(/\s+/);
  const initials = nameParts.map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
      <div className="flex items-center gap-[11px] px-5 pt-[22px] pb-[18px]">
        <div className="brand-mark" aria-label="CERA logo">
          <img
            src={ceraLogo}
            alt="CERA"
            className="block h-[52px] w-[52px] object-contain"
            style={{ transform: 'scale(1.5)' }}
          />
        </div>
        <div className="min-w-0">
          <div className="logo-word">CERA</div>
          <div className="mt-0.5 text-[9px] text-cera-text">Code Execution, Review and Assessment</div>
          <div className="mt-0.5 text-[11px] text-cera-muted">Learn, execute, excel</div>
        </div>
        <button
          type="button"
          className="icon-btn ml-auto shrink-0"
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        >
          <PanelLeftClose size={17} />
        </button>
      </div>

      <div className="px-[10px] pb-[14px]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex w-full items-center gap-[9px] rounded-[9px] border border-cera-border bg-cera-elevated p-[10px] text-left text-cera-text"
            aria-expanded={profileMenuOpen}
            aria-label="Open student profile menu"
          >
            <span className="avatar" style={{ background: 'linear-gradient(135deg,#22D3EE,#6366F1)' }}>{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{user?.name || 'Student'}</span>
              <span className="block truncate text-[10px] text-cera-muted">Student Portal</span>
            </span>
            <ChevronDown
              size={14}
              className={`ml-auto shrink-0 text-cera-muted transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {profileMenuOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[9px] border border-cera-border bg-cera-elevated p-1.5 shadow-xl">
              <Link
                to="/student/profile"
                className="sidebar-link"
                onClick={() => {
                  setProfileMenuOpen(false);
                  closeMobileSidebar();
                }}
              >
                <Users size={16} />
                <span>View profile</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-nav flex-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section">{section.label}</div>
            {section.items.map(([label, path, Icon]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeMobileSidebar}
                data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-cera-border px-[10px] py-3">
        <NavLink
          to="/student/notifications"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobileSidebar}
        >
          <Bell size={16} />
          <span>Notifications</span>
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cera-highlight" />
        </NavLink>
        <button
          type="button"
          className="sidebar-link w-[calc(100%-20px)] cursor-pointer border-0 bg-transparent"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
