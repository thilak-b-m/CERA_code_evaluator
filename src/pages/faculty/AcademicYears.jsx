import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown, ArrowRight, Eye, History } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { studentService } from '../../services/studentService.js';

const YEAR_LEVELS = [1, 2, 3, 4];
const PROMOTABLE_YEARS = [1, 2, 3];
const MODES = [
  { id: 'all', label: 'Promote all eligible' },
  { id: 'year', label: 'Promote a specific year' },
  { id: 'selected', label: 'Promote selected students' },
];

function yearLabel(year) {
  return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;
}

function getScopeName(entry) {
  if (entry.sourceYear === 'all') return 'All eligible years';
  if (entry.sourceYear === 'selected') return 'Selected students';
  return `${yearLabel(Number(entry.sourceYear))} → ${yearLabel(Number(entry.destinationYear))}`;
}

export default function AcademicYears() {
  const { token } = useAuth();
  const { notify } = useApp();
  const location = useLocation();
  const selectedUsns = location.state?.selectedUsns || [];
  const [session, setSession] = useState(null);
  const [destinationSession, setDestinationSession] = useState('');
  const [mode, setMode] = useState(selectedUsns.length ? 'selected' : 'all');
  const [sourceYear, setSourceYear] = useState('1');
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      studentService.getCurrentAcademicSession(token),
      studentService.getPromotionHistory(token),
    ]).then(([sessionResult, historyResult]) => {
      if (cancelled) return;
      const errors = [];
      if (sessionResult.status === 'fulfilled') setSession(sessionResult.value);
      else errors.push(sessionResult.reason?.message || 'Unable to load the current academic session.');
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value.history || []);
      else errors.push(historyResult.reason?.message || 'Unable to load promotion history.');
      setError(errors.join(' '));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const transition = useMemo(() => session?.sessionName && destinationSession.trim()
    ? `${session.sessionName} -> ${destinationSession.trim()}`
    : '', [session, destinationSession]);
  const sessionIsValid = Boolean(destinationSession.trim() && destinationSession.trim() !== session?.sessionName);
  const canPreview = Boolean(session?.sessionName && sessionIsValid && (mode !== 'selected' || (selectedUsns.length > 0 && selectedUsns.length <= 100)) && !working);

  const affectedCount = mode === 'all'
    ? (preview?.totalPromoted || 0) + (preview?.totalGraduated || 0)
    : preview?.eligibleCount || 0;
  const excludedCount = mode === 'all' ? preview?.totalExcluded || 0 : preview?.excludedCount || 0;
  const completionCount = mode === 'all' ? preview?.totalGraduated || 0 : preview?.graduationCount || 0;
  const previewStudents = mode === 'all'
    ? (preview?.transitions || []).flatMap((item) => item.students || [])
    : preview?.students || [];
  const studentListIsManageable = previewStudents.length <= 10;

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const loadPreview = async () => {
    if (!canPreview) return;
    setWorking(true);
    setError('');
    setResult(null);
    try {
      const data = mode === 'all'
        ? await studentService.previewAllPromotion(token, transition)
        : mode === 'selected'
          ? await studentService.previewSelectedPromotion(selectedUsns, token, transition)
          : await studentService.previewPromotion(Number(sourceYear), Number(sourceYear) + 1, token, transition);
      setPreview(data);
    } catch (previewError) {
      setError(previewError.message || 'Unable to preview this promotion.');
      setPreview(null);
    } finally {
      setWorking(false);
    }
  };

  const confirmPromotion = async () => {
    if (!preview || !affectedCount) return;
    setWorking(true);
    setError('');
    try {
      const operation = mode === 'all'
        ? await studentService.executeAllPromotion(transition, token)
        : mode === 'selected'
          ? await studentService.executeSelectedPromotion(selectedUsns, transition, token)
          : await studentService.executePromotion(Number(sourceYear), Number(sourceYear) + 1, transition, token);
      setResult(operation);
      setPreview(null);
      setConfirmOpen(false);
      try {
        const currentSession = await studentService.getCurrentAcademicSession(token);
        setSession(currentSession);
        setDestinationSession('');
      } catch {
        setError('Promotion completed. Reload this page to refresh the current academic session.');
      }
      try {
        const historyResult = await studentService.getPromotionHistory(token);
        setHistory(historyResult.history || []);
      } catch {
        setError('Promotion completed. Reload this page to refresh its history.');
      }
      notify('Academic promotion completed.');
    } catch (operationError) {
      setError(operationError.message || 'Promotion could not be completed.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Page title="Academic Year Management" subtitle="Review academic progression and promote eligible students.">
    <div className="p-10 text-center text-sm text-cera-muted" role="status">Loading academic records…</div>
  </Page>;

  return (
    <Page title="Academic Year Management" subtitle="Review academic progression and promote eligible students." actions={(
      <Link to="/students" className="text-sm text-cera-muted underline decoration-cera-border underline-offset-4 hover:text-cera-text">Back to students</Link>
    )}>
      <div className="mx-auto grid max-w-6xl gap-5">
        <Card title="Academic session" kicker="Promotion advances students between sessions">
          <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:p-5">
            <div className="rounded-md border border-cera-border bg-cera-elevated/40 px-4 py-3">
              <div className="text-xs text-cera-muted">Current session</div>
              <div className="mt-1 text-sm font-medium text-cera-text">{session?.sessionName || 'Not configured'}</div>
            </div>
            <ArrowRight className="hidden text-cera-muted sm:block" size={18} aria-hidden="true" />
            <label className="grid gap-2" htmlFor="destination-session">
              <span className="label">Destination session</span>
              <input id="destination-session" className="input" value={destinationSession} onChange={(event) => { setDestinationSession(event.target.value); setPreview(null); setResult(null); }} placeholder="e.g. 2027-28" disabled={!session} />
            </label>
            {!session && <div className="sm:col-span-3 text-xs text-cera-muted">Set a current session in <Link to="/settings" className="text-cera-primary hover:underline">Faculty Settings</Link> to start a promotion.</div>}
            {session && destinationSession.trim() === session.sessionName && <p className="m-0 text-xs text-cera-warning sm:col-span-3">Choose a destination session that differs from the current session.</p>}
          </div>
        </Card>

        <section aria-labelledby="progression-title" className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 id="progression-title" className="m-0 text-sm font-semibold text-cera-text">Year progression</h2><p className="mb-0 mt-1 text-xs text-cera-muted">Fourth-year students complete their program in the all-years promotion.</p></div>
            {mode === 'year' && <span className="text-xs text-cera-primary">{yearLabel(Number(sourceYear))} → {yearLabel(Number(sourceYear) + 1)}</span>}
          </div>
          <ol className="grid list-none gap-1 rounded-md border border-cera-border bg-cera-card p-3 sm:flex sm:items-center sm:justify-between sm:px-5 sm:py-4" aria-label="Academic progression">
            {[...YEAR_LEVELS.map(yearLabel), 'Completed'].map((label, index, list) => <li key={label} className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 sm:flex-1 sm:justify-center ${mode === 'year' && (index === Number(sourceYear) - 1 || index === Number(sourceYear)) ? 'font-semibold text-cera-primary' : 'text-cera-muted'}`}>
              <span className="text-xs sm:text-sm">{label}</span>
              {index < list.length - 1 && <><ArrowRight className="hidden shrink-0 text-cera-muted/70 sm:block" size={14} aria-hidden="true" /><ArrowDown className="shrink-0 text-cera-muted/70 sm:hidden" size={13} aria-hidden="true" /></>}
            </li>)}
          </ol>
        </section>

        <Card title="Promotion workflow" kicker="Preview the impact before applying any changes">
          <div className="grid gap-5 p-4 sm:p-5">
            <fieldset className="grid gap-2">
              <legend className="label mb-1">Promotion type</legend>
              <div className="grid gap-2 md:grid-cols-3" role="group" aria-label="Promotion type">
                {MODES.map((item) => {
                  const disabled = item.id === 'selected' && (!selectedUsns.length || selectedUsns.length > PROMOTION_LIMIT);
                  return <button key={item.id} type="button" aria-pressed={mode === item.id} disabled={disabled} onClick={() => selectMode(item.id)} className={`min-h-10 rounded-md border px-3 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cera-primary disabled:cursor-not-allowed disabled:opacity-50 ${mode === item.id ? 'border-cera-primary bg-cera-primary/10 text-cera-text' : 'border-cera-border text-cera-muted hover:bg-cera-elevated'}`}>
                    <span className="block font-medium">{item.label}</span>
                    {item.id === 'selected' && <span className="mt-1 block text-[11px]">{selectedUsns.length} selected</span>}
                    {item.id === 'all' && <span className="mt-1 block text-[11px]">Advance active year levels; complete fourth year</span>}
                    {item.id === 'year' && <span className="mt-1 block text-[11px]">Advance one selected year level</span>}
                  </button>;
                })}
              </div>
              {mode === 'selected' && selectedUsns.length > PROMOTION_LIMIT && <p className="m-0 text-xs text-cera-warning">Promotion supports up to {PROMOTION_LIMIT} selected students at a time.</p>}
            </fieldset>

            {mode === 'year' && <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
              <label className="grid gap-2" htmlFor="source-year"><span className="label">Source academic year</span>
                <select id="source-year" className="select" value={sourceYear} onChange={(event) => { setSourceYear(event.target.value); setPreview(null); }}>
                  {PROMOTABLE_YEARS.map((year) => <option key={year} value={year}>{yearLabel(year)}</option>)}
                </select>
              </label>
              <div className="text-xs text-cera-muted">Destination: <strong className="text-cera-text">{yearLabel(Number(sourceYear) + 1)}</strong>. Year four is completed through the all-years promotion.</div>
            </div>}

            {error && <p role="alert" className="m-0 text-sm text-cera-error">{error}</p>}
            <div className="flex flex-wrap items-center gap-3 border-t border-cera-border pt-4">
              <Button onClick={loadPreview} loading={working} disabled={!canPreview}>Preview promotion</Button>
              <span className="text-xs text-cera-muted">No student record changes during preview.</span>
            </div>

            {preview && <section aria-labelledby="preview-title" className="grid gap-4 border-t border-cera-border pt-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 id="preview-title" className="m-0 text-sm font-semibold text-cera-text">Promotion preview</h3><p className="mb-0 mt-1 text-xs text-cera-muted">{preview.currentSession || session?.sessionName} → {destinationSession.trim()}</p></div>
                <span className="text-xs text-cera-muted">{preview.department}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-cera-border px-3 py-3"><dt className="text-xs text-cera-muted">Students affected</dt><dd className="mb-0 mt-1 text-lg font-semibold text-cera-text">{affectedCount}</dd></div>
                <div className="rounded-md border border-cera-border px-3 py-3"><dt className="text-xs text-cera-muted">Excluded</dt><dd className="mb-0 mt-1 text-lg font-semibold text-cera-text">{excludedCount}</dd></div>
                <div className="col-span-2 rounded-md border border-cera-border px-3 py-3 sm:col-span-1"><dt className="text-xs text-cera-muted">Completing program</dt><dd className="mb-0 mt-1 text-lg font-semibold text-cera-text">{completionCount}</dd></div>
              </dl>
              {mode === 'all' && <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-cera-muted">
                {(preview.transitions || []).map((item) => <span key={item.sourceYear}>{yearLabel(item.sourceYear)}: {item.studentCount} eligible · {item.excludedCount} excluded</span>)}
              </div>}
              {studentListIsManageable && previewStudents.length > 0 && <div className="overflow-x-auto rounded-md border border-cera-border">
                <table className="w-full text-left text-xs"><thead className="bg-cera-elevated/50 text-cera-muted"><tr><th className="px-3 py-2 font-medium">Student</th><th className="px-3 py-2 font-medium">Student ID</th><th className="px-3 py-2 font-medium">Progression</th></tr></thead><tbody className="divide-y divide-cera-border">
                  {previewStudents.map((student) => <tr key={student.usn}><td className="px-3 py-2 text-cera-text">{student.name}</td><td className="px-3 py-2 font-mono text-cera-muted">{student.usn}</td><td className="px-3 py-2 text-cera-muted">{yearLabel(student.sourceYear)} → {student.destinationYear ? yearLabel(student.destinationYear) : 'Completed'}</td></tr>)}
                </tbody></table>
              </div>}
              {previewStudents.length > 10 && <p className="m-0 text-xs text-cera-muted">The roster contains {previewStudents.length} eligible students; the full list will be included in the promotion record.</p>}
              <p className="m-0 text-xs text-cera-muted">Academic history, submissions, and grades are preserved.</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-cera-muted">{affectedCount ? `${affectedCount} record(s) will be updated.` : 'No eligible students in this promotion.'}</span>
                <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={!affectedCount}>Continue to confirmation</Button>
              </div>
            </section>}
          </div>
        </Card>

        {result && <div role="status" className="rounded-md border border-cera-success/30 bg-cera-success/5 px-4 py-3 text-sm text-cera-text">
          Promotion completed · {result.summary?.promoted || 0} promoted · {result.summary?.graduated || 0} completed · {result.summary?.skipped || 0} skipped · {result.summary?.failed || 0} failed.
        </div>}

        <Card title="Promotion history" kicker="Recent operations for your department">
          {history.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-cera-border bg-cera-elevated/30 text-xs text-cera-muted"><tr><th className="px-4 py-3 font-medium">Academic session</th><th className="px-3 py-3 font-medium">Promotion type</th><th className="px-3 py-3 font-medium">Students affected</th><th className="px-3 py-3 font-medium">Completed</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3"><span className="sr-only">Details</span></th></tr></thead>
              <tbody className="divide-y divide-cera-border">{history.map((entry) => <tr key={entry.operationId}>
                <td className="px-4 py-3 text-cera-text">{entry.sessionTransition}</td><td className="px-3 py-3 text-cera-muted">{getScopeName(entry)}</td><td className="px-3 py-3 text-cera-text">{entry.students?.length || entry.promotedCount || entry.graduatedCount || 0}</td><td className="px-3 py-3 text-cera-muted">{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '—'}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${entry.failedCount ? 'border-cera-warning/30 bg-cera-warning/10 text-cera-warning' : 'border-cera-success/30 bg-cera-success/10 text-cera-success'}`}>{String(entry.status || 'completed').replaceAll('_', ' ')}</span></td>
                <td className="px-3 py-3"><Button variant="outline" size="sm" icon={Eye} onClick={() => setSelectedHistory(entry)} aria-label={`View details for promotion ${entry.operationId}`}>Details</Button></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="flex items-start gap-3 p-5 text-sm text-cera-muted"><History size={17} className="mt-0.5 shrink-0" /><p className="m-0">No promotion history yet. Completed operations will appear here.</p></div>}
        </Card>
      </div>

      <Modal isOpen={Boolean(selectedHistory)} onClose={() => setSelectedHistory(null)} title="Promotion details" size="lg">
        {selectedHistory && (() => {
          const entry = selectedHistory;
          const graduatedCount = entry.graduatedCount || 0;
          const promotedCount = entry.sourceYear === 'all'
            ? Math.max(0, (entry.promotedCount || 0) - graduatedCount)
            : entry.promotedCount || 0;
          const statusLabel = String(entry.status || 'completed').replaceAll('_', ' ');
          const students = entry.students || [];
          return <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-cera-border bg-cera-elevated/40 p-4">
              <div>
                <p className="m-0 text-xs text-cera-muted">Academic session</p>
                <p className="mb-0 mt-1 text-sm font-semibold text-cera-text">{entry.sessionTransition}</p>
                <p className="mb-0 mt-1 text-xs text-cera-muted">{getScopeName(entry)}</p>
              </div>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${entry.failedCount ? 'border-cera-warning/30 bg-cera-warning/10 text-cera-warning' : 'border-cera-success/30 bg-cera-success/10 text-cera-success'}`}>{statusLabel}</span>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Promoted', promotedCount, 'text-cera-primary'],
                ['Program completed', graduatedCount, 'text-cera-success'],
                ['Skipped', entry.skippedCount || 0, 'text-cera-muted'],
                ['Failed', entry.failedCount || 0, entry.failedCount ? 'text-cera-error' : 'text-cera-muted'],
              ].map(([label, count, tone]) => <div key={label} className="rounded-md border border-cera-border px-3 py-3">
                <dt className="text-xs text-cera-muted">{label}</dt>
                <dd className={`mb-0 mt-1 text-lg font-semibold ${tone}`}>{count}</dd>
              </div>)}
            </dl>

            <div className="grid gap-3 rounded-md border border-cera-border p-4 text-sm sm:grid-cols-2">
              <div><p className="m-0 text-xs text-cera-muted">Completed</p><p className="mb-0 mt-1 text-cera-text">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</p></div>
              <div><p className="m-0 text-xs text-cera-muted">Operation ID</p><p className="mb-0 mt-1 break-all font-mono text-xs text-cera-text">{entry.operationId}</p></div>
              {entry.facultyName && <div className="sm:col-span-2"><p className="m-0 text-xs text-cera-muted">Recorded by</p><p className="mb-0 mt-1 text-cera-text">{entry.facultyName}</p></div>}
            </div>

            <section aria-labelledby="promotion-students-title" className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div><h3 id="promotion-students-title" className="m-0 text-sm font-semibold text-cera-text">Affected students</h3><p className="mb-0 mt-1 text-xs text-cera-muted">{students.length} student record(s) in this operation</p></div>
              </div>
              {students.length ? <ul className="m-0 max-h-[38vh] list-none divide-y divide-cera-border overflow-y-auto rounded-md border border-cera-border p-0">
                {students.map((student, index) => <li key={`${student.usn || 'student'}-${index}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="m-0 truncate text-sm font-medium text-cera-text">{student.name || 'Student'}</p><p className="mb-0 mt-0.5 font-mono text-xs text-cera-muted">{student.usn || 'ID unavailable'}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${student.graduated || student.destinationYear === 'Graduated' ? 'bg-cera-success/10 text-cera-success' : 'bg-cera-primary/10 text-cera-primary'}`}>{student.graduated || student.destinationYear === 'Graduated' ? 'Program completed' : 'Promoted'}</span>
                </li>)}
              </ul> : <p className="m-0 rounded-lg border border-dashed border-cera-border px-4 py-6 text-center text-sm text-cera-muted">No student roster was saved with this operation.</p>}
            </section>
          </div>;
        })()}
      </Modal>

      <Modal isOpen={confirmOpen} onClose={() => { if (!working) setConfirmOpen(false); }} title="Confirm student promotion" size="sm">
        <div className="grid gap-5">
          <p className="m-0 text-sm leading-6 text-cera-muted">Promote <strong className="text-cera-text">{affectedCount}</strong> eligible student(s) from <strong className="text-cera-text">{session?.sessionName}</strong> to <strong className="text-cera-text">{destinationSession.trim()}</strong>? {completionCount ? `${completionCount} student(s) will complete the program. ` : ''}Academic records and historical submissions will be preserved.</p>
          <div className="flex justify-end gap-2 border-t border-cera-border pt-4">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={working}>Review again</Button>
            <Button onClick={confirmPromotion} loading={working}>Confirm promotion</Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
