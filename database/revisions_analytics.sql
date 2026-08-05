-- ---------------------------------------------------------------------------
-- Analytics: unique views (1 per viewer per subject/module per calendar day)
-- Apply: mysql ... < database/revisions_analytics.sql
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject_type ENUM('listing','store','product','directory_entry','member') NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  owner_user_id INT UNSIGNED NULL,
  viewer_user_id INT UNSIGNED NULL,
  viewer_key VARCHAR(80) NOT NULL,
  view_date DATE NOT NULL,
  source VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cv_viewer_day (viewer_key, subject_type, subject_id, view_date),
  INDEX idx_cv_subject (subject_type, subject_id, view_date),
  INDEX idx_cv_owner (owner_user_id, view_date),
  INDEX idx_cv_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module_key VARCHAR(64) NOT NULL,
  viewer_user_id INT UNSIGNED NULL,
  viewer_key VARCHAR(80) NOT NULL,
  view_date DATE NOT NULL,
  source VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mv_viewer_day (viewer_key, module_key, view_date),
  INDEX idx_mv_module (module_key, view_date),
  INDEX idx_mv_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
