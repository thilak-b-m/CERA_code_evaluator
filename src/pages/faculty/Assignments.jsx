import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Undo2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import SearchBar from '../../components/common/SearchBar.jsx';
import {
  getAssignments,
  deleteAssignment,
  restoreAssignment,
} from '../../services/assignmentService.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/formatDate.js';

export default function Assignments() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [assignmentList, setAssignmentList] = useState([]);
  const [lastDeleted, setLastDeleted] = useState(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const { notify } = useApp();
  const { token } = useAuth();
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  /* =========================
     LOAD ASSIGNMENTS
  ========================= */

  useEffect(() => {
    let cancelled = false;
    getAssignments(token)
      .then((assignments) => {
        if (!cancelled) setAssignmentList(assignments);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  /* =========================
     ASSIGNMENT STATUS
     Uses existing assignment
     data without changing it.
  ========================= */

  const isPublished = (assignment) => {
    if (!assignment) return false;

    if (typeof assignment.published === 'boolean') {
      return assignment.published;
    }

    if (typeof assignment.isPublished === 'boolean') {
      return assignment.isPublished;
    }

    if (typeof assignment.isDraft === 'boolean') {
      return !assignment.isDraft;
    }

    if (typeof assignment.status === 'string') {
      return assignment.status.toLowerCase() === 'published';
    }

    if (typeof assignment.visibility === 'string') {
      return assignment.visibility.toLowerCase() === 'published';
    }

    return false;
  };

  /* =========================
     FILTER COUNTS
  ========================= */

  const publishedCount = useMemo(
    () =>
      assignmentList.filter((assignment) =>
        isPublished(assignment)
      ).length,
    [assignmentList]
  );

  const draftCount = assignmentList.length - publishedCount;

  /* =========================
     SEARCH + STATUS FILTER
  ========================= */

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return assignmentList.filter((assignment) => {
      const matchesSearch =
        !searchValue ||
        assignment.title
          ?.toLowerCase()
          .includes(searchValue);

      const published = isPublished(assignment);

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'published' && published) ||
        (activeFilter === 'drafts' && !published);

      return matchesSearch && matchesFilter;
    });
  }, [assignmentList, search, activeFilter]);

  /* =========================
     FILTER HANDLER
  ========================= */

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setOpenMenu(null);
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = async (assignment) => {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteAssignment(assignment.id, token);
      setAssignmentList((current) => current.filter((item) => item.id !== assignment.id));
      setLastDeleted(assignment);
      setOpenMenu(null);
      notify(`"${assignment.title}" deleted`);
    } catch (error) {
      notify(error.message || 'Unable to delete assignment');
    }
  };

  /* =========================
     UNDO DELETE
  ========================= */

  const handleUndo = async () => {
    if (!lastDeleted) return;

    try {
      await restoreAssignment(lastDeleted.id, token);
      setAssignmentList((current) => [lastDeleted, ...current]);
      notify(`"${lastDeleted.title}" restored`);
      setLastDeleted(null);
    } catch (error) {
      notify(error.message || 'Unable to restore assignment');
    }
  };

  /* =========================
     CLOSE MENU
  ========================= */

  const closeMenu = () => {
    setOpenMenu(null);
  };

  /* =========================
     CLOSE MENU ON CLICK OUTSIDE
  ========================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Page
      title="Assignments"
      subtitle="Design, publish, and understand the work your students are doing."
      actions={
        <Link
          to="/assignments/create"
          className="btn btn-primary"
        >
          <Plus size={15} />
          Create assignment
        </Link>
      }
    >
      {isLoading && (
        <div className="panel" role="status">
          Loading assignments...
        </div>
      )}

      {!isLoading && loadError && (
        <div className="panel" role="alert">
          Unable to load assignments: {loadError}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search assignments..."
          className="sm:flex-1"
        />

        <div className="segmented">
          <button
            type="button"
            className={activeFilter === 'all' ? 'active' : ''}
            onClick={() => handleFilterChange('all')}
          >
            All {assignmentList.length}
          </button>

          <button
            type="button"
            className={activeFilter === 'published' ? 'active' : ''}
            onClick={() => handleFilterChange('published')}
          >
            Published {publishedCount}
          </button>

          <button
            type="button"
            className={activeFilter === 'drafts' ? 'active' : ''}
            onClick={() => handleFilterChange('drafts')}
          >
            Drafts {draftCount}
          </button>
        </div>
      </div>

      {/* ASSIGNMENT TABLE */}

      <Card
        title="Your assignments"
        kicker={`${filtered.length} of ${assignmentList.length} assignments`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Due</th>
                <th>Status</th>
                <th>Difficulty</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  {/* ASSIGNMENT */}

                  <td>
                    <Link
                      to={`/assignments/${a.id}`}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        fontWeight: 700,
                        color: 'var(--text)',
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 32,
                          background: a.color,
                          borderRadius: 3,
                        }}
                      />

                      <span>
                        {a.title}

                      </span>
                    </Link>
                  </td>

                  {/* COURSE */}

                  <td>{a.course}</td>

                  {/* DUE */}

                  <td>{formatDate(a.due)}</td>

                  {/* STATUS */}

                  <td>
                    <span className={`status status-${isPublished(a) ? 'success' : 'neutral'}`}>
                      <span className="status-dot" />
                      {isPublished(a) ? 'Published' : 'Draft'}
                    </span>
                  </td>

                  {/* DIFFICULTY */}

                  <td>
                    <span className="status-badge">
                      {a.difficulty}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(event) => {
                        setMenuPos({ x: event.clientX, y: event.clientY, right: window.innerWidth - event.clientX });
                        setOpenMenu(
                          openMenu === a.id ? null : a.id
                        );
                      }}
                      aria-label={`More actions for ${a.title}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {openMenu === a.id && (
                      <div
                          ref={menuRef}
                          style={{
                            position: 'fixed',
                            top: menuPos.y,
                            right: menuPos.right,
                            zIndex: 100,
                            width: 175,
                            padding: 6,
                            background: 'var(--surface)',
                            border:
                              '1px solid var(--border)',
                            borderRadius: 9,
                            boxShadow:
                              '0 12px 30px rgba(0,0,0,.3)',
                          }}
                        >
                          {/* EDIT */}

                          <Link
                            to={`/assignments/${a.id}/edit`}
                            onClick={closeMenu}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%',
                              padding: '9px 10px',
                              color: 'var(--text)',
                              textDecoration: 'none',
                              fontSize: 12,
                              borderRadius: 6,
                            }}
                          >
                            <Pencil size={14} />
                            Edit assignment
                          </Link>

                          {/* VIEW */}

                          <Link
                            to={`/assignments/${a.id}`}
                            onClick={closeMenu}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%',
                              padding: '9px 10px',
                              color: 'var(--text)',
                              textDecoration: 'none',
                              fontSize: 12,
                              borderRadius: 6,
                            }}
                          >
                            <Eye size={14} />
                            View assignment
                          </Link>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(a)
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              width: '100%',
                              padding: '9px 10px',
                              color: 'var(--error)',
                              background: 'transparent',
                              border: 0,
                              fontSize: 12,
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: 6,
                            }}
                          >
                            <Trash2 size={14} />
                            Delete assignment
                          </button>
                        </div>
                      )}
                  </td>
                </tr>
              ))}

              {/* EMPTY STATE */}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: 'center',
                      padding: 40,
                      color: 'var(--muted)',
                    }}
                  >
                    No assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* UNDO */}

      {lastDeleted && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 12px 11px 15px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            boxShadow:
              '0 12px 30px rgba(0,0,0,.3)',
            fontSize: 12,
          }}
        >
          <span>
            <span
              style={{
                color: 'var(--success)',
                marginRight: 6,
              }}
            >
              ✓
            </span>

            Assignment deleted
          </span>

          <button
            type="button"
            onClick={handleUndo}
            className="btn btn-ghost"
            style={{
              minHeight: 30,
              padding: '0 10px',
            }}
          >
            <Undo2 size={13} />
            Undo
          </button>
        </div>
      )}
    </Page>
  );
}