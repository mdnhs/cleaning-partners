-- The services page's seeded office hours become the {hours} placeholder so
-- they follow Settings › Contact. A value the admin changed is left alone
-- (exact match of the seeded text only). Re-runnable.
UPDATE "pages" SET "draft" = jsonb_set("draft", '{detail,officeHours,hours}', '"{hours}"'::jsonb)
WHERE "key" = 'services' AND "draft" #> '{detail,officeHours,hours}' = '"Mon – Fri: 9am – 6pm"'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{detail,officeHours,hours}', '"{hours}"'::jsonb)
WHERE "key" = 'services' AND "published" #> '{detail,officeHours,hours}' = '"Mon – Fri: 9am – 6pm"'::jsonb;
