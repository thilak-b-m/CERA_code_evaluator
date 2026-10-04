import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Moon, Sun } from 'lucide-react';
import AuthBrandPanel from '../../components/auth/AuthBrandPanel.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const linkStyle = {
  border: 0,
  background: 'transparent',
  color: '#A5B4FC',
  padding: 0,
  cursor: 'pointer',
};

export default function ForgotPassword() {
  const { notify, theme, setTheme } = useApp();
  const { forgotPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await forgotPassword(normalizedEmail);
      setSubmitted(true);
    } catch {
      setError('Unable to send reset instructions right now. Please try again.');
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

        {submitted ? (
          <div className="auth-form" role="status">
            <div style={{ marginBottom: 36 }}>
              <div className="eyebrow">PASSWORD RESET</div>
              <h1 className="page-title" style={{ marginTop: 12 }}>Check your email</h1>
              <p className="page-subtitle">
                If an account exists with this email address, we&apos;ve sent instructions to reset your password.
              </p>
            </div>
            <Button className="w-full" icon={ArrowRight} onClick={() => setLocation('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 36 }}>
              <div className="eyebrow">PASSWORD RESET</div>
              <h1 className="page-title" style={{ marginTop: 12 }}>Forgot Password?</h1>
              <p className="page-subtitle">
                Enter your registered college email address and we&apos;ll send you a password reset link.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 17 }}>
              <label>
                <span className="label">Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  data-testid="input-reset-email"
                />
              </label>

              {error && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--subtle)', color: 'var(--error)', fontSize: 11, lineHeight: 1.5 }} role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full h-11 mt-1">
                {loading ? 'Sending...' : 'Send Reset Link'}
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