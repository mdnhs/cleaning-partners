import { Fragment, type ReactNode } from "react"
import Image from "next/image"
import type { JSONContent } from "@tiptap/core"

import { isSafeRichTextHref } from "@/lib/href"
import { UNSAFE_HREF_FALLBACK } from "@/lib/interpolate"
import type { WithMedia } from "@/lib/media"
import type {
  InlineNode,
  ParagraphNode,
  RichTextBlock,
  RichTextDoc,
} from "@/lib/schemas/common"

// Server-safe TipTap JSON → React for the public site. Article blocks
// reproduce components/blog/article.tsx's ArticleBody markup exactly
// (R3-4); Phase 5 adds the editor on top of the same JSON.
//
//   paragraph variant "lead"      → lead
//   heading level 2               → h2
//   paragraph                     → p
//   blockquote (attrs.cite)       → quote
//   bulletList variant "checklist"→ checklist

/** Stored docs are valid TipTap content (the editor loads them as is). */
export function toJSONContent(doc: RichTextDoc): JSONContent {
  return doc
}

function withMarks(node: Extract<InlineNode, { type: "text" }>): ReactNode {
  let out: ReactNode = node.text
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>
    else if (mark.type === "italic") out = <em>{out}</em>
    else
      out = (
        <a
          // Validated on write; re-checked so a bad row never renders.
          href={
            isSafeRichTextHref(mark.attrs.href)
              ? mark.attrs.href
              : UNSAFE_HREF_FALLBACK
          }
          className="font-semibold text-navy hover:text-brand hover:underline"
        >
          {out}
        </a>
      )
  }
  return out
}

/**
 * Inline content. A single unmarked text node renders as a bare string, so
 * seeded copy produces exactly the text node the static site rendered.
 */
export function renderInline(nodes: InlineNode[] | undefined): ReactNode {
  if (!nodes?.length) return null
  if (nodes.length === 1 && nodes[0].type === "text" && !nodes[0].marks?.length)
    return nodes[0].text
  return nodes.map((node, i) => (
    <Fragment key={i}>
      {node.type === "hardBreak" ? <br /> : withMarks(node)}
    </Fragment>
  ))
}

/** Several paragraphs inside one element (list items, quotes) separated by line breaks. */
function renderParagraphs(paragraphs: ParagraphNode[]): ReactNode {
  if (paragraphs.length === 1) return renderInline(paragraphs[0].content)
  return paragraphs.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {renderInline(p.content)}
    </Fragment>
  ))
}

function ArticleBlock({ block }: { block: WithMedia<RichTextBlock> }) {
  switch (block.type) {
    case "paragraph":
      return block.attrs?.variant === "lead" ? (
        <p className="text-xl leading-[1.7] text-ink">
          {renderInline(block.content)}
        </p>
      ) : (
        <p className="text-[17px] leading-[1.75] text-body">
          {renderInline(block.content)}
        </p>
      )
    case "heading":
      return block.attrs.level === 2 ? (
        <h2 className="font-heading text-[26px] leading-[1.25] font-bold text-ink md:text-[30px]">
          {renderInline(block.content)}
        </h2>
      ) : (
        <h3 className="font-heading text-[22px] leading-[1.3] font-bold text-ink md:text-[24px]">
          {renderInline(block.content)}
        </h3>
      )
    case "bulletList":
      if (block.attrs?.variant !== "checklist")
        return (
          <ul className="flex list-disc flex-col gap-3 pl-6 text-[17px]/[normal] font-medium text-ink">
            {block.content.map((item, i) => (
              <li key={i}>{renderParagraphs(item.content)}</li>
            ))}
          </ul>
        )
      return (
        <ul className="flex flex-col gap-3">
          {block.content.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <Image
                src="/images/services/check.svg"
                alt=""
                width={24}
                height={24}
                className="shrink-0"
              />
              <span className="text-[17px]/[normal] font-medium text-ink">
                {renderParagraphs(item.content)}
              </span>
            </li>
          ))}
        </ul>
      )
    case "orderedList":
      return (
        <ol
          start={block.attrs?.start}
          className="flex list-decimal flex-col gap-3 pl-6 text-[17px]/[normal] font-medium text-ink"
        >
          {block.content.map((item, i) => (
            <li key={i}>{renderParagraphs(item.content)}</li>
          ))}
        </ol>
      )
    case "blockquote":
      return (
        <figure className="flex gap-5 rounded-[20px] bg-surface px-8 py-7">
          <div aria-hidden className="w-1 shrink-0 rounded-xs bg-brand" />
          <div className="flex flex-col gap-2.5">
            <blockquote className="font-heading text-[22px] leading-[1.4] font-semibold text-ink">
              &ldquo;{renderParagraphs(block.content)}&rdquo;
            </blockquote>
            {block.attrs?.cite && (
              <figcaption className="text-[15px]/[normal] font-medium text-navy">
                — {block.attrs.cite}
              </figcaption>
            )}
          </div>
        </figure>
      )
    case "image":
      return (
        <div className="relative h-64 overflow-hidden rounded-[20px] md:h-[400px]">
          <Image
            src={block.attrs.media.url}
            alt={block.attrs.alt}
            fill
            sizes="(min-width: 1280px) 776px, 100vw"
            className="object-cover"
          />
        </div>
      )
    default:
      // Unknown nodes render nothing.
      return null
  }
}

/** An empty paragraph (no text but whitespace), e.g. the editor's trailing one. */
function isEmptyParagraph(block: { type: string }): boolean {
  if (block.type !== "paragraph") return false
  const content = (block as { content?: { type: string; text?: string }[] })
    .content
  return !content?.some(
    (node) => node.type === "hardBreak" || (node.text ?? "").trim() !== ""
  )
}

/**
 * Article body blocks as siblings in the article column (flex gap-5).
 * Trailing empty paragraphs are skipped: the editor keeps one there so the
 * cursor can move below a final list, quote or image.
 */
export function ArticleBlocks({ doc }: { doc: WithMedia<RichTextDoc> }) {
  let end = doc.content.length
  while (end > 0 && isEmptyParagraph(doc.content[end - 1])) end--
  return doc.content
    .slice(0, end)
    .map((block, i) => <ArticleBlock key={i} block={block} />)
}
