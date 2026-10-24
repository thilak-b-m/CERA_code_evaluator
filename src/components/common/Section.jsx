import { motion } from 'framer-motion';

export default function Section({ title, kicker, action, children }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          {title && <div className="panel-title">{title}</div>}
          {kicker && <div className="panel-kicker">{kicker}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}
