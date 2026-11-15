-- seo.defaults.preferredHost arrived without a data migration: rows saved
-- before it read as "off" only through the schema default, so the editor
-- showed it unset. Store "off" where the key is missing; kept elsewhere.
UPDATE "settings"
SET "draft" = jsonb_set("draft", '{preferredHost}', '"off"'::jsonb)
WHERE "key" = 'seo.defaults'
  AND jsonb_typeof("draft") = 'object'
  AND NOT ("draft" ? 'preferredHost');
--> statement-breakpoint
UPDATE "settings"
SET "published" = jsonb_set("published", '{preferredHost}', '"off"'::jsonb)
WHERE "key" = 'seo.defaults'
  AND jsonb_typeof("published") = 'object'
  AND NOT ("published" ? 'preferredHost');
