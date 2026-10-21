export class NotificationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotificationValidationError';
    this.statusCode = 400;
  }
}

export function parseNotificationId(value) {
  if (typeof value !== 'string' || !/^(submission|evaluation|assignment):[a-f\d]{24}$/i.test(value)) {
    throw new NotificationValidationError('Invalid notification id.');
  }
  return value;
}
