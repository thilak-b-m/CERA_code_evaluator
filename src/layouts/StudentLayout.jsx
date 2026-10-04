import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StudentSidebar from '../components/student/StudentSidebar';
import StudentNavbar from '../components/student/StudentNavbar';

const pageTitles = {
  '/student/dashboard': 'Dashboard',
  '/student/assignments': 'Assignments',
  '/student/submissions': 'Submissions',
  '/student/results': 'Results',
  '/student/leaderboard': 'Leaderboard',
  '/student/notifications': 'Notifications',
  '/student/profile': 'Profile',
};

export default function StudentLayout() {
  const location = useLocation();

  const currentPath = '/' + location.pathname.split('/').slice(0, 3).join('/');
  const title = pageTitles[currentPath] || pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="app-shell">
      <StudentSidebar />
      <main className="main-content">
        <StudentNavbar title={title} />
        <div className="content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
