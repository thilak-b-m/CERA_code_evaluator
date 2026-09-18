import { useMemo, useState } from 'react';
import {
  Download,
  Check,
  GitCompare,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

import { useApp } from '../../context/AppContext.jsx';
import { plagiarismService } from '../../services/plagiarismService.js';

export default function PlagiarismCompare() {
  const { notify } = useApp();

  const comparison = useMemo(
    () => plagiarismService.getComparison(),
    []
  );

  const [reviewed, setReviewed] = useState(
    Boolean(comparison?.reviewed)
  );

  const handleExportEvidence = () => {
    if (!comparison) {
      notify('Comparison evidence is unavailable');
      return;
    }

    const evidence = [
      'CERA Plagiarism Comparison Evidence',
      '',
      `Similarity: ${comparison.similarity}`,
      '',
      `${comparison.left.name} (${comparison.left.id})`,
      `Language: ${comparison.left.language}`,
      `Role: ${comparison.left.role}`,
      '',
      comparison.left.code,
      '',
      `${comparison.right.name} (${comparison.right.id})`,
      `Language: ${comparison.right.language}`,
      `Role: ${comparison.right.role}`,
      '',
      comparison.right.code,
      '',
      `Highlighted region: ${comparison.highlightedLine}`,
    ].join('\n');

    const blob = new Blob([evidence], {
      type: 'text/plain;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${comparison.caseId}-evidence.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    notify('Evidence exported successfully');
  };

  const handleMarkReviewed = () => {
    const result =
      plagiarismService.markComparisonReviewed();

    if (!result) {
      notify('Unable to mark comparison as reviewed');
      return;
    }

    setReviewed(true);
    notify('Plagiarism comparison marked as reviewed');
  };

  if (!comparison) {
    return (
      <Page
        eyebrow="PLAGIARISM / COMPARE"
        title="Compare submissions"
        subtitle="Comparison evidence is currently unavailable."
      >
        <Card
          title="No comparison available"
          kicker="Plagiarism evidence"
        >
          <div
            style={{
              padding: 20,
              color: 'var(--muted)',
              fontSize: 12,
            }}
          >
            No plagiarism comparison data is available
            for review.
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="PLAGIARISM / COMPARE"
      title="Compare submissions"
      subtitle={`${comparison.left.id} · ${comparison.left.name} versus ${comparison.right.id} · ${comparison.right.name}`}
      actions={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportEvidence}
          >
            <Download size={14} />
            Export evidence
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleMarkReviewed}
            disabled={reviewed}
          >
            <Check size={14} />
            {reviewed
              ? 'Reviewed'
              : 'Mark reviewed'}
          </button>
        </>
      }
    >
      <div
        className="panel"
        style={{
          padding: 13,
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'center',
          }}
        >
          <Avatar color={comparison.left.color}>
            {comparison.left.initials}
          </Avatar>

          <div>
            <strong style={{ fontSize: 12 }}>
              {comparison.left.name}
            </strong>

            <small
              style={{
                display: 'block',
                color: 'var(--muted)',
              }}
            >
              {comparison.left.id} ·{' '}
              {comparison.left.language}
            </small>
          </div>
        </div>

        <GitCompare
          size={17}
          color="var(--warning)"
        />

        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'center',
          }}
        >
          <Avatar color={comparison.right.color}>
            {comparison.right.initials}
          </Avatar>

          <div>
            <strong style={{ fontSize: 12 }}>
              {comparison.right.name}
            </strong>

            <small
              style={{
                display: 'block',
                color: 'var(--muted)',
              }}
            >
              {comparison.right.id} ·{' '}
              {comparison.right.language}
            </small>
          </div>
        </div>

        <StatusBadge tone="error">
          {comparison.similarity} similarity
        </StatusBadge>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
        }}
      >
        <Card
          title={comparison.left.name}
          kicker={comparison.left.role}
        >
          <div style={{ padding: 16 }}>
            <pre className="code">
              <span>
                {comparison.left.code.split(
                  comparison.highlightedLine
                )[0]}
              </span>

              <span
                style={{
                  background:
                    'rgba(244,63,94,.2)',
                }}
              >
                {comparison.highlightedLine}
              </span>
            </pre>
          </div>
        </Card>

        <Card
          title={comparison.right.name}
          kicker={comparison.right.role}
        >
          <div style={{ padding: 16 }}>
            <pre className="code">
              <span>
                {comparison.right.code.split(
                  comparison.highlightedLine
                )[0]}
              </span>

              <span
                style={{
                  background:
                    'rgba(244,63,94,.2)',
                }}
              >
                {comparison.highlightedLine}
              </span>
            </pre>
          </div>
        </Card>
      </div>
    </Page>
  );
}