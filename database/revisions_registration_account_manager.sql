-- ---------------------------------------------------------------------------
-- 2026-06-03: Verification poll — account manager preference (section 2)
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN registration_wants_account_manager ENUM('yes','no') NULL
  AFTER registration_primary_purpose;
