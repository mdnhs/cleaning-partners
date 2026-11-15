-- SEO defaults gain an X handle, local-search details for the business
-- JSON-LD (price range, other areas, map pin, Google rating) and the
-- /llms.txt switch and summary. Public pages read the stored JSON as is, so
-- every stored copy (draft and published) gets the new keys with their
-- empty defaults; keys already there are kept.
UPDATE "settings"
SET "draft" = "draft"
  || jsonb_build_object(
    'twitterHandle', COALESCE("draft"->'twitterHandle', '""'::jsonb),
    'llms', '{"enabled":true,"summary":""}'::jsonb || COALESCE("draft"->'llms', '{}'::jsonb),
    'organization', '{"priceRange":"","otherAreas":[],"latitude":"","longitude":"","ratingValue":"","reviewCount":""}'::jsonb
      || COALESCE("draft"->'organization', '{}'::jsonb)
  )
WHERE "key" = 'seo.defaults' AND jsonb_typeof("draft") = 'object';
--> statement-breakpoint
UPDATE "settings"
SET "published" = "published"
  || jsonb_build_object(
    'twitterHandle', COALESCE("published"->'twitterHandle', '""'::jsonb),
    'llms', '{"enabled":true,"summary":""}'::jsonb || COALESCE("published"->'llms', '{}'::jsonb),
    'organization', '{"priceRange":"","otherAreas":[],"latitude":"","longitude":"","ratingValue":"","reviewCount":""}'::jsonb
      || COALESCE("published"->'organization', '{}'::jsonb)
  )
WHERE "key" = 'seo.defaults' AND jsonb_typeof("published") = 'object';
