import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  Check,
  Save,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { useApp } from '../../context/AppContext.jsx';

import {
  getAssignmentById,
  updateAssignment,
} from '../../services/assignmentService.js';

function Section({
  title,
  kicker,
  children,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            {title}
          </div>

          {kicker && (
            <div className="panel-kicker">
              {kicker}
            </div>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

export default function EditAssignment() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { notify } = useApp();

  const [assignment, setAssignment] =
    useState(null);

  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [due, setDue] = useState('');
  const [difficulty, setDifficulty] =
    useState('Intermediate');
  const [description, setDescription] =
    useState('');
  const [timeLimit, setTimeLimit] =
    useState('');
  const [visibility, setVisibility] =
    useState('published');
  const [points, setPoints] =
    useState('');

  /* =========================
     LOAD ASSIGNMENT
  ========================= */

  useEffect(() => {
    const current =
      getAssignmentById(id);

    if (!current) {
      notify('Assignment not found');
      navigate('/assignments');
      return;
    }

    setAssignment(current);

    setTitle(current.title || '');
    setCourse(current.course || '');
    setDue(current.due || '');

    setDifficulty(
      current.difficulty ||
        'Intermediate'
    );

    setDescription(
      current.description || ''
    );

    setTimeLimit(
      current.timeLimit || ''
    );

    setVisibility(
      current.visibility || 'published'
    );

    setPoints(
      current.points || ''
    );
  }, [id]);

  /* =========================
     SAVE
  ========================= */

  const handleSave = () => {
    if (!title.trim()) {
      notify(
        'Assignment title cannot be empty'
      );
      return;
    }

    if (!course.trim()) {
      notify(
        'Course cannot be empty'
      );
      return;
    }

    if (!due.trim()) {
      notify(
        'Due date cannot be empty'
      );
      return;
    }

    const updated =
      updateAssignment(id, {
        title: title.trim(),
        course: course.trim(),
        due: due.trim(),
        difficulty,
        description:
          description.trim(),
        timeLimit:
          timeLimit.trim(),
        visibility,
        points:
          points.trim(),
      });

    if (!updated) {
      notify(
        'Unable to update assignment'
      );
      return;
    }

    notify(
      'Assignment changes saved successfully'
    );

    setTimeout(() => {
      navigate('/assignments');
    }, 500);
  };

  /* =========================
     CANCEL
  ========================= */

  const handleCancel = () => {
    navigate('/assignments');
  };

  /* =========================
     LOADING
  ========================= */

  if (!assignment) {
    return (
      <Page
        title="Edit assignment"
        subtitle="Loading assignment..."
      >
        <div
          className="panel"
          style={{
            padding: 30,
            color: 'var(--muted)',
          }}
        >
          Loading assignment...
        </div>
      </Page>
    );
  }

  return (
    <Page
      eyebrow={`ASSIGNMENTS / ${assignment.id}`}
      title="Edit assignment"
      subtitle={`${assignment.title} · ${assignment.course}`}
      actions={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleCancel}
          >
            <ArrowLeft size={14} />
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            <Save size={14} />
            Save changes
          </button>
        </>
      }
    >
      <div
        style={{
          maxWidth: 850,
        }}
      >
        <Section
          title="Assignment details"
          kicker={`Editing ${assignment.id}`}
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 17,
            }}
          >
            {/* TITLE */}

            <label>
              <span className="label">
                Assignment title
              </span>

              <input
                className="input"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
              />
            </label>

            {/* COURSE */}

            <label>
              <span className="label">
                Course
              </span>

              <input
                className="input"
                value={course}
                onChange={(e) =>
                  setCourse(
                    e.target.value
                  )
                }
              />
            </label>

            {/* DUE */}

            <label>
              <span className="label">
                Due
              </span>

              <input
                className="input"
                value={due}
                onChange={(e) =>
                  setDue(
                    e.target.value
                  )
                }
                placeholder="e.g. Tomorrow, 5:00 PM"
              />
            </label>

            {/* TIME LIMIT */}

            <label>
              <span className="label">
                Time limit
              </span>

              <input
                className="input"
                value={timeLimit}
                onChange={(e) =>
                  setTimeLimit(
                    e.target.value
                  )
                }
                placeholder="e.g. 2 seconds"
              />
            </label>

            {/* POINTS */}

            <label>
              <span className="label">
                Points
              </span>

              <input
                className="input"
                value={points}
                onChange={(e) =>
                  setPoints(
                    e.target.value
                  )
                }
                placeholder="Enter points"
              />
            </label>

            {/* VISIBILITY */}

            <div>
              <span className="label">
                Visibility
              </span>

              <div
                className="segmented"
                style={{
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  className={
                    visibility ===
                    'published'
                      ? 'active'
                      : ''
                  }
                  style={{
                    flex: 1,
                  }}
                  onClick={() =>
                    setVisibility(
                      'published'
                    )
                  }
                >
                  Published
                </button>

                <button
                  type="button"
                  className={
                    visibility ===
                    'draft'
                      ? 'active'
                      : ''
                  }
                  style={{
                    flex: 1,
                  }}
                  onClick={() =>
                    setVisibility(
                      'draft'
                    )
                  }
                >
                  Draft
                </button>
              </div>
            </div>

            {/* DIFFICULTY */}

            <label>
              <span className="label">
                Difficulty
              </span>

              <select
                className="select"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(
                    e.target.value
                  )
                }
              >
                <option value="Foundational">
                  Foundational
                </option>

                <option value="Intermediate">
                  Intermediate
                </option>

                <option value="Advanced">
                  Advanced
                </option>
              </select>
            </label>

            {/* DESCRIPTION */}

            <label>
              <span className="label">
                Assignment description
              </span>

              <textarea
                className="textarea"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                style={{
                  minHeight: 150,
                }}
              />
            </label>

            {/* BUTTONS */}

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent:
                  'flex-end',
                paddingTop: 5,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
              >
                <Check size={14} />
                Save changes
              </button>
            </div>
          </div>
        </Section>
      </div>
    </Page>
  );
}