-- Settings › Contact gains recruitmentEmail, backfilled from the careers
-- page's seeded email (else the main email); the careers page's seeded phone
-- and email links become {mobile}/{mobileHref}/{recruitmentEmail} placeholders
-- so they follow Settings › Contact. A link the admin changed is left alone
-- (exact match of the seeded link only). Re-runnable.
UPDATE "settings" s
SET "draft" = jsonb_set(s."draft", '{recruitmentEmail}', to_jsonb(COALESCE(
  (SELECT p."draft" #>> '{job,email,label}' FROM "pages" p
   WHERE p."key" = 'careers' AND p."draft" #>> '{job,email,label}' ~ '^[^@{}\s]+@[^@{}\s]+$'),
  s."draft" ->> 'email')))
WHERE s."key" = 'contact'
  AND s."draft" IS NOT NULL
  AND jsonb_typeof(s."draft") = 'object'
  AND NOT (s."draft" ? 'recruitmentEmail')
  AND COALESCE(
  (SELECT p."draft" #>> '{job,email,label}' FROM "pages" p
   WHERE p."key" = 'careers' AND p."draft" #>> '{job,email,label}' ~ '^[^@{}\s]+@[^@{}\s]+$'),
  s."draft" ->> 'email') IS NOT NULL;
--> statement-breakpoint
UPDATE "settings" s
SET "published" = jsonb_set(s."published", '{recruitmentEmail}', to_jsonb(COALESCE(
  (SELECT p."published" #>> '{job,email,label}' FROM "pages" p
   WHERE p."key" = 'careers' AND p."published" #>> '{job,email,label}' ~ '^[^@{}\s]+@[^@{}\s]+$'),
  s."published" ->> 'email')))
WHERE s."key" = 'contact'
  AND s."published" IS NOT NULL
  AND jsonb_typeof(s."published") = 'object'
  AND NOT (s."published" ? 'recruitmentEmail')
  AND COALESCE(
  (SELECT p."published" #>> '{job,email,label}' FROM "pages" p
   WHERE p."key" = 'careers' AND p."published" #>> '{job,email,label}' ~ '^[^@{}\s]+@[^@{}\s]+$'),
  s."published" ->> 'email') IS NOT NULL;
--> statement-breakpoint
UPDATE "pages" SET "draft" = jsonb_set("draft", '{talentPool,call}', '{"label":"Call {mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "draft" #> '{talentPool,call}' = '{"label":"Call (085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "draft" = jsonb_set("draft", '{job,phone}', '{"label":"{mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "draft" #> '{job,phone}' = '{"label":"(085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "draft" = jsonb_set("draft", '{job,email}', '{"label":"{recruitmentEmail}","href":"mailto:{recruitmentEmail}"}'::jsonb)
WHERE "key" = 'careers' AND "draft" #> '{job,email}' = '{"label":"jobs@cleaningpartners.ie","href":"mailto:jobs@cleaningpartners.ie"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "draft" = jsonb_set("draft", '{apply,sidebar,phone}', '{"label":"{mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "draft" #> '{apply,sidebar,phone}' = '{"label":"(085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "draft" = jsonb_set("draft", '{apply,sidebar,email}', '{"label":"{recruitmentEmail}","href":"mailto:{recruitmentEmail}"}'::jsonb)
WHERE "key" = 'careers' AND "draft" #> '{apply,sidebar,email}' = '{"label":"jobs@cleaningpartners.ie","href":"mailto:jobs@cleaningpartners.ie"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{talentPool,call}', '{"label":"Call {mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "published" #> '{talentPool,call}' = '{"label":"Call (085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{job,phone}', '{"label":"{mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "published" #> '{job,phone}' = '{"label":"(085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{job,email}', '{"label":"{recruitmentEmail}","href":"mailto:{recruitmentEmail}"}'::jsonb)
WHERE "key" = 'careers' AND "published" #> '{job,email}' = '{"label":"jobs@cleaningpartners.ie","href":"mailto:jobs@cleaningpartners.ie"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{apply,sidebar,phone}', '{"label":"{mobile}","href":"{mobileHref}"}'::jsonb)
WHERE "key" = 'careers' AND "published" #> '{apply,sidebar,phone}' = '{"label":"(085) 806 2369","href":"tel:+353858062369"}'::jsonb;
--> statement-breakpoint
UPDATE "pages" SET "published" = jsonb_set("published", '{apply,sidebar,email}', '{"label":"{recruitmentEmail}","href":"mailto:{recruitmentEmail}"}'::jsonb)
WHERE "key" = 'careers' AND "published" #> '{apply,sidebar,email}' = '{"label":"jobs@cleaningpartners.ie","href":"mailto:jobs@cleaningpartners.ie"}'::jsonb;
