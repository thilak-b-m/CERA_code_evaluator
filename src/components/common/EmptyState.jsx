import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-cera-elevated flex items-center justify-center mb-4">
          <Icon size={32} className="text-cera-muted" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-cera-text mb-2">{title}</h3>
      {description && <p className="text-cera-muted text-sm max-w-md mb-6">{description}</p>}
      {action}
    </motion.div>
  );
}
