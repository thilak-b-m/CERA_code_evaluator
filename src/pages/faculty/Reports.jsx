import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Code2,
  Download,
  FileText,
  GraduationCap,
  Inbox,
  RefreshCw,
  RotateCcw,
  Target,
  Users,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Dropdown from '../../components/common/Dropdown.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';
import ReportChart from '../../components/faculty/ReportChart.jsx';

import {
  REPORT_TYPE_LABELS,
  formatReportValue,
  reportService,
} from '../../services/reportService.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 25;

const REPORT_TYPES = [
  {
    value: 'assignments',
    label: 'Assignments',
    icon: BookOpen,
    description: 'Performance, completion, and published scores for each assignment in your workspace.',
  },
  {
    value: 'students',
    label: 'Students',
    icon: Users,
    description: 'Progress and published results for the learners in your department roster.',
  },
  {
    value: 'submissions',
    label: 'Submissions',
    icon: Code2,
    description: 'Every submission with its programming language and evaluation state.',
  },
  {
    value: 'evaluations',
    label: 'Evaluations',
    icon: ClipboardCheck,
    description: 'The grading workflow, keeping AI-generated drafts separate from published results.',
  },
];

/*
 * Mirrors the backend `availableFilters` map so the filter controls stay stable
 * while the first response is loading. The response config always wins.
 */
const FALLBACK_FILTERS = {
  assignments: ['assignmentId', 'language', 'from', 'to'],
  students: ['student', 'assignmentId', 'from', 'to'],
  submissions: ['assignmentId', 'student', 'language', 'status', 'from', 'to'],
  evaluations: ['assignmentId', 'student', 'status', 'from', 'to'],
};

const KPI_META = {
  students: { icon: Users, trend: 'Learners in scope' },
  assignments: { icon: BookOpen, trend: 'Active assignments' },
  submissions: { icon: Code2, trend: 'Submissions in scope' },
  pending: { icon: Clock, trend: 'Awaiting a faculty evaluation' },
  published: { icon: CheckCircle2, trend: 'Published results' },
  average: { icon: Target, trend: 'Published evaluations only' },
  inactive: { icon: AlertTriangle, trend: 'No submissions recorded' },
  evaluations: { icon: ClipboardCheck, trend: 'Saved evaluations' },
  ai: { icon: Activity, trend: 'AI-generated drafts' },
  faculty: { icon: GraduationCap, trend: 'Saved by faculty' },
};

const TONE_COLORS = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
};

const EMPTY_FILTERS = {
  assignmentId: '',
  student: '',
  language: '',
  status: '',
  from: '',
  to: '',
};

const ALL_OPTION = (label) => [{ value: '', label }];

function withAll(options, label) {
  return [...ALL_OPTION(label), ...(options || [])];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { notify } = useApp();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('assignments');
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const [refreshNonce, setRefreshNonce] = useState(0);

  const params = useMemo(() => ({
    type: reportType,
    assignmentId: applied.assignmentId,
    student: applied.student,
    language: applied.language,
    status: applied.status,
    from: applied.from,
    to: applied.to,
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    sort,
    sortDir,
  }), [reportType, applied, page, debouncedSearch, sort, sortDir]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    reportService
      .getReport(params, token)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Unable to load this report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, token, refreshNonce]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const typeMeta = REPORT_TYPES.find((type) => type.value === reportType) || REPORT_TYPES[0];
  /* Only trust the response's filter config once it matches the active report type. */
  const reportMatchesType = report?.reportType === reportType;
  const available = (reportMatchesType ? report.availableFilters : null)
    || FALLBACK_FILTERS[reportType]
    || [];
  const filterOptions = reportMatchesType ? (report.filterOptions || {}) : {};
  const pagination = report?.pagination;
  const columns = report?.columns || [];
  const rows = report?.rows || [];
  const hasRowLinks = rows.some((row) => row.submissionId);

  const activeFilterCount = Object.values(applied).filter(Boolean).length;

  const changeType = (type) => {
    setReportType(type);
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setSearch('');
    setDebouncedSearch('');
    setSort('');
    setSortDir('asc');
    setPage(1);
  };

  const setDraftField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const changeSort = (key) => {
    if (sort === key) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const result = await reportService.exportReport(params, format, token);
      if (!result.rowCount) {
        notify('No records to export for the current filters');
        return;
      }
      downloadBlob(result.blob, result.filename);
      notify(
        result.truncated
          ? `Exported the first ${result.rowCount} records as ${format}`
          : `${format} report exported`,
      );
    } catch (exportError) {
      console.error('Error exporting report:', exportError);
      notify(`Failed to export ${format} report`);
    } finally {
      setExporting('');
    }
  };

  if (loading && !report) {
    return (
      <Page title="Reports & Analytics" subtitle="Loading report data...">
        <Card title="Loading" kicker="Fetching authorised report data">
          <div style={{ padding: 20, color: 'var(--muted)' }}>Loading report...</div>
        </Card>
      </Page>
    );
  }

  if (error && !report) {
    return (
      <Page title="Reports & Analytics" subtitle="Data-backed reports from your workspace.">
        <div role="alert" className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ justifySelf: 'start' }}
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="CERA / FACULTY"
      title="Reports & Analytics"
      subtitle={typeMeta.description}
      actions={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            disabled={exporting !== ''}
            onClick={() => handleExport('CSV')}
          >
            <Download size={14} />
            {exporting === 'CSV' ? 'Exporting…' : 'Export CSV'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={exporting !== ''}
            onClick={() => handleExport('PDF')}
          >
            <FileText size={14} />
            {exporting === 'PDF' ? 'Exporting…' : 'Export PDF'}
          </button>
        </>
      }
    >
      <div className="segmented" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        {REPORT_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={reportType === value ? 'active' : ''}
            onClick={() => changeType(value)}
          >
            <Icon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="panel" style={{ padding: 14, marginBottom: 14, color: 'var(--error)' }}>
          {error}
        </div>
      )}

      <Card
        title="Filters"
        kicker={
          activeFilterCount
            ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied`
            : 'Showing every record you are authorised to see'
        }
      >
        <div style={{ padding: 20, display: 'grid', gap: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              alignItems: 'end',
            }}
          >
            {available.includes('assignmentId') && (
              <div>
                <label className="label" htmlFor="report-assignment">Assignment</label>
                <Dropdown
                  value={draft.assignmentId}
                  onChange={(value) => setDraftField('assignmentId', value)}
                  options={withAll(filterOptions.assignments, 'All assignments')}
                  placeholder="All assignments"
                  className="w-full"
                />
              </div>
            )}

            {available.includes('student') && (
              <div>
                <label className="label" htmlFor="report-student">Student</label>
                <Dropdown
                  value={draft.student}
                  onChange={(value) => setDraftField('student', value)}
                  options={withAll(filterOptions.students, 'All students')}
                  placeholder="All students"
                  className="w-full"
                />
              </div>
            )}

            {available.includes('language') && (
              <div>
                <label className="label" htmlFor="report-language">Language</label>
                <Dropdown
                  value={draft.language}
                  onChange={(value) => setDraftField('language', value)}
                  options={withAll(filterOptions.languages, 'All languages')}
                  placeholder="All languages"
                  className="w-full"
                />
              </div>
            )}

            {available.includes('status') && (
              <div>
                <label className="label" htmlFor="report-status">Status</label>
                <Dropdown
                  value={draft.status}
                  onChange={(value) => setDraftField('status', value)}
                  options={withAll(filterOptions.statuses, 'All statuses')}
                  placeholder="All statuses"
                  className="w-full"
                />
              </div>
            )}

            {available.includes('from') && (
              <div>
                <label className="label" htmlFor="report-from">From</label>
                <input
                  id="report-from"
                  type="date"
                  className="input"
                  value={draft.from}
                  max={draft.to || undefined}
                  onChange={(event) => setDraftField('from', event.target.value)}
                />
              </div>
            )}

            {available.includes('to') && (
              <div>
                <label className="label" htmlFor="report-to">To</label>
                <input
                  id="report-to"
                  type="date"
                  className="input"
                  value={draft.to}
                  min={draft.from || undefined}
                  onChange={(event) => setDraftField('to', event.target.value)}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={resetFilters}>
              <RotateCcw size={14} />
              Reset filters
            </button>

            <button type="button" className="btn btn-primary" onClick={applyFilters}>
              Apply filters
            </button>
          </div>
        </div>
      </Card>

      <div className="grid-kpi" style={{ marginTop: 14 }}>
        {(report.summary || []).map((card) => {
          const meta = KPI_META[card.key] || { icon: Activity, trend: '' };
          const Icon = meta.icon;
          return (
            <KPICard
              key={card.key}
              icon={Icon}
              label={card.label}
              value={
                card.format === 'percent'
                  ? (card.value === null || card.value === undefined ? '—' : `${card.value}%`)
                  : card.value
              }
              trend={meta.trend}
              color={TONE_COLORS[card.tone] || 'var(--primary)'}
            />
          );
        })}
      </div>

      {(report.charts || []).length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 14,
            marginTop: 14,
          }}
        >
          {report.charts.map((chart) => (
            <Card key={chart.id} title={chart.title}>
              <div style={{ padding: '12px 12px 8px' }}>
                <ReportChart chart={chart} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Card
          title={REPORT_TYPE_LABELS[report.reportType] || 'Report'}
          kicker={
            loading
              ? 'Refreshing…'
              : `Generated ${formatDateTime(report.generatedAt)}${
                pagination ? ` · ${pagination.total} record${pagination.total === 1 ? '' : 's'}` : ''
              }`
          }
        >
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '16px 20px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search this report..."
              className="flex-1"
            />
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              <Inbox size={28} />
              <p>
                {debouncedSearch || activeFilterCount
                  ? 'No records match the current search or filters.'
                  : 'No records available for this report yet.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} style={{ textAlign: column.align }}>
                        <button
                          type="button"
                          onClick={() => changeSort(column.key)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'none',
                            border: 0,
                            padding: 0,
                            color: 'inherit',
                            font: 'inherit',
                            textTransform: 'inherit',
                            letterSpacing: 'inherit',
                          }}
                        >
                          {column.label}
                          <ArrowUpDown
                            size={11}
                            style={{ opacity: sort === column.key ? 1 : 0.3 }}
                          />
                        </button>
                      </th>
                    ))}
                    {hasRowLinks && <th style={{ textAlign: 'right' }}>Open</th>}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.submissionId || `${row.assignmentId || row.usn || 'row'}-${index}`}>
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          style={{
                            textAlign: column.align,
                            color: column.align === 'left' && column.key === columns[0].key
                              ? 'var(--text)'
                              : 'var(--muted)',
                            fontWeight: column.key === columns[0].key ? 600 : 400,
                            fontFamily: column.format === 'number' || column.format === 'percent'
                              ? 'var(--app-font-mono)'
                              : 'inherit',
                          }}
                        >
                          {formatReportValue(row[column.key], column)}
                        </td>
                      ))}
                      {hasRowLinks && (
                        <td style={{ textAlign: 'right' }}>
                          {row.submissionId ? (
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label="Open submission"
                              title="Open submission"
                              onClick={() => navigate(`/submissions/${row.submissionId}`)}
                            >
                              <ChevronRight size={15} />
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Previous page"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft size={16} />
                </button>

                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Next page"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
