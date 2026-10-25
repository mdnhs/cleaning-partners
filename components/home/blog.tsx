import Link from "next/link"

import { PostCard } from "@/components/blog/post-card"
import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"
import { blogPosts } from "@/lib/blog-posts"

// Home shows the three latest posts after the featured one
const posts = blogPosts.slice(1, 4)

export function Blog() {
  return (
    <section id="blog" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="TIPS & NEWS"
            title="From Our Blog"
            description="Cleaning tips, hygiene advice and news from the Clean Team."
            className="max-w-[640px]"
          />
          <Link
            href="/blog"
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
            })}
          >
            View All Posts&nbsp;&nbsp;→
          </Link>
        </div>

        <ul data-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.title}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
