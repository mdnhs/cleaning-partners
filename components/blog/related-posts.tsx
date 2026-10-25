import Link from "next/link"

import { PostCard, type PostCardData } from "@/components/blog/post-card"
import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"

export type RelatedPostsProps = {
  eyebrow: string
  title: string
  viewAll: { label: string; href: string }
  readArticle: string
  posts: PostCardData[]
}

export function RelatedPosts({
  eyebrow,
  title,
  viewAll,
  readArticle,
  posts,
}: RelatedPostsProps) {
  return (
    <section className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
            >
              {eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              {title}
            </h2>
          </div>
          <Link
            href={viewAll.href}
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
              className: "px-[22px] py-[11px] text-[15px]/[normal]",
            })}
          >
            {viewAll.label}
          </Link>
        </div>

        <ul data-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((item) => (
            <li key={item.slug}>
              <PostCard post={item} readArticle={readArticle} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
