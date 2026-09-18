import { AppProvider, useApp } from './context/AppContext.jsx';
import FacultyLogin from './pages/faculty/Login.jsx';
import FacultyLayout from './layouts/FacultyLayout.jsx';
import FacultyRoutes from './routes/FacultyRoutes.jsx';
import { Route, Switch } from 'wouter';
import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import StudentRoutes from './student/routes/StudentRoutes.jsx';
import { AuthProvider as StudentAuthProvider } from './student/context/AuthContext.jsx';
import { ThemeProvider as StudentThemeProvider } from './student/context/ThemeContext.jsx';

function StudentExperience() {
  return (
    <StudentAuthProvider>
      <StudentThemeProvider>
        <StudentRoutes />
      </StudentThemeProvider>
    </StudentAuthProvider>
  );
}

function AppContent() {
  const { toast } = useApp();

  return (
    <>
      <Switch>
        <Route path="/login">
          <FacultyLogin />
        </Route>

        <Route path="/student/*">
          <StudentExperience />
        </Route>

        <Route>
          <FacultyLayout>
            <FacultyRoutes />
          </FacultyLayout>
        </Route>
      </Switch>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            data-testid="status-toast"
          >
            <Check
              size={15}
              style={{
                verticalAlign: 'middle',
                marginRight: 7,
                color: 'var(--success)',
              }}
            />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}