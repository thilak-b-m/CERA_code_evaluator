import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import NotificationCard from '../../components/student/NotificationCard';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import { studentService } from '../../services/studentService';

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'Assignment', label: 'Assignments' },
  { value: 'Submission', label: 'Submissions' },
  { value: 'Result', label: 'Results' },
  { value: 'Achievement', label: 'Achievements' },
  { value: 'Faculty Feedback', label: 'Feedback' },
  { value: 'System', label: 'System' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      const data = await studentService.getNotifications();
      setNotifications(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) return <Loading type="rows" count={5} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cera-primary/10 flex items-center justify-center">
            <Bell size={20} className="text-cera-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-cera-text">Notifications</h2>
            <p className="text-sm text-cera-muted">{unreadCount} unread of {notifications.length} total</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" icon={CheckCheck} onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-cera-primary text-white'
                : 'bg-cera-elevated text-cera-muted hover:text-cera-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications"
          description="You're all caught up. New notifications will appear here."
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
