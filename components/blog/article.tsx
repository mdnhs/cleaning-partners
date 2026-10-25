import Image from "next/image"
import Link from "next/link"

import { ShareLinks, type ShareLinksProps } from "@/components/blog/share-links"
import { QuoteCard, type QuoteCardProps } from "@/components/home/quote-card"
import { Container } from "@/components/home/section-heading"
import { ArticleBlocks } from "@/lib/rich-text/render"
import type { RichTextDoc } from "@/lib/schemas/common"
import type { WithMedia } from "@/lib/media"
import { cn } from "@/lib/utils"

type Crumb = { label: string; href: string }

export type ArticleHeaderProps = {
  article: {
    title: string
    category: string
    /** /blog filtered to the article's category */
    categoryHref: string
    /** ISO calendar date, for <time dateTime> */
    date: string
    displayDate: string
    /** "5 min read"; null when the article has none */
    readTime: string | null
    author: string
    cover: string
  }
  /** Round author badge (the larger site logo) */
  logo: string
  breadcrumb: { ariaLabel: string; home: Crumb; blog: Crumb }
}

export function ArticleHeader({
  article: post,
  logo,
  breadcrumb,
}: ArticleHeaderProps) {
  return (
    <section className="bg-surface pt-12 pb-16 md:pt-[72px] md:pb-20">
      <Container className="flex flex-col items-center gap-6 text-center">
        <nav
          aria-label={breadcrumb.ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap justify-center gap-2.5 font-heading text-[15px]/[normal] font-medium text-body"
        >
          <Link href={breadcrumb.home.href} className="hover:text-navy">
            {breadcrumb.home.label}
          </Link>
          <span aria-hidden className="text-body/50">
            /
          </span>
          <Link href={breadcrumb.blog.href} className="hover:text-navy">
            {breadcrumb.blog.label}
          </Link>
          <span aria-hidden className="text-body/50">
            /
          </span>
          <Link
            href={post.categoryHref}
            className="font-bold text-navy hover:text-brand"
          >
            {post.category}
          </Link>
        </nav>

        <span
          data-intro
          data-hero-copy
          className="rounded-full bg-brand/12 px-3.5 py-1.5 font-heading text-sm/[normal] font-bold text-brand"
        >
          {post.category}
        </span>

        <h1
          data-intro
          data-hero-title
          className="max-w-[900px] font-heading text-4xl leading-[1.15] font-bold text-ink md:text-[56px]"
        >
          {post.title}
        </h1>

        <div
          data-intro
          data-hero-copy
          className="flex items-center gap-3.5 text-left"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-white">
            <Image src={logo} alt="" width={36} height={32} />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-heading text-base/[normal] font-bold text-ink">
              {post.author}
            </p>
            <p className="text-sm/[normal] text-body">
              <time dateTime={post.date}>{post.displayDate}</time>
              {post.readTime && <>&nbsp;&nbsp;·&nbsp;&nbsp;{post.readTime}</>}
            </p>
          </div>
        </div>

        <div
          data-reveal
          className="relative h-[280px] w-full overflow-hidden rounded-[28px] md:h-[560px]"
        >
          <Image
            src={post.cover}
            alt=""
            fill
            sizes="(min-width: 1440px) 1200px, 100vw"
            className="object-cover"
            preload
          />
        </div>
      </Container>
    </section>
  )
}

function SidebarCard({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-line bg-white p-7",
        className
      )}
    >
      <h2 className="font-heading text-[22px]/[normal] font-bold text-ink">
        {title}
      </h2>
      {children}
    </div>
  )
}

export type ArticleBodyProps = {
  /** The TipTap body, or the excerpt as a lead paragraph (built by the view) */
  body: WithMedia<RichTextDoc>
  tags: { label: string; items: string[] }
  share: ShareLinksProps
  author: { logo: string; writtenBy: string; bio: string }
  search: {
    action: string
    icon: string
    label: string
    placeholder: string
  }
  categories: {
    heading: string
    items: { name: string; href: string; active: boolean }[]
  }
  recent: {
    heading: string
    posts: {
      slug: string
      href: string
      title: string
      cover: string
      date: string
      displayDate: string
    }[]
  }
  quoteCard: QuoteCardProps
}

export function ArticleBody({
  body,
  tags,
  share,
  author,
  search,
  categories,
  recent,
  quoteCard,
}: ArticleBodyProps) {
  return (
    <section className="bg-white py-16 md:py-20">
      <Container className="grid items-start gap-16 lg:grid-cols-[minmax(0,776px)_1fr]">
        <article className="flex flex-col gap-5">
          <ArticleBlocks doc={body} />

          <div className="h-px w-full bg-line" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-base/[normal] font-bold text-ink">
                {tags.label}
              </p>
              {tags.items.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface px-3.5 py-1.5 text-sm/[normal] font-medium text-navy"
                >
                  {tag}
                </span>
              ))}
            </div>
            <ShareLinks {...share} />
          </div>

          <div className="flex items-center gap-5 rounded-[20px] bg-surface p-7">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white">
              <Image src={author.logo} alt="" width={60} height={54} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-heading text-xl/[normal] font-bold text-ink">
                {author.writtenBy}
              </p>
              <p className="text-[15px] leading-[1.6] text-body">
                {author.bio}
              </p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8">
          <form
            action={search.action}
            role="search"
            className="flex items-center gap-2.5 rounded-full border border-line bg-white px-5 py-3.5 focus-within:border-navy"
          >
            <Image
              src={search.icon}
              alt=""
              width={18}
              height={18}
              className="shrink-0"
            />
            <label htmlFor="article-search" className="sr-only">
              {search.label}
            </label>
            <input
              id="article-search"
              type="search"
              name="q"
              placeholder={search.placeholder}
              className="w-full min-w-0 bg-transparent text-base/[normal] text-ink outline-none placeholder:text-[#8a949e]"
            />
          </form>

          <SidebarCard title={categories.heading} className="gap-2">
            {categories.items.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-4 py-3 font-heading text-base/[normal] font-semibold transition-colors",
                  category.active
                    ? "bg-brand text-white"
                    : "bg-surface text-ink hover:bg-brand-soft"
                )}
              >
                {category.name}
                <span
                  aria-hidden
                  className={cn(
                    "font-bold transition-transform group-hover:translate-x-1",
                    !category.active && "text-navy"
                  )}
                >
                  →
                </span>
              </Link>
            ))}
          </SidebarCard>

          <SidebarCard title={recent.heading} className="gap-[18px]">
            {recent.posts.map((item) => (
              <Link
                key={item.slug}
                href={item.href}
                className="group flex items-center gap-3.5"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-[14px]">
                  <Image
                    src={item.cover}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="font-heading text-base leading-[1.3] font-bold text-ink group-hover:text-navy">
                    {item.title}
                  </p>
                  <time
                    dateTime={item.date}
                    className="text-[13px]/[normal] text-body"
                  >
                    {item.displayDate}
                  </time>
                </div>
              </Link>
            ))}
          </SidebarCard>

          <QuoteCard {...quoteCard} />
        </aside>
      </Container>
    </section>
  )
}
