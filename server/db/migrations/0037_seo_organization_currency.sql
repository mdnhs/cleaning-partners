-- settings.seo.defaults.organization gains a required `currency` (ISO 4217;
-- job pay in Google for Jobs). Adds "EUR" only where the key is missing; a
-- currency already stored wins (right side of ||). Draft, published and
-- revisions, so restoring an older version still validates.
UPDATE "settings"
SET "draft" = jsonb_set("draft", '{organization}', '{"currency":"EUR"}'::jsonb || ("draft" -> 'organization'))
WHERE "key" = 'seo.defaults'
  AND jsonb_typeof("draft" -> 'organization') = 'object'
  AND NOT ("draft" -> 'organization') ? 'currency';
--> statement-breakpoint
UPDATE "settings"
SET "published" = jsonb_set("published", '{organization}', '{"currency":"EUR"}'::jsonb || ("published" -> 'organization'))
WHERE "key" = 'seo.defaults'
  AND "published" IS NOT NULL
  AND jsonb_typeof("published" -> 'organization') = 'object'
  AND NOT ("published" -> 'organization') ? 'currency';
--> statement-breakpoint
UPDATE "revisions"
SET "data" = jsonb_set("data", '{organization}', '{"currency":"EUR"}'::jsonb || ("data" -> 'organization'))
WHERE "entity_type" = 'settings' AND "entity_id" = 'seo.defaults'
  AND jsonb_typeof("data" -> 'organization') = 'object'
  AND NOT ("data" -> 'organization') ? 'currency';
