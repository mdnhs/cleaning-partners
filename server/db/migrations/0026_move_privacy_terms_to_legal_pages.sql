-- The fixed Privacy and Terms pages become ordinary legal pages (builder pages
-- with a legal_order, served at /privacy and /terms as before): a hero block
-- and a text block holding the same content, same status and publish time.
-- Re-runnable: a legal page that already has the slug is left alone.
INSERT INTO "builder_pages" (
  "id", "slug", "title", "seo", "legal_order", "draft", "published",
  "version", "status", "scheduled_at", "published_at", "updated_by",
  "created_by", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  p."key",
  COALESCE(p."draft" #>> '{hero,title}', initcap(p."key")),
  p."seo",
  CASE p."key" WHEN 'privacy' THEN 0 ELSE 1 END,
  jsonb_build_object('blocks', jsonb_build_array(
    jsonb_build_object('id', 'legal-hero', 'type', 'hero.page', 'anchor', 'hero',
      'hidden', false, 'data', p."draft" -> 'hero'),
    jsonb_build_object('id', 'legal-text', 'type', 'richtext', 'anchor', 'policy',
      'hidden', false, 'data', jsonb_build_object('doc', p."draft" -> 'body'))
  )),
  CASE WHEN p."published" IS NULL THEN NULL ELSE
    jsonb_build_object('blocks', jsonb_build_array(
      jsonb_build_object('id', 'legal-hero', 'type', 'hero.page', 'anchor', 'hero',
        'hidden', false, 'data', p."published" -> 'hero'),
      jsonb_build_object('id', 'legal-text', 'type', 'richtext', 'anchor', 'policy',
        'hidden', false, 'data', jsonb_build_object('doc', p."published" -> 'body'))
    ))
  END,
  1,
  p."status",
  p."scheduled_at",
  p."published_at",
  p."updated_by",
  p."updated_by",
  p."created_at",
  p."updated_at"
FROM "pages" p
WHERE p."key" IN ('privacy', 'terms')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint

-- The hero banner's media usage moves with the content.
INSERT INTO "media_usages" ("id", "media_id", "entity_type", "entity_id", "field")
SELECT gen_random_uuid(), u."media_id", 'builder-page', b."id"::text, 'blocks.0.data.image'
FROM "media_usages" u
JOIN "builder_pages" b ON b."slug" = u."entity_id" AND b."legal_order" IS NOT NULL
WHERE u."entity_type" = 'page' AND u."entity_id" IN ('privacy', 'terms')
  AND u."field" LIKE 'hero.image%'
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Remove the old rows only once their copies exist.
DELETE FROM "media_usages" u
WHERE u."entity_type" = 'page' AND u."entity_id" IN ('privacy', 'terms')
  AND EXISTS (SELECT 1 FROM "builder_pages" b WHERE b."slug" = u."entity_id" AND b."legal_order" IS NOT NULL);--> statement-breakpoint
DELETE FROM "revisions" r
WHERE r."entity_type" = 'page' AND r."entity_id" IN ('privacy', 'terms')
  AND EXISTS (SELECT 1 FROM "builder_pages" b WHERE b."slug" = r."entity_id" AND b."legal_order" IS NOT NULL);--> statement-breakpoint
DELETE FROM "pages" p
WHERE p."key" IN ('privacy', 'terms')
  AND EXISTS (SELECT 1 FROM "builder_pages" b WHERE b."slug" = p."key" AND b."legal_order" IS NOT NULL);
