import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, X, CheckCheck } from 'lucide-react';
import NotificationCard from './NotificationCard';
import EmptyState from './EmptyState';
import Loading from './Loading';
import Button from './Button';
import Page from './Page';

export default function NotificationsPage({
  eyebrow = 'CERA / FACULTY',
  title = 'Notifications',
  subtitle,
  items = [],
  loading = false,
  error = '',
  filters,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onOpen,
  showMarkAllRead = true,
  showSearch = true,
  dismissLabel = 'Dismiss',
  showMarkReadButton = false,
  showDismissButton = false,
  showOpenButton = false,
  emptyIcon: EmptyIcon = null,
  emptyTitle = 'No notifications',
  emptyDesc = 'New activity will appear here.',
  searchPlaceholder = 'Search notifications\u2026',
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter !== 'all' && n.type !== filter) return false;
      if (!query) return true;
      const haystack = [n.title, n.message, n.time, n.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, search, filter]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    if (onMarkAllRead) onMarkAllRead();
  };
  const handleClearSearch = () => setSearch('');

  const pageSubtitle = subtitle || `${unreadCount} unread of ${items.length} total`;

  if (loading) {
    return (
      <Page eyebrow={eyebrow} title={title} subtitle={pageSubtitle || 'Loading your notifications\u2026'}>
        <Loading type="rows" count={5} />
      </Page>
    );
  }

  if (error) {
    return (
      <Page eyebrow={eyebrow} title={title} subtitle={pageSubtitle || 'Stay up to date with your course activity.'}>
        <div role="alert" className="panel p-5">{error}</div>
      </Page>
    );
  }

  const markAllReadActions =
    showMarkAllRead && unreadCount > 0 && (
      <Button variant="ghost" icon={CheckCheck} onClick={handleMarkAllRead}>
        Mark All Read
      </Button>
    );

  return (
    <Page eyebrow={eyebrow} title={title} subtitle={pageSubtitle} actions={markAllReadActions}>
      <div className="space-y-5">
        {filters && filters.length && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
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
        )}

        {showSearch && (
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cera-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-base pl-10 w-full"
              aria-label="Search notifications"
            />
            {search.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cera-muted hover:text-cera-text"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={EmptyIcon}
            title={items.length === 0 ? emptyTitle : 'No notifications found'}
            description={search.trim() ? 'Try a different search.' : emptyDesc}
            action={
              items.length > 0 && search.trim() && (
                <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                  Clear search
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                  onOpen={onOpen}
                  showMarkRead={showMarkReadButton}
                  showDismiss={showDismissButton}
                  showOpen={showOpenButton}
                  dismissLabel={dismissLabel}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Page>
  );
}
