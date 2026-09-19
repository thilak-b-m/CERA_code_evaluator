import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Award } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';

export default function AssignmentCard({ assignment, compact = false }) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`/student/assignments/${assignment.id}`);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const daysLeft = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3 && daysLeft >= 0 && assignment.status !== 'Completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={handleClick}
      className="bg-cera-card border border-cera-border rounded-xl p-5 cursor-pointer hover:border-cera-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-cera-text mb-1">{assignment.title}</h3>
          {!compact && <p className="text-sm text-cera-muted line-clamp-2">{assignment.description}</p>}
        </div>
        <StatusBadge status={assignment.difficulty} className="ml-2 shrink-0" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">{assignment.subject}</span>
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">{assignment.problemCount} problems</span>
        <span className="text-xs text-cera-muted bg-cera-elevated px-2.5 py-1 rounded-md">{assignment.marks} marks</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-cera-muted">Progress</span>
          <span className="text-xs text-cera-text font-medium">{assignment.progress}%</span>
        </div>
        <ProgressBar value={assignment.progress} color={assignment.status === 'Completed' ? 'success' : 'primary'} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className={isUrgent ? 'text-cera-error' : 'text-cera-muted'} />
          <span className={`text-xs ${isUrgent ? 'text-cera-error font-medium' : 'text-cera-muted'}`}>
            Due {formatDate(assignment.dueDate)}
            {isUrgent && ` (${daysLeft}d left)`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/student/assignments/${assignment.id}`);
          }}
          className="text-cera-highlight hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors"
        >
          {assignment.status === 'Completed' ? 'View' : assignment.status === 'In Progress' ? 'Continue' : 'Start'}
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
