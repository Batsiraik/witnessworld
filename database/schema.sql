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
  avatar_url VARCHAR(512) NULL,
  status ENUM(
    'pending_otp',
    'pending_questions',
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

CREATE TABLE questionnaire_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_qq_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questionnaire_answers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  answer_text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_question (user_id, question_id),
  CONSTRAINT fk_qa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_question FOREIGN KEY (question_id) REFERENCES questionnaire_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Starter questions (admin can edit in panel)
INSERT INTO questionnaire_questions (question_text, sort_order, is_active) VALUES
  ('What brings you to Witness World Connect?', 1, 1),
  ('How do you plan to use the platform with friends or your community?', 2, 1),
  ('Is there anything else you would like us to know about you?', 3, 1);

-- Gigs / listings (require admin approval before public visibility in the app)
CREATE TABLE listings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  listing_type VARCHAR(32) NOT NULL DEFAULT 'service',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price_amount DECIMAL(12,2) NULL,
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
  admin_note TEXT NULL,
  reviewed_at DATETIME NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_listings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_listings_admin FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_listings_moderation (moderation_status),
  INDEX idx_listings_user (user_id),
  INDEX idx_listings_type (listing_type),
  INDEX idx_listings_country (location_country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Online stores (admin approves store before seller can publish products; products are moderated separately)
CREATE TABLE stores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
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
  INDEX idx_stores_moderation (moderation_status),
  INDEX idx_stores_user (user_id)
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
CREATE TABLE directory_entries (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  business_name VARCHAR(200) NOT NULL,
  tagline VARCHAR(255) NULL,
  description TEXT NULL,
  category VARCHAR(64) NOT NULL,
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
  INDEX idx_dir_moderation (moderation_status),
  INDEX idx_dir_user (user_id),
  INDEX idx_dir_country (location_country_code),
  INDEX idx_dir_category (category),
  INDEX idx_dir_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In-app messaging
CREATE TABLE conversations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_low_id INT UNSIGNED NOT NULL,
  user_high_id INT UNSIGNED NOT NULL,
  context_key VARCHAR(96) NOT NULL DEFAULT 'general',
  last_message_at DATETIME NULL,
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
