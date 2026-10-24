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
  const isInteractive = hover || Boolean(onClick);

  return (
    <motion.div
      whileHover={isInteractive ? { y: -2, transition: { duration: 0.18 } } : undefined}
      onClick={onClick}
      className={`panel bg-cera-card ${isInteractive ? 'interactive-card' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
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
