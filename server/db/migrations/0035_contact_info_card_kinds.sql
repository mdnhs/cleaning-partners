-- settings.sections.contact.infoCards[] gains a required `kind` (phone, email,
-- address, hours, other): it picks the phone layout's Call/Email/Map action
-- instead of the card's position. Only cards without a kind get one: the
-- seeded titles map to their kind, any other card goes by position (0 phone,
-- 1 email, 2 address, else other). Draft, published and revisions; re-runnable.
CREATE OR REPLACE FUNCTION pg_temp.contact_card_kinds(cards jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(cards) = 'array' THEN (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN jsonb_typeof(card) <> 'object' OR card ? 'kind' THEN card
        ELSE card || jsonb_build_object('kind', CASE card->>'title'
          WHEN 'Phone' THEN 'phone'
          WHEN 'Email' THEN 'email'
          WHEN 'Location' THEN 'address'
          WHEN 'Office Hours' THEN 'hours'
          ELSE CASE ord WHEN 1 THEN 'phone' WHEN 2 THEN 'email' WHEN 3 THEN 'address' ELSE 'other' END
        END)
      END ORDER BY ord), '[]'::jsonb)
    FROM jsonb_array_elements(cards) WITH ORDINALITY AS t(card, ord)
  ) ELSE cards END
$$;
--> statement-breakpoint
UPDATE "settings"
SET "draft" = jsonb_set("draft", '{infoCards}', pg_temp.contact_card_kinds("draft"->'infoCards'))
WHERE "key" = 'sections.contact' AND jsonb_typeof("draft"->'infoCards') = 'array'
  AND pg_temp.contact_card_kinds("draft"->'infoCards') IS DISTINCT FROM "draft"->'infoCards';
--> statement-breakpoint
UPDATE "settings"
SET "published" = jsonb_set("published", '{infoCards}', pg_temp.contact_card_kinds("published"->'infoCards'))
WHERE "key" = 'sections.contact' AND "published" IS NOT NULL AND jsonb_typeof("published"->'infoCards') = 'array'
  AND pg_temp.contact_card_kinds("published"->'infoCards') IS DISTINCT FROM "published"->'infoCards';
--> statement-breakpoint
UPDATE "revisions"
SET "data" = jsonb_set("data", '{infoCards}', pg_temp.contact_card_kinds("data"->'infoCards'))
WHERE "entity_type" = 'settings' AND "entity_id" = 'sections.contact' AND jsonb_typeof("data"->'infoCards') = 'array'
  AND pg_temp.contact_card_kinds("data"->'infoCards') IS DISTINCT FROM "data"->'infoCards';
