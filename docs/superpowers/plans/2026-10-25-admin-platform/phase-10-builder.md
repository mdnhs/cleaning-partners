# Phase 10: Page builder

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Part of `docs/superpowers/plans/2026-10-25-admin-platform.md` (master, Tasks 10.1–10.4, plus every Changes item tagged 10 / 10.3 / 10.4). Spec: `docs/superpowers/specs/2026-10-25-admin-platform-design.md` (§2 goal 3 and §6.2 "Builder pages: `/p/[slug]` … the block library is CP's own sections only", O4, O5, O6, §4 anti-goals). Branch `feat/dynamic-platform`, phase base `beb3b1c`. Never push.

**Goal:** Give CP SP's page builder:
- new pages at `/p/<slug>`, built from blocks;
- SP's builder machinery: registry, document rules, block library, outline with keyboard reorder, hide, anchors, autosave, conflict, history, preview, SEO tab, and draft/publish;
- "Copy to new page" from a fixed page;
- every Phase 4, 8 and 9 deferral tagged 10.

The block library is **CP's 15 sections**. Each block renders an existing CP public component with the same props the fixed pages give it, so a block looks exactly like that section does on the fixed pages. No public component changes. The 44 public baselines stay at 0 px. Builder pages get their own new baselines, seeded only for visual runs.

**SP reference:** `/Users/nazmulhasansourab/ireland/security-partners` at `1a9f65d`, read-only (`git -C <sp> show 1a9f65d:<path>`). Port the final-state files. For the rationale, skim SP `docs/superpowers/plans/2026-10-19-mk-parity/phase-D5-page-builder.md` (D5.1–D5.6); don't copy it. Its Review Focus 1–5 hold here unchanged:
- path collisions and reserved slugs;
- a real 404 for missing, draft-only or deleted pages;
- media in use can't be deleted;
- keyboard reorder;
- autosave racing publish.

SP's own rationale for its block list is SP-specific and does not apply (O4).

**What CP already has** (ported in earlier phases; don't port again):
- **Data and permissions:**
  - the `builder_pages` table: `server/db/schema/builder-pages.ts` and migration `0018_builder_pages.sql`, with slug check, unique slug and `versioned` columns;
  - migration `0020` (strips SP's newsletter block from builder rows; harmless);
  - `tag.builderPages` / `tag.builderPage(slug)`;
  - `REVISION_ENTITIES` with `"builder-page"` and the revisions rule `"builder-page": { page: ["read"] }`;
  - `page: [read, create, update, publish, delete]` in `lib/auth/permissions.ts` and its test.
- **SEO and redirects:**
  - `SEO_KINDS` / `OG_KINDS` with `"builder"`;
  - `SeoPanel` and `issues-list` builder labels;
  - the builder rows in `server/modules/seo/repo.ts`;
  - `lib/seo/redirects.ts` (`/p` rules);
  - the `/p/` live-page checks in `server/modules/redirects/{service,repo}.ts`, plus `recordMove`.
- **Media:** the `"builder-page"` usage entity in `server/modules/media/{repo,service}.ts`, and `server/lib/media-usages.ts` (`syncMediaUsages`, `clearMediaUsages`).
- **Admin wiring:**
  - the dashboard content review and QA (`lib/content/qa.ts` links builder pages to `/admin/pages/custom/<id>`);
  - the activity label `"builder-page": "a custom page"`;
  - the ISOMORPHIC `blocks/**` rule in `eslint.config.mjs` and its lint-boundaries test;
  - the editor kit: `EditorLayout`, `PreviewPane`, `ConflictDialog`, `PublishDialog`, `RevisionDrawer`, `SaveStateIndicator`, `UnsavedGuard`, `SchemaForm`, `sortable-list.tsx` (dnd-kit), `SerpPreview` and `SEO_FIELDS_META`.
- **AI:** the assistant (`useAssistantScreen`, `onFieldFocus`) and `server/modules/ai/screen-context.ts`.

**SP files CP lacks** (from SP `git ls-tree` diffed against CP `git ls-files`). Each is placed in a task below, or excluded by R10-17:
- `blocks/{define-block,fields,document,media-refs,registry}.ts`, `lib/builder-slug.ts`, `lib/schemas/api/builder-pages.ts`;
- `server/modules/builder-pages/{repo,service,routes,queries}.ts`;
- `templates/builder/{views,render,from-template}.ts(x)`, `app/(site)/p/[slug]/page.tsx`, `app/(admin)/admin/(panel)/pages/custom/[id]/page.tsx`;
- `components/admin/builder/{builder-state,block-outline,block-library,block-form,block-meta,use-builder-autosave,new-page-dialog,page-builder}.ts(x)`;
- tests:
  - unit: `tests/unit/blocks/{registry,document,media-refs,public-components-frozen}.test.ts` plus `frozen-components.json`, and `tests/unit/builder/{builder-slug,builder-state,from-template,resolve,views}.test.ts(x)`;
  - DOM: `tests/dom/{block-form,block-library,block-outline,page-builder,use-builder-autosave}.test.tsx`;
  - integration: `tests/integration/api/builder-pages.test.ts`, `tests/integration/builder/{public,preview-scope}.test.ts`;
  - e2e: `tests/e2e/{builder,builder-public}.spec.ts`;
  - visual: `tests/visual/{builder-slug,builder-fixture}.ts` and `tests/visual/{builder-pages,builder-copy}.spec.ts`;
- builder code SP has in files CP already has:
  - `server/api/app.ts` (mount);
  - `server/modules/preview/service.ts` and `lib/schemas/api/preview.ts` (`"builder-page"`);
  - `templates/shared/page-meta.ts` (`builderPageMetadata`);
  - `server/modules/redirects/resolve.ts` (`/p/` slug check);
  - `server/modules/seo/{queries,service}.ts`;
  - `app/og/[kind]/[slug]/route.tsx`;
  - `components/admin/pages/{pages-list,page-editor}.tsx`;
  - `components/admin/shell/palette-actions.ts`;
  - `lib/admin/nav.ts` keywords;
  - `tests/visual/seed.ts`;
- builder cases SP has in test files CP already has:
  - `tests/dom/command-palette.test.tsx` ("New page" cases);
  - `tests/unit/admin/{palette-actions,page-guards}.test.ts`.

**Deferral markers in the tree at `beb3b1c`.** Every one is closed in the task named:

| Marker | Task |
|---|---|
| `server/modules/redirects/resolve.ts:109` `10.3:` `/p/:slug` joins the slug check | 5 |
| `server/modules/seo/queries.ts:56` `10.3:` builder pages join the sitemap | 5 |
| `server/modules/seo/service.ts:53` `10.3:` `BUILDER_ENTITY` and `builderPath` from `lib/schemas/api/builder-pages.ts`; `FIX_BASE.builder` not a route yet | 3 (import), 8 (route) |
| `tests/integration/queries/sitemap.test.ts:93` `10.3:` flips when builder pages ship | 5 |
| `app/og/[kind]/[slug]/route.tsx:10,21` "404 until … Phase 10.3", plus `kind === "builder"` | 5 |
| `server/db/schema/builder-pages.ts:25` "Phase 10 (Task 10.2) restores DraftDocument" | 3 |
| `components/admin/pages/page-editor.tsx:20` "Copy to new page arrives with Phase 10" | 9 |
| `components/admin/pages/pages-list.tsx:41` "Builder (custom) pages arrive in Phase 10" | 9 |
| `components/admin/shell/palette-actions.ts:73` "New page (builder) returns in Phase 10" | 9 |
| `lib/admin/nav.ts:126` "builder / custom pages keywords return in Phase 10" | 9 |
| `tests/dom/pages-list.test.tsx:162` "no builder section … until Phase 10" | 9 |
| `tests/visual/seed.ts:28` "Phase 10 adds the builder fixture page" | 6 |

Four "Phase 10" strings are **SP's** Phase 10 (hardening), not CP deferrals. Leave them as they are:
- `eslint.config.mjs:19`;
- `server/lib/storage/disk.ts:29`;
- `tests/integration/users/hardening.test.ts:31`;
- `tests/unit/lint-boundaries.test.ts:149`.

## Global constraints for this phase

- The master Global Constraints apply in full, including Review Focus #1 (SP leftovers: SP's security copy in the block library, the fixture copy, help text and e2e strings) and #5 (public literals: `templates/builder/render.tsx` is in `public-literals.test.ts` scope through `templates`).
- **Public site at 0 px.** Every `PUBLIC_URLS` entry stays at 0 px at both viewports (44/44). These tasks touch `app/(site)/**`, `templates/**`, `blocks/**` or `proxy`-path code, so each runs `pnpm test:visual` before committing: 1, 2, 4, 5 and 6. Every other task runs it at the gate.
- **The existing 44 baselines are never updated.**
  - Never run `pnpm test:visual:update`: it rewrites all of them.
  - New baselines come only from `pnpm exec playwright test tests/visual/builder-pages.spec.ts --update-snapshots` (R10-10).
- **No public component file changes** (R10-3). `components/{home,about,services,contact,blog}/**` are hash-frozen at `beb3b1c`.
- **No new env vars, no new dependencies, no new migration** (R10-16). `builder_pages` already exists (0018). `server/env.ts`, `package.json`, `pnpm-lock.yaml` and `server/db/migrations/` are unchanged at the gate.
- `next build` with no env and no DB keeps passing. `/p/[slug]` reads data only after `await connection()` inside `SiteThemed`'s `<Suspense>`.
- `tests/unit/branding.test.ts` and `tests/unit/public-literals.test.ts` stay green on every task. B2: the block is "Blog", and every admin href is `/admin/blog`.
- E2e specs that create builder pages delete them (and any redirect they made) in `finally`, so later specs (e.g. `seo.spec.ts`) see the seed.
- Closure rule as in the earlier phases. List every closure file.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings for this phase

- **R10-1 Port SP's final state, CP deltas only.** Every file in the "lacks" list is SP's `1a9f65d` version with the branding map, CP content and the deltas below. Machinery is ported verbatim:
  - `defineBlock`, `BlockId`, `Anchor`, the reserved-anchor rule;
  - `BuilderDocument` (1..40 blocks), the loose `DraftDocument`, `validateDocument` (indexed `blocks.<i>.<path>` errors, unique ids and anchors, `first`, `max`), `emptyBlock`;
  - `collectMediaIds`;
  - `lib/builder-slug.ts` (pattern, ≤ 60 characters, reserved `admin`, `api`, `og`, `images`, `p`).

  Only the block list, the views, the render shell and the copy mapping are CP-specific.

- **R10-2 The 15 CP BlockTypes.** These are exactly the master's Shared-contracts union, in this order in `BLOCKS`. Each renders the component named here, with props built by the view builder named here: the same builder the fixed page uses.

  | # | id | Label | Component | Props from | `first` / `max` | Owns anchor |
  |---|---|---|---|---|---|---|
  | 1 | `hero` | Hero | `components/home/hero.tsx` `Hero` | `homeView`'s hero mapping (logo from `settings.site.logoLarge`) | first, 1 | — |
  | 2 | `hero.page` | Page hero | `components/home/page-hero.tsx` `PageHero` | `pageHeroView(s, data)`, parents `[]` | first, 1 | — |
  | 3 | `ourStory` | Our story | `components/about/our-story.tsx` `OurStory` | `aboutView`'s story mapping | — | — |
  | 4 | `stats` | Stats | `components/about/stats.tsx` `Stats` | `aboutView`'s stats mapping (labels through `textView`) | — | — |
  | 5 | `services` | Services | layout `intro`: `components/home/services.tsx` `Services`; layout `grid`: `components/services/services-grid.tsx` `ServicesGrid` | `homeView`'s services mapping / `servicesView`'s grid mapping (cards from the services collection) | 1 | `services` |
  | 6 | `whyChooseUs` | Why choose us | `components/home/why-choose-us.tsx` | `whyChooseUsView` | 1 | — |
  | 7 | `clients` | Clients | `components/home/clients.tsx` | `clientsView` | 1 | — |
  | 8 | `team` | Team | `components/home/team.tsx` | `teamView` | 1 | `team` |
  | 9 | `testimonials` | Testimonials | `components/home/testimonials.tsx` | `testimonialsView` | 1 | — |
  | 10 | `blog` | Blog | `components/home/blog.tsx` `Blog` | `homeView`'s blog mapping (newest after the featured article, `viewAllPostsView`, `microcopy.readArticle`) | 1 | `blog` |
  | 11 | `howItWorks` | How it works | `components/services/how-it-works.tsx` | `serviceDetailView`'s howItWorks mapping (`sections.howItWorks`) | 1 | — |
  | 12 | `contact` | Contact | `components/home/contact.tsx` `Contact` | `contactSectionView(s, data.title ?? undefined)` | 1 | `contact` |
  | 13 | `quoteForm` | Quote form | `components/contact/quote-form.tsx` `QuoteForm` | `contactView`'s form mapping | 1 | `quote` |
  | 14 | `map` | Location map | `components/home/location-map.tsx` | `locationMapView` | 1 | — |
  | 15 | `richtext` | Text | the legal pages' body section (R10-4) | `ArticleBlocks` with `microcopy.checkIcon` | — | — |

  - **How the views are built.**
    - To keep each mapping in one place, the inline mappings in `homeView`, `aboutView`, `servicesView`, `contactView` and `serviceDetailView` move into named builders in `templates/shared/views.ts`: `heroView`, `ourStoryView`, `statsView`, `servicesIntroView`, `servicesGridView`, `homeBlogView`, `howItWorksView`, `quoteFormView`.
    - Both the fixed views and `templates/builder/views.ts` call them.
    - This is a pure refactor: `tests/unit/templates/views.test.ts` stays green unchanged, and visual stays 44/44.
  - **No SP blocks.** `about`, `iconCards`, `enquireBanner`, `departments` and `newsletter` are not ported (O4), and neither are SP's views and fixture copy.
  - **Anchors.**
    - `RESERVED_ANCHORS` is CP's: `services`, `team`, `blog`, `contact` and `quote` belong to blocks 5, 8, 10, 12 and 13.
    - `top` (the header's id) is reserved for no block.
    - A block whose anchor equals the id its component owns renders unwrapped. Any other block renders inside `<div id={anchor}>`, as in SP.
  - **`hero` and `hero.page`** are both `first`, so a page has at most one of them; `validateDocument` already refuses a second `first` block.
  - **Admin copy.** Block labels, descriptions and lucide icon names are admin copy in `blocks/registry.ts`. No security wording.
  - **The registry test** (`tests/unit/blocks/registry.test.ts`) pins:
    - `BLOCK_TYPES` equal to this list in this order;
    - unique labels;
    - `first` and `max` as tabled;
    - `RESERVED_ANCHORS`.

- **R10-3 Pixel identity.** A block renders exactly as the same section does on the fixed pages. This is proven in four layers:
  1. **Props.** `tests/unit/builder/views.test.tsx` (SP's file, rewritten for CP) runs on the fixture `SiteSources` that `tests/unit/templates/views.test.ts` uses.
     - For each of the 15 types it builds the block that `blocksFromTemplate` makes from the fixed page and asserts that `blockView(block, s).props` deep-equals the fixed view's props: `homeView(s).hero`, `aboutView(s).story`, `servicesView(s).grid`, `serviceDetailView(s, slug).howItWorks`, `contactView(s).form`, and so on.
     - `howItWorks` has no fixed page to copy, so its block is built by hand.
     - It also asserts that `renderToStaticMarkup(<Section view>)` equals the markup of the component given the fixed props.
  2. **Copied pages.** `tests/visual/builder-copy.spec.ts` (R10-11) compares the `<main>` of a copied page byte for byte with the fixed page's `<main>`, in the same run. It stores no baseline.
  3. **Every block.** The new fixture baselines (R10-10).
  4. **Frozen components.** SP's `tests/unit/blocks/public-components-frozen.test.ts`, with `frozen-components.json` recording the sha256 of every file under `components/{home,about,services,contact,blog}` at `beb3b1c`. Blocks wrap components; they never edit them.

  If a wrapper `<div>` or anything else moves a pixel, the implementer **stops and reports**. No component edits are allowed.

- **R10-4 Block fields reuse the CP content schemas verbatim.** No SP character caps are added: a copied fixed page always fits, so `from-template.ts` copies without cutting, and SP's `COPY_LIST_MAX` cut-to-fit is dropped.

  | Block | `data` schema |
  |---|---|
  | `hero` | `homeTemplate.shape.hero` |
  | `hero.page` | `pageHeroText.extend({ image: mediaRef.nullable() })`; `null` = `settings.site.defaultHeroImage`, as the about and contact heroes do. The view passes `image` only when set, so `pageHeroView` behaves as for a `PageHeroText`. |
  | `ourStory` | `aboutTemplate.shape.story` |
  | `stats` | `z.object({ items: aboutTemplate.shape.stats })` |
  | `services` | `{ layout: z.enum(["intro","grid"]), intro: homeTemplate.shape.services.nullable(), grid: servicesTemplate.shape.grid.nullable() }`, refined so the chosen layout's group is non-null (error key `blocks.<i>.<layout>`) |
  | `blog` | `homeTemplate.shape.blog` (eyebrow, title, description, count 1..12) |
  | `contact` | `{ useShared: z.literal(true), title: text.nullable() }`; `null` = the section's own title (the contact page sets "Ways to Reach Us") |
  | `whyChooseUs`, `clients`, `team`, `testimonials`, `howItWorks`, `quoteForm`, `map` | `sharedOnly` (`{ useShared: true }`) |
  | `richtext` | `{ doc: richText }` from `lib/schemas/common`, with SP's block budget (`RICH_TEXT_MAX_NODES` 200, `RICH_TEXT_MAX_CHARS` 50 000) |

  - **Why the services block has two layouts.** CP has two services sections: the home intro with its list, and the `/services` card grid. The master fixes a single `services` type, so `layout` selects one of them. That keeps 15 types and still lets every fixed page be copied.
    - SchemaForm has no unions. `BlockForm` therefore passes `hidden: true` meta for the inactive group.
    - Switching the layout fills an empty group with `emptyValue`.
  - **Why `quoteForm` is shared.** It renders the contact page's **published** quote form copy. The leads service reads that same copy (`mailSubject`, `fields.service.fallback`, `extraOptions`; `server/modules/leads/service.ts:200`), so there is one source for the form wherever it appears.
  - **Labels and widgets.** `BlockForm`'s editor meta is the matching subtree of the fixed template's editor-meta, re-rooted: `homeEditorMeta` `hero.*`, `aboutEditorMeta` `story.*`, and so on. A block field is labelled exactly as it is in the page editor. The few block-only fields get labels in `BLOCK_FIELD_LABELS`: `layout`, `hero.page` `image`, `contact` `title`.
  - **`emptyBlock` defaults.** Blank copy and `null` media, as SP. `services` starts as `layout: "grid"` and `blog` as `count: 3`. The draft autosaves them; publish runs the full schema.

- **R10-5 Media refs and usages: as SP.**
  - **Usages.** Every save (create with a seed, draft, restore) calls `syncMediaUsages(tx, "builder-page", id, collectMediaIds(draft))`, and delete calls `clearMediaUsages`. So a media row used by a block can't be deleted (409, Review Focus 3).
  - **Which media count.** The ids are the block-data refs:
    - `hero` background and member logo;
    - `hero.page` image;
    - `ourStory` images A and B;
    - `services.intro` images and tick icon;
    - `services.grid` help-card icon;
    - rich-text images.

    Shared blocks carry no media of their own; their settings rows already track theirs.
  - **Rendering.** The public render resolves block media with `resolveMedia({ doc })`, after `loadSiteSources()`.
  - **The media screen** already labels the entity "a custom page" and links to `/admin/pages/custom/<id>`. That link becomes live in Task 8.
  - **Tests** (`builder-pages.test.ts`): a hero image in use → media delete 409; after the block is removed and the draft saved → delete 204.

- **R10-6 `builder_pages` data, versioning, RBAC, API: as SP.**
  - **No migration.** The 0018 table is used as is. `server/db/schema/builder-pages.ts` goes back to SP's typed `versioned<BuilderDocument>()`, and its marker comment is removed.
  - **API.** `lib/schemas/api/builder-pages.ts` exports:
    - `builderSlug`, `builderPath`, `BUILDER_ENTITY`;
    - `newBuilderPageInput`, `createBuilderPageInput` (`seed?: DraftDocument`), `builderDraftInput`, `builderMetaInput`, `builderDeleteQuery`;
    - the DTOs.

    Routes are mounted at `/api/v1/admin/builder-pages` in SP's position in `server/api/app.ts`, each `zv` → `can()` → service:

    | Method | Path | Permission |
    |---|---|---|
    | `GET` | `/` | `page:read` |
    | `POST` | `/` | `page:create` |
    | `GET` | `/:id` | `page:read` |
    | `PUT` | `/:id/draft` | `page:update` |
    | `POST` | `/:id/publish` | `page:publish` |
    | `POST` | `/:id/restore` | `page:update` |
    | `PATCH` | `/:id/meta` | `page:update` |
    | `DELETE` | `/:id` | `page:delete` |

    SEO saves use the existing `PUT /api/v1/admin/seo/entries/builder/:id` (`seo:update`).
  - **Service behaviour.**
    - It re-checks every permission.
    - It writes `VersionedStore` revisions with entity `"builder-page"`.
    - It audits `builder-page.created`, `.meta_changed`, `.deleted`, plus the store's publish and restore actions.
    - It invalidates `tag.builderPages` and `tag.builderPage(slug)`, for the old and the new slug on a rename.
  - **`server/modules/seo/service.ts`** imports `BUILDER_ENTITY` and `builderPath` from `lib/schemas/api/builder-pages.ts`, which closes half of that marker.
  - **`tests/integration/api/builder-pages.test.ts`** is SP's, with CP blocks and CP copy:
    - an editor creates `/p/landing`; a duplicate slug → **409**; two concurrent creates of one slug → one 201 and one **409**; a marketer gets 403 on create;
    - bad slugs (`""`, `Landing`, `a/b`, `a-`, 61 characters, `é`, `admin`) → 422;
    - a draft accepts an incomplete block; publish rejects it with `blocks.<i>.<path>` fieldErrors; publishing `hero` and `hero.page` together → 422 on `blocks.1.type`;
    - **a stale version → 409 with `current`**, on draft, publish, restore and meta;
    - publish writes a revision; restore loads it into the draft;
    - the role matrix: owner, admin and editor create and delete; marketer and viewer read only; author gets 403 on GET;
    - the media cases from R10-5;
    - the redirect cases from R10-8.

- **R10-7 `/p/[slug]` public route.**
  - **The page.** `app/(site)/p/[slug]/page.tsx` is SP's.
    - The default export wraps the body in `<SiteThemed>`. This closes the Phase 9 deferral: `site-themed-pages.test.ts` finds 10 pages, and its floor becomes `toBeGreaterThanOrEqual(10)`.
    - The body awaits `connection()`, then `loadSiteSources()`, `getBuilderPageForRequest(slug)` (else `notFound()`) and `resolveMedia`. It renders `BuilderTemplate`.
  - **`BuilderTemplate`** (`templates/builder/render.tsx`) uses CP's page shell, exactly as `templates/about/render.tsx` does: `HomeMotion` › `div.bg-white.text-ink` › `SiteHeader`, `<main>{visible blocks}</main>`, `SiteFooter`, then `SiteLocale`. It does not use SP's shell.
    - The `richtext` section's markup is the legal body section. To share one copy, it moves into `templates/shared/rich-text-section.tsx`, and `templates/legal/render.tsx` uses it too. This is a pure refactor (visual 44/44).
  - **Queries.** `server/modules/builder-pages/queries.ts` is SP's:
    - `getPublishedBuilderPage` is `'use cache'` with `cacheLife("max")` and `cacheTag(tag.builderPages, tag.builderPage(slug))`;
    - `getBuilderPageForRequest` (React `cache`): malformed or unknown slugs never reach the cache; a previewer with `page:read` gets the loose draft, where invalid blocks are dropped;
    - `isPublishedBuilderSlug`.
  - **Missing pages → `global-not-found`.** `server/modules/redirects/resolve.ts` gains SP's `BUILDER` check, which closes the 10.3 marker:
    - a draft cookie → pass;
    - a well-formed published slug → pass;
    - otherwise the redirect lookup, then `missing`.

    The proxy answers `missing` with the real 404 through `/_cp-missing` → `app/global-not-found.tsx`, as for services and articles. `notFound()` in the page is only the backstop. Port SP's `tests/unit/builder/resolve.test.ts`.
  - **Preview.**
    - `PREVIEW_ENTITIES` gains `"builder-page"`.
    - `server/modules/preview/service.ts` validates the uuid first, then resolves `/p/<slug>`, needing `page:read`.
    - `tests/integration/builder/preview-scope.test.ts` is SP's: an author previewing an article sees no builder draft.
  - **Metadata.** `builderPageMetadata(s, page)` goes in `templates/shared/page-meta.ts`.
    - The canonical is `/p/<slug>`.
    - The title is the SEO title, else the page title, through `seo.defaults.titleTemplate`.
    - The description is the SEO description, else the first hero's description: `hero.page.description`, or `hero.subtitle`.
    - The OG image is the record's, else the defaults', else `/og/builder/<id>`.
    - `firstHeroDescription`, and the `blocks.0` description case in `server/modules/seo/repo.ts`, learn the `hero` subtitle.
  - **Sitemap.** `listSitemapEntries` drops the `continue` (marker closed). Published builder pages are listed, and `noindex` ones are marked noindex, as for every other kind.
    - `sitemap.test.ts` flips its exclusion case into SP's two cases: a published builder page is in (20 entries); a noindex one is flagged.
    - `tests/e2e/seo.spec.ts` "lists the 19 public URLs" becomes 19 + n, where n is the count of published builder pages from `GET /api/v1/admin/builder-pages`. It is 0 on the e2e seed.
  - **OG.** `app/og/[kind]/[slug]/route.tsx` drops the `kind === "builder"` exclusion and the "Phase 10.3" comment. The builder card renders a published page's title with no eyebrow (`EYEBROW.builder` is `null`).
    - `seo.spec.ts` keeps its unknown-uuid `/og/builder/…` 404 case.
    - `builder-public.spec.ts` adds a 200 PNG of 1200×630 for a published page.
  - **Redirects** (R10-8) and the JSON-LD: SP's (site-wide graph only).
  - **Tests.**
    - `tests/integration/builder/public.test.ts` (SP's): `resolvePublicPath` outcomes; `/p/old` after a rename → 301 `/p/new`; a draft cookie on an unpublished page → pass; the sitemap.
    - `tests/e2e/builder-public.spec.ts` (SP's): `/p/missing` and a draft-only page → status 404 with the global-not-found body; a published page renders its blocks in order; a hidden block is absent; `<title>` follows SEO; a preview of an unpublished page shows the draft with the preview bar; no `style#site-theme` on the seeded theme.

- **R10-8 Redirects on rename and delete.** This is the Phase 8 ledger ruling, which has no code marker.
  - `changeBuilderMeta`, when the slug changes on a published page, calls `recordMove(tx, actor, { from: "/p/<old>", to: "/p/<new>", reason })` in the same transaction.
  - `deleteBuilderPage` with `redirectHome=true` on a published page records `/p/<slug>` → `/`. Without it, nothing is recorded.
  - Both expire `tag.redirects`, as Task 8.2's service and article cases do.
  - **Tests** (`builder-pages.test.ts`):
    - a rename records the redirect, expires `"redirects"`, and the old URL resolves 301;
    - a delete with `redirectHome` gives a 301 to `/`;
    - a delete without it gives a 404;
    - renaming an unpublished page records nothing.

- **R10-9 The visual fixture is seeded only in the visual seed.**
  - `tests/visual/builder-fixture.ts` exports `seedVisualBuilderPages(db)`, called from `tests/visual/seed.ts` after `seedContent` (marker closed). It is never part of `pnpm db:seed` or the e2e seed, and it writes no `media_usages` rows (SP).
  - It inserts two published pages, because `hero` and `hero.page` can't share a page (R10-2):
    - `/p/visual-fixture`: `hero.page` (image `null`), `ourStory`, `stats`, `services` (grid), `whyChooseUs`, `clients`, `team`, `testimonials`, `blog`, `howItWorks`, `contact` (title `null`), `quoteForm`, `map`, `richtext` (a heading, a lead paragraph, a checklist and a quote, so every CP rich-text kind renders), and one hidden `stats` block;
    - `/p/visual-fixture-home`: `hero`, then `services` (intro).

    Together they show all 15 types and both services layouts.
  - Media ids come from the seeded fixed pages' published data, as in SP.
  - All copy is CP cleaning copy, written in the fixture. No security wording.
  - The fixture must pass `validateDocument` or the seed throws (SP).
  - `tests/visual/builder-slug.ts` exports both slugs, because Playwright can't import the server-only fixture.
  - **This extends the master's 10.3 acceptance** ("Baselines added for `/p/visual-fixture`") with a second fixture page. The controller records the extension in the master Changes at phase end.

- **R10-10 New baselines without touching the 44.**
  - A **separate spec file**, `tests/visual/builder-pages.spec.ts`, holds two tests (one per slug). Each asserts status 200, freezes motion, checks there is no consent banner, and takes a `fullPage` `toHaveScreenshot` named `p-visual-fixture.png` and `p-visual-fixture-home.png`.
  - It runs in the existing `desktop` and `mobile` projects, so with Chromium, both viewports and `maxDiffPixels: 0`. **No new Playwright project**, and `playwright.config.ts` is unchanged.
  - **Creating them:** `pnpm exec playwright test tests/visual/builder-pages.spec.ts --update-snapshots`, then `pnpm test:visual` twice, all green.
  - Exactly four files are added: `p-visual-fixture-{desktop,mobile}.png` and `p-visual-fixture-home-{desktop,mobile}.png`.
  - `git diff --name-status beb3b1c -- tests/visual/__screenshots__` lists only those four, all `A`. Any `M` or `D` fails the gate.
  - `public-pages.spec.ts` and `urls.ts` are untouched; `PUBLIC_URLS` stays the 22-entry contract.

- **R10-11 "Copy to new page".**
  - `templates/builder/from-template.ts` `blocksFromTemplate(key, data)` maps each fixed page's sections, in render order, to blocks with the page's own copy. The fixed page is never touched.

    | Page | Blocks |
    |---|---|
    | `home` | `hero`, `clients`, `services` (intro), `whyChooseUs`, `testimonials`, `team`, `blog`, `contact`, `map` |
    | `about` | `hero.page` (image `null`), `ourStory`, `stats`, `clients`, `whyChooseUs`, `team`, `testimonials`, `contact` |
    | `services` | `hero.page`, `services` (grid), `whyChooseUs`, `clients`, `testimonials`, `contact` |
    | `contact` | `hero.page` (image `null`), `contact` (title = `contactTitle`), `quoteForm`, `map` |
    | `privacy`, `terms` | `hero.page`, `richtext` (`body`) |
    | `blog` | `hero.page`, `contact` |

    - **Why `blog` is the exception.** Its filterable, paginated list is a page feature, not a section, so the copy is not identical. The editor adds a Blog block themselves.
  - **Anchors** are the owned ids where a block owns one (R10-2), else SP's `emptyBlock` anchors.
  - **UI.**
    - The page editor gets SP's "Copy to new page" action for `page:create`.
    - It opens `NewPageDialog` titled "Copy to a new page", with the title "<Page> copy" and the address `<key>-copy`, and seeds the editor's current draft.
    - "Create copy" navigates to `/admin/pages/custom/<id>`.
  - **Tests.**
    - `tests/unit/builder/from-template.test.ts`: each mapping above; every fixed page's seed data converts to a document that passes `validateDocument`; legal bodies fit the rich-text budget.
    - `tests/visual/builder-copy.spec.ts`: for `home`, `about`, `services`, `contact` and `privacy`, it creates the copy. About goes through the UI, as in SP; the rest go through `POST /builder-pages` with `seed`. It then publishes, and takes the `<main>` element screenshot of the fixed URL and of `/p/<key>-copy` in one visitor context. The two PNG buffers must be byte-equal, and no baseline file is written. The breadcrumb needs no mask: the crumb is copied and `parents` is `[]` on both. The spec deletes the copies in `finally`.
    - The header is outside `<main>`, so its active-link highlight is not compared.

- **R10-12 Builder UI: as SP.**
  - **Files.** `components/admin/builder/*` is SP's:
    - the `docReducer` / `addableTypes` / `errorsByBlock` state;
    - `BlockOutline` on `sortable-list.tsx`: keyboard Space/Arrow/Space reorder with announcements, an eye toggle with `aria-pressed`, duplicate, and delete behind an `AlertDialog`;
    - `BlockLibrary`: a dialog of icon, label and description, with disabled reasons as text ("Only one per page", "Must be the first block");
    - `BlockForm`: SchemaForm with the R10-4 meta;
    - `BlockMeta`: anchor with the reserved-anchor message, and a hidden switch.
  - **`useBuilderAutosave`:**
    - 1.5 s debounce and a single request in flight;
    - a 409 → "conflict", paused until `accept()`;
    - a transient error → retry after 5 s;
    - flush on `visibilitychange` hidden and before publish or restore (Review Focus 5).
  - **`PageBuilder`:**
    - header: breadcrumb Pages › title; `SaveStateIndicator`; History (`RevisionDrawer`, entity `builder-page`); Preview (`previewHref("builder-page", id)`); Discard; Publish (`PublishDialog`);
    - tabs Content | SEO through `?tab=`;
    - Content is three columns at xl (outline | form + meta | `PreviewPane`), stacked below xl;
    - the SEO tab is SP's `SerpPreview` plus a SchemaForm over `seo`, with "Save SEO", plus the title and address fields (`changeBuilderMeta`) and the note "Changing the address adds a redirect from the old one";
    - `ConflictDialog` and `UnsavedGuard`.
  - **The route.** `app/(admin)/admin/(panel)/pages/custom/[id]/page.tsx` is guarded by `requirePage(...)` → `page:read`. `tests/unit/admin/page-guards.test.ts` gets SP's row back.
    - This makes `FIX_BASE.builder` (`/admin/pages/custom`) a real route: `fixHref` gives `/admin/pages/custom/<id>?tab=seo`, which opens the SEO tab. The rest of the seo/service marker comment is removed.
  - **Read-only.** A marketer or viewer sees the builder read-only: no library, outline drag, meta or Publish.
  - **Tests.**
    - unit `tests/unit/builder/builder-state.test.ts`;
    - DOM `tests/dom/{block-outline,block-library,block-form,page-builder,use-builder-autosave}.test.tsx`. `block-form.test.tsx` adds the CP services-layout case: switching to `intro` shows the intro group and hides the grid one.

- **R10-13 Assistant hooks** (Phase 9 deferral; a CP addition, so a named behavioural difference from SP).
  - **The gap.** SP's `PageBuilder` mounts neither `VersionedEditor` nor `useAssistantScreen`. CP adds `useAssistantScreen({ title, entityType: "builder", entityId: id, record: draft })` in `PageBuilder`.
  - **Block forms.** `BlockForm`'s SchemaForm gets `onFieldFocus` → `assistant.setField(...)`. Its `apply` dispatches a `data` action, so an Insert autosaves like typing.
  - **The SEO form.** It gets the same hook. Its `apply` sets the SEO draft, and the user clicks "Save SEO" (as R9-14's SeoPanel).
  - **Element ids.** `elementId` is the focused input's id. Each block form uses an id prefix of `sf-b<blockId8>`, so the same field in two blocks never collides.
  - **Server.** `server/modules/ai/screen-context.ts` `SITE_COPY` gains `"builder"`, so the draft record is sent as site copy. There is no new AI tool: the tools stay SP's, and builder pages are not searchable by the assistant (SP parity).
  - **Tests:**
    - a `screen-context` unit or integration case (a builder record passes; an unknown entity type still drops the record);
    - `page-builder.test.tsx` "registers the builder draft; Insert into a block heading dispatches and autosaves".

- **R10-14 Pages list, ⌘K, nav, `pages/custom/[id]`.**
  - **Pages list.** `pages-list.tsx` becomes SP's two sections: "Site pages" (the seven fixed rows, unchanged) and "Custom pages" (`GET /builder-pages`, with status pills and the updated-by name).
    - "New page" is a button for `page:create`; `?new=1` opens `NewPageDialog`.
    - The marker comment is removed.
    - The "until Phase 10" case in `tests/dom/pages-list.test.tsx` becomes SP's cases: the custom section lists rows linking to `/admin/pages/custom/<id>`; New page is shown for an editor and absent for a marketer; `?new=1` opens the dialog.
  - **⌘K.** `palette-actions.ts` gets SP's `new-page` action back, between `new-article` and `new-service`:
    - label "New page";
    - keywords `create`, `add`, `builder`, `landing`;
    - permission `page:create`;
    - it navigates to `/admin/pages?new=1`.

    Restore SP's cases in `tests/unit/admin/palette-actions.test.ts` and the "New page" cases in `tests/dom/command-palette.test.tsx`.
  - **Nav.** The `nav.ts` pages item keywords become `["home page", "about", "contact", "builder", "custom pages"]` (marker removed). `nav-registry.test.ts` asserts that `permissionFor("/admin/pages/custom/x")` resolves through the `pages` item.

- **R10-15 RBAC summary** (SP's matrix, unchanged):
  - owner, admin and editor: `page:create`, `update`, `publish` and `delete`;
  - marketer and viewer: read only;
  - author: none;
  - SEO tab writes: `seo:update`.

- **R10-16 No new env, deps or migration.** dnd-kit, TipTap and the editor kit are installed. `builder_pages` exists (0018). **If a task finds it needs a migration, it is `0025`, and the task stops and reports first.** `server/env.ts`, `package.json` and `pnpm-lock.yaml` are unchanged.

- **R10-17 Not ported.**
  - SP's `about`, `iconCards`, `enquireBanner`, `departments` and `newsletter` blocks, their views and their fixture copy (O4).
  - SP's `COPY_LIST_MAX` cut-to-fit (R10-4).
  - `tests/integration/db/remove-newsletter-migration.test.ts`: newsletter is not a CP feature, and 0020 is harmless (master Migrations).
  - `tests/e2e/admin-a11y.spec.ts`, `tests/visual/admin-screens.spec.ts` and SP's `admin-page-builder-*` baselines (11.3).

- **R10-18 Deferrals out of this phase.**
  - **11.2:** the proxy lookup cost now also covers `/p/*`: one indexed query per live page, and two per missing one. Fold it into the existing timeout-race decision.
  - **11.3:**
    - admin visual baselines for the Pages list with a custom row, and the builder editor (light, dark, desktop, mobile; SP `admin-page-builder-*`);
    - admin a11y URL `/admin/pages/custom/<id>`;
    - the builder rows of `roles.spec.ts`.
  - **11.5:** the runbook section "Page builder": custom pages at `/p/<slug>`, Copy to new page (the blog copy is not identical), the redirect on rename, deleting with a redirect home, and the visual-only fixture pages.
  - **11.x (parked minors):**
    - the assistant cannot search or read builder pages (SP parity);
    - `stats` has no item maximum (the CP schema has none), so many items wrap as the component does today.

  The controller records these, and the R10-9 extension, in the master Changes at phase end.

---

### Task 1: Block machinery (master 10.1 part 1; R10-1, R10-3)

**Files:** `blocks/{define-block,fields,document,media-refs}.ts`, `lib/builder-slug.ts`, `tests/unit/blocks/frozen-components.json` (hashes at `beb3b1c`).

`blocks/document.ts` imports `BLOCK_TYPES` and `BlockInstance` from `registry.ts`. Land `registry.ts` here as a two-block stub (`hero.page` and `richtext`) so the machinery tests run; Task 2 replaces it. Say so in the commit body.

**Tests:**
- `tests/unit/blocks/{document,media-refs,public-components-frozen}.test.ts` and `tests/unit/builder/builder-slug.test.ts` (SP's, with CP fixtures);
- the existing `lint-boundaries` "flags server imports from blocks/" case stays green.

**Commit:** `feat: add page builder block machinery`

---

### Task 2: CP block library (master 10.1 part 2; R10-2, R10-4)

**Files:** `blocks/registry.ts` (the 15 blocks, `RESERVED_ANCHORS`, `BlockInstance` union, budget constants), `templates/shared/views.ts` (the named section builders from R10-2), and `templates/{home,about,services,contact}/view.ts` (call them).

**Tests:**
- `tests/unit/blocks/registry.test.ts`: the R10-2 pins, plus the services layout refinement (grid chosen with `grid: null` → error on `blocks.<i>.grid`);
- `tests/unit/templates/views.test.ts` unchanged and green;
- `public-literals`;
- `pnpm test:visual` 44/44.

**Commit:** `feat: add the cp block library`

---

### Task 3: `builder_pages` service and API (master 10.2; R10-5, R10-6, R10-8, R10-15)

**Files:**
- `lib/schemas/api/builder-pages.ts`;
- `server/db/schema/builder-pages.ts` (typed `versioned`, marker removed);
- `server/modules/builder-pages/{repo,service,routes}.ts`;
- `server/api/app.ts` (mount);
- `lib/api-client.ts` types if needed;
- `server/modules/seo/service.ts` (import `BUILDER_ENTITY`/`builderPath`; delete the local copies and the first half of the marker).

**Tests:** `tests/integration/api/builder-pages.test.ts` with every R10-6, R10-5 and R10-8 case, including **the stale-version 409** and the duplicate-slug 409. `tests/unit/permissions.test.ts` stays green.

**Commit:** `feat: add builder pages api`

---

### Task 4: Block views and builder template (master 10.3 part 1; R10-2, R10-3, R10-7)

**Files:** `templates/builder/{views.ts,render.tsx}` (CP shell, `OWN_ID`, the `Section` switch), `templates/shared/rich-text-section.tsx`, `templates/legal/render.tsx` (uses it).

**Tests:**
- `tests/unit/builder/views.test.tsx`: R10-3 layer 1 for all 15 types, with blocks built by hand here; Task 9 adds the `blocksFromTemplate` round trip;
- `public-literals`;
- `pnpm test:visual` 44/44.

**Commit:** `feat: render builder blocks with cp sections`

---

### Task 5: Public `/p/[slug]`, proxy, preview, sitemap, OG (master 10.3 part 2, Phase 8 and 9 deferrals; R10-7)

**Files:**
- `server/modules/builder-pages/queries.ts`;
- `app/(site)/p/[slug]/page.tsx` (inside `SiteThemed`);
- `templates/shared/page-meta.ts` (`builderPageMetadata`);
- `server/modules/redirects/resolve.ts` (`BUILDER` slug check; marker and doc comment updated);
- `lib/schemas/api/preview.ts` and `server/modules/preview/service.ts` (`builder-page`);
- `server/modules/seo/queries.ts` (sitemap; marker removed);
- `server/modules/seo/repo.ts` (the hero subtitle in the description case);
- `app/og/[kind]/[slug]/route.tsx` (exclusion and comment removed).

**Tests:**
- unit:
  - `tests/unit/builder/resolve.test.ts`;
  - `tests/unit/theme/site-themed-pages.test.ts` (floor 10);
- integration:
  - `tests/integration/builder/{public,preview-scope}.test.ts`;
  - `tests/integration/queries/sitemap.test.ts` (exclusion flipped: 20 entries with `/p/spring-offer`; a noindex case);
- e2e:
  - `tests/e2e/builder-public.spec.ts` (R10-7 cases, OG 200);
  - `tests/e2e/seo.spec.ts` (19 + n);
- build and visual:
  - `env -u … pnpm build`;
  - `pnpm test:visual` 44/44.

**Commit:** `feat: serve builder pages at /p/[slug]`

---

### Task 6: Visual fixture pages and baselines (master 10.3 part 3; R10-9, R10-10)

**Files:** `tests/visual/{builder-slug,builder-fixture}.ts`, `tests/visual/seed.ts` (calls `seedVisualBuilderPages`; marker removed; log line), `tests/visual/builder-pages.spec.ts`, and the four new PNGs.

**Tests:**
- `pnpm exec playwright test tests/visual/builder-pages.spec.ts --update-snapshots`;
- **look at all four screenshots** and check every block renders: no empty section, no broken image, the hidden stats absent;
- then `pnpm test:visual` twice, 48 tests green each time (44 + 4);
- `git diff --name-status beb3b1c -- tests/visual/__screenshots__` shows exactly four `A` lines.

**Commit:** `test: add builder fixture visual baselines`

---

### Task 7: Builder state, outline, library, forms (master 10.4 part 1; R10-4, R10-12)

**Files:** `components/admin/builder/{builder-state.ts,block-outline,block-library,block-form,block-meta}.tsx` (`BLOCK_FIELD_LABELS`, template editor-meta re-rooting, the services-layout `hidden` meta, the `sf-b<id8>` id prefix).

**Tests:**
- `tests/unit/builder/builder-state.test.ts`;
- `tests/dom/{block-outline,block-library,block-form}.test.tsx`:
  - keyboard reorder with its announcement;
  - `aria-pressed` on the hide toggle;
  - "Page hero" disabled with "Only one per page", and Hero disabled once a page hero exists;
  - delete confirmation;
  - the CP services-layout case.

**Commit:** `feat: add builder outline, library and block forms`

---

### Task 8: Builder screen, autosave, SEO tab, assistant (master 10.4 part 2, Phase 8 and 9 deferrals; R10-12, R10-13)

**Files:**
- `components/admin/builder/{use-builder-autosave.ts,page-builder.tsx}`;
- `app/(admin)/admin/(panel)/pages/custom/[id]/page.tsx`;
- `server/modules/seo/service.ts` (rest of the marker comment removed);
- `server/modules/ai/screen-context.ts` (`"builder"` in `SITE_COPY`);
- `tests/unit/admin/page-guards.test.ts` (row).

**Tests:**
- DOM:
  - `tests/dom/use-builder-autosave.test.tsx`: debounce, single flight, a 409 pauses, retry after 5 s, flush before publish;
  - `tests/dom/page-builder.test.tsx`: tabs and `?tab=seo`, read-only for a marketer, the conflict dialog, the R10-13 assistant case;
- the screen-context case;
- the SEO overview's fix link for a builder row opens `/admin/pages/custom/<id>?tab=seo`. Add this to the existing seo-service test.

**Commit:** `feat: add the page builder screen`

---

### Task 9: Pages list, New page, ⌘K, Copy to new page (master 10.4 part 3, Phase 4 deferrals; R10-11, R10-14)

**Files:**
- `components/admin/builder/new-page-dialog.tsx`;
- `components/admin/pages/{pages-list,page-editor}.tsx` (markers removed);
- `components/admin/shell/palette-actions.ts`;
- `lib/admin/nav.ts`;
- `templates/builder/from-template.ts`.

**Tests:**
- unit:
  - `tests/unit/builder/from-template.test.ts`;
  - the `blocksFromTemplate` round trip added to `views.test.tsx`;
  - `tests/unit/admin/{palette-actions,nav-registry}.test.ts`;
- DOM: `tests/dom/{pages-list,command-palette}.test.tsx`;
- e2e `tests/e2e/builder.spec.ts` (SP's, CP copy). Every page it creates is deleted in `finally`:
  - an editor creates "Spring clean" → `/admin/pages/custom/<id>`, adds a Stats block, types values, waits for "Saved", publishes, opens `/p/spring-clean` and sees the stats;
  - a second context saving a stale version → conflict dialog → "Reload theirs";
  - a rename → 301 to the new slug;
  - a marketer sees the list read-only with no New page;
  - ⌘K "New page" opens the dialog;
  - "Copy to new page" from Contact creates a page with the four blocks.

**Commit:** `feat: add custom pages list and copy to new page`

---

### Task 10: Copy-identity visual check (master 10.4 part 4; R10-3 layer 2, R10-11)

**Files:** `tests/visual/builder-copy.spec.ts`.

**Tests:**
- the spec passes at both viewports for home, about, services, contact and privacy, with no baseline file written;
- `pnpm test:visual` green: 44 + 4 baselines, plus the copy checks;
- `git status tests/visual/__screenshots__` is clean.

**Commit:** `test: prove copied pages match the fixed pages`

---

## Deferral map (self-review)

| Master item | Task |
|---|---|
| 10.1 `blocks/{define-block,document,fields,media-refs}.ts` ported | 1 |
| 10.1 registry holds exactly the 15 CP `BlockType`s, each rendering the CP component; library test lists them | 2, 4 (R10-2, R10-3) |
| 10.2 `builder_pages` data, service, API; SP's tests including the stale-version 409 | 3 (R10-6) |
| 10.3 the visual fixture renders every block; baselines for `/p/visual-fixture` | 6 (R10-9, R10-10; plus `/p/visual-fixture-home`) |
| 10.3 public render, sitemap, OG, preview | 5 |
| 10.4 builder UI + copy fixed page; E2E create → publish → view | 7, 8, 9, 10 |
| Phase 4: builder keywords, "New page" palette action, Copy to new page, `pages/custom/[id]` | 9, 8 |
| Phase 8: `/p/<slug>` slug check in `resolve.ts` | 5 |
| Phase 8: sitemap inclusion; 19 → 19 + n in `sitemap.test.ts` and `seo.spec.ts` | 5 |
| Phase 8: OG kind `builder` | 5 |
| Phase 8: `BUILDER_ENTITY`/`builderPath` from `lib/schemas/api/builder-pages.ts` | 3 |
| Phase 8: `FIX_BASE.builder` a real route | 8 |
| Phase 8: builder `recordMove` on rename and delete | 3 (R10-8) |
| Phase 8: flip the builder exclusion tests (sitemap, OG route, pages-list) | 5, 9 |
| Phase 9: `/p/[slug]` inside `SiteThemed`; `site-themed-pages.test.ts` expects 10 | 5 |
| Phase 9: builder assistant hooks with `entityType: "builder"`; `"builder"` in `SITE_COPY` | 8 (R10-13) |
| Spec §6.2: library = CP's own sections only (O4) | 2 (R10-2, R10-17) |
| Spec §4 / O5: no visible change to existing pages | every task's visual gate; R10-3 frozen hashes |

## Phase gate

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test && env -u DATABASE_URL -u BETTER_AUTH_SECRET -u BETTER_AUTH_URL pnpm build && pnpm test:visual && pnpm test:e2e
```

Also confirm the gate's checks, against the phase base `beb3b1c`:
- `git grep -n -E "10\.[0-9x]:|Phase 10\.[0-9]|until (Phase )?10|(arrive|arrives|return|returns) (in|with) Phase 10|Phase 10 adds" -- ':!docs' ':!pnpm-lock.yaml'` finds no deferral marker. The only allowed "Phase 10" strings are the four SP-origin ones listed above; list any others that are left.
- `git grep -n "it.todo" -- tests` is empty.
- `git diff beb3b1c -- docs/brief-inventory.json` is empty (the inventory is frozen).
- `git diff --name-status beb3b1c -- tests/visual/__screenshots__` lists exactly four `A` lines (`p-visual-fixture{,-home}-{desktop,mobile}.png`) and no `M` or `D`. The 44 existing baselines are unchanged.
- `git diff beb3b1c -- server/env.ts package.json pnpm-lock.yaml server/db/migrations playwright.config.ts tests/visual/urls.ts tests/visual/public-pages.spec.ts` is empty: no env, deps, migration, or change to the visual contract. `builder_pages` comes from 0018; no `0025` was needed.
- `git diff beb3b1c -- components/home components/about components/services components/contact components/blog` is empty (R10-3).
- `git grep -n -E "Security Partners|security|Static Guarding|Insights" -- blocks templates/builder components/admin/builder tests/visual/builder-fixture.ts tests/e2e/builder.spec.ts tests/e2e/builder-public.spec.ts` is empty.
- The report states:
  - the one SP behavioural difference: the builder assistant hooks (R10-13);
  - the services `layout` field and the shared quote form (R10-4);
  - the second fixture page (R10-9);
  - the blog copy exception (R10-11).

  Cut-over still waits for Phase 11 and the owner (B11).
