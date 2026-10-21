import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
  title,
  kicker,
  action,
  ...props
}) {
  const hasHeader = title || kicker || action;

  return (
    <motion.div
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`bg-cera-card border border-cera-border rounded-xl ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="panel-header">
          <div>
            {title && <div className="panel-title">{title}</div>}
            {kicker && <div className="panel-kicker">{kicker}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
