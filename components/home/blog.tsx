import Link from "next/link"

import { PostCard, type PostCardData } from "@/components/blog/post-card"
import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

export type BlogProps = {
  eyebrow: string
  title: string
  description: string
  viewAll: { label: string; href: string }
  readArticle: string
  posts: PostCardData[]
}

export function Blog({
  eyebrow,
  title,
  description,
  viewAll,
  readArticle,
  posts,
}: BlogProps) {
  return (
    <section id="blog" className="bg-surface py-16 md:py-28">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow={eyebrow}
            title={title}
            description={description}
            className="max-w-[640px]"
          />
          <Link
            href={viewAll.href}
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
            })}
          >
            {viewAll.label}
          </Link>
        </div>

        <ul data-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} readArticle={readArticle} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
