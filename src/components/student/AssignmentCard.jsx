import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Award } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate.js';
import ProgressBar from '../common/ProgressBar';

export default function AssignmentCard({ assignment, compact = false }) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`/student/assignments/${assignment.id}`);

  const daysLeft = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3 && daysLeft >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      aria-label={`Open assignment: ${assignment.title}`}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      className="interactive-card bg-cera-card rounded-xl p-5 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-cera-text mb-1">{assignment.title}</h3>
          {!compact && <p className="text-sm text-cera-muted line-clamp-2">{assignment.description}</p>}
        </div>
        <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={assignment.difficulty} />
          <StatusBadge status={assignment.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">{assignment.subject}</span>
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">{assignment.marks} marks</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className={isUrgent ? 'text-cera-error' : 'text-cera-muted'} />
          <span className={`text-xs ${isUrgent ? 'text-cera-error font-medium' : 'text-cera-muted'}`}>
            Due {formatDate(assignment.dueDate, { year: undefined })}
            {isUrgent && ` (${daysLeft}d left)`}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/student/assignments/${assignment.id}`);
          }}
          className="text-cera-highlight hover:text-cera-primary text-sm font-medium flex items-center gap-1 transition-colors"
        >
          {assignment.status === 'Submitted'
            ? 'Review'
            : assignment.status === 'In Progress'
              ? 'Continue'
              : 'Start'}
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-cera-muted">
          <span>Progress</span>
          <span>{assignment.progress}%</span>
        </div>
        <ProgressBar
          value={assignment.progress}
          color={assignment.status === 'Submitted' ? 'success' : 'primary'}
        />
      </div>
    </motion.div>
  );
}
