import { Route, Switch } from 'wouter';

import Login from '../pages/auth/Login.jsx';
import Signup from '../pages/auth/Signup.jsx';
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

      <Route path="/signup">
        <Signup />
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
