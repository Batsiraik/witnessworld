-- ---------------------------------------------------------------------------
-- 2026-06-03: Admin in-app notification inbox (header bell, support alerts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(64) NOT NULL DEFAULT 'general',
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  link_url VARCHAR(500) NULL,
  ref_id INT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_notif_unread (is_read, created_at DESC),
  INDEX idx_admin_notif_ref (type, ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
