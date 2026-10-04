import { Route, Switch } from 'wouter';

import Login from '../pages/auth/Login.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import ResetPassword from '../pages/auth/ResetPassword.jsx';
import FacultyLayout from '../layouts/FacultyLayout.jsx';
import FacultyRoutes from './FacultyRoutes.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import StudentRoutes from './StudentRoutes.jsx';

export default function AppRoutes() {
  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>

      <Route path="/signin">
        <Login />
      </Route>

      <Route path="/forgot-password">
        <ForgotPassword />
      </Route>

      <Route path="/reset-password">
        <ResetPassword />
      </Route>

      <Route path="/student/*">
        <ProtectedRoute roles={['student']}>
          <StudentRoutes />
        </ProtectedRoute>
      </Route>

      <Route>
        <ProtectedRoute roles={['faculty']}>
          <FacultyLayout>
            <FacultyRoutes />
          </FacultyLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}
