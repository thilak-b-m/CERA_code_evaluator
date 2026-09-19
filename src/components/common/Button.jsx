import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-cera-primary hover:bg-indigo-500 text-white',
  secondary: 'bg-cera-secondary hover:bg-violet-500 text-white',
  ghost: 'bg-cera-elevated hover:bg-slate-700/50 text-cera-text',
  outline: 'border border-cera-border hover:border-cera-primary text-cera-text',
  success: 'bg-cera-success hover:bg-emerald-500 text-white',
  error: 'bg-cera-error hover:bg-rose-500 text-white',
  danger: 'bg-transparent border border-cera-error text-cera-error hover:bg-rose-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconSize = 16,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={iconSize} />
      ) : (
        Icon && <Icon size={iconSize} />
      )}
      {children}
    </motion.button>
  );
}
