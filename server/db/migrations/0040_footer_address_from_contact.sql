-- The footer's second address line now reads Settings › Contact
-- (contact.addressLine2); the footer's own copy (settings.footer.addressLine2)
-- is gone. Drop the stale key from the footer row only. Re-runnable.
UPDATE "settings" SET "draft" = "draft" - 'addressLine2'
WHERE "key" = 'footer' AND "draft" ? 'addressLine2';
--> statement-breakpoint
UPDATE "settings" SET "published" = "published" - 'addressLine2'
WHERE "key" = 'footer' AND "published" IS NOT NULL AND "published" ? 'addressLine2';
