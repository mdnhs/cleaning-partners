import Link from "next/link"

import {
  PostCard,
  PostCardCompact,
  type PostCardData,
} from "@/components/blog/post-card"
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
    <section className="bg-surface py-12 md:py-28">
      <Container className="flex flex-col gap-4 md:gap-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="flex max-w-[640px] flex-col gap-2 md:gap-3">
            <p
              data-reveal
              className="font-heading text-xs/[1.2] font-bold tracking-[1.44px] text-brand md:text-[15px]/[normal] md:tracking-[1.5px]"
            >
              {eyebrow}
            </p>
            <h2
              data-split
              className="font-heading text-[28px] leading-[1.15] font-bold tracking-[-0.084px] text-ink md:text-5xl md:tracking-normal"
            >
              {title}
            </h2>
          </div>
          <Link
            href={viewAll.href}
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
              className:
                "px-[22px] py-[11px] text-[15px]/[normal] max-md:hidden",
            })}
          >
            {viewAll.label}
          </Link>
        </div>

        <ul className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {posts.map((item) => (
            <li key={item.slug}>
              <div className="md:hidden">
                <PostCardCompact post={item} />
              </div>
              <div className="h-full max-md:hidden">
                <PostCard post={item} readArticle={readArticle} />
              </div>
            </li>
          ))}
        </ul>

        <Link
          href={viewAll.href}
          className={buttonVariants({
            variant: "outline-navy",
            size: "pill",
            className: "w-full md:hidden",
          })}
        >
          {viewAll.label}
        </Link>
      </Container>
    </section>
  )
}
