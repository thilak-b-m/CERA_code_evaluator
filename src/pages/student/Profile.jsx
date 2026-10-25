import { useEffect, useState } from 'react';
import {
  Building2,
  Edit3,
  ExternalLink,
  GraduationCap,
  IdCard,
  Key,
  Link as LinkIcon,
  Lock,
  Mail,
  Save,
  X,
} from 'lucide-react';
import Loading from '../../components/common/Loading.jsx';
import Modal from '../../components/common/Modal.jsx';
import { studentService } from '../../services/studentService.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Page from '../../components/common/Page.jsx';

const emptyForm = {
  name: '',
  email: '',
  bio: '',
  skills: '',
  github: '',
  linkedin: '',
};

export default function Profile() {
  const { notify } = useApp();
  const { token, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    let cancelled = false;
    studentService.getProfile(token)
      .then((student) => {
        if (!cancelled) setProfile(student);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const openEditor = () => {
    setForm({
      name: profile.name || '',
      email: profile.email || '',
      bio: profile.bio || '',
      skills: (profile.skills || []).join(', '),
      github: profile.github || '',
      linkedin: profile.linkedin || '',
    });
    setSaveError('');
    setSaved(false);
    setEditModal(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaved(false);

    try {
      const updated = await studentService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        bio: form.bio.trim(),
        skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        github: form.github.trim(),
        linkedin: form.linkedin.trim(),
      }, token);
      setProfile(updated);
      updateUser({
        name: updated.name,
        firstName: updated.name.split(/\s+/)[0],
        lastName: updated.name.split(/\s+/).slice(1).join(' '),
        email: updated.email,
      });
      setSaved(true);
      setEditModal(false);
    } catch (saveFailure) {
      setSaveError(saveFailure.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await studentService.changePassword(
        pwForm.currentPassword,
        pwForm.newPassword,
        token,
      );
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangePasswordOpen(false);
      notify('Password changed successfully');
    } catch (changeError) {
      setPasswordError(changeError.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <Page eyebrow="STUDENT / ACCOUNT" title="Profile" subtitle="Loading your student profile…"><Loading type="cards" count={2} /></Page>;

  if (error) {
    return (
      <Page eyebrow="STUDENT / ACCOUNT" title="Profile" subtitle="Manage your student details and public profile">
        <div className="panel p-6 text-sm" style={{ color: 'var(--error)' }} role="alert">Unable to load your student profile: {error}</div>
      </Page>
    );
  }

  if (!profile) {
    return (
      <Page eyebrow="STUDENT / ACCOUNT" title="Profile" subtitle="Manage your student details and public profile">
        <div className="panel p-6 text-sm text-cera-muted">No student enrollment profile is available for this account.</div>
      </Page>
    );
  }

  const name = profile.name || 'Student';
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const details = [
    { label: 'USN', value: profile.usn, icon: IdCard },
    { label: 'Email', value: profile.email, icon: Mail },
    { label: 'Department', value: profile.department, icon: Building2 },
    { label: 'Year', value: profile.year ? `Year ${profile.year}` : null, icon: GraduationCap },
  ].filter((item) => item.value);

  return (
    <Page eyebrow="STUDENT / ACCOUNT" title="Profile" subtitle="Manage your student details and public profile">
    <div className="space-y-5">
      <section className="rounded-xl border border-cera-border bg-cera-card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cera-primary to-cera-secondary text-xl font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-cera-text">{name}</h1>
              <p className="mt-1 text-sm text-cera-muted">{profile.department || 'Student account'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={openEditor}>
              <Edit3 size={15} />
              Edit profile
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setChangePasswordOpen(true)}>
              <Lock size={15} />
              Change password
            </button>
          </div>
        </div>
      </section>

      {saved && <p className="text-sm text-cera-success" role="status">Profile changes saved.</p>}

      <section className="rounded-xl border border-cera-border bg-cera-card p-5">
        <h2 className="mb-4 font-semibold text-cera-text">Enrollment details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-3 rounded-lg bg-cera-elevated p-4">
              <Icon size={18} className="shrink-0 text-cera-muted" />
              <div className="min-w-0">
                <dt className="text-xs text-cera-muted">{label}</dt>
                <dd className="truncate text-sm font-medium text-cera-text">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-cera-border bg-cera-card p-5">
        <h2 className="mb-3 font-semibold text-cera-text">About me</h2>
        <p className="text-sm leading-relaxed text-cera-muted">
          {profile.bio || 'Add a short introduction about yourself.'}
        </p>
      </section>

      <section className="rounded-xl border border-cera-border bg-cera-card p-5">
        <h2 className="mb-3 font-semibold text-cera-text">Skills</h2>
        {profile.skills?.length ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded-lg border border-cera-border bg-cera-elevated px-3 py-1.5 text-sm text-cera-text">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-cera-muted">Add your programming languages and skills to your profile.</p>
        )}
      </section>

      {(profile.github || profile.linkedin) && (
        <section className="rounded-xl border border-cera-border bg-cera-card p-5">
          <h2 className="mb-3 font-semibold text-cera-text">Links</h2>
          <div className="flex flex-wrap gap-4">
            {profile.github && (
              <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text">
                <ExternalLink size={16} /> {profile.github}
              </a>
            )}
            {profile.linkedin && (
              <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text">
                <LinkIcon size={16} /> {profile.linkedin}
              </a>
            )}
          </div>
        </section>
      )}

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit student profile" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="label">Name</span>
            <input className="input" value={form.name} maxLength={120} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input" type="email" value={form.email} maxLength={254} required onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">About me</span>
            <textarea className="textarea" value={form.bio} maxLength={1000} rows={4} placeholder="Write a short introduction" onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Skills (comma-separated)</span>
            <input className="input" value={form.skills} maxLength={1800} placeholder="JavaScript, Python, C++" onChange={(event) => setForm({ ...form, skills: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">GitHub profile</span>
            <input className="input" value={form.github} maxLength={200} placeholder="github.com/username" onChange={(event) => setForm({ ...form, github: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">LinkedIn profile</span>
            <input className="input" value={form.linkedin} maxLength={200} placeholder="linkedin.com/in/username" onChange={(event) => setForm({ ...form, linkedin: event.target.value })} />
          </label>
          {saveError && <p className="text-sm" style={{ color: 'var(--error)' }} role="alert">{saveError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditModal(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setPasswordError('');
          setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Change password"
        size="md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <label className="block">
            <span className="label">Current password</span>
            <input
              className="input"
              type="password"
              value={pwForm.currentPassword}
              required
              onChange={(event) => setPwForm({ ...pwForm, currentPassword: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">New password</span>
            <input
              className="input"
              type="password"
              value={pwForm.newPassword}
              minLength={8}
              required
              onChange={(event) => setPwForm({ ...pwForm, newPassword: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="label">Confirm new password</span>
            <input
              className="input"
              type="password"
              value={pwForm.confirmPassword}
              minLength={8}
              required
              onChange={(event) => setPwForm({ ...pwForm, confirmPassword: event.target.value })}
            />
          </label>
          {passwordError && (
            <p className="text-sm" style={{ color: 'var(--error)' }} role="alert">
              {passwordError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setChangePasswordOpen(false);
                setPasswordError('');
                setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={changingPassword}
            >
              <Key size={14} />
              {changingPassword ? 'Changing...' : 'Change password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
    </Page>
  );
}
