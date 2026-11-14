-- The home services list picks services from the collection: each item is
-- { service: <slug>, description } (the name and link come from the
-- service). The exact seeded list (whose "Domestic Cleaning" has no service)
-- becomes the new seeded list. Any other old-shape list keeps its items whose
-- title matches a service's title (case-insensitive, trimmed; published title,
-- else draft), carrying the description verbatim; unmatched items are dropped
-- and an empty result becomes the new seeded list. A service listed twice
-- keeps only its first item, and at most six items stay (the schema's rules). Lists already in the new shape are left alone. The home
-- page, builder services intro blocks (version + 1) and their revisions.
-- Re-runnable.
CREATE OR REPLACE FUNCTION pg_temp.home_seeded_items() RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT '[
    {"service": "medical-cleaning", "description": "Hygienic, compliant cleaning for clinics and healthcare settings."},
    {"service": "commercial-cleaning", "description": "Offices, schools and workplaces kept spotless, on your schedule."},
    {"service": "retail-cleaning", "description": "Shops, showrooms and salons kept customer-ready, on your schedule."}
  ]'::jsonb
$$;
--> statement-breakpoint
-- The slug of the service titled `title` (NULL when none).
CREATE OR REPLACE FUNCTION pg_temp.service_slug(title text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT s."slug" FROM "services" AS s
  WHERE lower(btrim(COALESCE(s."published", s."draft") ->> 'title')) = lower(btrim(title))
  ORDER BY s."sort_order", s."slug"
  LIMIT 1
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.home_items(items jsonb) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN jsonb_typeof(items) IS DISTINCT FROM 'array' THEN items
    WHEN items = '[
      {"title": "Medical Cleaning", "description": "Hygienic, compliant cleaning for clinics and healthcare settings."},
      {"title": "Commercial Cleaning", "description": "Offices, schools and workplaces kept spotless, on your schedule."},
      {"title": "Domestic Cleaning", "description": "Reliable home cleaning, from regular visits to deep cleans."}
    ]'::jsonb THEN pg_temp.home_seeded_items()
    -- Already migrated: every item names a service.
    WHEN NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS e(el)
      WHERE jsonb_typeof(el) IS DISTINCT FROM 'object' OR NOT el ? 'service'
    ) THEN items
    ELSE COALESCE((
      SELECT jsonb_agg(kept.item ORDER BY kept.ord)
      FROM (
        SELECT d.ord, d.item
        FROM (
          -- Each service once (the schema rejects repeats): its first item.
          SELECT DISTINCT ON (m.item ->> 'service') m.ord, m.item
          FROM (
            SELECT t.ord,
              CASE WHEN t.el ? 'service' THEN t.el
                ELSE jsonb_build_object(
                  'service', pg_temp.service_slug(t.el ->> 'title'),
                  'description', t.el -> 'description')
              END AS item
            FROM jsonb_array_elements(items) WITH ORDINALITY AS t(el, ord)
            WHERE jsonb_typeof(t.el) = 'object'
          ) AS m
          WHERE m.item ->> 'service' IS NOT NULL
          ORDER BY m.item ->> 'service', m.ord
        ) AS d
        ORDER BY d.ord
        LIMIT 6
      ) AS kept
    ), pg_temp.home_seeded_items())
  END
$$;
--> statement-breakpoint
-- `doc` with its services list at `path` migrated (left alone when absent).
CREATE OR REPLACE FUNCTION pg_temp.home_items_at(doc jsonb, path text[]) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc #> path) = 'array'
    THEN jsonb_set(doc, path, pg_temp.home_items(doc #> path))
    ELSE doc END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.home_items_blocks(doc jsonb) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'blocks') = 'array' THEN jsonb_set(doc, '{blocks}', (
    SELECT COALESCE(jsonb_agg(
      CASE WHEN block ->> 'type' = 'services'
        THEN pg_temp.home_items_at(block, '{data,intro,items}')
        ELSE block
      END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(doc -> 'blocks') WITH ORDINALITY AS t(block, ord)
  )) ELSE doc END
$$;
--> statement-breakpoint
UPDATE "pages"
SET "draft" = pg_temp.home_items_at("draft", '{services,items}')
WHERE "key" = 'home'
  AND pg_temp.home_items_at("draft", '{services,items}') IS DISTINCT FROM "draft";
--> statement-breakpoint
UPDATE "pages"
SET "published" = pg_temp.home_items_at("published", '{services,items}')
WHERE "key" = 'home'
  AND "published" IS NOT NULL
  AND pg_temp.home_items_at("published", '{services,items}') IS DISTINCT FROM "published";
--> statement-breakpoint
-- Builder services intro blocks. One update per row so the version goes up once.
UPDATE "builder_pages" SET
  "draft" = pg_temp.home_items_blocks("draft"),
  "published" = CASE WHEN "published" IS NULL THEN NULL
    ELSE pg_temp.home_items_blocks("published") END,
  "version" = "version" + 1
WHERE pg_temp.home_items_blocks("draft") IS DISTINCT FROM "draft"
  OR ("published" IS NOT NULL
    AND pg_temp.home_items_blocks("published") IS DISTINCT FROM "published");
--> statement-breakpoint
-- Restoring an older version must still validate (`service` is required).
UPDATE "revisions"
SET "data" = CASE
    WHEN "entity_type" = 'page' THEN pg_temp.home_items_at("data", '{services,items}')
    ELSE pg_temp.home_items_blocks("data")
  END
WHERE (("entity_type" = 'page' AND "entity_id" = 'home')
    OR "entity_type" = 'builder-page')
  AND CASE
    WHEN "entity_type" = 'page' THEN pg_temp.home_items_at("data", '{services,items}')
    ELSE pg_temp.home_items_blocks("data")
  END IS DISTINCT FROM "data";
