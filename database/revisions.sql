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

-- ---------------------------------------------------------------------------
-- 2026-05-12: Service categories for Professional Services module
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO service_categories (name, slug, sort_order, is_active) VALUES
  ('Graphic Design & Branding', 'graphic_design_branding', 1, 1),
  ('Web & Tech Development', 'web_tech_development', 2, 1),
  ('Digital Marketing', 'digital_marketing', 3, 1),
  ('Writing & Translation', 'writing_translation', 4, 1),
  ('Virtual Assistance', 'virtual_assistance', 5, 1),
  ('Business Consulting', 'business_consulting', 6, 1),
  ('Financial & Legal', 'financial_legal', 7, 1),
  ('Multimedia', 'multimedia', 8, 1),
  ('Other', 'other', 9, 1);

-- Drop the marketplace-only FK so category_id can reference either table; validation is in PHP.
ALTER TABLE listings DROP FOREIGN KEY fk_listings_category;

-- ---------------------------------------------------------------------------
-- 2026-05-12: Store categories for Online Store module
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO store_categories (name, slug, sort_order, is_active) VALUES
  ('Beauty & Personal Care', 'beauty_personal_care', 1, 1),
  ('Health & Wellness', 'health_wellness', 2, 1),
  ('Fashion & Apparel', 'fashion_apparel', 3, 1),
  ('Artisan & Handmade', 'artisan_handmade', 4, 1),
  ('Specialty Foods', 'specialty_foods', 5, 1),
  ('Tech & Gadgets', 'tech_gadgets', 6, 1),
  ('JW Products', 'jw_products', 7, 1);

ALTER TABLE stores
  ADD COLUMN category_id INT UNSIGNED NULL AFTER user_id,
  ADD INDEX idx_stores_category (category_id),
  ADD CONSTRAINT fk_stores_category FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL;

-- Add "Other" to store_categories if not already present
INSERT IGNORE INTO store_categories (name, slug, sort_order, is_active) VALUES ('Other', 'other', 99, 1);

-- ---------------------------------------------------------------------------
-- 2026-05-12: Directory categories for Business Directory module
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS directory_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO directory_categories (name, slug, sort_order, is_active) VALUES
  ('Educational', 'educational', 1, 1),
  ('Legal', 'legal', 2, 1),
  ('Food & Dining', 'food_dining', 3, 1),
  ('Health & Medical', 'health_medical', 4, 1),
  ('Home Improvement & Repair', 'home_improvement_repair', 5, 1),
  ('Beauty & Spas', 'beauty_spas', 6, 1),
  ('Professional Offices', 'professional_offices', 7, 1),
  ('Retail Shops', 'retail_shops', 8, 1),
  ('Other', 'other', 9, 1);

ALTER TABLE directory_entries
  ADD COLUMN category_id INT UNSIGNED NULL AFTER category,
  ADD INDEX idx_dir_category_id (category_id),
  ADD CONSTRAINT fk_dir_category FOREIGN KEY (category_id) REFERENCES directory_categories(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2026-05-12: Community classifieds categories (5th module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO community_categories (name, slug, sort_order, is_active) VALUES
  ('Careers / Jobs', 'careers_jobs', 1, 1),
  ('Roommates & Housing', 'roommates_housing', 2, 1),
  ('Childcare & Babysitting', 'childcare_babysitting', 3, 1),
  ('Pet Sitting & Dog Walking', 'pet_sitting_dog_walking', 4, 1),
  ('Tutoring & Lessons', 'tutoring_lessons', 5, 1),
  ('Travels / Events', 'travels_events', 6, 1),
  ('Healthcare', 'healthcare', 7, 1),
  ('Real Estate', 'real_estate', 8, 1),
  ('Vacation Homes', 'vacation_homes', 9, 1),
  ('Transportation', 'transportation', 10, 1),
  ('Classes', 'classes', 11, 1),
  ('Other', 'other', 12, 1);

-- ---------------------------------------------------------------------------
-- 2026-05-13: User favorites / saved content
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  subject_type ENUM('listing','store','product','directory_entry') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_uf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_uf_subject (user_id, subject_type, subject_id),
  INDEX idx_uf_user_created (user_id, created_at),
  INDEX idx_uf_subject (subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2026-05-13: Listing display flags for admin merchandising
-- ---------------------------------------------------------------------------
ALTER TABLE listings
  ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER moderation_status,
  ADD COLUMN is_urgent TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_urgent,
  ADD INDEX idx_listings_flags (is_featured, is_urgent, is_verified);

-- ---------------------------------------------------------------------------
-- 2026-05-13: Commerce request / seller sales workflow (V1 request-first)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  buyer_user_id INT UNSIGNED NOT NULL,
  seller_user_id INT UNSIGNED NOT NULL,
  subject_type ENUM('product','listing','directory_entry','member') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  subject_title VARCHAR(255) NOT NULL,
  subject_image_url VARCHAR(500) NULL,
  request_type ENUM('product_order','service_hire','local_meetup','directory_hire','member_hire') NOT NULL,
  status ENUM('new','accepted','declined','cancelled','in_progress','ready','shipped','delivered','completed','disputed') NOT NULL DEFAULT 'new',
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  buyer_name VARCHAR(160) NOT NULL,
  buyer_email VARCHAR(190) NULL,
  buyer_phone VARCHAR(64) NULL,
  shipping_name VARCHAR(160) NULL,
  shipping_address1 VARCHAR(190) NULL,
  shipping_address2 VARCHAR(190) NULL,
  shipping_city VARCHAR(120) NULL,
  shipping_state VARCHAR(120) NULL,
  shipping_postal_code VARCHAR(40) NULL,
  shipping_country VARCHAR(120) NULL,
  project_brief TEXT NULL,
  preferred_contact VARCHAR(32) NULL,
  anti_scam_ack TINYINT(1) NOT NULL DEFAULT 0,
  seller_note TEXT NULL,
  tracking_number VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  completed_at DATETIME NULL,
  CONSTRAINT fk_commerce_buyer FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_commerce_seller FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_commerce_buyer (buyer_user_id, created_at),
  INDEX idx_commerce_seller (seller_user_id, status, created_at),
  INDEX idx_commerce_subject (subject_type, subject_id),
  INDEX idx_commerce_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_request_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL,
  actor_user_id INT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_creq_event_request FOREIGN KEY (request_id) REFERENCES commerce_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_creq_event_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_creq_event_request (request_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2026-05-13: Reviews/ratings and member reports
-- ---------------------------------------------------------------------------
ALTER TABLE content_reports
  MODIFY subject_type ENUM('listing','store','product','directory_entry','member') NOT NULL;

CREATE TABLE IF NOT EXISTS content_reviews (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NULL,
  reviewer_user_id INT UNSIGNED NOT NULL,
  subject_type ENUM('listing','store','product','directory_entry','member') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  seller_user_id INT UNSIGNED NULL,
  rating TINYINT UNSIGNED NOT NULL,
  title VARCHAR(140) NULL,
  body TEXT NULL,
  status ENUM('published','hidden') NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_crev_request FOREIGN KEY (request_id) REFERENCES commerce_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_crev_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_crev_seller FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_crev_request (request_id),
  INDEX idx_crev_subject (subject_type, subject_id, status, created_at),
  INDEX idx_crev_seller (seller_user_id, status),
  INDEX idx_crev_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2026-05-13: Membership plans, trials, and Stripe-ready subscription fields
-- ---------------------------------------------------------------------------
INSERT INTO settings (`key`, `value`) VALUES ('membership_trial_days', '90')
ON DUPLICATE KEY UPDATE `value` = `value`;

INSERT INTO settings (`key`, `value`) VALUES
  ('stripe_publishable_key', ''),
  ('stripe_price_plus', ''),
  ('stripe_price_starter', ''),
  ('stripe_price_growth', ''),
  ('stripe_price_elite', '')
ON DUPLICATE KEY UPDATE `value` = `value`;

ALTER TABLE users
  ADD COLUMN membership_plan ENUM('free','plus','starter','growth','elite') NOT NULL DEFAULT 'free' AFTER avatar_url,
  ADD COLUMN subscription_status ENUM('free','trialing','active','grace','past_due','canceled') NOT NULL DEFAULT 'free' AFTER membership_plan,
  ADD COLUMN trial_started_at DATETIME NULL AFTER subscription_status,
  ADD COLUMN trial_ends_at DATETIME NULL AFTER trial_started_at,
  ADD COLUMN grace_ends_at DATETIME NULL AFTER trial_ends_at,
  ADD COLUMN stripe_customer_id VARCHAR(191) NULL AFTER grace_ends_at,
  ADD COLUMN stripe_subscription_id VARCHAR(191) NULL AFTER stripe_customer_id,
  ADD COLUMN stripe_payment_method_status ENUM('none','missing','attached') NOT NULL DEFAULT 'none' AFTER stripe_subscription_id,
  ADD INDEX idx_users_membership (membership_plan, subscription_status);

-- ---------------------------------------------------------------------------
-- 2026-05-14: Storefront add-on (Small / Large), separate from membership tier
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN storefront_addon ENUM('none','small','large') NOT NULL DEFAULT 'none' AFTER stripe_payment_method_status;

-- ---------------------------------------------------------------------------
-- 2026-05-14: One published-style review row per reviewer per subject (direct + post-order)
-- Fails if duplicate (reviewer, subject_type, subject_id) already exists; clean duplicates first if needed.
-- ---------------------------------------------------------------------------
ALTER TABLE content_reviews
  ADD UNIQUE KEY uq_crev_reviewer_subject (reviewer_user_id, subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- 2026-05-14: Card display (last4 / brand) for profile; updated when Checkout setup completes
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN stripe_pm_last4 VARCHAR(4) NULL DEFAULT NULL AFTER stripe_payment_method_status,
  ADD COLUMN stripe_pm_brand VARCHAR(32) NULL DEFAULT NULL AFTER stripe_pm_last4;

-- ---------------------------------------------------------------------------
-- 2026-05-22: Signup country + optional baptism for unbaptized publishers
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN registration_country_code CHAR(2) NULL AFTER congregation,
  ADD COLUMN registration_country_name VARCHAR(120) NULL AFTER registration_country_code;

ALTER TABLE users
  MODIFY baptism_date DATE NULL;

-- ---------------------------------------------------------------------------
-- 2026-05-22: Signup intent poll (individual vs business) for marketing segment
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN registration_account_type ENUM('individual','business') NULL AFTER registration_country_name;

-- ---------------------------------------------------------------------------
-- 2026-05-22: Verification poll — primary purpose & referral source
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN registration_primary_purpose ENUM('browsing_connecting','promoting_business','both') NULL AFTER registration_account_type,
  ADD COLUMN registration_referral_source ENUM('friend_family','social_media','whatsapp_group','wwc_team_member','other') NULL AFTER registration_primary_purpose,
  ADD COLUMN registration_referral_other VARCHAR(200) NULL AFTER registration_referral_source;

-- ---------------------------------------------------------------------------
-- 2026-05-22: Admin panel OTP login + trusted devices (7-day rolling)
-- ---------------------------------------------------------------------------
ALTER TABLE admins
  ADD COLUMN login_otp VARCHAR(6) NULL AFTER email,
  ADD COLUMN login_otp_expires_at DATETIME NULL AFTER login_otp;

CREATE TABLE IF NOT EXISTS admin_trusted_devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent_hash CHAR(64) NOT NULL DEFAULT '',
  last_seen_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_atd_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  UNIQUE KEY uq_atd_token (token_hash),
  INDEX idx_atd_admin_seen (admin_id, last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2026-06-03: In-app notification inbox (home bell) — see revisions_user_notifications.sql
-- 2026-06-03: Admin in-app notification inbox — see revisions_admin_notifications.sql
-- 2026-06-03: Monetization toggle — see revisions_monetization_toggle.sql
-- 2026-06-03: Verification poll account manager — see revisions_registration_account_manager.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2026-07-12: Product gallery (multiple images; image_url stays primary/hero)
-- ---------------------------------------------------------------------------
ALTER TABLE store_products
  ADD COLUMN gallery_urls_json TEXT NULL AFTER image_url;

-- ---------------------------------------------------------------------------
-- 2026-07-12: Admin forgot-password OTP
-- ---------------------------------------------------------------------------
ALTER TABLE admins
  ADD COLUMN password_reset_otp VARCHAR(6) NULL AFTER login_otp_expires_at,
  ADD COLUMN password_reset_expires_at DATETIME NULL AFTER password_reset_otp;
