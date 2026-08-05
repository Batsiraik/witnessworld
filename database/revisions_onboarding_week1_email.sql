-- ---------------------------------------------------------------------------
-- Onboarding week-1 email (7 days after account approval)
-- ---------------------------------------------------------------------------

ALTER TABLE users
  ADD COLUMN account_approved_at DATETIME NULL DEFAULT NULL AFTER status,
  ADD COLUMN onboarding_week1_email_sent_at DATETIME NULL DEFAULT NULL AFTER account_approved_at;

CREATE INDEX idx_users_onboarding_week1
  ON users (status, account_approved_at, onboarding_week1_email_sent_at);
