import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

function AppContent() {
  const { toast } = useApp();

  return (
    <>
      <AppRoutes />

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
      <AuthProvider>
        <ThemeProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}