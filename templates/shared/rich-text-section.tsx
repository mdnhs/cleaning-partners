import { Container } from "@/components/home/section-heading"
import type { WithMedia } from "@/lib/media"
import { ArticleBlocks } from "@/lib/rich-text/render"
import type { RichTextDoc } from "@/lib/schemas/common"

/**
 * The legal pages' body section: the article body styles in a single
 * readable column. Shared by the legal template and the builder's text block.
 */
export function RichTextSection({
  doc,
  checkIcon,
}: {
  doc: WithMedia<RichTextDoc>
  checkIcon: string
}) {
  return (
    <section className="bg-white px-6 pt-14 pb-20 md:px-10 lg:pt-20 lg:pb-28">
      <Container>
        <article className="mx-auto flex max-w-[820px] min-w-0 flex-col gap-5">
          <ArticleBlocks doc={doc} checkIcon={checkIcon} />
        </article>
      </Container>
    </section>
  )
}
