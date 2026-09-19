import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

function ScoreBar({ label, score }) {
  const color = score >= 85 ? 'success' : score >= 70 ? 'warning' : 'error';
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-cera-text">{label}</span>
        <span className="text-sm text-cera-muted font-mono">{score}/100</span>
      </div>
      <ProgressBar value={score} color={color} />
    </div>
  );
}

export default function AIFeedbackCard({ feedback }) {
  if (!feedback) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cera-card border border-cera-secondary/30 rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-cera-secondary/10 flex items-center justify-center">
          <Sparkles size={16} className="text-cera-secondary" />
        </div>
        <h3 className="font-semibold text-cera-text">AI Code Review</h3>
        <span className="text-xs text-cera-muted bg-cera-secondary/10 text-cera-secondary px-2 py-0.5 rounded-full">
          AI-Powered
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <ScoreBar label="Code Quality" score={feedback.codeQuality} />
        <ScoreBar label="Readability" score={feedback.readability} />
        <ScoreBar label="Maintainability" score={feedback.maintainability} />
        <ScoreBar label="Efficiency" score={feedback.efficiency} />
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-cera-text mb-2 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-cera-highlight" />
          Suggestions
        </h4>
        <ul className="space-y-2">
          {feedback.suggestions.map((suggestion, index) => (
            <li key={index} className="text-sm text-cera-muted flex items-start gap-2">
              <span className="text-cera-secondary mt-0.5">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-medium text-cera-text mb-2">Overall Feedback</h4>
        <p className="text-sm text-cera-muted leading-relaxed">{feedback.overall}</p>
      </div>
    </motion.div>
  );
}
