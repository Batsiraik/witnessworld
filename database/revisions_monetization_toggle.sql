-- ---------------------------------------------------------------------------
-- 2026-06-03: Admin toggle — monetization on/off (launch default: off)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('monetization_enabled', '0');
