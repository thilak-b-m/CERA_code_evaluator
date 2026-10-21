import { Navigate, Route, Routes } from 'react-router-dom';

import Login from '../pages/auth/Login.jsx';
import FacultyLayout from '../layouts/FacultyLayout.jsx';
import FacultyRoutes from './FacultyRoutes.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import StudentRoutes from './StudentRoutes.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signin" element={<Login />} />
      <Route
        path="/student/*"
        element={(
          <ProtectedRoute roles={['student']}>
            <StudentRoutes />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/*"
        element={(
          <ProtectedRoute roles={['faculty']}>
            <FacultyLayout>
              <FacultyRoutes />
            </FacultyLayout>
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
