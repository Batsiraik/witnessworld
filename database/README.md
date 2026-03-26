# Witness World Connect — database

## Your current database (production / test)

If your MySQL database already has the tables below (for example the **Mar 26, 2026** dump with `u462861958_witnessworld`), you **do not** need to run anything else for the current app version.

### Required tables (checklist)

| Table | Purpose |
|-------|--------|
| `admins` | Admin panel logins |
| `users` | Members |
| `user_api_tokens` | Mobile/API auth |
| `settings` | Site + SMTP keys |
| `questionnaire_questions` | Registration questionnaire |
| `questionnaire_answers` | User answers |
| `listings` | Classified + service listings |
| `stores` | Seller storefronts |
| `store_products` | Products |
| `directory_entries` | Business directory |
| `advertisements` | Admin ads (optional surface) |
| `content_reports` | User reports (all content types) |
| `conversations` | Inbox threads |
| `messages` | Chat messages |

**Removed / replaced:** older installs used `listing_reports`. That is **not** required anymore; reports live in `content_reports`.

**Verdict for the dump you shared:** all of the above are present — **no missing tables** for the codebase as of this README.

---

## How we change the schema from now on

1. **Do not** run `schema.sql` on a database you care about — it begins with `DROP TABLE` and will wipe data.
2. For **new changes** (new column, new table, new index), append **only the new SQL** to the bottom of **`revisions.sql`**, with a dated comment, for example:

```sql
-- 2026-03-27: example — add optional column to users
-- ALTER TABLE users ADD COLUMN favorite_color VARCHAR(32) NULL AFTER phone;
```

3. Run the new statements from `revisions.sql` on staging, then production (phpMyAdmin “SQL” tab or MySQL CLI).
4. Optionally mirror the same DDL in `schema.sql` so a **future** fresh-from-scratch install stays accurate (only if you maintain `schema.sql` by hand).

**Reference DDL:** `schema.sql` is the full picture of tables/indexes/FKs for a clean reinstall (destructive at the top).

---

## Fresh empty database (disposable only)

If you truly want to recreate everything from zero and **delete all data**, you may import `schema.sql` once on an empty schema. Otherwise use `revisions.sql` incrementally on existing data.

---

## Old migration files

Per-date files such as `migration_2026_03_*.sql` were **removed** from the repo to avoid duplicating DDL that already exists on your server. History is represented by `schema.sql` + the append-only `revisions.sql`.
