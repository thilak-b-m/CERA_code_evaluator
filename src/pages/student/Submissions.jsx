import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Filter, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import SubmissionCard from '../../components/student/SubmissionCard';
import SearchBar from '../../components/common/SearchBar';
import Dropdown from '../../components/common/Dropdown';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

const reviewOptions = [
  { value: 'all', label: 'All submissions' },
  { value: 'pending', label: 'Awaiting review' },
  { value: 'reviewed', label: 'Reviewed' },
];

const sortOptions = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
];

const ITEMS_PER_PAGE = 6;

export default function Submissions() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getSubmissions(token);
        setSubmissions(data);
      } catch (error) {
        setLoadError(error.message || 'Unable to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = submissions.filter((s) => {
      const matchSearch = !query
        || s.assignment.toLowerCase().includes(query)
        || String(s.language || '').toLowerCase().includes(query)
        || s.id.toLowerCase().includes(query);
      const matchReview = reviewFilter === 'all'
        || (reviewFilter === 'reviewed') === Boolean(s.evaluation);
      return matchSearch && matchReview;
    });

    result = [...result].sort((a, b) => (
      sortBy === 'date-asc'
        ? new Date(a.submittedAt) - new Date(b.submittedAt)
        : new Date(b.submittedAt) - new Date(a.submittedAt)
    ));

    return result;
  }, [submissions, search, reviewFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) return <Loading type="cards" count={6} />;
  if (loadError) {
    return <div role="alert" className="rounded-xl border border-cera-border bg-cera-card p-5 text-sm text-cera-error">{loadError}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPage(1); }}
          placeholder="Search by assignment, language, or ID..."
          className="sm:flex-1"
        />
        <div className="flex gap-3">
          <Dropdown
            value={reviewFilter}
            onChange={(value) => { setReviewFilter(value); setPage(1); }}
            options={reviewOptions}
            icon={Filter}
            className="flex-1 sm:w-44 sm:flex-none"
          />
          <Dropdown
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            icon={ArrowUpDown}
            className="flex-1 sm:w-44 sm:flex-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-cera-muted">
        <Filter size={14} />
        <span>{filtered.length} submission{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No submissions found"
          description="You haven't made any submissions matching these filters yet."
          action={<button onClick={() => navigate('/student/assignments')} className="btn-primary">Browse Assignments</button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((s) => <SubmissionCard key={s.id} submission={s} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="p-2 rounded-lg bg-cera-elevated text-cera-muted hover:text-cera-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  aria-label={`Go to page ${i + 1}`}
                  aria-current={page === i + 1 ? 'page' : undefined}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === i + 1 ? 'bg-cera-primary text-white' : 'bg-cera-elevated text-cera-muted hover:text-cera-text'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="p-2 rounded-lg bg-cera-elevated text-cera-muted hover:text-cera-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
