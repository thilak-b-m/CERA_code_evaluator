import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Sparkles, TestTube2 } from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { courses } from '../../data/facultyMockData.js';

export default function CreateAssignment() {
  const { notify } = useApp();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState('');
  const [course, setCourse] = useState(courses[0] || '');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [visibility, setVisibility] = useState('published');
  const [points, setPoints] = useState('');
  const [saved, setSaved] = useState(false);

  const handleCreate = async () => {
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

    const newAssignment = {
      title: title.trim(),
      course,
      due: dueDate,
      description: description.trim(),
      timeLimit: timeLimit.trim(),
      visibility,
      points: points.trim(),
      submissions: 0,
      total: 0,
      difficulty: 'Intermediate',
      color: 'var(--primary)',
    };

    const created =
      await assignmentService.create(
        newAssignment
      );

    if (!created) {
      notify('Unable to create assignment');
      return;
    }

    setSaved(true);
    notify('Assignment created successfully');

    setTimeout(() => {
      navigate('/assignments');
    }, 500);
  };

  return (
    <Page
      eyebrow="ASSIGNMENTS / NEW"
      title="Create assignment"
      subtitle="Give your students a clear problem worth solving."
      actions={
        <Link
          href="/assignments"
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

              <select
                className="select"
                value={course}
                onChange={(e) =>
                  setCourse(e.target.value)
                }
              >
                {courses.map((courseOption) => (
                  <option
                    key={courseOption}
                    value={courseOption}
                  >
                    {courseOption}
                  </option>
                ))}
              </select>
            </label>

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
                  Time limit
                </span>

                <input
                  className="input"
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(e.target.value)
                  }
                  placeholder="e.g. 2 seconds"
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
                  value={points}
                  onChange={(e) =>
                    setPoints(e.target.value)
                  }
                  placeholder="Enter points"
                />
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreate}
              >
                <Sparkles size={14} />
                {saved
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
        </div>
      </div>
    </Page>
  );
}