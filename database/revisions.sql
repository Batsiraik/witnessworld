-- Witness World Connect — incremental DDL (safe to append; do not drop production data here).
-- Run new statements on your database after pulling changes. See database/README.md.
--
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Applied / baseline (2026-03-26): dumps that include admins, users, listings,
-- stores, store_products, directory_entries, advertisements, content_reports,
-- conversations, messages, questionnaire_*, settings, user_api_tokens need
-- nothing below this line.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2026-03-25: Customer Support chat (Fiverr-style FAB → admin inbox)
-- ---------------------------------------------------------------------------
ALTER TABLE conversations
  ADD COLUMN member_last_read_at DATETIME NULL DEFAULT NULL AFTER last_message_at,
  ADD COLUMN support_last_read_at DATETIME NULL DEFAULT NULL AFTER member_last_read_at;

INSERT IGNORE INTO settings (`key`, `value`) VALUES ('support_user_id', '0');

-- ---------------------------------------------------------------------------
-- 2026-05-11: Move verification profile fields onto signup, remove questionnaire step
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN date_of_birth DATE NULL AFTER phone,
  ADD COLUMN member_type VARCHAR(120) NULL AFTER date_of_birth,
  ADD COLUMN baptism_date DATE NULL AFTER member_type,
  ADD COLUMN congregation VARCHAR(180) NULL AFTER baptism_date;

UPDATE users SET status = 'pending_verification' WHERE status = 'pending_questions';

ALTER TABLE users
  MODIFY status ENUM('pending_otp','pending_verification','verified','declined') NOT NULL DEFAULT 'pending_otp';

DROP TABLE IF EXISTS questionnaire_answers;
DROP TABLE IF EXISTS questionnaire_questions;

-- ---------------------------------------------------------------------------
-- 2026-05-11: Inbox read receipts, delivery, archive/delete-for-me
-- ---------------------------------------------------------------------------
ALTER TABLE conversations
  ADD COLUMN user_low_last_read_at DATETIME NULL AFTER support_last_read_at,
  ADD COLUMN user_high_last_read_at DATETIME NULL AFTER user_low_last_read_at,
  ADD COLUMN user_low_archived_at DATETIME NULL AFTER user_high_last_read_at,
  ADD COLUMN user_high_archived_at DATETIME NULL AFTER user_low_archived_at,
  ADD COLUMN user_low_deleted_at DATETIME NULL AFTER user_high_archived_at,
  ADD COLUMN user_high_deleted_at DATETIME NULL AFTER user_low_deleted_at;

ALTER TABLE messages
  ADD COLUMN delivered_at DATETIME NULL AFTER body;
