import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '12px',
};

const axis = { stroke: 'var(--muted)', fontSize: 11 };

function ChartEmpty() {
  return (
    <div className="empty" style={{ padding: '34px 20px' }}>
      <Activity size={26} />
      <p>No data available for this chart yet.</p>
    </div>
  );
}

/**
 * Renders one backend report chart. The data always comes from the report
 * response, so a chart with no real values falls back to an empty state
 * instead of drawing a misleading visual.
 */
export default function ReportChart({ chart }) {
  const data = chart.data || [];

  if (data.length === 0 || data.every((point) => !point.value)) {
    return <ChartEmpty />;
  }

  if (chart.type === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={3}
          >
            {data.map((point, index) => (
              <Cell key={point.name || index} fill={point.color || 'var(--primary)'} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" {...axis} interval={0} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface)' }} />
        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={54} />
      </BarChart>
    </ResponsiveContainer>
  );
}
