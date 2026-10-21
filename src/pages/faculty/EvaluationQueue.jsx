import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { submissionService } from '../../services/submissionService.js';
import { autoEvaluate } from '../../services/evaluationService.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime } from '../../utils/formatDate.js';

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
  const [autoEvaluationProgress, setAutoEvaluationProgress] = useState(null);

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
    if (queuedSubmissions.length === 0 || autoEvaluationProgress) return;

    setAutoEvaluationProgress({ completed: 0, total: queuedSubmissions.length });
    const failures = [];
    let completed = 0;

    for (const submission of queuedSubmissions) {
      try {
        const evaluation = await autoEvaluate(submission.id, token);
        setSubmissions((current) => current.map((item) => (
          item.id === submission.id
            ? { ...item, evaluation: { ...evaluation } }
            : item
        )));
      } catch (error) {
        failures.push(`${submission.student}: ${error.message || 'AI evaluation failed.'}`);
      } finally {
        completed += 1;
        setAutoEvaluationProgress({
          completed,
          total: queuedSubmissions.length,
        });
      }
    }

    setAutoEvaluationProgress(null);
    const succeeded = queuedSubmissions.length - failures.length;
    if (failures.length === 0) {
      notify(`AI evaluated and published all ${succeeded} queued submission${succeeded === 1 ? '' : 's'}.`);
    } else {
      notify(
        `AI evaluation published ${succeeded} of ${queuedSubmissions.length}. `
        + `${failures.length} failed; their submissions remain in the queue. `
        + `First error: ${failures[0]}`,
      );
      console.error('Some queued AI evaluations failed:', failures);
    }
  };

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
            disabled={loading || rows.length === 0 || autoEvaluationProgress !== null}
          >
            <Sparkles size={14} />
            {autoEvaluationProgress
              ? `AI evaluating ${autoEvaluationProgress.completed}/${autoEvaluationProgress.total}...`
              : `Auto-evaluate all (${reviewCount})`}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartNext}
            disabled={loading || autoEvaluationProgress !== null}
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
                        <Status tone={s.evaluation?.status === 'draft' ? 'warning' : 'neutral'}>
                          {s.evaluation?.status === 'draft' ? 'Draft saved' : 'Needs review'}
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