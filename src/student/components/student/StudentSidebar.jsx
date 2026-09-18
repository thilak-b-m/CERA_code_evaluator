import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ListChecks,
  FileCode2,
  BarChart3,
  Trophy,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  X,
} from 'lucide-react';
import ceraLogo from '../../../assets/images/cera-logo.png';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/assignments', label: 'Assignments', icon: ListChecks },
  { to: '/student/submissions', label: 'Submissions', icon: FileCode2 },
  { to: '/student/results', label: 'Results', icon: BarChart3 },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/student/notifications', label: 'Notifications', icon: Bell },
  { to: '/student/profile', label: 'Profile', icon: User },
];

export default function StudentSidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-cera-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img src={ceraLogo} alt="CERA" className="w-9 h-9 object-contain" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-cera-text leading-none">CERA</h1>
              <p className="text-[10px] text-cera-muted mt-0.5">Student Portal</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex text-cera-muted hover:text-cera-text transition-colors p-1 rounded-lg hover:bg-cera-elevated"
        >
          <ChevronLeft
            size={18}
            className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          onClick={closeMobileSidebar}
          className="lg:hidden text-cera-muted hover:text-cera-text transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileSidebar}
              className={({ isActive }) =>
                isActive
                  ? `nav-item-active ${sidebarCollapsed ? 'lg:justify-center' : ''}`
                  : `nav-item ${sidebarCollapsed ? 'lg:justify-center' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-cera-border">
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-cera-secondary flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cera-text truncate">{user?.name}</p>
              <p className="text-xs text-cera-muted truncate">{user?.id}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="text-cera-muted hover:text-cera-error transition-colors p-1.5 rounded-lg hover:bg-cera-elevated"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex fixed left-0 top-0 h-screen flex-col bg-cera-card border-r border-cera-border z-40"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileSidebar}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden fixed left-0 top-0 h-screen w-64 flex flex-col bg-cera-card border-r border-cera-border z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
