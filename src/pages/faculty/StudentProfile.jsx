import { useParams } from 'wouter';
import {
  Send,
  FileText,
  Target,
  BookOpen,
  Timer,
  ShieldCheck,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import { students } from '../../data/facultyMockData.js';

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

function Kpi({ icon: Icon, label, value, trend, color }) {
  return (
    <div className="kpi">
      <div
        className="kpi-icon"
        style={{ color }}
      >
        <Icon size={17} />
      </div>

      <div className="kpi-label">
        {label}
      </div>

      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-trend">
        {trend}
      </div>
    </div>
  );
}

function Section({ title, kicker, action, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            {title}
          </div>

          {kicker && (
            <div className="panel-kicker">
              {kicker}
            </div>
          )}
        </div>

        {action && <div>{action}</div>}
      </div>

      {children}
    </section>
  );
}

function Chart() {
  return (
    <div
      style={{
        height: 180,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        padding: '10px 0',
      }}
    >
      {[62, 70, 66, 78, 74, 88, 82, 94].map(
        (value, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${value}%`,
              minHeight: 20,
              background: 'var(--primary)',
              borderRadius: '5px 5px 0 0',
              opacity: 0.8,
            }}
            title={`Assignment ${index + 1}: ${value}%`}
          />
        )
      )}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();

  const student =
    students.find((s) => s.id === id) ||
    students[0];

  return (
    <Page
      eyebrow={`STUDENTS / ${student.id}`}
      title={student.name}
      subtitle={student.email}
      actions={
        <>
          <button className="btn btn-ghost">
            <Send size={14} />
            Message
          </button>

          <button className="btn btn-primary">
            <FileText size={14} />
            Student report
          </button>
        </>
      }
    >
      <div
        className="panel"
        style={{
          padding: 22,
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Avatar color={student.color}>
          {student.initials}
        </Avatar>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {student.name}
          </div>

          <div
            style={{
              color: 'var(--muted)',
              fontSize: 12,
              marginTop: 5,
            }}
          >
            CS 301 · Algorithms · joined Sep 4, 2024
          </div>
        </div>

        <Status tone="success">
          On track
        </Status>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              color: 'var(--muted)',
              fontSize: 10,
            }}
          >
            COURSE AVERAGE
          </div>

          <div
            style={{
              font: '24px var(--app-font-mono)',
              marginTop: 4,
            }}
          >
            {student.score}%
          </div>
        </div>
      </div>

      <div
        className="grid-kpi"
        style={{ marginTop: 14 }}
      >
        <Kpi
          icon={Target}
          label="Course average"
          value={`${student.score}%`}
          trend="+6.8% this month"
          color="var(--success)"
        />

        <Kpi
          icon={BookOpen}
          label="Labs completed"
          value={student.labs.split(' / ')[0]}
          trend="On schedule"
          color="var(--accent)"
        />

        <Kpi
          icon={Timer}
          label="Avg. runtime"
          value="693ms"
          trend="Top 30% of class"
          color="var(--primary)"
        />

        <Kpi
          icon={ShieldCheck}
          label="Integrity score"
          value="Clean"
          trend="No matches found"
          color="var(--secondary)"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0,1.2fr) minmax(280px,.8fr)',
          gap: 14,
          marginTop: 14,
        }}
      >
        <Section
          title="Performance over time"
          kicker="Score by assignment"
        >
          <div
            style={{
              padding: '5px 20px 17px',
            }}
          >
            <Chart />
          </div>
        </Section>

        <Section title="Skill signals">
          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 16,
            }}
          >
            {[
              ['Algorithms', 82],
              ['Debugging', 74],
              ['Code quality', 91],
              ['Testing discipline', 67],
            ].map(([x, v]) => (
              <div key={x}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 6,
                  }}
                >
                  <span>{x}</span>

                  <span
                    style={{
                      font:
                        '11px var(--app-font-mono)',
                      color: 'var(--accent)',
                    }}
                  >
                    {v}
                  </span>
                </div>

                <div className="progress">
                  <span
                    style={{
                      width: `${v}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Page>
  );
}