export default function AnalyticsChart({
  points = [],
  labels = [],
}) {
  const pointSpacing =
    points.length > 1
      ? 700 / (points.length - 1)
      : 700;

  return (
    <div className="chart">
      <div className="chart-grid">
        <span />
        <span />
        <span />
        <span />
      </div>

      <svg
        className="line-chart"
        viewBox="0 0 700 180"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="lineFill"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#6366F1"
              stopOpacity=".32"
            />
            <stop
              offset="100%"
              stopColor="#6366F1"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {points.length > 0 && (
          <>
            <path
              d={`M 0 ${points[0] * 1.9} ${points
                .map(
                  (point, index) =>
                    `L ${index * pointSpacing} ${
                      point * 1.9
                    }`
                )
                .join(' ')} L 700 180 L 0 180 Z`}
              fill="url(#lineFill)"
            />

            <path
              d={points
                .map(
                  (point, index) =>
                    `${index === 0 ? 'M' : 'L'} ${
                      index * pointSpacing
                    } ${point * 1.9}`
                )
                .join(' ')}
              fill="none"
              stroke="#818CF8"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>

      <div className="chart-labels">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}