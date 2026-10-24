import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckCircle, Award, Filter, ArrowUpDown } from 'lucide-react';
import ResultCard from '../../components/student/ResultCard';
import Dropdown from '../../components/common/Dropdown';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { ScoreLineChart } from '../../components/student/ProgressChart';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import Page from '../../components/common/Page.jsx';

const sortOptions = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'percentage-desc', label: 'Highest score' },
];

export default function Results() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [scoreData, setScoreData] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await studentService.getResults(token);
      const sp = [...res]
        .sort((left, right) => new Date(left.submittedAt) - new Date(right.submittedAt))
        .map((result) => ({ assignment: result.assignment, score: result.percentage }));
      setResults(res);
      setScoreData(sp);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const subjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All courses' },
      ...Array.from(new Set(results.map((result) => result.subject)))
        .filter(Boolean)
        .map((subject) => ({ value: subject, label: subject })),
    ],
    [results],
  );

  const filtered = useMemo(() => {
    let result = results.filter((r) => subjectFilter === 'all' || r.subject === subjectFilter);
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'percentage-desc': return b.percentage - a.percentage;
        case 'date-desc':
        default: return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
    });
    return result;
  }, [results, subjectFilter, sortBy]);

  if (loading) return <Page eyebrow="STUDENT / RESULTS" title="Results" subtitle="Loading your published scores…"><Loading type="cards" count={4} /></Page>;
  if (error) return <Page eyebrow="STUDENT / RESULTS" title="Results" subtitle="Review your published scores and track your progress"><ErrorState message="Could not load published results." onRetry={load} /></Page>;

  const avgScore = results.length > 0
    ? `${(results.reduce((sum, result) => sum + result.percentage, 0) / results.length).toFixed(1)}%`
    : '—';
  const bestScore = results.length > 0
    ? `${Math.max(...results.map((result) => result.percentage))}%`
    : '—';

  const summaryStats = [
    { label: 'Average Score', value: avgScore, icon: Target, color: 'text-cera-primary bg-cera-primary/10' },
    { label: 'Published Results', value: results.length, icon: CheckCircle, color: 'text-cera-success bg-cera-success/10' },
    { label: 'Best Score', value: bestScore, icon: Award, color: 'text-cera-highlight bg-cera-highlight/10' },
  ];

  return (
    <Page eyebrow="STUDENT / RESULTS" title="Results" subtitle="Review your published scores and track your progress">
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {summaryStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-cera-card border border-cera-border rounded-xl p-4">
              <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-cera-text">{stat.value}</p>
              <p className="text-xs text-cera-muted mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Score Progression Chart */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-5">
        <h3 className="font-semibold text-cera-text mb-4">Score Progression</h3>
        <ScoreLineChart data={scoreData} />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Dropdown
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={subjectOptions}
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

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-cera-muted">
        <Filter size={14} />
        <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title={results.length === 0 ? 'No published results yet' : 'No results match this course'}
          description={results.length === 0
            ? 'Published faculty evaluations will appear here.'
            : 'Choose another course filter to see your published results.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((result) => <ResultCard key={result.id} result={result} />)}
        </div>
      )}
    </div>
    </Page>
  );
}
