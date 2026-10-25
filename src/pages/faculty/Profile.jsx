import { useState } from 'react';
import {
  Building2,
  Edit3,
  ExternalLink,
  Key,
  Link as LinkIcon,
  Lock,
  Mail,
  Save,
  UserRound,
  X,
} from 'lucide-react';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Modal from '../../components/common/Modal.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';

export default function Profile() {
  const { notify } = useApp();
  const { user, token, updateUser } = useAuth();
  const name = user?.name || 'Faculty member';
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [form, setForm] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    skills: (user?.skills || []).join(', '),
    github: user?.github || '',
    linkedin: user?.linkedin || '',
  }));

  const openEditor = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      skills: (user?.skills || []).join(', '),
      github: user?.github || '',
      linkedin: user?.linkedin || '',
    });
    setError('');
    setIsEditing(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const result = await authService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        bio: form.bio.trim(),
        skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        github: form.github.trim(),
        linkedin: form.linkedin.trim(),
      }, token);
      updateUser(result.user);
      setIsEditing(false);
      notify('Profile changes saved');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
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
      await authService.changePassword(
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

  const details = [
    { label: 'Name', value: name, icon: UserRound },
    { label: 'Work email', value: user?.email, icon: Mail },
    { label: 'Department', value: user?.department, icon: Building2 },
  ].filter((item) => item.value);

  return (
    <Page
      title="Faculty profile"
      subtitle="Manage your account details and professional information."
      actions={(
        <>
          <button type="button" className="btn btn-primary" onClick={openEditor}>
            <Edit3 size={14} />
            Edit profile
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setChangePasswordOpen(true)}>
            <Lock size={14} />
            Change password
          </button>
        </>
      )}
    >
      <div className="grid max-w-4xl gap-5">
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">Faculty account</div>
              <div className="panel-kicker">Your institution account and public profile details</div>
            </div>
          </div>

          <div className="grid gap-5 p-5">
            <div className="flex items-center gap-4 border-b border-cera-border pb-5">
              <Avatar color="#22D3EE">{initials}</Avatar>
              <div>
                <h2 className="font-semibold text-cera-text">{name}</h2>
                <p className="mt-1 text-xs text-cera-muted">Faculty account</p>
              </div>
            </div>

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
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-cera-text">Teaching bio</h2>
          <p className="text-sm leading-relaxed text-cera-muted">
            {user?.bio || 'Add a short introduction about your teaching and areas of expertise.'}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-cera-text">Skills and areas of expertise</h2>
          {user?.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <span key={skill} className="rounded-lg border border-cera-border bg-cera-elevated px-3 py-1.5 text-sm text-cera-text">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cera-muted">Add skills and areas of expertise to your profile.</p>
          )}
        </Card>

        {(user?.github || user?.linkedin) && (
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-cera-text">Professional links</h2>
            <div className="flex flex-wrap gap-4">
              {user.github && (
                <a href={`https://${user.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text">
                  <ExternalLink size={16} /> {user.github}
                </a>
              )}
              {user.linkedin && (
                <a href={`https://${user.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text">
                  <LinkIcon size={16} /> {user.linkedin}
                </a>
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit faculty profile" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="label">Name</span>
            <input className="input" value={form.name} maxLength={120} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Work email</span>
            <input className="input" type="email" value={form.email} maxLength={254} required onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Teaching bio</span>
            <textarea className="textarea" value={form.bio} maxLength={1000} rows={4} placeholder="Describe your teaching and areas of expertise" onChange={(event) => setForm({ ...form, bio: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Skills and expertise (comma-separated)</span>
            <input className="input" value={form.skills} maxLength={1800} placeholder="Algorithms, Python, Software engineering" onChange={(event) => setForm({ ...form, skills: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">GitHub profile</span>
            <input className="input" value={form.github} maxLength={200} placeholder="github.com/username" onChange={(event) => setForm({ ...form, github: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">LinkedIn profile</span>
            <input className="input" value={form.linkedin} maxLength={200} placeholder="linkedin.com/in/username" onChange={(event) => setForm({ ...form, linkedin: event.target.value })} />
          </label>
          {error && <p className="text-sm" style={{ color: 'var(--error)' }} role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save changes'}
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
    </Page>
  );
}
