import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Cpu } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function SubmissionCard({ submission }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(`/student/submissions/${submission.id}`)}
      className="bg-cera-card border border-cera-border rounded-xl p-5 cursor-pointer hover:border-cera-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-cera-text">{submission.assignment}</h3>
          <p className="text-sm text-cera-muted mt-0.5">{submission.problem}</p>
        </div>
        <StatusBadge status={submission.status} className="ml-2 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md font-mono">{submission.language}</span>
        <span className={`text-xs px-2.5 py-1 rounded-md font-mono ${submission.score >= 90 ? 'text-cera-success bg-cera-success/10' : submission.score >= 70 ? 'text-cera-warning bg-cera-warning/10' : 'text-cera-error bg-cera-error/10'}`}>
          {submission.score}/100
        </span>
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">
          {submission.testCasesPassed}/{submission.totalTestCases} tests
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-cera-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} /> {submission.executionTime}ms
          </span>
          <span className="flex items-center gap-1">
            <Cpu size={12} /> {submission.memoryUsage}MB
          </span>
        </div>
        <span>{new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </motion.div>
  );
}
