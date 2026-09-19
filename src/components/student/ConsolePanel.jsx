import { motion } from 'framer-motion';
import { Terminal, CheckCircle, XCircle, Clock, Cpu } from 'lucide-react';

export default function ConsolePanel({ output, executionTime, memoryUsage, status, running }) {
  return (
    <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-cera-border">
        <Terminal size={16} className="text-cera-highlight" />
        <h3 className="font-semibold text-cera-text text-sm">Console</h3>
      </div>
      <div className="p-4">
        {running ? (
          <div className="flex items-center gap-2 text-cera-primary text-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-cera-primary border-t-transparent rounded-full"
            />
            Executing...
          </div>
        ) : output ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              {status === 'Passed' || status === 'Success' ? (
                <CheckCircle size={16} className="text-cera-success" />
              ) : status === 'Failed' ? (
                <XCircle size={16} className="text-cera-error" />
              ) : null}
              <span className={`text-sm font-medium ${status === 'Passed' || status === 'Success' ? 'text-cera-success' : 'text-cera-error'}`}>
                {status}
              </span>
            </div>
            <pre className="text-sm text-cera-text font-mono whitespace-pre-wrap bg-cera-bg/50 rounded-lg p-3 mb-3">
              {output}
            </pre>
            <div className="flex items-center gap-4 text-xs text-cera-muted font-mono">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {executionTime}ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu size={12} /> {memoryUsage}MB
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-cera-muted">Run your code to see output here.</p>
        )}
      </div>
    </div>
  );
}
