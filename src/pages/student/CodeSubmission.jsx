import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Send, RotateCcw, Save, Maximize2, Clock, Cpu,
  CheckCircle, XCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import CodeEditor from '../../components/student/CodeEditor';
import TestCasePanel from '../../components/student/TestCasePanel';
import ConsolePanel from '../../components/student/ConsolePanel';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';
import { studentService } from '../../services/studentService';
import { codeTemplates } from '../../data/studentMockData';

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
];

export default function CodeSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [showProblems, setShowProblems] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await studentService.getAssignmentById(id);
      setAssignment(data);
      setCode(studentService.getCodeTemplate('python'));
    };
    load();
  }, [id]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(studentService.getCodeTemplate(lang));
    setRunResults(null);
    setConsoleOutput(null);
  };

  const handleRun = async () => {
    setRunning(true);
    setRunResults(null);
    setConsoleOutput(null);
    const results = await studentService.runCode();
    setRunResults(results);
    const passed = results.filter((r) => r.status === 'Passed').length;
    const failed = results.filter((r) => r.status === 'Failed').length;
    const status = failed === 0 ? 'Passed' : 'Failed';
    setConsoleOutput({
      status,
      output: `Compilation successful.\nExecuting test cases...\n${passed} passed, ${failed} failed.\nAll test cases ${status === 'Passed' ? 'passed' : 'completed with failures'}.`,
      executionTime: results.reduce((sum, r) => sum + r.time, 0),
      memoryUsage: Math.max(...results.map((r) => r.memory)),
    });
    setRunning(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await studentService.submitCode();
    setSubmitResult(result);
    setSubmitting(false);
    setShowSubmitModal(false);
    setShowSuccessModal(true);
  };

  const handleReset = () => {
    setCode(studentService.getCodeTemplate(language));
    setRunResults(null);
    setConsoleOutput(null);
  };

  if (!assignment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cera-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasProblems = assignment.problems && assignment.problems.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/student/assignments/${id}`)}
          className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors"
        >
          <ArrowLeft size={16} /> Back to Assignment
        </button>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="input-base cursor-pointer text-sm"
          >
            {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-cera-card border border-cera-border rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-cera-text">{assignment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={assignment.difficulty} />
              <span className="text-xs text-cera-muted">{assignment.subject}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={Save}>Save Draft</Button>
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>Reset</Button>
            <Button size="sm" variant="ghost" icon={Play} onClick={handleRun} loading={running}>
              {running ? 'Running...' : 'Run Code'}
            </Button>
            <Button size="sm" icon={Send} onClick={() => setShowSubmitModal(true)}>
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Problem Description */}
        <div className="space-y-4">
          {hasProblems && (
            <>
              <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowProblems((p) => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 border-b border-cera-border"
                >
                  <span className="font-semibold text-cera-text text-sm">Problems ({assignment.problems.length})</span>
                  {showProblems ? <ChevronDown size={16} className="text-cera-muted" /> : <ChevronRight size={16} className="text-cera-muted" />}
                </button>
                <AnimatePresence>
                  {showProblems && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-cera-border">
                        {assignment.problems.map((p, i) => (
                          <div key={p.id} className="p-3 hover:bg-cera-elevated/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-mono ${p.status === 'Solved' ? 'text-cera-success' : p.status === 'Attempted' ? 'text-cera-warning' : 'text-cera-muted'}`}>
                                {p.status === 'Solved' ? '✓' : p.status === 'Attempted' ? '◐' : '○'}
                              </span>
                              <span className="text-sm text-cera-text">{p.title}</span>
                              <StatusBadge status={p.difficulty} className="ml-auto" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Problem Description */}
          <div className="bg-cera-card border border-cera-border rounded-xl p-5 max-h-[500px] overflow-y-auto">
            {hasProblems ? (
              <>
                <h3 className="font-semibold text-cera-text mb-2">
                  {assignment.problems[0].title}
                </h3>
                <StatusBadge status={assignment.problems[0].difficulty} className="mb-3" />
                <p className="text-sm text-cera-muted mb-4">{assignment.problems[0].description}</p>

                <h4 className="text-sm font-medium text-cera-text mb-2">Input Format</h4>
                <p className="text-sm text-cera-muted mb-4 font-mono bg-cera-bg/50 rounded-lg p-3">{assignment.problems[0].inputFormat}</p>

                <h4 className="text-sm font-medium text-cera-text mb-2">Output Format</h4>
                <p className="text-sm text-cera-muted mb-4 font-mono bg-cera-bg/50 rounded-lg p-3">{assignment.problems[0].outputFormat}</p>

                <h4 className="text-sm font-medium text-cera-text mb-2">Examples</h4>
                <div className="space-y-3">
                  {assignment.problems[0].examples.map((ex, i) => (
                    <div key={i} className="bg-cera-bg/50 rounded-lg p-3">
                      <p className="text-xs text-cera-muted mb-1">Input:</p>
                      <p className="text-sm text-cera-text font-mono mb-2">{ex.input}</p>
                      <p className="text-xs text-cera-muted mb-1">Output:</p>
                      <p className="text-sm text-cera-text font-mono">{ex.output}</p>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-medium text-cera-text mb-2 mt-4">Constraints</h4>
                <ul className="space-y-1">
                  {assignment.problems[0].constraints.map((c, i) => (
                    <li key={i} className="text-sm text-cera-muted font-mono">• {c}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-cera-muted">{assignment.description}</p>
            )}
          </div>
        </div>

        {/* Right: Code Editor */}
        <div className="space-y-4">
          <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-cera-border">
              <span className="text-sm font-medium text-cera-text font-mono">{language}</span>
              <Maximize2 size={14} className="text-cera-muted cursor-pointer hover:text-cera-text transition-colors" />
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              language={language}
              height="400px"
            />
          </div>
        </div>
      </div>

      {/* Test Cases & Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TestCasePanel
          testCases={studentService.getTestCases()}
          running={running}
          results={runResults}
        />
        <ConsolePanel
          output={consoleOutput?.output}
          executionTime={consoleOutput?.executionTime}
          memoryUsage={consoleOutput?.memoryUsage}
          status={consoleOutput?.status}
          running={running}
        />
      </div>

      {/* Submit Confirmation Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Solution" size="sm">
        <div className="text-center py-2">
          <p className="text-cera-muted text-sm mb-6">Are you sure you want to submit this solution? You won't be able to make changes after submission.</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
            <Button variant="success" className="flex-1" icon={Send} onClick={handleSubmit} loading={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Submission Received" size="md">
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-cera-success/10 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle size={36} className="text-cera-success" />
          </motion.div>
          <h3 className="text-lg font-semibold text-cera-text mb-2">Submission received successfully!</h3>
          {submitResult && (
            <div className="bg-cera-elevated rounded-lg p-4 mt-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cera-muted">Submission ID</span>
                <span className="text-cera-text font-mono">{submitResult.submissionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cera-muted">Score</span>
                <span className="text-cera-success font-mono">{submitResult.score}/100</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cera-muted">Test Cases</span>
                <span className="text-cera-text font-mono">{submitResult.testCasesPassed}/{submitResult.totalTestCases}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-cera-muted">Status</span>
                <StatusBadge status={submitResult.status} />
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSuccessModal(false)}>Close</Button>
            <Button className="flex-1" onClick={() => navigate('/student/submissions')}>View Submissions</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
