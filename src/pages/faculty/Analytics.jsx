import { useMemo, useState } from 'react';

import {
  Users,
  Target,
  Activity,
  AlertTriangle,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';

import { analyticsService } from '../../services/analyticsService.js';

export default function Analytics() {
  const [selectedTerm, setSelectedTerm] =
    useState('This term');

  const data = useMemo(
    () =>
      analyticsService.get(
        selectedTerm
      ),
    [selectedTerm]
  );

  return (
    <Page
      title="Course analytics"
      subtitle="Patterns that help you teach the next lab better."
      actions={
        <div className="segmented">
          <button
            type="button"
            className={
              selectedTerm === 'This term'
                ? 'active'
                : ''
            }
            onClick={() =>
              setSelectedTerm('This term')
            }
          >
            This term
          </button>

          <button
            type="button"
            className={
              selectedTerm === 'Last term'
                ? 'active'
                : ''
            }
            onClick={() =>
              setSelectedTerm('Last term')
            }
          >
            Last term
          </button>
        </div>
      }
    >
      <div className="grid-kpi">
        <KPICard
          icon={Users}
          label="Enrolled students"
          value={
            data.kpis.enrolledStudents.value
          }
          trend={
            data.kpis.enrolledStudents.trend
          }
          color="var(--accent)"
        />

        <KPICard
          icon={Target}
          label="Average score"
          value={
            data.kpis.averageScore.value
          }
          trend={
            data.kpis.averageScore.trend
          }
          color="var(--success)"
        />

        <KPICard
          icon={Activity}
          label="Engagement rate"
          value={
            data.kpis.engagementRate.value
          }
          trend={
            data.kpis.engagementRate.trend
          }
          color="var(--primary)"
        />

        <KPICard
          icon={AlertTriangle}
          label="At-risk students"
          value={
            data.kpis.atRiskStudents.value
          }
          trend={
            data.kpis.atRiskStudents.trend
          }
          color="var(--warning)"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.4fr) minmax(280px,.6fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        <Card
          title="Submission volume"
          kicker="By week · all assignments"
        >
          <div
            style={{
              padding: '7px 20px 20px',
            }}
          >
            <div className="bar-row">
              {data.submissionVolume.map(
                (value, index) => (
                  <div
                    className="bar"
                    key={`${selectedTerm}-${index}`}
                    style={{
                      height: `${value}%`,
                      opacity:
                        index > 8
                          ? 1
                          : 0.72,
                    }}
                  />
                )
              )}
            </div>

            <div
              className="chart-labels"
              style={{
                position: 'relative',
                marginTop: 11,
              }}
            >
              <span>Week 1</span>
              <span>Week 4</span>
              <span>Week 8</span>
              <span>Week 12</span>
            </div>
          </div>
        </Card>

        <Card
          title="Marks distribution"
          kicker="Current cohort"
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 13,
            }}
          >
            {data.marksDistribution.map(
              ([label, value, tone]) => (
                <div key={label}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: 11,
                      marginBottom: 6,
                    }}
                  >
                    <span>
                      {label}
                    </span>

                    <span
                      style={{
                        fontFamily:
                          'var(--app-font-mono)',
                      }}
                    >
                      {value}%
                    </span>
                  </div>

                  <div className="progress">
                    <span
                      style={{
                        width: `${value * 2}%`,
                        background: tone,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}