import Image from "next/image"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

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
    <section className="bg-surface pt-6 pb-0 md:pt-[72px] md:pb-20">
      <Container className="flex flex-col items-start gap-3.5 text-left md:items-center md:gap-6 md:text-center">
        <nav
          aria-label={breadcrumb.ariaLabel}
          data-intro
          data-hero-copy
          className="flex flex-wrap items-center gap-1.5 text-[13px]/[1.5] font-medium text-[#7a8590] md:justify-center md:gap-2.5 md:font-heading md:text-[15px]/[normal] md:text-body"
        >
          <Link
            href={breadcrumb.home.href}
            className="hover:text-navy max-md:hidden"
          >
            {breadcrumb.home.label}
          </Link>
          <span aria-hidden className="text-body/50 max-md:hidden">
            /
          </span>
          <Link href={breadcrumb.blog.href} className="hover:text-navy">
            {breadcrumb.blog.label}
          </Link>
          <span aria-hidden className="text-body/50 max-md:hidden">
            /
          </span>
          <ChevronRightIcon aria-hidden className="size-3.5 md:hidden" />
          <Link
            href={post.categoryHref}
            className="text-navy hover:text-brand md:font-bold"
          >
            {post.category}
          </Link>
        </nav>

        <span
          data-intro
          data-hero-copy
          className="rounded-full bg-[#e6f7fb] px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-[#0e93ad] md:bg-brand/12 md:px-3.5 md:py-1.5 md:font-heading md:text-sm/[normal] md:font-bold md:text-brand"
        >
          {post.category}
        </span>

        <h1
          data-intro
          data-hero-title
          className="max-w-[900px] font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-[56px] md:tracking-normal"
        >
          {post.title}
        </h1>

        <div
          data-intro
          data-hero-copy
          className="flex items-center gap-3 text-left md:gap-3.5"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-white md:size-12">
            <Image src={logo} alt="" width={36} height={32} />
          </div>
          <div className="flex flex-col gap-px md:gap-0.5">
            <p className="font-heading text-[17px]/[1.3] font-bold text-ink md:text-base/[normal]">
              {post.author}
            </p>
            <p className="text-[13px]/[1.5] text-[#7a8590] md:text-sm/[normal] md:text-body">
              <time dateTime={post.date}>{post.displayDate}</time>
              {post.readTime && <>&nbsp;&nbsp;·&nbsp;&nbsp;{post.readTime}</>}
            </p>
          </div>
        </div>

        <div
          data-reveal
          className="relative -mx-5 mt-2.5 h-[230px] w-[calc(100%+40px)] max-w-none shrink-0 overflow-hidden sm:-mx-8 sm:w-[calc(100%+64px)] md:mx-0 md:mt-0 md:h-[560px] md:w-full md:rounded-[28px]"
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
  /** Checklist bullet icon url (settings.microcopy.checkIcon) */
  checkIcon: string
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
  checkIcon,
  tags,
  share,
  author,
  search,
  categories,
  recent,
  quoteCard,
}: ArticleBodyProps) {
  return (
    <section className="bg-white pt-7 pb-10 md:py-20">
      <Container className="grid items-start gap-16 lg:grid-cols-[minmax(0,776px)_1fr]">
        <article className="flex flex-col gap-4 md:gap-5">
          <ArticleBlocks doc={body} checkIcon={checkIcon} />

          <div className="h-px w-full bg-line" />

          <div className="flex flex-col items-start gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-sm/[1.3] font-semibold text-ink md:text-base/[normal] md:font-bold">
                {tags.label}
              </p>
              {tags.items.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#eceff3] px-2.5 py-[5px] text-[13px]/[1.5] font-medium text-body md:bg-surface md:px-3.5 md:py-1.5 md:text-sm/[normal] md:text-navy"
                >
                  {tag}
                </span>
              ))}
            </div>
            <ShareLinks {...share} />
          </div>

          <div className="flex items-center gap-3.5 rounded-[20px] bg-surface p-4 md:gap-5 md:p-7">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white md:size-20">
              <Image
                src={author.logo}
                alt=""
                width={60}
                height={54}
                className="h-10 w-11 object-cover md:h-auto md:w-auto"
              />
            </div>
            <div className="flex flex-col gap-1 md:gap-1.5">
              <p className="font-heading text-[17px]/[1.3] font-bold text-ink md:text-xl/[normal]">
                {author.writtenBy}
              </p>
              <p className="text-[13px] leading-[1.5] text-body md:text-[15px] md:leading-[1.6]">
                {author.bio}
              </p>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6 max-md:hidden lg:sticky lg:top-8">
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
