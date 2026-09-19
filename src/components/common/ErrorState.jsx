import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-cera-error/10 flex items-center justify-center mb-4">
        <AlertTriangle size={32} className="text-cera-error" />
      </div>
      <h3 className="text-lg font-semibold text-cera-text mb-2">Error</h3>
      <p className="text-cera-muted text-sm max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </motion.div>
  );
}
