import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BellOff } from 'lucide-react';

import NotificationsPage from '../../components/common/Notifications.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/notificationService.js';
import { formatTimeAgo } from '../../utils/formatDate.js';

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
    return () => { cancelled = true; };
  }, [token]);

  const normalizedItems = useMemo(() =>
    notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: formatTimeAgo(n.timestamp),
      type: n.type,
      read: n.read,
      route: n.route,
    })),
    [notifications]
  );

  const unreadCount = normalizedItems.filter((n) => !n.read).length;

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

  const handleDismiss = async (id) => {
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
    } catch (requestError) {
      notify(requestError.message || 'Unable to open notification.');
    }
    navigate(notification.route);
  };

  return (
    <NotificationsPage
      eyebrow="STUDENT / INBOX"
      title="Notifications"
      items={normalizedItems}
      loading={loading}
      error={error}
      filters={typeFilters}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      onOpen={handleOpen}
      onDismiss={handleDismiss}
      showMarkReadButton={true}
      showDismissButton={true}
      showOpenButton={true}
      dismissLabel="Delete"
      emptyIcon={BellOff}
      emptyTitle="No notifications"
      emptyDesc="You're all caught up. New notifications will appear here."
    />
  );
}
