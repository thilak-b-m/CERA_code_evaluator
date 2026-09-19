import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, CheckCircle, Code, Award, TrendingUp } from 'lucide-react';
import ResultCard from '../../components/student/ResultCard';
import Dropdown from '../../components/common/Dropdown';
import Loading from '../../components/common/Loading';
import { ScoreLineChart } from '../../components/student/ProgressChart';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

const subjectOptions = [
  { value: 'all', label: 'All Subjects' },
  { value: 'Data Structures', label: 'Data Structures' },
  { value: 'Algorithms', label: 'Algorithms' },
  { value: 'Databases', label: 'Databases' },
];

const sortOptions = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'score-desc', label: 'Highest Score' },
  { value: 'percentage-desc', label: 'Best Percentage' },
];

export default function Results() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [scoreData, setScoreData] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [res, sp] = await Promise.all([
        studentService.getResults(),
        studentService.getScoreProgression(),
      ]);
      setResults(res);
      setScoreData(sp);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = results.filter((r) => subjectFilter === 'all' || r.subject === subjectFilter);
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc': return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'score-desc': return b.score - a.score;
        case 'percentage-desc': return b.percentage - a.percentage;
        case 'date-desc':
        default: return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
    });
    return result;
  }, [results, subjectFilter, sortBy]);

  if (loading) return <Loading type="cards" count={4} />;

  const avgScore = results.length > 0 ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1) : 0;
  const totalTests = results.reduce((sum, r) => sum + r.totalTestCases, 0);
  const passedTests = results.reduce((sum, r) => sum + r.testCasesPassed, 0);
  const bestScore = results.length > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;

  const summaryStats = [
    { label: 'Average Score', value: `${avgScore}%`, icon: Target, color: 'text-cera-primary bg-cera-primary/10' },
    { label: 'Assignments Completed', value: results.length, icon: CheckCircle, color: 'text-cera-success bg-cera-success/10' },
    { label: 'Tests Passed', value: `${passedTests}/${totalTests}`, icon: CheckCircle, color: 'text-cera-highlight bg-cera-highlight/10' },
    { label: 'Current Rank', value: `#${user?.rank || 4}`, icon: Trophy, color: 'text-cera-secondary bg-cera-secondary/10' },
  ];

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <Dropdown value={subjectFilter} onChange={setSubjectFilter} options={subjectOptions} className="flex-1" />
        <Dropdown value={sortBy} onChange={setSortBy} options={sortOptions} className="flex-1" />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => <ResultCard key={r.id} result={r} />)}
      </div>
    </div>
  );
}
