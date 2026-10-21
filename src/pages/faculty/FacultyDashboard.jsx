import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Activity,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Download,
  Plus,
  Target,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';
import AnalyticsChart from '../../components/faculty/AnalyticsChart.jsx';
import ActivityTimeline from '../../components/faculty/ActivityTimeline.jsx';

import { useAuth } from '../../context/AuthContext.jsx';

import { dashboardService } from '../../services/dashboardService.js';

export default function FacultyDashboard() {
  const { user, token } = useAuth();
  const firstName = user?.firstName || user?.name?.trim().split(/\s+/)[0] || 'there';

  const [dashboardData, setDashboardData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] =
    useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    dashboardService.getOverview(token)
      .then((data) => {
        if (!cancelled) setDashboardData(data);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Unable to load the faculty dashboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  if (loading) {
    return (
      <Page title={`Good morning, ${firstName}.`} subtitle="Loading your teaching workspace...">
        <Card title="Dashboard"><div style={{ padding: 20 }}>Loading course activity...</div></Card>
      </Page>
    );
  }

  if (loadError || !dashboardData) {
    return (
      <Page title={`Good morning, ${firstName}.`} subtitle="Your teaching workspace is ready.">
        <div role="alert" className="panel" style={{ padding: 20 }}>
          {loadError || 'Dashboard data is unavailable.'}
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={dateLabel}
      title={`Good morning, ${firstName}.`}
      subtitle="Your teaching workspace is ready. Here’s the pulse across your courses."
      actions={
        <>
          <Link
            to="/live-lab"
            className="btn btn-ghost"
          >
            <Activity size={15} />
            Open live lab
          </Link>

          <Link
            to="/assignments/create"
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
          label="Average published score"
          value={dashboardData.metrics.averagePassRate.value}
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
              to="/analytics"
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
            {dashboardData.languageUsage.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                No submissions are available for language statistics.
              </div>
            ) : dashboardData.languageUsage.map(
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
          kicker="Real-time feed"
          action={
            <Link
              to="/live-lab"
              className="btn btn-ghost"
            >
              See all
              <ArrowRight size={13} />
            </Link>
          }
        >
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }}>
            Live lab activity is not connected yet. No simulated live sessions are shown.
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
              to={
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
              to={
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
          kicker="Recent submissions"
          action={
            <Link to="/submissions" className="btn btn-ghost">View submissions</Link>
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