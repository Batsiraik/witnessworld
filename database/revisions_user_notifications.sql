-- ---------------------------------------------------------------------------
-- 2026-06-03: In-app notification inbox (home bell)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'general',
  data_json TEXT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_un_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_un_user_created (user_id, created_at DESC),
  INDEX idx_un_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_notifications (user_id, title, body, type, is_read, created_at)
SELECT l.target_user_id, l.title, l.body, 'admin', 0, l.created_at
FROM admin_push_logs l
WHERE l.audience = 'user'
  AND l.target_user_id IS NOT NULL
  AND l.target_user_id > 0;

INSERT INTO user_notifications (user_id, title, body, type, is_read, created_at)
SELECT u.id, l.title, l.body, 'admin_broadcast', 0, l.created_at
FROM admin_push_logs l
CROSS JOIN users u
WHERE l.audience = 'broadcast'
  AND u.status = 'verified';
