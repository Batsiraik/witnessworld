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

-- ---------------------------------------------------------------------------
-- 2026-05-12: Marketplace categories + listing price/category/free fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO marketplace_categories (name, slug, sort_order, is_active) VALUES
  ('Furniture', 'furniture', 1, 1),
  ('Appliances', 'appliances', 2, 1),
  ('Home Decor', 'home_decor', 3, 1),
  ('Electronics', 'electronics', 4, 1),
  ('Clothing & Accessories', 'clothing_accessories', 5, 1),
  ('Baby & Kids', 'baby_kids', 6, 1),
  ('Garden & Outdoor', 'garden_outdoor', 7, 1),
  ('Home Improvement', 'home_improvement', 8, 1),
  ('Sports & Fitness', 'sports_fitness', 9, 1),
  ('Books, Media & Hobbies', 'books_media_hobbies', 10, 1),
  ('Toys & Games', 'toys_games', 11, 1),
  ('Pet Supplies', 'pet_supplies', 12, 1),
  ('Office Supplies', 'office_supplies', 13, 1),
  ('Health & Beauty', 'health_beauty', 14, 1),
  ('Other', 'other', 15, 1);

ALTER TABLE listings
  ADD COLUMN category_id INT UNSIGNED NULL AFTER listing_type,
  ADD COLUMN is_free TINYINT(1) NOT NULL DEFAULT 0 AFTER price_amount,
  ADD INDEX idx_listings_category (category_id),
  ADD CONSTRAINT fk_listings_category FOREIGN KEY (category_id) REFERENCES marketplace_categories(id) ON DELETE SET NULL;
