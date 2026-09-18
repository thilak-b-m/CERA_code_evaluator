import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import {
  Check,
  Sparkles,
  Send,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getSubmissionById } from '../../services/submissionService.js';
import {
  getEvaluation,
  saveDraft,
  publishEvaluation,
} from '../../services/evaluationService.js';

function Section({
  title,
  kicker,
  action,
  children,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            {title}
          </div>

          {kicker && (
            <div className="panel-kicker">
              {kicker}
            </div>
          )}
        </div>

        {action && <div>{action}</div>}
      </div>

      {children}
    </section>
  );
}

export default function Evaluation() {
  const { id } = useParams();
  const { notify } = useApp();

  const s = getSubmissionById(id);

  const savedEvaluation = s
    ? getEvaluation(s.id)
    : null;

  const [score, setScore] = useState(
    savedEvaluation?.score ?? ''
  );

  const [feedback, setFeedback] =
    useState(
      savedEvaluation?.feedback ?? ''
    );

  const [
    shareInsights,
    setShareInsights,
  ] = useState(
    savedEvaluation?.shareInsights ?? true
  );

  const [
    evaluationStatus,
    setEvaluationStatus,
  ] = useState(
    savedEvaluation?.status ?? null
  );

  useEffect(() => {
    if (!s) {
      return;
    }

    const saved =
      getEvaluation(s.id);

    setScore(
      saved?.score ?? ''
    );

    setFeedback(
      saved?.feedback ?? ''
    );

    setShareInsights(
      saved?.shareInsights ?? true
    );

    setEvaluationStatus(
      saved?.status ?? null
    );
  }, [s?.id]);

  if (!s) {
    return (
      <Page
        title="Evaluate submission"
        subtitle="The requested submission could not be found."
      >
        <div
          className="panel"
          style={{
            padding: 30,
            color: 'var(--muted)',
          }}
        >
          Submission not found.
        </div>
      </Page>
    );
  }

  const hasEvidence =
    s.hasSubmittedCode;

  const handleSaveDraft = () => {
    if (!hasEvidence) {
      notify(
        'Evaluation is unavailable because submitted code is missing'
      );
      return;
    }

    const saved = saveDraft(s.id, {
      score:
        score === ''
          ? ''
          : Number(score),
      feedback,
      shareInsights,
    });

    setEvaluationStatus(
      saved.status
    );

    notify(
      `Evaluation draft saved for ${s.student}`
    );
  };

  const handlePublish = () => {
    if (!hasEvidence) {
      notify(
        'Evaluation cannot be published because submitted code is missing'
      );
      return;
    }

    if (
      score === '' ||
      Number(score) < 0 ||
      Number(score) > 100
    ) {
      notify(
        'Score must be between 0 and 100'
      );
      return;
    }

    if (!feedback.trim()) {
      notify(
        'Please enter feedback before publishing'
      );
      return;
    }

    const published =
      publishEvaluation(s.id, {
        score: Number(score),
        feedback: feedback.trim(),
        shareInsights,
      });

    setEvaluationStatus(
      published.status
    );

    notify(
      `Evaluation published for ${s.student}`
    );
  };

  return (
    <Page
      eyebrow={`EVALUATION / ${s.id}`}
      title="Evaluate submission"
      subtitle={`${s.student} · ${s.assignment}`}
      actions={
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleSaveDraft}
          disabled={!hasEvidence}
          style={{
            opacity:
              hasEvidence ? 1 : 0.55,
            cursor:
              hasEvidence
                ? 'pointer'
                : 'not-allowed',
          }}
        >
          <Check size={14} />
          Save draft
        </button>
      }
    >
      <div
        className="panel"
        style={{
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="eyebrow">
            SUBMISSION
          </div>

          <div
            style={{
              font:
                '18px var(--app-font-mono)',
              marginTop: 6,
              fontWeight: 700,
            }}
          >
            {s.id}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            STUDENT
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {s.student}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            LANGUAGE
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
            }}
          >
            {s.lang || 'Python'}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            AI PRE-SCORE
          </div>

          <div
            style={{
              marginTop: 6,
              font:
                '16px var(--app-font-mono)',
            }}
          >
            {s.aiScore ?? '—'}
            {s.aiScore !== null &&
              s.aiScore !== undefined &&
              '/100'}
          </div>
        </div>

        {evaluationStatus && (
          <div>
            <div className="eyebrow">
              STATUS
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
              }}
            >
              {evaluationStatus}
            </div>
          </div>
        )}
      </div>

      {!hasEvidence && (
        <div
          className="panel"
          style={{
            padding: 16,
            marginBottom: 14,
            border:
              '1px solid var(--warning)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            Evaluation evidence unavailable
          </div>

          <div
            style={{
              color: 'var(--muted)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Submitted code and automated
            evidence are not available for
            this submission. Evaluation
            score and feedback become
            available after the student
            submits code.
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.15fr) minmax(280px,.85fr)',
          gap: 14,
        }}
      >
        <Section
          title="Review context"
          kicker="Automated evidence and submitted work"
        >
          <div
            style={{
              padding: 20,
            }}
          >
          <pre className="code">
            {s.evidence?.submittedCode ||
              'Submitted code is not available.'}
          </pre>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                background:
                  'var(--subtle)',
                borderRadius: 9,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <Sparkles
                size={14}
                color="var(--secondary)"
                style={{
                  verticalAlign:
                    'middle',
                  marginRight: 7,
                }}
              />

              <strong>
                {hasEvidence
                  ? 'AI signal'
                  : 'AI signal unavailable'}
              </strong>

              <div
                style={{
                  color:
                    'var(--muted)',
                  marginTop: 5,
                }}
              >
                {hasEvidence
                  ? 'Automated insights are available for this submitted code.'
                  : 'Automated insights are unavailable because submitted code is missing.'}
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Your evaluation"
          kicker="The final word stays with faculty"
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 18,
            }}
          >
            <label>
              <span className="label">
                Score
              </span>

              <div
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 9,
                }}
              >
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  disabled={!hasEvidence}
                  onChange={(e) =>
                    setScore(
                      e.target.value
                    )
                  }
                  style={{
                    font:
                      '20px var(--app-font-mono)',
                    opacity:
                      hasEvidence ? 1 : 0.55,
                  }}
                />

                <span
                  style={{
                    color:
                      'var(--muted)',
                  }}
                >
                  / 100
                </span>
              </div>
            </label>

            <label>
              <span className="label">
                Feedback for {s.student}
              </span>

              <textarea
                className="textarea"
                value={feedback}
                disabled={!hasEvidence}
                onChange={(e) =>
                  setFeedback(
                    e.target.value
                  )
                }
                placeholder={
                  hasEvidence
                    ? 'Enter feedback for the student...'
                    : 'Feedback becomes available after code is submitted.'
                }
                style={{
                  opacity:
                    hasEvidence ? 1 : 0.55,
                }}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 9,
                fontSize: 12,
                opacity:
                  hasEvidence ? 1 : 0.55,
              }}
            >
              <input
                type="checkbox"
                checked={
                  shareInsights
                }
                disabled={!hasEvidence}
                onChange={(e) =>
                  setShareInsights(
                    e.target.checked
                  )
                }
              />

              Share automated insights
              with student
            </label>

            <button
              type="button"
              className="btn btn-primary"
              onClick={
                handlePublish
              }
              disabled={!hasEvidence}
              style={{
                opacity:
                  hasEvidence ? 1 : 0.55,
                cursor:
                  hasEvidence
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              <Send size={14} />
              Publish evaluation
            </button>
          </div>
        </Section>
      </div>
    </Page>
  );
}