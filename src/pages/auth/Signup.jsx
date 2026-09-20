import { useState } from 'react';
import { useLocation } from 'wouter';

import { ArrowRight, Eye, EyeOff, Moon, Sun } from 'lucide-react';

import ceraLogo from '../../assets/images/cera-logo.png';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Signup() {
  const { notify, theme, setTheme } = useApp();
  const { signup } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      notify('Account created successfully. Please sign in to continue.');
      setLocation('/login');
    } catch (requestError) {
      setError(requestError.code === 'EMAIL_EXISTS' ? 'Email already registered.' : 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <img src={ceraLogo} alt="CERA" style={{ width: 75, height: 75, objectFit: 'contain' }} />
          </div>
          <div style={{ position: 'absolute', top: '18%', right: '11%', color: 'var(--accent)', font: '10px var(--app-font-mono)' }}>
            JOIN
          </div>
          <div style={{ position: 'absolute', bottom: '18%', left: '8%', color: '#A5B4FC', font: '10px var(--app-font-mono)' }}>
            CREATE
          </div>
        </div>

        <div>
          <div className="eyebrow">STUDENT ACCESS</div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,54px)', letterSpacing: '-.06em', lineHeight: 0.98, margin: '12px 0', maxWidth: 500 }}>
            Start your
            <br />
            <span style={{ color: '#A5B4FC' }}>coding journey.</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 420, lineHeight: 1.6 }}>
            Create a student account and begin submitting, evaluating, and improving your code in CERA.
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
          style={{ position: 'absolute', top: 24, right: 24 }}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: 42 }}>
            <div className="eyebrow">CREATE ACCOUNT</div>
            <h1 className="page-title" style={{ marginTop: 12 }}>Create your student profile</h1>
            <p className="page-subtitle">Join CERA and access your coding workspace.</p>
          </div>

          <div style={{ display: 'grid', gap: 17 }}>
            <label>
              <span className="label">Full name</span>
              <input className="input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" autoComplete="name" required />
            </label>

            <label>
              <span className="label">Institutional email</span>
              <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="student@university.edu" autoComplete="email" required />
            </label>

            <label>
              <span className="label">Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label>
              <span className="label">Confirm password</span>
              <input
                className="input"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />
            </label>

            {error && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--subtle)', color: 'var(--error)', fontSize: 11, lineHeight: 1.5 }} role="alert">
                {error}
              </div>
            )}

            <button className="btn btn-primary" style={{ height: 44, marginTop: 4 }} type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', marginTop: 30 }}>
            Already have an account?{' '}
            <button type="button" onClick={() => setLocation('/login')} style={{ border: 0, background: 'transparent', color: '#A5B4FC', cursor: 'pointer', padding: 0 }}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
