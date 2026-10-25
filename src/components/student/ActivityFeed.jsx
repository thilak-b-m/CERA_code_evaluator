import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate.js';

export default function ActivityFeed({ submissions }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    if (status === 'published') return 'bg-cera-success';
    return 'bg-cera-warning';
  };

  return (
    <div className="divide-y divide-cera-border">
      {submissions.slice(0, 5).map((sub, index) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/student/submissions/${sub.id}`)}
            role="link"
            tabIndex={0}
            aria-label={`Open submission for ${sub.assignment}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/student/submissions/${sub.id}`);
              }
            }}
            className="flex items-center gap-3 cursor-pointer hover:bg-cera-elevated p-3 rounded-lg transition-colors"
          style={{ margin: '0 4px' }}
          >
            <div className={`w-2 h-2 rounded-full ${getStatusColor(sub.evaluation?.status)} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-cera-text truncate">{sub.assignment}</p>
              <p className="text-xs text-cera-muted">
                {sub.language} · {sub.evaluation?.status === 'published' ? 'Feedback published' : 'Awaiting review'}
              </p>
            </div>
            <span className="text-xs text-cera-muted shrink-0">
              {formatDate(sub.submittedAt, { year: undefined })}
            </span>
          </motion.div>
      ))}
    </div>
  );
}
