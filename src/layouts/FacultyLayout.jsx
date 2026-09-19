import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ClipboardCheck,
  FileCode2,
  FileText,
  Gauge,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings2,
  Sun,
  TestTube2,
  Users,
} from 'lucide-react';

import ceraLogo from '../assets/images/cera-logo.png';
import { useApp } from '../context/AppContext.jsx';
import { getSubmissions } from '../services/submissionService.js';
import { getEvaluation } from '../services/evaluationService.js';

const navSections = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', '/dashboard', LayoutDashboard],
      ['Live lab', '/live-lab', Activity],
      ['Assignments', '/assignments', BookOpen],
      ['Submissions', '/submissions', FileCode2],
      [
        'Evaluation queue',
        '/evaluation-queue',
        ClipboardCheck,
      ],
    ],
  },
  {
    label: 'Understand',
    items: [
      ['Students', '/students', Users],
      [
        'Difficulty analysis',
        '/difficulty-analysis',
        Gauge,
      ],
      ['Analytics', '/analytics', BarChart3],
      ['Reports', '/reports', FileText],
    ],
  },
  {
    label: 'Quality',
    items: [
      ['Test cases', '/test-cases', TestTube2],
      ['AI review', '/ai-review', BrainCircuit],
      ['Plagiarism', '/plagiarism', GitCompare],
    ],
  },
];

export default function FacultyLayout({
  children,
}) {
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] =
    useState(false);

  const {
    theme,
    setTheme,
    notify,
    profile,
  } = useApp();

  const [location, setLocation] =
    useLocation();

  const pageName =
    location
      .split('/')[1]
      ?.replaceAll('-', ' ') ||
    'dashboard';
    const evaluationQueueCount =
  getSubmissions().filter((submission) => {
    const evaluation =
      getEvaluation(submission.id);

    return (
      submission.hasSubmittedCode &&
      evaluation?.status !== 'Published'
    );
  }).length;

  /*
   * GLOBAL CERA SEARCH
   *
   * Uses the existing navSections data.
   * No separate hardcoded route list.
   */
  const handleGlobalSearch = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    const query = event.target.value
      .trim()
      .toLowerCase();

    if (!query) {
      return;
    }

    /*
     * Flatten the existing navigation
     * configuration into one searchable list.
     */
    const navigationItems =
      navSections.flatMap(
        (section) => section.items
      );

    /*
     * Search by the existing navigation label.
     *
     * First preference:
     * label starts with the search text.
     *
     * Second preference:
     * label contains the search text.
     */
    const match =
      navigationItems.find(
        ([label]) =>
          label
            .toLowerCase()
            .startsWith(query)
      ) ||
      navigationItems.find(
        ([label]) =>
          label
            .toLowerCase()
            .includes(query)
      );

    if (!match) {
      notify(
        'No matching CERA page found'
      );
      return;
    }

    const [, route] = match;

    setLocation(route);

    event.target.value = '';
  };

  const handleSignOut = () => {
    localStorage.removeItem('cera-auth');
    localStorage.removeItem(
      'cera-user-email'
    );

    sessionStorage.removeItem(
      'cera-auth'
    );
    sessionStorage.removeItem(
      'cera-user-email'
    );

    notify('Signed out of CERA');

    setTimeout(() => {
      setLocation('/dashboard');
    }, 300);
  };

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${
          open ? 'open' : ''
        }`}
      >
        <div
          style={{
            padding: '22px 20px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <div
            className="brand-mark"
            aria-label="CERA logo"
          >
            <img
              src={ceraLogo}
              alt="CERA"
              style={{
                width: 52,
                height: 52,
                objectFit: 'contain',
                display: 'block',
                transform: 'scale(1.5)',
              }}
            />
          </div>

          <div>
            <div className="logo-word">
              CERA
            </div>

            <div
              style={{
                color: 'var(--text)',
                fontSize: 9,
                marginTop: 2,
              }}
            >
              Code Execution, Review and
              Assessment
            </div>

            <div
              style={{
                color: 'var(--muted)',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Learn, execute, excel
            </div>
          </div>

          <button
            type="button"
            className="icon-btn"
            style={{
              marginLeft: 'auto',
            }}
            onClick={() =>
              setOpen(false)
            }
            aria-label="Close menu"
          >
            <PanelLeftClose
              size={17}
            />
          </button>
        </div>

        <div
          style={{
            padding: '0 10px 14px',
          }}
        >
          <div
            style={{
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() =>
                setProfileMenuOpen(
                  !profileMenuOpen
                )
              }
              style={{
                width: '100%',
                background:
                  'var(--surface)',
                border:
                  '1px solid var(--border)',
                borderRadius: 9,
                padding: 10,
                display: 'flex',
                gap: 9,
                alignItems: 'center',
                color: 'var(--text)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              aria-expanded={
                profileMenuOpen
              }
              aria-label="Open faculty profile menu"
            >
              <div
                className="avatar"
                style={{
                  background:
                    'linear-gradient(135deg,#22D3EE,#6366F1)',
                }}
              >
                {`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()}
              </div>

              <div
                style={{
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {profile.firstName}{' '}
                  {profile.lastName}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color:
                      'var(--muted)',
                  }}
                >
                  Computer Science
                </div>
              </div>

              <ChevronDown
                size={14}
                color="var(--muted)"
                style={{
                  marginLeft: 'auto',
                  transform:
                    profileMenuOpen
                      ? 'rotate(180deg)'
                      : 'rotate(0deg)',
                  transition:
                    'transform .2s ease',
                }}
              />
            </button>

            {profileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 6px)',
                  zIndex: 50,
                  background:
                    'var(--surface)',
                  border:
                    '1px solid var(--border)',
                  borderRadius: 9,
                  padding: 6,
                  boxShadow:
                    '0 12px 30px rgba(0,0,0,.25)',
                }}
              >
                <Link
                  href="/profile"
                  className="sidebar-link"
                  onClick={() =>
                    setProfileMenuOpen(
                      false
                    )
                  }
                >
                  <Users size={16} />
                  <span>
                    View profile
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div
          className="sidebar-nav"
          style={{
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {navSections.map(
            (section) => (
              <div
                key={section.label}
              >
                <div className="sidebar-section">
                  {section.label}
                </div>

                {section.items.map(
                  ([
                    label,
                    href,
                    Icon,
                  ]) => (
                    <Link
                      key={href}
                      href={href}
                      className={`sidebar-link ${
                        location === href ||
                        (href !==
                          '/dashboard' &&
                          location.startsWith(
                            href + '/'
                          ))
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        setOpen(false)
                      }
                      data-testid={`link-${label
                        .toLowerCase()
                        .replaceAll(
                          ' ',
                          '-'
                        )}`}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.8}
                      />

                      <span>
                        {label}
                      </span>

                      {label ===
                        'Evaluation queue' && (
                        <span
                          style={{
                            marginLeft:
                              'auto',
                            font:
                              '10px var(--app-font-mono)',
                            color:
                              'var(--accent)',
                          }}
                        >
                          {evaluationQueueCount}
                        </span>
                      )}
                    </Link>
                  )
                )}
              </div>
            )
          )}
        </div>

        <div
          style={{
            padding: '12px 10px',
            borderTop:
              '1px solid var(--border)',
          }}
        >
          <Link
            href="/notifications"
            className="sidebar-link"
          >
            <Bell size={16} />

            <span>
              Notifications
            </span>

            <span
              style={{
                marginLeft: 'auto',
                width: 6,
                height: 6,
                borderRadius: 9,
                background:
                  'var(--accent)',
              }}
            />
          </Link>

          <Link
            href="/settings"
            className="sidebar-link"
          >
            <Settings2 size={16} />

            <span>
              Settings
            </span>
          </Link>

          <button
            type="button"
            className="sidebar-link"
            style={{
              border: 0,
              background:
                'transparent',
              width:
                'calc(100% - 20px)',
              cursor: 'pointer',
            }}
            onClick={
              handleSignOut
            }
          >
            <LogOut size={16} />

            <span>
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="icon-btn mobile-menu"
              onClick={() =>
                setOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>

            <div
              style={{
                color:
                  'var(--muted)',
                fontSize: 12,
                textTransform:
                  'capitalize',
              }}
            >
              Workspace

              <span
                style={{
                  margin: '0 7px',
                  opacity: 0.5,
                }}
              >
                /
              </span>

              <span
                style={{
                  color:
                    'var(--text)',
                }}
              >
                {pageName}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <div className="search-box hide-mobile">
              <Search size={15} />

              <input
                className="input"
                placeholder="Search CERA..."
                aria-label="Search CERA"
                onKeyDown={
                  handleGlobalSearch
                }
              />
            </div>

            <Link
              href="/notifications"
              className="icon-btn"
              aria-label="Notifications"
              data-testid="link-notifications"
            >
              <Bell size={18} />

              <span
                style={{
                  position:
                    'absolute',
                  margin:
                    '-18px 0 0 16px',
                  width: 6,
                  height: 6,
                  borderRadius: 6,
                  background:
                    'var(--accent)',
                }}
              />
            </Link>

            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setTheme(
                  theme === 'dark'
                    ? 'light'
                    : 'dark'
                );

                notify(
                  `${
                    theme === 'dark'
                      ? 'Light'
                      : 'Dark'
                  } theme enabled`
                );
              }}
              aria-label="Toggle theme"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>

            <Link
              href="/profile"
              className="avatar"
              style={{
                width: 33,
                height: 33,
              }}
              aria-label="Open profile"
            >
              {`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()}
            </Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}