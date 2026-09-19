import { motion } from 'framer-motion';

const colors = {
  primary: 'bg-cera-primary',
  success: 'bg-cera-success',
  warning: 'bg-cera-warning',
  error: 'bg-cera-error',
  highlight: 'bg-cera-highlight',
  secondary: 'bg-cera-secondary',
};

export default function ProgressBar({ value, max = 100, color = 'primary', className = '', showLabel = false, height = 'h-2' }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-cera-muted">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-cera-elevated rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`${colors[color] || colors.primary} h-full rounded-full`}
        />
      </div>
    </div>
  );
}
