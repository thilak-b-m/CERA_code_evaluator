import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Cpu, Code2, CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import CodeEditor from '../../components/student/CodeEditor';
import TestCasePanel from '../../components/student/TestCasePanel';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import FeedbackGuidance from '../../components/student/FeedbackGuidance';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatDate.js';
import Page from '../../components/common/Page.jsx';

export default function SubmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getSubmissionById(id, token);
        if (data) setSubmission(data);
        else setError(true);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [id, token]);

  if (loading) return <Page eyebrow="STUDENT / SUBMISSIONS" title="Submission details" subtitle="Loading submitted work…"><Loading type="cards" count={3} /></Page>;
  if (error || !submission) return <Page eyebrow="STUDENT / SUBMISSIONS" title="Submission details" subtitle="The submission information could not be loaded."><ErrorState message="Could not load submission details." onRetry={() => navigate('/student/submissions')} /></Page>;

  const hasFullDetails = Boolean(submission.code);
  const passedCount = Array.isArray(submission.testCases)
    ? submission.testCases.filter((testCase) => testCase.status === 'Passed').length
    : submission.testCasesPassed;

  return (
    <Page eyebrow="STUDENT / SUBMISSIONS" title="Submission details" subtitle="Review the submitted code, execution results, and feedback."
      actions={<button
        onClick={() => navigate('/student/submissions')}
        className="btn btn-ghost"
      >
        <ArrowLeft size={16} /> Back to Submissions
      </button>}>
    <div className="space-y-5">

      {/* Submission Info */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-cera-text mb-1">{submission.assignment}</h1>
            {submission.course && (
              <p className="text-sm text-cera-muted">{submission.course}</p>
            )}
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-cera-border">
          <div>
            <p className="text-xs text-cera-muted">Language</p>
            <p className="text-sm font-medium text-cera-text font-mono">{submission.language}</p>
          </div>
          <div>
            <p className="text-xs text-cera-muted">Score</p>
            <p className="text-sm font-bold font-mono text-cera-muted">
              {submission.evaluation?.status === 'published'
                ? `${submission.evaluation.score}/${submission.maxScore ?? '—'}`
                : 'Not evaluated'}
            </p>
          </div>
          <div>
            <p className="text-xs text-cera-muted">Submitted</p>
            <p className="text-sm font-medium text-cera-text">
              {formatDateTime(submission.submittedAt)}
            </p>
          </div>
        </div>

        {(Number.isFinite(passedCount)
          || Number.isFinite(submission.executionTime)
          || Number.isFinite(submission.memoryUsage)) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {Number.isFinite(passedCount) && (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-cera-success" />
                <div>
                  <p className="text-xs text-cera-muted">Tests Passed</p>
                  <p className="text-sm font-medium text-cera-text font-mono">
                    {passedCount}/{submission.totalTestCases}
                  </p>
                </div>
              </div>
            )}
            {Number.isFinite(submission.executionTime) && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cera-highlight" />
                <div>
                  <p className="text-xs text-cera-muted">Execution Time</p>
                  <p className="text-sm font-medium text-cera-text font-mono">{submission.executionTime}ms</p>
                </div>
              </div>
            )}
            {Number.isFinite(submission.memoryUsage) && (
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-cera-secondary" />
                <div>
                  <p className="text-xs text-cera-muted">Memory Usage</p>
                  <p className="text-sm font-medium text-cera-text font-mono">{submission.memoryUsage}MB</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-cera-primary" />
              <div>
                <p className="text-xs text-cera-muted">Language</p>
                <p className="text-sm font-medium text-cera-text font-mono">{submission.language}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Code */}
      {hasFullDetails && (
        <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-cera-border">
            <Code2 size={16} className="text-cera-highlight" />
            <h3 className="font-semibold text-cera-text text-sm">Submitted Code ({submission.language})</h3>
          </div>
          <CodeEditor
            value={submission.code}
            onChange={() => {}}
            language={submission.language}
            height="300px"
            readOnly
          />
        </div>
      )}

      {/* Test Cases */}
      {hasFullDetails && submission.testCases && (
        <TestCasePanel testCases={submission.testCases} running={false} results={submission.testCases} />
      )}

      {/* Published faculty feedback */}
      {submission.evaluation?.status === 'published' && (
        <>
          <div className="bg-cera-card border border-cera-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cera-warning/10 flex items-center justify-center">
                <MessageSquare size={16} className="text-cera-warning" />
              </div>
              <h3 className="font-semibold text-cera-text">
                {submission.evaluation.source === 'ollama' ? 'AI Evaluation Feedback' : 'Faculty Feedback'}
              </h3>
            </div>
            <p className="text-sm text-cera-muted leading-relaxed mb-3">{submission.evaluation.feedback}</p>
            <div className="flex items-center gap-2 text-xs text-cera-muted">
              <span className="font-medium text-cera-text">Score: {submission.evaluation.score}</span>
            </div>
          </div>
          <FeedbackGuidance guidance={submission.evaluation.guidance} />
        </>
      )}
    </div>
    </Page>
  );
}
