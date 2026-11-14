-- settings.sections.whyChooseUs becomes the shared icon cards section, whose
-- list is `cards` (as on the careers page). Renames `features` to `cards`,
-- carrying the stored list over verbatim, only where `cards` is not there
-- yet (a row already on `cards` is left alone). Draft, published and
-- revisions, so restoring an older version still validates. The whyChooseUs
-- builder block is shared-only (no data), so builder_pages need nothing.
UPDATE "settings"
SET "draft" = ("draft" - 'features')
  || jsonb_build_object('cards', "draft" -> 'features')
WHERE "key" = 'sections.whyChooseUs'
  AND jsonb_typeof("draft") = 'object'
  AND "draft" ? 'features'
  AND NOT "draft" ? 'cards';
--> statement-breakpoint
UPDATE "settings"
SET "published" = ("published" - 'features')
  || jsonb_build_object('cards', "published" -> 'features')
WHERE "key" = 'sections.whyChooseUs'
  AND "published" IS NOT NULL
  AND jsonb_typeof("published") = 'object'
  AND "published" ? 'features'
  AND NOT "published" ? 'cards';
--> statement-breakpoint
UPDATE "revisions"
SET "data" = ("data" - 'features')
  || jsonb_build_object('cards', "data" -> 'features')
WHERE "entity_type" = 'settings' AND "entity_id" = 'sections.whyChooseUs'
  AND jsonb_typeof("data") = 'object'
  AND "data" ? 'features'
  AND NOT "data" ? 'cards';
--> statement-breakpoint
-- An old usage whose renamed twin is already recorded is a duplicate.
DELETE FROM "media_usages" AS old
WHERE old."entity_type" = 'settings'
  AND old."entity_id" = 'sections.whyChooseUs'
  AND old."field" LIKE 'features.%'
  AND EXISTS (
    SELECT 1 FROM "media_usages" AS renamed
    WHERE renamed."media_id" = old."media_id"
      AND renamed."entity_type" = old."entity_type"
      AND renamed."entity_id" = old."entity_id"
      AND renamed."field" = regexp_replace(old."field", '^features\.', 'cards.')
  );
--> statement-breakpoint
UPDATE "media_usages"
SET "field" = regexp_replace("field", '^features\.', 'cards.')
WHERE "entity_type" = 'settings'
  AND "entity_id" = 'sections.whyChooseUs'
  AND "field" LIKE 'features.%';
