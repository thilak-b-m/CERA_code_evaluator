import { useEffect, useState, useMemo } from 'react';
import { ArrowUpDown, Filter, Inbox } from 'lucide-react';
import AssignmentCard from '../../components/student/AssignmentCard';
import SearchBar from '../../components/common/SearchBar';
import Dropdown from '../../components/common/Dropdown';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { studentService } from '../../services/studentService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'Not Started', label: 'Not started' },
  { value: 'Submitted', label: 'Submitted' },
];

const sortOptions = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'title', label: 'Title' },
  { value: 'progress', label: 'Progress' },
];

export default function Assignments() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getAssignments(token, user?.id);
        setAssignments(data);
      } catch (error) {
        console.error('Unable to load assignments:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, user?.id]);

  const filtered = useMemo(() => {
    let result = assignments.filter((a) => {
      const query = search.trim().toLowerCase();
      const matchSearch = a.title.toLowerCase().includes(query) || (a.description || '').toLowerCase().includes(query);
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'progress': return b.progress - a.progress;
        case 'dueDate':
        default: return new Date(a.dueDate) - new Date(b.dueDate);
      }
    });

    return result;
  }, [assignments, search, statusFilter, sortBy]);

  if (loading) {
    return (
      <Page title="Assignments" subtitle="Browse and start your course assignments">
        <Card title="Assignments"><Loading type="cards" count={6} /></Card>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="STUDENT / ASSIGNMENTS"
      title="Assignments"
      subtitle="Browse and start your course assignments"
      actions={
        <div className="flex gap-2">
          <Dropdown
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            icon={ArrowUpDown}
            className="flex-1 sm:w-44 sm:flex-none"
          />
        </div>
      }
    >
      <Card title="Filters" kicker="Narrow down your assignments">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search assignments..."
            className="sm:flex-1"
          />
          <div className="flex gap-3">
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              icon={Filter}
              className="flex-1 sm:w-44 sm:flex-none"
            />
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        <Card title="Results" kicker={filtered.length === 0 ? 'No assignments found' : `${filtered.length} assignment${filtered.length !== 1 ? 's' : ''} found`}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No assignments found"
              description="Try adjusting your filters or search terms to find assignments."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
