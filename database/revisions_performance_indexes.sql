-- 2026-08-06: Hot-path indexes for discover / marketplace / inbox / reviews
-- Safe to re-run: each statement ignores "Duplicate key name".

-- Listings: feed filters + sort
ALTER TABLE listings
  ADD INDEX idx_listings_mod_type_created (moderation_status, listing_type, created_at, id);

ALTER TABLE listings
  ADD INDEX idx_listings_mod_type_country_created (moderation_status, listing_type, location_country_code, created_at);

ALTER TABLE listings
  ADD INDEX idx_listings_mod_flags_id (moderation_status, listing_type, is_featured, is_urgent, id);

-- Stores / products / directory feeds
ALTER TABLE stores
  ADD INDEX idx_stores_mod_created (moderation_status, created_at, id);

ALTER TABLE stores
  ADD INDEX idx_stores_mod_country (moderation_status, location_country_code, id);

ALTER TABLE store_products
  ADD INDEX idx_sp_mod_created (moderation_status, created_at, id);

ALTER TABLE directory_entries
  ADD INDEX idx_dir_mod_created (moderation_status, created_at, id);

-- Inbox: conversations by either participant + last activity
ALTER TABLE conversations
  ADD INDEX idx_conv_user_low_last (user_low_id, last_message_at);

ALTER TABLE conversations
  ADD INDEX idx_conv_user_high_last (user_high_id, last_message_at);

-- Messages: unread / delivered updates
ALTER TABLE messages
  ADD INDEX idx_msg_conv_sender_created (conversation_id, sender_user_id, created_at);

ALTER TABLE messages
  ADD INDEX idx_msg_conv_delivered (conversation_id, delivered_at);

-- Reviews: subject lookups used by feeds/detail
ALTER TABLE content_reviews
  ADD INDEX idx_reviews_subject_status (subject_type, subject_id, status);
