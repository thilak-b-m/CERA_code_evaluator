import { useState } from 'react';
import { useLocation } from 'wouter';

import {
  ArrowRight,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from 'lucide-react';

import ceraLogo from '../../assets/images/cera-logo.png';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { notify, theme, setTheme } = useApp();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your institutional email.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 1) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const result = await login(
        { email: trimmedEmail, password },
        keepSignedIn
      );
      notify('Signed in to CERA successfully');
      setLocation(result.user.role === 'student' ? '/student/dashboard' : '/dashboard');
    } catch (requestError) {
      setError(requestError.code === 401 ? 'Invalid email or password.' : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    notify('Password reset will be available after backend integration');
  };

  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="brand-mark" aria-label="CERA logo">
            <img
              src={ceraLogo}
              alt="CERA"
              style={{
                width: 52,
                height: 52,
                objectFit: 'contain',
                display: 'block',
                transform: 'scale(1.5)',
              }}
            />
          </div>

          <div>
            <div className="logo-word">CERA</div>
            <div style={{ color: 'var(--text)', fontSize: 9, marginTop: 2 }}>
              Code Execution, Review and Assessment
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
              Learn, execute, excel
            </div>
          </div>
        </div>

        <div className="ring-art">
          <div className="ring-core">
            <img
              src={ceraLogo}
              alt="CERA"
              style={{ width: '75px', height: '75px', objectFit: 'contain' }}
            />
          </div>

          <div style={{ position: 'absolute', top: '18%', right: '11%', color: 'var(--accent)', font: '10px var(--app-font-mono)' }}>
            EXECUTE
          </div>
          <div style={{ position: 'absolute', bottom: '18%', left: '8%', color: '#A5B4FC', font: '10px var(--app-font-mono)' }}>
            ASSESS
          </div>
        </div>

        <div>
          <div className="eyebrow">LEARN · EXECUTE · EXCEL</div>
          <h1
            style={{
              fontSize: 'clamp(32px,4vw,54px)',
              letterSpacing: '-.06em',
              lineHeight: 0.98,
              margin: '12px 0',
              maxWidth: 500,
            }}
          >
            Teaching code,
            <br />
            <span style={{ color: '#A5B4FC' }}>with clarity.</span>
          </h1>

          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            The command center for faculty who want every lab, submission, and learning signal in reach.
          </p>
        </div>
      </div>

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
          data-testid="button-login-theme-toggle"
          style={{ position: 'absolute', top: 24, right: 24 }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: 42 }}>
            <h1 className="page-title" style={{ marginTop: 12 }}>Welcome back.</h1>
            <p className="page-subtitle">Sign in to your CERA workspace.</p>
          </div>

          <div style={{ display: 'grid', gap: 17 }}>
            <label>
              <span className="label">Institutional email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@university.edu"
                autoComplete="email"
                required
                data-testid="input-email"
              />
            </label>

            <label>
              <span className="label">Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  data-testid="input-password"
                  style={{ paddingRight: 42 }}
                />

                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 0,
                    background: 'transparent',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--subtle)',
                  color: 'var(--error)',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--muted)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                />
                Keep me signed in
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#A5B4FC',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              className="btn btn-primary"
              style={{ height: 44, marginTop: 4 }}
              type="submit"
              disabled={loading}
              data-testid="button-sign-in"
            >
              {loading ? 'Signing in...' : 'Sign in to CERA'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', marginTop: 30 }}>
            Need an account?{' '}
            <button type="button" onClick={() => setLocation('/signup')} style={{ border: 0, background: 'transparent', color: '#A5B4FC', cursor: 'pointer', padding: 0 }}>
              Create a student account
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
