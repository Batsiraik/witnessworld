#!/usr/bin/env bash
set +e

run() {
  echo "==> $1"
  sudo mysql witnessworld -e "$1"
  echo "RC:$?"
}

# Avoid DESC in index defs for broader MySQL compatibility
run "ALTER TABLE listings ADD INDEX idx_listings_mod_type_created (moderation_status, listing_type, created_at, id)"
run "ALTER TABLE listings ADD INDEX idx_listings_mod_type_country_created (moderation_status, listing_type, location_country_code, created_at)"
run "ALTER TABLE listings ADD INDEX idx_listings_mod_flags_id (moderation_status, listing_type, is_featured, is_urgent, id)"
run "ALTER TABLE stores ADD INDEX idx_stores_mod_created (moderation_status, created_at, id)"
run "ALTER TABLE stores ADD INDEX idx_stores_mod_country (moderation_status, location_country_code, id)"
run "ALTER TABLE store_products ADD INDEX idx_sp_mod_created (moderation_status, created_at, id)"
run "ALTER TABLE directory_entries ADD INDEX idx_dir_mod_created (moderation_status, created_at, id)"
run "ALTER TABLE conversations ADD INDEX idx_conv_user_low_last (user_low_id, last_message_at)"
run "ALTER TABLE conversations ADD INDEX idx_conv_user_high_last (user_high_id, last_message_at)"
run "ALTER TABLE messages ADD INDEX idx_msg_conv_sender_created (conversation_id, sender_user_id, created_at)"
run "ALTER TABLE messages ADD INDEX idx_msg_conv_delivered (conversation_id, delivered_at)"
run "ALTER TABLE content_reviews ADD INDEX idx_reviews_subject_status (subject_type, subject_id, status)"

echo "=== new indexes ==="
sudo mysql witnessworld -N -e "
SELECT TABLE_NAME, INDEX_NAME
FROM information_schema.statistics
WHERE table_schema='witnessworld'
  AND INDEX_NAME IN (
    'idx_listings_mod_type_created','idx_listings_mod_type_country_created','idx_listings_mod_flags_id',
    'idx_stores_mod_created','idx_stores_mod_country','idx_sp_mod_created','idx_dir_mod_created',
    'idx_conv_user_low_last','idx_conv_user_high_last','idx_msg_conv_sender_created','idx_msg_conv_delivered',
    'idx_reviews_subject_status'
  )
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;
"
