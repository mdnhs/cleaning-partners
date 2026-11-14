-- The footer's staff sign-in link becomes editable (settings.footer.loginLink).
-- Backfill the previously hard-coded link only where the key is absent: an
-- explicit null means the admin hid it and stays null. Re-runnable.
UPDATE "settings" SET "draft" = "draft" || '{"loginLink":{"label":"Login","href":"/admin/sign-in"}}'::jsonb
WHERE "key" = 'footer' AND "draft" IS NOT NULL AND NOT ("draft" ? 'loginLink');
--> statement-breakpoint
UPDATE "settings" SET "published" = "published" || '{"loginLink":{"label":"Login","href":"/admin/sign-in"}}'::jsonb
WHERE "key" = 'footer' AND "published" IS NOT NULL AND NOT ("published" ? 'loginLink');
