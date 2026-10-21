import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Download, Plus, Search, Users } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import { studentService } from '../../services/studentService.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const YEARS = [1, 2, 3, 4];
const PAGE_SIZE = 20;
const BULK_LIMIT = 1000;
const PROMOTION_LIMIT = 100;

function yearName(year) {
  return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} year`;
}

function StatusIndicator({ active }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-cera-text">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${active ? 'bg-cera-success' : 'bg-cera-muted'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function StudentActionsMenu({ student, onEdit, onCorrect, onStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = `student-actions-${student.usn.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnScrollOrResize = () => setOpen(false);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScrollOrResize, true);
    window.addEventListener('resize', closeOnScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScrollOrResize, true);
      window.removeEventListener('resize', closeOnScrollOrResize);
    };
  }, [open]);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const bounds = triggerRef.current.getBoundingClientRect();
    const menuHeight = 220;
    const top = bounds.bottom + menuHeight + 12 > window.innerHeight
      ? Math.max(8, bounds.top - menuHeight - 8)
      : bounds.bottom + 6;
    const left = Math.max(8, Math.min(bounds.right - 208, window.innerWidth - 216));
    setPosition({ top, left });
    setOpen(true);
  };

  const runAction = (callback) => {
    setOpen(false);
    callback();
  };

  const menu = open && createPortal(
    <div
      ref={menuRef}
      id={menuId}
      className="fixed z-[100] grid w-52 gap-0.5 rounded-lg border border-cera-border bg-cera-card p-1.5 shadow-xl shadow-black/20"
      style={position}
    >
      <Link to={`/students/${encodeURIComponent(student.usn)}`} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-cera-text hover:bg-cera-elevated">View student</Link>
      <button type="button" onClick={() => runAction(() => onEdit(student))} className="rounded-md px-3 py-2 text-left text-sm text-cera-text hover:bg-cera-elevated">Edit details</button>
      <button type="button" onClick={() => runAction(() => onCorrect(student))} className="rounded-md px-3 py-2 text-left text-sm text-cera-text hover:bg-cera-elevated">Correct academic year</button>
      <button type="button" onClick={() => runAction(() => onStatus(student))} className="rounded-md px-3 py-2 text-left text-sm text-cera-text hover:bg-cera-elevated">{student.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
      <div className="my-1 border-t border-cera-border" />
      <button type="button" onClick={() => runAction(() => onDelete(student))} className="rounded-md px-3 py-2 text-left text-sm text-cera-error hover:bg-cera-elevated">Delete account</button>
    </div>,
    document.body,
  );

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={toggleMenu}
      className="ml-auto inline-flex h-8 items-center gap-2 rounded-md border border-cera-border px-2.5 text-xs font-medium text-cera-muted transition-colors hover:border-cera-primary/50 hover:bg-cera-elevated hover:text-cera-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-cera-primary"
    >
      Actions <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {menu}
  </>;
}

function StudentForm({ open, onClose, onSubmit, form, setForm, department, error, saving, editing = false }) {
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal isOpen={open} onClose={() => { if (!saving) onClose(); }} title={editing ? 'Edit student' : 'Add student'}>
      <form onSubmit={onSubmit} className="grid gap-5">
        <p className="m-0 text-sm text-cera-muted">
          {editing ? 'Update the student’s account details.' : `Create a student account in ${department || 'your department'}.`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 sm:col-span-2" htmlFor="student-name"><span className="label">Full name</span>
            <input id="student-name" className="input" value={form.name} onChange={setField('name')} autoComplete="name" required />
          </label>
          <label className="grid gap-2" htmlFor="student-usn"><span className="label">Student ID / USN</span>
            <input id="student-usn" className="input" value={form.usn} onChange={setField('usn')} autoComplete="off" required />
          </label>
          <label className="grid gap-2" htmlFor="student-email"><span className="label">Email address</span>
            <input id="student-email" className="input" type="email" value={form.email} onChange={setField('email')} autoComplete="email" required />
          </label>
          {!editing && <>
            <label className="grid gap-2" htmlFor="student-year"><span className="label">Academic year</span>
              <select id="student-year" className="select" value={form.year} onChange={setField('year')}>
                {YEARS.map((year) => <option key={year} value={year}>{yearName(year)}</option>)}
              </select>
            </label>
            <label className="grid gap-2" htmlFor="student-password"><span className="label">Initial password</span>
              <input id="student-password" className="input" type="password" value={form.password} onChange={setField('password')} minLength={8} autoComplete="new-password" required />
            </label>
            <label className="grid gap-2 sm:col-span-2" htmlFor="student-confirm-password"><span className="label">Confirm password</span>
              <input id="student-confirm-password" className="input" type="password" value={form.confirmPassword} onChange={setField('confirmPassword')} minLength={8} autoComplete="new-password" required />
            </label>
          </>}
        </div>
        {error && <p role="alert" className="m-0 text-sm text-cera-error">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-cera-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create student'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function YearCorrectionDialog({ student, onClose, onSubmit, year, setYear, reason, setReason, saving, error }) {
  return (
    <Modal isOpen={Boolean(student)} onClose={() => { if (!saving) onClose(); }} title="Correct academic year" size="md">
      <form onSubmit={onSubmit} className="grid gap-5">
        <p className="m-0 text-sm text-cera-muted">Record an audited correction for <strong className="text-cera-text">{student?.name}</strong>. Use academic promotion for normal year progression.</p>
        <label className="grid max-w-sm gap-2" htmlFor="corrected-year"><span className="label">Correct year</span>
          <select id="corrected-year" className="select" value={year} onChange={(event) => setYear(event.target.value)}>
            {YEARS.map((item) => <option key={item} value={item}>{yearName(item)}</option>)}
          </select>
          <span className="text-xs text-cera-muted">Choose a different year and provide a correction reason of at least 10 characters.</span>
        </label>
        <label className="grid gap-2" htmlFor="correction-reason"><span className="label">Reason for correction</span>
          <textarea id="correction-reason" className="textarea min-h-24" minLength={10} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Explain why the academic year needs correction." />
          <span className="text-right text-xs text-cera-muted">{reason.length}/500</span>
        </label>
        {error && <p role="alert" className="m-0 text-sm text-cera-error">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-cera-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={reason.trim().length < 10 || Number(year) === Number(student?.year)}>Save correction</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDialog({ action, count = 1, busy, onClose, onConfirm }) {
  if (!action) return null;
  const bulk = Boolean(action.bulk);
  const deactivate = action.type === 'deactivate';
  const reactivate = action.type === 'reactivate';
  const actionLabel = action.label || (action.type === 'delete' ? 'Delete' : deactivate ? 'Deactivate' : 'Reactivate');
  const title = bulk ? `${deactivate ? 'Deactivate' : 'Reactivate'} ${count} students` : `${actionLabel} account`;
  const description = deactivate
    ? 'The student will lose account access. Academic records, submissions, and grades will be preserved.'
    : reactivate
      ? 'The student will regain account access.'
      : 'This action deactivates the account and preserves its submissions, grades, and academic history.';

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title={title} size="sm">
      <div className="grid gap-5">
        <p className="m-0 text-sm leading-6 text-cera-muted">{bulk ? `Apply this change to ${count} selected accounts? Students’ academic records and submissions will be preserved.` : description}</p>
        <div className="flex justify-end gap-2 border-t border-cera-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={deactivate || action.type === 'delete' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {action.type === 'delete' ? 'Delete account' : deactivate ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Students() {
  const { notify } = useApp();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedUsns, setSelectedUsns] = useState(new Set());
  const [selectedRecords, setSelectedRecords] = useState(new Map());
  const [selectingAll, setSelectingAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');
  const [studentForm, setStudentForm] = useState({ name: '', usn: '', email: '', year: '1', password: '', confirmPassword: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', usn: '', email: '' });
  const [correcting, setCorrecting] = useState(null);
  const [correctedYear, setCorrectedYear] = useState('1');
  const [correctionReason, setCorrectionReason] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const loadStudents = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    studentService.list(token, { page: pagination.page, limit: PAGE_SIZE, search, year, status })
      .then((result) => {
        if (cancelled) return;
        setStudents(result.students || []);
        setPagination(result.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
        setLoadError('');
      })
      .catch((error) => { if (!cancelled) setLoadError(error.message || 'Unable to load students.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, pagination.page, search, year, status]);

  useEffect(() => loadStudents(), [loadStudents]);
  useEffect(() => {
    setPagination((current) => current.page === 1 ? current : { ...current, page: 1 });
    setSelectedUsns(new Set());
    setSelectedRecords(new Map());
  }, [search, year, status]);

  const rows = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students]);
  const hasFilters = Boolean(search.trim() || year !== 'all' || status !== 'all');
  const allFilteredSelected = pagination.total > 0 && selectedUsns.size === pagination.total;

  const openAdd = () => {
    setFormError('');
    setStudentForm({ name: '', usn: '', email: '', year: '1', password: '', confirmPassword: '' });
    setEditing(null);
    setAdding(true);
  };

  const toggleSelectFiltered = async () => {
    if (allFilteredSelected) {
      setSelectedUsns(new Set());
      setSelectedRecords(new Map());
      return;
    }
    setSelectingAll(true);
    try {
      const first = await studentService.list(token, { page: 1, limit: 100, search, year, status });
      if ((first.pagination?.total || 0) > BULK_LIMIT) throw new Error(`Select at most ${BULK_LIMIT.toLocaleString()} students at a time. Narrow the filters and try again.`);
      const records = [...(first.students || [])];
      for (let page = 2; page <= (first.pagination?.totalPages || 1); page += 1) {
        const result = await studentService.list(token, { page, limit: 100, search, year, status });
        records.push(...(result.students || []));
      }
      setSelectedUsns(new Set(records.map((student) => student.usn)));
      setSelectedRecords(new Map(records.map((student) => [student.usn, student])));
    } catch (error) {
      notify(error.message || 'Unable to select the filtered roster.');
    } finally {
      setSelectingAll(false);
    }
  };

  const exportStudents = async (records = null) => {
    if (exporting) return;
    setExporting(true);
    try {
      let exportRows = records ? [...records] : [];
      if (!records) {
        const first = await studentService.list(token, { page: 1, limit: 100, search, year, status });
        exportRows = [...(first.students || [])];
        for (let page = 2; page <= (first.pagination?.totalPages || 1); page += 1) {
          const result = await studentService.list(token, { page, limit: 100, search, year, status });
          exportRows.push(...(result.students || []));
        }
      }
      if (!exportRows.length) {
        notify('There are no student records to export.');
        return;
      }
      const columns = ['Name', 'Student ID', 'Email', 'Academic year', 'Department', 'Status'];
      const csv = [columns, ...exportRows.map((student) => [student.name, student.usn, student.email, student.year, student.department, student.status])]
        .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cera-student-roster.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      notify(`${exportRows.length} student record(s) exported.`);
    } catch (error) {
      notify(error.message || 'Unable to export the roster.');
    } finally {
      setExporting(false);
    }
  };

  const addStudent = async (event) => {
    event.preventDefault();
    setFormError('');
    if (studentForm.password !== studentForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { confirmPassword, ...details } = studentForm;
      await studentService.addStudent(details, token);
      setStudentForm({ name: '', usn: '', email: '', year: '1', password: '', confirmPassword: '' });
      setAdding(false);
      notify('Student account created.');
      await loadStudents();
    } catch (error) {
      setFormError(error.message || 'Unable to create the student account.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (student) => {
    setEditForm({ name: student.name || '', usn: student.usn || '', email: student.email || '' });
    setFormError('');
    setEditing(student);
  };

  const updateStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await studentService.updateStudent(editing.usn, editForm, token);
      setEditing(null);
      setSelectedUsns(new Set());
      setSelectedRecords(new Map());
      notify('Student details updated.');
      await loadStudents();
    } catch (error) {
      setFormError(error.message || 'Unable to update student details.');
    } finally {
      setSaving(false);
    }
  };

  const submitYearCorrection = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await studentService.correctAcademicYear(correcting.usn, correctedYear, correctionReason, token);
      setCorrecting(null);
      setSelectedUsns(new Set());
      setSelectedRecords(new Map());
      notify('Academic year correction recorded.');
      await loadStudents();
    } catch (error) {
      setFormError(error.message || 'Unable to record the academic year correction.');
    } finally {
      setSaving(false);
    }
  };

  const performAccountAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setSaving(true);
    try {
      if (action.bulk) {
        const result = await studentService.bulkUpdateStudentStatus([...selectedUsns], action.type === 'deactivate' ? 'inactive' : 'active', token);
        notify(`${result.successful.length} succeeded, ${result.skipped.length} skipped, ${result.failed.length} failed.`);
        setSelectedUsns(new Set());
        setSelectedRecords(new Map());
      } else if (action.type === 'deactivate') {
        await studentService.deactivateStudent(action.student.usn, token);
        notify(`${action.student.name} deactivated.`);
      } else if (action.type === 'reactivate') {
        await studentService.reactivateStudent(action.student.usn, token);
        notify(`${action.student.name} reactivated.`);
      } else {
        await studentService.deleteStudent(action.student.usn, token);
        notify(`${action.student.name} account deactivated. Records preserved.`);
      }
      if (!action.bulk) {
        setSelectedUsns(new Set());
        setSelectedRecords(new Map());
      }
      setConfirmAction(null);
      await loadStudents();
    } catch (error) {
      notify(error.message || 'Unable to complete the account action.');
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedUsns(new Set());
    setSelectedRecords(new Map());
  };

  const clearFilters = () => {
    setSearch('');
    setYear('all');
    setStatus('all');
  };

  return (
    <Page title="Students" subtitle="Manage student accounts and academic details." actions={(
      <Button onClick={openAdd} icon={Plus}>Add student</Button>
    )}>
      <StudentForm
        open={adding}
        onClose={() => { setAdding(false); setStudentForm({ name: '', usn: '', email: '', year: '1', password: '', confirmPassword: '' }); setFormError(''); }}
        onSubmit={addStudent}
        form={studentForm}
        setForm={setStudentForm}
        department={user?.department}
        error={formError}
        saving={saving}
      />
      <StudentForm
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSubmit={updateStudent}
        form={editForm}
        setForm={setEditForm}
        error={formError}
        saving={saving}
        editing
      />
      <YearCorrectionDialog
        student={correcting}
        onClose={() => setCorrecting(null)}
        onSubmit={submitYearCorrection}
        year={correctedYear}
        setYear={setCorrectedYear}
        reason={correctionReason}
        setReason={setCorrectionReason}
        saving={saving}
        error={formError}
      />
      <ConfirmDialog action={confirmAction} count={selectedUsns.size} busy={saving} onClose={() => setConfirmAction(null)} onConfirm={performAccountAction} />

      <Card className="overflow-visible">
        <div className="grid gap-4 border-b border-cera-border p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_150px_150px_auto_auto] md:items-center">
            <label className="relative block" htmlFor="student-search">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cera-muted" />
              <input id="student-search" className="input-base w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, or email" />
            </label>
            <label className="grid gap-1" htmlFor="student-year-filter"><span className="sr-only">Filter by academic year</span>
              <select id="student-year-filter" className="select" value={year} onChange={(event) => setYear(event.target.value)}>
                <option value="all">All years</option>{YEARS.map((item) => <option key={item} value={item}>{yearName(item)}</option>)}
              </select>
            </label>
            <label className="grid gap-1" htmlFor="student-status-filter"><span className="sr-only">Filter by account status</span>
              <select id="student-status-filter" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </label>
            <Button variant="outline" size="sm" onClick={toggleSelectFiltered} loading={selectingAll} disabled={!pagination.total} icon={allFilteredSelected ? Check : Users} className="whitespace-nowrap">
              {allFilteredSelected ? 'Clear selection' : 'Select all'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportStudents()} loading={exporting} icon={Download} className="whitespace-nowrap">Export CSV</Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cera-muted">
            <span className="inline-flex items-center gap-2"><Users size={14} />{pagination.total} {pagination.total === 1 ? 'student' : 'students'}{user?.department ? ` · ${user.department}` : ''}</span>
            {hasFilters && <button type="button" onClick={clearFilters} className="text-cera-muted underline decoration-cera-border underline-offset-4 hover:text-cera-text">Clear filters</button>}
          </div>
        </div>

        {selectedUsns.size > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-cera-border bg-cera-elevated/60 px-4 py-3 sm:px-5">
          <span className="mr-auto text-sm font-medium text-cera-text">{selectedUsns.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'deactivate', bulk: true })} disabled={saving || selectedUsns.size > BULK_LIMIT}>Deactivate</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'reactivate', bulk: true })} disabled={saving || selectedUsns.size > BULK_LIMIT}>Reactivate</Button>
          <Button variant="ghost" size="sm" onClick={() => exportStudents(selectedRecords.values())} loading={exporting} icon={Download}>Export</Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/students/academic-years', { state: { selectedUsns: [...selectedUsns] } })} disabled={selectedUsns.size > PROMOTION_LIMIT}>Promote</Button>
          <button type="button" onClick={clearSelection} className="px-2 py-1 text-xs text-cera-muted hover:text-cera-text">Clear</button>
        </div>}
        {selectedUsns.size > BULK_LIMIT && <p className="m-0 border-b border-cera-border px-5 py-2 text-xs text-cera-warning">Bulk status changes support up to {BULK_LIMIT.toLocaleString()} students.</p>}

        {loadError ? <div className="p-8 text-center" role="alert">
          <p className="m-0 text-sm text-cera-error">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadStudents}>Retry</Button>
        </div> : loading ? <div className="p-12 text-center text-sm text-cera-muted" role="status">Loading students…</div> : rows.length ? <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-cera-border bg-cera-elevated/30 text-xs uppercase tracking-wide text-cera-muted">
                <tr>
                  <th scope="col" className="px-3 py-3 font-medium">Student</th>
                  <th scope="col" className="px-3 py-3 font-medium">Student ID</th>
                  <th scope="col" className="px-3 py-3 font-medium">Academic year</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="w-14 px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cera-border">
                {rows.map((student) => <tr key={student.usn} className="transition-colors hover:bg-cera-elevated/30">
                  <td className="px-3 py-4">
                    <Link to={`/students/${encodeURIComponent(student.usn)}`} className="group block min-w-0">
                      <span className="block truncate font-medium text-cera-text group-hover:text-cera-primary">{student.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-cera-muted">{student.email}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-4 font-mono text-xs text-cera-muted">{student.usn}</td>
                  <td className="px-3 py-4 text-cera-text">{student.completedAt ? 'Completed' : yearName(Number(student.year))}</td>
                  <td className="px-3 py-4"><StatusIndicator active={student.status === 'active'} /></td>
                  <td className="px-3 py-3">
                    <StudentActionsMenu
                      student={student}
                      onEdit={openEdit}
                      onCorrect={(record) => { setCorrecting(record); setCorrectedYear(String(record.year)); setCorrectionReason(''); setFormError(''); }}
                      onStatus={(record) => setConfirmAction({ type: record.status === 'active' ? 'deactivate' : 'reactivate', student: record })}
                      onDelete={(record) => setConfirmAction({ type: 'delete', student: record, label: 'Delete' })}
                    />
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cera-border px-4 py-3 text-xs text-cera-muted sm:px-5">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={pagination.page <= 1 || loading}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} disabled={pagination.page >= pagination.totalPages || loading}>Next</Button>
            </div>
          </div>}
        </> : <div className="grid justify-items-center gap-2 px-5 py-16 text-center">
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg border border-cera-border text-cera-muted"><Search size={17} /></div>
          <h2 className="m-0 text-sm font-semibold text-cera-text">{hasFilters ? 'No students match these filters' : 'No students in this department yet'}</h2>
          <p className="m-0 max-w-sm text-xs leading-5 text-cera-muted">{hasFilters ? 'Adjust the search or filters to see more students.' : 'Add a student account to start building your department roster.'}</p>
          {hasFilters ? <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>Clear filters</Button> : <Button size="sm" className="mt-2" onClick={openAdd} icon={Plus}>Add student</Button>}
        </div>}
      </Card>
    </Page>
  );
}
