import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function ActivityFeed({ submissions }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    if (status === 'Passed') return 'bg-cera-success';
    if (status === 'Failed') return 'bg-cera-error';
    return 'bg-cera-warning';
  };

  return (
    <div className="bg-cera-card border border-cera-border rounded-xl p-5">
      <h3 className="font-semibold text-cera-text mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {submissions.slice(0, 5).map((sub, index) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/student/submissions/${sub.id}`)}
            className="flex items-center gap-3 cursor-pointer hover:bg-cera-elevated/50 p-2 rounded-lg transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${getStatusColor(sub.status)} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-cera-text truncate">{sub.problem}</p>
              <p className="text-xs text-cera-muted">{sub.language} · {sub.testCasesPassed}/{sub.totalTestCases} tests</p>
            </div>
            <span className="text-xs text-cera-muted shrink-0">
              {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
