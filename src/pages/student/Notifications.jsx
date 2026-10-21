import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import NotificationCard from '../../components/student/NotificationCard';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

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
  const { notify } = useApp();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await notificationService.list(token);
        if (!cancelled) setNotifications(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || 'Unable to load notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id) => {
    try {
      setNotifications(await notificationService.markRead(id, token));
    } catch (requestError) {
      notify(requestError.message || 'Unable to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(await notificationService.markAllAsRead(token));
    } catch (requestError) {
      notify(requestError.message || 'Unable to mark notifications as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      setNotifications(await notificationService.dismiss(id, token));
    } catch (requestError) {
      notify(requestError.message || 'Unable to dismiss notification.');
    }
  };

  const handleOpen = async (notification) => {
    try {
      if (!notification.read) {
        setNotifications(await notificationService.markRead(notification.id, token));
      }
      navigate(notification.route);
    } catch (requestError) {
      notify(requestError.message || 'Unable to open notification.');
    }
  };

  if (loading) return <Loading type="rows" count={5} />;
  if (error) return <div role="alert" className="panel p-5">{error}</div>;

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
                onOpen={handleOpen}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
