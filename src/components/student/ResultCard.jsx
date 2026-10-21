import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';
import { formatDate } from '../../utils/formatDate.js';

export default function ResultCard({ result }) {
  const navigate = useNavigate();

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
        <span className="text-2xl font-bold text-cera-success">
          {result.percentage}%
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
        <span>Submitted {formatDate(result.submittedAt)}</span>
        <span className="text-cera-highlight">Published</span>
      </div>
    </motion.div>
  );
}
