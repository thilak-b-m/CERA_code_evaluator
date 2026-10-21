import { ObjectId } from 'mongodb';
import { parseNotificationId } from './notifications.schema.js';

const NOTIFICATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 100;

export class NotificationNotFoundError extends Error {
  constructor() {
    super('Notification not found.');
    this.name = 'NotificationNotFoundError';
    this.statusCode = 404;
  }
}

export async function initializeNotificationCollections(database) {
  await database.collection('notification_states').createIndex(
    { userId: 1, notificationId: 1 },
    { unique: true },
  );
}

function timeAgo(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function buildNotifications(database, user) {
  const userId = new ObjectId(user.id);
  const cutoff = new Date(Date.now() - NOTIFICATION_WINDOW_MS);
  let notifications = [];

  if (user.role === 'faculty') {
    const preferences = await database.collection('users').findOne(
      { _id: userId },
      { projection: { 'facultySettings.newSubmissions': 1 } },
    );
    if (preferences?.facultySettings?.newSubmissions === false) return [];
    const submissions = await database.collection('submissions')
      .find({ facultyId: userId, createdAt: { $gte: cutoff } })
      .sort({ createdAt: -1 })
      .limit(MAX_NOTIFICATIONS)
      .toArray();
    notifications = await Promise.all(submissions.map(async (submission) => {
      const [student, assignment] = await Promise.all([
        database.collection('users').findOne({ _id: submission.studentId }),
        database.collection('assignments').findOne({ _id: submission.assignmentId }),
      ]);
      const createdAt = submission.createdAt;
      const studentName = student?.name || 'A student';
      const assignmentTitle = assignment?.title || 'an assignment';
      return {
        id: `submission:${submission._id}`,
        type: 'Submission',
        title: 'New submission received',
        message: `${studentName} submitted ${assignmentTitle}.`,
        route: `/submissions/${submission._id}`,
        tone: 'live',
        createdAt,
      };
    }));
  } else if (user.role === 'student') {
    const student = await database.collection('students').findOne({ userId });
    if (!student) return [];

    const [assignments, submissions, evaluations] = await Promise.all([
      database.collection('assignments')
        .find({
          facultyId: student.facultyId,
          status: 'published',
          updatedAt: { $gte: cutoff },
        })
        .sort({ updatedAt: -1 })
        .limit(MAX_NOTIFICATIONS)
        .toArray(),
      database.collection('submissions')
        .find({ studentId: userId, createdAt: { $gte: cutoff } })
        .sort({ createdAt: -1 })
        .limit(MAX_NOTIFICATIONS)
        .toArray(),
      database.collection('evaluations')
        .find({
          studentId: userId,
          status: 'published',
          updatedAt: { $gte: cutoff },
        })
        .sort({ updatedAt: -1 })
        .limit(MAX_NOTIFICATIONS)
        .toArray(),
    ]);

    const assignmentNotifications = assignments.map((assignment) => ({
      id: `assignment:${assignment._id}`,
      type: 'Assignment',
      title: 'New assignment available',
      message: `${assignment.title} is now available.`,
      route: `/student/assignments/${assignment._id}`,
      tone: 'success',
      createdAt: assignment.updatedAt,
    }));
    const submissionNotifications = await Promise.all(submissions.map(async (submission) => {
      const assignment = await database.collection('assignments').findOne({
        _id: submission.assignmentId,
      });
      return {
        id: `submission:${submission._id}`,
        type: 'Submission',
        title: 'Submission received',
        message: `Your submission for ${assignment?.title || 'an assignment'} was saved.`,
        route: `/student/submissions/${submission._id}`,
        tone: 'live',
        createdAt: submission.createdAt,
      };
    }));
    const evaluationNotifications = await Promise.all(evaluations.map(async (evaluation) => {
      const assignment = await database.collection('assignments').findOne({
        _id: evaluation.assignmentId,
      });
      return {
        id: `evaluation:${evaluation.submissionId}`,
        type: 'Faculty Feedback',
        title: 'Faculty feedback published',
        message: `${assignment?.title || 'Your assignment'} was evaluated: ${evaluation.score} points.`,
        route: `/student/submissions/${evaluation.submissionId}`,
        tone: 'success',
        createdAt: evaluation.updatedAt,
      };
    }));
    notifications = [...assignmentNotifications, ...submissionNotifications, ...evaluationNotifications];
  }

  return notifications
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, MAX_NOTIFICATIONS);
}

export async function listNotifications(database, user) {
  const [notifications, states] = await Promise.all([
    buildNotifications(database, user),
    database.collection('notification_states')
      .find({ userId: new ObjectId(user.id) })
      .toArray(),
  ]);
  const statesById = new Map(states.map((state) => [state.notificationId, state]));
  return notifications.flatMap((notification) => {
    const state = statesById.get(notification.id);
    if (state?.dismissedAt) return [];
    return [{
      ...notification,
      timestamp: notification.createdAt.toISOString(),
      time: timeAgo(notification.createdAt),
      read: Boolean(state?.readAt),
    }];
  });
}

async function setNotificationState(database, user, notificationId, updates) {
  const validId = parseNotificationId(notificationId);
  const now = new Date();
  await database.collection('notification_states').updateOne(
    {
      userId: new ObjectId(user.id),
      notificationId: validId,
    },
    {
      $set: { ...updates, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function markNotificationRead(database, user, notificationId) {
  const validId = parseNotificationId(notificationId);
  if (!(await listNotifications(database, user)).some((notification) => notification.id === validId)) {
    throw new NotificationNotFoundError();
  }
  await setNotificationState(database, user, validId, { readAt: new Date() });
  return listNotifications(database, user);
}

export async function markAllNotificationsRead(database, user) {
  const notifications = await listNotifications(database, user);
  await Promise.all(notifications.map((notification) => (
    setNotificationState(database, user, notification.id, { readAt: new Date() })
  )));
  return listNotifications(database, user);
}

export async function dismissNotification(database, user, notificationId) {
  const validId = parseNotificationId(notificationId);
  if (!(await listNotifications(database, user)).some((notification) => notification.id === validId)) {
    throw new NotificationNotFoundError();
  }
  await setNotificationState(database, user, validId, { dismissedAt: new Date() });
  return listNotifications(database, user);
}
