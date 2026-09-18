import { CheckCircle, Clock, AlertCircle, XCircle, Loader2, MinusCircle } from 'lucide-react';

const config = {
  Passed: { color: 'text-cera-success', bg: 'bg-cera-success/10', border: 'border-cera-success/30', icon: CheckCircle },
  Failed: { color: 'text-cera-error', bg: 'bg-cera-error/10', border: 'border-cera-error/30', icon: XCircle },
  'Partially Passed': { color: 'text-cera-warning', bg: 'bg-cera-warning/10', border: 'border-cera-warning/30', icon: AlertCircle },
  Evaluating: { color: 'text-cera-primary', bg: 'bg-cera-primary/10', border: 'border-cera-primary/30', icon: Loader2 },
  Pending: { color: 'text-cera-muted', bg: 'bg-cera-muted/10', border: 'border-cera-muted/30', icon: Clock },
  'Not Started': { color: 'text-cera-muted', bg: 'bg-cera-muted/10', border: 'border-cera-muted/30', icon: MinusCircle },
  'In Progress': { color: 'text-cera-warning', bg: 'bg-cera-warning/10', border: 'border-cera-warning/30', icon: Clock },
  Submitted: { color: 'text-cera-primary', bg: 'bg-cera-primary/10', border: 'border-cera-primary/30', icon: CheckCircle },
  Completed: { color: 'text-cera-success', bg: 'bg-cera-success/10', border: 'border-cera-success/30', icon: CheckCircle },
  Expired: { color: 'text-cera-error', bg: 'bg-cera-error/10', border: 'border-cera-error/30', icon: XCircle },
  Solved: { color: 'text-cera-success', bg: 'bg-cera-success/10', border: 'border-cera-success/30', icon: CheckCircle },
  Unsolved: { color: 'text-cera-muted', bg: 'bg-cera-muted/10', border: 'border-cera-muted/30', icon: MinusCircle },
  Attempted: { color: 'text-cera-warning', bg: 'bg-cera-warning/10', border: 'border-cera-warning/30', icon: AlertCircle },
  Easy: { color: 'text-cera-success', bg: 'bg-cera-success/10', border: 'border-cera-success/30', icon: null },
  Medium: { color: 'text-cera-warning', bg: 'bg-cera-warning/10', border: 'border-cera-warning/30', icon: null },
  Hard: { color: 'text-cera-error', bg: 'bg-cera-error/10', border: 'border-cera-error/30', icon: null },
};

export default function StatusBadge({ status, className = '' }) {
  const cfg = config[status] || config['Pending'];
  const Icon = cfg.icon;

  return (
    <span
      className={`status-badge ${cfg.color} ${cfg.bg} border ${cfg.border} ${className}`}
    >
      {Icon && <Icon size={12} className={status === 'Evaluating' ? 'animate-spin' : ''} />}
      {status}
    </span>
  );
}
