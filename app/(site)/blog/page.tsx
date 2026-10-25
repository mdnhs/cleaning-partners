import type { Metadata } from "next"

import { BlogList } from "@/components/blog/blog-list"
import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"

export const metadata: Metadata = {
  title: "Our Blog | Cleaning Partners Ltd.",
  description: "Cleaning tips, hygiene advice and news from the Clean Team.",
}

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const { category, q } = await searchParams
  const initialCategory = typeof category === "string" ? category : undefined
  const initialQuery = typeof q === "string" ? q : undefined

  return (
    <HomeMotion>
      <div className="bg-white text-ink">
        <SiteHeader active="Blog" />
        <main>
          <PageHero
            crumb="Blog"
            title="Our Blog"
            description="Cleaning tips, hygiene advice and news from the Clean Team."
            image="/images/home/vacuuming.png"
          />
          <BlogList
            // Remount when arriving from a sidebar category or search link
            key={`${initialCategory}|${initialQuery}`}
            initialCategory={initialCategory}
            initialQuery={initialQuery}
          />
          <Contact />
        </main>
        <SiteFooter />
      </div>
    </HomeMotion>
  )
}
