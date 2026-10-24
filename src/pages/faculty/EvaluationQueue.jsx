import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { submissionService } from '../../services/submissionService.js';
import {
  getEvaluationBatch,
  getLatestEvaluationBatch,
  retryEvaluationBatch,
  startEvaluationBatch,
} from '../../services/evaluationService.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import Section from '../../components/common/Section.jsx';
import Status from '../../components/common/Status.jsx';

export default function EvaluationQueue() {
  const navigate = useNavigate();
  const { notify } = useApp();
  const { token } = useAuth();

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [evaluationBatch, setEvaluationBatch] = useState(null);
  const [batchError, setBatchError] = useState('');
  const [batchStarting, setBatchStarting] = useState(false);
  const batchStartInFlight = useRef(false);
  const batchPollInFlight = useRef(false);

  const applyBatch = (batch) => {
    setEvaluationBatch(batch);
    if (!batch?.jobs) return;
    const completed = new Map(batch.jobs
      .filter((job) => job.status === 'completed' && job.evaluation)
      .map((job) => [job.submissionId, job.evaluation]));
    if (completed.size) {
      setSubmissions((current) => current.map((item) => (
        completed.has(item.id)
          ? { ...item, evaluation: { ...completed.get(item.id) } }
          : item
      )));
    }
  };

  useEffect(() => {
    let cancelled = false;
    submissionService.listForFaculty(token)
      .then((items) => {
        if (!cancelled) setSubmissions(items);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Unable to load submissions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    getLatestEvaluationBatch(token)
      .then((batch) => { if (!cancelled && batch) applyBatch(batch); })
      .catch((error) => { if (!cancelled) setBatchError(error.message || 'Unable to restore AI queue progress.'); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!evaluationBatch?.id || ['completed', 'failed'].includes(evaluationBatch.status)) return undefined;
    let cancelled = false;
    const poll = async () => {
      if (batchPollInFlight.current) return;
      batchPollInFlight.current = true;
      try {
        const batch = await getEvaluationBatch(evaluationBatch.id, token);
        if (!cancelled) {
          setBatchError('');
          applyBatch(batch);
        }
      } catch (error) {
        if (!cancelled) setBatchError(error.message || 'Unable to refresh AI queue progress.');
      } finally {
        batchPollInFlight.current = false;
      }
    };
    const timer = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [evaluationBatch?.id, evaluationBatch?.status, token]);

  /*
   * ALL SUBMISSIONS THAT ARE READY FOR EVALUATION
   *
   * A submission enters the evaluation queue
   * only when submitted code exists.
   *
   * Published evaluations are excluded.
   */
  const rows = useMemo(() => {
    return submissions.filter((submission) => (
      submission.hasSubmittedCode
      && submission.evaluation?.status !== 'published'
    ));
  }, [submissions]);

  /*
   * SEARCH + FILTER
   */
  const filteredRows = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return rows.filter(
      (submission) => {
        const student = String(
          submission.student || ''
        ).toLowerCase();

        const assignment =
          String(
            submission.assignment || ''
          ).toLowerCase();

        const matchesSearch =
          query === '' ||
          student.includes(query) ||
          assignment.includes(query);

        const matchesFilter =
          filter === 'all' ||
          (filter === 'ready' && !submission.evaluation);

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );
  }, [rows, search, filter]);

  /*
   * QUEUE COUNTS
   */
  const reviewCount = rows.length;

  /*
   * START NEXT REVIEW
   */
  const handleStartNext = () => {
    if (rows.length === 0) {
      notify(
        'No submissions waiting for review'
      );
      return;
    }

    const nextSubmission =
      rows[0];

    navigate(
      `/evaluation/${nextSubmission.id}`
    );
  };

  /*
   * AUTO-EVALUATE ALL
   */
  const handleAutoEvaluateAll = async () => {
    const queuedSubmissions = [...rows];
    if (queuedSubmissions.length === 0 || batchStartInFlight.current || batchStarting) return;
    batchStartInFlight.current = true;
    setBatchStarting(true);
    setBatchError('');
    try {
      const batch = await startEvaluationBatch(queuedSubmissions.map((submission) => submission.id), token);
      applyBatch(batch);
      notify(`AI evaluation queued for ${batch.total} submission${batch.total === 1 ? '' : 's'}.`);
    } catch (error) {
      setBatchError(error.message || 'Unable to start the AI evaluation queue.');
      notify(error.message || 'Unable to start the AI evaluation queue.', 'error');
    } finally {
      batchStartInFlight.current = false;
      setBatchStarting(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!evaluationBatch?.id || batchStartInFlight.current) return;
    batchStartInFlight.current = true;
    setBatchStarting(true);
    setBatchError('');
    try {
      applyBatch(await retryEvaluationBatch(evaluationBatch.id, token));
      notify('Retrying eligible failed AI evaluations.');
    } catch (error) {
      setBatchError(error.message || 'Unable to retry failed AI evaluations.');
    } finally {
      batchStartInFlight.current = false;
      setBatchStarting(false);
    }
  };

  const batchActive = evaluationBatch && ['pending', 'processing'].includes(evaluationBatch.status);
  const activeBatchSubmission = evaluationBatch?.processingSubmissionId
    ? rows.find((submission) => submission.id === evaluationBatch.processingSubmissionId)
    : null;
  const batchPercent = evaluationBatch?.total
    ? Math.round((evaluationBatch.completed / evaluationBatch.total) * 100)
    : 0;

  return (
    <Page
      title="Evaluation queue"
      subtitle="Review submissions manually or publish AI evaluations for the entire queue."
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleAutoEvaluateAll}
            disabled={loading || rows.length === 0 || batchActive || batchStarting}
          >
            <Sparkles size={14} />
            {batchStarting ? 'Starting AI queue...' : batchActive
              ? `AI evaluating ${evaluationBatch.completed}/${evaluationBatch.total}...`
              : `Auto-evaluate all (${reviewCount})`}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartNext}
            disabled={loading || batchActive || batchStarting}
          >
            <ClipboardCheck size={14} />
            Start next review
          </button>
        </div>
      }
    >
      {/* QUEUE HEALTH */}

      <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
        <div>
          <div className="eyebrow">
            QUEUE HEALTH
          </div>

          <div
            style={{
              font:
                '22px var(--app-font-mono)',
              marginTop: 7,
            }}
          >
            {reviewCount}{' '}
            <span
              style={{
                color:
                  'var(--muted)',
                font:
                  '12px var(--app-font-sans)',
              }}
            >
              to review
            </span>
          </div>
        </div>
      </div>

      {evaluationBatch && (
        <section className="panel mb-4 p-4" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-sm font-semibold text-cera-text">AI evaluation progress</h2>
              <p className="mt-1 text-xs text-cera-muted">
                {evaluationBatch.completed} completed · {evaluationBatch.pending} pending · {evaluationBatch.failed} failed
                {evaluationBatch.total ? ` · ${evaluationBatch.total} selected` : ''}
              </p>
            </div>
            {evaluationBatch.failed > 0 && evaluationBatch.retryable && (
              <button type="button" className="btn btn-ghost" onClick={handleRetryFailed} disabled={batchStarting || batchActive}>
                Retry failed evaluations
              </button>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-cera-elevated" role="progressbar" aria-valuenow={batchPercent} aria-valuemin={0} aria-valuemax={100} aria-label="AI evaluation progress">
            <div className="h-full rounded-full bg-cera-primary transition-[width] duration-300" style={{ width: `${batchPercent}%` }} />
          </div>
          {batchActive && (
            <p className="mt-2 text-xs text-cera-muted">
              {activeBatchSubmission
                ? `Evaluating ${activeBatchSubmission.student} · ${activeBatchSubmission.assignment}`
                : 'Waiting for the next submission'}
              {' '}· {batchPercent}% complete
            </p>
          )}
          {batchError && <p role="alert" className="mt-3 text-sm text-cera-error">{batchError}</p>}
          {evaluationBatch.jobs.filter((job) => job.status === 'failed').length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-cera-border pt-3">
              {evaluationBatch.jobs.filter((job) => job.status === 'failed').map((job) => {
                const submission = submissions.find((item) => item.id === job.submissionId);
                return (
                  <li key={job.id} className="text-xs text-cera-error">
                    <span className="font-semibold">{submission?.student || 'Submission'}:</span>{' '}
                    {job.error?.message || 'Evaluation failed.'}
                    {job.retryable ? ' Retry is available.' : ''}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* SEARCH + FILTER */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search submissions..."
          className="sm:flex-1"
        />

        <div className="segmented">
          <button
            type="button"
            className={
              filter === 'all'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('all')
            }
          >
            All {rows.length}
          </button>

          <button
            type="button"
            className={
              filter === 'ready'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('ready')
            }
          >
            Awaiting evaluation {reviewCount}
          </button>
        </div>
      </div>

      {/* TABLE */}

      <Section
        title="Next in line"
        kicker={
          search
            ? `${filteredRows.length} result${
                filteredRows.length !== 1
                  ? 's'
                  : ''
              } found`
            : 'Unpublished submissions'
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Submitted</th>

                <th>
                  Student
                </th>

                <th>
                  Assignment
                </th>

                <th>
                  Review status
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(
                (s) => {
                  return (
                    <tr
                      key={s.id}
                    >
                      <td>
                        {formatDateTime(s.submitted)}
                      </td>

                      <td>
                        {
                          s.student
                        }
                      </td>

                      <td>
                        {
                          s.assignment
                        }
                      </td>

                      <td>
                        <Status tone={evaluationBatch?.jobs?.some((job) => job.submissionId === s.id && job.status === 'failed') ? 'error' : evaluationBatch?.jobs?.some((job) => job.submissionId === s.id && job.status === 'processing') ? 'live' : s.evaluation?.status === 'draft' ? 'warning' : 'neutral'}>
                          {evaluationBatch?.jobs?.find((job) => job.submissionId === s.id)?.status === 'processing'
                            ? 'AI evaluating'
                            : evaluationBatch?.jobs?.find((job) => job.submissionId === s.id)?.status === 'pending'
                              ? 'AI pending'
                              : evaluationBatch?.jobs?.find((job) => job.submissionId === s.id)?.status === 'failed'
                                ? 'AI failed'
                                : s.evaluation?.status === 'draft' ? 'Draft saved' : 'Needs review'}
                        </Status>
                      </td>

                      <td>
                        <Link
                          to={`/evaluation/${s.id}`}
                          className="btn btn-soft"
                        >
                          Review
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                }
              )}

              {filteredRows.length ===
                0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign:
                        'center',
                      padding: 40,
                      color:
                        'var(--muted)',
                    }}
                  >
                    <div>
                      {loading ? 'Loading submissions...' : loadError || 'No submissions found'}
                    </div>

                    {search && (
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                        }}
                      >
                        Try another
                        submission ID,
                        student name,
                        or assignment.
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </Page>
  );
}
