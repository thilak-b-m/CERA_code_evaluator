import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Cpu, Code2, CheckCircle, XCircle, MessageSquare,
} from 'lucide-react';
import CodeEditor from '../../components/student/CodeEditor';
import TestCasePanel from '../../components/student/TestCasePanel';
import AIFeedbackCard from '../../components/student/AIFeedbackCard';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { studentService } from '../../services/studentService';

export default function SubmissionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getSubmissionById(id);
        if (data) setSubmission(data);
        else setError(true);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <Loading type="cards" count={3} />;
  if (error || !submission) return <ErrorState message="Could not load submission details." onRetry={() => navigate('/student/submissions')} />;

  const hasFullDetails = submission.code && submission.testCases;
  const passedCount = hasFullDetails
    ? submission.testCases.filter((t) => t.status === 'Passed').length
    : submission.testCasesPassed;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/student/submissions')}
        className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors"
      >
        <ArrowLeft size={16} /> Back to Submissions
      </button>

      {/* Submission Info */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-cera-text mb-1">{submission.assignment}</h1>
            <p className="text-sm text-cera-muted">{submission.problem}</p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-cera-border">
          <div>
            <p className="text-xs text-cera-muted">Submission ID</p>
            <p className="text-sm font-medium text-cera-text font-mono">{submission.id}</p>
          </div>
          <div>
            <p className="text-xs text-cera-muted">Language</p>
            <p className="text-sm font-medium text-cera-text font-mono">{submission.language}</p>
          </div>
          <div>
            <p className="text-xs text-cera-muted">Score</p>
            <p className={`text-sm font-bold font-mono ${submission.score >= 90 ? 'text-cera-success' : submission.score >= 70 ? 'text-cera-warning' : 'text-cera-error'}`}>
              {submission.score}/100
            </p>
          </div>
          <div>
            <p className="text-xs text-cera-muted">Submitted</p>
            <p className="text-sm font-medium text-cera-text">
              {new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-cera-success" />
            <div>
              <p className="text-xs text-cera-muted">Tests Passed</p>
              <p className="text-sm font-medium text-cera-text font-mono">{passedCount}/{submission.totalTestCases || submission.totalTestCases}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cera-highlight" />
            <div>
              <p className="text-xs text-cera-muted">Execution Time</p>
              <p className="text-sm font-medium text-cera-text font-mono">{submission.executionTime}ms</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-cera-secondary" />
            <div>
              <p className="text-xs text-cera-muted">Memory Usage</p>
              <p className="text-sm font-medium text-cera-text font-mono">{submission.memoryUsage}MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-cera-primary" />
            <div>
              <p className="text-xs text-cera-muted">Language</p>
              <p className="text-sm font-medium text-cera-text font-mono">{submission.language}</p>
            </div>
          </div>
        </div>
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
      {hasFullDetails && (
        <TestCasePanel testCases={submission.testCases} running={false} results={submission.testCases} />
      )}

      {/* AI Feedback */}
      {hasFullDetails && submission.aiFeedback && (
        <AIFeedbackCard feedback={submission.aiFeedback} />
      )}

      {/* Faculty Feedback */}
      {hasFullDetails && submission.facultyFeedback && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cera-warning/10 flex items-center justify-center">
              <MessageSquare size={16} className="text-cera-warning" />
            </div>
            <h3 className="font-semibold text-cera-text">Faculty Feedback</h3>
          </div>
          <p className="text-sm text-cera-muted leading-relaxed mb-3">{submission.facultyFeedback.comment}</p>
          <div className="flex items-center gap-2 text-xs text-cera-muted">
            <span className="font-medium text-cera-text">{submission.facultyFeedback.faculty}</span>
            <span>•</span>
            <span>{new Date(submission.facultyFeedback.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
