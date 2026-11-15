-- The assistant no longer hands a chat over on its own (handoff) and a
-- failed answer no longer stops it. Open chats the bot handed over for
-- those reasons, that no person has taken, go back to the bot: their next
-- message gets an answer. Chats handed over at the reply cap stay with the
-- team. The alert stamp is cleared so a later hand-over alerts again.
UPDATE "chat_conversations" AS c
SET "needs_human" = false, "needs_human_alerted_at" = NULL
WHERE c."status" = 'open'
  AND c."needs_human" = true
  AND c."assigned_to" IS NULL
  AND c."ai_enabled" = true
  AND EXISTS (
    SELECT 1 FROM "chat_messages" m
    WHERE m."conversation_id" = c."id" AND m."notice_kind" IN ('handoff', 'failed')
  )
  AND NOT EXISTS (
    SELECT 1 FROM "chat_messages" m
    WHERE m."conversation_id" = c."id" AND m."notice_kind" = 'limit'
  );
