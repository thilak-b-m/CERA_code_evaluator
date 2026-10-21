import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Filter } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TestCases() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    assignmentService.list(token)
      .then((records) => {
        if (!cancelled) setAssignments(records);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Unable to load assignments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const visibleAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignments;
    return assignments.filter((assignment) => (
      assignment.title.toLowerCase().includes(query)
      || String(assignment.course || '').toLowerCase().includes(query)
    ));
  }, [assignments, search]);

  const hasSearch = Boolean(search.trim());

  return (
    <Page
      title="Test cases"
      subtitle="Open an assignment to review or extend its evaluation suite."
    >
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search assignment or course..."
          className="sm:max-w-sm"
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-cera-muted">
        <span className="flex items-center gap-2">
          <Filter size={14} />
          {visibleAssignments.length} assignment{visibleAssignments.length === 1 ? '' : 's'}
          {hasSearch ? ' matching your search' : ''}
        </span>
        {hasSearch && (
          <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>Clear search</button>
        )}
      </div>

      {loading ? (
        <div className="panel p-6" role="status">Loading assignments...</div>
      ) : loadError ? (
        <div className="panel p-6 text-cera-error" role="alert">{loadError}</div>
      ) : visibleAssignments.length === 0 ? (
        <div className="panel empty">
          {hasSearch
            ? 'No assignments match your search.'
            : 'Create an assignment before adding test cases.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAssignments.map((assignment) => (
            <Link
              key={assignment.id}
              to={`/test-cases/${assignment.id}`}
              className="panel group flex items-center justify-between gap-4 p-4"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-cera-text transition-colors group-hover:text-cera-primary">
                  {assignment.title}
                </span>
                {assignment.course && (
                  <span className="mt-1 block truncate text-sm text-cera-muted">{assignment.course}</span>
                )}
              </span>
              <ChevronRight
                size={16}
                className="shrink-0 text-cera-muted transition-colors group-hover:text-cera-primary"
              />
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
