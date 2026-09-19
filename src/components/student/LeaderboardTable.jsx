import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function LeaderboardTable({ entries }) {
  const navigate = useNavigate();

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-cera-warning text-cera-bg font-bold';
    if (rank === 2) return 'bg-slate-300 text-cera-bg font-bold';
    if (rank === 3) return 'bg-orange-700 text-white font-bold';
    return 'bg-cera-elevated text-cera-muted';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp size={14} className="text-cera-success" />;
    if (change < 0) return <TrendingDown size={14} className="text-cera-error" />;
    return <Minus size={14} className="text-cera-muted" />;
  };

  return (
    <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-cera-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider">Rank</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider">Student</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider">Score</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider">XP</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider hidden md:table-cell">Solved</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-cera-muted uppercase tracking-wider">Change</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`border-b border-cera-border last:border-0 transition-colors ${
                  entry.isCurrentUser ? 'bg-cera-highlight/5 border-l-2 border-l-cera-highlight' : 'hover:bg-cera-elevated/50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg ${getRankStyle(entry.rank)} flex items-center justify-center text-sm`}>
                    {entry.rank}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      entry.isCurrentUser ? 'bg-cera-secondary text-white' : 'bg-cera-elevated text-cera-text'
                    }`}>
                      {entry.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${entry.isCurrentUser ? 'text-cera-highlight' : 'text-cera-text'}`}>
                        {entry.name}
                        {entry.isCurrentUser && <span className="text-xs text-cera-muted ml-2">(You)</span>}
                      </p>
                      <p className="text-xs text-cera-muted">{entry.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-cera-text font-mono">{entry.score}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-cera-muted font-mono">{entry.xp.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-sm text-cera-muted font-mono">{entry.problemsSolved}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {getChangeIcon(entry.change)}
                    {entry.change !== 0 && (
                      <span className={`text-xs ${entry.change > 0 ? 'text-cera-success' : 'text-cera-error'}`}>
                        {Math.abs(entry.change)}
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
