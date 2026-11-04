-- Header links (also the footer's Quick Links) gain "Careers" before
-- "Contact" on sites that have no link to /careers yet. Re-runnable. The
-- careers page row, its settings row and the starter jobs come from
-- `pnpm db:seed`, which only inserts missing rows (docs/runbook.md).
UPDATE "settings" s
SET "draft" = jsonb_set(
  s."draft", '{links}',
  (SELECT COALESCE(jsonb_agg(x.link ORDER BY x.pos), '[]'::jsonb)
   FROM (
     SELECT l AS link, (n * 2)::int AS pos
     FROM jsonb_array_elements(s."draft" -> 'links') WITH ORDINALITY AS t(l, n)
     UNION ALL
     SELECT '{"label":"Careers","href":"/careers"}'::jsonb,
       COALESCE((SELECT (n * 2 - 1)::int FROM jsonb_array_elements(s."draft" -> 'links') WITH ORDINALITY AS t(l, n)
                 WHERE l ->> 'href' = '/contact' LIMIT 1), 100000)
   ) x)
)
WHERE s."key" = 'navigation'
  AND jsonb_typeof(s."draft" -> 'links') = 'array'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(s."draft" -> 'links') l WHERE l ->> 'href' = '/careers');--> statement-breakpoint
UPDATE "settings" s
SET "published" = jsonb_set(
  s."published", '{links}',
  (SELECT COALESCE(jsonb_agg(x.link ORDER BY x.pos), '[]'::jsonb)
   FROM (
     SELECT l AS link, (n * 2)::int AS pos
     FROM jsonb_array_elements(s."published" -> 'links') WITH ORDINALITY AS t(l, n)
     UNION ALL
     SELECT '{"label":"Careers","href":"/careers"}'::jsonb,
       COALESCE((SELECT (n * 2 - 1)::int FROM jsonb_array_elements(s."published" -> 'links') WITH ORDINALITY AS t(l, n)
                 WHERE l ->> 'href' = '/contact' LIMIT 1), 100000)
   ) x)
)
WHERE s."key" = 'navigation'
  AND s."published" IS NOT NULL
  AND jsonb_typeof(s."published" -> 'links') = 'array'
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(s."published" -> 'links') l WHERE l ->> 'href' = '/careers');
