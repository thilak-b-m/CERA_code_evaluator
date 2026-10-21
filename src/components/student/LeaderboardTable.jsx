import { motion } from 'framer-motion';

export default function LeaderboardTable({ entries }) {
  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-cera-warning text-cera-bg font-bold';
    if (rank === 2) return 'bg-slate-300 text-cera-bg font-bold';
    if (rank === 3) return 'bg-orange-700 text-white font-bold';
    return 'bg-cera-elevated text-cera-muted';
  };

  return (
    <div className="bg-cera-card border border-cera-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-cera-border">
              <th>Rank</th>
              <th>Student</th>
              <th style={{ textAlign: 'right' }}>Average</th>
              <th style={{ textAlign: 'right' }}>Marks earned</th>
              <th style={{ textAlign: 'right' }}>Evaluated</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <motion.tr
                key={`${entry.rank}-${entry.name}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`border-b border-cera-border last:border-0 transition-colors ${
                  entry.isCurrentUser ? 'bg-cera-highlight/5 border-l-2 border-l-cera-highlight' : 'hover:bg-cera-elevated/50'
                }`}
              >
                <td>
                  <div className={`w-8 h-8 rounded-lg ${getRankStyle(entry.rank)} flex items-center justify-center text-sm`}>
                    {entry.rank}
                  </div>
                </td>
                <td>
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
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="text-sm font-semibold text-cera-text font-mono">{entry.average.toFixed(1)}%</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="text-sm text-cera-muted font-mono">{entry.totalMarks.toLocaleString()}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="text-sm text-cera-muted font-mono">{entry.evaluatedAssignments}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
