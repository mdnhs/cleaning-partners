import { ArticleBody, ArticleHeader } from "@/components/blog/article"
import { RelatedPosts } from "@/components/blog/related-posts"
import { Contact } from "@/components/home/contact"
import { PageHero } from "@/components/home/page-hero"
import { SiteFooter } from "@/components/home/site-footer"
import { SiteHeader } from "@/components/home/site-header"
import { HomeMotion } from "@/components/motion/home-motion"
import { SiteLocale } from "@/components/site-locale"

import type { ArticleView, BlogView } from "./view"

/**
 * "/blog". `posts` is passed separately because the initial category and
 * search come from the query string (request data, read inside Suspense by
 * the page).
 */
export function BlogTemplate({
  view,
  posts,
}: {
  view: BlogView
  posts: React.ReactNode
}) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <PageHero {...view.hero} />
            {posts}
            <Contact {...view.contact} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}

/** "/blog/[slug]" */
export function ArticleTemplate({ view }: { view: ArticleView }) {
  return (
    <>
      <HomeMotion>
        <div className="bg-white text-ink">
          <SiteHeader {...view.chrome.header} />
          <main>
            <ArticleHeader {...view.header} />
            <ArticleBody {...view.body} />
            <RelatedPosts {...view.related} />
            <Contact {...view.contact} />
          </main>
          <SiteFooter {...view.chrome.footer} />
        </div>
      </HomeMotion>
      <SiteLocale lang={view.chrome.locale} />
    </>
  )
}
