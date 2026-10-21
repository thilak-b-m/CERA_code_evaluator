import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Send, RotateCcw, Maximize2,
  CheckCircle, ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, Clock,
} from 'lucide-react';
import CodeEditor from '../../components/student/CodeEditor';
import TestCasePanel from '../../components/student/TestCasePanel';
import ConsolePanel from '../../components/student/ConsolePanel';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { studentService } from '../../services/studentService';
import { liveLabService } from '../../services/liveLabService.js';
import { useAuth } from '../../context/AuthContext';

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
];

export default function CodeSubmission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const activity = useRef({ language: 'python', status: 'editing' });
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
  const [testCases, setTestCases] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [liveLabError, setLiveLabError] = useState('');
  const [liveLabActive, setLiveLabActive] = useState(true);
  const [secureAttempt, setSecureAttempt] = useState(null);
  const [secureAccessGranted, setSecureAccessGranted] = useState(false);
  const [secureConsent, setSecureConsent] = useState(false);
  const [secureError, setSecureError] = useState('');
  const [secureWarning, setSecureWarning] = useState(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [secureNow, setSecureNow] = useState(Date.now());
  const [secureFullscreen, setSecureFullscreen] = useState(Boolean(document.fullscreenElement));
  const autoSubmitTriggered = useRef(false);
  const [fullscreenWarningActive, setFullscreenWarningActive] = useState(false);
  const [fullscreenTimeRemaining, setFullscreenTimeRemaining] = useState(0);
  const fullscreenWarningTimerRef = useRef(null);
  const fullscreenTimeoutAutoSubmit = useRef(false);
  const pendingSecureEvents = useRef([]);
  const secureAttemptRef = useRef(null);
  const secureAssignmentRef = useRef(null);
  const secureEventQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [data, cases] = await Promise.all([
          studentService.getAssignmentById(id, token, user?.id),
          studentService.getAssignmentTestCases(id, token),
        ]);
        if (cancelled) return;
        let currentAttempt = null;
        if (data.secureLab?.enabled) {
          const current = await liveLabService.getCurrentSecureAttempt(id, token);
          if (cancelled) return;
          currentAttempt = current.attempt;
          if (currentAttempt && current.settings) data.secureLab = current.settings;
        }
        setAssignment(data);
        secureAssignmentRef.current = data;
        secureAttemptRef.current = currentAttempt;
        setSecureAttempt(currentAttempt);
        setSecureAccessGranted(false);
        setTestCases(cases.map((testCase, index) => ({
            id: index + 1,
          input: testCase.input,
          expected: testCase.expectedOutput,
          status: 'Pending',
        })));
        const preferredLanguage = data.languages?.includes('python')
          ? 'python'
          : data.languages?.[0] || 'python';
        const draft = studentService.getCodeDraft(id, user?.id);
        const draftLanguage = draft && data.languages?.includes(draft.language)
          ? draft.language
          : preferredLanguage;
        setLanguage(draftLanguage);
        activity.current.language = draftLanguage;
        setCode(draft?.code || studentService.getCodeTemplate(draftLanguage));
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Unable to load assignment.');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token, user?.id]);

  const recordSecureEvent = (type, options = {}, requestOptions = {}) => {
    const eventRequest = secureEventQueue.current.then(
      () => sendSecureEvent(type, options, requestOptions),
    );
    secureEventQueue.current = eventRequest.catch(() => {});
    return eventRequest;
  };

  const announceSecureWarning = (type, counted, attempt) => {
    if (!counted) return;
    const threshold = secureAssignmentRef.current?.secureLab?.warningThreshold ?? 1;
    if (threshold <= 0 || attempt.violationCount < threshold) return;
    setSecureWarning({
      type,
      count: attempt.violationCount,
      fullscreenExitCount: attempt.fullscreenExitCount || 0,
      reviewRequired: attempt.reviewRequired,
    });
  };

  const sendSecureEvent = async (type, { violation = false } = {}, requestOptions = {}) => {
    const currentAttempt = secureAttemptRef.current;
    if (!currentAttempt || currentAttempt.status !== 'active') return;

    const now = Date.now();
    const activityEvent = {
      type,
      clientEventId: globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2)}`,
      clientTimestamp: new Date(now).toISOString(),
    };

    try {
      const result = await liveLabService.recordSecureActivity(
        currentAttempt.id,
        activityEvent,
        token,
        requestOptions,
      );
      secureAttemptRef.current = result.attempt;
      setSecureAttempt(result.attempt);
      setSecureError('');
      if (violation) announceSecureWarning(type, result.counted, result.attempt);
    } catch (error) {
      const retryable = !error.status || error.status >= 500 || error.status === 429;
      if (!retryable) {
        setSecureError(`Activity was rejected by the server and was not recorded: ${error.message}`);
        return;
      }
      if (pendingSecureEvents.current.length >= 20) {
        const dropped = pendingSecureEvents.current.shift();
        console.error(`Secure Lab activity queue overflow; unconfirmed ${dropped.type} event was dropped.`);
        setSecureError('The activity retry queue is full; an earlier unconfirmed event was dropped.');
      } else {
        setSecureError(`Activity could not be confirmed by the server and is queued for retry: ${error.message}`);
      }
      pendingSecureEvents.current.push(activityEvent);
    }
  };

  useEffect(() => {
    secureAttemptRef.current = secureAttempt;
  }, [secureAttempt]);

  useEffect(() => {
    secureAssignmentRef.current = assignment;
  }, [assignment]);

  useEffect(() => {
    if (!assignment?.secureLab?.enabled || !secureAccessGranted || secureAttempt?.status !== 'active') {
      return undefined;
    }
    const handleFullscreenChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setSecureFullscreen(fullscreen);
      if (!fullscreen && assignment.secureLab.requireFullscreen) {
        setSecureAccessGranted(false);
        // Start the 15-second return-to-fullscreen warning timer
        setFullscreenWarningActive(true);
        setFullscreenTimeRemaining(15);
        if (assignment.secureLab.recordFullscreenExits) {
          recordSecureEvent('FULLSCREEN_EXIT', { violation: true });
        }
      } else if (fullscreen) {
        // Fullscreen restored - cancel the warning timer
        setFullscreenWarningActive(false);
        setFullscreenTimeRemaining(0);
        if (fullscreenWarningTimerRef.current) {
          clearInterval(fullscreenWarningTimerRef.current);
          fullscreenWarningTimerRef.current = null;
        }
        recordSecureEvent('FULLSCREEN_RESTORED');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [assignment, secureAccessGranted, secureAttempt?.status]);

  // 15-second return-to-fullscreen warning timer
  useEffect(() => {
    if (!fullscreenWarningActive) return undefined;
    fullscreenWarningTimerRef.current = setInterval(() => {
      setFullscreenTimeRemaining((prev) => {
        if (prev <= 1) {
          fullscreenTimeoutAutoSubmit.current = true;
          setFullscreenWarningActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (fullscreenWarningTimerRef.current) {
        clearInterval(fullscreenWarningTimerRef.current);
        fullscreenWarningTimerRef.current = null;
      }
    };
  }, [fullscreenWarningActive]);

  // Auto-submit when the 15-second fullscreen return window expires
  useEffect(() => {
    if (!fullscreenTimeoutAutoSubmit.current) return;
    fullscreenTimeoutAutoSubmit.current = false;
    setSecureWarning(null);
    setAutoSubmitted(true);
    handleSubmit();
  }, [fullscreenTimeoutAutoSubmit.current]);

  useEffect(() => {
    if (!assignment?.secureLab?.enabled || secureAttempt?.status !== 'active') return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && assignment.secureLab.recordTabSwitches) {
        recordSecureEvent('TAB_HIDDEN', { violation: true });
      } else if (document.visibilityState === 'visible' && assignment.secureLab.recordTabSwitches) {
        recordSecureEvent('TAB_VISIBLE');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [assignment, secureAttempt?.status]);

  useEffect(() => {
    if (!assignment?.secureLab?.enabled || secureAttempt?.status !== 'active') return undefined;
    const timer = setInterval(() => setSecureNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [assignment?.secureLab?.enabled, secureAttempt?.status]);

  useEffect(() => {
    const hidden = Boolean(
      assignment?.secureLab?.enabled && secureAccessGranted && secureFullscreen,
    );
    document.body.classList.toggle('secure-assessment-fullscreen', hidden);
    return () => document.body.classList.remove('secure-assessment-fullscreen');
  }, [assignment?.secureLab?.enabled, secureAccessGranted, secureFullscreen]);

  useEffect(() => {
    if (!assignment?.secureLab?.enabled || secureAttempt?.status !== 'active') return undefined;
    const retryQueuedEvents = async () => {
      if (document.visibilityState !== 'visible') return;
      while (pendingSecureEvents.current.length) {
        const event = pendingSecureEvents.current[0];
        try {
          const result = await liveLabService.recordSecureActivity(secureAttempt.id, event, token);
          pendingSecureEvents.current.shift();
          secureAttemptRef.current = result.attempt;
          setSecureAttempt(result.attempt);
          setSecureError('');
          announceSecureWarning(event.type, result.counted, result.attempt);
        } catch (error) {
          setSecureError(`Queued activity is not yet confirmed by the server: ${error.message}`);
          break;
        }
      }
    };
    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') retryQueuedEvents();
    };
    window.addEventListener('online', retryQueuedEvents);
    document.addEventListener('visibilitychange', retryWhenVisible);
    if (navigator.onLine && pendingSecureEvents.current.length) retryQueuedEvents();
    return () => {
      window.removeEventListener('online', retryQueuedEvents);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, [assignment?.secureLab?.enabled, secureAttempt?.id, secureAttempt?.status, token]);

  const previousPath = useRef(location.pathname);
  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = location.pathname;
    if (
      previous !== location.pathname
      && previous === `/student/submit/${id}`
      && secureAttempt?.status === 'active'
    ) {
      recordSecureEvent('PAGE_EXIT', { violation: true }, { keepalive: true });
    }
  }, [id, location.pathname, secureAttempt?.status]);

  useEffect(() => {
    if (!assignment?.secureLab?.enabled || secureAttempt?.status !== 'active') return undefined;
    const warnBeforeExit = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const recordPageExit = () => {
      recordSecureEvent('PAGE_EXIT', { violation: true }, { keepalive: true });
    };
    window.addEventListener('beforeunload', warnBeforeExit);
    window.addEventListener('pagehide', recordPageExit);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeExit);
      window.removeEventListener('pagehide', recordPageExit);
    };
  }, [assignment?.secureLab?.enabled, secureAttempt?.id, secureAttempt?.status]);

  const enterSecureMode = async () => {
    setSecureError('');
    const settings = assignment.secureLab;
    if (settings.requireFullscreen) {
      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
        setSecureError('This browser does not support the required fullscreen assessment mode.');
        return;
      }
      try {
        await document.documentElement.requestFullscreen();
        if (!document.fullscreenElement) {
          throw new Error('Fullscreen permission was not granted. Please retry.');
        }
        setSecureFullscreen(true);
      } catch (error) {
        setSecureError(error.message || 'Fullscreen could not be activated. Please allow it and retry.');
        return;
      }
    }

    if (secureAttempt?.status === 'active') {
      setSecureAccessGranted(true);
      if (settings.requireFullscreen) await recordSecureEvent('FULLSCREEN_RESTORED');
      return;
    }
    if (secureAttempt) {
      setSecureError('This assessment attempt has ended. Return to the assignment page to review its status.');
      return;
    }
    try {
      const started = await liveLabService.startSecureAttempt(id, token);
      secureAttemptRef.current = started;
      setSecureAttempt(started);
      setSecureAccessGranted(true);
    } catch (error) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch((fullscreenError) => {
          console.error('Unable to leave fullscreen after the attempt could not start:', fullscreenError);
        });
      }
      setSecureFullscreen(false);
      setSecureError(error.message || 'Unable to start the Secure Lab assessment.');
    }
  };

  useEffect(() => {
    if (
      !assignment
      || !liveLabActive
      || (assignment.secureLab?.enabled && (!secureAccessGranted || secureAttempt?.status !== 'active'))
    ) return undefined;
    let active = true;
    const heartbeat = async () => {
      try {
        await liveLabService.heartbeat({
          assignmentId: id,
          language: activity.current.language,
          status: activity.current.status,
        }, token);
        if (active) setLiveLabError('');
      } catch (error) {
        if (active) setLiveLabError(error.message || 'Live lab presence could not be synchronized.');
      }
    };
    heartbeat();
    const timer = setInterval(heartbeat, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      liveLabService.stopSession(id, token).catch((error) => {
        console.error('Unable to close the live lab session:', error);
      });
    };
  }, [id, assignment, liveLabActive, secureAccessGranted, secureAttempt?.status, token]);

  const handleCodeChange = (nextCode) => {
    setCode(nextCode);
    try {
      studentService.saveCodeDraft(id, user?.id, language, nextCode);
    } catch (error) {
      setActionError('Your code is still in the editor, but this browser could not save a local draft.');
      console.error('Unable to save assignment draft:', error);
    }
  };

  const handleLanguageChange = (lang) => {
    activity.current.language = lang;
    setLanguage(lang);
    const nextCode = studentService.getCodeTemplate(lang);
    setCode(nextCode);
    try {
      studentService.saveCodeDraft(id, user?.id, lang, nextCode);
    } catch (error) {
      setActionError('Your language changed, but this browser could not save a local draft.');
      console.error('Unable to save assignment draft:', error);
    }
    setRunResults(null);
    setConsoleOutput(null);
  };

  const handleRun = async () => {
    activity.current.status = 'running';
    setRunning(true);
    setRunResults(null);
    setConsoleOutput(null);
    setActionError('');
    try {
      const { run } = await studentService.runCode(id, language, code, token);
      setRunResults(run.testCases.map((testCase) => ({
        id: testCase.order + 1,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: testCase.actualOutput,
        status: testCase.status,
        time: testCase.executionTimeMs,
      })));
      setConsoleOutput({
        status: run.summary.status,
        output: run.testCases
          .map((testCase, index) => [
            `Test ${index + 1}: ${testCase.status}`,
            testCase.actualOutput,
            testCase.diagnostic,
          ].filter(Boolean).join('\n'))
          .join('\n'),
        executionTime: run.summary.executionTimeMs,
      });
    } catch (error) {
      setActionError(error.message || 'Unable to run code.');
      setConsoleOutput({
        status: 'Unavailable',
        output: error.message || 'Code execution is currently unavailable.',
      });
    } finally {
      setRunning(false);
      activity.current.status = 'editing';
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setActionError('');
    try {
      const result = await studentService.submitCode(id, language, code, token);
      studentService.clearCodeDraft(id, user?.id);
      setLiveLabActive(false);
      try {
        await liveLabService.stopSession(id, token);
      } catch (error) {
        setLiveLabError(error.message || 'Submission succeeded, but live lab presence did not close.');
      }
      setSubmitResult(result);
      setShowSubmitModal(false);
      setShowSuccessModal(true);
      if (secureAttempt) {
        secureAttemptRef.current = { ...secureAttempt, status: 'submitted' };
        setSecureAttempt((current) => current ? { ...current, status: 'submitted' } : current);
        setSecureAccessGranted(false);
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (fullscreenError) {
            console.error('Submission succeeded, but fullscreen could not be closed:', fullscreenError);
          }
        }
      }
    } catch (error) {
      setActionError(error.message || 'Unable to submit solution.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      autoSubmitTriggered.current
      || !assignment?.secureLab?.enabled
      || secureAttempt?.status !== 'active'
      || !secureAttempt?.autoSubmitRequired
    ) return;
    autoSubmitTriggered.current = true;
    setSecureWarning(null);
    setAutoSubmitted(true);
    handleSubmit();
  }, [assignment?.secureLab?.enabled, secureAttempt?.autoSubmitRequired, secureAttempt?.status]);

  const handleReset = () => {
    const template = studentService.getCodeTemplate(language);
    setCode(template);
    studentService.clearCodeDraft(id, user?.id);
    setRunResults(null);
    setConsoleOutput(null);
  };

  if (!assignment) {
    return (
      <div className="flex items-center justify-center py-20">
        {loadError
          ? <p role="alert" className="text-sm text-cera-error">{loadError}</p>
          : <div className="w-8 h-8 border-2 border-cera-primary border-t-transparent rounded-full animate-spin" />}
      </div>
    );
  }

  const secureRemainingMs = secureAttempt
    ? Math.max(0, new Date(secureAttempt.deadlineAt).getTime() - secureNow)
    : null;
  const secureTimeExpired = secureRemainingMs !== null && secureRemainingMs <= 0;
  const secureTimeLabel = secureRemainingMs === null
    ? ''
    : `${Math.floor(secureRemainingMs / 60_000).toString().padStart(2, '0')}:${Math.floor((secureRemainingMs % 60_000) / 1000).toString().padStart(2, '0')}`;

  if (assignment.secureLab?.enabled && (
    !secureAccessGranted
    || (assignment.secureLab.requireFullscreen && !secureFullscreen)
  )) {
    const attemptEnded = secureAttempt && secureAttempt.status !== 'active';
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <div className="rounded-xl border border-cera-border bg-cera-card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck size={26} className="text-cera-warning" />
            <div>
              <p className="text-xs uppercase tracking-widest text-cera-highlight">Secure Lab Mode</p>
              <h1 className="text-xl font-bold text-cera-text">{assignment.title}</h1>
            </div>
          </div>
          {attemptEnded ? (
            <>
              <p className="rounded-lg border border-cera-warning/30 bg-cera-warning/5 p-4 text-sm text-cera-muted" role="status">
                This assessment attempt is {secureAttempt.status}. Its timer cannot be restarted.
              </p>
              <Button className="mt-5" variant="ghost" onClick={() => navigate(`/student/assignments/${id}`)}>
                Return to assignment
              </Button>
            </>
          ) : (
            <>
              <ul className="space-y-3 text-sm text-cera-muted">
                {assignment.secureLab.requireFullscreen && <li>• You must enter fullscreen before the assessment starts or resumes.</li>}
                {assignment.secureLab.recordTabSwitches && <li>• Switching tabs or minimizing the browser may be recorded.</li>}
                {assignment.secureLab.recordFullscreenExits && <li>• Exiting fullscreen may be recorded for faculty review.</li>}
                {assignment.secureLab.recordFullscreenExits && assignment.secureLab.maxFullscreenExits > 0 && (
                  <li>
                    • Exceeding {assignment.secureLab.maxFullscreenExits} fullscreen
                    {' '}{assignment.secureLab.maxFullscreenExits === 1 ? 'exit' : 'exits'} automatically submits your work.
                  </li>
                )}
                <li>• Repeated activity may be flagged for review; these signals are not proof of misconduct.</li>
                <li>• Browser monitoring cannot prevent or detect every form of cheating.</li>
                <li>• Save or submit your work before the deadline.</li>
              </ul>
              {!secureAttempt && (
                <label className="mt-5 flex items-start gap-3 text-sm text-cera-text">
                  <input
                    type="checkbox"
                    checked={secureConsent}
                    onChange={(event) => setSecureConsent(event.target.checked)}
                    className="mt-1 accent-cera-primary"
                  />
                  <span>I have read and understand these assessment rules.</span>
                </label>
              )}
              {secureError && <p role="alert" className="mt-4 text-sm text-cera-error">{secureError}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/student/assignments/${id}`)}
                >
                  Cancel
                </Button>
                <Button
                  icon={ShieldCheck}
                  disabled={attemptEnded || (!secureAttempt && !secureConsent)}
                  onClick={enterSecureMode}
                >
                  {secureAttempt ? 'Re-enter Secure Mode' : 'Enter Secure Mode'}
                </Button>
              </div>
            </>
          )}
        </div>
        <Modal
          isOpen={Boolean(secureWarning)}
          onClose={() => setSecureWarning(null)}
          title="Secure Lab activity recorded"
          size="sm"
        >
          {secureWarning && (
            <div className="space-y-4">
              <p className="text-sm text-cera-muted">
                {secureWarning.count >= 2
                  ? `This is recorded violation ${secureWarning.count}. Repeated activity may require faculty review.`
                  : secureWarning.type === 'TAB_HIDDEN'
                    ? 'The assessment page became hidden.'
                    : 'Fullscreen was exited during the assessment.'}
                {' '}This activity is a reviewable signal, not a determination of misconduct.
              </p>
              <p className="text-sm text-cera-text">
                Recorded violations: {secureWarning.count}
                {secureWarning.reviewRequired ? ' · Flagged for faculty review' : ''}
              </p>
              {secureWarning.type === 'FULLSCREEN_EXIT' && (
                <p className="text-sm text-cera-muted">
                  Fullscreen exits recorded: {secureWarning.fullscreenExitCount}
                </p>
              )}
              <Button className="w-full" onClick={() => setSecureWarning(null)}>Continue</Button>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  const hasProblems = assignment.problems && assignment.problems.length > 0;

  return (
    <div className="space-y-4">
    {secureError && (
      <p role="alert" className="rounded-lg border border-cera-warning/30 bg-cera-warning/5 p-3 text-xs text-cera-warning">
        {secureError}
      </p>
    )}
    {autoSubmitted && (
      <p role="status" className="rounded-lg border border-cera-primary/30 bg-cera-primary/5 p-3 text-xs text-cera-highlight">
        This assessment was submitted automatically because the fullscreen-exit limit was reached.
      </p>
    )}
    {liveLabError && (
      <p role="alert" className="rounded-lg border border-cera-error/30 bg-cera-error/5 p-3 text-xs text-cera-error">
        {liveLabError}
      </p>
    )}
    {fullscreenWarningActive && (
      <div className="rounded-lg border border-cera-warning/50 bg-cera-warning/10 p-4 mb-4 animate-pulse">
        <div className="flex items-start gap-3">
          <ShieldAlert size={24} className="shrink-0 text-cera-warning mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cera-text">Return to Fullscreen</p>
            <p className="text-sm text-cera-warning">
              You exited fullscreen. Please return within{' '}
              <span className="font-mono font-bold text-cera-error">{fullscreenTimeRemaining}s</span>{' '}
              or your assessment will be auto-submitted.
            </p>
            <Button
              size="sm"
              icon={Maximize2}
              onClick={enterSecureMode}
              className="mt-3"
            >
              Return to Fullscreen
            </Button>
          </div>
        </div>
      </div>
    )}
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
            {languages
              .filter((item) => !assignment.languages || assignment.languages.includes(item.value))
              .map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-cera-card border border-cera-border rounded-xl p-4">
        {actionError && (
          <p role="alert" className="mb-3 text-sm text-cera-error">{actionError}</p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-cera-text">{assignment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={assignment.difficulty} />
              <span className="text-xs text-cera-muted">{assignment.subject}</span>
            </div>
            {secureAttempt?.status === 'active' && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-cera-primary/30 px-3 py-1 text-cera-highlight">
                  Secure assessment active
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-cera-border px-3 py-1 text-cera-text">
                  <Clock size={13} /> {secureTimeLabel} remaining
                </span>
                <span className="rounded-full border border-cera-border px-3 py-1 text-cera-muted">
                  {secureAttempt.violationCount} recorded violation{secureAttempt.violationCount === 1 ? '' : 's'}
                </span>
                {secureAttempt.fullscreenExitCount > 0 && (
                  <span className="rounded-full border border-cera-border px-3 py-1 text-cera-muted">
                    {secureAttempt.fullscreenExitCount} fullscreen exit{secureAttempt.fullscreenExitCount === 1 ? '' : 's'}
                  </span>
                )}
                {assignment.secureLab.requireFullscreen && (
                  <span className={`rounded-full border px-3 py-1 ${secureFullscreen ? 'border-cera-success/30 text-cera-success' : 'border-cera-warning/30 text-cera-warning'}`}>
                    {secureFullscreen ? 'Fullscreen active' : 'Fullscreen required'}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={RotateCcw} onClick={handleReset}>Reset</Button>
            <Button
              size="sm"
              variant="ghost"
              icon={Play}
              onClick={handleRun}
              loading={running}
              disabled={running || testCases.length === 0 || (assignment.secureLab?.enabled && secureTimeExpired)}
            >
              {running ? 'Running...' : 'Run Code'}
            </Button>
            <Button
              size="sm"
              icon={Send}
              onClick={() => setShowSubmitModal(true)}
              disabled={assignment.secureLab?.enabled && secureTimeExpired}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
      {assignment.secureLab?.enabled && secureTimeExpired && (
        <p role="alert" className="rounded-lg border border-cera-error/30 bg-cera-error/5 p-3 text-sm text-cera-error">
          The assessment deadline has passed. The server will not accept further code execution or submissions.
        </p>
      )}

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
              onChange={handleCodeChange}
              language={language}
              height="400px"
            />
          </div>
        </div>
      </div>

      {/* Test Cases & Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {testCases.length === 0 && (
            <p role="status" className="mb-2 rounded-lg border border-cera-border bg-cera-card p-3 text-sm text-cera-muted">
              No public test cases are available yet. Ask your faculty member to add a public test case before running your code.
            </p>
          )}
          <TestCasePanel
            testCases={testCases}
            running={running}
            results={runResults}
          />
        </div>
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
          <p className="text-cera-muted text-sm mb-6">This creates a submission record for your current code. You can continue editing and submit another version later.</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
            <Button variant="success" className="flex-1" icon={Send} onClick={handleSubmit} loading={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success / Auto-submit Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={autoSubmitted ? 'Assessment Auto-Submitted' : 'Submission Received'}
        size="md"
      >
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${autoSubmitted ? 'bg-cera-warning/10' : 'bg-cera-success/10'}`}
          >
            {autoSubmitted
              ? <ShieldAlert size={36} className="text-cera-warning" />
              : <CheckCircle size={36} className="text-cera-success" />}
          </motion.div>
          {autoSubmitted ? (
            <>
              <h3 className="text-lg font-semibold text-cera-text mb-2">Your assessment was submitted automatically</h3>
              <p className="text-sm text-cera-muted">
                You exited fullscreen more than the allowed number of times, so your current code was
                submitted automatically to protect the integrity of the assessment. This action has been
                recorded and may be reviewed by your faculty.
              </p>
            </>
          ) : (
            <h3 className="text-lg font-semibold text-cera-text mb-2">Submission received successfully!</h3>
          )}
          {submitResult && (
            <div className="bg-cera-elevated rounded-lg p-4 mt-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-cera-muted">Status</span>
                <StatusBadge status={autoSubmitted ? 'Auto-Submitted' : 'Submitted'} />
              </div>
              {autoSubmitted && secureAttempt?.fullscreenExitCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-cera-muted">Fullscreen exits</span>
                  <span className="text-cera-text">{secureAttempt.fullscreenExitCount}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSuccessModal(false)}>Close</Button>
            <Button className="flex-1" onClick={() => navigate('/student/submissions')}>View Submissions</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(secureWarning)}
        onClose={() => setSecureWarning(null)}
        title="Secure Lab activity recorded"
        size="sm"
      >
        {secureWarning && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-sm text-cera-muted">
              <ShieldAlert size={20} className="shrink-0 text-cera-warning" />
              <p>
              {secureWarning.count >= 2
                ? `This is recorded violation ${secureWarning.count}. Repeated activity may require faculty review.`
                : secureWarning.type === 'TAB_HIDDEN'
                  ? 'The assessment page became hidden.'
                  : 'Fullscreen was exited during the assessment.'}
              {' '}This activity has been recorded as a reviewable signal, not as a determination of misconduct.
            </p>
            </div>
            <p className="text-sm text-cera-text">
              Recorded violations: {secureWarning.count}
              {secureWarning.reviewRequired ? ' · Flagged for faculty review' : ''}
            </p>
            <Button className="w-full" onClick={() => setSecureWarning(null)}>
              {assignment.secureLab.requireFullscreen && !secureFullscreen ? 'Re-enter fullscreen to continue' : 'Continue'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
