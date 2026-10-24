import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Award, Calendar, BookOpen, Eye, Code2, ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatDate.js';
import Page from '../../components/common/Page.jsx';

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getAssignmentById(id, token, user?.id);
        if (data) setAssignment(data);
        else setError(true);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [id, token, user?.id]);

  if (loading) return <Page eyebrow="STUDENT / ASSIGNMENTS" title="Assignment details" subtitle="Loading assignment information…"><Loading type="cards" count={3} /></Page>;
  if (error || !assignment) return <Page eyebrow="STUDENT / ASSIGNMENTS" title="Assignment details" subtitle="The assignment information could not be loaded."><ErrorState message="Could not load assignment details." onRetry={() => navigate('/student/assignments')} /></Page>;

  return (
    <Page eyebrow="STUDENT / ASSIGNMENTS" title="Assignment details" subtitle="Review the requirements and submission information."
      actions={<button
        onClick={() => navigate('/student/assignments')}
        className="btn btn-ghost"
      >
        <ArrowLeft size={16} /> Back to Assignments
      </button>}>
    <div className="space-y-5">

      {/* Header */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={assignment.difficulty} />
              <StatusBadge status={assignment.status} />
            </div>
            <h1 className="text-2xl font-bold text-cera-text mb-2">{assignment.title}</h1>
            <p className="text-cera-muted">{assignment.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {assignment.status === 'Submitted' ? (
              <Button
                variant="ghost"
                icon={Eye}
                onClick={() => navigate(assignment.submissionId
                  ? `/student/submissions/${assignment.submissionId}`
                  : '/student/submissions')}
              >
                View Submission
              </Button>
            ) : (
              <Button icon={Code2} onClick={() => navigate(`/student/submit/${assignment.id}`)}>
                {assignment.status === 'In Progress' ? 'Continue Coding' : 'Start Coding'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-cera-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-elevated flex items-center justify-center">
              <BookOpen size={16} className="text-cera-primary" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Course</p>
              <p className="text-sm font-medium text-cera-text">{assignment.course || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-elevated flex items-center justify-center">
              <Award size={16} className="text-cera-highlight" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Total Marks</p>
              <p className="text-sm font-medium text-cera-text">{assignment.marks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-elevated flex items-center justify-center">
              <Clock size={16} className="text-cera-warning" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Time Limit</p>
              <p className="text-sm font-medium text-cera-text">{assignment.timeLimit > 0 ? `${assignment.timeLimit} min` : 'Untimed'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-cera-elevated flex items-center justify-center">
              <Calendar size={16} className="text-cera-error" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Due Date</p>
              <p className="text-sm font-medium text-cera-text">{formatDate(assignment.dueDate)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-cera-muted">Progress</span>
            <span className="text-sm text-cera-text font-medium">{assignment.progress}%</span>
          </div>
          <ProgressBar value={assignment.progress} color={assignment.status === 'Submitted' ? 'success' : 'primary'} />
        </div>
      </div>

      {assignment.secureLab?.enabled && (
        <section className="rounded-xl border border-cera-warning/40 bg-cera-card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 text-cera-warning" />
            <div className="min-w-0">
              <h2 className="font-semibold text-cera-text">Secure Lab Mode Enabled</h2>
              <div className="mt-3 grid gap-2 text-sm text-cera-muted sm:grid-cols-2">
                <p>{assignment.secureLab.requireFullscreen ? 'Fullscreen required' : 'Fullscreen optional'}</p>
                <p>{assignment.secureLab.recordFullscreenExits ? 'Fullscreen exits are recorded' : 'Fullscreen exit monitoring disabled'}</p>
                <p>
                  Fullscreen exits allowed: {assignment.secureLab.maxFullscreenExits}
                  {assignment.secureLab.maxFullscreenExits === 0 ? ' (count-based auto-submit disabled)' : ''}
                </p>
                <p>
                  Auto-submit delay after fullscreen exit: {assignment.secureLab.fullscreenExitTimeoutSeconds ?? 15} seconds
                </p>
                <p>
                  Assessment duration: {assignment.timeLimit > 0 ? `${assignment.timeLimit} minutes` : 'Until the deadline'}
                </p>
                <p>Deadline: {formatDate(assignment.dueDate, { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
              <p className="mt-3 text-xs text-cera-muted">
                Browser activity may be recorded for faculty review. This monitoring cannot prevent or detect every form of cheating.
              </p>
            </div>
          </div>
        </section>
      )}

      {assignment.evaluationCriteria && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <h3 className="font-semibold text-cera-text mb-3">
            Evaluation conditions and complexity expectations
          </h3>
          <p className="text-sm text-cera-muted whitespace-pre-wrap">
            {assignment.evaluationCriteria}
          </p>
        </div>
      )}
    </div>
    </Page>
  );
}
