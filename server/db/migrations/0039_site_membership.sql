-- One ICCA badge: the home hero's logo + alt and the contact section's logo,
-- alt + subtitle become settings.site.membership { logo, logoAlt, name }.
-- Per column, the site gains `membership` only where it has none: the hero's
-- logo and alt (else the contact section's), the contact subtitle as the name
-- (else the hero alt); a published site with no published source takes the
-- draft's. Then the old keys go from the home hero, sections.contact and every
-- builder `hero` block (version + 1), media_usages follow, and site revisions
-- gain the membership. Re-runnable; stored values are carried over verbatim.
CREATE OR REPLACE FUNCTION pg_temp.site_membership(home jsonb, contact jsonb, fallback jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN jsonb_typeof(v->'logo') = 'object' AND jsonb_typeof(v->'logoAlt') = 'string'
      AND jsonb_typeof(v->'name') = 'string' THEN v
  END
  FROM (SELECT jsonb_build_object(
    'logo', COALESCE(NULLIF(home #> '{hero,memberLogo}', 'null'), NULLIF(contact -> 'memberLogo', 'null'), fallback -> 'logo'),
    'logoAlt', COALESCE(NULLIF(home #> '{hero,memberLogoAlt}', 'null'), NULLIF(contact -> 'memberLogoAlt', 'null'), fallback -> 'logoAlt'),
    'name', COALESCE(NULLIF(contact -> 'memberSubtitle', 'null'), NULLIF(home #> '{hero,memberLogoAlt}', 'null'), fallback -> 'name')
  ) AS v) AS t
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.drop_hero_member_logo(doc jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'blocks') = 'array' THEN jsonb_set(doc, '{blocks}', (
    SELECT COALESCE(jsonb_agg(
      CASE WHEN block ->> 'type' = 'hero' AND jsonb_typeof(block -> 'data') = 'object'
        THEN block #- '{data,memberLogo}' #- '{data,memberLogoAlt}'
        ELSE block
      END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(doc -> 'blocks') WITH ORDINALITY AS t(block, ord)
  )) ELSE doc END
$$;
--> statement-breakpoint
UPDATE "settings" s
SET "draft" = jsonb_set(s."draft", '{membership}', pg_temp.site_membership(
  (SELECT "draft" FROM "pages" WHERE "key" = 'home'),
  (SELECT "draft" FROM "settings" WHERE "key" = 'sections.contact'),
  NULL))
WHERE s."key" = 'site' AND jsonb_typeof(s."draft") = 'object'
  AND NOT (s."draft" ? 'membership')
  AND pg_temp.site_membership(
    (SELECT "draft" FROM "pages" WHERE "key" = 'home'),
    (SELECT "draft" FROM "settings" WHERE "key" = 'sections.contact'),
    NULL) IS NOT NULL;
--> statement-breakpoint
UPDATE "settings" s
SET "published" = jsonb_set(s."published", '{membership}', pg_temp.site_membership(
  (SELECT "published" FROM "pages" WHERE "key" = 'home'),
  (SELECT "published" FROM "settings" WHERE "key" = 'sections.contact'),
  s."draft" -> 'membership'))
WHERE s."key" = 'site' AND "published" IS NOT NULL AND jsonb_typeof(s."published") = 'object'
  AND NOT (s."published" ? 'membership')
  AND pg_temp.site_membership(
    (SELECT "published" FROM "pages" WHERE "key" = 'home'),
    (SELECT "published" FROM "settings" WHERE "key" = 'sections.contact'),
    s."draft" -> 'membership') IS NOT NULL;
--> statement-breakpoint
-- Restoring an older site version must still validate.
UPDATE "revisions" r
SET "data" = jsonb_set(r."data", '{membership}', s."draft" -> 'membership')
FROM "settings" s
WHERE s."key" = 'site' AND s."draft" ? 'membership'
  AND r."entity_type" = 'settings' AND r."entity_id" = 'site'
  AND jsonb_typeof(r."data") = 'object' AND NOT (r."data" ? 'membership');
--> statement-breakpoint
-- The old keys go only once the site holds the membership.
UPDATE "pages"
SET "draft" = "draft" #- '{hero,memberLogo}' #- '{hero,memberLogoAlt}'
WHERE "key" = 'home' AND jsonb_typeof("draft" -> 'hero') = 'object'
  AND "draft" -> 'hero' ?| ARRAY['memberLogo', 'memberLogoAlt']
  AND EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'site' AND "draft" ? 'membership');
--> statement-breakpoint
UPDATE "pages"
SET "published" = "published" #- '{hero,memberLogo}' #- '{hero,memberLogoAlt}'
WHERE "key" = 'home' AND "published" IS NOT NULL AND jsonb_typeof("published" -> 'hero') = 'object'
  AND "published" -> 'hero' ?| ARRAY['memberLogo', 'memberLogoAlt']
  AND EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'site' AND "draft" ? 'membership');
--> statement-breakpoint
UPDATE "settings"
SET "draft" = "draft" - 'memberLogo' - 'memberLogoAlt' - 'memberSubtitle'
WHERE "key" = 'sections.contact' AND jsonb_typeof("draft") = 'object'
  AND "draft" ?| ARRAY['memberLogo', 'memberLogoAlt', 'memberSubtitle']
  AND EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'site' AND "draft" ? 'membership');
--> statement-breakpoint
UPDATE "settings"
SET "published" = "published" - 'memberLogo' - 'memberLogoAlt' - 'memberSubtitle'
WHERE "key" = 'sections.contact' AND "published" IS NOT NULL AND jsonb_typeof("published") = 'object'
  AND "published" ?| ARRAY['memberLogo', 'memberLogoAlt', 'memberSubtitle']
  AND EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'site' AND "draft" ? 'membership');
--> statement-breakpoint
-- Builder hero blocks share the home hero's shape: drop the keys there too.
-- One update per row so the version goes up once.
UPDATE "builder_pages" SET
  "draft" = pg_temp.drop_hero_member_logo("draft"),
  "published" = CASE WHEN "published" IS NULL THEN NULL ELSE pg_temp.drop_hero_member_logo("published") END,
  "version" = "version" + 1
WHERE pg_temp.drop_hero_member_logo("draft") IS DISTINCT FROM "draft"
  OR ("published" IS NOT NULL AND pg_temp.drop_hero_member_logo("published") IS DISTINCT FROM "published");
--> statement-breakpoint
INSERT INTO "media_usages" ("id", "media_id", "entity_type", "entity_id", "field")
SELECT gen_random_uuid(), u."media_id", 'settings', 'site', 'membership.logo'
FROM (
  SELECT DISTINCT m."id" AS "media_id"
  FROM "settings" s
  CROSS JOIN LATERAL (VALUES
    (s."draft" #>> '{membership,logo,mediaId}'),
    (s."published" #>> '{membership,logo,mediaId}')
  ) AS v("ref")
  JOIN "media" m ON m."id"::text = v."ref"
  WHERE s."key" = 'site'
) AS u
ON CONFLICT ON CONSTRAINT media_usages_unique DO NOTHING;
--> statement-breakpoint
-- Old usage rows go once their field is gone from the stored values.
DELETE FROM "media_usages" u
WHERE (u."entity_type" = 'page' AND u."entity_id" = 'home' AND u."field" = 'hero.memberLogo'
    AND NOT EXISTS (SELECT 1 FROM "pages" p WHERE p."key" = 'home'
      AND (p."draft" #> '{hero,memberLogo}' IS NOT NULL OR p."published" #> '{hero,memberLogo}' IS NOT NULL)))
  OR (u."entity_type" = 'settings' AND u."entity_id" = 'sections.contact' AND u."field" = 'memberLogo'
    AND NOT EXISTS (SELECT 1 FROM "settings" c WHERE c."key" = 'sections.contact'
      AND (c."draft" ? 'memberLogo' OR c."published" ? 'memberLogo')))
  OR (u."entity_type" = 'builder-page' AND u."field" ~ '^blocks\.[0-9]+\.data\.memberLogo$');
