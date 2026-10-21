import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils/formatDate.js';

function Avatar({ children, color }) {
  return (
    <span
      className="avatar"
      style={{
        background: color
          ? `linear-gradient(135deg, ${color}, #6366F1)`
          : undefined,
      }}
    >
      {children}
    </span>
  );
}

function Status({ children, tone = 'neutral' }) {
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

export default function SubmissionTable({ rows = [] }) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Assignment</th>
            <th>Language</th>
            <th>Score</th>
            <th>Result</th>
            <th>Received</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/submissions/${s.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/submissions/${s.id}`);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <Avatar>
                    {(s.student || 'Student')
                      .split(' ')
                      .map((x) => x[0])
                      .join('')}
                  </Avatar>

                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{s.student}</span>
                </div>
              </td>

              <td>{s.assignment}</td>

              <td>
                <span
                  style={{
                    fontFamily: 'var(--app-font-mono)',
                    fontSize: 11,
                  }}
                >
                  {s.lang}
                </span>
              </td>

              <td>
                <span
                  style={{
                    color:
                      s.score === undefined
                        ? 'var(--muted)'
                        : Number(s.score) >= Number(s.maxScore) * 0.8
                        ? 'var(--success)'
                        : Number(s.score) >= Number(s.maxScore) * 0.6
                          ? 'var(--warning)'
                          : 'var(--error)',
                    font: '700 12px var(--app-font-mono)',
                  }}
                >
                      {s.score === undefined ? '—' : `${s.score}/${s.maxScore ?? '—'}`}
                </span>
              </td>

              <td>
                <Status
                  tone={
                    s.result === 'published'
                      ? 'success'
                      : s.result === 'draft'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {s.result === 'published' ? 'Published' : s.result === 'draft' ? 'Draft saved' : 'Needs review'}
                </Status>
              </td>

              <td>{formatDateTime(s.submitted)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
