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

-- (no pending revisions)
