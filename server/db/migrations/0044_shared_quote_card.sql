-- One quote card (Settings › Microcopy quoteCard) with per-place overrides.
-- The phone line is `phoneLabel` everywhere: microcopy quoteCard.telLabel and
-- the services help card's callLabel are renamed, carrying the stored value
-- over verbatim. The contact quote box and the services help card may now
-- leave title/body null to show the shared card's: a place's title/body is
-- emptied only when it is still exactly that place's own seeded text AND
-- equals the shared card's text in the same column (draft with draft,
-- published with published), so nothing renders differently and no admin
-- edit is lost. Pages, settings, the builder services grid blocks (version
-- + 1) and revisions (rename only). Re-runnable.
-- callLabel → phoneLabel on a help card (only where phoneLabel is not there yet).
CREATE OR REPLACE FUNCTION pg_temp.phone_label(card jsonb, old text) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(card) = 'object' AND card ? old AND NOT card ? 'phoneLabel'
    THEN (card - old) || jsonb_build_object('phoneLabel', card -> old)
    ELSE card END
$$;
--> statement-breakpoint
-- `card` with `field` null when it equals both `seeded` and the shared card's.
CREATE OR REPLACE FUNCTION pg_temp.use_shared(card jsonb, field text, seeded text, shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN card -> field = to_jsonb(seeded) AND card -> field = shared -> field
    THEN jsonb_set(card, ARRAY[field], 'null'::jsonb)
    ELSE card END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.quote_box_card(box jsonb, shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(box) = 'object' THEN
    pg_temp.use_shared(pg_temp.use_shared(box, 'title', 'Need a Quote?', shared),
      'body', 'Tell us about your space and we''ll put together a cleaning plan and price that suits you.', shared)
  ELSE box END
$$;
--> statement-breakpoint
-- The services help card; `shared` NULL = rename only.
CREATE OR REPLACE FUNCTION pg_temp.help_card(card jsonb, shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(card) = 'object' THEN
    pg_temp.use_shared(pg_temp.use_shared(pg_temp.phone_label(card, 'callLabel'),
      'title', 'Not sure what you need?', shared),
      'body', 'Tell us about your space and we''ll put together a cleaning plan and price that suits you.', shared)
  ELSE card END
$$;
--> statement-breakpoint
-- `doc` with the help card at `path` migrated (left alone when absent).
CREATE OR REPLACE FUNCTION pg_temp.help_card_at(doc jsonb, path text[], shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc #> path) = 'object'
    THEN jsonb_set(doc, path, pg_temp.help_card(doc #> path, shared))
    ELSE doc END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.quote_box_at(doc jsonb, shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'quoteBox') = 'object'
    THEN jsonb_set(doc, '{quoteBox}', pg_temp.quote_box_card(doc -> 'quoteBox', shared))
    ELSE doc END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.help_card_blocks(doc jsonb, shared jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'blocks') = 'array' THEN jsonb_set(doc, '{blocks}', (
    SELECT COALESCE(jsonb_agg(
      CASE WHEN block ->> 'type' = 'services'
        THEN pg_temp.help_card_at(block, '{data,grid,helpCard}', shared)
        ELSE block
      END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(doc -> 'blocks') WITH ORDINALITY AS t(block, ord)
  )) ELSE doc END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.microcopy(doc jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'quoteCard') = 'object'
    THEN jsonb_set(doc, '{quoteCard}', pg_temp.phone_label(doc -> 'quoteCard', 'telLabel'))
    ELSE doc END
$$;
--> statement-breakpoint
-- Overrides first (they compare with the shared title/body, which the
-- rename does not touch).
UPDATE "settings" AS c
SET "draft" = pg_temp.quote_box_at(c."draft",
  (SELECT m."draft" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
WHERE c."key" = 'sections.contact'
  AND pg_temp.quote_box_at(c."draft",
    (SELECT m."draft" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
    IS DISTINCT FROM c."draft";
--> statement-breakpoint
UPDATE "settings" AS c
SET "published" = pg_temp.quote_box_at(c."published",
  (SELECT m."published" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
WHERE c."key" = 'sections.contact'
  AND c."published" IS NOT NULL
  AND pg_temp.quote_box_at(c."published",
    (SELECT m."published" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
    IS DISTINCT FROM c."published";
--> statement-breakpoint
UPDATE "pages" AS p
SET "draft" = pg_temp.help_card_at(p."draft", '{grid,helpCard}',
  (SELECT m."draft" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
WHERE p."key" = 'services'
  AND pg_temp.help_card_at(p."draft", '{grid,helpCard}',
    (SELECT m."draft" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
    IS DISTINCT FROM p."draft";
--> statement-breakpoint
UPDATE "pages" AS p
SET "published" = pg_temp.help_card_at(p."published", '{grid,helpCard}',
  (SELECT m."published" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
WHERE p."key" = 'services'
  AND p."published" IS NOT NULL
  AND pg_temp.help_card_at(p."published", '{grid,helpCard}',
    (SELECT m."published" -> 'quoteCard' FROM "settings" AS m WHERE m."key" = 'microcopy'))
    IS DISTINCT FROM p."published";
--> statement-breakpoint
-- Builder services grid blocks. One update per row so the version goes up once.
UPDATE "builder_pages" AS b SET
  "draft" = pg_temp.help_card_blocks(b."draft", s.draft_card),
  "published" = CASE WHEN b."published" IS NULL THEN NULL
    ELSE pg_temp.help_card_blocks(b."published", s.published_card) END,
  "version" = b."version" + 1
FROM (
  SELECT
    (SELECT "draft" -> 'quoteCard' FROM "settings" WHERE "key" = 'microcopy') AS draft_card,
    (SELECT "published" -> 'quoteCard' FROM "settings" WHERE "key" = 'microcopy') AS published_card
) AS s
WHERE pg_temp.help_card_blocks(b."draft", s.draft_card) IS DISTINCT FROM b."draft"
  OR (b."published" IS NOT NULL
    AND pg_temp.help_card_blocks(b."published", s.published_card) IS DISTINCT FROM b."published");
--> statement-breakpoint
UPDATE "settings"
SET "draft" = pg_temp.microcopy("draft")
WHERE "key" = 'microcopy'
  AND pg_temp.microcopy("draft") IS DISTINCT FROM "draft";
--> statement-breakpoint
UPDATE "settings"
SET "published" = pg_temp.microcopy("published")
WHERE "key" = 'microcopy'
  AND "published" IS NOT NULL
  AND pg_temp.microcopy("published") IS DISTINCT FROM "published";
--> statement-breakpoint
-- Restoring an older version must still validate: rename only.
UPDATE "revisions"
SET "data" = CASE
    WHEN "entity_type" = 'settings' THEN pg_temp.microcopy("data")
    WHEN "entity_type" = 'page' THEN pg_temp.help_card_at("data", '{grid,helpCard}', NULL)
    ELSE pg_temp.help_card_blocks("data", NULL)
  END
WHERE (("entity_type" = 'settings' AND "entity_id" = 'microcopy')
    OR ("entity_type" = 'page' AND "entity_id" = 'services')
    OR "entity_type" = 'builder-page')
  AND CASE
    WHEN "entity_type" = 'settings' THEN pg_temp.microcopy("data")
    WHEN "entity_type" = 'page' THEN pg_temp.help_card_at("data", '{grid,helpCard}', NULL)
    ELSE pg_temp.help_card_blocks("data", NULL)
  END IS DISTINCT FROM "data";
