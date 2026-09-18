import { useMemo, useState } from 'react';
import {
  Download,
  Filter,
  Search,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import SubmissionTable from '../../components/faculty/SubmissionTable.jsx';
import { getSubmissions } from '../../services/submissionService.js';
import { useApp } from '../../context/AppContext.jsx';

function Toolbar({
  search,
  setSearch,
  resultFilter,
  setResultFilter,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      {/* SEARCH */}

      <div
        className="search-box"
        style={{
          flex: '1 1 260px',
        }}
      >
        <Search size={15} />

        <input
          className="input"
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search by name, ID or assignment..."
          aria-label="Search submissions"
        />
      </div>

      {/* FILTER */}

      <div
        style={{
          position: 'relative',
        }}
      >
        <Filter
          size={14}
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />

        <select
          className="select"
          value={resultFilter}
          onChange={(e) =>
            setResultFilter(e.target.value)
          }
          style={{
            width: 170,
            paddingLeft: 32,
          }}
          aria-label="Filter submissions"
        >
          <option value="all">
            All results
          </option>

          <option value="passed">
            Passed
          </option>

          <option value="review">
            Needs review
          </option>

          <option value="failed">
            Failed
          </option>
        </select>
      </div>
    </div>
  );
}

export default function Submissions() {
  const { notify } = useApp();

  const [search, setSearch] =
    useState('');

  const [resultFilter, setResultFilter] =
    useState('all');

  /*
   * USE CENTRALIZED SUBMISSION DATA
   */

  const allSubmissions = useMemo(() => {
  return getSubmissions();
}, []);

  /*
   * SEARCH + RESULT FILTER
   */

  const rows = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return allSubmissions.filter(
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

        /*
         * SEARCH MATCH
         */

        const matchesSearch =
          query === '' ||
          id.includes(query) ||
          student.includes(query) ||
          assignment.includes(query);

        /*
         * RESULT MATCH
         */

        const score = Number(
          submission.score
        );

        const result =
          String(
            submission.result || ''
          ).toLowerCase();

        let matchesResult = true;

        if (
          resultFilter === 'passed'
        ) {
          matchesResult =
            result.includes('pass') ||
            score >= 70;
        }

        if (
          resultFilter === 'review'
        ) {
          matchesResult =
            result.includes('review') ||
            (score >= 60 &&
              score < 70);
        }

        if (
          resultFilter === 'failed'
        ) {
          matchesResult =
            result.includes('fail') ||
            score < 60;
        }

        return (
          matchesSearch &&
          matchesResult
        );
      }
    );
  }, [
    allSubmissions,
    search,
    resultFilter,
  ]);

  /*
   * CLEAR FILTERS
   */

  const clearFilters = () => {
    setSearch('');
    setResultFilter('all');
  };

  const hasFilters =
    search.trim() !== '' ||
    resultFilter !== 'all';

  /*
   * EXPORT CSV
   */

  const handleExport = () => {
    if (!rows.length) {
      notify(
        'There are no submissions to export'
      );
      return;
    }

    const header = [
      'Submission ID',
      'Student',
      'Assignment',
      'Score',
      'Result',
      'Language',
      'Submitted',
    ];

    const csvRows = rows.map(
      (submission) => [
        submission.id,
        submission.student,
        submission.assignment,
        submission.score,
        submission.result || '',
        submission.lang || '',
        submission.submitted || '',
      ]
    );

    const csv = [
      header,
      ...csvRows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text = String(
              value ?? ''
            );

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      'cera-submissions.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    notify(
      'Submissions exported as CSV'
    );
  };

  return (
    <Page
      title="Submissions"
      subtitle="A complete evidence trail of student work and execution results."
      actions={
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleExport}
        >
          <Download size={14} />
          Export CSV
        </button>
      }
    >
      {/* TOOLBAR */}

      <Toolbar
        search={search}
        setSearch={setSearch}
        resultFilter={resultFilter}
        setResultFilter={
          setResultFilter
        }
      />

      {/* FILTER STATUS */}

      {hasFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 10,
            marginBottom: 14,
            padding: '10px 12px',
            background:
              'var(--subtle)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <span>
            Showing {rows.length}{' '}
            matching submission
            {rows.length !== 1
              ? 's'
              : ''}
          </span>

          <button
            type="button"
            className="btn btn-soft"
            onClick={clearFilters}
            style={{
              minHeight: 28,
              padding: '0 9px',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* SUBMISSIONS */}

      <Card
        title="All submissions"
        kicker={`${rows.length} ${
          rows.length === 1
            ? 'submission'
            : 'submissions'
        }`}
      >
        {rows.length > 0 ? (
          <SubmissionTable
            rows={rows}
          />
        ) : (
          <div
            className="empty"
            style={{
              padding: 50,
            }}
          >
            <Search size={30} />

            <div
              style={{
                color:
                  'var(--text)',
                fontWeight: 700,
              }}
            >
              No submissions found
            </div>

            <p
              style={{
                fontSize: 12,
              }}
            >
              Try a different search
              or result filter.
            </p>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>
    </Page>
  );
}