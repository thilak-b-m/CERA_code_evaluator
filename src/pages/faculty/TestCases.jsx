import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from 'lucide-react';

import { useApp } from '../../context/AppContext.jsx';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';

import { assignmentService } from '../../services/assignmentService.js';
import { testCaseService } from '../../services/testCaseService.js';

const EMPTY_FORM = {
  inputProfile: '',
  expected: 'Passed',
  visibility: 'Public',
  weight: 10,
};

export default function TestCases() {
  const { notify } = useApp();

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  const [testCases, setTestCases] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    public: 0,
    hidden: 0,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    async function loadAssignments() {
      const data = await assignmentService.list();

      setAssignments(data);

      if (data.length > 0) {
        setSelectedAssignmentId(data[0].id);
      }
    }

    loadAssignments();
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setTestCases([]);
      setSummary({
        total: 0,
        public: 0,
        hidden: 0,
      });
      return;
    }

    loadTestCases(selectedAssignmentId);
  }, [selectedAssignmentId]);

  async function loadTestCases(assignmentId) {
    const [cases, caseSummary] = await Promise.all([
      testCaseService.list(assignmentId),
      testCaseService.summary(assignmentId),
    ]);

    setTestCases(cases);
    setSummary(caseSummary);
  }

  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === selectedAssignmentId
  );

  function handleAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function handleEdit(testCase) {
    setEditingId(testCase.id);

    setForm({
      inputProfile: testCase.inputProfile || '',
      expected: testCase.expected || 'Passed',
      visibility: testCase.visibility || 'Public',
      weight: testCase.weight ?? 10,
    });

    setFormOpen(true);
  }

  function handleCancel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === 'weight' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedAssignmentId) {
      notify('Please select an assignment');
      return;
    }

    if (!form.inputProfile.trim()) {
      notify('Input profile is required');
      return;
    }

    const payload = {
      assignmentId: selectedAssignmentId,
      inputProfile: form.inputProfile.trim(),
      expected: form.expected,
      visibility: form.visibility,
      weight: Number(form.weight) || 0,
    };

    if (editingId) {
      await testCaseService.update(selectedAssignmentId,editingId, payload);
      notify('Test case updated');
    } else {
      await testCaseService.create(
             selectedAssignmentId,
            payload
       );
      notify('Test case added');
    }

    handleCancel();
    await loadTestCases(selectedAssignmentId);
  }

  async function handleDelete(testCase) {
    const confirmed = window.confirm(
      `Delete ${testCase.id}?`
    );

    if (!confirmed) {
      return;
    }

    await testCaseService.delete( selectedAssignmentId,testCase.id);

    notify(`${testCase.id} deleted`);

    await loadTestCases(selectedAssignmentId);
  }

  return (
    <Page
      title="Test cases"
      subtitle="Build fair, transparent evaluation suites that reward robust solutions."
      actions={
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!selectedAssignmentId}
        >
          <Plus size={14} />
          Add test case
        </button>
      }
    >
      <Card>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <select
            className="select"
            style={{ width: 230 }}
            value={selectedAssignmentId}
            onChange={(event) => {
              setSelectedAssignmentId(event.target.value);
              handleCancel();
            }}
          >
            {assignments.map((assignment) => (
              <option
                key={assignment.id}
                value={assignment.id}
              >
                {assignment.title}
              </option>
            ))}
          </select>

          <span
            style={{
              color: 'var(--muted)',
              fontSize: 12,
            }}
          >
            {summary.total} cases · {summary.public} public ·{' '}
            {summary.hidden} hidden
          </span>
        </div>
      </Card>

      {formOpen && (
        <Card
          title={editingId ? 'Edit test case' : 'Add test case'}
          kicker={
            selectedAssignment?.title ||
            'Selected assignment'
          }
          action={
            <button
              className="icon-btn"
              onClick={handleCancel}
              aria-label="Close form"
            >
              <X size={16} />
            </button>
          }
        >
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 2fr) minmax(140px, 1fr) minmax(140px, 1fr) 120px',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div>
                <label className="field-label">
                  Input profile
                </label>

                <input
                  className="input"
                  name="inputProfile"
                  value={form.inputProfile}
                  onChange={handleChange}
                  placeholder="e.g. Basic connected graph"
                />
              </div>

              <div>
                <label className="field-label">
                  Expected
                </label>

                <select
                  className="select"
                  name="expected"
                  value={form.expected}
                  onChange={handleChange}
                >
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Timeout">Timeout</option>
                </select>
              </div>

              <div>
                <label className="field-label">
                  Visibility
                </label>

                <select
                  className="select"
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                >
                  <option value="Public">Public</option>
                  <option value="Hidden">Hidden</option>
                </select>
              </div>

              <div>
                <label className="field-label">
                  Weight
                </label>

                <input
                  className="input"
                  type="number"
                  min="0"
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={handleCancel}
              >
                <X size={14} />
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save size={14} />
                {editingId ? 'Save changes' : 'Add test case'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title={selectedAssignment?.title || 'Test cases'}
        kicker="Evaluation suite"
      >
        {testCases.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            No test cases configured for this assignment.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Input profile</th>
                  <th>Expected</th>
                  <th>Visibility</th>
                  <th>Weight</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {testCases.map((testCase) => {
                  const statusTone =
                    testCase.expected === 'Passed'
                      ? 'success'
                      : 'warning';

                  return (
                    <tr key={testCase.id}>
                      <td
                        style={{
                          color: 'var(--text)',
                          fontFamily:
                            'var(--app-font-mono)',
                        }}
                      >
                        {testCase.id}
                      </td>

                      <td>
                        {testCase.inputProfile}
                      </td>

                      <td>
                        <span
                          className={`status status-${statusTone}`}
                        >
                          <span className="status-dot" />
                          {testCase.expected}
                        </span>
                      </td>

                      <td>
                        {testCase.visibility}
                      </td>

                      <td>
                        {testCase.weight} pts
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 4,
                          }}
                        >
                          <button
                            className="icon-btn"
                            onClick={() =>
                              handleEdit(testCase)
                            }
                            aria-label={`Edit ${testCase.id}`}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            className="icon-btn"
                            onClick={() =>
                              handleDelete(testCase)
                            }
                            aria-label={`Delete ${testCase.id}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}