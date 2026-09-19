import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Award, Calendar, FileText, Play, Eye, Code2, ListChecks,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ErrorState from '../../components/common/ErrorState';
import { studentService } from '../../services/studentService';

export default function AssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await studentService.getAssignmentById(id);
        if (data) setAssignment(data);
        else setError(true);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <Loading type="cards" count={3} />;
  if (error || !assignment) return <ErrorState message="Could not load assignment details." onRetry={() => navigate('/student/assignments')} />;

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const problemStatusIcon = {
    Solved: { icon: '✓', color: 'text-cera-success' },
    Unsolved: { icon: '○', color: 'text-cera-muted' },
    Attempted: { icon: '◐', color: 'text-cera-warning' },
  };

  const hasProblems = assignment.problems && assignment.problems.length > 0;

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate('/student/assignments')}
        className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors"
      >
        <ArrowLeft size={16} /> Back to Assignments
      </button>

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
            {assignment.status === 'Completed' || assignment.status === 'Submitted' ? (
              <Button variant="ghost" icon={Eye} onClick={() => navigate(`/student/submissions`)}>
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
              <ListChecks size={16} className="text-cera-primary" />
            </div>
            <div>
              <p className="text-xs text-cera-muted">Problems</p>
              <p className="text-sm font-medium text-cera-text">{assignment.problemCount}</p>
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
              <p className="text-sm font-medium text-cera-text">{assignment.timeLimit} min</p>
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
          <ProgressBar value={assignment.progress} color={assignment.status === 'Completed' ? 'success' : 'primary'} />
        </div>
      </div>

      {/* Instructions */}
      {assignment.instructions && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <h3 className="font-semibold text-cera-text mb-3 flex items-center gap-2">
            <FileText size={18} className="text-cera-highlight" /> Instructions
          </h3>
          <ul className="space-y-2">
            {assignment.instructions.map((inst, i) => (
              <li key={i} className="text-sm text-cera-muted flex items-start gap-2">
                <span className="text-cera-highlight mt-0.5">•</span>
                {inst}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Constraints */}
      {assignment.constraints && (
        <div className="bg-cera-card border border-cera-border rounded-xl p-5">
          <h3 className="font-semibold text-cera-text mb-3">Constraints</h3>
          <ul className="space-y-2">
            {assignment.constraints.map((c, i) => (
              <li key={i} className="text-sm text-cera-muted flex items-start gap-2 font-mono">
                <span className="text-cera-warning mt-0.5">•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Problems */}
      {hasProblems && (
        <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cera-border">
            <h3 className="font-semibold text-cera-text">Problems ({assignment.problems.length})</h3>
          </div>
          <div className="divide-y divide-cera-border">
            {assignment.problems.map((problem, index) => {
              const statusCfg = problemStatusIcon[problem.status] || problemStatusIcon.Unsolved;
              return (
                <motion.div
                  key={problem.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 hover:bg-cera-elevated/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/student/submit/${assignment.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className={`text-xl ${statusCfg.color} font-mono mt-0.5`}>{statusCfg.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-cera-text">{problem.title}</h4>
                          <StatusBadge status={problem.difficulty} />
                        </div>
                        <p className="text-sm text-cera-muted line-clamp-2">{problem.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-cera-muted font-mono">{problem.marks} pts</span>
                      <Button size="sm" variant="ghost" icon={Play}>
                        {problem.status === 'Solved' ? 'Review' : problem.status === 'Attempted' ? 'Continue' : 'Solve'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
