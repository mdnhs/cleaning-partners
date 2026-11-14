-- One page-hero shape: every page hero has a required `image` (a media ref,
-- or null = the site's default banner). The about, contact and careers
-- heroes had no image key: add `"image": null` only where the key is
-- missing, so a stored banner is kept. Draft, published and revisions;
-- re-runnable. Builder `hero.page` blocks already had this shape.
UPDATE "pages"
SET "draft" = jsonb_set("draft", '{hero,image}', 'null'::jsonb)
WHERE "key" IN ('about', 'contact', 'careers')
  AND jsonb_typeof("draft"->'hero') = 'object'
  AND NOT ("draft"->'hero' ? 'image');
--> statement-breakpoint
UPDATE "pages"
SET "published" = jsonb_set("published", '{hero,image}', 'null'::jsonb)
WHERE "key" IN ('about', 'contact', 'careers') AND "published" IS NOT NULL
  AND jsonb_typeof("published"->'hero') = 'object'
  AND NOT ("published"->'hero' ? 'image');
--> statement-breakpoint
UPDATE "revisions"
SET "data" = jsonb_set("data", '{hero,image}', 'null'::jsonb)
WHERE "entity_type" = 'page' AND "entity_id" IN ('about', 'contact', 'careers')
  AND jsonb_typeof("data"->'hero') = 'object'
  AND NOT ("data"->'hero' ? 'image');
