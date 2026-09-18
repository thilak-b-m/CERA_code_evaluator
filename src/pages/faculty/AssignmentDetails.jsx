import { useParams, useLocation } from 'wouter';
import {
  ArrowRight,
  MoreHorizontal,
  Send,
  Target,
  Timer,
  Users,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getAssignmentById } from '../../services/assignmentService.js';
import { getSubmissions } from '../../services/submissionService.js';
import { assignmentDetailsData } from '../../data/facultyMockData.js';

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
  const [, navigate] = useLocation();
  const { notify } = useApp();

  const assignment = getAssignmentById(id);
  const details = assignmentDetailsData[id] || null;

  if (!assignment) {
    return (
      <Page
        title="Assignment not found"
        subtitle="The requested assignment could not be found."
      >
        <div
          className="panel"
          style={{
            padding: 30,
            color: 'var(--muted)',
          }}
        >
          This assignment does not exist.
        </div>
      </Page>
    );
  }

  const allSubmissions = getSubmissions();

  const assignmentSubmissions =
    allSubmissions.filter(
      (submission) =>
        submission.assignmentId === assignment.id
    );

  const handleActions = () => {
    notify('Opening assignment editor');

    navigate(
      `/assignments/${assignment.id}/edit`
    );
  };

  const hasAnalytics = Boolean(details);

  return (
    <Page
      eyebrow={`ASSIGNMENTS / ${assignment.id}`}
      title={assignment.title}
      subtitle={`${assignment.course} · due ${assignment.due}`}
      actions={
        <>
          <button
            className="btn btn-ghost"
            onClick={handleActions}
          >
            <MoreHorizontal size={15} />
            Actions
          </button>

          <a
            href="/submissions"
            className="btn btn-primary"
          >
            View submissions
            <ArrowRight size={14} />
          </a>
        </>
      }
    >
      {/* KPI SECTION */}

      <div className="grid-kpi">
        <Kpi
          icon={Users}
          label="Students assigned"
          value={assignment.total ?? 0}
          trend={
            details?.participation ||
            'No participation data yet'
          }
          color="var(--accent)"
        />

        <Kpi
          icon={Send}
          label="Submissions"
          value={assignment.submissions ?? 0}
          trend={
            details?.submissionTrend ||
            'No submission trend yet'
          }
          color="var(--primary)"
        />

        <Kpi
          icon={Target}
          label="Pass rate"
          value={details?.passRate || '—'}
          trend={
            details?.passRateTrend ||
            'No pass-rate data yet'
          }
          color="var(--success)"
        />

        <Kpi
          icon={Timer}
          label="Median runtime"
          value={
            details?.medianRuntime ||
            '—'
          }
          trend={
            details?.runtimeTrend ||
            'No runtime data yet'
          }
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
              {details?.languages?.map(
                (language) => (
                  <Status
                    key={language}
                    tone="live"
                  >
                    {language}
                  </Status>
                )
              )}

              {details?.testCases != null && (
                <Status tone="neutral">
                  {details.testCases} test cases
                </Status>
              )}

              {!hasAnalytics && (
                <Status tone="neutral">
                  Test cases not configured
                </Status>
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
            {details?.qualitySignals?.length ? (
              details.qualitySignals.map(
                ({
                  label,
                  value,
                  tone,
                }) => (
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

                      <span
                        style={{
                          color:
                            `var(--${tone})`,
                        }}
                      >
                        {value}
                      </span>
                    </div>

                    <div className="progress">
                      <span
                        style={{
                          width: value,
                        }}
                      />
                    </div>
                  </div>
                )
              )
            ) : (
              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Quality signals will appear once
                students submit work and evaluation
                data becomes available.
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
            <a
              href="/submissions"
              className="btn btn-ghost"
            >
              Open all
            </a>
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    Submission
                  </th>

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
                        <td
                          style={{
                            fontFamily:
                              'var(--app-font-mono)',
                          }}
                        >
                          {submission.id}
                        </td>

                        <td>
                          {submission.student}
                        </td>

                        <td>
                          {submission.score != null
                            ? `${submission.score}/100`
                            : '—'}
                        </td>

                        <td>
                          <Status
                            tone={
                              submission.result ===
                              'Passed'
                                ? 'success'
                                : submission.result ===
                                  'Failed'
                                ? 'error'
                                : 'warning'
                            }
                          >
                            {submission.result}
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