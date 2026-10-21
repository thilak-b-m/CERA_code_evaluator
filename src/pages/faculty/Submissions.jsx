import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Filter } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import SubmissionTable from '../../components/faculty/SubmissionTable.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { submissionService } from '../../services/submissionService.js';
import { exportCsv } from '../../utils/exportCsv.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const resultLabel = (submission) => (
  submission.evaluation?.status === 'published'
    ? 'Published'
    : submission.evaluation?.status === 'draft'
      ? 'Draft saved'
      : 'Needs review'
);

export default function Submissions() {
  const { notify } = useApp();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [expandedAssignment, setExpandedAssignment] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      assignmentService.list(token),
      submissionService.listForFaculty(token),
    ]).then(([assignmentRecords, submissionRecords]) => {
      if (cancelled) return;
      setAssignments(assignmentRecords);
      setSubmissions(submissionRecords);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'Unable to load submissions.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  const assignmentGroups = useMemo(() => {
    const groups = new Map(assignments.map((assignment) => [
      assignment.id,
      { assignmentId: assignment.id, title: assignment.title, rows: [] },
    ]));
    submissions.forEach((submission) => {
      const key = submission.assignmentId;
      if (!groups.has(key)) {
        groups.set(key, {
          assignmentId: key,
          title: submission.assignment || 'Assignment',
          rows: [],
        });
      }
      groups.get(key).rows.push(submission);
    });
    return [...groups.values()].sort((left, right) => left.title.localeCompare(right.title));
  }, [assignments, submissions]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignmentGroups
      .map((group) => ({
        ...group,
        filteredRows: group.rows.filter((submission) => (
          !query
          || submission.student.toLowerCase().includes(query)
          || group.title.toLowerCase().includes(query)
          || String(submission.lang || '').toLowerCase().includes(query)
        )),
      }))
      .filter((group) => group.filteredRows.length > 0 || !query);
  }, [assignmentGroups, search]);

  const handleExport = (group) => {
    const rows = group.rows.map((submission) => ({
      Student: submission.student,
      Assignment: group.title,
      Language: submission.lang,
      Score: submission.score ?? '',
      Maximum: submission.maxScore ?? '',
      Review: resultLabel(submission),
      Submitted: submission.submitted ? new Date(submission.submitted).toISOString() : '',
      Code: submission.evidence?.submittedCode || '',
    }));
    if (!exportCsv(rows, `${group.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}-submissions.csv`)) {
      notify('There are no student submissions for this assignment.');
      return;
    }
    notify(`Exported ${rows.length} submission${rows.length === 1 ? '' : 's'} for ${group.title}`);
  };

  const hasSearch = Boolean(search.trim());
  const matchingCount = filteredGroups.reduce((total, group) => total + group.filteredRows.length, 0);

  return (
    <Page
      title="Submissions"
      subtitle="Browse student work by assignment, open a submission, or export one assignment’s records."
    >
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search student, assignment or language..."
          className="sm:max-w-sm"
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-cera-muted">
        <span className="flex items-center gap-2">
          <Filter size={14} />
          {matchingCount} submission{matchingCount === 1 ? '' : 's'}
          {hasSearch ? ' matching your search' : ''}
        </span>
        {hasSearch && (
          <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>Clear search</button>
        )}
      </div>

      {loading ? (
        <div className="panel p-6" role="status">Loading assignments and submissions...</div>
      ) : loadError ? (
        <div className="panel p-6 text-cera-error" role="alert">{loadError}</div>
      ) : filteredGroups.length === 0 ? (
        <div className="panel empty p-10">
          {hasSearch ? 'No submissions match your search.' : 'No submissions yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const expanded = expandedAssignment === group.assignmentId;
            const filteredRows = group.filteredRows;
            return (
              <section className="panel overflow-hidden" key={group.assignmentId}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={expanded}
                    onClick={() => setExpandedAssignment(expanded ? '' : group.assignmentId)}
                  >
                    <ChevronDown size={16} className={expanded ? '' : '-rotate-90'} />
                    <span className="truncate font-semibold text-cera-text">{group.title}</span>
                    <span className="rounded-full bg-cera-elevated px-2 py-1 text-xs text-cera-muted">
                      {group.rows.length} student{group.rows.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleExport(group)}
                    disabled={!group.rows.length}
                  >
                    <Download size={14} /> Export this assignment
                  </button>
                </div>
                {expanded && (
                  group.rows.length ? (
                    <SubmissionTable rows={filteredRows} />
                  ) : (
                    <p className="border-t border-cera-border p-5 text-sm text-cera-muted">
                      No students have submitted this assignment yet.
                    </p>
                  )
                )}
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
