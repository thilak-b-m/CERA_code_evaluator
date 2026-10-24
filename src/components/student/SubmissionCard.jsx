import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, UserCheck } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate.js';

export default function SubmissionCard({ submission }) {
  const navigate = useNavigate();

  const evaluation = submission.evaluation;
  const score = Number(evaluation?.score);
  const maxScore = Number(submission.maxScore);
  const hasScore = Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0;
  const percentage = hasScore ? Math.round((score / maxScore) * 100) : null;
  const reviewedByAi = evaluation?.source === 'ollama';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/student/submissions/${submission.id}`)}
      role="link"
      tabIndex={0}
      aria-label={`Open submission for ${submission.assignment}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/student/submissions/${submission.id}`);
        }
      }}
      className="interactive-card bg-cera-card rounded-xl p-5 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-cera-text truncate">{submission.assignment}</h3>
          {submission.course && (
            <p className="mt-0.5 text-sm text-cera-muted truncate">{submission.course}</p>
          )}
        </div>
        <StatusBadge status={submission.status} className="ml-2 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md font-mono">
          {submission.language}
        </span>

        {hasScore && (
          <span className={`text-xs px-2.5 py-1 rounded-md font-mono ${
            percentage >= 90
              ? 'text-cera-success bg-cera-success/10'
              : percentage >= 70
                ? 'text-cera-warning bg-cera-warning/10'
                : 'text-cera-error bg-cera-error/10'
          }`}
          >
            {score}/{maxScore}
          </span>
        )}

        {evaluation && (
          <span className="flex items-center gap-1 text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">
            {reviewedByAi ? <Sparkles size={12} /> : <UserCheck size={12} />}
            {reviewedByAi ? 'AI reviewed' : 'Faculty reviewed'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-cera-muted">
        <span>Submitted {formatDate(submission.submittedAt, { year: undefined })}</span>
        {percentage !== null && (
          <span className="font-medium text-cera-highlight">{percentage}%</span>
        )}
      </div>
    </motion.div>
  );
}
