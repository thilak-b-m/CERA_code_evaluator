import { useMemo, useState } from 'react';
import { Link } from 'wouter';

import {
  Download,
  Search,
  Filter,
  UserPlus,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Modal from '../../components/common/Modal.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

import { studentService } from '../../services/studentService.js';
import { useApp } from '../../context/AppContext.jsx';


function Toolbar({
  search,
  setSearch,
  studentFilter,
  setStudentFilter,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 9,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 14,
      }}
    >
      {/* SEARCH */}

      <div
        className="search-box"
        style={{
          flex: '1 1 260px',
        }}
      >
        <Search size={15} />

        <input
          className="input"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search by name, email or ID..."
          aria-label="Search students"
        />
      </div>

      {/* FILTER */}

      <div
        style={{
          position: 'relative',
        }}
      >
        <Filter
          size={14}
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />

        <select
          className="select"
          value={studentFilter}
          onChange={(e) =>
            setStudentFilter(e.target.value)
          }
          style={{
            width: 160,
            paddingLeft: 32,
          }}
          aria-label="Filter students"
        >
          <option value="all">
            All students
          </option>

          <option value="risk">
            At risk
          </option>

          <option value="track">
            On track
          </option>
        </select>
      </div>
    </div>
  );
}


export default function Students() {
  const { notify } = useApp();

  /*
   * STUDENT DATA
   *
   * The page gets student records through
   * the service boundary instead of importing
   * mock data directly.
   */
  const [allStudents, setAllStudents] = useState(
    () => [...studentService.list()]
  );

  const [search, setSearch] =
    useState('');

  const [studentFilter, setStudentFilter] =
    useState('all');

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);

  const [formError, setFormError] =
    useState('');

  const [studentForm, setStudentForm] = useState({
    name: '',
    usn: '',
    email: '',
    year: '1',
  });

  const updateStudentForm = (event) => {
    const { name, value } = event.target;
    setStudentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddStudent = (event) => {
    event.preventDefault();
    setFormError('');

    try {
      studentService.addStudent(studentForm);
      setAllStudents([...studentService.list()]);
      setIsAddModalOpen(false);
      setStudentForm({
        name: '',
        usn: '',
        email: '',
        year: '1',
      });
      notify(`${studentForm.name.trim()} added to the roster`);
    } catch (error) {
      setFormError(error.message);
    }
  };


  /*
   * SEARCH + FILTER
   */

  const rows = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return allStudents.filter((student) => {
      const name = String(
        student.name || ''
      ).toLowerCase();

      const email = String(
        student.email || ''
      ).toLowerCase();

      const id = String(
        student.id || ''
      ).toLowerCase();

      const status = String(
        student.status || ''
      ).toLowerCase();

      const matchesSearch =
        query === '' ||
        name.includes(query) ||
        email.includes(query) ||
        id.includes(query);

      let matchesFilter = true;

      if (
        studentFilter === 'risk'
      ) {
        matchesFilter =
          status !== 'on track';
      }

      if (
        studentFilter === 'track'
      ) {
        matchesFilter =
          status === 'on track';
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [
    allStudents,
    search,
    studentFilter,
  ]);


  /*
   * COUNT AT-RISK STUDENTS
   */

  const atRiskCount =
    allStudents.filter(
      (student) =>
        String(
          student.status || ''
        ).toLowerCase() !==
        'on track'
    ).length;


  /*
   * CLEAR FILTERS
   */

  const clearFilters = () => {
    setSearch('');
    setStudentFilter('all');
  };


  const hasFilters =
    search.trim() !== '' ||
    studentFilter !== 'all';


  /*
   * EXPORT ROSTER
   */

  const handleExport = () => {
    if (!rows.length) {
      notify(
        'There are no students to export'
      );
      return;
    }

    const header = [
      'Student ID',
      'Name',
      'Email',
      'Progress',
      'Average Score',
      'Last Active',
      'Status',
    ];

    const csvRows = rows.map(
      (student) => [
        student.id,
        student.name,
        student.email,
        student.labs,
        student.score,
        student.last,
        student.status,
      ]
    );

    const csv = [
      header,
      ...csvRows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text = String(
              value ?? ''
            );

            return `"${text.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      'cera-student-roster.csv';

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    notify(
      'Student roster exported successfully'
    );
  };


  return (
    <Page
      title="Students"
      subtitle="See progress, patterns, and where a small nudge will help."
      actions={
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
          >
            <UserPlus size={14} />
            Add student
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExport}
          >
            <Download size={14} />
            Export roster
          </button>
        </>
      }
    >

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add student"
      >
        <form onSubmit={handleAddStudent}>
          <div style={{ display: 'grid', gap: 15 }}>
            <label>
              <span className="label">Student name</span>
              <input
                className="input"
                name="name"
                value={studentForm.name}
                onChange={updateStudentForm}
                placeholder="Enter full name"
                autoComplete="name"
                required
                autoFocus
              />
            </label>

            <label>
              <span className="label">USN</span>
              <input
                className="input"
                name="usn"
                value={studentForm.usn}
                onChange={updateStudentForm}
                placeholder="e.g. 1XX23CS001"
                required
              />
            </label>

            <label>
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                name="email"
                value={studentForm.email}
                onChange={updateStudentForm}
                placeholder="student@university.edu"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span className="label">Year</span>
              <select
                className="select"
                name="year"
                value={studentForm.year}
                onChange={updateStudentForm}
              >
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </label>

            {formError && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: 'var(--error)',
                  fontSize: 12,
                }}
              >
                {formError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                paddingTop: 4,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Invite
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* TOOLBAR */}

      <Toolbar
        search={search}
        setSearch={setSearch}
        studentFilter={studentFilter}
        setStudentFilter={
          setStudentFilter
        }
      />


      {/* FILTER STATUS */}

      {hasFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 14,
            padding: '10px 12px',
            background: 'var(--subtle)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <span>
            Showing {rows.length}{' '}
            matching student
            {rows.length !== 1
              ? 's'
              : ''}
          </span>

          <button
            type="button"
            className="btn btn-soft"
            onClick={clearFilters}
            style={{
              minHeight: 28,
              padding: '0 9px',
            }}
          >
            Clear filters
          </button>
        </div>
      )}


      {/* COURSE ROSTER */}

      <Card
        title="Course roster"
        kicker={`${rows.length} ${
          rows.length === 1
            ? 'student'
            : 'students'
        } · CS 301 Algorithms`}
      >
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Progress</th>
                  <th>Average</th>
                  <th>Last active</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {rows.map((student) => (
                  <tr
                    key={student.id}
                  >
                    <td>
                      <Link
                        href={`/students/${student.id}`}
                        style={{
                          display: 'flex',
                          gap: 9,
                          alignItems: 'center',
                          color: 'var(--text)',
                          fontWeight: 700,
                        }}
                      >
                        <Avatar
                          color={
                            student.color
                          }
                        >
                          {
                            student.initials
                          }
                        </Avatar>

                        <span>
                          {student.name}

                          <small
                            style={{
                              display: 'block',
                              color: 'var(--secondary)',
                              fontWeight: 500,
                              marginTop: 3,
                            }}
                          >
                            {student.id}
                          </small>

                          <small
                            style={{
                              display: 'block',
                              color: 'var(--muted)',
                              fontWeight: 400,
                              marginTop: 2,
                            }}
                          >
                            {student.email}
                          </small>

                          {student.year && (
                            <small
                              style={{
                                display: 'block',
                                color: 'var(--muted)',
                                fontWeight: 400,
                                marginTop: 2,
                              }}
                            >
                              Year {student.year}
                            </small>
                          )}
                        </span>
                      </Link>
                    </td>

                    <td>
                      {student.labs}{' '}
                      labs
                    </td>

                    <td
                      style={{
                        color: 'var(--text)',
                        font:
                          '700 12px var(--app-font-mono)',
                      }}
                    >
                      {student.score}%
                    </td>

                    <td>
                      {student.last}
                    </td>

                    <td>
                      <StatusBadge
                        tone={
                          student.status ===
                          'On track'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {
                          student.status
                        }
                      </StatusBadge>
                    </td>

                    <td>
                      <Link
                        href={`/students/${student.id}`}
                        className="btn btn-ghost"
                        style={{
                          minHeight: 30,
                          padding: '0 9px',
                        }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="empty"
            style={{
              padding: 50,
            }}
          >
            <Search size={30} />

            <div
              style={{
                color: 'var(--text)',
                fontWeight: 700,
              }}
            >
              No students found
            </div>

            <p
              style={{
                fontSize: 12,
              }}
            >
              Try a different search
              or student filter.
            </p>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>


      {/* SMALL SUMMARY */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(3, minmax(0, 1fr))',
          gap: 14,
          marginTop: 14,
        }}
      >

        <div className="panel">
          <div
            style={{
              padding: 18,
            }}
          >
            <div className="eyebrow">
              TOTAL STUDENTS
            </div>

            <div
              style={{
                marginTop: 7,
                font:
                  '22px var(--app-font-mono)',
              }}
            >
              {allStudents.length}
            </div>
          </div>
        </div>


        <div className="panel">
          <div
            style={{
              padding: 18,
            }}
          >
            <div className="eyebrow">
              AT RISK
            </div>

            <div
              style={{
                marginTop: 7,
                font:
                  '22px var(--app-font-mono)',
                color:
                  'var(--warning)',
              }}
            >
              {atRiskCount}
            </div>
          </div>
        </div>


        <div className="panel">
          <div
            style={{
              padding: 18,
            }}
          >
            <div className="eyebrow">
              ON TRACK
            </div>

            <div
              style={{
                marginTop: 7,
                font:
                  '22px var(--app-font-mono)',
                color:
                  'var(--success)',
              }}
            >
              {allStudents.length -
                atRiskCount}
            </div>
          </div>
        </div>

      </div>

    </Page>
  );
}