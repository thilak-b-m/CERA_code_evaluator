import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Code2, ListChecks, ArrowRight } from 'lucide-react';
import DashboardStats from '../../components/student/DashboardStats';
import AssignmentCard from '../../components/student/AssignmentCard';
import ActivityFeed from '../../components/student/ActivityFeed';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Loading, { SkeletonCard } from '../../components/common/Loading';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { studentService } from '../../services/studentService.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setOverview(await studentService.getDashboardOverview(token, user?.id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Page eyebrow="STUDENT / DASHBOARD" title="Welcome back" subtitle="Your assignments and published results">
        <Card title="Dashboard"><div style={{ padding: 20 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></Card>
      </Page>
    );
  }

  if (error || !overview) {
    return (
      <Page eyebrow="STUDENT / DASHBOARD" title="Welcome back" subtitle="Your assignments and published results">
        <ErrorState message="Could not load your student dashboard." onRetry={load} />
      </Page>
    );
  }

  const quickActions = [
    { label: 'View Assignments', icon: ListChecks, path: '/student/assignments' },
    { label: 'View Submissions', icon: Code2, path: '/student/submissions' },
    { label: 'View Results', icon: BarChart3, path: '/student/results' },
  ];

  return (
    <Page
      eyebrow="STUDENT / DASHBOARD"
      title={`Welcome, ${user?.name || 'Student'}`}
      subtitle="Your assignments and published results"
    >
      <Card title="Quick actions" kicker="Jump into your workflow">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="bg-cera-card border border-cera-border rounded-xl p-4 text-left hover:border-cera-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-sm font-medium text-cera-text">
                    <Icon size={18} className="text-cera-highlight" />
                    {action.label}
                  </span>
                  <ArrowRight size={14} className="text-cera-muted" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        <Card title="Upcoming assignments" kicker="Published assignments">
          {overview.upcoming.length === 0 ? (
            <EmptyState title="No assignments available" description="Published assignments will appear here." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.upcoming.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card title="Recent submissions" kicker="Your submitted work">
          {overview.recentSubmissions.length === 0 ? (
            <EmptyState title="No submissions yet" description="Your submitted work will appear here." />
          ) : (
            <ActivityFeed submissions={overview.recentSubmissions} />
          )}
        </Card>
      </div>
    </Page>
  );
}
