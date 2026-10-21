import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
	const { isAuthenticated, user } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (roles && !roles.includes(user?.role)) {
		return <Navigate to={user?.role === 'student' ? '/student/dashboard' : '/dashboard'} replace />;
	}

	return children;
}