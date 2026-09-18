import { useEffect, useState } from 'react';
import { Link } from 'wouter';

import {
  Activity,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Download,
  Plus,
  ShieldCheck,
  Target,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';
import AnalyticsChart from '../../components/faculty/AnalyticsChart.jsx';
import ActivityTimeline from '../../components/faculty/ActivityTimeline.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';

import { useApp } from '../../context/AppContext.jsx';

import { dashboardService } from '../../services/dashboardService.js';

export default function FacultyDashboard() {
  const { notify, profile } = useApp();

  const dashboardData =
    dashboardService.getOverview();

  const [currentDate, setCurrentDate] =
    useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const dateLabel = `${currentDate
    .toLocaleDateString('en-US', {
      weekday: 'long',
    })
    .toUpperCase()} · ${currentDate
    .toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    .toUpperCase()}`;

  return (
    <Page
      eyebrow={dateLabel}
      title={`Good morning, ${profile.firstName}.`}
      subtitle="Your teaching workspace is ready. Here’s the pulse across your courses."
      actions={
        <>
          <Link
            href="/live-lab"
            className="btn btn-ghost"
          >
            <Activity size={15} />
            Open live lab
          </Link>

          <Link
            href="/assignments/create"
            className="btn btn-primary"
          >
            <Plus size={15} />
            New assignment
          </Link>
        </>
      }
    >
      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="grid-kpi">
        <KPICard
          icon={Activity}
          label="Active labs"
          value={
            dashboardData.metrics.activeLabs.value
          }
          trend={
            dashboardData.metrics.activeLabs.trend
          }
          color="var(--accent)"
        />

        <KPICard
          icon={ClipboardCheck}
          label="Pending evaluations"
          value={
            dashboardData.metrics
              .pendingEvaluations.value
          }
          trend={
            dashboardData.metrics
              .pendingEvaluations.trend
          }
          color="var(--primary)"
        />

        <KPICard
          icon={Target}
          label="Average pass rate"
          value={`${dashboardData.metrics.averagePassRate.value}%`}
          trend={
            dashboardData.metrics.averagePassRate.trend
          }
          color="var(--secondary)"
        />

        <KPICard
          icon={BookOpen}
          label="Active assignments"
          value={
            dashboardData.metrics
              .activeAssignments.value
          }
          trend={
            dashboardData.metrics
              .activeAssignments.trend
          }
          color="var(--warning)"
        />
      </div>

      {/* =========================
          SUBMISSIONS + LANGUAGE USAGE
      ========================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.45fr) minmax(300px,.8fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        <Card
          title="Submissions trend"
          kicker="Last 14 days · all courses"
          action={
            <Link
              href="/analytics"
              className="btn btn-ghost"
            >
              View analytics
              <ArrowRight size={13} />
            </Link>
          }
        >
          <div
            style={{
              padding: '5px 20px 17px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 20,
                alignItems: 'center',
                margin: '10px 0 -8px',
              }}
            >
              <div>
                <span
                  style={{
                    font: '24px var(--app-font-mono)',
                  }}
                >
                  {dashboardData.submissions.total.toLocaleString()}
                </span>

                <span
                  style={{
                    color: 'var(--success)',
                    fontSize: 11,
                    marginLeft: 9,
                  }}
                >
                  {dashboardData.submissions.change}
                </span>
              </div>

              <span
                style={{
                  color: 'var(--muted)',
                  fontSize: 11,
                }}
              >
                {dashboardData.submissions.label}
              </span>
            </div>

            <AnalyticsChart
              points={
                dashboardData.submissionTrend.points
              }
              labels={
                dashboardData.submissionTrend.labels
              }
            />
          </div>
        </Card>

        <Card
          title="Language usage"
          kicker="Across current submissions"
        >
          <div
            style={{
              padding: '21px 20px',
            }}
          >
            {dashboardData.languageUsage.map(
              (language) => (
                <div
                  key={language.name}
                  style={{
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: 12,
                      marginBottom: 7,
                    }}
                  >
                    <span>
                      {language.name}
                    </span>

                    <span
                      style={{
                        color: 'var(--muted)',
                        fontFamily:
                          'var(--app-font-mono)',
                        fontSize: 11,
                      }}
                    >
                      {language.value}%
                    </span>
                  </div>

                  <div className="progress">
                    <span
                      style={{
                        width: `${language.value}%`,
                        background:
                          language.color,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {/* =========================
          LIVE ACTIVITY + QUICK ACTIONS
      ========================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.15fr) minmax(290px,.85fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        <Card
          title="Live right now"
          kicker="Real-time activity across your labs"
          action={
            <Link
              href="/live-lab"
              className="btn btn-ghost"
            >
              See all
              <ArrowRight size={13} />
            </Link>
          }
        >
          <div>
            {dashboardData.liveStudents
              .slice(0, 4)
              .map((student) => (
                <div
                  className="activity-item"
                  key={student.id}
                >
                  <Avatar>
                    {student.initials}
                  </Avatar>

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {student.name}
                      </span>

                      <span
                        style={{
                          color: 'var(--muted)',
                          font:
                            '10px var(--app-font-mono)',
                        }}
                      >
                        {student.time}
                      </span>
                    </div>

                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      {student.task} ·{' '}
                      {student.lang}
                    </div>
                  </div>

                  <StatusBadge
                    tone={
                      student.status ===
                      'Needs help'
                        ? 'warning'
                        : student.status ===
                          'Passed'
                        ? 'success'
                        : 'live'
                    }
                  >
                    {student.status}
                  </StatusBadge>
                </div>
              ))}
          </div>
        </Card>

        <Card
          title="Quick actions"
          kicker="Jump into your workflow"
        >
          <div
            style={{
              padding: 14,
              display: 'grid',
              gap: 8,
            }}
          >
            <Link
              href={
                dashboardData.quickActions
                  .evaluationQueue.href
              }
              className="quick-action"
            >
              <ClipboardCheck
                size={18}
                color="var(--secondary)"
              />

              <div>
                <p>
                  {
                    dashboardData.quickActions
                      .evaluationQueue.label
                  }
                </p>

                <small>
                  {
                    dashboardData.quickActions
                      .evaluationQueue.detail
                  }
                </small>
              </div>

              <ArrowRight
                size={14}
                style={{
                  marginLeft: 'auto',
                  color: 'var(--muted)',
                }}
              />
            </Link>

            <Link
              href={
                dashboardData.quickActions
                  .integrityRisks.href
              }
              className="quick-action"
            >
              <ShieldCheck
                size={18}
                color="var(--accent)"
              />

              <div>
                <p>
                  {
                    dashboardData.quickActions
                      .integrityRisks.label
                  }
                </p>

                <small>
                  {
                    dashboardData.quickActions
                      .integrityRisks.detail
                  }
                </small>
              </div>

              <ArrowRight
                size={14}
                style={{
                  marginLeft: 'auto',
                  color: 'var(--muted)',
                }}
              />
            </Link>

            <Link
              href={
                dashboardData.quickActions
                  .courseReport.href
              }
              className="quick-action"
            >
              <Download
                size={18}
                color="var(--success)"
              />

              <div>
                <p>
                  {
                    dashboardData.quickActions
                      .courseReport.label
                  }
                </p>

                <small>
                  {
                    dashboardData.quickActions
                      .courseReport.detail
                  }
                </small>
              </div>

              <ArrowRight
                size={14}
                style={{
                  marginLeft: 'auto',
                  color: 'var(--muted)',
                }}
              />
            </Link>
          </div>
        </Card>
      </div>

      {/* =========================
          RECENT ACTIVITY
      ========================= */}

      <div
        style={{
          marginTop: 14,
        }}
      >
        <Card
          title="Recent activity"
          kicker="A clear trail of what changed today"
          action={
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                notify(
                  'Activity marked as reviewed'
                )
              }
            >
              Mark reviewed
            </button>
          }
        >
          <ActivityTimeline
            items={
              dashboardData.recentActivity
            }
          />
        </Card>
      </div>
    </Page>
  );
}