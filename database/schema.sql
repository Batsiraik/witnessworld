-- Witness World Connect — run this on your MySQL database (Hostinger or local).
-- Charset
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS message_attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS content_reports;
DROP TABLE IF EXISTS listing_reports;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS advertisements;
DROP TABLE IF EXISTS questionnaire_answers;
DROP TABLE IF EXISTS admin_push_opens;
DROP TABLE IF EXISTS admin_push_tickets;
DROP TABLE IF EXISTS admin_push_logs;
DROP TABLE IF EXISTS user_push_tokens;
DROP TABLE IF EXISTS user_api_tokens;
DROP TABLE IF EXISTS questionnaire_questions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS settings;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE settings (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (`key`, `value`) VALUES
  ('support_email', 'info@witnessworldconnect.com'),
  ('support_user_id', '0'),
  ('smtp_host', ''),
  ('smtp_port', '465'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from_email', ''),
  ('smtp_encryption', 'ssl');

CREATE TABLE admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default super admin: username admin / password admin — change immediately after first login.
INSERT INTO admins (username, password_hash, name, email, is_super_admin) VALUES
  ('admin', '$2y$10$Ms2TQmjvIexw1nopgZcInewxUfPfDaFmvzJQ/5pj6xKWBpMMno7QK', 'Super Admin', 'admin@witnessworldconnect.com', 1);

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  username VARCHAR(64) NOT NULL UNIQUE,
  phone VARCHAR(40) NOT NULL,
  date_of_birth DATE NOT NULL,
  member_type VARCHAR(120) NOT NULL,
  baptism_date DATE NOT NULL,
  congregation VARCHAR(180) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  status ENUM(
    'pending_otp',
    'pending_verification',
    'verified',
    'declined'
  ) NOT NULL DEFAULT 'pending_otp',
  registration_otp VARCHAR(12) NULL,
  registration_otp_expires_at DATETIME NULL,
  password_reset_otp VARCHAR(12) NULL,
  password_reset_expires_at DATETIME NULL,
  password_reset_token VARCHAR(64) NULL,
  password_reset_token_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_status (status),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_api_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_push_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expo_push_token VARCHAR(512) NOT NULL,
  platform VARCHAR(24) NOT NULL DEFAULT 'unknown',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_upt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_expo_token (expo_push_token(255)),
  INDEX idx_upt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_push_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  audience ENUM('broadcast', 'user') NOT NULL,
  target_user_id INT UNSIGNED NULL,
  recipients_attempted INT UNSIGNED NOT NULL DEFAULT 0,
  expo_accepted INT UNSIGNED NOT NULL DEFAULT 0,
  expo_rejected INT UNSIGNED NOT NULL DEFAULT 0,
  delivery_ok INT UNSIGNED NOT NULL DEFAULT 0,
  delivery_failed INT UNSIGNED NOT NULL DEFAULT 0,
  receipt_checked_at DATETIME NULL,
  opens_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_sample VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apl_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT fk_apl_target_user FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_apl_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_push_tickets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  log_id INT UNSIGNED NOT NULL,
  expo_ticket_id VARCHAR(64) NOT NULL,
  CONSTRAINT fk_apt_log FOREIGN KEY (log_id) REFERENCES admin_push_logs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_apt_ticket (expo_ticket_id),
  INDEX idx_apt_log (log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_push_opens (
  log_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id, user_id),
  CONSTRAINT fk_apo_log FOREIGN KEY (log_id) REFERENCES admin_push_logs(id) ON DELETE CASCADE,
  CONSTRAINT fk_apo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marketplace categories (admin-managed, seeded with defaults)
CREATE TABLE marketplace_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO marketplace_categories (name, slug, sort_order, is_active) VALUES
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

-- Service categories (admin-managed, seeded with defaults)
CREATE TABLE service_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO service_categories (name, slug, sort_order, is_active) VALUES
  ('Graphic Design & Branding', 'graphic_design_branding', 1, 1),
  ('Web & Tech Development', 'web_tech_development', 2, 1),
  ('Digital Marketing', 'digital_marketing', 3, 1),
  ('Writing & Translation', 'writing_translation', 4, 1),
  ('Virtual Assistance', 'virtual_assistance', 5, 1),
  ('Business Consulting', 'business_consulting', 6, 1),
  ('Financial & Legal', 'financial_legal', 7, 1),
  ('Multimedia', 'multimedia', 8, 1),
  ('Other', 'other', 9, 1);

-- Community classifieds categories (admin-managed, seeded with defaults)
CREATE TABLE community_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO community_categories (name, slug, sort_order, is_active) VALUES
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

-- Gigs / listings (require admin approval before public visibility in the app)
CREATE TABLE listings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  listing_type VARCHAR(32) NOT NULL DEFAULT 'service',
  category_id INT UNSIGNED NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price_amount DECIMAL(12,2) NULL,
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  pricing_type ENUM('fixed','hourly','none') NOT NULL DEFAULT 'fixed',
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  media_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  portfolio_urls_json TEXT NULL,
  soft_skills_json TEXT NULL,
  location_country_code CHAR(2) NULL,
  location_country_name VARCHAR(120) NULL,
  location_us_state VARCHAR(64) NULL,
  moderation_status ENUM('pending_approval','approved','rejected','removed') NOT NULL DEFAULT 'pending_approval',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_urgent TINYINT(1) NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  admin_note TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_listings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_listings_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  -- category_id references marketplace_categories (classified), service_categories (service), or community_categories (community) based on listing_type; validated in PHP.
  INDEX idx_listings_moderation (moderation_status),
  INDEX idx_listings_user (user_id),
  INDEX idx_listings_type (listing_type),
  INDEX idx_listings_country (location_country_code),
  INDEX idx_listings_category (category_id),
  INDEX idx_listings_flags (is_featured, is_urgent, is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store categories (admin-managed, seeded with defaults)
CREATE TABLE store_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO store_categories (name, slug, sort_order, is_active) VALUES
  ('Beauty & Personal Care', 'beauty_personal_care', 1, 1),
  ('Health & Wellness', 'health_wellness', 2, 1),
  ('Fashion & Apparel', 'fashion_apparel', 3, 1),
  ('Artisan & Handmade', 'artisan_handmade', 4, 1),
  ('Specialty Foods', 'specialty_foods', 5, 1),
  ('Tech & Gadgets', 'tech_gadgets', 6, 1),
  ('JW Products', 'jw_products', 7, 1),
  ('Other', 'other', 8, 1);

-- Online stores (admin approves store before seller can publish products; products are moderated separately)
CREATE TABLE stores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  sells_summary VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500) NOT NULL,
  banner_url VARCHAR(500) NULL,
  location_country_code CHAR(2) NOT NULL,
  location_country_name VARCHAR(120) NOT NULL,
  location_us_state VARCHAR(64) NULL,
  delivery_type ENUM('digital_only','usa_only','worldwide','local_pickup','custom') NOT NULL DEFAULT 'worldwide',
  delivery_notes VARCHAR(500) NULL,
  moderation_status ENUM('pending_approval','approved','rejected','suspended') NOT NULL DEFAULT 'pending_approval',
  admin_note TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_stores_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT fk_stores_category FOREIGN KEY (category_id) REFERENCES store_categories(id) ON DELETE SET NULL,
  INDEX idx_stores_moderation (moderation_status),
  INDEX idx_stores_user (user_id),
  INDEX idx_stores_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE store_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  store_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  specifications TEXT NULL,
  price_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  image_url VARCHAR(500) NULL,
  moderation_status ENUM('pending_approval','approved','rejected','removed') NOT NULL DEFAULT 'pending_approval',
  admin_note TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sp_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_sp_store (store_id),
  INDEX idx_sp_moderation (moderation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business directory (multiple listings per user; public discovery by location/category; moderated)
-- Directory categories (admin-managed, seeded with defaults)
CREATE TABLE directory_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dc_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO directory_categories (name, slug, sort_order, is_active) VALUES
  ('Educational', 'educational', 1, 1),
  ('Legal', 'legal', 2, 1),
  ('Food & Dining', 'food_dining', 3, 1),
  ('Health & Medical', 'health_medical', 4, 1),
  ('Home Improvement & Repair', 'home_improvement_repair', 5, 1),
  ('Beauty & Spas', 'beauty_spas', 6, 1),
  ('Professional Offices', 'professional_offices', 7, 1),
  ('Retail Shops', 'retail_shops', 8, 1),
  ('Other', 'other', 9, 1);

CREATE TABLE directory_entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  business_name VARCHAR(200) NOT NULL,
  tagline VARCHAR(255) NULL,
  description TEXT NULL,
  category VARCHAR(64) NOT NULL,
  category_id INT UNSIGNED NULL,
  location_country_code CHAR(2) NOT NULL,
  location_country_name VARCHAR(120) NOT NULL,
  location_us_state VARCHAR(64) NULL,
  address_line VARCHAR(255) NULL,
  city VARCHAR(120) NOT NULL,
  postal_code VARCHAR(32) NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(255) NOT NULL,
  website VARCHAR(500) NULL,
  map_url VARCHAR(500) NULL,
  hours_text TEXT NULL,
  logo_url VARCHAR(500) NULL,
  moderation_status ENUM('pending_approval','approved','rejected','suspended') NOT NULL DEFAULT 'pending_approval',
  admin_note TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dir_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dir_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT fk_dir_category FOREIGN KEY (category_id) REFERENCES directory_categories(id) ON DELETE SET NULL,
  INDEX idx_dir_moderation (moderation_status),
  INDEX idx_dir_user (user_id),
  INDEX idx_dir_country (location_country_code),
  INDEX idx_dir_category (category),
  INDEX idx_dir_category_id (category_id),
  INDEX idx_dir_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In-app messaging
CREATE TABLE conversations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_low_id INT UNSIGNED NOT NULL,
  user_high_id INT UNSIGNED NOT NULL,
  context_key VARCHAR(96) NOT NULL DEFAULT 'general',
  last_message_at DATETIME NULL,
  member_last_read_at DATETIME NULL,
  support_last_read_at DATETIME NULL,
  user_low_last_read_at DATETIME NULL,
  user_high_last_read_at DATETIME NULL,
  user_low_archived_at DATETIME NULL,
  user_high_archived_at DATETIME NULL,
  user_low_deleted_at DATETIME NULL,
  user_high_deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conv_ul FOREIGN KEY (user_low_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_uh FOREIGN KEY (user_high_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_conv_context (user_low_id, user_high_id, context_key),
  INDEX idx_conv_last (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_msg_conv_id (conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  file_size INT UNSIGNED NOT NULL DEFAULT 0,
  storage_name VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ma_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ma_message (message_id),
  INDEX idx_ma_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User favorites / saved content
CREATE TABLE user_favorites (
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

-- User reports (listings, stores, products, directory)
CREATE TABLE content_reports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reporter_user_id INT UNSIGNED NULL,
  subject_type ENUM('listing','store','product','directory_entry') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
  admin_resolution_note TEXT NULL,
  resolved_at DATETIME NULL,
  resolved_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cr_rep FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_cr_adm FOREIGN KEY (resolved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_cr_status (status),
  INDEX idx_cr_subject (subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Promotional placements (future app surfaces)
CREATE TABLE advertisements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  target_url VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  slot VARCHAR(64) NOT NULL DEFAULT 'banner',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ads_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- INCREMENTAL UPDATES (production / existing databases)
-- Do not re-run this whole file on live data (drops at top wipe tables).
-- Append new ALTER TABLE / CREATE TABLE to database/revisions.sql instead.
-- See database/README.md.
-- =============================================================================
