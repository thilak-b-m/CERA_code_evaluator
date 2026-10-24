import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Check,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Send,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationService } from '../../services/notificationService.js';

export default function Notifications() {
  const { notify } = useApp();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD NOTIFICATIONS
  ========================= */

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      try {
        const notifications =
          await notificationService.list(token);

        if (mounted) {
          setItems(notifications);
        }
      } catch (error) {
        console.error(
          'Error loading notifications:',
          error
        );

        if (mounted) {
          notify('Unable to load notifications');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [notify, token]);

  /* =========================
     SEARCH
  ========================= */

  const filteredNotifications = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((notification) => {
      const searchableText = [
        notification.title,
        notification.message,
        notification.time,
        notification.tone,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined
        )
        .map((value) =>
          String(value).toLowerCase()
        )
        .join(' ');

      return searchableText.includes(query);
    });
  }, [items, search]);

  /* =========================
     UNREAD COUNT
  ========================= */

  const unreadCount = useMemo(
    () =>
      items.filter(
        (notification) => !notification.read
      ).length,
    [items]
  );

  /* =========================
     MARK ALL AS READ
  ========================= */

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      notify('All notifications are already read');
      return;
    }

    try {
      const updated =
        await notificationService.markAllAsRead(token);

      setItems(updated);

      notify('All notifications marked as read');
    } catch (error) {
      console.error(
        'Error marking notifications as read:',
        error
      );

      notify(
        'Unable to mark notifications as read'
      );
    }
  };

  /* =========================
     OPEN NOTIFICATION
  ========================= */

  const handleNotificationClick = async (
    notification
  ) => {
    try {
      if (!notification.read) {
        const updated =
          await notificationService.markRead(
            notification.id,
            token,
          );

        setItems(updated);
      }
    } catch (error) {
      console.error(
        'Error marking notification as read:',
        error
      );
    }

    if (!notification?.route) {
      notify(
        'This notification has no destination'
      );
      return;
    }

    navigate(notification.route);
  };

  /* =========================
     DISMISS
  ========================= */

  const handleDismiss = async (id) => {
    try {
      const updated =
        await notificationService.dismiss(id, token);

      setItems(updated);

      notify('Notification dismissed');
    } catch (error) {
      console.error(
        'Error dismissing notification:',
        error
      );

      notify('Unable to dismiss notification');
    }
  };

  /* =========================
     ICON
  ========================= */

  const getIcon = (tone) => {
    if (tone === 'warning') {
      return <AlertTriangle size={15} />;
    }

    if (tone === 'error') {
      return <ShieldCheck size={15} />;
    }

    if (tone === 'success') {
      return <FileText size={15} />;
    }

    return <Send size={15} />;
  };

  /* =========================
     COLOR
  ========================= */

  const getColor = (tone) => {
    if (tone === 'live') {
      return 'var(--accent)';
    }

    return `var(--${tone})`;
  };

  /* =========================
     CLEAR SEARCH
  ========================= */

  const handleClearSearch = () => {
    setSearch('');
  };

  return (
    <Page
      title="Notifications"
      subtitle="The important signals, without the noise."
      actions={
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleMarkAllRead}
          disabled={
            loading ||
            items.length === 0
          }
        >
          <Check size={14} />
          Mark all read
        </button>
      }
    >
      <div style={{ maxWidth: 820 }}>
        {/* SEARCH */}

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search notifications..."
          className="mb-3"
        />

        {/* SEARCH STATUS */}

        {search.trim() !== '' && (
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-cera-muted">
            <span className="flex items-center gap-2">
              <Filter size={14} />
              {filteredNotifications.length} matching notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClearSearch}
            >
              Clear search
            </button>
          </div>
        )}

        {/* NOTIFICATION LIST */}

        <div className="panel">
          {loading ? (
            <div
              className="empty"
              style={{ padding: 50 }}
            >
              Loading notifications...
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(
              (notification) => (
                <div
                  className="activity-item"
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  role={
                    notification.route
                      ? 'button'
                      : undefined
                  }
                  tabIndex={
                    notification.route
                      ? 0
                      : undefined
                  }
                  onKeyDown={(event) => {
                    if (
                      !notification.route
                    ) {
                      return;
                    }

                    if (
                      event.key === 'Enter' ||
                      event.key === ' '
                    ) {
                      event.preventDefault();

                      handleNotificationClick(
                        notification
                      );
                    }
                  }}
                  style={{
                    cursor: notification.route
                      ? 'pointer'
                      : 'default',

                    /*
                     * Read notifications remain visible,
                     * but are visually quieter.
                     */
                    opacity: notification.read
                      ? 0.65
                      : 1,
                  }}
                >
                  {/* ICON */}

                  <div
                    className="kpi-icon"
                    style={{
                      color: getColor(
                        notification.tone
                      ),
                      opacity: notification.read
                        ? 0.7
                        : 1,
                    }}
                  >
                    {getIcon(
                      notification.tone
                    )}
                  </div>

                  {/* CONTENT */}

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 13,
                        fontWeight:
                          notification.read
                            ? 600
                            : 700,
                      }}
                    >
                      {notification.title}

                      {!notification.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              'var(--accent)',
                            flexShrink: 0,
                          }}
                          aria-label="Unread"
                        />
                      )}
                    </div>

                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {notification.message}
                    </div>

                    <div
                      style={{
                        color: 'var(--muted)',
                        fontSize: 10,
                        marginTop: 8,
                      }}
                    >
                      {notification.time}
                    </div>
                  </div>

                  {/* DISMISS */}

                  <button
                    type="button"
                    className="icon-btn"
                    onClick={(event) => {
                      event.stopPropagation();

                      handleDismiss(
                        notification.id
                      );
                    }}
                    aria-label={`Dismiss ${notification.title}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              )
            )
          ) : (
            <div
              className="empty"
              style={{
                padding: 50,
              }}
            >
              <CheckCircle2 size={30} />

              <div
                style={{
                  color: 'var(--text)',
                  fontWeight: 700,
                }}
              >
                {items.length === 0
                  ? 'You’re all caught up'
                  : 'No notifications found'}
              </div>

              <p
                style={{
                  fontSize: 12,
                }}
              >
                {items.length === 0
                  ? 'New activity will appear here.'
                  : 'Try a different search.'}
              </p>

              {items.length > 0 &&
                search.trim() !== '' && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={
                      handleClearSearch
                    }
                  >
                    Clear search
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
