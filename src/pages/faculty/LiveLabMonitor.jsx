import { Activity, AlertTriangle, Clock, Eye, Filter, Radio, ShieldCheck } from 'lucide-react';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Modal from '../../components/common/Modal.jsx';
import Dropdown from '../../components/common/Dropdown.jsx';
import { useLiveLabSessions } from '../../hooks/useLiveLabSessions.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { liveLabService } from '../../services/liveLabService.js';
import { useMemo, useState } from 'react';

export default function LiveLabMonitor() {
  const { token } = useAuth();
  const {
    sessions,
    loading,
    error,
    lastUpdated,
    connected,
    secureAssessments,
    secureError,
  } = useLiveLabSessions(token);
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [activityError, setActivityError] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);
  const assignments = [...new Set(secureAssessments.map((attempt) => attempt.assignment))];
  const filteredAttempts = secureAssessments.filter((attempt) => (
    (assignmentFilter === 'all' || attempt.assignment === assignmentFilter)
    && (statusFilter === 'all' || attempt.status === statusFilter)
    && (reviewFilter === 'all' || (reviewFilter === 'review' ? attempt.reviewRequired : !attempt.reviewRequired))
  ));

  const assignmentOptions = useMemo(() => [
    { value: 'all', label: 'All assignments' },
    ...assignments.map((assignment) => ({ value: assignment, label: assignment })),
  ], [assignments]);

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'expired', label: 'Expired' },
    { value: 'ended', label: 'Ended' },
  ];

  const reviewOptions = [
    { value: 'all', label: 'All attempts' },
    { value: 'review', label: 'Review required' },
    { value: 'not-required', label: 'No review flag' },
  ];

  const hasFilters = assignmentFilter !== 'all' || statusFilter !== 'all' || reviewFilter !== 'all';

  const clearFilters = () => {
    setAssignmentFilter('all');
    setStatusFilter('all');
    setReviewFilter('all');
  };

  const openActivity = async (attempt) => {
    setActivityLoading(true);
    setActivityError('');
    setSelectedAttempt(null);
    try {
      setSelectedAttempt(await liveLabService.getSecureAssessmentActivity(attempt.id, token));
    } catch (loadError) {
      setActivityError(loadError.message || 'Unable to load Secure Lab activity.');
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <Page
      title="Live lab monitor"
      subtitle="Current student coding sessions, refreshed every five seconds."
      actions={(
        <span className={`status status-${connected ? 'success' : error ? 'error' : 'neutral'}`}>
          <span className="status-dot" />
          {connected ? 'Connected' : error ? 'Connection issue' : 'Connecting'}
        </span>
      )}
    >
      <Card title="Active coding sessions" kicker={lastUpdated ? `Updated ${formatDateTime(lastUpdated)}` : 'Live presence'}>
        {error && (
          <p className="p-4 text-sm text-cera-error" role="alert">
            Unable to refresh session activity: {error}
          </p>
        )}
        {loading ? (
          <p className="p-5 text-sm text-cera-muted" role="status">Loading active sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="empty p-10">
            <Radio size={26} />
            <p>No students are currently active in the lab.</p>
            <p className="text-xs text-cera-muted">Sessions end when students leave the coding workspace or after 45 seconds without a heartbeat.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Language</th>
                  <th>Activity</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <tr key={`${session.student}-${session.assignment}-${session.startedAt}-${index}`}>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <Activity size={14} className="text-cera-success" />
                        {session.student}
                      </span>
                    </td>
                    <td>{session.assignment}</td>
                    <td>{session.language}</td>
                    <td>{session.status === 'running' ? 'Running code' : 'Editing'}</td>
                    <td>{formatDateTime(session.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
      <Card
        title="Secure assessments"
        kicker="Past live lab attempts and reviewable browser activity"
        action={lastUpdated ? <span className="text-xs text-cera-muted">Updated {formatDateTime(lastUpdated)}</span> : null}
      >
        {secureError && (
          <p className="p-4 text-sm text-cera-error" role="alert">
            Unable to refresh Secure Lab activity: {secureError}
          </p>
        )}
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Dropdown
              value={assignmentFilter}
              onChange={setAssignmentFilter}
              options={assignmentOptions}
              icon={Filter}
              className="sm:flex-1"
            />
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              icon={Activity}
              className="flex-1 sm:w-48 sm:flex-none"
            />
            <Dropdown
              value={reviewFilter}
              onChange={setReviewFilter}
              options={reviewOptions}
              icon={ShieldCheck}
              className="flex-1 sm:w-52 sm:flex-none"
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-cera-muted">
            <span className="flex items-center gap-2">
              <Filter size={14} />
              {filteredAttempts.length} attempt{filteredAttempts.length !== 1 ? 's' : ''}
              {hasFilters ? ' matching your filters' : ''}
            </span>
            {hasFilters && (
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
        {filteredAttempts.length === 0 ? (
          <div className="empty">
            <ShieldCheckIcon />
            <p>No active Secure Lab assessments match these filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assignment</th>
                  <th>Status</th>
                  <th>Time remaining</th>
                  <th>Violations</th>
                  <th>Review</th>
                  <th>Last activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((attempt) => {
                  const remainingMs = Math.max(0, new Date(attempt.deadlineAt).getTime() - Date.now());
                  return (
                    <tr key={attempt.id}>
                      <td>
                        {attempt.student}
                        {attempt.studentIdentifier && <div className="text-xs text-cera-muted">{attempt.studentIdentifier}</div>}
                      </td>
                      <td>{attempt.assignment}</td>
                      <td>{attempt.status}</td>
                      <td>{attempt.status === 'active'
                        ? <span className="inline-flex items-center gap-1"><Clock size={13} /> {Math.floor(remainingMs / 60000)}m {Math.floor((remainingMs % 60000) / 1000)}s</span>
                        : '—'}</td>
                      <td>
                        {attempt.violationCount}
                        {attempt.fullscreenExitCount > 0 && (
                          <div className="text-xs text-cera-muted">
                            {attempt.fullscreenExitCount} fullscreen exit{attempt.fullscreenExitCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {attempt.reviewRequired && (
                            <span className="inline-flex items-center gap-1 text-cera-warning"><AlertTriangle size={13} /> Required</span>
                          )}
                          {attempt.autoSubmitRequired && (
                            <span className="inline-flex items-center gap-1 text-cera-highlight"><Clock size={13} /> Auto-submit</span>
                          )}
                          {!attempt.reviewRequired && !attempt.autoSubmitRequired && '—'}
                        </div>
                      </td>
                      <td>{formatDateTime(attempt.lastActivityAt)}</td>
                      <td>
                        <button className="btn btn-ghost" type="button" onClick={() => openActivity(attempt)}>
                          <Eye size={14} /> Activity
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
      <Modal
        isOpen={Boolean(selectedAttempt) || activityLoading || Boolean(activityError)}
        onClose={() => {
          setSelectedAttempt(null);
          setActivityError('');
        }}
        title={selectedAttempt ? `${selectedAttempt.student} · activity history` : 'Secure Lab activity'}
        size="lg"
      >
        {activityLoading ? (
          <p role="status" className="text-sm text-cera-muted">Loading activity history...</p>
        ) : activityError ? (
          <p role="alert" className="text-sm text-cera-error">{activityError}</p>
        ) : selectedAttempt && (
          <div className="space-y-4">
            <p className="text-sm text-cera-muted">
              {selectedAttempt.assignment} · Started {formatDateTime(selectedAttempt.startedAt)}
            </p>
            <ol className="space-y-3">
              {selectedAttempt.events.map((event, index) => (
                <li key={`${event.receivedAt}-${event.type}-${index}`} className="border-l border-cera-border pl-4">
                  <p className="text-sm font-medium text-cera-text">{eventLabel(event.type)}</p>
                  <p className="mt-1 text-xs text-cera-muted">{formatDateTime(event.receivedAt)} · server received</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>
    </Page>
  );
}

function eventLabel(type) {
  return ({
    ASSESSMENT_STARTED: 'Assessment started',
    TAB_HIDDEN: 'Assessment page became hidden',
    TAB_VISIBLE: 'Student returned to the assessment page',
    FULLSCREEN_EXIT: 'Fullscreen exited',
    FULLSCREEN_RESTORED: 'Fullscreen restored',
    PAGE_EXIT: 'Student left the assessment page',
    ASSESSMENT_SUBMITTED: 'Assessment submitted',
    ASSESSMENT_AUTO_SUBMITTED: 'Assessment auto-submitted (fullscreen exit limit reached)',
    ASSESSMENT_ENDED: 'Assessment ended',
    ASSESSMENT_EXPIRED: 'Assessment deadline reached',
  })[type] || type;
}

function ShieldCheckIcon() {
  return <ShieldCheck size={26} />;
}
