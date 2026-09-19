import { Redirect } from 'wouter';
export default function ProtectedRoute({ authenticated = true, children }) { return authenticated ? children : <Redirect to="/dashboard" />; }