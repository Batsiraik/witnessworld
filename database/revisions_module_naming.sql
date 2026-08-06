-- ---------------------------------------------------------------------------
-- Module naming (no data migration): listing_type values stay stable.
--   classified  → user-facing "Marketplace" (buy/sell items)
--   community   → user-facing "Classifieds" (housing, jobs, sitters, announcements)
--   service     → user-facing "Professional services"
-- ---------------------------------------------------------------------------

-- Document intent on listings.listing_type (MySQL 8+ COMMENT; harmless if re-run fails on older DBs)
ALTER TABLE listings
  MODIFY COLUMN listing_type VARCHAR(32) NOT NULL DEFAULT 'service'
  COMMENT 'classified=Marketplace, community=Classifieds, service=Professional services';
