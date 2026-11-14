-- One quote button: Settings › Contact gains quoteLabel and quoteHref (where
-- missing; a stored value wins), and every seeded quote button becomes an
-- ordinary link to {quoteHref} (text {quoteLabel} unless the place has its
-- own words). Only the exact seeded links are rewritten (pg_temp.quote_link);
-- a link the admin changed is left alone. Settings, pages and the builder
-- blocks sharing those shapes (hero, ourStory, services grid; version + 1),
-- draft and published; contact revisions gain the two keys. Re-runnable.
CREATE OR REPLACE FUNCTION pg_temp.quote_link(link jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN link = '{"label":"Get a Free Quote","href":"#contact"}'::jsonb
      OR link = '{"label":"Get A Quote","href":"#contact"}'::jsonb
      THEN '{"label":"{quoteLabel}","href":"{quoteHref}"}'::jsonb
    WHEN link = '{"label":"Get a Quote","href":"#contact"}'::jsonb
      THEN '{"label":"Get a Quote","href":"{quoteHref}"}'::jsonb
    WHEN link = '{"label":"Fill the Form","href":"/contact#quote"}'::jsonb
      THEN '{"label":"Fill the Form","href":"{quoteHref}"}'::jsonb
    WHEN link = '{"label":"Contact Us","href":"#contact"}'::jsonb
      THEN '{"label":"Contact Us","href":"{quoteHref}"}'::jsonb
    ELSE link
  END
$$;
--> statement-breakpoint
-- The link at `path` mapped by quote_link; anything else is returned as is.
CREATE OR REPLACE FUNCTION pg_temp.quote_at(doc jsonb, path text[]) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc #> path) = 'object'
    THEN jsonb_set(doc, path, pg_temp.quote_link(doc #> path))
    ELSE doc
  END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.quote_blocks(doc jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(doc -> 'blocks') = 'array' THEN jsonb_set(doc, '{blocks}', (
    SELECT COALESCE(jsonb_agg(
      CASE block ->> 'type'
        WHEN 'hero' THEN pg_temp.quote_at(block, '{data,primaryCta}')
        WHEN 'ourStory' THEN pg_temp.quote_at(block, '{data,cta}')
        WHEN 'services' THEN pg_temp.quote_at(
          pg_temp.quote_at(block, '{data,grid,quoteCta}'),
          '{data,grid,helpCard,cta}')
        ELSE block
      END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(doc -> 'blocks') WITH ORDINALITY AS t(block, ord)
  )) ELSE doc END
$$;
--> statement-breakpoint
UPDATE "settings"
SET "draft" = '{"quoteLabel":"Get a Free Quote","quoteHref":"/contact#quote"}'::jsonb || "draft"
WHERE "key" = 'contact'
  AND jsonb_typeof("draft") = 'object'
  AND NOT ("draft" ?& ARRAY['quoteLabel', 'quoteHref']);
--> statement-breakpoint
UPDATE "settings"
SET "published" = '{"quoteLabel":"Get a Free Quote","quoteHref":"/contact#quote"}'::jsonb || "published"
WHERE "key" = 'contact'
  AND "published" IS NOT NULL
  AND jsonb_typeof("published") = 'object'
  AND NOT ("published" ?& ARRAY['quoteLabel', 'quoteHref']);
--> statement-breakpoint
-- Restoring an older contact version must still validate.
UPDATE "revisions"
SET "data" = '{"quoteLabel":"Get a Free Quote","quoteHref":"/contact#quote"}'::jsonb || "data"
WHERE "entity_type" = 'settings' AND "entity_id" = 'contact'
  AND jsonb_typeof("data") = 'object'
  AND NOT ("data" ?& ARRAY['quoteLabel', 'quoteHref']);
--> statement-breakpoint
UPDATE "settings"
SET "draft" = CASE "key"
    WHEN 'navigation' THEN pg_temp.quote_at("draft", '{cta}')
    WHEN 'microcopy' THEN pg_temp.quote_at("draft", '{quoteCard,cta}')
    ELSE pg_temp.quote_at("draft", '{quoteBox,cta}')
  END
WHERE "key" IN ('navigation', 'microcopy', 'sections.contact')
  AND CASE "key"
    WHEN 'navigation' THEN pg_temp.quote_at("draft", '{cta}')
    WHEN 'microcopy' THEN pg_temp.quote_at("draft", '{quoteCard,cta}')
    ELSE pg_temp.quote_at("draft", '{quoteBox,cta}')
  END IS DISTINCT FROM "draft";
--> statement-breakpoint
UPDATE "settings"
SET "published" = CASE "key"
    WHEN 'navigation' THEN pg_temp.quote_at("published", '{cta}')
    WHEN 'microcopy' THEN pg_temp.quote_at("published", '{quoteCard,cta}')
    ELSE pg_temp.quote_at("published", '{quoteBox,cta}')
  END
WHERE "key" IN ('navigation', 'microcopy', 'sections.contact')
  AND "published" IS NOT NULL
  AND CASE "key"
    WHEN 'navigation' THEN pg_temp.quote_at("published", '{cta}')
    WHEN 'microcopy' THEN pg_temp.quote_at("published", '{quoteCard,cta}')
    ELSE pg_temp.quote_at("published", '{quoteBox,cta}')
  END IS DISTINCT FROM "published";
--> statement-breakpoint
UPDATE "pages"
SET "draft" = CASE "key"
    WHEN 'home' THEN pg_temp.quote_at("draft", '{hero,primaryCta}')
    WHEN 'about' THEN pg_temp.quote_at("draft", '{story,cta}')
    ELSE pg_temp.quote_at(pg_temp.quote_at("draft", '{grid,quoteCta}'), '{grid,helpCard,cta}')
  END
WHERE "key" IN ('home', 'about', 'services')
  AND CASE "key"
    WHEN 'home' THEN pg_temp.quote_at("draft", '{hero,primaryCta}')
    WHEN 'about' THEN pg_temp.quote_at("draft", '{story,cta}')
    ELSE pg_temp.quote_at(pg_temp.quote_at("draft", '{grid,quoteCta}'), '{grid,helpCard,cta}')
  END IS DISTINCT FROM "draft";
--> statement-breakpoint
UPDATE "pages"
SET "published" = CASE "key"
    WHEN 'home' THEN pg_temp.quote_at("published", '{hero,primaryCta}')
    WHEN 'about' THEN pg_temp.quote_at("published", '{story,cta}')
    ELSE pg_temp.quote_at(pg_temp.quote_at("published", '{grid,quoteCta}'), '{grid,helpCard,cta}')
  END
WHERE "key" IN ('home', 'about', 'services')
  AND "published" IS NOT NULL
  AND CASE "key"
    WHEN 'home' THEN pg_temp.quote_at("published", '{hero,primaryCta}')
    WHEN 'about' THEN pg_temp.quote_at("published", '{story,cta}')
    ELSE pg_temp.quote_at(pg_temp.quote_at("published", '{grid,quoteCta}'), '{grid,helpCard,cta}')
  END IS DISTINCT FROM "published";
--> statement-breakpoint
-- Builder blocks share these shapes. One update per row so the version goes
-- up once.
UPDATE "builder_pages" SET
  "draft" = pg_temp.quote_blocks("draft"),
  "published" = CASE WHEN "published" IS NULL THEN NULL ELSE pg_temp.quote_blocks("published") END,
  "version" = "version" + 1
WHERE pg_temp.quote_blocks("draft") IS DISTINCT FROM "draft"
  OR ("published" IS NOT NULL AND pg_temp.quote_blocks("published") IS DISTINCT FROM "published");
