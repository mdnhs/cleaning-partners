import Link from "next/link"

import { PostCard } from "@/components/blog/post-card"
import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/home/section-heading"
import { blogPosts, type BlogPost } from "@/lib/blog-posts"

export function RelatedPosts({ post }: { post: BlogPost }) {
  const others = blogPosts.filter((p) => p.slug !== post.slug)
  // Same category first, then newest
  const related = [
    ...others.filter((p) => p.category === post.category),
    ...others.filter((p) => p.category !== post.category),
  ].slice(0, 3)

  return (
    <section className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p
              data-reveal
              className="font-heading text-[15px]/[normal] font-bold tracking-[1.5px] text-brand"
            >
              KEEP READING
            </p>
            <h2
              data-split
              className="font-heading text-4xl leading-[1.15] font-bold text-ink md:text-5xl"
            >
              Related Articles
            </h2>
          </div>
          <Link
            href="/blog"
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
              className: "px-[22px] py-[11px] text-[15px]/[normal]",
            })}
          >
            View All Posts&nbsp;&nbsp;→
          </Link>
        </div>

        <ul data-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <li key={item.slug}>
              <PostCard post={item} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
