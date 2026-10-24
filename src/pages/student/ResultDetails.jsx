import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import FeedbackGuidance from '../../components/student/FeedbackGuidance';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatDate.js';
import Page from '../../components/common/Page.jsx';

export default function ResultDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await studentService.getResultById(id, token);
      setResult(data);
      setError(!data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Page eyebrow="STUDENT / RESULTS" title="Result details" subtitle="Loading your published evaluation…"><Loading type="cards" count={3} /></Page>;
  if (error || !result) {
    return (
      <Page eyebrow="STUDENT / RESULTS" title="Result details" subtitle="The published evaluation could not be loaded.">
        <ErrorState message="Could not load a published result for this submission." onRetry={load} />
      </Page>
    );
  }

  const scoreColor = result.percentage >= 90
    ? 'text-cera-success'
    : result.percentage >= 70
      ? 'text-cera-primary'
      : 'text-cera-warning';

  return (
    <Page eyebrow="STUDENT / RESULTS" title="Result details" subtitle="Published assignment evaluation and feedback."
      actions={<button
        onClick={() => navigate('/student/results')}
        className="btn btn-ghost"
      >
        <ArrowLeft size={16} /> Back to Results
      </button>}>
    <div className="space-y-5">

      <div className="bg-cera-card border border-cera-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-cera-text mb-2">{result.assignment}</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status="Published" />
              <span className="text-sm text-cera-muted">{result.subject}</span>
            </div>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold ${scoreColor}`}>{result.percentage}%</div>
            <p className="text-sm text-cera-muted mt-1">Published score</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-cera-muted">Score</span>
            <span className="text-sm font-medium text-cera-text font-mono">
              {result.obtainedMarks} / {result.totalMarks}
            </span>
          </div>
          <ProgressBar
            value={result.percentage}
            color={result.percentage >= 90 ? 'success' : result.percentage >= 70 ? 'primary' : 'warning'}
            height="h-3"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-cera-border text-sm text-cera-muted">
          Submitted {formatDateTime(result.submittedAt)}
        </div>
      </div>

      {result.feedback && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-cera-highlight" />
            <h2 className="font-semibold text-cera-text">
              {result.feedbackSource === 'ollama' ? 'AI Evaluation Feedback' : 'Faculty Feedback'}
            </h2>
          </div>
          <p className="text-sm text-cera-muted leading-relaxed">{result.feedback}</p>
        </div>
      )}

      {result.aiFeedback && result.feedbackSource !== 'ollama' && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-cera-highlight" />
            <h2 className="font-semibold text-cera-text">AI Feedback</h2>
          </div>
          <p className="text-sm text-cera-muted leading-relaxed">{result.aiFeedback}</p>
        </div>
      )}

      <FeedbackGuidance guidance={result.guidance} />
    </div>
    </Page>
  );
}
