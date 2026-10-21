const categoryLabels = {
  syntax: 'Syntax error',
  logic: 'Logic error',
  requirements: 'Requirement not met',
  none: 'No clear error found',
};

export default function FeedbackGuidance({ guidance }) {
  if (!guidance) return null;

  return (
    <section className="bg-cera-card border border-cera-secondary/30 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-cera-text">AI correction guide</h3>
        <span className="inline-block mt-2 text-xs text-cera-secondary bg-cera-secondary/10 px-2 py-1 rounded-full">
          {categoryLabels[guidance.category] || 'Code feedback'}
        </span>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-cera-text">What needs attention</h4>
        <p className="text-sm text-cera-muted leading-relaxed">{guidance.issue}</p>
        <p className="text-sm text-cera-muted leading-relaxed">{guidance.explanation}</p>
      </div>

      {guidance.correctionSteps?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-cera-text mb-2">How to correct it</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-cera-muted">
            {guidance.correctionSteps.map((step, index) => (
              <li key={`${index}-${step}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {guidance.correctedCode && (
        <div>
          <h4 className="text-sm font-medium text-cera-text mb-2">Corrected example</h4>
          <pre className="overflow-x-auto rounded-lg bg-cera-bg border border-cera-border p-4 text-sm text-cera-text">
            <code>{guidance.correctedCode}</code>
          </pre>
        </div>
      )}

      <p className="text-xs text-cera-muted">
        This guidance is based on reviewing the submitted code; the AI has not run it.
      </p>
    </section>
  );
}
