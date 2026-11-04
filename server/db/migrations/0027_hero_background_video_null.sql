-- The home hero gained an optional backgroundVideo. Stored as an explicit
-- null on the existing rows, so the editor (which always holds the field)
-- finds the saved page unchanged instead of showing "Unpublished changes".
UPDATE "pages"
SET "draft" = jsonb_set("draft", '{hero,backgroundVideo}', 'null'::jsonb, true)
WHERE "key" = 'home' AND "draft" #> '{hero}' IS NOT NULL
  AND NOT ("draft" -> 'hero' ? 'backgroundVideo');--> statement-breakpoint
UPDATE "pages"
SET "published" = jsonb_set("published", '{hero,backgroundVideo}', 'null'::jsonb, true)
WHERE "key" = 'home' AND "published" #> '{hero}' IS NOT NULL
  AND NOT ("published" -> 'hero' ? 'backgroundVideo');
