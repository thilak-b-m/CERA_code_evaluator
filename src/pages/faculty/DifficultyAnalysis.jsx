import {
  useMemo,
  useState,
} from 'react';

import {
  Gauge,
  Timer,
  AlertTriangle,
  Target,
  Sparkles,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import KPICard from '../../components/faculty/KPICard.jsx';

import {
  difficultyAnalysisService,
} from '../../services/difficultyAnalysisService.js';

import {
  useApp,
} from '../../context/AppContext.jsx';

export default function DifficultyAnalysis() {
  const { notify } = useApp();

  const availableAssignments =
    useMemo(
      () =>
        difficultyAnalysisService
          .listAssignments(),
      []
    );

  const [
    selectedAssignmentId,
    setSelectedAssignmentId,
  ] = useState(
    availableAssignments[0]?.id || ''
  );

  const [
    recommendationApplied,
    setRecommendationApplied,
  ] = useState(() => {
    if (
      !availableAssignments[0]
    ) {
      return false;
    }

    return Boolean(
      difficultyAnalysisService
        .get(
          availableAssignments[0]
            .id
        )?.recommendationApplied
    );
  });

  const selectedData =
    useMemo(
      () =>
        difficultyAnalysisService.get(
          selectedAssignmentId
        ),
      [selectedAssignmentId]
    );

  const selectedAssignment =
    selectedData?.assignment || null;

  const data =
    selectedData?.analysis || null;

  const handleAssignmentChange = (
    event
  ) => {
    const value =
      event.target.value;

    setSelectedAssignmentId(
      value
    );

    const result =
      difficultyAnalysisService.get(
        value
      );

    setRecommendationApplied(
      Boolean(
        result?.recommendationApplied
      )
    );

    if (result?.assignment) {
      notify(
        `Showing analysis for ${result.assignment.title}`
      );
    }
  };

  const handleApplySuggestion = () => {
    if (!selectedAssignment) {
      return;
    }

    const result =
      difficultyAnalysisService
        .applyRecommendation(
          selectedAssignment.id
        );

    if (!result) {
      notify(
        'Unable to apply suggestion'
      );

      return;
    }

    setRecommendationApplied(true);

    notify(
      `Suggestion applied to ${selectedAssignment.title}`
    );
  };

  if (!data || !selectedAssignment) {
    return (
      <Page
        title="Difficulty analysis"
        subtitle="Find the friction in your assignments before it becomes student frustration."
      >
        <Card
          title="No analysis available"
          kicker="Assignment difficulty insights"
        >
          <div
            style={{
              padding: 30,
              color: 'var(--muted)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            No difficulty analysis is
            available for the current
            assignments.
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Difficulty analysis"
      subtitle="Find the friction in your assignments before it becomes student frustration."
      actions={
        <select
          className="select"
          style={{
            width: 220,
          }}
          value={
            selectedAssignmentId
          }
          onChange={
            handleAssignmentChange
          }
          aria-label="Select assignment"
        >
          {availableAssignments.map(
            (assignment) => (
              <option
                key={assignment.id}
                value={assignment.id}
              >
                {assignment.title}
              </option>
            )
          )}
        </select>
      }
    >
      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="grid-kpi">
        <KPICard
          icon={Gauge}
          label="Difficulty score"
          value={data.difficulty}
          trend={data.difficultyTrend}
          color="var(--warning)"
        />

        <KPICard
          icon={Timer}
          label="Median completion"
          value={data.completion}
          trend={data.completionTrend}
          color="var(--accent)"
        />

        <KPICard
          icon={AlertTriangle}
          label="Help requests"
          value={data.help}
          trend={data.helpTrend}
          color="var(--error)"
        />

        <KPICard
          icon={Target}
          label="Pass on first run"
          value={data.pass}
          trend={data.passTrend}
          color="var(--secondary)"
        />
      </div>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.2fr) minmax(280px,.8fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        {/* =========================
            WHERE STUDENTS GET STUCK
        ========================= */}

        <Card
          title="Where students get stuck"
          kicker={`Observed from ${data.executionTraces} execution traces`}
        >
          <div
            style={{
              padding: 20,
            }}
          >
            {data.stuck.map(
              ([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    marginBottom: 19,
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
                      {label}
                    </span>

                    <span
                      style={{
                        color:
                          'var(--muted)',
                        font:
                          '11px var(--app-font-mono)',
                      }}
                    >
                      {value}%
                    </span>
                  </div>

                  <div className="progress">
                    <span
                      style={{
                        width: `${value}%`,
                        background:
                          color,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>

        {/* =========================
            RECOMMENDATION
        ========================= */}

        <Card
          title="Recommendation"
          kicker="A small change, high leverage"
        >
          <div
            style={{
              padding: 20,
            }}
          >
            <div
              className="kpi-icon"
              style={{
                color:
                  'var(--accent)',
                marginBottom: 14,
              }}
            >
              <Sparkles size={16} />
            </div>

            <h3
              style={{
                fontSize: 14,
                margin: '0 0 9px',
              }}
            >
              {data.recommendationTitle}
            </h3>

            <p
              style={{
                color:
                  'var(--muted)',
                fontSize: 12,
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {data.recommendation}
            </p>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                marginTop: 17,
              }}
              onClick={
                handleApplySuggestion
              }
              disabled={
                recommendationApplied
              }
            >
              <Sparkles size={14} />

              {recommendationApplied
                ? 'Suggestion applied'
                : 'Apply suggestion'}
            </button>

            {recommendationApplied && (
              <div
                style={{
                  marginTop: 9,
                  color:
                    'var(--success)',
                  fontSize: 11,
                }}
              >
                This recommendation
                has been applied for
                this assignment.
              </div>
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}