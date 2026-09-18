export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', background: 'rgba(5,8,18,.7)', padding: 20 }}><div className="panel" style={{ width: 'min(520px,100%)', padding: 22 }}><div className="panel-header" style={{ padding: '0 0 15px' }}><strong>{title}</strong><button className="icon-btn" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</div></div>;
}