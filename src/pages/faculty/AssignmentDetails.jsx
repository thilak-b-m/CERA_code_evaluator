import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  MoreHorizontal,
  Send,
  Target,
  Timer,
  Users,
  TestTube2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAssignmentById } from '../../services/assignmentService.js';
import { submissionService } from '../../services/submissionService.js';
import { studentService } from '../../services/studentService.js';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';

function Kpi({
  icon: Icon,
  label,
  value,
  trend,
  color,
}) {
  return (
    <div className="kpi">
      <div
        className="kpi-icon"
        style={{ color }}
      >
        <Icon size={17} />
      </div>

      <div>
        <div className="kpi-label">
          {label}
        </div>

        <div className="kpi-value">
          {value}
        </div>

        <div className="kpi-trend">
          {trend}
        </div>
      </div>
    </div>
  );
}

function Status({
  tone = 'neutral',
  children,
}) {
  return (
    <span
      className={`status-badge ${tone}`}
    >
      {children}
    </span>
  );
}

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useApp();
  const { token } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [departmentStudents, setDepartmentStudents] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setAssignment(null);
    setLoadError('');
    Promise.all([
      getAssignmentById(id, token),
      submissionService.listForFaculty(token, id),
      studentService.list(token),
    ]).then(([result, submissions, students]) => {
      if (cancelled) return;
      setAssignment(result);
      setAssignmentSubmissions(submissions);
      setDepartmentStudents(students);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'Unable to load assignment details.');
    });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (!assignment) {
    return (
      <Page
        title={loadError ? 'Assignment not found' : 'Loading assignment'}
        subtitle={loadError || 'Loading assignment details...'}
      >
        <div
          className="panel"
          style={{
            padding: 30,
            color: 'var(--muted)',
          }}
        >
          {loadError || 'Please wait while assignment details load.'}
        </div>
      </Page>
    );
  }

  const publishedSubmissions = assignmentSubmissions.filter(
    (submission) => submission.evaluation?.status === 'published',
  );
  const awaitingReviewCount = assignmentSubmissions.filter(
    (submission) => submission.evaluation?.status !== 'published',
  ).length;
  const averagePublishedScore = publishedSubmissions.length
    ? publishedSubmissions.reduce(
      (total, submission) => total + (Number(submission.score) / Number(submission.maxScore)) * 100,
      0,
    ) / publishedSubmissions.length
    : null;
  const statusCounts = [
    { label: 'Published', count: publishedSubmissions.length, tone: 'success' },
    {
      label: 'Draft saved',
      count: assignmentSubmissions.filter((submission) => submission.evaluation?.status === 'draft').length,
      tone: 'warning',
    },
    { label: 'Needs review', count: awaitingReviewCount - assignmentSubmissions.filter((submission) => submission.evaluation?.status === 'draft').length, tone: 'primary' },
  ];

  const handleActions = () => {
    notify('Opening assignment editor');

    navigate(
      `/assignments/${assignment.id}/edit`
      );
  };

  return (
    <Page
      eyebrow="ASSIGNMENTS"
      title={assignment.title}
      subtitle={`${assignment.course} · due ${formatDate(assignment.due)}`}
      actions={
        <>
          <Link
            to={`/test-cases/${encodeURIComponent(assignment.id)}`}
            className="btn btn-ghost"
          >
            <TestTube2 size={15} />
            Manage test cases
          </Link>

          <button
            className="btn btn-ghost"
            onClick={handleActions}
          >
            <MoreHorizontal size={15} />
            Actions
          </button>

          <Link
            to="/submissions"
            className="btn btn-primary"
          >
            View submissions
            <ArrowRight size={14} />
          </Link>
        </>
      }
    >
      {/* KPI SECTION */}

      <div className="grid-kpi">
        <Kpi
          icon={Users}
          label="Students assigned"
          value={departmentStudents.length}
          trend="Students in your department"
          color="var(--accent)"
        />

        <Kpi
          icon={Send}
          label="Submissions"
          value={assignmentSubmissions.length}
          trend="Submissions received"
          color="var(--primary)"
        />

        <Kpi
          icon={Target}
          label="Average published score"
          value={averagePublishedScore === null ? '—' : `${averagePublishedScore.toFixed(1)}%`}
          trend={`${publishedSubmissions.length} published evaluation${publishedSubmissions.length === 1 ? '' : 's'}`}
          color="var(--success)"
        />

        <Kpi
          icon={Timer}
          label="Awaiting review"
          value={awaitingReviewCount}
          trend="Submitted code not yet published"
          color="var(--warning)"
        />
      </div>

      {/* MAIN CONTENT */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.2fr) minmax(290px,.8fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        {/* OVERVIEW */}

        <Card
          title="Assignment overview"
          kicker="What students are solving"
        >
          <div
            style={{
              padding: 20,
              color: 'var(--muted)',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <p
              style={{
                marginTop: 0,
              }}
            >
              {assignment.description ||
                'No problem statement has been added yet.'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 18,
              }}
            >
              {assignment.languages?.map(
                (language) => (
                  <Status
                    key={language}
                    tone="live"
                  >
                    {language}
                  </Status>
                )
              )}

              {assignment.timeLimit && (
                <Status tone="neutral">
                  Time limit: {assignment.timeLimit}
                </Status>
              )}

              {assignment.points && (
                <Status tone="neutral">
                  {assignment.points} points
                </Status>
              )}
            </div>
          </div>
        </Card>

        {/* QUALITY */}

        <Card
          title="Quality signals"
          kicker="Assignment health"
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 14,
            }}
          >
            {statusCounts.map(({ label, count, tone }) => (
                  <div key={label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        {label}
                      </span>

                      <span style={{ color: `var(--${tone})` }}>{count}</span>
                    </div>

                    <div className="progress">
                      <span
                        style={{
                          width: assignmentSubmissions.length
                            ? `${Math.round((count / assignmentSubmissions.length) * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
            ))}
            {!assignmentSubmissions.length && (
              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                No submissions have been received for this assignment yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* SUBMISSIONS */}

      <div
        style={{
          marginTop: 14,
        }}
      >
        <Card
          title="Latest submissions"
          kicker="Most recently received work"
          action={
            <Link
              to="/submissions"
              className="btn btn-ghost"
            >
              Open all
            </Link>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Received</th>

                  <th>
                    Student
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Result
                  </th>

                  <th>
                    Language
                  </th>
                </tr>
              </thead>

              <tbody>
                {assignmentSubmissions.length > 0 ? (
                  assignmentSubmissions.map(
                  (submission) => (
                    <tr key={submission.id}>
                      <td>{formatDateTime(submission.submitted)}</td>

                      <td>
                        <Link to={`/submissions/${submission.id}`}>{submission.student}</Link>
                        </td>

                        <td>
                          {submission.score != null
                            ? `${submission.score}/${submission.maxScore ?? '—'}`
                            : '—'}
                        </td>

                        <td>
                          <Status
                            tone={
                              submission.result ===
                              'published'
                                ? 'success'
                                : submission.result ===
                                  'draft'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {submission.result === 'published' ? 'Published' : submission.result === 'draft' ? 'Draft saved' : 'Needs review'}
                          </Status>
                        </td>

                        <td>
                          {submission.lang}
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: 'center',
                        padding: 28,
                        color:
                          'var(--muted)',
                      }}
                    >
                      No submissions received yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Page>
  );
}