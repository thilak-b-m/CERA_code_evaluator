import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, TestTube2 } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import SecureLabSettings from '../../components/faculty/SecureLabSettings.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { api } from '../../services/api.js';

export default function CreateAssignment() {
  const { notify } = useApp();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [description, setDescription] = useState('');
  const [evaluationCriteria, setEvaluationCriteria] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [visibility, setVisibility] = useState('published');
  const [points, setPoints] = useState('');
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [targetYears, setTargetYears] = useState([1, 2, 3, 4]);
  const [languages, setLanguages] = useState(['python', 'java', 'cpp', 'javascript']);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [secureLab, setSecureLab] = useState({
    enabled: false,
    requireFullscreen: true,
    recordTabSwitches: true,
    recordFullscreenExits: true,
    maxFullscreenExits: 2,
    fullscreenExitTimeoutSeconds: 15,
  });

  useEffect(() => {
    let cancelled = false;
    api.request('/api/auth/faculty-settings', { token }).then(({ settings }) => {
      if (cancelled) return;
      const defaults = settings.assessmentDefaults || {};
      setPoints(String(defaults.points ?? 100));
      setPassingPercentage(defaults.passingPercentage ?? 40);
      setTimeLimit(String(defaults.timeLimit ?? 0));
      setTargetYears(defaults.targetYears || [1, 2, 3, 4]);
      setLanguages(defaults.languages || ['python', 'java', 'cpp', 'javascript']);
      setSecureLab((current) => ({ ...current, enabled: Boolean(defaults.secureLabEnabled) }));
    }).catch((error) => notify(error.message || 'Unable to load assignment defaults.'));
    return () => { cancelled = true; };
  }, [token, notify]);

  const handleCreate = async () => {
    setCreateError('');
    if (!title.trim()) {
      notify('Assignment title cannot be empty');
      return;
    }

    if (!description.trim()) {
      notify('Problem statement cannot be empty');
      return;
    }

    if (!dueDate) {
      notify('Due date cannot be empty');
      return;
    }

    setCreating(true);
    try {
      const newAssignment = {
        title: title.trim(),
        course,
        due: dueDate,
        description: description.trim(),
        evaluationCriteria: evaluationCriteria.trim(),
        timeLimit: timeLimit === '' ? 0 : Number(timeLimit),
        visibility,
        points: Number(points),
        passingPercentage: Number(passingPercentage),
        targetYears,
        languages,
        difficulty: 'Intermediate',
        color: 'var(--primary)',
        secureLab,
      };

      const created = await assignmentService.create(newAssignment, token);

      if (!created) throw new Error('The API did not return the created assignment.');

      setSaved(true);
      notify('Assignment created successfully');

      setTimeout(() => {
        navigate('/assignments');
      }, 500);
    } catch (error) {
      setCreateError(error.message || 'Unable to create assignment.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Page
      eyebrow="ASSIGNMENTS / NEW"
      title="Create assignment"
      subtitle="Give your students a clear problem worth solving."
      actions={
        <Link
          to="/assignments"
          className="btn btn-ghost"
        >
          Cancel
        </Link>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.25fr) minmax(280px,.75fr)',
          gap: 14,
        }}
      >
        <Card
          title="Assignment brief"
          kicker="The prompt students will see"
        >
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 17,
            }}
          >
            <label>
              <span className="label">
                Assignment title
              </span>

              <input
                className="input"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Enter assignment title"
              />
            </label>

            <label>
              <span className="label">
                Course
              </span>

              <input
                className="input"
                type="text"
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                placeholder="Enter the course name"
              />
            </label>

            <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <legend className="label">Target academic years</legend>
              <div className="flex flex-wrap gap-4">{[1, 2, 3, 4].map((year) => <label key={year} style={{ display: 'flex', gap: 7, alignItems: 'center' }}><input type="checkbox" checked={targetYears.includes(year)} onChange={(event) => setTargetYears((current) => event.target.checked ? [...current, year].sort() : current.filter((item) => item !== year))} />Year {year}</label>)}</div>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>Only students in selected years can view or submit this assignment.</span>
            </fieldset>

            <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
              <legend className="label">Allowed programming languages</legend>
              <div className="flex flex-wrap gap-4">{[['python', 'Python'], ['java', 'Java'], ['cpp', 'C++'], ['javascript', 'JavaScript']].map(([value, label]) => <label key={value} style={{ display: 'flex', gap: 7, alignItems: 'center' }}><input type="checkbox" checked={languages.includes(value)} onChange={(event) => setLanguages((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} />{label}</label>)}</div>
            </fieldset>

            <label>
              <span className="label">
                Problem statement
              </span>

              <textarea
                className="textarea"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Describe the problem students need to solve."
              />
            </label>

            <label>
              <span className="label">
                Evaluation conditions / complexity expectations
              </span>

              <textarea
                className="textarea"
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                placeholder="Optional: describe required conditions, edge cases, time/space complexity, or grading priorities."
              />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                Used as grading guidance for faculty and local AI evaluation.
              </span>
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 12,
              }}
            >
              <label>
                <span className="label">
                  Due date
                </span>

                <input
                  className="input"
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                />
              </label>

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
                    setTimeLimit(e.target.value)
                  }
                  placeholder="e.g. 30"
                />
              </label>
            </div>
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gap: 14,
          }}
        >
          <Card
            title="Publishing"
            kicker="Control the release"
          >
            <div
              style={{
                padding: 20,
                display: 'grid',
                gap: 15,
              }}
            >
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
                      visibility === 'draft'
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
                    setPoints(e.target.value)
                  }
                  placeholder="Enter points"
                />
              </label>

              <label><span className="label">Passing percentage</span><input className="input" type="number" min="0" max="100" value={passingPercentage} onChange={(event) => setPassingPercentage(event.target.value)} /></label>

              {createError && (
                <p role="alert" style={{ color: 'var(--error)', fontSize: 13 }}>
                  {createError}
                </p>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={creating}
              >
                <Sparkles size={14} />
                {creating
                  ? 'Creating...'
                  : saved
                  ? 'Created'
                  : 'Create assignment'}
              </button>
            </div>
          </Card>

          <Card
            title="Test coverage"
            kicker="Attach an evaluation suite"
          >
            <div
              style={{
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                  }}
                >
                  No test cases attached
                </span>

                <span
                  style={{
                    color: 'var(--muted)',
                    font:
                      '11px var(--app-font-mono)',
                  }}
                >
                  NOT SET
                </span>
              </div>

              <div className="progress">
                <span
                  style={{
                    width: '0%',
                  }}
                />
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  marginTop: 16,
                }}
                onClick={() =>
                  notify(
                    'Test case picker opened'
                  )
                }
              >
                <TestTube2 size={14} />
                Manage test cases
              </button>
            </div>
          </Card>
          <SecureLabSettings value={secureLab} onChange={setSecureLab} />
        </div>
      </div>
    </Page>
  );
}
