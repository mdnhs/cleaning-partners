import {
  type Attributes,
  Extension,
  type Extensions,
  type JSONContent,
  mergeAttributes,
  Node,
  type NodeViewRenderer,
} from "@tiptap/core"
import { Blockquote } from "@tiptap/extension-blockquote"
import { Link } from "@tiptap/extension-link"
import { ListItem, OrderedList } from "@tiptap/extension-list"
import { Plugin } from "@tiptap/pm/state"
import { StarterKit } from "@tiptap/starter-kit"

import { isSafeRichTextHref } from "@/lib/href"
import { isUuid } from "@/lib/ids"

// The editor's schema is exactly what lib/schemas/common.ts accepts and
// lib/rich-text/render.tsx renders (spec §5.3): paragraph, h2/h3, bullet and
// ordered lists of paragraphs, blockquote (with cite) of paragraphs, image
// (media ref + alt), hard break, bold, italic, link. Anything else pasted in
// is dropped or flattened by ProseMirror's schema. Node and mark attributes
// are limited to the stored ones too, so `getJSON()` is already in the shape
// the API saves (no editor-only attrs that a save round trip would strip).

/** "full": articles and legal pages; "paragraphs": about copy, service overview. */
export type RichTextMode = "full" | "paragraphs"

/** attrs: { media: { mediaId }, alt } — same shape the renderer reads. */
export const MediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      media: {
        default: null,
        parseHTML: (element) => {
          const mediaId = element.getAttribute("data-media-id")
          return mediaId ? { mediaId } : null
        },
        renderHTML: (attrs) =>
          attrs.media ? { "data-media-id": attrs.media.mediaId } : {},
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("alt") ?? "",
        renderHTML: (attrs) => ({ alt: attrs.alt }),
      },
    }
  },
  // Only library images survive a paste; arbitrary <img src> is dropped.
  parseHTML() {
    return [
      {
        tag: "img[data-media-id]",
        getAttrs: (element) =>
          isUuid(element.getAttribute("data-media-id")) ? null : false,
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)]
  },
})

/**
 * CP's two stored variants (R4-2): `paragraph.attrs.variant: "lead"` (the
 * article's opening paragraph) and `bulletList.attrs.variant: "checklist"`
 * (the tick list). Global attributes: parseHTML/renderHTML round-trip them
 * through the DOM (paste, drag), `default: null` is the plain node. Only the
 * "full" mode has them; "paragraphs" has no such attribute, so a loaded
 * variant is dropped by ProseMirror's schema and never saved.
 * `getJSON()` writes the null default out, so saves go through
 * `normalizeRichTextDoc` (the stored schema allows the key or nothing).
 */
export const VariantAttributes = Extension.create({
  name: "variantAttributes",
  addGlobalAttributes() {
    const variant = (value: string) => ({
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.getAttribute("data-variant") === value ? value : null,
      renderHTML: (attrs: Record<string, unknown>) =>
        attrs.variant === value ? { "data-variant": value } : {},
    })
    return [
      { types: ["paragraph"], attributes: { variant: variant("lead") } },
      { types: ["bulletList"], attributes: { variant: variant("checklist") } },
    ]
  },
})

/**
 * Drops attributes that carry no information from `getJSON()` output: a
 * `variant: null` (and the then-empty `attrs`), so a plain paragraph is
 * saved as `{ type: "paragraph" }` and the stored JSON equals what was
 * loaded. Other attrs (heading level, list start, cite, image) are kept
 * as the editor emits them.
 */
export function normalizeRichTextDoc<T extends JSONContent>(node: T): T {
  const { attrs, content, ...rest } = node
  let nextAttrs = attrs
  if (attrs && "variant" in attrs && attrs.variant == null) {
    nextAttrs = Object.fromEntries(
      Object.entries(attrs).filter(([key]) => key !== "variant")
    )
  }
  return {
    ...rest,
    ...(nextAttrs && Object.keys(nextAttrs).length > 0
      ? { attrs: nextAttrs }
      : {}),
    ...(content ? { content: content.map(normalizeRichTextDoc) } : {}),
  } as T
}

/** List items hold paragraphs only (no nested lists). */
const ParagraphListItem = ListItem.extend({ content: "paragraph+" })

/** Ordered list with only the `start` the renderer uses (no list-style `type`). */
const StartOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      // The stored schema needs an integer ≥ 1; pasted 0, negatives or junk
      // start at 1.
      start: {
        default: 1,
        parseHTML: (element) => {
          const start = Number(element.getAttribute("start") ?? 1)
          return Number.isInteger(start) && start >= 1 ? start : 1
        },
      },
    }
  },
  // Typing "0. " (input rule) or pasting a list numbered from 0 would set
  // start 0; the stored schema needs ≥ 1, so every transaction is fixed up.
  addProseMirrorPlugins() {
    const type = this.type
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null
          const tr = state.tr
          state.doc.descendants((node, pos) => {
            const start = node.attrs.start as unknown
            if (
              node.type === type &&
              !(Number.isInteger(start) && (start as number) >= 1)
            )
              tr.setNodeAttribute(pos, "start", 1)
          })
          return tr.docChanged ? tr : null
        },
      }),
    ]
  },
})

/** Blockquote of paragraphs with an optional cite (the article quote design). */
const CiteBlockquote = Blockquote.extend({
  content: "paragraph+",
  addAttributes() {
    return {
      cite: {
        default: null,
        parseHTML: (element) => element.getAttribute("cite"),
        renderHTML: (attrs) => (attrs.cite ? { cite: attrs.cite } : {}),
      },
    }
  },
})

/**
 * Link mark storing `href` only (the renderer sets its own markup). Hrefs:
 * /path, #anchor, http(s), tel:, mailto: — rich text is not interpolated,
 * so anything with "{" or "}" would reach the site literally and is refused.
 */
const HrefLink = Link.extend({
  addAttributes() {
    const parent = (this.parent?.() ?? {}) as Partial<Attributes>
    return { href: parent.href ?? { default: null } }
  },
}).configure({
  openOnClick: false,
  autolink: true,
  defaultProtocol: "https",
  isAllowedUri: (url, ctx) =>
    ctx.defaultValidate(url) && isSafeRichTextHref(url),
})

/**
 * Extensions for one editor mode. `imageView` lets the admin editor render
 * library images through React (thumbnail lookup); headless use (tests,
 * Phase 5 paste checks) omits it.
 */
export function richTextExtensions(
  mode: RichTextMode,
  options: { imageView?: NodeViewRenderer } = {}
): Extensions {
  const common = {
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    listItem: false,
    orderedList: false,
    blockquote: false,
    link: false,
    // A trailing empty paragraph would be saved and rendered on the site;
    // the gap cursor lets authors type after a final image instead.
    trailingNode: false,
  } as const
  if (mode === "paragraphs")
    return [
      StarterKit.configure({
        ...common,
        heading: false,
        bulletList: false,
        listKeymap: false,
      }),
      HrefLink,
    ]
  const image = options.imageView
    ? MediaImage.extend({ addNodeView: () => options.imageView! })
    : MediaImage
  return [
    StarterKit.configure({ ...common, heading: { levels: [2, 3] } }),
    VariantAttributes,
    HrefLink,
    ParagraphListItem,
    StartOrderedList,
    CiteBlockquote,
    image,
  ]
}
