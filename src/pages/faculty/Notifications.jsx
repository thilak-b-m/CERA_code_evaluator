import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CheckCircle2 } from 'lucide-react';

import NotificationsPage from '../../components/common/Notifications.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/notificationService.js';

export default function Notifications() {
  const { notify } = useApp();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      try {
        const notifications = await notificationService.list(token);
        if (mounted) setItems(notifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
        if (mounted) notify('Unable to load notifications');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadNotifications();
    return () => { mounted = false; };
  }, [notify, token]);

  const normalizedItems = useMemo(() =>
    items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      time: n.time,
      type: n.tone || 'System',
      read: n.read,
      route: n.route,
    })),
    [items]
  );

  const unreadCount = normalizedItems.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      notify('All notifications are already read');
      return;
    }
    try {
      const updated = await notificationService.markAllAsRead(token);
      setItems(updated);
      notify('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      notify('Unable to mark notifications as read');
    }
  };

  const handleOpen = async (notification) => {
    try {
      if (!notification.read) {
        const updated = await notificationService.markRead(notification.id, token);
        setItems(updated);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
    if (!notification?.route) {
      notify('This notification has no destination');
      return;
    }
    navigate(notification.route);
  };

  const handleDismiss = async (id) => {
    try {
      const updated = await notificationService.dismiss(id, token);
      setItems(updated);
      notify('Notification dismissed');
    } catch (error) {
      console.error('Error dismissing notification:', error);
      notify('Unable to dismiss notification');
    }
  };

  return (
    <NotificationsPage
      title="Notifications"
      subtitle="The important signals, without the noise."
      items={normalizedItems}
      loading={loading}
      onMarkAllRead={handleMarkAllRead}
      onOpen={handleOpen}
      onDismiss={handleDismiss}
      showMarkReadButton={false}
      showDismissButton={true}
      showOpenButton={true}
      dismissLabel="Dismiss"
      emptyIcon={CheckCircle2}
      emptyTitle="You’re all caught up"
      emptyDesc="New activity will appear here."
    />
  );
}
