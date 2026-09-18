import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ListChecks, Code2, BarChart3, Trophy, ArrowRight, Zap, Flame,
} from 'lucide-react';
import DashboardStats from '../../components/student/DashboardStats';
import AssignmentCard from '../../components/student/AssignmentCard';
import ActivityFeed from '../../components/student/ActivityFeed';
import AchievementCard from '../../components/student/AchievementCard';
import { ProgressChart, ActivityBarChart, CompletionPieChart } from '../../components/student/ProgressChart';
import Loading, { SkeletonCard } from '../../components/common/Loading';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [scoreData, setScoreData] = useState([]);
  const [completionData, setCompletionData] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [recentSubs, setRecentSubs] = useState([]);
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const [s, wa, sp, ac, ua, rs, ach] = await Promise.all([
        studentService.getDashboardStats(),
        studentService.getWeeklyActivity(),
        studentService.getScoreProgression(),
        studentService.getAssignmentCompletion(),
        studentService.getUpcomingAssignments(),
        studentService.getRecentSubmissions(),
        studentService.getAchievements(),
      ]);
      setStats(s);
      setWeeklyData(wa);
      setScoreData(sp);
      setCompletionData(ac);
      setUpcoming(ua);
      setRecentSubs(rs);
      setAchievements(ach);
      setLoading(false);
    };
    loadData();
  }, []);

  const quickActions = [
    { label: 'View Assignments', icon: ListChecks, path: '/student/assignments', color: 'text-cera-primary bg-cera-primary/10' },
    { label: 'Continue Coding', icon: Code2, path: '/student/assignments/asg-005', color: 'text-cera-highlight bg-cera-highlight/10' },
    { label: 'View Results', icon: BarChart3, path: '/student/results', color: 'text-cera-success bg-cera-success/10' },
    { label: 'Leaderboard', icon: Trophy, path: '/student/leaderboard', color: 'text-cera-secondary bg-cera-secondary/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonCard className="lg:col-span-2 h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <DashboardStats stats={stats} />

      {/* XP & Level Bar */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cera-primary/10 flex items-center justify-center">
              <Zap size={20} className="text-cera-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-cera-text">Level {user?.level || 8}</h3>
              <p className="text-xs text-cera-muted">{user?.xp || 1240} / {user?.xpToNext || 1500} XP to Level {(user?.level || 8) + 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-cera-warning" />
            <span className="text-sm text-cera-text font-medium">{user?.streak || 12}-day streak</span>
          </div>
        </div>
        <ProgressBar value={user?.xp || 1240} max={user?.xpToNext || 1500} color="primary" height="h-3" />
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-cera-text mb-4">Weekly Coding Activity</h3>
          <ActivityBarChart data={weeklyData} />
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-cera-text mb-4">Assignment Completion</h3>
          <CompletionPieChart data={completionData} />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-cera-text mb-4">Score Progression</h3>
        <ProgressChart data={scoreData} />
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-cera-text mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                whileHover={{ y: -2 }}
                onClick={() => navigate(action.path)}
                className="bg-cera-card border border-cera-border rounded-xl p-4 text-left hover:border-cera-muted/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                  <Icon size={20} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cera-text">{action.label}</span>
                  <ArrowRight size={14} className="text-cera-muted" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Assignments + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-cera-text">Upcoming Assignments</h3>
            <button
              onClick={() => navigate('/student/assignments')}
              className="text-sm text-cera-highlight hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        </div>
        <div>
          <ActivityFeed submissions={recentSubs} />
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-cera-text">Achievements</h3>
          <span className="text-sm text-cera-muted">{achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>
    </div>
  );
}
