import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Award,
  MessageSquare,
  Settings,
  CheckCircle2,
  ShieldCheck,
  Send,
} from 'lucide-react';

const typeConfig = {
  Assignment: { icon: FileText, color: 'text-cera-primary', bg: 'bg-cera-primary/10' },
  Submission: { icon: CheckCircle, color: 'text-cera-success', bg: 'bg-cera-success/10' },
  Result: { icon: Award, color: 'text-cera-highlight', bg: 'bg-cera-highlight/10' },
  Achievement: { icon: Award, color: 'text-cera-secondary', bg: 'bg-cera-secondary/10' },
  'Faculty Feedback': { icon: MessageSquare, color: 'text-cera-warning', bg: 'bg-cera-warning/10' },
  System: { icon: Settings, color: 'text-cera-muted', bg: 'bg-cera-muted/10' },
  warning: { icon: AlertTriangle, color: 'text-cera-warning', bg: 'bg-cera-warning/10' },
  error: { icon: ShieldCheck, color: 'text-cera-error', bg: 'bg-cera-error/10' },
  success: { icon: CheckCircle2, color: 'text-cera-success', bg: 'bg-cera-success/10' },
  live: { icon: Send, color: 'text-cera-highlight', bg: 'bg-cera-highlight/10' },
};

export default function NotificationCard({
  notification,
  onMarkRead,
  onDismiss,
  onOpen,
  showMarkRead = false,
  showDismiss = false,
  showOpen = false,
  dismissLabel = 'Dismiss',
}) {
  const { id, title, message, time, type = 'System', read = false, route } = notification;
  const cfg = typeConfig[type] || typeConfig.System;
  const Icon = cfg.icon;

  const handleOpen = () => {
    if (onOpen) onOpen(notification);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-cera-card border rounded-xl p-4 transition-colors ${
        read ? 'border-cera-border' : 'border-cera-primary/30 bg-cera-primary/5 notification-unread'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-cera-text">{title}</h4>
              <p className="text-sm text-cera-muted mt-0.5">{message}</p>
            </div>
            {!read && <span className="w-2 h-2 rounded-full bg-cera-primary shrink-0 mt-1.5" aria-label="Unread" />}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-cera-muted">{time}</span>
            <div className="flex items-center gap-2">
              {showOpen && route && (
                <button
                  type="button"
                  onClick={handleOpen}
                  className="text-xs text-cera-highlight hover:text-cera-primary transition-colors"
                >
                  Open
                </button>
              )}
              {!read && showMarkRead && onMarkRead && (
                <button
                  type="button"
                  onClick={() => onMarkRead(id)}
                  className="text-xs text-cera-highlight hover:text-cera-primary transition-colors"
                >
                  Mark as read
                </button>
              )}
              {showDismiss && onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(id)}
                  className="text-xs text-cera-muted hover:text-cera-error transition-colors"
                  aria-label={`Dismiss ${title}`}
                >
                  {dismissLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
