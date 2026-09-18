import { useMemo } from 'react';
import { Link } from 'wouter';
import {
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  CheckCircle2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';

import { plagiarismService } from '../../services/plagiarismService.js';

function getStatusTone(status) {
  if (status === 'Investigate') {
    return 'error';
  }

  if (status === 'Review') {
    return 'warning';
  }

  return 'success';
}

export default function Plagiarism() {
  const plagiarismData = useMemo(
    () => plagiarismService.getOverview(),
    []
  );

  const {
    kpis,
    similaritySignals,
  } = plagiarismData;

  return (
    <Page
      title="Plagiarism overview"
      subtitle="Review similarity signals with context, not just a percentage."
      actions={
        <Link
          href="/plagiarism/compare"
          className="btn btn-primary"
        >
          <GitCompare size={14} />
          Compare cases
        </Link>
      }
    >
      <div className="grid-kpi">
        <KPICard
          icon={ShieldCheck}
          label={kpis.submissionsScanned.label}
          value={kpis.submissionsScanned.value}
          trend={kpis.submissionsScanned.trend}
          color="var(--success)"
        />

        <KPICard
          icon={AlertTriangle}
          label={kpis.needsReview.label}
          value={kpis.needsReview.value}
          trend={kpis.needsReview.trend}
          color="var(--warning)"
        />

        <KPICard
          icon={GitCompare}
          label={kpis.highestSimilarity.label}
          value={kpis.highestSimilarity.value}
          trend={kpis.highestSimilarity.trend}
          color="var(--error)"
        />

        <KPICard
          icon={CheckCircle2}
          label={kpis.clearedThisWeek.label}
          value={kpis.clearedThisWeek.value}
          trend={kpis.clearedThisWeek.trend}
          color="var(--accent)"
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <Card
          title="Similarity signals"
          kicker="Ranked by confidence"
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Assignment</th>
                  <th>Similarity</th>
                  <th>Shared region</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {similaritySignals.map((signal) => (
                  <tr key={signal.id}>
                    <td
                      style={{
                        color: 'var(--text)',
                        fontFamily:
                          'var(--app-font-mono)',
                        fontSize: 11,
                      }}
                    >
                      {signal.pair}
                    </td>

                    <td>{signal.assignment}</td>

                    <td
                      style={{
                        color:
                          signal.status === 'Investigate'
                            ? 'var(--error)'
                            : 'var(--warning)',
                        font:
                          '700 13px var(--app-font-mono)',
                      }}
                    >
                      {signal.similarity}
                    </td>

                    <td>{signal.sharedRegion}</td>

                    <td>
                      <StatusBadge
                        tone={getStatusTone(
                          signal.status
                        )}
                      >
                        {signal.status}
                      </StatusBadge>
                    </td>

                    <td>
                      <Link
                        href="/plagiarism/compare"
                        className="btn btn-ghost"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Page>
  );
}