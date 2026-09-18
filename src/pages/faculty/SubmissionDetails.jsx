import { Link, useParams, useLocation } from 'wouter';
import {
  ClipboardCheck,
  Copy,
  GitCompare,
  CheckCircle2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getSubmissionById } from '../../services/submissionService.js';
import { getEvaluation } from '../../services/evaluationService.js';

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

function Status({
  children,
  tone = 'neutral',
}) {
  return (
    <span
      className={`status status-${tone}`}
    >
      <span className="status-dot" />
      {children}
    </span>
  );
}

export default function SubmissionDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { notify } = useApp();

  /*
   * Get the submission through the service layer.
   * The service derives submitted-code availability
   * from the available submission evidence.
   */
  const sub = getSubmissionById(id);

  if (!sub) {
    return (
      <Page
        eyebrow="SUBMISSIONS"
        title="Submission not found"
        subtitle="The requested submission could not be found."
      >
        <section className="panel">
          <div style={{ padding: 20 }}>
            <p
              style={{
                margin: 0,
                color: 'var(--muted)',
                fontSize: 12,
              }}
            >
              No submission exists for this ID.
            </p>
          </div>
        </section>
      </Page>
    );
  }

  /*
   * Submitted-code availability is derived from
   * the shared submission service.
   */
  const hasSubmittedCode =
    sub.hasSubmittedCode;

  /*
   * Evidence assembled by submissionService.
   */
  const submittedCode =
    sub.evidence?.submittedCode ||
    null;

  const executionData =
    sub.evidence?.execution ||
    null;

  const qualityData =
    sub.evidence?.quality ||
    null;

  /*
   * Faculty evaluation is meaningful only when
   * submitted code exists.
   */
  const evaluation =
    hasSubmittedCode
      ? getEvaluation(sub.id)
      : null;

  /*
   * Score hierarchy:
   *
   * 1. Published faculty evaluation
   * 2. AI/automated score when code exists
   * 3. No score
   *
   * We deliberately do not use the raw submission
   * score when submitted code is unavailable.
   */
  const displayedScore =
    evaluation?.status === 'Published'
      ? evaluation.score
      : sub.aiScore;

  /*
   * COPY CODE
   */
  const handleCopy = async () => {
    if (!hasSubmittedCode || !submittedCode) {
      notify(
        'Submitted code is not available for this submission'
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        submittedCode
      );

      notify(
        'Submitted code copied to clipboard'
      );
    } catch (error) {
      console.error(
        'Copy failed:',
        error
      );

      notify(
        'Unable to copy code'
      );
    }
  };

  /*
   * COMPARE
   */
  const handleCompare = () => {
    if (!hasSubmittedCode) {
      notify(
        'Code comparison is unavailable because submitted code is missing'
      );
      return;
    }

    notify(
      `Opening comparison for ${sub.id}`
    );

    navigate(
      `/plagiarism/compare/${sub.id}`
    );
  };

  return (
    <Page
      eyebrow={`SUBMISSIONS / ${sub.id}`}
      title={sub.id}
      subtitle={`${sub.student} · ${sub.assignment} · submitted ${sub.submitted}`}
      actions={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleCompare}
            disabled={!hasSubmittedCode}
          >
            <GitCompare size={14} />
            Compare
          </button>

          <Link
            href={`/evaluation/${sub.id}`}
            className="btn btn-primary"
          >
            <ClipboardCheck size={14} />
            Evaluate
          </Link>
        </>
      }
    >
      {/* SUBMISSION SUMMARY */}

      <div
        className="panel"
        style={{
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          gap: 26,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
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
            {sub.student}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            ASSIGNMENT
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
            }}
          >
            {sub.assignment}
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
            {sub.lang || 'Python'}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            SCORE
          </div>

          <div
            style={{
              marginTop: 6,
              font: '16px var(--app-font-mono)',
            }}
          >
            {displayedScore ?? '—'}
            {displayedScore != null && '/100'}
          </div>
        </div>

        {evaluation?.status && (
          <div>
            <div className="eyebrow">
              EVALUATION
            </div>

            <div
              style={{
                marginTop: 6,
              }}
            >
              <Status
                tone={
                  evaluation.status ===
                  'Published'
                    ? 'success'
                    : 'neutral'
                }
              >
                {evaluation.status}
              </Status>
            </div>
          </div>
        )}
      </div>

      {/* SUBMISSION CODE WARNING */}

      {!hasSubmittedCode && (
        <div
          style={{
            border: '1px solid var(--warning)',
            borderRadius: 14,
            padding: 16,
            marginBottom: 14,
            background:
              'var(--surface)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 7,
            }}
          >
            Submission code unavailable
          </div>

          <div
            style={{
              color: 'var(--muted)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            This submission does not currently
            contain submitted code. Evaluation,
            code comparison, execution results,
            and code quality analysis are
            unavailable until code is submitted.
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.3fr) minmax(280px,.7fr)',
          gap: 14,
        }}
      >
        {/* SUBMITTED CODE */}

        <Section
          title="Submitted code"
          kicker={`${sub.lang || 'Python'} · main.py`}
          action={
            <button
              type="button"
              className="icon-btn"
              aria-label="Copy code"
              title="Copy code"
              onClick={handleCopy}
              disabled={!hasSubmittedCode}
            >
              <Copy size={14} />
            </button>
          }
        >
          <div style={{ padding: 20 }}>
            <pre className="code">
              {submittedCode ||
                'Submitted code is not available.'}
            </pre>
          </div>
        </Section>

        <div
          style={{
            display: 'grid',
            gap: 14,
          }}
        >
          {/* EXECUTION RESULT */}

          <Section
            title="Execution result"
            kicker="Automated test suite"
          >
            <div
              style={{
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                }}
              >
                <Status
                  tone={
                    executionData
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {executionData
                    ? `Passed ${executionData.passed} / ${executionData.total}`
                    : 'No result available'}
                </Status>

                {executionData && (
                  <span
                    style={{
                      font:
                        '12px var(--app-font-mono)',
                    }}
                  >
                    {executionData.time}
                  </span>
                )}
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: 'grid',
                  gap: 9,
                }}
              >
                {executionData ? (
                  executionData.tests.map(
                    (test) => (
                      <div
                        key={test.name}
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          padding: '9px 0',
                          borderBottom:
                            '1px solid var(--border)',
                          fontSize: 11,
                        }}
                      >
                        <span>
                          <CheckCircle2
                            size={13}
                            color={
                              test.status ===
                              'Timeout'
                                ? 'var(--warning)'
                                : 'var(--success)'
                            }
                            style={{
                              verticalAlign:
                                'middle',
                              marginRight: 7,
                            }}
                          />

                          {test.name}
                        </span>

                        <span
                          style={{
                            color:
                              test.status ===
                              'Timeout'
                                ? 'var(--warning)'
                                : 'var(--muted)',
                          }}
                        >
                          {test.status}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 12,
                      padding: '9px 0',
                    }}
                  >
                    Execution test results are
                    not available for this
                    submission.
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* CODE QUALITY */}

          <Section
            title="Code quality"
            kicker="Static analysis"
          >
            <div
              style={{
                padding: 20,
                display: 'grid',
                gap: 13,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                }}
              >
                <span
                  style={{
                    color: 'var(--muted)',
                    fontSize: 12,
                  }}
                >
                  Quality score
                </span>

                <strong
                  style={{
                    color: 'var(--success)',
                    font:
                      '20px var(--app-font-mono)',
                  }}
                >
                  {qualityData?.score || '—'}
                </strong>
              </div>

              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 12,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {qualityData?.feedback ||
                  'Code quality analysis is not available for this submission.'}
              </p>
            </div>
          </Section>

          {/* FACULTY EVALUATION */}

          {evaluation && (
            <Section
              title="Faculty evaluation"
              kicker={
                evaluation.status ===
                'Published'
                  ? 'Published evaluation'
                  : 'Saved evaluation'
              }
            >
              <div
                style={{
                  padding: 20,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--muted)',
                      fontSize: 12,
                    }}
                  >
                    Faculty score
                  </span>

                  <strong
                    style={{
                      font:
                        '20px var(--app-font-mono)',
                      color:
                        'var(--success)',
                    }}
                  >
                    {evaluation.score}/100
                  </strong>
                </div>

                <div>
                  <div
                    className="label"
                    style={{
                      marginBottom: 7,
                    }}
                  >
                    Feedback
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color:
                        'var(--muted)',
                      fontSize: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    {evaluation.feedback ||
                      'No feedback was provided.'}
                  </p>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      'var(--muted)',
                  }}
                >
                  Automated insights:{' '}
                  {evaluation.shareInsights
                    ? 'Shared with student'
                    : 'Not shared with student'}
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </Page>
  );
}