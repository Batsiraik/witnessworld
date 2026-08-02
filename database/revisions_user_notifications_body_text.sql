-- Expand notification body so longer messages can be stored and shown in full.
ALTER TABLE user_notifications
  MODIFY COLUMN body TEXT NOT NULL;
