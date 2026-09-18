import { useMemo, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

import { getSubmissions } from '../../services/submissionService.js';
import { useApp } from '../../context/AppContext.jsx';

export default function AIReview() {
  const { notify } = useApp();

  const submissions = useMemo(
    () => getSubmissions(),
    []
  );

  const reviewableSubmissions = useMemo(
    () =>
      submissions.filter(
        (item) => item.hasSubmittedCode
      ),
    [submissions]
  );

  const [selectedSubmissionId, setSelectedSubmissionId] =
    useState(
      () =>
        reviewableSubmissions[0]?.id ||
        submissions[0]?.id ||
        ''
    );

  const [refreshTime, setRefreshTime] =
    useState(() => new Date());

  const selectedSubmission = useMemo(
    () =>
      submissions.find(
        (item) =>
          item.id === selectedSubmissionId
      ) || null,
    [submissions, selectedSubmissionId]
  );

  const handleSubmissionChange = (event) => {
    setSelectedSubmissionId(event.target.value);
  };

  const handleRefresh = () => {
    setRefreshTime(new Date());

    notify(
      'AI review signals refreshed'
    );
  };

  const code =
    selectedSubmission?.evidence
      ?.submittedCode || null;

  const aiSignal =
    selectedSubmission?.evidence
      ?.aiSignal || null;

  const execution =
    selectedSubmission?.evidence
      ?.execution || null;

  const quality =
    selectedSubmission?.evidence
      ?.quality || null;

  const hasSubmittedCode =
    Boolean(
      selectedSubmission?.hasSubmittedCode &&
      code
    );

  const passedTests =
    Number(execution?.passed ?? 0);

  const totalTests =
    Number(execution?.total ?? 0);

  const hasExecution =
    Boolean(execution);

  const executionTone =
    hasExecution &&
    totalTests > 0 &&
    passedTests === totalTests
      ? 'success'
      : 'warning';

  const executionLabel =
    hasExecution &&
    totalTests > 0
      ? `${passedTests}/${totalTests} passed`
      : 'Unavailable';

  const executionDescription =
    hasExecution &&
    totalTests > 0
      ? passedTests === totalTests
        ? 'All available execution tests passed.'
        : `${totalTests - passedTests} execution test${
            totalTests - passedTests === 1
              ? ''
              : 's'
          } require attention.`
      : 'Execution evidence is not available.';

  const aiSignalTone =
    aiSignal ? 'warning' : 'neutral';

  if (!selectedSubmission) {
    return (
      <Page
        title="AI review"
        subtitle="A second set of eyes for patterns, edge cases, and feedback drafts."
        actions={
          <StatusBadge tone="neutral">
            No submissions
          </StatusBadge>
        }
      >
        <Card
          title="No submissions available"
          kicker="AI review requires submission data"
        >
          <div
            style={{
              padding: 20,
              color: 'var(--muted)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            There are currently no student
            submissions available for review.
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="AI review"
      subtitle="A second set of eyes for patterns, edge cases, and feedback drafts."
      actions={
        <StatusBadge
          tone={
            hasSubmittedCode
              ? 'live'
              : 'neutral'
          }
        >
          {hasSubmittedCode
            ? 'AI signals available'
            : 'No reviewable code'}
        </StatusBadge>
      }
    >
      <div
        style={{
          display: 'grid',
          gap: 14,
        }}
      >
        {/* Submission selector */}
        <Card
          title="Select submission"
          kicker="Choose a student submission to review"
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 10,
            }}
          >
            <label
              htmlFor="ai-review-submission"
              style={{
                fontSize: 11,
                color: 'var(--muted)',
              }}
            >
              Student submission
            </label>

            <select
              id="ai-review-submission"
              value={selectedSubmissionId}
              onChange={handleSubmissionChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border:
                  '1px solid var(--border)',
                background:
                  'var(--surface)',
                color: 'var(--text)',
                fontSize: 12,
                outline: 'none',
              }}
            >
              {submissions.map(
                (submission) => (
                  <option
                    key={submission.id}
                    value={submission.id}
                  >
                    {submission.student} ·{' '}
                    {submission.id} ·{' '}
                    {submission.assignment}
                    {!submission.hasSubmittedCode
                      ? ' · Code unavailable'
                      : ''}
                  </option>
                )
              )}
            </select>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 2,
              }}
            >
              <StatusBadge
                tone={
                  hasSubmittedCode
                    ? 'success'
                    : 'neutral'
                }
              >
                {hasSubmittedCode
                  ? 'Code submitted'
                  : 'Code unavailable'}
              </StatusBadge>
            </div>
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0,1.1fr) minmax(290px,.9fr)',
            gap: 14,
          }}
        >
          {/* Review workspace */}
          <Card
            title="Review workspace"
            kicker={`${selectedSubmission.id} · ${selectedSubmission.student} · ${selectedSubmission.assignment}`}
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
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    color: 'var(--muted)',
                    fontSize: 11,
                  }}
                >
                  {selectedSubmission.lang ||
                    'Language unavailable'}
                  {' · '}
                  Submitted{' '}
                  {selectedSubmission.submitted ||
                    'time unavailable'}
                </div>

                <StatusBadge
                  tone={
                    hasSubmittedCode
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {hasSubmittedCode
                    ? 'Code submitted'
                    : 'No submitted code'}
                </StatusBadge>
              </div>

              {hasSubmittedCode ? (
                <pre className="code">
                  {code}
                </pre>
              ) : (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 9,
                    background:
                      'var(--surface)',
                    color: 'var(--muted)',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  No submitted code is available
                  for this submission. AI review
                  cannot be generated without actual
                  submission evidence.
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 13,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    color: 'var(--muted)',
                    fontSize: 10,
                  }}
                >
                  Refreshed{' '}
                  {refreshTime.toLocaleTimeString(
                    [],
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRefresh}
                >
                  <Sparkles size={14} />
                  Refresh signals
                </button>
              </div>
            </div>
          </Card>

          {/* Findings */}
          <div
            style={{
              display: 'grid',
              gap: 14,
            }}
          >
            <Card
              title="AI findings"
              kicker="Based on available submission evidence"
            >
              <div
                style={{
                  padding: 20,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    background:
                      'var(--surface)',
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      AI signal
                    </span>

                    <StatusBadge
                      tone={
                        hasSubmittedCode
                          ? aiSignalTone
                          : 'neutral'
                      }
                    >
                      {hasSubmittedCode
                        ? aiSignal
                          ? 'Review'
                          : 'Unavailable'
                        : 'Unavailable'}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 11,
                      marginTop: 7,
                      lineHeight: 1.55,
                    }}
                  >
                    {hasSubmittedCode
                      ? aiSignal?.message ||
                        'No AI signal is available for this submission.'
                      : 'AI analysis is unavailable because no submitted code exists for this submission.'}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    background:
                      'var(--surface)',
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      Execution
                    </span>

                    <StatusBadge
                      tone={
                        hasSubmittedCode
                          ? executionTone
                          : 'neutral'
                      }
                    >
                      {hasSubmittedCode
                        ? executionLabel
                        : 'Unavailable'}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 11,
                      marginTop: 7,
                      lineHeight: 1.55,
                    }}
                  >
                    {hasSubmittedCode
                      ? executionDescription
                      : 'Execution evidence is unavailable because no submitted code exists for this submission.'}
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    background:
                      'var(--surface)',
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <span>
                      Code quality
                    </span>

                    <StatusBadge
                      tone={
                        hasSubmittedCode &&
                        quality
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {hasSubmittedCode &&
                      quality?.score
                        ? `${quality.score}/10`
                        : 'Unavailable'}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 11,
                      marginTop: 7,
                      lineHeight: 1.55,
                    }}
                  >
                    {hasSubmittedCode
                      ? quality?.feedback ||
                        'No code-quality evidence is available.'
                      : 'Code-quality evidence is unavailable because no submitted code exists for this submission.'}
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title="Guardrail"
              kicker="Faculty control"
            >
              <div
                style={{
                  padding: 20,
                  color: 'var(--muted)',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                <ShieldCheck
                  size={15}
                  color="var(--success)"
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 6,
                  }}
                />

                AI suggestions never change
                grades automatically. You approve
                every signal.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}