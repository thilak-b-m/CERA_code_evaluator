import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

export default function ResultCard({ result }) {
  const navigate = useNavigate();

  const gradeColor = {
    'A+': 'text-cera-success',
    'A': 'text-cera-success',
    'B+': 'text-cera-primary',
    'B': 'text-cera-primary',
    'C+': 'text-cera-warning',
    'C': 'text-cera-warning',
    'F': 'text-cera-error',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/student/results/${result.id}`)}
      className="bg-cera-card border border-cera-border rounded-xl p-5 cursor-pointer hover:border-cera-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-cera-text">{result.assignment}</h3>
          <p className="text-sm text-cera-muted mt-0.5">{result.subject}</p>
        </div>
        <span className={`text-2xl font-bold ${gradeColor[result.grade] || 'text-cera-text'}`}>
          {result.grade}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-cera-muted">Score</span>
          <span className="text-xs text-cera-text font-mono">{result.obtainedMarks}/{result.totalMarks}</span>
        </div>
        <ProgressBar
          value={result.percentage}
          color={result.percentage >= 90 ? 'success' : result.percentage >= 70 ? 'primary' : 'warning'}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-cera-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Trophy size={12} /> Rank #{result.rank}
          </span>
          <span>{result.testCasesPassed}/{result.totalTestCases} tests</span>
        </div>
        <span className="flex items-center gap-1 text-cera-highlight">
          <TrendingUp size={12} /> {result.percentage}%
        </span>
      </div>
    </motion.div>
  );
}
