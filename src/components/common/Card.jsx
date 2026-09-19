import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, onClick, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`bg-cera-card border border-cera-border rounded-xl ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
