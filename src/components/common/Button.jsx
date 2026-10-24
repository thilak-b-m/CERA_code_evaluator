import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  success: 'btn-success',
  error: 'btn-error',
  danger: 'btn-danger',
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
      whileTap={{ scale: disabled || loading ? 1 : 0.99 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${size} ${variants[variant] || variants.primary} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
