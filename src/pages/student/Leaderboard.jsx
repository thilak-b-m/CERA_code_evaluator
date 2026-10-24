import { useEffect, useMemo, useState } from 'react';
import { Filter, Trophy } from 'lucide-react';
import LeaderboardTable from '../../components/student/LeaderboardTable.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Loading from '../../components/common/Loading.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { analyticsService } from '../../services/analyticsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Page from '../../components/common/Page.jsx';

export default function Leaderboard() {
  const { token } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [metric, setMetric] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    analyticsService.getStudentLeaderboard(token)
      .then((result) => {
        if (cancelled) return;
        setRankings(result.rankings);
        setMetric(result.metric);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Unable to load the leaderboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rankings.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [rankings, search]);

  if (loading) return <Page eyebrow="STUDENT / DEPARTMENT RANKINGS" title="Leaderboard" subtitle="Loading department rankings…"><Loading type="table" /></Page>;
  if (error) {
    return (
      <Page eyebrow="STUDENT / DEPARTMENT RANKINGS" title="Leaderboard" subtitle="View ranking based on published assignment evaluations">
        <div className="panel p-5 text-sm text-cera-error" role="alert">{error}</div>
      </Page>
    );
  }

  return (
    <Page eyebrow="STUDENT / DEPARTMENT RANKINGS" title="Leaderboard" subtitle={metric}>
    <div className="space-y-5">

      <div>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Find a student..."
          className="sm:max-w-xs"
        />
        <div className="mt-3 flex items-center gap-2 text-sm text-cera-muted">
          <Filter size={14} />
          {entries.length} student{entries.length !== 1 ? 's' : ''}
          {search.trim() ? ' matching your search' : ''}
        </div>
      </div>

      {entries.length ? (
        <LeaderboardTable entries={entries} />
      ) : (
        <EmptyState
          icon={Trophy}
          title={rankings.length ? 'No students match your search' : 'No student rankings yet'}
          description={rankings.length
            ? 'Try a different student name.'
            : 'Published assignment evaluations will appear here once students have been assessed.'}
        />
      )}
    </div>
    </Page>
  );
}
