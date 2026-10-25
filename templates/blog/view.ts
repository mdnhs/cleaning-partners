import type {
  ArticleBodyProps,
  ArticleHeaderProps,
} from "@/components/blog/article"
import type { BlogListProps } from "@/components/blog/blog-list"
import type { PostCardData } from "@/components/blog/post-card"
import type { ContactProps } from "@/components/home/contact"
import type { PageHeroProps } from "@/components/home/page-hero"
import type { SiteSources } from "@/templates/shared/sources"
import {
  articleDates,
  type ChromeView,
  chromeView,
  contactSectionView,
  featuredArticle,
  filterCategories,
  hrefView,
  pageHeroView,
  postCard,
  quoteCardView,
  readTimeView,
  recentPosts,
  viewAllPostsView,
} from "@/templates/shared/views"

export const categoryPath = (name: string) =>
  `/blog?category=${encodeURIComponent(name)}`

export type BlogView = {
  chrome: ChromeView
  hero: PageHeroProps
  /** The list, without ?category= (the page adds it: request data). */
  posts: Omit<BlogListProps, "initialCategory" | "initialQuery">
  contact: ContactProps
}

export function blogView(s: SiteSources): BlogView {
  const page = s.pages.blog.data
  const { microcopy } = s.settings
  const featured = featuredArticle(s)
  return {
    chrome: chromeView(s),
    hero: pageHeroView(s, page.hero),
    posts: {
      posts: s.articles.map((a) => postCard(s, a)),
      featured: featured ? postCard(s, featured) : null,
      categories: filterCategories(s).map((c) => c.name),
      pageSize: page.pageSize,
      labels: {
        all: page.allLabel,
        filterAria: page.filterAria,
        searchLabel: microcopy.searchLabel,
        searchPlaceholder: microcopy.searchPlaceholder,
        featured: page.featuredLabel,
        readArticle: microcopy.readArticle,
        emptyState: page.emptyState,
        paginationAria: page.paginationAria,
        prevAria: page.prevAria,
        prev: page.prevLabel,
        nextAria: page.nextAria,
        next: page.nextLabel,
      },
      searchIcon: microcopy.searchIcon.url,
    },
    contact: contactSectionView(s),
  }
}

export type ArticleView = {
  chrome: ChromeView
  header: ArticleHeaderProps & { article: { slug: string } }
  body: ArticleBodyProps
  related: {
    eyebrow: string
    title: string
    viewAll: { label: string; href: string }
    readArticle: string
    posts: PostCardData[]
  }
  contact: ContactProps
}

/** /blog/[slug]; null for an unknown or unpublished slug (the page then calls notFound()). */
export function articleView(s: SiteSources, slug: string): ArticleView | null {
  const article = s.articles.find((a) => a.slug === slug)
  if (!article) return null
  const page = s.pages.blog.data
  const copy = page.article
  const { site, navigation, microcopy } = s.settings
  const { content } = article
  const category = article.category.name
  const others = s.articles.filter((a) => a.slug !== slug)
  // Same category first, then the newest.
  const related = [
    ...others.filter((a) => a.category.slug === article.category.slug),
    ...others.filter((a) => a.category.slug !== article.category.slug),
  ].slice(0, 3)
  const home = {
    label: navigation.breadcrumbHome,
    href: hrefView(s, navigation.breadcrumbHomeHref),
  }
  return {
    chrome: chromeView(s),
    header: {
      article: {
        slug,
        title: content.title,
        category,
        categoryHref: categoryPath(category),
        ...articleDates(s, article),
        readTime: readTimeView(s, article),
        author: copy.authorName,
        cover: content.cover.url,
      },
      logo: site.logoLarge.url,
      breadcrumb: {
        ariaLabel: microcopy.breadcrumbAria,
        home,
        blog: {
          label: copy.breadcrumbBlog,
          href: hrefView(s, copy.breadcrumbBlogHref),
        },
      },
    },
    body: {
      // An article without a designed body shows its lead (else its excerpt).
      body: content.body ?? {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { variant: "lead" },
            content: [{ type: "text", text: content.lead ?? content.excerpt }],
          },
        ],
      },
      tags: {
        label: copy.tagsLabel,
        items: content.tags.length > 0 ? content.tags : [category],
      },
      share: {
        label: copy.share.label,
        aria: copy.share.aria,
        title: content.title,
        networks: copy.share.networks,
      },
      author: {
        logo: site.logoLarge.url,
        writtenBy: copy.writtenBy,
        bio: copy.authorBio,
      },
      search: {
        action: hrefView(s, copy.searchAction),
        icon: microcopy.searchIcon.url,
        label: microcopy.searchLabel,
        placeholder: microcopy.searchPlaceholder,
      },
      categories: {
        heading: copy.categoriesHeading,
        items: filterCategories(s).map((c) => ({
          name: c.name,
          href: categoryPath(c.name),
          active: c.slug === article.category.slug,
        })),
      },
      recent: {
        heading: copy.recentHeading,
        posts: recentPosts(s, article),
      },
      quoteCard: quoteCardView(s),
    },
    related: {
      eyebrow: copy.related.eyebrow,
      title: copy.related.title,
      viewAll: viewAllPostsView(s),
      readArticle: microcopy.readArticle,
      posts: related.map((a) => postCard(s, a)),
    },
    contact: contactSectionView(s),
  }
}
