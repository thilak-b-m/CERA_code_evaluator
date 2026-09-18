export default function Avatar({ children, color }) {
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