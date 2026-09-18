import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  MoreHorizontal,
  Plus,
  Search,
  Pencil,
  Eye,
  Trash2,
  Undo2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import {
  getAssignments,
  deleteAssignment,
  restoreAssignment,
} from '../../services/assignmentService.js';
import { useApp } from '../../context/AppContext.jsx';

export default function Assignments() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [assignmentList, setAssignmentList] = useState([]);
  const [lastDeleted, setLastDeleted] = useState(null);

  const { notify } = useApp();

  /* =========================
     LOAD ASSIGNMENTS
  ========================= */

  useEffect(() => {
    setAssignmentList(getAssignments());
  }, []);

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

    if (filter === 'all') {
      notify('Showing all assignments');
    } else if (filter === 'published') {
      notify('Showing published assignments');
    } else {
      notify('Showing draft assignments');
    }
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = (assignment) => {
    const confirmed = window.confirm(
      `Delete "${assignment.title}"?`
    );

    if (!confirmed) return;

    deleteAssignment(assignment.id);

    setAssignmentList(getAssignments());
    setLastDeleted(assignment);
    setOpenMenu(null);

    notify(`"${assignment.title}" deleted`);
  };

  /* =========================
     UNDO DELETE
  ========================= */

  const handleUndo = () => {
    if (!lastDeleted) return;

    restoreAssignment(lastDeleted);

    setAssignmentList(getAssignments());

    notify(`"${lastDeleted.title}" restored`);

    setLastDeleted(null);
  };

  /* =========================
     CLOSE MENU
  ========================= */

  const closeMenu = () => {
    setOpenMenu(null);
  };

  return (
    <Page
      title="Assignments"
      subtitle="Design, publish, and understand the work your students are doing."
      actions={
        <Link
          href="/assignments/create"
          className="btn btn-primary"
        >
          <Plus size={15} />
          Create assignment
        </Link>
      }
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        {/* SEARCH */}

        <div className="search-box">
          <Search size={15} />

          <input
            className="input"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTERS */}

        <div className="segmented">
          <button
            type="button"
            className={
              activeFilter === 'all'
                ? 'active'
                : ''
            }
            onClick={() => handleFilterChange('all')}
          >
            All{' '}
            <span style={{ color: 'var(--muted)' }}>
              {assignmentList.length}
            </span>
          </button>

          <button
            type="button"
            className={
              activeFilter === 'published'
                ? 'active'
                : ''
            }
            onClick={() =>
              handleFilterChange('published')
            }
          >
            Published{' '}
            <span style={{ color: 'var(--muted)' }}>
              {publishedCount}
            </span>
          </button>

          <button
            type="button"
            className={
              activeFilter === 'drafts'
                ? 'active'
                : ''
            }
            onClick={() =>
              handleFilterChange('drafts')
            }
          >
            Drafts{' '}
            <span style={{ color: 'var(--muted)' }}>
              {draftCount}
            </span>
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
                <th>Progress</th>
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
                      href={`/assignments/${a.id}`}
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

                        <small
                          style={{
                            display: 'block',
                            color: 'var(--muted)',
                            fontWeight: 400,
                            marginTop: 4,
                          }}
                        >
                          {a.id}
                        </small>
                      </span>
                    </Link>
                  </td>

                  {/* COURSE */}

                  <td>{a.course}</td>

                  {/* DUE */}

                  <td>{a.due}</td>

                  {/* PROGRESS */}

                  <td>
                    <div style={{ minWidth: 130 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          marginBottom: 5,
                        }}
                      >
                        <span>
                          {a.submissions}/{a.total}
                        </span>

                        <span
                          style={{
                            color: 'var(--success)',
                          }}
                        >
                          {a.total
                            ? Math.round(
                                (a.submissions /
                                  a.total) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>

                      <div className="progress">
                        <span
                          style={{
                            width: `${
                              a.total
                                ? (a.submissions /
                                    a.total) *
                                  100
                                : 0
                            }%`,
                            background: a.color,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* DIFFICULTY */}

                  <td>
                    <span className="status-badge">
                      {a.difficulty}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td
                    style={{
                      position: 'relative',
                    }}
                  >
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        setOpenMenu(
                          openMenu === a.id
                            ? null
                            : a.id
                        )
                      }
                      aria-label={`More actions for ${a.title}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>

                    {openMenu === a.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: 'calc(100% - 4px)',
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
                          href={`/assignments/${a.id}/edit`}
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
                          href={`/assignments/${a.id}`}
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