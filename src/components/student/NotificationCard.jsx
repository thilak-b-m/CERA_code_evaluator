import { motion } from 'framer-motion';
import { FileText, CheckCircle, AlertTriangle, Bell, Award, MessageSquare, Settings } from 'lucide-react';

const typeConfig = {
  Assignment: { icon: FileText, color: 'text-cera-primary', bg: 'bg-cera-primary/10' },
  Submission: { icon: CheckCircle, color: 'text-cera-success', bg: 'bg-cera-success/10' },
  Result: { icon: Award, color: 'text-cera-highlight', bg: 'bg-cera-highlight/10' },
  Achievement: { icon: Award, color: 'text-cera-secondary', bg: 'bg-cera-secondary/10' },
  'Faculty Feedback': { icon: MessageSquare, color: 'text-cera-warning', bg: 'bg-cera-warning/10' },
  System: { icon: Settings, color: 'text-cera-muted', bg: 'bg-cera-muted/10' },
};

function timeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffD > 0) return `${diffD}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  const diffM = Math.floor(diffMs / (1000 * 60));
  return diffM > 0 ? `${diffM}m ago` : 'Just now';
}

export default function NotificationCard({ notification, onMarkRead, onDelete }) {
  const cfg = typeConfig[notification.type] || typeConfig.System;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-cera-card border rounded-xl p-4 transition-colors ${
        notification.read ? 'border-cera-border' : 'border-cera-primary/30 bg-cera-primary/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-cera-text">{notification.title}</h4>
              <p className="text-sm text-cera-muted mt-0.5">{notification.message}</p>
            </div>
            {!notification.read && <span className="w-2 h-2 rounded-full bg-cera-primary shrink-0 mt-1.5" />}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-cera-muted">{timeAgo(notification.timestamp)}</span>
            <div className="flex items-center gap-2">
              {!notification.read && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="text-xs text-cera-highlight hover:text-cyan-300 transition-colors"
                >
                  Mark as read
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="text-xs text-cera-muted hover:text-cera-error transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
