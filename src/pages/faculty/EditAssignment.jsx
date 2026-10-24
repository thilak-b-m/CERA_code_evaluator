import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Save,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Section from '../../components/common/Section.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import SecureLabSettings from '../../components/faculty/SecureLabSettings.jsx';

import {
  getAssignmentById,
  updateAssignment,
} from '../../services/assignmentService.js';

export default function EditAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useApp();
  const { token } = useAuth();

  const [assignment, setAssignment] =
    useState(null);

  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [due, setDue] = useState('');
  const [difficulty, setDifficulty] =
    useState('Intermediate');
  const [description, setDescription] =
    useState('');
  const [evaluationCriteria, setEvaluationCriteria] =
    useState('');
  const [timeLimit, setTimeLimit] =
    useState('');
  const [visibility, setVisibility] =
    useState('published');
  const [points, setPoints] =
    useState('');
  const [targetYears, setTargetYears] = useState([1, 2, 3, 4]);
  const [secureLab, setSecureLab] = useState({
    enabled: false,
    requireFullscreen: true,
    recordTabSwitches: true,
    recordFullscreenExits: true,
    maxFullscreenExits: 2,
    fullscreenExitTimeoutSeconds: 15,
  });

  /* =========================
     LOAD ASSIGNMENT
  ========================= */

  useEffect(() => {
    let cancelled = false;
    getAssignmentById(id, token)
      .then((current) => {
        if (cancelled) return;
        setAssignment(current);
        setTitle(current.title || '');
        setCourse(current.course || '');
        setDue(current.due ? current.due.slice(0, 10) : '');
        setDifficulty(current.difficulty || 'Intermediate');
        setDescription(current.description || '');
        setEvaluationCriteria(current.evaluationCriteria || '');
        setTimeLimit(current.timeLimit || '');
        setVisibility(current.status || current.visibility || 'published');
        setPoints(String(current.points ?? ''));
        setTargetYears(current.targetYears || [1, 2, 3, 4]);
        setSecureLab(current.secureLab || {
          enabled: false,
          requireFullscreen: true,
          recordTabSwitches: true,
          recordFullscreenExits: true,
          maxFullscreenExits: 2,
          fullscreenExitTimeoutSeconds: 15,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        notify(error.message || 'Assignment not found');
        navigate('/assignments');
      });
    return () => {
      cancelled = true;
    };
  }, [id, token, navigate]);

  /* =========================
     SAVE
  ========================= */

  const handleSave = async () => {
    if (!title.trim()) {
      notify('Assignment title cannot be empty');
      return;
    }

    if (!course.trim()) {
      notify('Course cannot be empty');
      return;
    }

    if (!due.trim()) {
      notify('Due date cannot be empty');
      return;
    }

    try {
      await updateAssignment(id, {
        title: title.trim(),
        course: course.trim(),
        due: due.trim(),
        difficulty,
        description:
          description.trim(),
        evaluationCriteria:
          evaluationCriteria.trim(),
        timeLimit:
          timeLimit === '' ? 0 : Number(timeLimit),
        visibility,
        points:
          Number(points),
        targetYears,
        secureLab,
      }, token);
    } catch (error) {
      notify(error.message || 'Unable to update assignment');
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
      eyebrow="ASSIGNMENTS"
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
          kicker="Update the assignment details and rubric"
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

            <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <legend className="label">Target academic years</legend>
              <div className="flex flex-wrap gap-4">{[1, 2, 3, 4].map((year) => <label key={year} style={{ display: 'flex', gap: 7, alignItems: 'center' }}><input type="checkbox" checked={targetYears.includes(year)} onChange={(event) => setTargetYears((current) => event.target.checked ? [...current, year].sort() : current.filter((item) => item !== year))} />Year {year}</label>)}</div>
            </fieldset>

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
                Time limit (minutes, 0 = none)
              </span>

              <input
                className="input"
                type="number"
                min="0"
                max="600"
                step="1"
                value={timeLimit}
                onChange={(e) =>
                  setTimeLimit(
                    e.target.value
                  )
                }
                placeholder="e.g. 30"
              />
            </label>

            {/* POINTS */}

            <label>
              <span className="label">
                Points
              </span>

              <input
                className="input"
                type="number"
                min="1"
                max="10000"
                step="1"
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

            <label>
              <span className="label">
                Evaluation conditions / complexity expectations
              </span>

              <textarea
                className="textarea"
                value={evaluationCriteria}
                onChange={(e) =>
                  setEvaluationCriteria(e.target.value)
                }
                placeholder="Optional: describe required conditions, edge cases, time/space complexity, or grading priorities."
                style={{ minHeight: 120 }}
              />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                Used as grading guidance for faculty and local AI evaluation.
              </span>
            </label>

            <SecureLabSettings value={secureLab} onChange={setSecureLab} />

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
