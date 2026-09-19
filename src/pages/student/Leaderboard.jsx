import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp } from 'lucide-react';
import LeaderboardTable from '../../components/student/LeaderboardTable';
import Loading from '../../components/common/Loading';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

const periods = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'overall', label: 'Overall' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('weekly');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await studentService.getLeaderboard(period);
      setEntries(data);
      setLoading(false);
    };
    load();
  }, [period]);

  const topThree = entries.slice(0, 3);
  const myEntry = entries.find((e) => e.isCurrentUser);

  return (
    <div className="space-y-5">
      {/* Period Tabs */}
      <div className="flex items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-cera-primary text-white'
                : 'bg-cera-elevated text-cera-muted hover:text-cera-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* My Rank Card */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-cera-card to-cera-elevated border border-cera-highlight/30 rounded-xl p-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cera-highlight/10 flex items-center justify-center">
                <Trophy size={24} className="text-cera-highlight" />
              </div>
              <div>
                <p className="text-sm text-cera-muted">Your Position</p>
                <p className="text-2xl font-bold text-cera-text">Rank #{myEntry.rank}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-cera-muted">Score</p>
                <p className="text-lg font-bold text-cera-text font-mono">{myEntry.score}</p>
              </div>
              <div>
                <p className="text-xs text-cera-muted">XP</p>
                <p className="text-lg font-bold text-cera-text font-mono">{myEntry.xp.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-cera-muted">Solved</p>
                <p className="text-lg font-bold text-cera-text font-mono">{myEntry.problemsSolved}</p>
              </div>
              {myEntry.change !== 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} className={myEntry.change > 0 ? 'text-cera-success' : 'text-cera-error'} />
                  <span className={`text-sm font-medium ${myEntry.change > 0 ? 'text-cera-success' : 'text-cera-error'}`}>
                    {myEntry.change > 0 ? `+${myEntry.change}` : myEntry.change}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Top 3 Podium */}
      {!loading && topThree.length === 3 && (
        <div className="grid grid-cols-3 gap-3">
          {topThree.map((entry, i) => {
            const isFirst = entry.rank === 1;
            const isSecond = entry.rank === 2;
            const isThird = entry.rank === 3;
            const height = isFirst ? 'h-40' : isSecond ? 'h-32' : 'h-28';
            const medalColor = isFirst ? 'text-cera-warning' : isSecond ? 'text-slate-300' : 'text-orange-700';
            const bgColor = isFirst ? 'bg-cera-warning/5 border-cera-warning/30' : isSecond ? 'bg-slate-500/5 border-slate-400/20' : 'bg-orange-700/5 border-orange-700/20';

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex flex-col items-center justify-end ${height} ${bgColor} border rounded-xl p-4 ${isFirst ? 'order-2' : isSecond ? 'order-1' : 'order-3'}`}
              >
                <Medal size={isFirst ? 32 : 24} className={medalColor} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mt-2 ${entry.isCurrentUser ? 'bg-cera-secondary text-white' : 'bg-cera-elevated text-cera-text'}`}>
                  {entry.name.charAt(0)}
                </div>
                <p className={`text-sm font-medium mt-2 text-center truncate w-full ${entry.isCurrentUser ? 'text-cera-highlight' : 'text-cera-text'}`}>
                  {entry.name.split(' ')[0]}
                </p>
                <p className="text-xs text-cera-muted font-mono">{entry.score} pts</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      {loading ? (
        <Loading type="rows" count={8} />
      ) : (
        <LeaderboardTable entries={entries} />
      )}
    </div>
  );
}
