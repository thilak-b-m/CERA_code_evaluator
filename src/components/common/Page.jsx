import { motion } from 'framer-motion';

export default function Page({
  eyebrow = 'CERA / FACULTY',
  title,
  subtitle,
  actions,
  children,
}) {
  return (
    <div className="content">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            alignItems: 'flex-end',
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow">{eyebrow}</div>

            <h1 className="page-title">{title}</h1>

            <p className="page-subtitle">{subtitle}</p>
          </div>

          {actions && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {actions}
            </div>
          )}
        </div>

        {children}
      </motion.div>
    </div>
  );
}