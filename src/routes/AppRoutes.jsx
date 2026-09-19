import { Route, Switch } from 'wouter';

import FacultyLayout from '../layouts/FacultyLayout.jsx';
import FacultyRoutes from './FacultyRoutes.jsx';
import StudentRoutes from './StudentRoutes.jsx';

export default function AppRoutes() {
  return (
    <Switch>
      <Route path="/student/*">
        <StudentRoutes />
      </Route>

      <Route>
        <FacultyLayout>
          <FacultyRoutes />
        </FacultyLayout>
      </Route>
    </Switch>
  );
}
