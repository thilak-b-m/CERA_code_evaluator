import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationValidationError, parseNotificationId } from './notifications.schema.js';

test('notification IDs are restricted to supported record kinds and Mongo ObjectIds', () => {
  assert.equal(parseNotificationId(`submission:${'a'.repeat(24)}`), `submission:${'a'.repeat(24)}`);
  assert.throws(() => parseNotificationId('submission:not-an-object-id'), NotificationValidationError);
});
