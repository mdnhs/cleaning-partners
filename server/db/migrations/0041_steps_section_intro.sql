-- settings.sections.howItWorks becomes the shared steps section, which has a
-- required (nullable) `intro`. Adds `"intro": null` only where the key is
-- missing; an intro already stored wins (right side of ||). Draft, published
-- and revisions, so restoring an older version still validates.
UPDATE "settings"
SET "draft" = '{"intro":null}'::jsonb || "draft"
WHERE "key" = 'sections.howItWorks'
  AND jsonb_typeof("draft") = 'object'
  AND NOT "draft" ? 'intro';
--> statement-breakpoint
UPDATE "settings"
SET "published" = '{"intro":null}'::jsonb || "published"
WHERE "key" = 'sections.howItWorks'
  AND "published" IS NOT NULL
  AND jsonb_typeof("published") = 'object'
  AND NOT "published" ? 'intro';
--> statement-breakpoint
UPDATE "revisions"
SET "data" = '{"intro":null}'::jsonb || "data"
WHERE "entity_type" = 'settings' AND "entity_id" = 'sections.howItWorks'
  AND jsonb_typeof("data") = 'object'
  AND NOT "data" ? 'intro';
