import { Redirect } from 'wouter';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
	const { isAuthenticated, user } = useAuth();

	if (!isAuthenticated) {
		return <Redirect to="/login" />;
	}

	if (roles && !roles.includes(user?.role)) {
		return <Redirect to={user?.role === 'student' ? '/student/dashboard' : '/dashboard'} />;
	}

	return children;
}