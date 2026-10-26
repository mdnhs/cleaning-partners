-- Phase 7: quote form posts to the leads API (pages.contact.quoteForm).
-- Adds the sending/error/rate-limit copy where missing (values the owner
-- already set win: they are on the right of ||) and replaces sentMessage only
-- while it is still the old mailto seed.
UPDATE "pages"
SET
  "draft" = jsonb_set("draft", '{quoteForm}', '{"sendingLabel":"Sending…","errorMessage":"Something went wrong. Please try again, or call us.","rateLimitedMessage":"Too many attempts. Please try again in a few minutes."}'::jsonb || ("draft" -> 'quoteForm') || CASE WHEN "draft" #>> '{quoteForm,sentMessage}' = 'Your email app should open with your request. If it doesn''t, email us at {email}.' THEN jsonb_build_object('sentMessage', 'Thanks, we''ve received your request and will be in touch shortly. You can also email us at {email}.'::text) ELSE '{}'::jsonb END),
  "published" = CASE
    WHEN jsonb_typeof("published" -> 'quoteForm') = 'object'
    THEN jsonb_set("published", '{quoteForm}', '{"sendingLabel":"Sending…","errorMessage":"Something went wrong. Please try again, or call us.","rateLimitedMessage":"Too many attempts. Please try again in a few minutes."}'::jsonb || ("published" -> 'quoteForm') || CASE WHEN "published" #>> '{quoteForm,sentMessage}' = 'Your email app should open with your request. If it doesn''t, email us at {email}.' THEN jsonb_build_object('sentMessage', 'Thanks, we''ve received your request and will be in touch shortly. You can also email us at {email}.'::text) ELSE '{}'::jsonb END)
    ELSE "published"
  END
WHERE "key" = 'contact' AND jsonb_typeof("draft" -> 'quoteForm') = 'object';
--> statement-breakpoint
UPDATE "revisions"
SET "data" = jsonb_set("data", '{quoteForm}', '{"sendingLabel":"Sending…","errorMessage":"Something went wrong. Please try again, or call us.","rateLimitedMessage":"Too many attempts. Please try again in a few minutes."}'::jsonb || ("data" -> 'quoteForm') || CASE WHEN "data" #>> '{quoteForm,sentMessage}' = 'Your email app should open with your request. If it doesn''t, email us at {email}.' THEN jsonb_build_object('sentMessage', 'Thanks, we''ve received your request and will be in touch shortly. You can also email us at {email}.'::text) ELSE '{}'::jsonb END)
WHERE "entity_type" = 'page' AND "entity_id" = 'contact' AND jsonb_typeof("data" -> 'quoteForm') = 'object';
