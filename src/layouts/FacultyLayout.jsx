import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  FileCode2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sun,
  TestTube2,
  Users,
} from 'lucide-react';

import ceraLogo from '../assets/images/cera-logo.png';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { submissionService } from '../services/submissionService.js';

const navSections = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', '/dashboard', LayoutDashboard],
      ['Live lab', '/live-lab', Activity],
      ['Assignments', '/assignments', BookOpen],
      ['Test cases', '/test-cases', TestTube2],
    ],
  },
  {
    label: 'Review',
    items: [
      ['Submissions', '/submissions', FileCode2],
      ['Evaluation queue', '/evaluation-queue', ClipboardCheck],
      ['Students', '/students', Users],
      ['Academic Year Management', '/students/academic-years', Users],
    ],
  },
  {
    label: 'Insights',
    items: [
      ['Analytics', '/analytics', BarChart3],
      ['Reports', '/reports', FileText],
    ],
  },
];

export default function FacultyLayout({ children }) {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar, closeMobileSidebar } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const { notify } = useApp();
  const { theme, setTheme } = useTheme();
  const { logout, user, token } = useAuth();
  const facultyName = user?.name || 'Faculty member';
  const nameParts = facultyName.trim().split(/\s+/);
  const facultyInitials = nameParts.map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const { pathname: location } = useLocation();
  const navigate = useNavigate();
  const [facultySubmissions, setFacultySubmissions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    submissionService.listForFaculty(token)
      .then((submissions) => {
        if (!cancelled) setFacultySubmissions(submissions);
      })
      .catch((error) => {
        console.error('Unable to load the faculty review count:', error);
      });
    return () => { cancelled = true; };
  }, [location, token]);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageName = location.split('/')[1]?.replaceAll('-', ' ') || 'dashboard';
  const evaluationQueueCount = facultySubmissions.filter((submission) => (
    submission.hasSubmittedCode && submission.evaluation?.status !== 'published'
  )).length;

  const handleSignOut = async () => {
    await logout();
    notify('Signed out of CERA');
    navigate('/login');
  };

  const isActive = (href) => {
    if (href === '/students') {
      return location === '/students' || (location.startsWith('/students/') && location !== '/students/academic-years');
    }
    if (href === '/dashboard') return location === '/dashboard';
    return location === href || location.startsWith(href + '/');
  };

  return (
    <div className="app-shell">
      {/* Overlay for mobile */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Header */}
        <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="brand-mark" aria-label="CERA logo">
            <img
              src={ceraLogo}
              alt="CERA"
              style={{ width: 52, height: 52, objectFit: 'contain', display: 'block', transform: 'scale(1.5)' }}
            />
          </div>

          {!sidebarCollapsed && (
            <div className="brand-text min-w-0">
              <div className="logo-word">CERA</div>
              <div style={{ color: 'var(--text)', fontSize: 9, marginTop: 2 }}>
                Code Execution, Review and Assessment
              </div>
              <div className="logo-sub" style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                Learn, execute, excel
              </div>
            </div>
          )}

          <button
            type="button"
            className="icon-btn"
            style={{ marginLeft: 'auto', flexShrink: 0 }}
            onClick={sidebarCollapsed ? toggleSidebar : closeMobileSidebar}
            aria-label="Close menu"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>

        {/* Profile card */}
        {!sidebarCollapsed && (
          <div style={{ padding: '0 10px 14px' }}>
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="profile-card"
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: 10,
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                aria-expanded={profileMenuOpen}
                aria-label="Open faculty profile menu"
              >
                <div className="avatar" style={{ background: 'linear-gradient(135deg,#22D3EE,#6366F1)' }}>
                  {facultyInitials}
                </div>
                <div className="profile-card-text" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{facultyName}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{user?.department || 'Faculty'}</div>
                </div>
                <ChevronDown
                  size={14}
                  color="var(--muted)"
                  className="profile-card-chevron"
                  style={{
                    marginLeft: 'auto',
                    transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s ease',
                  }}
                />
              </button>

              {profileMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 'calc(100% + 6px)',
                    zIndex: 50,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 9,
                    padding: 6,
                    boxShadow: '0 12px 30px rgba(0,0,0,.25)',
                  }}
                >
                  <Link
                    to="/profile"
                    className="sidebar-link"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Users size={16} />
                    <span>View profile</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed avatar */}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 14px' }}>
            <Link to="/profile" className="avatar" style={{ background: 'linear-gradient(135deg,#22D3EE,#6366F1)' }} aria-label="View profile">
              {facultyInitials}
            </Link>
          </div>
        )}

        {/* Nav */}
        <div className="sidebar-nav" style={{ overflowY: 'auto', flex: 1 }}>
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section">{section.label}</div>
              {section.items.map(([label, href, Icon]) => (
                <Link
                  key={href}
                  to={href}
                  className={`sidebar-link ${isActive(href) ? 'active' : ''} ${href === '/students/academic-years' && !sidebarCollapsed ? 'ml-3 text-xs' : ''}`}
                  onClick={closeMobileSidebar}
                  title={sidebarCollapsed ? label : undefined}
                  data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{label}</span>
                  {label === 'Evaluation queue' && (
                    <span
                      className="sidebar-link-badge"
                      style={{ marginLeft: 'auto', font: '10px var(--app-font-mono)', color: 'var(--accent)' }}
                    >
                      {evaluationQueueCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <Link
            to="/notifications"
            className="sidebar-link"
            title={sidebarCollapsed ? 'Notifications' : undefined}
          >
            <Bell size={16} />
            <span>Notifications</span>
            <span
              className="sidebar-link-badge"
              style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 9, background: 'var(--accent)' }}
            />
          </Link>

          <Link
            to="/settings"
            className={`sidebar-link ${location === '/settings' ? 'active' : ''}`}
            title={sidebarCollapsed ? 'Settings' : undefined}
          >
            <Settings2 size={16} />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            className="sidebar-link"
            style={{ border: 0, background: 'transparent', width: 'calc(100% - 20px)', cursor: 'pointer' }}
            onClick={handleSignOut}
            title={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

            <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'capitalize' }}>
              Workspace
              <span style={{ margin: '0 7px', opacity: 0.5 }}>/</span>
              <span style={{ color: 'var(--text)' }}>{pageName}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              to="/notifications"
              className="icon-btn"
              aria-label="Notifications"
              data-testid="link-notifications"
              style={{ position: 'relative' }}
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
            </Link>

            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <Link
              to="/profile"
              className="avatar"
              style={{ width: 33, height: 33 }}
              aria-label="Open profile"
            >
              {facultyInitials}
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
