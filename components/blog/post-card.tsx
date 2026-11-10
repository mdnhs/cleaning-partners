import Image from "next/image"
import Link from "next/link"

/** An article as the cards and lists show it (built by templates/shared/views.ts). */
export type PostCardData = {
  slug: string
  /** The article's page */
  href: string
  title: string
  excerpt: string
  category: string
  /** ISO calendar date, for <time dateTime> */
  date: string
  displayDate: string
  cover: string
  /** "5 min read"; null when the article has none */
  readTime: string | null
}

export function PostCard({
  post,
  readArticle,
}: {
  post: PostCardData
  readArticle: string
}) {
  return (
    <article
      data-card="light"
      data-post-card
      className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-[0px_10px_30px_0px_rgba(13,38,64,0.06)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5! hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)] md:rounded-3xl"
    >
      <div className="relative h-[190px] w-full overflow-hidden md:h-[230px]">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-2.5 p-5 md:gap-3.5 md:px-7 md:pt-7 md:pb-8">
        <div className="flex items-center gap-2.5 md:gap-3">
          <span className="rounded-full bg-brand-soft px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-brand-deep md:px-3 md:py-1.5 md:font-heading md:text-[13px]/[normal] md:font-bold">
            {post.category}
          </span>
          <time
            dateTime={post.date}
            className="text-[13px]/[1.5] font-medium text-subtle md:text-[13px]/[normal]"
          >
            {post.displayDate}
          </time>
        </div>
        <h3 className="line-clamp-2 font-heading text-xl leading-[1.25] font-bold text-ink md:text-2xl md:leading-[1.2]">
          <Link href={post.href} className="hover:text-navy">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-[1.55] text-body md:text-[15px] md:leading-[1.6]">
          {post.excerpt}
        </p>
        <Link
          href={post.href}
          className="font-heading text-base/[1.2] font-bold text-navy hover:text-brand md:leading-[normal]"
        >
          {readArticle}
        </Link>
      </div>
    </article>
  )
}

/** The phone's list row: a small picture beside the category, date and title. */
export function PostCardCompact({ post }: { post: PostCardData }) {
  return (
    <article
      data-card="light"
      className="relative flex items-center gap-3.5 rounded-2xl border border-line bg-white p-3"
    >
      <div className="relative size-[88px] shrink-0 overflow-hidden rounded-xl">
        <Image
          src={post.cover}
          alt=""
          fill
          sizes="88px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-brand-soft px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-brand-deep">
            {post.category}
          </span>
          <time dateTime={post.date} className="text-[13px]/[1.5] text-subtle">
            {post.displayDate}
          </time>
        </div>
        <h3 className="line-clamp-3 font-heading text-[17px] leading-[1.3] font-bold text-ink">
          <Link
            href={post.href}
            className="after:absolute after:inset-0 hover:text-navy"
          >
            {post.title}
          </Link>
        </h3>
      </div>
    </article>
  )
}
