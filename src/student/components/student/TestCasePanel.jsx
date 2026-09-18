import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestCasePanel({ testCases, running, results }) {
  const displayCases = results || testCases;

  return (
    <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cera-border">
        <h3 className="font-semibold text-cera-text text-sm">Test Cases</h3>
        {running && (
          <div className="flex items-center gap-2 text-cera-primary">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Running...</span>
          </div>
        )}
      </div>
      <div className="divide-y divide-cera-border max-h-64 overflow-y-auto">
        <AnimatePresence>
          {displayCases.map((tc) => {
            const passed = tc.status === 'Passed';
            const failed = tc.status === 'Failed';
            const pending = tc.status === 'Pending';
            return (
              <motion.div
                key={tc.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {passed && <CheckCircle size={16} className="text-cera-success" />}
                    {failed && <XCircle size={16} className="text-cera-error" />}
                    {pending && <div className="w-4 h-4 rounded-full border-2 border-cera-muted/30" />}
                    {running && !pending && <Loader2 size={16} className="text-cera-primary animate-spin" />}
                    <span className="text-sm font-medium text-cera-text">Test Case {tc.id}</span>
                  </div>
                  {tc.time > 0 && (
                    <div className="flex items-center gap-3 text-xs text-cera-muted font-mono">
                      <span>{tc.time}ms</span>
                      <span>{tc.memory}MB</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-cera-elevated rounded-lg p-2.5">
                    <p className="text-cera-muted mb-1">Input</p>
                    <p className="text-cera-text font-mono">{tc.input}</p>
                  </div>
                  <div className="bg-cera-elevated rounded-lg p-2.5">
                    <p className="text-cera-muted mb-1">Expected</p>
                    <p className="text-cera-text font-mono">{tc.expected}</p>
                  </div>
                  {tc.actual !== null && tc.actual !== undefined && (
                    <div className={`rounded-lg p-2.5 sm:col-span-2 ${failed ? 'bg-cera-error/10' : 'bg-cera-success/10'}`}>
                      <p className={`mb-1 ${failed ? 'text-cera-error' : 'text-cera-success'}`}>Actual Output</p>
                      <p className="text-cera-text font-mono">{tc.actual}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
