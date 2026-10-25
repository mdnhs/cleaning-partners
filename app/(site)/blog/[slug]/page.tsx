import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ArticleBody, ArticleHeader } from "@/components/blog/article"
import { RelatedPosts } from "@/components/blog/related-posts"
import { Contact } from "@/components/home/contact"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"
import { blogPosts, getPost } from "@/lib/blog-posts"

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getPost((await params).slug)
  if (!post) return {}
  return {
    title: `${post.title} | Cleaning Partners Ltd.`,
    description: post.excerpt,
  }
}

export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const post = getPost((await params).slug)
  if (!post) notFound()

  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="Blog" />
        <main>
          <ArticleHeader post={post} />
          <ArticleBody post={post} />
          <RelatedPosts post={post} />
          <Contact />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
