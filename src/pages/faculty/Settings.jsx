import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Moon, Palette, Shield, SlidersHorizontal, UserRound, GraduationCap } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../services/api.js';
import { authService } from '../../services/authService.js';
import { studentService } from '../../services/studentService.js';

const DEFAULT_SETTINGS = {
  newSubmissions: true,
  assessmentDefaults: {
    points: 100,
    passingPercentage: 40,
    timeLimit: 0,
    languages: ['python', 'java', 'cpp', 'javascript'],
    secureLabEnabled: false,
    targetYears: [1, 2, 3, 4],
  },
};

const LANGUAGES = [
  ['python', 'Python'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['javascript', 'JavaScript'],
];

const SECTIONS = [
  { id: 'profile', label: 'Profile & Account', icon: UserRound },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'assessment', label: 'Assessment Defaults', icon: SlidersHorizontal },
  { id: 'academic', label: 'Academic Configuration', icon: GraduationCap },
  { id: 'appearance', label: 'Appearance & Preferences', icon: Palette },
];

function toProfileForm(user = {}) {
  return {
    name: user.name || '',
    email: user.email || '',
    bio: user.bio || '',
    skills: (user.skills || []).join(', '),
    github: user.github || '',
    linkedin: user.linkedin || '',
  };
}

function normalizeSettings(value = {}) {
  const defaults = value.assessmentDefaults || {};
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    assessmentDefaults: {
      ...DEFAULT_SETTINGS.assessmentDefaults,
      ...defaults,
      languages: Array.isArray(defaults.languages) ? defaults.languages : DEFAULT_SETTINGS.assessmentDefaults.languages,
      targetYears: Array.isArray(defaults.targetYears) ? defaults.targetYears : DEFAULT_SETTINGS.assessmentDefaults.targetYears,
    },
  };
}

function SettingsSection({ title, description, children, action }) {
  return (
    <Card title={title} kicker={description} action={action}>
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}

function FormRow({ label, help, id, children }) {
  return <div className="grid gap-2 sm:grid-cols-[minmax(150px,0.75fr)_minmax(0,1.25fr)] sm:items-start sm:gap-5">
    <div>{id ? <label htmlFor={id} className="text-sm font-medium text-cera-text">{label}</label> : <div className="text-sm font-medium text-cera-text">{label}</div>}{help && <p className="mb-0 mt-1 text-xs leading-5 text-cera-muted">{help}</p>}</div>
    <div className="min-w-0">{children}</div>
  </div>;
}

function Toggle({ id, label, checked, onChange, disabled = false }) {
  return <button id={id} type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cera-primary disabled:opacity-50 ${checked ? 'border-cera-primary bg-cera-primary' : 'border-cera-border bg-cera-elevated'}`}>
    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>;
}

export default function Settings() {
  const { notify } = useApp();
  const { theme, setTheme } = useTheme();
  const { token, user, updateUser } = useAuth();
  const [section, setSection] = useState('profile');

  const initialProfile = useMemo(() => toProfileForm(user), [user]);
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const [settingsAttempt, setSettingsAttempt] = useState(0);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [academicSession, setAcademicSession] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [confirmSessionChange, setConfirmSessionChange] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSettingsLoading(true);
    setSettingsLoadFailed(false);
    api.request('/api/auth/faculty-settings', { token })
      .then((result) => {
        if (cancelled) return;
        const normalized = normalizeSettings(result.settings);
        setSettings(normalized);
        setSavedSettings(normalized);
      })
      .catch((error) => { if (!cancelled) { setSettingsLoadFailed(true); setSettingsError(error.message || 'Unable to load faculty settings.'); } })
      .finally(() => { if (!cancelled) setSettingsLoading(false); });
    return () => { cancelled = true; };
  }, [token, settingsAttempt]);

  useEffect(() => {
    let cancelled = false;
    setSessionLoading(true);
    setSessionLoadFailed(false);
    studentService.getCurrentAcademicSession(token)
      .then((session) => {
        if (!cancelled) {
          setAcademicSession(session);
          setSessionName(session?.sessionName || '');
        }
      })
      .catch((error) => { if (!cancelled) { setSessionLoadFailed(true); setSessionError(error.message || 'Unable to load the current academic session.'); } })
      .finally(() => { if (!cancelled) setSessionLoading(false); });
    return () => { cancelled = true; };
  }, [token, sessionAttempt]);

  const profileChanged = JSON.stringify(profile) !== JSON.stringify(savedProfile);
  const settingsChanged = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const sessionChanged = sessionName.trim() !== (academicSession?.sessionName || '');

  const updateAssessment = (key, value) => {
    setSettings((current) => ({
      ...current,
      assessmentDefaults: { ...current.assessmentDefaults, [key]: value },
    }));
    setSavedMessage('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setSavedMessage('');
    try {
      const result = await authService.updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        bio: profile.bio.trim(),
        skills: profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
        github: profile.github.trim(),
        linkedin: profile.linkedin.trim(),
      }, token);
      updateUser(result.user);
      const next = toProfileForm(result.user);
      setProfile(next);
      setSavedProfile(next);
      setSavedMessage('Profile changes saved.');
      notify('Profile changes saved.');
    } catch (error) {
      setProfileError(error.message || 'Unable to save profile changes.');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const defaults = settings.assessmentDefaults;
    if (!Number.isFinite(Number(defaults.points)) || defaults.points < 1 || defaults.points > 10000) {
      setSettingsError('Maximum marks must be between 1 and 10,000.');
      return;
    }
    if (!Number.isFinite(Number(defaults.passingPercentage)) || defaults.passingPercentage < 0 || defaults.passingPercentage > 100) {
      setSettingsError('Passing percentage must be between 0 and 100.');
      return;
    }
    if (!Number.isFinite(Number(defaults.timeLimit)) || defaults.timeLimit < 0 || defaults.timeLimit > 600) {
      setSettingsError('Time limit must be between 0 and 600 minutes.');
      return;
    }
    if (!defaults.languages.length || !defaults.targetYears.length) {
      setSettingsError('Select at least one programming language and one target academic year.');
      return;
    }
    setSettingsSaving(true);
    setSettingsError('');
    setSavedMessage('');
    try {
      const result = await api.request('/api/auth/faculty-settings', { method: 'PUT', token, body: settings });
      const normalized = normalizeSettings(result.settings);
      setSettings(normalized);
      setSavedSettings(normalized);
      setSavedMessage('Settings saved.');
      notify('Settings saved.');
    } catch (error) {
      setSettingsError(error.message || 'Unable to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveAcademicSession = async (confirmed = false) => {
    const value = sessionName.trim();
    if (!value) return;
    if (academicSession?.sessionName && sessionChanged && !confirmed) {
      setConfirmSessionChange(true);
      return;
    }
    setSessionSaving(true);
    setSessionError('');
    setSavedMessage('');
    try {
      const result = await studentService.setCurrentAcademicSession(value, token);
      setAcademicSession(result);
      setSessionName(result.sessionName);
      setConfirmSessionChange(false);
      setSavedMessage('Academic session updated. Student promotion was not triggered.');
      notify('Academic session updated. Student promotion was not triggered.');
    } catch (error) {
      setSessionError(error.message || 'Unable to update the academic session.');
    } finally {
      setSessionSaving(false);
    }
  };

  const selectedSection = SECTIONS.find((item) => item.id === section) || SECTIONS[0];

  return (
    <Page title="Settings" subtitle="Manage your faculty account and teaching preferences.">
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[210px_minmax(0,1fr)] md:items-start">
        <div className="grid gap-2 md:sticky md:top-24">
          <label htmlFor="settings-section-select" className="sr-only">Settings section</label>
          <select id="settings-section-select" className="select md:hidden" value={section} onChange={(event) => { setSection(event.target.value); setSavedMessage(''); }}>
            {SECTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <nav aria-label="Settings sections" className="hidden gap-1 md:grid">
            {SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => { setSection(id); setSavedMessage(''); }} className={`flex min-h-10 items-center gap-2.5 rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cera-primary ${section === id ? 'bg-cera-elevated text-cera-text' : 'text-cera-muted hover:bg-cera-card hover:text-cera-text'}`}>
              <Icon size={15} className="shrink-0" />{label}
            </button>)}
          </nav>
        </div>

        <section className="min-w-0" aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="sr-only">{selectedSection.label}</h2>
          {savedMessage && <p role="status" className="mb-3 mt-0 text-xs text-cera-success">{savedMessage}</p>}
          {settingsLoadFailed && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-cera-error/30 px-4 py-3 text-xs text-cera-error"><span>{settingsError}</span><Button variant="outline" size="sm" onClick={() => { setSettingsError(''); setSettingsAttempt((attempt) => attempt + 1); }}>Retry loading settings</Button></div>}

          {section === 'profile' && <SettingsSection title="Profile & Account" description="Update your faculty profile. Department access is managed by your institution.">
            <form onSubmit={saveProfile} className="grid gap-5">
              <FormRow id="profile-name" label="Full name"><input id="profile-name" className="input" autoComplete="name" value={profile.name} onChange={(event) => { setProfile((current) => ({ ...current, name: event.target.value })); setSavedMessage(''); }} required /></FormRow>
              <FormRow id="profile-email" label="Work email"><input id="profile-email" className="input" type="email" autoComplete="email" value={profile.email} onChange={(event) => { setProfile((current) => ({ ...current, email: event.target.value })); setSavedMessage(''); }} required /></FormRow>
              <FormRow id="profile-department" label="Department" help="Contact your institution to update department access."><input id="profile-department" className="input opacity-70" value={user?.department || 'Not assigned'} readOnly aria-readonly="true" /></FormRow>
              <FormRow id="profile-bio" label="Teaching bio"><textarea id="profile-bio" className="textarea min-h-20" maxLength={1000} value={profile.bio} onChange={(event) => { setProfile((current) => ({ ...current, bio: event.target.value })); setSavedMessage(''); }} placeholder="A short introduction for your faculty profile." /></FormRow>
              <FormRow id="profile-skills" label="Areas of expertise" help="Separate skills with commas."><input id="profile-skills" className="input" value={profile.skills} onChange={(event) => { setProfile((current) => ({ ...current, skills: event.target.value })); setSavedMessage(''); }} placeholder="Python, algorithms, systems" /></FormRow>
              <FormRow label="Professional links"><div className="grid gap-3"><label className="sr-only" htmlFor="profile-github">GitHub profile URL</label><input id="profile-github" className="input" value={profile.github} onChange={(event) => { setProfile((current) => ({ ...current, github: event.target.value })); setSavedMessage(''); }} placeholder="GitHub profile URL" /><label className="sr-only" htmlFor="profile-linkedin">LinkedIn profile URL</label><input id="profile-linkedin" className="input" value={profile.linkedin} onChange={(event) => { setProfile((current) => ({ ...current, linkedin: event.target.value })); setSavedMessage(''); }} placeholder="LinkedIn profile URL" /></div></FormRow>
              {profileError && <p role="alert" className="m-0 text-sm text-cera-error">{profileError}</p>}
              <div className="flex justify-end border-t border-cera-border pt-4"><Button type="submit" loading={profileSaving} disabled={profileSaving || !profileChanged} icon={Check}>Save changes</Button></div>
            </form>
          </SettingsSection>}

          {section === 'security' && <SettingsSection title="Security" description="Account security controls supported by CERA.">
            <div className="flex items-start gap-3 rounded-md border border-cera-border bg-cera-elevated/30 p-4">
              <Shield size={17} className="mt-0.5 shrink-0 text-cera-muted" />
              <div><h2 className="m-0 text-sm font-medium text-cera-text">Password management</h2><p className="mb-0 mt-1 text-xs leading-5 text-cera-muted">Self-service password changes are not available through the current CERA API. Contact your institution’s administrator if you need to reset your password.</p></div>
            </div>
          </SettingsSection>}

          {section === 'notifications' && <SettingsSection title="Notifications" description="Choose which faculty updates appear in CERA.">
            {settingsLoading ? <p role="status" className="m-0 text-sm text-cera-muted">Loading notification preferences…</p> : settingsLoadFailed ? <p className="m-0 text-sm text-cera-muted">Saved preferences are unavailable until settings load.</p> : <form onSubmit={saveSettings} className="grid gap-5">
              <FormRow label="New submissions" help="Show an in-app notification when a student submits an assignment."><Toggle id="new-submissions-toggle" label="Notify me about new submissions" checked={settings.newSubmissions} onChange={(value) => { setSettings((current) => ({ ...current, newSubmissions: value })); setSavedMessage(''); }} /></FormRow>
              {settingsError && <p role="alert" className="m-0 text-sm text-cera-error">{settingsError}</p>}
              <div className="flex justify-end border-t border-cera-border pt-4"><Button type="submit" loading={settingsSaving} disabled={settingsSaving || !settingsChanged} icon={Check}>Save changes</Button></div>
            </form>}
          </SettingsSection>}

          {section === 'assessment' && <SettingsSection title="Assessment Defaults" description="Applied to new assignments. Existing assignments are not changed.">
            {settingsLoading ? <p role="status" className="m-0 text-sm text-cera-muted">Loading assessment defaults…</p> : settingsLoadFailed ? <p className="m-0 text-sm text-cera-muted">Saved preferences are unavailable until settings load.</p> : <form onSubmit={saveSettings} className="grid gap-5">
              <FormRow id="default-points" label="Maximum marks" help="Maximum score available for a new assignment."><div className="relative"><input id="default-points" className="input pr-14" type="number" min="1" max="10000" value={settings.assessmentDefaults.points} onChange={(event) => updateAssessment('points', Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cera-muted">marks</span></div></FormRow>
              <FormRow id="default-passing-percentage" label="Passing percentage"><div className="relative"><input id="default-passing-percentage" className="input pr-10" type="number" min="0" max="100" value={settings.assessmentDefaults.passingPercentage} onChange={(event) => updateAssessment('passingPercentage', Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cera-muted">%</span></div></FormRow>
              <FormRow id="default-time-limit" label="Default time limit" help="Use 0 for an assignment with no time limit."><div className="relative"><input id="default-time-limit" className="input pr-20" type="number" min="0" max="600" value={settings.assessmentDefaults.timeLimit} onChange={(event) => updateAssessment('timeLimit', Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cera-muted">minutes</span></div></FormRow>
              <FormRow label="Programming languages"><div className="flex flex-wrap gap-x-5 gap-y-3">{LANGUAGES.map(([value, label]) => <label key={value} className="inline-flex items-center gap-2 text-sm text-cera-text"><input type="checkbox" checked={settings.assessmentDefaults.languages.includes(value)} onChange={(event) => updateAssessment('languages', event.target.checked ? [...settings.assessmentDefaults.languages, value] : settings.assessmentDefaults.languages.filter((item) => item !== value))} />{label}</label>)}</div></FormRow>
              <FormRow label="Target academic years" help="New assignments will be available to these year levels."><div className="flex flex-wrap gap-x-5 gap-y-3">{[1, 2, 3, 4].map((year) => <label key={year} className="inline-flex items-center gap-2 text-sm text-cera-text"><input type="checkbox" checked={settings.assessmentDefaults.targetYears.includes(year)} onChange={(event) => updateAssessment('targetYears', event.target.checked ? [...settings.assessmentDefaults.targetYears, year].sort() : settings.assessmentDefaults.targetYears.filter((item) => item !== year))} />Year {year}</label>)}</div></FormRow>
              <FormRow label="Secure Lab Mode" help="Preselect monitoring for new assignments."><Toggle id="secure-lab-default" label="Enable Secure Lab for new assignments" checked={settings.assessmentDefaults.secureLabEnabled} onChange={(value) => updateAssessment('secureLabEnabled', value)} /></FormRow>
              {settingsError && <p role="alert" className="m-0 text-sm text-cera-error">{settingsError}</p>}
              <div className="flex justify-end border-t border-cera-border pt-4"><Button type="submit" loading={settingsSaving} disabled={settingsSaving || !settingsChanged} icon={Check}>Save changes</Button></div>
            </form>}
          </SettingsSection>}

          {section === 'academic' && <SettingsSection title="Academic Configuration" description="Set the current session used in student promotion workflows.">
            <div className="grid gap-5">
              {sessionLoading ? <p role="status" className="m-0 text-sm text-cera-muted">Loading current academic session…</p> : sessionLoadFailed ? <div className="grid gap-3"><p role="alert" className="m-0 text-sm text-cera-error">{sessionError}</p><Button variant="outline" size="sm" className="justify-self-start" onClick={() => { setSessionError(''); setSessionAttempt((attempt) => attempt + 1); }}>Retry loading session</Button></div> : <>
                <FormRow id="current-academic-session" label="Current academic session" help="Changing the session does not promote students."><input id="current-academic-session" className="input" value={sessionName} onChange={(event) => { setSessionName(event.target.value); setConfirmSessionChange(false); setSavedMessage(''); }} placeholder="e.g. 2026-27" /></FormRow>
                {sessionError && <p role="alert" className="m-0 text-sm text-cera-error">{sessionError}</p>}
                {confirmSessionChange && <div role="alert" className="rounded-md border border-cera-warning/30 bg-cera-warning/5 p-3 text-xs leading-5 text-cera-text">Change the active session from <strong>{academicSession?.sessionName}</strong> to <strong>{sessionName.trim()}</strong>? This will not promote students.</div>}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cera-border pt-4">
                  <Link to="/students/academic-years" className="text-xs text-cera-primary hover:underline">Go to Academic Year Management</Link>
                  <div className="flex gap-2">{confirmSessionChange && <Button variant="ghost" onClick={() => setConfirmSessionChange(false)} disabled={sessionSaving}>Cancel</Button>}
                    <Button variant={confirmSessionChange ? 'primary' : 'outline'} onClick={() => saveAcademicSession(confirmSessionChange)} loading={sessionSaving} disabled={sessionSaving || !sessionChanged || !sessionName.trim()}>{confirmSessionChange ? 'Confirm session change' : 'Save changes'}</Button>
                  </div>
                </div>
              </>}
            </div>
          </SettingsSection>}

          {section === 'appearance' && <SettingsSection title="Appearance & Preferences" description="Choose a supported CERA interface theme.">
            <FormRow label="Interface theme" help="Your choice is saved to your account and applies across CERA.">
              <div className="inline-flex rounded-md border border-cera-border p-1" role="group" aria-label="Interface theme">
                <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-cera-primary ${theme === 'dark' ? 'bg-cera-elevated text-cera-text' : 'text-cera-muted hover:text-cera-text'}`}><Moon size={14} />Dark</button>
                <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} className={`inline-flex min-h-9 items-center gap-2 rounded px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-cera-primary ${theme === 'light' ? 'bg-cera-elevated text-cera-text' : 'text-cera-muted hover:text-cera-text'}`}><Palette size={14} />Light</button>
              </div>
            </FormRow>
          </SettingsSection>}
        </section>
      </div>
    </Page>
  );
}
