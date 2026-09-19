import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Trophy, Clock, Cpu, CheckCircle, XCircle, TrendingUp, Award,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { studentService } from '../../services/studentService';

export default function ResultDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getResultById(id);
        if (data) setResult(data);
        else setError(true);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <Loading type="cards" count={3} />;
  if (error || !result) return <ErrorState message="Could not load result details." onRetry={() => navigate('/student/results')} />;

  const hasFullDetails = result.problemBreakdown && result.problemBreakdown.length > 0;
  const gradeColor = result.percentage >= 90 ? 'text-cera-success' : result.percentage >= 70 ? 'text-cera-primary' : 'text-cera-warning';

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/student/results')}
        className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors"
      >
        <ArrowLeft size={16} /> Back to Results
      </button>

      {/* Header */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-cera-text mb-2">{result.assignment}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={result.status} />
              <span className="text-sm text-cera-muted">{result.subject}</span>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold ${gradeColor}`}>{result.grade}</div>
            <p className="text-sm text-cera-muted mt-1">{result.percentage}%</p>
          </div>
        </div>

        {/* Score Progress */}
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-cera-muted">Score</span>
            <span className="text-sm font-medium text-cera-text font-mono">{result.obtainedMarks} / {result.totalMarks}</span>
          </div>
          <ProgressBar
            value={result.percentage}
            color={result.percentage >= 90 ? 'success' : result.percentage >= 70 ? 'primary' : 'warning'}
            height="h-3"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-cera-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-success/10 flex items-center justify-center">
              <CheckCircle size={16} className="text-cera-success" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Tests Passed</p>
              <p className="text-sm font-medium text-cera-text font-mono">{result.testCasesPassed}/{result.totalTestCases}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-error/10 flex items-center justify-center">
              <XCircle size={16} className="text-cera-error" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Tests Failed</p>
              <p className="text-sm font-medium text-cera-text font-mono">{result.totalTestCases - result.testCasesPassed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-highlight/10 flex items-center justify-center">
              <Clock size={16} className="text-cera-highlight" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Exec Time</p>
              <p className="text-sm font-medium text-cera-text font-mono">{result.executionTime}ms</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-secondary/10 flex items-center justify-center">
              <Trophy size={16} className="text-cera-secondary" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Rank</p>
              <p className="text-sm font-medium text-cera-text font-mono">#{result.rank}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      {hasFullDetails && result.performance && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <h3 className="font-semibold text-cera-text mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-cera-highlight" /> Performance Comparison
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-cera-muted mb-1">Your Score</p>
              <p className="text-2xl font-bold text-cera-success font-mono">{result.performance.yourScore}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-cera-muted mb-1">Class Average</p>
              <p className="text-2xl font-bold text-cera-warning font-mono">{result.performance.classAverage}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-cera-muted mb-1">Top Score</p>
              <p className="text-2xl font-bold text-cera-text font-mono">{result.performance.topScore}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-cera-muted mb-1">Percentile</p>
              <p className="text-2xl font-bold text-cera-highlight font-mono">{result.performance.percentile}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Problem Breakdown */}
      {hasFullDetails && (
        <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cera-border">
            <h3 className="font-semibold text-cera-text">Problem Breakdown</h3>
          </div>
          <div className="divide-y divide-cera-border">
            {result.problemBreakdown.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-mono ${p.status === 'Passed' ? 'text-cera-success' : 'text-cera-warning'}`}>
                    {p.status === 'Passed' ? '✓' : '◐'}
                  </span>
                  <span className="text-sm text-cera-text">{p.problem}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-cera-muted font-mono">{p.score}/{p.maxScore}</span>
                  <StatusBadge status={p.status} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
