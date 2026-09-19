import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, IdCard, Building2, GraduationCap, Trophy, Zap, Flame,
  Code, Award, Edit3, Save, X, Link as LinkIcon, ExternalLink,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import AchievementCard from '../../components/student/AchievementCard';
import Loading from '../../components/common/Loading';
import { studentService } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', skills: '' });

  useEffect(() => {
    const load = async () => {
      const [p, a] = await Promise.all([
        studentService.getProfile(),
        studentService.getAchievements(),
      ]);
      setProfile(p);
      setAchievements(a);
      setEditForm({ name: p.name, email: p.email, skills: p.skills.join(', ') });
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = () => {
    const updated = {
      ...editForm,
      skills: editForm.skills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    setProfile((prev) => ({ ...prev, ...updated }));
    updateUser(updated);
    setEditModal(false);
  };

  if (loading || !profile) return <Loading type="cards" count={3} />;

  const stats = profile.stats || {};
  const xpProgress = (profile.xp / profile.xpToNext) * 100;

  const infoItems = [
    { icon: IdCard, label: 'Student ID', value: profile.id },
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Building2, label: 'Department', value: profile.department },
    { icon: GraduationCap, label: 'Semester', value: `Semester ${profile.semester}` },
  ];

  const statCards = [
    { label: 'Problems Solved', value: profile.problemsSolved, icon: Code, color: 'text-cera-highlight bg-cera-highlight/10' },
    { label: 'Current Rank', value: `#${profile.rank}`, icon: Trophy, color: 'text-cera-secondary bg-cera-secondary/10' },
    { label: 'Total XP', value: profile.xp, icon: Zap, color: 'text-cera-primary bg-cera-primary/10' },
    { label: 'Coding Streak', value: `${profile.streak} days`, icon: Flame, color: 'text-cera-warning bg-cera-warning/10' },
    { label: 'Acceptance Rate', value: `${stats.acceptanceRate || 85.7}%`, icon: Award, color: 'text-cera-success bg-cera-success/10' },
    { label: 'Best Score', value: `${stats.bestScore || 100}%`, icon: Trophy, color: 'text-cera-success bg-cera-success/10' },
  ];

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cera-primary to-cera-secondary flex items-center justify-center text-3xl font-bold text-white shrink-0">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cera-text">{profile.name}</h1>
              <p className="text-sm text-cera-muted mt-1">{profile.department}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-cera-primary/10 text-cera-primary px-2.5 py-1 rounded-full font-medium">
                  Level {profile.level}
                </span>
                <span className="text-xs bg-cera-secondary/10 text-cera-secondary px-2.5 py-1 rounded-full font-medium">
                  {profile.xp} XP
                </span>
                <span className="text-xs bg-cera-highlight/10 text-cera-highlight px-2.5 py-1 rounded-full font-medium">
                  Rank #{profile.rank}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" icon={Edit3} onClick={() => setEditModal(true)}>
            Edit Profile
          </Button>
        </div>

        {/* XP Bar */}
        <div className="mt-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-cera-muted">Level {profile.level} → Level {profile.level + 1}</span>
            <span className="text-sm text-cera-text font-mono">{profile.xp} / {profile.xpToNext} XP</span>
          </div>
          <ProgressBar value={xpProgress} color="primary" height="h-3" />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-cera-muted mt-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Links */}
        <div className="flex items-center gap-4 mt-4">
          {profile.github && (
            <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors">
              <ExternalLink size={16} /> {profile.github}
            </a>
          )}
          {profile.linkedin && (
            <a href={`https://${profile.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-cera-muted hover:text-cera-text transition-colors">
              <LinkIcon size={16} /> {profile.linkedin}
            </a>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {infoItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-cera-card border border-cera-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cera-elevated flex items-center justify-center shrink-0">
                <Icon size={18} className="text-cera-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-cera-muted">{item.label}</p>
                <p className="text-sm font-medium text-cera-text truncate">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div>
        <h3 className="font-semibold text-cera-text mb-3">Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-cera-card border border-cera-border rounded-xl p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <Icon size={18} />
                </div>
                <p className="text-xl font-bold text-cera-text">{stat.value}</p>
                <p className="text-xs text-cera-muted mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="bg-cera-card border border-cera-border rounded-xl p-5">
        <h3 className="font-semibold text-cera-text mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill, i) => (
            <span key={i} className="text-sm bg-cera-elevated text-cera-text px-3 py-1.5 rounded-lg border border-cera-border">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-cera-text">Achievements</h3>
          <span className="text-sm text-cera-muted">{achievements.filter((a) => a.unlocked).length}/{achievements.length} unlocked</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {achievements.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Profile" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-cera-muted mb-1.5 block">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="text-sm text-cera-muted mb-1.5 block">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="text-sm text-cera-muted mb-1.5 block">Skills (comma-separated)</label>
            <input
              type="text"
              value={editForm.skills}
              onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
              className="input-base w-full"
              placeholder="JavaScript, Python, React..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" icon={X} onClick={() => setEditModal(false)}>Cancel</Button>
            <Button className="flex-1" icon={Save} onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
