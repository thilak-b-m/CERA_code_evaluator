

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

export default function SubmissionTable({ rows = [] }) {  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Submission</th>
            <th>Assignment</th>
            <th>Language</th>
            <th>Score</th>
            <th>Result</th>
            <th>Received</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <a
                  href={`/submissions/${s.id}`}
                  style={{
                    color: 'var(--text)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {s.id}
                </a>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    marginTop: 6,
                  }}
                >
                  <Avatar>
                    {s.student
                      .split(' ')
                      .map((x) => x[0])
                      .join('')}
                  </Avatar>

                  {s.student}
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
                      s.score > 80
                        ? 'var(--success)'
                        : s.score > 60
                          ? 'var(--warning)'
                          : 'var(--error)',
                    font: '700 12px var(--app-font-mono)',
                  }}
                >
                  {s.score}/100
                </span>
              </td>

              <td>
                <Status
                  tone={
                    s.result === 'Passed'
                      ? 'success'
                      : s.result === 'Failed'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {s.result}
                </Status>
              </td>

              <td>{s.submitted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}