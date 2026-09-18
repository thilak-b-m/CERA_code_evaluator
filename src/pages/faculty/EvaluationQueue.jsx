import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ClipboardCheck,
  ArrowRight,
  Search,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { getSubmissions } from '../../services/submissionService.js';
import { evaluationQueueHealth } from '../../data/facultyMockData.js';
import { getEvaluation } from '../../services/evaluationService.js';
import { useApp } from '../../context/AppContext.jsx';

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
  const [, navigate] = useLocation();
  const { notify } = useApp();

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState('all');

  /*
   * ALL SUBMISSIONS THAT ARE READY FOR EVALUATION
   *
   * A submission enters the evaluation queue
   * only when submitted code exists.
   *
   * Published evaluations are excluded.
   */
  const rows = useMemo(() => {
    return getSubmissions().filter(
      (submission) => {
        const evaluation =
          getEvaluation(submission.id);

        return (
          submission.hasSubmittedCode &&
          evaluation?.status !== 'Published'
        );
      }
    );
  }, []);

  /*
   * SEARCH + FILTER
   */
  const filteredRows = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return rows.filter(
      (submission) => {
        const id = String(
          submission.id || ''
        ).toLowerCase();

        const student = String(
          submission.student || ''
        ).toLowerCase();

        const assignment =
          String(
            submission.assignment || ''
          ).toLowerCase();

        const matchesSearch =
          query === '' ||
          id.includes(query) ||
          student.includes(query) ||
          assignment.includes(query);

        /*
         * Risk is determined only from the
         * derived AI score.
         *
         * If no AI score exists, the submission
         * is not treated as high risk.
         */
        const score =
          submission.aiScore == null
            ? null
            : Number(
                submission.aiScore
              );

        const isHighRisk =
          score != null &&
          score < 70;

        const matchesFilter =
          filter === 'all' ||
          (filter === 'risk' &&
            isHighRisk) ||
          (filter === 'ready' &&
            !isHighRisk);

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

  const highRiskCount =
    rows.filter(
      (submission) =>
        submission.aiScore != null &&
        Number(submission.aiScore) < 70
    ).length;

  const progressPercent =
    evaluationQueueHealth.todayProgress.target > 0
      ? (evaluationQueueHealth.todayProgress.completed /
          evaluationQueueHealth.todayProgress.target) *
        100
      : 0;

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

    notify(
      `Opening ${nextSubmission.id}`
    );

    navigate(
      `/evaluation/${nextSubmission.id}`
    );
  };

  /*
   * SEARCH HANDLER
   */
  const handleSearch = (event) => {
    setSearch(event.target.value);
  };

  return (
    <Page
      title="Evaluation queue"
      subtitle="Make thoughtful calls faster with the highest-signal work first."
      actions={
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleStartNext}
        >
          <ClipboardCheck size={14} />
          Start next review
        </button>
      }
    >
      {/* QUEUE HEALTH */}

      <div
        className="panel"
        style={{
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
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

        <div>
          <div className="eyebrow">
            HIGH RISK
          </div>

          <div
            style={{
              font:
                '22px var(--app-font-mono)',
              marginTop: 7,
              color:
                highRiskCount > 0
                  ? 'var(--warning)'
                  : 'var(--success)',
            }}
          >
            {highRiskCount}
          </div>
        </div>

        <div>
          <div className="eyebrow">
            EST. TIME
          </div>

          <div
            style={{
              font:
                '22px var(--app-font-mono)',
              marginTop: 7,
            }}
          >
            {evaluationQueueHealth.estimatedTime}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 180,
            alignSelf: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              color:
                'var(--muted)',
              fontSize: 11,
              marginBottom: 7,
            }}
          >
            <span>
              Today's progress
            </span>

            <span>
              {evaluationQueueHealth.todayProgress.completed}{' '}
              /{' '}
              {evaluationQueueHealth.todayProgress.target}
            </span>
          </div>

          <div className="progress">
            <span
              style={{
                width: `${progressPercent}%`,
                background:
                  'var(--success)',
              }}
            />
          </div>
        </div>
      </div>

      {/* SEARCH + FILTER */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="search-box"
          style={{
            minWidth: 250,
          }}
        >
          <Search size={15} />

          <input
            className="input"
            type="text"
            placeholder="Search submissions..."
            value={search}
            onChange={
              handleSearch
            }
          />
        </div>

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
            All
          </button>

          <button
            type="button"
            className={
              filter === 'risk'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilter('risk')
            }
          >
            High risk
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
            Ready
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
            : 'Sorted by urgency and risk'
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  Submission
                </th>

                <th>
                  Student
                </th>

                <th>
                  Assignment
                </th>

                <th>
                  AI pre-score
                </th>

                <th>
                  Risk
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(
                (s) => {
                  const highRisk =
                    s.aiScore != null &&
                    Number(
                      s.aiScore
                    ) < 70;

                  return (
                    <tr
                      key={s.id}
                    >
                      <td>
                        <Link
                          href={`/evaluation/${s.id}`}
                          style={{
                            color:
                              'var(--text)',
                            fontWeight:
                              700,
                          }}
                        >
                          {s.id}
                        </Link>

                        <small
                          style={{
                            display:
                              'block',
                            color:
                              'var(--muted)',
                            marginTop: 4,
                          }}
                        >
                          {
                            s.submitted
                          }
                        </small>
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

                      <td
                        style={{
                          fontFamily:
                            'var(--app-font-mono)',
                        }}
                      >
                        {s.aiScore}/100
                      </td>

                      <td>
                        <Status
                          tone={
                            highRisk
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {highRisk
                            ? 'Inspect'
                            : 'Low'}
                        </Status>
                      </td>

                      <td>
                        <Link
                          href={`/evaluation/${s.id}`}
                          className="btn btn-soft"
                        >
                          Review
                          <ArrowRight
                            size={13}
                          />
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
                    colSpan="6"
                    style={{
                      textAlign:
                        'center',
                      padding: 40,
                      color:
                        'var(--muted)',
                    }}
                  >
                    <Search
                      size={24}
                      style={{
                        marginBottom: 8,
                        opacity: 0.6,
                      }}
                    />

                    <div>
                      No submissions
                      found
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