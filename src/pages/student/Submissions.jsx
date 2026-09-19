import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import SubmissionCard from '../../components/student/SubmissionCard';
import SearchBar from '../../components/common/SearchBar';
import Dropdown from '../../components/common/Dropdown';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import { studentService } from '../../services/studentService';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Passed', label: 'Passed' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Partially Passed', label: 'Partially Passed' },
  { value: 'Evaluating', label: 'Evaluating' },
];

const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'score-desc', label: 'Highest Score' },
  { value: 'score-asc', label: 'Lowest Score' },
];

const ITEMS_PER_PAGE = 6;

export default function Submissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      const data = await studentService.getSubmissions();
      setSubmissions(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = submissions.filter((s) => {
      const matchSearch = s.assignment.toLowerCase().includes(search.toLowerCase()) || s.problem.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'score-desc': return b.score - a.score;
        case 'score-asc': return a.score - b.score;
        case 'date-desc':
        default: return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
    });

    return result;
  }, [submissions, search, statusFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) return <Loading type="cards" count={6} />;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={(e) => { setSearch(e); setPage(1); }}
          placeholder="Search by assignment, problem, or ID..."
          className="flex-1"
        />
        <div className="flex gap-3">
          <Dropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={statusOptions} className="min-w-[160px]" />
          <Dropdown value={sortBy} onChange={setSortBy} options={sortOptions} className="min-w-[160px]" />
        </div>
      </div>

      <div className="text-sm text-cera-muted">{filtered.length} submission{filtered.length !== 1 ? 's' : ''} found</div>

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
                className="p-2 rounded-lg bg-cera-elevated text-cera-muted hover:text-cera-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
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
