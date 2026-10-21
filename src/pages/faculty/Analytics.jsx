import { useEffect, useState } from 'react';

import {
  Users,
  Target,
  Activity,
  AlertTriangle,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';

import { analyticsService } from '../../services/analyticsService.js';
import { formatDate } from '../../utils/formatDate.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STANDING_TONE = {
  'On track': 'status-success',
  Watch: 'status-warning',
  'At risk': 'status-error',
  'No activity': 'status-neutral',
  'Awaiting review': 'status-neutral',
};

const asPercentage = (value) => (
  value === null || value === undefined ? '—' : `${value}%`
);

export default function Analytics() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('current');
  const [standingFilter, setStandingFilter] = useState('all');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    analyticsService.get(period, token)
      .then((analytics) => {
        if (!cancelled) setData(analytics);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || 'Unable to load analytics.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, token]);

  if (loading) {
    return (
      <Page title="Course analytics" subtitle="Loading your course data...">
        <Card title="Analytics" kicker="Loading">
          <div style={{ padding: 20, color: 'var(--muted)' }}>Loading data...</div>
        </Card>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page title="Course analytics" subtitle="Analytics from your real course data.">
        <div role="alert" className="panel" style={{ padding: 20 }}>
          {error || 'Analytics data is unavailable.'}
        </div>
      </Page>
    );
  }

  const standingRows = standingFilter === 'attention'
    ? data.atRiskStudents
    : data.studentPerformance;

  const coverageStats = [
    { icon: ClipboardCheck, label: 'Submissions', value: data.totals.submissions, tone: 'var(--primary)' },
    { icon: CheckCircle2, label: 'Evaluated', value: data.totals.evaluated, tone: 'var(--success)' },
    { icon: Clock, label: 'Awaiting review', value: data.totals.pending, tone: 'var(--warning)' },
  ];

  return (
    <Page
      title="Course analytics"
      subtitle={`Rolling 12-week view · ${formatDate(data.period.start)} – ${formatDate(data.period.end)}`}
      actions={
        <div className="segmented">
          <button
            type="button"
            className={period === 'current' ? 'active' : ''}
            onClick={() => setPeriod('current')}
          >
            Last 12 weeks
          </button>

          <button
            type="button"
            className={period === 'previous' ? 'active' : ''}
            onClick={() => setPeriod('previous')}
          >
            Previous 12 weeks
          </button>
        </div>
      }
    >
      <div className="grid-kpi">
        <KPICard
          icon={Users}
          label="Enrolled students"
          value={data.kpis.enrolledStudents.value}
          trend={data.kpis.enrolledStudents.trend}
          color="var(--accent)"
        />

        <KPICard
          icon={Target}
          label="Average score"
          value={data.kpis.averageScore.value}
          trend={data.kpis.averageScore.trend}
          color="var(--success)"
        />

        <KPICard
          icon={GraduationCap}
          label="Pass rate"
          value={asPercentage(data.passRate)}
          trend={data.passRate === null ? 'No published evaluations yet' : 'Students scoring 50% or above'}
          color="var(--primary)"
        />

        <KPICard
          icon={AlertTriangle}
          label="At-risk students"
          value={data.kpis.atRiskStudents.value}
          trend={data.kpis.atRiskStudents.trend}
          color="var(--warning)"
          onClick={() => {
            setStandingFilter('attention');
            document.getElementById('student-standings')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(280px,.6fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        <Card
          title="Submission volume"
          kicker="By week · bars scaled to the busiest week"
        >
          <div style={{ padding: '7px 20px 20px' }}>
            <div className="bar-row">
              {data.submissionVolume.map((value, index) => (
                <div
                  className="bar"
                  key={`${period}-${index}`}
                  style={{
                    height: `${value}%`,
                    opacity: index > 8 ? 1 : 0.72,
                  }}
                />
              ))}
            </div>

            <div
              className="chart-labels"
              style={{ position: 'relative', marginTop: 11 }}
            >
              <span>Week 1</span>
              <span>Week 4</span>
              <span>Week 8</span>
              <span>Week 12</span>
            </div>
          </div>
        </Card>

        <Card title="Marks distribution" kicker="Published evaluations">
          <div style={{ padding: 20, display: 'grid', gap: 13 }}>
            {data.marksDistribution.map(([label, value, tone]) => (
              <div key={label}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    marginBottom: 6,
                  }}
                >
                  <span>{label}</span>

                  <span style={{ fontFamily: 'var(--app-font-mono)' }}>
                    {value}%
                  </span>
                </div>

                <div className="progress">
                  <span style={{ width: `${value * 2}%`, background: tone }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card
          title="Review coverage"
          kicker={`${data.totals.submissions} submissions in this period`}
        >
          <div style={{ padding: 20, display: 'grid', gap: 16 }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                <span>{data.reviewCoverage.percentage}% reviewed</span>

                <span style={{ fontFamily: 'var(--app-font-mono)' }}>
                  {data.reviewCoverage.evaluated} / {data.totals.submissions}
                </span>
              </div>

              <div className="progress">
                <span
                  style={{
                    width: `${data.reviewCoverage.percentage}%`,
                    background: 'var(--success)',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              {coverageStats.map(({ icon: Icon, label, value, tone }) => (
                <div
                  key={label}
                  className="panel"
                  style={{
                    padding: 14,
                    display: 'grid',
                    gap: 8,
                    background: 'var(--surface)',
                  }}
                >
                  <Icon size={16} style={{ color: tone }} />
                  <div style={{ fontFamily: 'var(--app-font-mono)', fontSize: 20 }}>
                    {value}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card
          title="Assignment performance"
          kicker="Submissions and outcomes for active assignments"
        >
          {data.assignmentPerformance.length === 0 ? (
            <div className="empty">No active assignments to analyse yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Course</th>
                    <th style={{ textAlign: 'right' }}>Submissions</th>
                    <th>Completion</th>
                    <th style={{ textAlign: 'right' }}>Average</th>
                  </tr>
                </thead>

                <tbody>
                  {data.assignmentPerformance.map((row) => (
                    <tr key={row.assignmentId}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {row.title}
                      </td>

                      <td>{row.course || '—'}</td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)' }}>
                        {row.submissions}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="progress" style={{ width: 72 }}>
                            <span style={{ width: `${Math.min(100, row.completionRate)}%` }} />
                          </div>

                          <span style={{ fontFamily: 'var(--app-font-mono)', fontSize: 11 }}>
                            {row.completionRate}%
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)' }}>
                        {asPercentage(row.averagePercentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div id="student-standings" style={{ marginTop: 14 }}>
        <Card
          title="Student standings"
          kicker="Ranked by average published score"
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px 0',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {standingRows.length} student{standingRows.length === 1 ? '' : 's'}
            </span>

            <div className="segmented">
              <button
                type="button"
                className={standingFilter === 'all' ? 'active' : ''}
                onClick={() => setStandingFilter('all')}
              >
                All students
              </button>

              <button
                type="button"
                className={standingFilter === 'attention' ? 'active' : ''}
                onClick={() => setStandingFilter('attention')}
              >
                Needs attention ({data.atRiskStudents.length})
              </button>
            </div>
          </div>

          {standingRows.length === 0 ? (
            <div className="empty">
              <Activity size={28} />
              <p>
                {standingFilter === 'attention'
                  ? 'No students need attention right now.'
                  : 'No students in your roster yet.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>USN</th>
                    <th style={{ textAlign: 'right' }}>Submissions</th>
                    <th style={{ textAlign: 'right' }}>Evaluated</th>
                    <th style={{ textAlign: 'right' }}>Average</th>
                    <th>Standing</th>
                  </tr>
                </thead>

                <tbody>
                  {standingRows.map((row) => (
                    <tr key={row.usn || row.name}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {row.name}
                      </td>

                      <td style={{ fontFamily: 'var(--app-font-mono)' }}>
                        {row.usn || '—'}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)' }}>
                        {row.submissions}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)' }}>
                        {row.evaluated}
                      </td>

                      <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)' }}>
                        {asPercentage(row.averagePercentage)}
                      </td>

                      <td>
                        <span className={`status ${STANDING_TONE[row.standing] || 'status-neutral'}`}>
                          <span className="status-dot" />
                          {row.standing}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
