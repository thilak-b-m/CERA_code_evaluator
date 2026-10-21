import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { useApp } from '../../context/AppContext.jsx';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { testCaseService } from '../../services/testCaseService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EMPTY_FORM = {
  inputProfile: '',
  input: '',
  expectedOutput: '',
  visibility: 'Public',
  weight: 10,
};

export default function TestCaseDetails() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { notify } = useApp();
  const { token } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.all([
      assignmentService.get(assignmentId, token),
      testCaseService.list(assignmentId, token),
    ]).then(([assignmentRecord, cases]) => {
      if (cancelled) return;
      setAssignment(assignmentRecord);
      setTestCases(cases);
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || 'Unable to load test cases.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [assignmentId, token]);

  async function loadTestCases() {
    try {
      setTestCases(await testCaseService.list(assignmentId, token));
    } catch (error) {
      setLoadError(error.message || 'Unable to load test cases.');
    }
  }

  function handleAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function handleEdit(testCase) {
    setEditingId(testCase.id);
    setForm({
      inputProfile: testCase.inputProfile || '',
      input: testCase.input || '',
      expectedOutput: testCase.expectedOutput || '',
      visibility: testCase.visibility || 'Public',
      weight: testCase.weight ?? 10,
    });
    setFormError('');
    setFormOpen(true);
  }

  function handleCancel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'weight' ? Number(value) : value,
    }));
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.inputProfile.trim()) {
      setFormError('Input profile is required.');
      return;
    }

    if (!Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0) {
      setFormError('Weight must be greater than 0.');
      return;
    }

    const payload = {
      inputProfile: form.inputProfile.trim(),
      input: form.input,
      expectedOutput: form.expectedOutput,
      visibility: form.visibility,
      weight: Number(form.weight),
    };

    setFormError('');
    setSaving(true);
    let saved = false;
    try {
      if (editingId) {
        await testCaseService.update(assignmentId, editingId, payload, token);
        notify('Test case updated successfully');
      } else {
        await testCaseService.create(assignmentId, payload, token);
        notify('Test case added successfully');
      }
      saved = true;
    } catch (error) {
      setFormError(error.message || 'Unable to save test case.');
    } finally {
      setSaving(false);
    }

    if (!saved) return;
    handleCancel();
    await loadTestCases();
  }

  async function handleDelete(testCase) {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await testCaseService.delete(assignmentId, testCase.id, token);
    } catch (error) {
      notify(error.message || 'Unable to delete test case.');
      return;
    }
    notify('Test case deleted');
    await loadTestCases();
  }

  const summary = {
    total: testCases.length,
    public: testCases.filter((testCase) => testCase.visibility === 'Public').length,
    hidden: testCases.filter((testCase) => testCase.visibility === 'Hidden').length,
  };

  return (
    <Page
      eyebrow="TEST CASES"
      title={assignment?.title || 'Test cases'}
      subtitle={assignment?.course || 'Evaluation suite for this assignment'}
      actions={
        <button className="btn btn-primary" onClick={handleAdd}>
          <Plus size={14} />
          Add test case
        </button>
      }
    >
      <button
        type="button"
        onClick={() => navigate('/test-cases')}
        className="mb-4 inline-flex items-center gap-2 text-sm text-cera-muted transition-colors hover:text-cera-text"
      >
        <ArrowLeft size={16} /> Back to Test cases
      </button>

      {loadError && (
        <div role="alert" className="panel p-4 text-cera-error">{loadError}</div>
      )}

      {formOpen && (
        <Card className="mb-4 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-cera-text">
              {editingId ? 'Edit test case' : 'Add test case'}
            </h2>
            <button
              type="button"
              className="icon-btn"
              onClick={handleCancel}
              aria-label="Close form"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {formError && (
              <p role="alert" className="mb-3 text-sm text-cera-error">{formError}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(140px,1fr)_120px] sm:items-end">
              <div>
                <label className="label" htmlFor="inputProfile">Input profile</label>
                <input
                  id="inputProfile"
                  className="input"
                  required
                  name="inputProfile"
                  value={form.inputProfile}
                  onChange={handleChange}
                  placeholder="e.g. Basic connected graph"
                />
              </div>

              <div>
                <label className="label" htmlFor="visibility">Visibility</label>
                <select
                  id="visibility"
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
                <label className="label" htmlFor="weight">Weight</label>
                <input
                  id="weight"
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  required
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="input">Standard input</label>
                <textarea
                  id="input"
                  className="textarea"
                  name="input"
                  value={form.input}
                  onChange={handleChange}
                  rows={5}
                  maxLength={10000}
                  placeholder="Exact stdin text for this test case"
                />
              </div>
              <div>
                <label className="label" htmlFor="expectedOutput">Expected standard output</label>
                <textarea
                  id="expectedOutput"
                  className="textarea"
                  name="expectedOutput"
                  value={form.expectedOutput}
                  onChange={handleChange}
                  rows={5}
                  maxLength={10000}
                  placeholder="Expected stdout; trailing whitespace is ignored"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={handleCancel}>
                <X size={14} />
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={14} />
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add test case'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-cera-text">Evaluation suite</h2>
          <span className="text-sm text-cera-muted">
            {summary.total} case{summary.total === 1 ? '' : 's'} · {summary.public} public · {summary.hidden} hidden
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-cera-muted" role="status">Loading test cases...</p>
        ) : testCases.length === 0 ? (
          <p className="py-8 text-center text-sm text-cera-muted">
            No test cases added yet. Use “Add test case” to build this suite.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Input profile</th>
                  <th>Expected stdout</th>
                  <th>Visibility</th>
                  <th>Weight</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {testCases.map((testCase, index) => (
                  <tr key={testCase.id}>
                    <td className="font-mono text-cera-text">Test case {index + 1}</td>
                    <td>{testCase.inputProfile}</td>
                    <td><code>{testCase.expectedOutput}</code></td>
                    <td>{testCase.visibility}</td>
                    <td>{testCase.weight} pts</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleEdit(testCase)}
                          aria-label={`Edit test case ${index + 1}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => handleDelete(testCase)}
                          aria-label={`Delete test case ${index + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  );
}
