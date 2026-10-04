import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const linkStyle = {
  border: 0,
  background: 'transparent',
  color: '#A5B4FC',
  padding: 0,
  cursor: 'pointer',
};

export default function ResetPassword() {
  const { notify, theme, setTheme } = useApp();
  const { resetPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('This reset link is invalid or incomplete. Request a new one.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await resetPassword(token, password);
      setCompleted(true);
    } catch {
      setError('Unable to reset your password. The link may be invalid or expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBrandPanel />
      <div className="auth-form-wrap" style={{ position: 'relative' }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
            notify(`${nextTheme === 'dark' ? 'Dark' : 'Light'} theme enabled`);
          }}
          aria-label="Toggle theme"
          style={{ position: 'absolute', top: 24, right: 24 }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {completed ? (
          <div className="auth-form" role="status">
            <div style={{ marginBottom: 36 }}>
              <div className="eyebrow">PASSWORD UPDATED</div>
              <h1 className="page-title" style={{ marginTop: 12 }}>Password reset</h1>
              <p className="page-subtitle">Your password has been updated. You can now sign in to CERA.</p>
            </div>
            <Button className="w-full" icon={ArrowRight} onClick={() => setLocation('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 36 }}>
              <div className="eyebrow">PASSWORD RESET</div>
              <h1 className="page-title" style={{ marginTop: 12 }}>Reset Password</h1>
              <p className="page-subtitle">Create a new password for your CERA account.</p>
            </div>

            <div style={{ display: 'grid', gap: 17 }}>
              <label>
                <span className="label">New Password</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    data-testid="input-new-password"
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                <span className="label">Confirm Password</span>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError('');
                    }}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                    data-testid="input-confirm-password"
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--subtle)', color: 'var(--error)', fontSize: 11, lineHeight: 1.5 }} role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full h-11 mt-1">
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', marginTop: 30 }}>
              <button type="button" onClick={() => setLocation('/login')} style={linkStyle}>
                Back to Login
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}