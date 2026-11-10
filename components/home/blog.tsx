import Link from "next/link"

import {
  PostCard,
  PostCardCompact,
  type PostCardData,
} from "@/components/blog/post-card"
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
    <section id="blog" className="bg-surface py-12 sm:py-16 md:py-28">
      <Container className="flex flex-col gap-4 sm:gap-14">
        <div className="flex flex-col items-start justify-between gap-6 max-md:gap-0 md:flex-row md:items-end">
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
              className: "max-md:hidden",
            })}
          >
            {viewAll.label}
          </Link>
        </div>

        <ul
          data-stagger
          className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <li key={post.slug}>
              {index === 0 ? (
                <PostCard post={post} readArticle={readArticle} />
              ) : (
                <>
                  {/* Phones: a compact row; wider screens: the full card. */}
                  <div className="md:hidden">
                    <PostCardCompact post={post} />
                  </div>
                  <div className="h-full max-md:hidden">
                    <PostCard post={post} readArticle={readArticle} />
                  </div>
                </>
              )}
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
