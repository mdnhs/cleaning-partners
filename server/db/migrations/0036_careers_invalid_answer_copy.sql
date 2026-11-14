-- pages.careers apply.errors gains a required `invalid`: the form's own copy
-- when the server refuses an answer (e.g. a choice no longer offered). Adds
-- the key only where it is missing, so an admin's value is kept. Draft,
-- published and revisions of page `careers`; re-runnable.
UPDATE "pages"
SET "draft" = jsonb_set("draft", '{apply,errors,invalid}', '"Please check this answer."'::jsonb)
WHERE "key" = 'careers' AND jsonb_typeof("draft"->'apply'->'errors') = 'object'
  AND NOT ("draft"->'apply'->'errors' ? 'invalid');
--> statement-breakpoint
UPDATE "pages"
SET "published" = jsonb_set("published", '{apply,errors,invalid}', '"Please check this answer."'::jsonb)
WHERE "key" = 'careers' AND "published" IS NOT NULL AND jsonb_typeof("published"->'apply'->'errors') = 'object'
  AND NOT ("published"->'apply'->'errors' ? 'invalid');
--> statement-breakpoint
UPDATE "revisions"
SET "data" = jsonb_set("data", '{apply,errors,invalid}', '"Please check this answer."'::jsonb)
WHERE "entity_type" = 'page' AND "entity_id" = 'careers' AND jsonb_typeof("data"->'apply'->'errors') = 'object'
  AND NOT ("data"->'apply'->'errors' ? 'invalid');
