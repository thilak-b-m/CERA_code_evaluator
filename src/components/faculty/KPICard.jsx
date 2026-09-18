import { ArrowUpRight } from 'lucide-react';

export default function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'var(--primary)',
  onClick,
}) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className="panel kpi"
      style={{
        '--kpi-color': color,
        cursor: isClickable ? 'pointer' : 'default',
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (
          isClickable &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault();
          onClick();
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="kpi-icon">
        <Icon size={17} />
      </div>

      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-label">
        {label}
      </div>

      <div className="kpi-trend">
        <ArrowUpRight
          size={12}
          style={{
            verticalAlign: 'middle',
          }}
        />{' '}
        {trend}
      </div>
    </div>
  );
}