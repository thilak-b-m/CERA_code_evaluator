import { motion } from 'framer-motion';
import { Lock, Award, Code, Star, Flame, Trophy, Zap } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';

const iconMap = {
  Award,
  Code,
  Star,
  Flame,
  Trophy,
  Zap,
};

export default function AchievementCard({ achievement }) {
  const Icon = iconMap[achievement.icon] || Award;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={`relative bg-cera-card border rounded-xl p-4 text-center transition-colors ${
        achievement.unlocked ? 'border-cera-secondary/30' : 'border-cera-border'
      }`}
    >
      <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
        achievement.unlocked ? 'bg-cera-secondary/10' : 'bg-cera-elevated'
      }`}>
        {achievement.unlocked ? (
          <Icon size={24} className="text-cera-secondary" />
        ) : (
          <Lock size={20} className="text-cera-muted" />
        )}
      </div>
      <h4 className={`text-sm font-medium mb-1 ${achievement.unlocked ? 'text-cera-text' : 'text-cera-muted'}`}>
        {achievement.title}
      </h4>
      <p className="text-xs text-cera-muted">{achievement.description}</p>
      {!achievement.unlocked && achievement.progress !== undefined && (
        <div className="mt-3">
          <ProgressBar value={achievement.progress} max={achievement.target} color="primary" />
          <p className="text-xs text-cera-muted mt-1 font-mono">{achievement.progress}/{achievement.target}</p>
        </div>
      )}
      {achievement.unlocked && achievement.date && (
        <p className="text-xs text-cera-muted mt-2">Unlocked {new Date(achievement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      )}
    </motion.div>
  );
}
