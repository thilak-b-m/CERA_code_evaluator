import { motion } from 'framer-motion';
import { CheckCircle, Clock, Target, Code, Trophy, Zap } from 'lucide-react';

const iconMap = { CheckCircle, Clock, Target, Code, Trophy, Zap };

const colorClasses = {
  success: { text: 'text-cera-success', bg: 'bg-cera-success/10', border: 'border-cera-success/20' },
  warning: { text: 'text-cera-warning', bg: 'bg-cera-warning/10', border: 'border-cera-warning/20' },
  primary: { text: 'text-cera-primary', bg: 'bg-cera-primary/10', border: 'border-cera-primary/20' },
  highlight: { text: 'text-cera-highlight', bg: 'bg-cera-highlight/10', border: 'border-cera-highlight/20' },
  secondary: { text: 'text-cera-secondary', bg: 'bg-cera-secondary/10', border: 'border-cera-secondary/20' },
  error: { text: 'text-cera-error', bg: 'bg-cera-error/10', border: 'border-cera-error/20' },
};

export default function DashboardStats({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => {
        const Icon = iconMap[stat.icon] || Target;
        const colors = colorClasses[stat.color] || colorClasses.primary;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-cera-card border border-cera-border rounded-xl p-4 hover:border-cera-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
                <Icon size={18} className={colors.text} />
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              {stat.prefix && <span className="text-lg font-bold text-cera-text">{stat.prefix}</span>}
              <span className="text-2xl font-bold text-cera-text">{stat.value}</span>
              {stat.suffix && <span className="text-sm font-medium text-cera-muted ml-1">{stat.suffix}</span>}
            </div>
            <p className="text-xs text-cera-muted mt-1">{stat.label}</p>
            {stat.change && (
              <p className={`text-xs mt-1.5 ${colors.text}`}>{stat.change}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
