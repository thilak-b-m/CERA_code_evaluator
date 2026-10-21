import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Send,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { submissionService } from '../../services/submissionService.js';
import {
  getEvaluation,
  autoEvaluate,
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
  const { token } = useAuth();

  const [s, setSubmission] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [evaluationStatus, setEvaluationStatus] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluationSource, setEvaluationSource] = useState('faculty');

  useEffect(() => {
    let cancelled = false;
    setSubmission(null);
    setLoadError('');
    async function load() {
      try {
        const submission = await submissionService.getForFaculty(id, token);
        const evaluation = await getEvaluation(id, token);
        if (cancelled) return;
        setSubmission(submission);
        setScore(evaluation ? String(evaluation.score) : '');
        setFeedback(evaluation?.feedback || '');
        setEvaluationStatus(evaluation?.status || null);
        setEvaluationSource(evaluation?.source || 'faculty');
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Unable to load submission.');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (!s && !loadError) {
    return (
      <Page
        title="Evaluate submission"
        subtitle="Loading submission..."
      >
        <div
          className="panel"
          style={{
            padding: 30,
            color: 'var(--muted)',
          }}
        >
          Loading submission...
        </div>
      </Page>
    );
  }

  if (loadError || !s) {
    return (
      <Page title="Evaluate submission" subtitle={loadError || 'Submission not found.'}>
        <div role="alert" className="panel" style={{ padding: 30, color: 'var(--warning)' }}>
          {loadError || 'Submission not found.'}
        </div>
      </Page>
    );
  }

  const hasEvidence =
    s.hasSubmittedCode;

  const handleSaveDraft = async () => {
    if (!hasEvidence) {
      notify(
        'Evaluation is unavailable because submitted code is missing'
      );
      return;
    }

    setSaving(true);
    try {
      const saved = await saveDraft(s.id, {
      score: score === '' ? 0 : Number(score),
      feedback,
      }, token);
      setEvaluationStatus(saved.status);
      setEvaluationSource('faculty');
      notify(`Evaluation draft saved for ${s.student}`);
    } catch (error) {
      notify(error.message || 'Unable to save evaluation draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoEvaluate = async () => {
    if (!hasEvidence) {
      notify('AI evaluation is unavailable because submitted code is missing');
      return;
    }

    setGenerating(true);
    try {
      const generated = await autoEvaluate(s.id, token);
      setScore(String(generated.score));
      setFeedback(generated.feedback);
      setEvaluationStatus(generated.status);
      setEvaluationSource(generated.source || 'ollama');
      notify(`AI evaluation published for ${s.student}.`);
    } catch (error) {
      notify(error.message || 'Unable to generate an AI evaluation.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!hasEvidence) {
      notify(
        'Evaluation cannot be published because submitted code is missing'
      );
      return;
    }

    if (
      score === '' ||
      Number(score) < 0 ||
      Number(score) > (s.maxScore || 100)
    ) {
      notify(
        `Score must be between 0 and ${s.maxScore || 100}`
      );
      return;
    }

    if (!feedback.trim()) {
      notify(
        'Please enter feedback before publishing'
      );
      return;
    }

    setSaving(true);
    try {
      const published = await publishEvaluation(s.id, {
        score: Number(score),
        feedback: feedback.trim(),
      }, token);
      setEvaluationStatus(published.status);
      setEvaluationSource('faculty');
      notify(`Evaluation published for ${s.student}`);
    } catch (error) {
      notify(error.message || 'Unable to publish evaluation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      eyebrow="EVALUATION"
      title="Evaluate submission"
      subtitle={`${s.student} · ${s.assignment}`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleAutoEvaluate}
            disabled={!hasEvidence || saving || generating}
          >
            <Sparkles size={14} />
            {generating ? 'Evaluating with AI...' : 'Auto-evaluate and publish'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleSaveDraft}
            disabled={!hasEvidence || saving || generating}
            style={{
              opacity: hasEvidence ? 1 : 0.55,
              cursor: hasEvidence ? 'pointer' : 'not-allowed',
            }}
          >
            <Check size={14} />
            Save draft
          </button>
        </div>
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
            FACULTY REVIEW
          </div>

          <div
            style={{
              marginTop: 6,
              font:
                '16px var(--app-font-mono)',
            }}
          >
            {evaluationStatus || 'Not evaluated'}
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
          kicker="Problem, grading criteria, and submitted source code"
        >
          <div
            style={{
              padding: 20,
            }}
          >
          <div style={{ marginBottom: 16 }}>
            <div className="eyebrow">PROBLEM DESCRIPTION</div>
            <p style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: 6 }}>
              {s.assignmentDescription || 'No assignment description is available.'}
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="eyebrow">EVALUATION CONDITIONS / COMPLEXITY</div>
            <p style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: 6 }}>
              {s.evaluationCriteria || 'No additional criteria supplied.'}
            </p>
          </div>
          <pre className="code">
            {s.evidence?.submittedCode ||
              'Submitted code is not available.'}
          </pre>

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
            {evaluationSource === 'ollama' && (
              <div
                role="status"
                style={{
                  padding: 10,
                  border: '1px solid var(--warning)',
                  borderRadius: 8,
                  color: 'var(--muted)',
                  fontSize: 12,
                }}
              >
                AI-generated draft. Review and edit the score and feedback before publishing.
              </div>
            )}

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
                  max={s.maxScore || 100}
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
                  / {s.maxScore || 100}
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

            <button
              type="button"
              className="btn btn-primary"
              onClick={
                handlePublish
              }
              disabled={!hasEvidence || saving || generating}
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