import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Inbox } from 'lucide-react';
import AssignmentCard from '../../components/student/AssignmentCard';
import SearchBar from '../../components/common/SearchBar';
import Dropdown from '../../components/common/Dropdown';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import { studentService } from '../../services/studentService';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Expired', label: 'Expired' },
];

const difficultyOptions = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const subjectOptions = [
  { value: 'all', label: 'All Subjects' },
  { value: 'Data Structures', label: 'Data Structures' },
  { value: 'Algorithms', label: 'Algorithms' },
  { value: 'Databases', label: 'Databases' },
];

const sortOptions = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'title', label: 'Title' },
  { value: 'progress', label: 'Progress' },
  { value: 'marks', label: 'Marks' },
];

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate');

  useEffect(() => {
    const load = async () => {
      const data = await studentService.getAssignments();
      setAssignments(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = assignments.filter((a) => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchDifficulty = difficultyFilter === 'all' || a.difficulty === difficultyFilter;
      const matchSubject = subjectFilter === 'all' || a.subject === subjectFilter;
      return matchSearch && matchStatus && matchDifficulty && matchSubject;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title': return a.title.localeCompare(b.title);
        case 'progress': return b.progress - a.progress;
        case 'marks': return b.marks - a.marks;
        case 'dueDate':
        default: return new Date(a.dueDate) - new Date(b.dueDate);
      }
    });

    return result;
  }, [assignments, search, statusFilter, difficultyFilter, subjectFilter, sortBy]);

  if (loading) return <Loading type="cards" count={6} />;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search assignments..."
          className="flex-1"
        />
        <div className="grid grid-cols-2 lg:flex gap-3">
          <Dropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="min-w-[140px]" />
          <Dropdown value={difficultyFilter} onChange={setDifficultyFilter} options={difficultyOptions} className="min-w-[140px]" />
          <Dropdown value={subjectFilter} onChange={setSubjectFilter} options={subjectOptions} className="min-w-[140px]" />
          <Dropdown value={sortBy} onChange={setSortBy} options={sortOptions} className="min-w-[140px]" />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-cera-muted">
        <Filter size={14} />
        <span>{filtered.length} assignment{filtered.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Grid */}
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
    </div>
  );
}
