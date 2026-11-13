-- The 404 page reads its copy from settings.microcopy.notFound. Backfill the
-- seeded copy only where the key is absent, so copy the admin already set
-- stays. Re-runnable.
UPDATE "settings" SET "draft" = jsonb_set("draft", '{notFound}', '{"crumb":"Not found","title":"Page not found","description":"The page you are looking for has moved or no longer exists.","homeLabel":"Back to home"}'::jsonb)
WHERE "key" = 'microcopy' AND NOT ("draft" ? 'notFound');
--> statement-breakpoint
UPDATE "settings" SET "published" = jsonb_set("published", '{notFound}', '{"crumb":"Not found","title":"Page not found","description":"The page you are looking for has moved or no longer exists.","homeLabel":"Back to home"}'::jsonb)
WHERE "key" = 'microcopy' AND "published" IS NOT NULL AND NOT ("published" ? 'notFound');
