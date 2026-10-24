import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ClipboardCheck,
  Copy,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Section from '../../components/common/Section.jsx';
import Status from '../../components/common/Status.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { submissionService } from '../../services/submissionService.js';
import { getEvaluation } from '../../services/evaluationService.js';
import { formatDateTime } from '../../utils/formatDate.js';

export default function SubmissionDetails() {
  const { id } = useParams();
  const { notify } = useApp();
  const { token } = useAuth();
  const [sub, setSubmission] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSubmission(null);
    setEvaluation(null);
    setLoadError('');
    Promise.all([
      submissionService.getForFaculty(id, token),
      getEvaluation(id, token),
    ]).then(([submission, savedEvaluation]) => {
      if (cancelled) return;
      setSubmission(submission);
      setEvaluation(savedEvaluation);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'Unable to load submission.');
    });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (!sub && !loadError) {
    return (
      <Page
        eyebrow="SUBMISSIONS"
        title="Loading submission"
        subtitle="Loading submitted code and review status."
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
              Loading submission...
            </p>
          </div>
        </section>
      </Page>
    );
  }

  if (loadError || !sub) {
    return (
      <Page eyebrow="SUBMISSIONS" title="Submission unavailable" subtitle={loadError}>
        <div role="alert" className="panel" style={{ padding: 20 }}>
          {loadError || 'Submission not found.'}
        </div>
      </Page>
    );
  }

  /*
   * Submitted-code availability is derived from
   * the shared submission service.
   */
  const hasSubmittedCode =
    sub.hasSubmittedCode;

  const submittedCode =
    sub.evidence?.submittedCode ||
    null;

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

  return (
    <Page
      eyebrow="SUBMISSIONS"
      title={`${sub.student} · ${sub.assignment}`}
      subtitle={`Submitted ${formatDateTime(sub.submitted)}`}
      actions={
        <>
          <Link
            to={`/evaluation/${sub.id}`}
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
            {evaluation?.status === 'published' ? evaluation.score : '—'}
            {evaluation?.status === 'published' && `/${sub.maxScore ?? '—'}`}
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
                  'published'
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
            kicker="Unavailable"
          >
            <div
              style={{
                padding: 20,
                color: 'var(--muted)',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Code execution is not configured. No code was run and no automated test results are available.
            </div>
          </Section>

          {/* CODE QUALITY */}

          <Section
            title="Code quality"
            kicker="Unavailable"
          >
            <div
              style={{
                padding: 20,
                color: 'var(--muted)',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Static code-quality analysis is not configured for this submission.
            </div>
          </Section>

          {/* FACULTY EVALUATION */}

          {evaluation && (
            <Section
              title="Faculty evaluation"
              kicker={
                evaluation.status ===
                'published'
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
                    {evaluation.score}/{sub.maxScore ?? '—'}
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
                  Status: {evaluation.status}
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </Page>
  );
}