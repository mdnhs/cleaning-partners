# Phase 9: Appearance, Design, AI assistant

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 9.1–9.3, plus every Changes item tagged 9 / 9.1 / 9.3). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (§6.1 Appearance + Design screens and the AI assistant, §4 anti-goals, B4 admin preset, B5 no default `<style>`, B6 no new env, §10 owner enters the AI credentials). Branch `feat/dynamic-platform`, phase base `49d230e`. Never push.

**Goal:** Give CP all of SP's Appearance, Design and AI assistant features:
- the theme stored as the versioned `theme` settings row, with its API (draft, publish, discard, reset to preset, restore), the published site theme applied to the public pages, and the draft shown to a verified previewer;
- the Appearance screen (Site and Admin tabs, preset gallery, colour fields, contrast panel with "Fix automatically", live admin preview, brand assets, history, autosave and conflict);
- the owner-only `/admin/design` component gallery;
- the AI assistant: Settings ▸ AI assistant, providers with an encrypted key, the role allow-list, read-only tools, the chat panel on ⌘J with Markdown replies, regenerate, edit and Insert, conversation history per user, and the owner-only "share enquiry details" switch;
- every Phase 4, 7 and 8 deferral tagged 9.

The seeded theme is the default, so the public site stays at 0 px: no `<style>`, no visible change. The seed has no `integrations.ai` row, so no request ever reaches an AI provider.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only (`git -C <sp> show 1a9f65d:<path>`). Port the final-state files. Rationale, skim, don't copy:
- SP `docs/superpowers/plans/2026-10-16-dynamic-platform/phase-09-ai.md`. Its "Corrections to master plan" 1–12 hold in CP: NDJSON stream, `/ai/status`, the default Claude model, impersonation read-only, 30 messages per 10 minutes, privacy, no chat audit rows, Insert on plain text fields only, ⌘J;
- mk-parity `phase-C-appearance-ai.md` (C1 engine, C2 storage and API, C3 runtime, C4 widgets, C5 screen, C6 AI settings fields, C7 settings page and discoverability, C8 tools and prompt, C9 Markdown, regenerate, edit and the context chip). Its Review Focus 1–5 apply here unchanged;
- mk-parity `phase-A-visual.md` Task A7 (`/admin/design`).

**What CP already has** (ported in earlier phases; don't port again):
- the whole pure engine `lib/theme/{admin,checks,color,cp-admin,css,derive,freeze,presets,schema,site,tokens}.ts` with CP base tables: `CP_SITE` (the 14 `app/globals.css` tokens), `CP_ADMIN_*`, `PRESET_IDS` with `cleaning-partners` first, `DEFAULT_THEME` on that preset, and its unit tests `tests/unit/theme/{admin,checks,color,css,presets,seed-parse}.test.ts` and `tests/unit/admin/admin-tokens.test.ts`;
- the admin runtime: `components/admin/theme/{admin-theme-style,admin-themed,default-mode}.tsx`, `components/admin/theme-provider.tsx`, `components/theme-provider.tsx`, the account theme preference, and their DOM tests;
- `server/modules/theme/queries.ts` (`getPublishedTheme`, `readThemeOrDefault`) and `tests/integration/queries/theme-queries.test.ts`;
- `components/site-themed.tsx`, used by all 9 public pages, with no theme style in it yet;
- migrations `0010_theme` (inserts the CP default theme), `0011_ai_settings` and `0019_ai_enquiry_details`, `server/db/schema/ai.ts` (`ai_conversations`, `ai_messages`), and the `theme: DEFAULT_THEME` seed fixture;
- `lib/schemas/integrations/ai.ts` (`aiConfig`, `AI_PROVIDERS`, `AI_CLAUDE_MODELS`, `AI_DEFAULT_MODEL`, `AI_DEFAULTS`, `aiShareEnquiryDetails`), `lib/ai/base-url.ts`, `server/lib/{ai-endpoints,ai-target}.ts`, the AI tester (`testAi`), the integrations service's share-switch gate (`nextShareEnquiryDetails`: owner 403, acknowledgement 422, retarget reset) and the AI fields in `integration-meta.ts`;
- the `appearance` and `ai` permissions, the nav items Appearance, Settings ▸ AI assistant and Design, the `appearance.*` activity labels, the `theme` revision allow-list rule, preview of `settings/theme` with `appearance:read`, and the `integrations.ai` → `/admin/settings/ai-assistant` redirect in `settings/integrations/[slug]/page.tsx`;
- the SchemaForm focused-field API (`FocusedTextField`, `onFieldFocus`, `insertableTextField`);
- the packages `ai@7.0.127`, `@ai-sdk/{anthropic,openai,google,openai-compatible}`, `culori@4.0.2` and `react-colorful@5.8.1` (ported in Task 1.1).

**SP files CP lacks** (from `git ls-tree` diffed against `git ls-files`). Each is placed in a task below, or excluded by R9-20:
- theme server and public: `server/modules/theme/{service,routes}.ts`, `lib/schemas/api/theme.ts`, `components/site-theme-style.tsx`;
- Appearance and Design: `app/(admin)/admin/(panel)/{appearance,design}/page.tsx`, `components/admin/appearance/*` (9 files), `components/admin/design/{showcase.tsx,sample-data.ts}`;
- AI: `app/(admin)/admin/(panel)/settings/ai-assistant/page.tsx`, `server/modules/ai/{clip,prompt,providers,redact,repo,routes,screen-context,service,tool-data,tools}.ts`, `lib/ai/{chat-stream,suggestion}.ts`, `lib/schemas/api/ai.ts`, `components/admin/ai/*` (11 files);
- tests: `tests/unit/ai/{chat-stream,clip,prompt,providers,redact,schemas,suggestion}.test.ts`, `tests/unit/admin/{ai-context,assistant-hotkey}.test.ts`, `tests/unit/theme/site-themed-pages.test.ts`, `tests/integration/api/{theme,ai,ai-settings,ai-tools}.test.ts`, `tests/integration/db/theme-migration.test.ts`, `tests/integration/theme/runtime.test.tsx`, `tests/dom/{appearance-view,appearance-widgets,design-showcase,ai-settings-view,assistant-context,assistant-panel,ai-chat-actions,ai-markdown}.test.tsx`, `tests/e2e/{appearance,design,ai-setup}.spec.ts`, `tests/e2e/ai-pins.ts`;
- cases CP dropped from files it has (restored here): the AI cases in `tests/e2e/admin-layout.spec.ts`, `tests/unit/admin/{shell-extras,page-guards,b3-panel-pages}.test.ts(x)`, `tests/dom/{integration-form,leads,help-view}.test.tsx`, and `tests/integration/api/dashboard.test.ts`.

## Global constraints for this phase

- The master Global Constraints apply in full, including Review Focus #1 (SP leftovers: the green palette, SP copy in the AI prompt, starters, pins and the design gallery) and #5 (public literals).
- **Public site at 0 px:** every `PUBLIC_URLS` entry at both viewports (visual 44/44). Task 3 touches `components/site-theme-style.tsx`, `components/site-themed.tsx` and `app/(site)/layout.tsx`, so it runs `pnpm test:visual` before committing. Every other task runs it at the gate.
- **Never update or add visual baselines.** The admin baselines for Appearance, Design and the assistant wait for 11.3 (R9-21).
- **No new env vars, no new dependencies, no new migration** (R9-18). `server/env.ts`, `package.json`, `pnpm-lock.yaml` and `server/db/migrations/` are unchanged at the gate.
- `next build` with no env and no DB keeps passing. Every new DB read sits after `await connection()` inside `<Suspense>`, in a route handler, or behind the Hono API. The AI SDK is imported only from `server/**`.
- `tests/unit/branding.test.ts` and `tests/unit/public-literals.test.ts` stay green on every task.
- **No test calls a real AI provider** (R9-17).
- Closure rule as in the earlier phases. List every closure file.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R9-1 Port SP's final state, CP deltas only.** Every file in the "lacks" list is SP's `1a9f65d` version with the branding map, CP content and the deltas below. SP's phase-09 corrections and mk-parity C rulings hold in CP unless a ruling here says otherwise. The engine files CP already has are not re-ported; a task edits them only where a ruling says so.

- **R9-2 B5: the default public theme emits no `<style>`.**
  - `components/site-theme-style.tsx` is SP's: `await connection()`, then `siteThemeCss(await getPreviewableSiteTheme())`, falling back to the published theme if the preview check throws. It returns `null` when the CSS is `""`, and on any error (fails closed).
  - It renders in two places, as in SP. Inside `SiteThemed` (`<style id="site-theme">`), so each page's content paints with its theme. And in the `SiteExtras` boundary of `app/(site)/layout.tsx` (`id="site-theme-extras"`), so the consent banner and the preview bar share the overrides. This closes the Phase 8 deferral "`SiteThemeStyle` in site-extras".
  - `siteThemeCss(DEFAULT_THEME.site)` is `""` (pinned by `css.test.ts`). The seeded `theme` row is `DEFAULT_THEME` (migration 0010 and the seed fixture). So the seeded public page has no `#site-theme`, no `#site-theme-extras` and no new `<style>`.
  - Proof, three layers:
    - `tests/integration/theme/runtime.test.tsx` renders `SiteThemeStyle` against the seeded DB to `""`, and a published brand change to `:root{--color-brand:…;--color-brand-deep:…;--color-brand-soft:…}`;
    - a new case in `tests/e2e/seo.spec.ts`: no `style#site-theme` or `style#site-theme-extras` on any `PUBLIC_URLS` body;
    - `pnpm test:visual` 44/44.
  - A published override changes only `--color-*` custom properties on `:root`. No public component's markup, classes or text changes.

- **R9-3 Equality tests.** These pin the default theme to the CSS that ships, so "default" and "today" can never drift apart.
  - `CP_ADMIN` ↔ `app/(admin)/admin/admin.css`: `tests/unit/admin/admin-tokens.test.ts` "admin palette = CP_ADMIN" already checks the light block, the dark overrides and all 48 tokens. Keep it unchanged.
  - Default site tokens ↔ `app/globals.css`: `tests/unit/theme/presets.test.ts` "CP_SITE equals app/globals.css @theme tokens" and "SITE_DEFAULT is CP_SITE" already check this. Keep both.
  - Close the chain end to end. Add these to `presets.test.ts` if they are absent:
    - `resolveSiteTokens(DEFAULT_THEME.site)` gives, per token, the hex declared in `globals.css`;
    - `buildAdminTokens(DEFAULT_THEME.admin, mode)` gives, for light and dark, the hex declared in `admin.css` (parsed the way `admin-tokens.test.ts` parses it).
  - `tests/integration/db/theme-migration.test.ts` (SP's, ported) asserts that the migrated row's `published` and `draft` deep-equal `DEFAULT_THEME`.

- **R9-4 `SITE_PAIRS`: white text on brand, plus the banner.** The Phase 2 note asks for white on `brand` (`components/ui/button.tsx` variant `brand`: `bg-brand text-white`).
  - **Problem.** Today's `#11b1d1` gives white text **2.55:1**, below even the 3:1 large-text minimum. The public colours are frozen (O5), and the default theme must pass `checkTheme`, or it could not be published and every preset test would fail.
  - **Ruling.** Add the pair with a floor at today's design, not at WCAG:
    - `["white", "brand", 2.5]`, where `BRAND_TEXT_FLOOR = 2.5` sits just under the default's 2.55;
    - `Min` widens to `2.5 | 3 | 4.5`;
    - `describeIssue` says "needs 2.5:1 (today's design)";
    - the text side accepts the fixed colour `"white"` (`WHITE` from `color.ts`); a pair's text is now `SiteToken | "white"`;
    - "Fix automatically" for this pair darkens `site.brand`, because white is fixed.
  - The default passes at 2.55. The five other presets' brands give 3.71–3.80. A brand paler than today's is blocked from publishing.
  - **Also add** the CP analogue of SP's consent-button pair. The banner draws white and `sky` on `navy-dark`, so add `["white", "navy-dark", 4.5]` and `["sky", "navy-dark", 4.5]` (today 11.01 and 7.99).
  - `checks.test.ts` "pins the SITE_PAIRS from the brief" gets the three new rows. Add a case that a brand of `#9fe3f0` fails the white pair and `fixAll` repairs it.
  - **Owner note for 11.5:** white on the frozen brand is 2.55:1, below WCAG AA. The design is frozen, so the floor only stops it getting worse. A deeper brand can be chosen in Appearance.

- **R9-5 Presets and the gallery.**
  - `PRESET_IDS` stays as already ported: `cleaning-partners`, `evergreen`, `ocean`, `plum`, `terracotta`, `graphite`. `PresetGallery` renders them in that order, so **Cleaning Partners is first** and is the default for both scopes. Its swatches are CP's colours: site brand `#11b1d1`, admin primary `#0a778d`.
  - SP's five other presets keep their ids, labels and admin primaries.
  - Their site brands are the CP-retuned values already in `presets.ts`. They are lightened so `navy-dark` on `brand-soft` clears 4.5:1, so each passes `SITE_PAIRS`, including R9-4, unmodified.
  - There is no `security-partners` preset. Every SP literal default (e.g. `useState<PresetId>("security-partners")` in `appearance-view.tsx`, the e2e's "Reset to preset → Security Partners") becomes `cleaning-partners` / "Cleaning Partners".
  - `presets.test.ts` "lists the six presets with Cleaning Partners first" already pins the order. `appearance-widgets.test.tsx` adds a case that the first gallery button is "Cleaning Partners" with `aria-pressed="true"` on the default.

- **R9-6 Theme storage, API, autosave, conflict and history: as SP.**
  - `server/modules/theme/service.ts` and `routes.ts` are SP's, mounted at `/appearance` in `server/api/app.ts` in SP's order. They provide:
    - `GET /`, `PUT /draft`, `POST /publish`, `/discard`, `/reset` and `/restore`, each checked in the order `zv` → `can()` → service;
    - the service re-checks the permission, writes the `VersionedStore` revision and audits `appearance.*`;
    - every mutation invalidates `tag.settings("theme")`.
  - **Publishing** is blocked server-side while `checkTheme` reports issues: 422 with `fieldErrors.draft`. A stale version gets 409 with `current`.
  - **Permissions:** owner and admin may do everything; editor, marketer and viewer read only.
  - `getPreviewableSiteTheme` comes back into `server/modules/theme/queries.ts`: the draft for a verified previewer (`isPreviewing()` from `server/modules/preview/guard.ts`), else the published theme. Remove the "Phase 9 restores" comment.
  - **Screen behaviour** is SP's C5:
    - autosave with a 1.5 s debounce, single flight;
    - status text: "Saving…", "Draft saved", "Unsaved changes", "Changed by someone else";
    - a 409 opens `ConflictDialog`;
    - `ThemeHistory` lists revisions from `GET /api/v1/admin/revisions/settings/theme`, with "Load into draft" (restore);
    - "Discard draft" and "Reset to preset…" (scope site, admin or both);
    - Publish is disabled while there are issues or no draft, and needs `appearance:publish`;
    - the screen is read-only for roles without `appearance:update`;
    - "Preview on site" flushes the draft, then opens `previewHref("settings","theme")`.
  - **Live recolouring.** Only the Appearance page recolours the admin live (`useLiveAdmin`). Leaving the page restores the published theme (mk-parity Review Focus 3). Pinned by the e2e.

- **R9-7 Design gallery, owner only.** `/admin/design` is SP's A7 Showcase: static `sample-data.ts`, no API calls. The page calls `requirePage("/admin/design")`, which needs `customCode:update`, so only the owner gets in; the others get `forbidden.tsx`. It is not in the menu; it's reached by URL or ⌘K.
  - `sample-data.ts` is rewritten with CP content: CP services (Commercial Cleaning, Medical Cleaning, Retail Cleaning, …), Irish names, `cleaningpartners.ie` addresses, and CP lead sources.
  - No SP service names ("Static Guarding", "Event Security"), and no SP palette.
  - The `account?tab=security` href stays: it is the account's Security tab, not branding.

- **R9-8 AI providers and keys: encrypted integration settings, no env vars.**
  - The provider, model, base URL and API key live only in the `integrations.ai` settings row, saved through Settings ▸ AI assistant.
  - `apiKey` is in `AI_SECRETS`. It is write-only (API responses carry `set: true/false`, never the value) and is encrypted with the app's HKDF key (`cp/v1` salt, Task 1.2).
  - Server code reads it only through `readIntegrationConfig`. It is never logged, returned, streamed, stored in a conversation or put in an error message (SP Task 2 failure test).
  - Changing the provider or the OpenAI-compatible base URL drops the stored key (already in the integrations service).
  - The OpenAI-compatible base URL is SSRF-guarded (`lib/ai/base-url.ts` when saved, `guardedFetch` per request). Both already exist.
  - No env var names a provider, model or key (B6). The owner enters the key after cut-over (spec §10).

- **R9-9 AI SDK and default model ids: keep SP's.**
  - The SDK is the Vercel AI SDK `ai@7.0.127` (`streamText`, `tool()`, `stepCountIs(5)`) with provider instances from `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` and `@ai-sdk/openai-compatible`. These are SP's pinned versions, already installed.
  - The model is always a provider instance (`createLanguageModel`), never a bare string, which would route through the Vercel AI Gateway.
  - **Models.** SP pins `AI_CLAUDE_MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"]`, with `AI_DEFAULT_MODEL = "claude-sonnet-5-5"`. CP already carries the same in `lib/schemas/integrations/ai.ts`. These are the current Claude 5 family (Sonnet 5.5, Opus 5.5, Haiku 5.5), so keeping SP's ids is also "latest". Nothing in the master overrides them. **Keep them unchanged.**
  - **Why Sonnet stays the default rather than Opus:** it is SP's choice (parity, O3), and it fits short-form copy, SEO lines and lead summaries at lower cost and latency. The owner can pick Opus 5.5 or Haiku 5.5 from the model list, or type any id.
  - `tests/unit/ai/schemas.test.ts` pins the list and the default.

- **R9-10 The prompt names Cleaning Partners, with no security wording.**
  - `ASSISTANT_RULES` opens: "You are the writing assistant in the admin panel of Cleaning Partners, a cleaning company in Ireland providing medical, commercial and domestic cleaning." Everything after that is SP's rules verbatim: en-IE, no invented facts, insertable text, the SEO line format, lead summaries, no claimed writes, and screen context treated as data.
  - The `siteName` fallback in `service.ts` is "Cleaning Partners". The live value comes from `settings.site`.
  - The empty-state starter "Draft a short introduction to our security services." becomes "Draft a short introduction to our cleaning services."
  - `tests/e2e/ai-pins.ts` `AI_REPLY` and the conversation titles are rewritten with CP copy, e.g. a hero line about cleaning in Co. Laois.
  - `tests/unit/ai/prompt.test.ts` adds:
    - the rules contain "Cleaning Partners";
    - no prompt text matches `/security|guard(ing)?\b/i`;
    - `buildSystemPrompt` with `siteName: "Cleaning Partners Ltd."` names it.

- **R9-11 Tools, RBAC and audit.**
  - **Who can use it.** `ai:use` belongs to every role except viewer. It is narrowed at runtime by `integrations.ai.allowedRoles` as a strict allow-list, as in SP: a role left out of the list, owner and admin included, is "not-allowed". The owner keeps the settings screen and so can always add a role back. (Controller amendment during Task 8, for SP parity.)
  - **What it reads.** The tools are SP's, read-only, run as the actor, and are offered only when the actor holds the permission. Each re-checks the permission when run:

    | Tool | Permission |
    |---|---|
    | `searchContent` | page, service or article read |
    | `getPage` | `page:read` |
    | `getService` | `service:read` |
    | `getArticle` | `article:read` |
    | `getSeoHealth` | `seo:read` |
    | `getDashboardSummary` | any signed-in user |
    | `getEnquiryStats` | `lead:read` |

  - **What it can't read.** No tool writes. None reads settings, integrations, users, sessions or the collections (team, clients, testimonials).
  - **Tool failures** reach the model as `TOOL_FAILED` only. Logs carry the tool and the error name, never the message, the input or the chat text.
  - **CP adaptations in `tool-data.ts`:**
    - `readPage` flattens CP template data;
    - `readService` reads CP's service fields (summary, tags, heroDescription, overview, included, places);
    - `readArticle` flattens the TipTap body through the CP renderer's plain text, so lead and checklist text survives;
    - search paths are `/services/<slug>` and `/blog/<slug>`, with admin hrefs under `/admin/blog` (B2).
  - **What it writes.** The assistant writes only its own conversations: `ai_conversations` and `ai_messages`, per user, with delete cascading. The Insert action is a client-side edit that the user saves or publishes. The rules text says the assistant can't save.
  - **Limits.** Impersonation is read-only (`readOnly: true`; chat and delete get 403). The rate limit is 30 messages per 10 minutes per user (429 `RATE_LIMITED`). The screen data size is capped.
  - **Audit** (SP correction 10): chat messages write no audit rows, because conversations are private and not content. Settings changes are audited as `integration.updated`. The share switch stamps `acknowledgedBy` and `acknowledgedAt`. Theme changes are audited as `appearance.*`.
  - **Privacy** (SP correction 9):
    - a conversation stores only `{ screen, entityType, entityId }`;
    - the record JSON and field value go to the provider per message and are never stored;
    - the lead context never includes email or phone, and `redact.ts` strips contact details typed into free text.

- **R9-12 The enquiry-details switch: owner-only, off by default.**
  - `AI_DEFAULTS.shareEnquiryDetails` is `{ enabled: false, acknowledgedBy: null, acknowledgedAt: null }`, and migrations 0011 and 0019 backfill it as off.
  - **Turning it on** needs `owner:manage` (otherwise 403) and `acknowledge: true` (otherwise 422 "Confirm the acknowledgement first").
  - **Turning it off** clears the stamp. A provider or base-URL change resets it to off unless an owner re-acknowledges in the same save.
  - The server side already exists. Phase 9 adds the screen and SP's tests:
    - **UI:** the fieldset (switch plus acknowledgement checkbox) renders only for owners.
    - **Integration tests** (`ai-settings.test.ts`):
      - an admin gets 403;
      - an owner without the acknowledgement gets 422;
      - an owner with it is stored with `acknowledgedBy`;
      - a fresh DB reads off;
      - a retarget resets it.
    - **Tool tests** (`ai-tools.test.ts`, Review Focus 4):
      - with the switch off, `getEnquiryStats` output has no `@`, no digit run of 7 or more, and no seeded lead name;
      - with it on, it has recent names but never an email or phone.
  - **OWNER MUST CONFIRM** (record for 11.5 `docs/launch.md`): with the switch on, enquiry names and text go to the chosen AI provider, which becomes a GDPR processor.

- **R9-13 Chat panel and ⌘J.**
  - **The button.** `AssistantButton` sits in the topbar between the search pill and the mail and bell buttons. It is visible when `available || canManage` (mk-parity C7). On the seeded DB an owner sees it and opens a set-up empty state with "Set up AI assistant"; an editor sees nothing.
  - **The panel** is a right `Sheet`. It has:
    - a `role="log"` conversation with `aria-live="polite"`;
    - Markdown replies that never use `dangerouslySetInnerHTML`, where `safeHref` allows https, mailto and relative non-`/api` links (Review Focus 5);
    - Regenerate on the last reply, and Edit-and-resend on user messages;
    - the "Using: {screen}" chip with "Don't send this screen";
    - starter prompts and history.
  - **Insert** targets plain text and textarea fields only (SP correction 11). It closes the panel and returns focus to the field, with Undo in the toast.
  - **⌘J / Ctrl+J** toggles the panel (`use-assistant-hotkey.ts`); ⌘K stays the palette. The Help shortcuts list gets SP's "⌘J / Ctrl J — AI assistant" row back.
  - **`elementId`** is the focused input's DOM id, as in SP. In the page editors that is `sf-<path>` (`hero.heading` → `sf-hero-heading`); in the SEO panel it is `seo-<kind>-<id>-<field>`.
    - The CP deviation `sf-<path>-card` names **section cards** only. It exists so a card's `-title` and `-description` ids can't collide with a CP field called `title`.
    - Phase 9 anchors no section card. Any code that ever scrolls to a section must use `sf-<path>-card`.
    - `assistant-panel.test.tsx` adds a CP case: in a section with a `title` field, the field's `elementId` (`sf-hero-title`) resolves to the `<input>`, not to the card, and Insert returns focus to it.

- **R9-14 Screen hooks** (Phase 4, 7 and 8 deferrals).
  - **`versioned-editor.tsx`:** SP's `useAssistantScreen({ title, entityType, entityId, record: draft })` and `onFieldFocus` → `assistant.setField(...)`. Here `apply` calls `markTouched()`, so an insert autosaves like typing. It is passed to `SchemaForm` only when `canEdit`.
  - **`lead-detail.tsx`:** `useAssistantScreen(lead.data ? leadAssistantScreen(lead.data) : null)`, replacing the `9.3:` marker. The screen sends the lead id only; the server decides what the model sees.
  - **SeoPanel (CP addition; the one named behavioural difference from SP this phase).** SP's SeoPanel has no assistant hook: SP's SEO help is the "Suggest an SEO title and description for …" starter, plus the record's SEO in the `getPage`/`getService`/`getArticle` tools and `getSeoHealth`.
    - The master Changes (Phase 8 outcome) list "AI suggest hooks in SeoPanel" as 9.3 work, so CP adds them.
    - `SeoPanel` gets an optional `onFieldFocus` prop, which `VersionedEditor` fills for its `seo` slot. Insert then works on the SEO title and description.
    - Its `apply` sets the panel's own draft (dirty), and the user clicks "Save SEO". Per-record SEO is unversioned, so there is no autosave (R8-1).
    - Pinned by a `seo-panel.test.tsx` DOM case.
  - **Dashboard Next-up `"ai"`:** for `integration:update` holders while the status reason is `off` or `unconfigured`. It reads "Turn on the AI assistant" and links to `/admin/settings/ai-assistant`. Remove the marker in `server/modules/dashboard/service.ts`.
    - The `it.todo` at `tests/integration/api/dashboard.test.ts:345` becomes SP's case "offers managers to turn on the AI assistant until it is on".

- **R9-15 Status plumbing** (Phase 7 deferrals).
  - `server/lib/admin-shell-extras.ts` takes back `assistant: AiStatusDto | undefined` and `getAiStatus(actor).catch(degraded("AI status", undefined))`. The panel layout passes `extras.assistant` to `AdminShell` → `Topbar` → `AssistantButton`.
  - `tests/unit/admin/shell-extras.test.ts` gets SP's AI status case back, and the degrade case expects 3 `console.error` calls.
  - `integration-form.tsx` invalidates `AI_STATUS_KEY` (`["ai","status"]`) after a save and after a disconnect, at the two `9.3:` markers. `tests/dom/integration-form.test.tsx` gets SP's "refreshes the AI assistant status" block back.
  - **Redirect:** `/admin/settings/integrations/ai` redirects to `/admin/settings/ai-assistant`, which now exists (it returned 404 until this phase). An e2e follows the redirect and finds the "AI assistant" heading.
  - `tests/unit/admin/{page-guards,b3-panel-pages}.test.ts(x)` get SP's rows back:
    - `appearance/page.tsx` → `appearance:read`;
    - `design/page.tsx` → `customCode:update`;
    - `settings/ai-assistant/page.tsx` → `integration:read`.

- **R9-16 Settings ▸ AI assistant screen.** `AiSettingsView` is SP's C7 form over `integrations.ai`. Its fields, in order:
  - Enabled;
  - Provider;
  - Base URL (OpenAI-compatible only);
  - API key (Keep / Replace / Remove);
  - Model, with "List models" (`POST /ai/models`, `integration:update`, 10 per minute);
  - Who can use it (owner and admin checked and disabled);
  - Extra instructions (/2000);
  - Longest answer (64–8192);
  - the owner-only enquiry-details fieldset;
  - Test (disabled while dirty).

  It is read-only while impersonating. The copy is SP's minus SP names; the model placeholder is `claude-sonnet-5-5`.

- **R9-17 No real AI providers in tests.**
  - **Unit and integration:** `vi.mock("@/server/modules/ai/providers")` makes `createLanguageModel` return `MockLanguageModelV4` (from `ai/test`) with `simulateReadableStream`, scripting text, tool calls and errors as SP's tests do.
  - **The test-connection and list-models paths** use the injected `fetch` / `deps.fetch` with canned responses.
  - **E2e:** `tests/e2e/ai-pins.ts` routes `/api/v1/admin/ai/status`, `/ai/chat` (pinned NDJSON) and `/ai/conversations*`. No request leaves the test server. `ai-setup.spec.ts` needs no provider at all.
  - There is no live-provider e2e (SP correction 12). A manual smoke with a real key is optional and owner-side.
  - **A guard test** in `tests/unit/ai/providers.test.ts` asserts that no file under `tests/` imports `@ai-sdk/*`. Tests import only `ai/test` (`MockLanguageModelV4`) and `ai` helpers (`simulateReadableStream`, `APICallError`, `RetryError`), as SP's do. `providers.test.ts` builds instances through `createLanguageModel` and never reaches the network.

- **R9-18 No new env vars, deps or migrations.**
  - The AI packages, `culori` and `react-colorful` are already installed.
  - The theme row and the AI settings fields are already migrated (0010, 0011, 0019). If a task finds it needs a migration, it is `0025` and it **stops and reports** first.
  - `server/env.ts`, `package.json` and `pnpm-lock.yaml` are unchanged.

- **R9-19 Branding.**
  - Rename everything SP-prefixed to CP. The admin theme storage key is already `cp-admin-theme`; the DefaultMode marker is `cp-admin-theme-auto`.
  - The prompt, starters, pins, sample data, settings copy and the Design gallery name Cleaning Partners only.
  - Articles are "Blog" at `/admin/blog` (B2), in tool hrefs and in sample data.
  - Fixtures use CP values: no `sp`-shaped names, hosts or folders.

- **R9-20 Not ported.**
  - `tests/e2e/admin-a11y.spec.ts` and `tests/visual/admin-screens.spec.ts`, with SP's admin AI and Appearance baselines (11.3).
  - `tests/e2e/roles.spec.ts` (11.3; its Appearance and AI rows come with it).
  - `lib/admin/legacy-redirects.ts` and its tests (R8-17).

- **R9-21 Deferrals out of this phase.**
  - **10.3:** `/p/[slug]` renders inside `SiteThemed` (`site-themed-pages.test.ts` then covers 10 pages).
  - **10.4:** if the builder editor mounts `VersionedEditor`, it inherits the assistant hooks. Otherwise it adds `useAssistantScreen` with `entityType: "builder"`, and `screen-context.ts` treats builder pages as site copy.
  - **11.1:** `secrets:rotate` re-encrypts `integrations.ai.apiKey` (already listed for rotate.ts).
  - **11.3:**
    - admin visual baselines for Appearance (light and dark), Design, and the assistant (empty, history, reply), using `ai-pins.ts`;
    - admin a11y URLs for `/admin/appearance`, `/admin/design` and `/admin/settings/ai-assistant`;
    - `roles.spec.ts`.
  - **11.5:**
    - `docs/launch.md` OWNER MUST CONFIRM: enquiry details to the AI provider (R9-12);
    - the white-on-brand contrast note (R9-4);
    - the runbook section "AI assistant" (provider key in Settings, no env, Test connection, the switch).

  The controller records these in the master Changes at phase end.

---

### Task 1: CP contrast pairs and the equality chain (master 9.1 part 1, Phase 2 deferral; R9-3, R9-4)

**Files:** `lib/theme/checks.ts` (`Min`, the `"white"` text side, `BRAND_TEXT_FLOOR`, the three new `SITE_PAIRS`, `describeIssue`, `fixIssue` for a fixed text colour), `lib/theme/color.ts` only if `WHITE` needs exporting differently.

**Tests:**
- `tests/unit/theme/checks.test.ts`: the pinned list, default passes, every preset passes, a pale brand fails the white pair and `fixAll` repairs it;
- `tests/unit/theme/presets.test.ts`: the two R9-3 chain cases, added if absent;
- `tests/unit/analytics/banner-preview-style.test.ts` stays green.

**Commit:** `feat: add cp contrast pairs to theme checks`

---

### Task 2: Theme API and previewable site theme (master 9.1 storage; R9-6)

**Files:** `lib/schemas/api/theme.ts`, `server/modules/theme/{service,routes}.ts`, `server/modules/theme/queries.ts` (`getPreviewableSiteTheme`, comment removed), `server/api/app.ts` (`.route("/appearance", themeRoutes)` in SP's position), and `lib/api-client.ts` types if the route type needs it.

**Tests:**
- `tests/integration/api/theme.test.ts` (SP's, CP values):
  - draft → publish bumps the version, writes a revision and the `appearance.publish` audit;
  - a stale version → 409 with `current`;
  - a contrast failure blocks publish (422 `fieldErrors.draft`), including R9-4's white pair;
  - the colour injection `red;}body{` → 422;
  - reset the admin scope to `evergreen` keeps the site;
  - the role matrix: marketer reads and gets 403 on save, viewer reads, author gets 403 on GET.
- `tests/integration/db/theme-migration.test.ts`.
- `tests/integration/queries/theme-queries.test.ts`: `getPreviewableSiteTheme` returns the draft for a previewer and the published theme otherwise.

**Commit:** `feat: add appearance theme api`

---

### Task 3: Public site theme runtime (master 9.1 runtime, Phase 8 deferral; R9-2)

**Files:** `components/site-theme-style.tsx` (port), `components/site-themed.tsx` (`<SiteThemeStyle />` inside the boundary, comment updated), `app/(site)/layout.tsx` (`<SiteThemeStyle id="site-theme-extras" />` in the `SiteExtras` Suspense, as SP).

**Tests:**
- `tests/integration/theme/runtime.test.tsx`: seeded → `""`; published brand → the `:root` override; admin default → no `theme-tokens`.
- `tests/unit/theme/site-themed-pages.test.ts`: CP has no catch-all, so drop SP's exempt entry; expect at least 9 pages.
- The R9-2 e2e case in `tests/e2e/seo.spec.ts`.
- `public-literals` green.
- `env -u … pnpm build` and `pnpm test:visual` 44/44.

**Commit:** `feat: apply published site theme with no default style`

---

### Task 4: Appearance widgets (master 9.2 part 1; R9-5)

**Files:** `components/admin/appearance/{preset-gallery,colour-field,contrast-panel,admin-preview,use-live-admin}.tsx`.

**Tests:** `tests/dom/appearance-widgets.test.tsx`, SP's cases plus R9-5's "Cleaning Partners first and pressed by default" case and a ContrastPanel row for the white-on-brand pair.

**Commit:** `feat: add appearance widgets`

---

### Task 5: Appearance screen (master 9.2 part 2; R9-5, R9-6)

**Files:** `app/(admin)/admin/(panel)/appearance/page.tsx` and `components/admin/appearance/{appearance-view,brand-assets,theme-history,use-theme-autosave}.tsx`, with `cleaning-partners` defaults.

**Tests:**
- DOM: `tests/dom/appearance-view.test.tsx` covers autosave debounce, 409 → `ConflictDialog`, history "Load into draft", read-only for a marketer, and Publish disabled while there are issues.
- e2e: `tests/e2e/appearance.spec.ts`:
  - owner publishes the Evergreen admin preset → `style#theme-tokens` on `/admin` → Reset to preset "Cleaning Partners" and publish → no `style#theme-tokens`;
  - marketer read-only;
  - a site draft preview shows `#site-theme` for the previewer while a fresh context sees none.
  - The spec restores the default theme in `finally`.
- Take screenshots and look at them. Don't save baselines.

**Commit:** `feat: add appearance screen`

---

### Task 6: Design gallery (master 9.2 part 3; R9-7)

**Files:** `app/(admin)/admin/(panel)/design/page.tsx`, `components/admin/design/{showcase.tsx,sample-data.ts}` (CP sample data), `tests/unit/admin/page-guards.test.ts` (the `appearance` and `design` rows).

**Tests:** `tests/dom/design-showcase.test.tsx`; e2e `tests/e2e/design.spec.ts` (owner sees "Design system", editor gets forbidden); and a branding grep over `components/admin/design` (R9-19). Take screenshots.

**Commit:** `feat: add design gallery`

---

### Task 7: AI core: schemas, stream, prompt, providers (master 9.3 part 1; R9-9, R9-10)

**Files:** `lib/schemas/api/ai.ts`, `lib/ai/{chat-stream,suggestion}.ts`, `server/modules/ai/{providers,prompt,clip,redact}.ts` (CP prompt opening and fallback per R9-10).

**Tests:** `tests/unit/ai/{schemas,chat-stream,suggestion,prompt,providers,clip,redact}.test.ts`, with the R9-9 model pin, the R9-10 CP cases and the R9-17 import guard.

**Commit:** `feat: add ai schemas, stream format and cp prompt`

---

### Task 8: AI module: status, chat, conversations, tools (master 9.3 part 2; R9-8, R9-11, R9-12, R9-17)

**Files:** `server/modules/ai/{repo,service,routes,screen-context,tool-data,tools}.ts` (CP adaptations in `tool-data.ts`), and `server/api/app.ts` (`.route("/ai", aiRoutes)`). The routes are:
- `GET /status`;
- `POST /chat`, streamed as NDJSON;
- `GET /conversations`, `GET /conversations/:id` and `DELETE /conversations/:id`;
- `POST /models`.

**Tests:**
- `tests/integration/api/ai.test.ts` (SP's, with `MockLanguageModelV4`):
  - the stream events in order;
  - the history sent and persisted per user, another user's conversation 404, delete cascades;
  - disabled → 404, the role allow-list, impersonation 403;
  - the rate limit 429;
  - the key never appears in the stream, the logs or the response;
  - regenerate and edit;
  - the test connection asks for `claude-sonnet-5-5` via the injected fetch.
- `tests/integration/api/ai-tools.test.ts`: tool gating per role, the PII cases (R9-12), `TOOL_FAILED`, stop after 5 steps, and `/admin/blog` hrefs.
- `tests/integration/api/ai-settings.test.ts` (R9-12 cases, provider change drops the key, `maxOutputTokens` 9000 → 422, the 0011 backfill).

**Commit:** `feat: add ai assistant api and read-only tools`

---

### Task 9: Settings ▸ AI assistant and status refresh (master 9.3 part 3, Phase 7 deferrals; R9-12, R9-15, R9-16)

**Files:**
- `app/(admin)/admin/(panel)/settings/ai-assistant/page.tsx` and `components/admin/ai/{ai-settings-view,queries}.tsx|ts` (`AI_STATUS_KEY`);
- `components/admin/integrations/integration-form.tsx` (the two invalidations; markers removed);
- `server/modules/dashboard/service.ts` (Next-up `"ai"`; marker removed);
- `tests/unit/admin/b3-panel-pages.test.tsx` (ai-assistant page rows).

**Tests:**
- DOM:
  - `tests/dom/ai-settings-view.test.tsx` (admin doesn't see the enquiry fieldset, owner does; Test disabled while dirty; Base URL only for openai-compatible);
  - the restored `integration-form.test.tsx` block.
- Integration: `dashboard.test.ts`, the `it.todo` replaced (R9-14).
- e2e: in `tests/e2e/integrations.spec.ts`, `/admin/settings/integrations/ai` lands on `/admin/settings/ai-assistant` (R9-15).

**Commit:** `feat: add ai assistant settings screen`

---

### Task 10: Assistant panel, button and ⌘J (master 9.3 part 4; R9-13, R9-15)

**Files:**
- `components/admin/ai/{assistant-context,chat-context,screens,use-assistant-chat,use-assistant-hotkey,assistant-button,assistant-panel,message-list,markdown}.tsx|ts`;
- `components/admin/shell/{admin-shell,topbar}.tsx` (`AssistantProvider`, `AssistantButton`);
- `server/lib/admin-shell-extras.ts` (`assistant`; markers removed);
- `app/(admin)/admin/(panel)/layout.tsx` (pass `extras.assistant`);
- `components/admin/help/help-view.tsx` (the ⌘J row).

**Tests:**
- unit: `tests/unit/admin/{ai-context,assistant-hotkey,shell-extras}.test.ts`;
- DOM: `tests/dom/{assistant-panel,ai-chat-actions,ai-markdown,help-view}.test.tsx` (R9-13's `elementId` case; Markdown hostile input);
- e2e:
  - `tests/e2e/ai-pins.ts` (CP copy);
  - `tests/e2e/ai-setup.spec.ts` (owner sparkle → "Set up AI assistant" → the settings page; editor sees no button);
  - the AI cases restored in `tests/e2e/admin-layout.spec.ts` (topbar fits at 1024 px with the AI button).

**Commit:** `feat: add assistant panel and shortcut`

---

### Task 11: Assistant screen hooks (master 9.3 part 5, Phase 4/7/8 deferrals; R9-14)

**Files:**
- `components/admin/editor/versioned-editor.tsx` (`useAssistantScreen`, `onFieldFocus`, and the `seo` slot receiving it);
- `components/admin/seo/seo-panel.tsx` (optional `onFieldFocus`, applied to the panel draft);
- `components/admin/leads/lead-detail.tsx` (marker replaced);
- `lib/auth/permissions.ts` (reword the "(Phase 9)" comment).

**Tests:**
- DOM:
  - `tests/dom/assistant-context.test.tsx` (SP's, ported here because it renders the editor): "registers the live draft; Insert autosaves like typing; unmount clears";
  - Insert into the SEO title marks the SEO panel dirty and does not autosave;
  - the restored "lead shared with the assistant" cases in `tests/dom/leads.test.tsx` (marker removed): only the id is sent, and no email or phone.
- e2e: with `ai-pins`, open `/admin/pages/home`, focus the hero heading, ⌘J, Insert the pinned reply → the draft autosaves.

**Commit:** `feat: connect editors and leads to the assistant`

---

## Deferral map (self-review)

| Master item | Task |
|---|---|
| 9.1 default emits no `<style>` (B5) | 3 (R9-2), proven by the runtime test, the e2e and visual 44/44 |
| 9.1 equality `CP_ADMIN` ↔ admin.css, site defaults ↔ globals.css | 1 (R9-3) |
| Phase 2: `SITE_PAIRS` includes white on brand | 1 (R9-4) |
| Phase 8: `SiteThemeStyle` in site-extras | 3 |
| 9.1 storage | 2 |
| 9.2 preset gallery `cleaning-partners` first | 4, 5 (R9-5) |
| 9.2 autosave, conflict, history as SP | 5 (R9-6) |
| 9.2 Design screen | 6 |
| 9.3 SP's tests pass | 7–11 |
| 9.3 prompt names Cleaning Partners | 7 (R9-10) |
| 9.3 enquiry switch owner-only, off by default | 8, 9 (R9-12) |
| Phase 4: AI hooks in versioned-editor | 11 |
| Phase 4: ⌘J | 10 |
| Phase 4 / Phase 8: AI Next-up and the `dashboard.test.ts:345` `it.todo` | 9 |
| Phase 8: SeoPanel suggest hooks, `elementId` with `sf-<path>-card` | 11 (hook), 10 (`elementId` case) (R9-13, R9-14) |
| Phase 7: `useAssistantScreen` in lead-detail, plus the leads DOM cases | 11 |
| Phase 7: `AI_STATUS_KEY` invalidations | 9 |
| Phase 7: `getAiStatus` in shell extras, plus the test | 10 |
| Phase 7: owner-only share switch | 8 (API tests), 9 (UI) |
| Phase 7: `integrations.ai` redirect 404 until 9.3 | 9 |

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```

Also confirm the gate's checks:
- `git grep -n -E "// 9\.[0-9]:|Phase 9|\(9\.3\)" -- ':!docs' ':!server/db/migrations'` finds no deferral marker. Comments citing R9 rulings are fine; list any that are left.
- `git grep -n "it.todo" -- tests` lists no 9.x todo.
- `git grep -n -E "Security Partners|security services|Static Guarding|Event Security|security-partners" -- components/admin/ai components/admin/appearance components/admin/design server/modules/ai server/modules/theme lib/ai tests/e2e/ai-pins.ts tests/e2e/appearance.spec.ts` is empty.
- `git diff 49d230e -- docs/brief-inventory.json` is empty (the inventory is frozen).
- `git diff 49d230e -- tests/visual/__screenshots__` is empty (no baseline added or changed).
- `git diff 49d230e -- server/env.ts package.json pnpm-lock.yaml server/db/migrations` is empty (no env, deps or migration).
- `git grep -n "@ai-sdk/" -- tests` is empty (R9-17).
- The report states:
  - the one SP behavioural difference (the SeoPanel Insert hook, R9-14);
  - the white-on-brand floor (R9-4);
  - the OWNER MUST CONFIRM item (R9-12).

  Cut-over still waits for 10–11 and the owner (B11).
