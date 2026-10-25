"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { PostCard, type PostCardData } from "@/components/blog/post-card"
import { Container } from "@/components/home/section-heading"
import { cn } from "@/lib/utils"

const pillBase =
  "flex items-center justify-center rounded-full font-heading font-bold transition-colors"
const pillIdle = "border border-line bg-white text-ink hover:border-navy"
const pillActive = "bg-navy text-white"

// A client component: every string arrives as a prop from the server view.
export type BlogListProps = {
  /** Every article, newest first (the featured one included) */
  posts: PostCardData[]
  /** Shown above the grid while browsing everything; null = none */
  featured: PostCardData | null
  /** Filter names, in order, after the "all" pill */
  categories: string[]
  pageSize: number
  labels: {
    all: string
    filterAria: string
    searchLabel: string
    searchPlaceholder: string
    featured: string
    readArticle: string
    emptyState: string
    paginationAria: string
    prevAria: string
    prev: string
    nextAria: string
    next: string
  }
  searchIcon: string
  initialCategory?: string
  initialQuery?: string
}

export function BlogList({
  posts,
  featured,
  categories: categoryNames,
  pageSize,
  labels,
  searchIcon,
  initialCategory,
  initialQuery = "",
}: BlogListProps) {
  const ALL = labels.all
  const categories = [ALL, ...categoryNames]
  const [category, setCategory] = useState(
    initialCategory && categoryNames.includes(initialCategory)
      ? initialCategory
      : ALL
  )
  const [query, setQuery] = useState(initialQuery)
  const [page, setPage] = useState(1)

  const search = query.trim().toLowerCase()
  const browsing = category === ALL && !search
  const rest = featured ? posts.filter((p) => p.slug !== featured.slug) : posts

  // Featured post sits above the grid only when browsing everything
  const matches = (browsing ? rest : posts).filter(
    (post) =>
      (category === ALL || post.category === category) &&
      (!search ||
        post.title.toLowerCase().includes(search) ||
        post.excerpt.toLowerCase().includes(search))
  )
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  const current = Math.min(page, pageCount)
  const visible = matches.slice((current - 1) * pageSize, current * pageSize)

  return (
    <section id="blog" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex w-full flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div
            role="group"
            aria-label={labels.filterAria}
            className="flex flex-wrap items-start gap-2.5"
          >
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={name === category}
                onClick={() => {
                  setCategory(name)
                  setPage(1)
                }}
                className={cn(
                  pillBase,
                  "px-5 py-2.5 text-[15px]/[normal] font-semibold",
                  name === category ? pillActive : pillIdle
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <label className="flex w-full items-center gap-2.5 rounded-full border border-line bg-white px-5 py-3.5 focus-within:border-navy lg:w-[300px]">
            <Image
              src={searchIcon}
              alt=""
              width={18}
              height={18}
              className="shrink-0"
            />
            <span className="sr-only">{labels.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder={labels.searchPlaceholder}
              className="w-full min-w-0 bg-transparent text-base/[normal] text-ink outline-none placeholder:text-[#8a949e]"
            />
          </label>
        </div>

        {browsing && current === 1 && featured && (
          <article
            data-reveal
            className="flex w-full flex-col overflow-hidden rounded-3xl bg-white lg:flex-row"
          >
            <div className="relative h-[260px] w-full shrink-0 sm:h-[420px] lg:w-[600px]">
              <Image
                src={featured.cover}
                alt=""
                fill
                sizes="(min-width: 1024px) 600px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-[18px] p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-brand px-3.5 py-1.5 font-heading text-[13px]/[normal] font-bold text-white">
                  {labels.featured}
                </span>
                <span className="rounded-full bg-brand/12 px-3.5 py-1.5 font-heading text-[13px]/[normal] font-bold text-brand">
                  {featured.category}
                </span>
                <p className="text-sm/[normal] text-body">
                  <time dateTime={featured.date}>{featured.displayDate}</time>
                  {featured.readTime && (
                    <>&nbsp;&nbsp;·&nbsp;&nbsp;{featured.readTime}</>
                  )}
                </p>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.2] font-bold text-ink md:text-4xl/[1.2]">
                <Link href={featured.href} className="hover:text-navy">
                  {featured.title}
                </Link>
              </h2>
              <p className="text-[17px] leading-[1.65] text-body">
                {featured.excerpt}
              </p>
              <Link
                href={featured.href}
                className="font-heading text-[17px]/[normal] font-bold text-navy hover:text-brand"
              >
                {labels.readArticle}
              </Link>
            </div>
          </article>
        )}

        {visible.length > 0 ? (
          <ul
            data-stagger
            className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} readArticle={labels.readArticle} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-12 text-center text-lg text-body">
            {labels.emptyState}
          </p>
        )}

        <nav
          aria-label={labels.paginationAria}
          className="flex items-center gap-2.5"
        >
          <button
            type="button"
            aria-label={labels.prevAria}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className={cn(
              pillBase,
              pillIdle,
              "size-12 text-base disabled:opacity-40"
            )}
          >
            {labels.prev}
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-current={n === current ? "page" : undefined}
              onClick={() => setPage(n)}
              className={cn(
                pillBase,
                "size-12 text-base",
                n === current ? pillActive : pillIdle
              )}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            aria-label={labels.nextAria}
            disabled={current === pageCount}
            onClick={() => setPage(current + 1)}
            className={cn(
              pillBase,
              pillIdle,
              "size-12 text-base disabled:opacity-40"
            )}
          >
            {labels.next}
          </button>
        </nav>
      </Container>
    </section>
  )
}
