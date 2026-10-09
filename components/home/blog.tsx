import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container, SectionHeading } from "@/components/home/section-heading"

const posts = [
  {
    title: "5 Signs Your Office Needs a Professional Clean",
    excerpt:
      "From dusty vents to tired carpets: what to look out for, and how often to book a deep clean.",
    category: "Commercial",
    date: "2026-09-15",
    displayDate: "15 Sep 2026",
    cover: "/images/home/vacuuming.png",
    href: "#blog",
  },
  {
    title: "Infection Control Cleaning in Healthcare Settings",
    excerpt:
      "Why medical cleaning follows stricter standards, and how our teams are trained to meet them.",
    category: "Medical",
    date: "2026-09-02",
    displayDate: "02 Sep 2026",
    cover: "/images/home/cleaning-the-counter.png",
    href: "#blog",
  },
  {
    title: "How to Get Stubborn Stains Out of Curtains",
    excerpt:
      "Our team's advice on fabrics, from red wine spills to everyday marks.",
    category: "Domestic",
    date: "2026-08-20",
    displayDate: "20 Aug 2026",
    cover: "/images/home/blog-curtains.png",
    href: "#blog",
  },
]

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
          <a
            href="#blog"
            className={buttonVariants({
              variant: "outline-navy",
              size: "pill-sm",
            })}
          >
            View All Posts&nbsp;&nbsp;→
          </a>
        </div>

        <ul data-stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.title}>
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0px_10px_30px_0px_rgba(13,38,64,0.06)] transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0px_18px_40px_0px_rgba(13,38,64,0.12)]">
                <div className="relative h-[230px] w-full overflow-hidden">
                  <Image
                    src={post.cover}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-3.5 px-7 pt-7 pb-8">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-brand-soft px-3 py-1.5 font-heading text-[13px] font-bold text-brand-deep">
                      {post.category}
                    </span>
                    <time
                      dateTime={post.date}
                      className="text-[13px] font-medium text-subtle"
                    >
                      {post.displayDate}
                    </time>
                  </div>
                  <h3 className="font-heading text-2xl leading-[1.2] font-bold text-ink">
                    <Link href={post.href} className="hover:text-navy">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-body">
                    {post.excerpt}
                  </p>
                  <Link
                    href={post.href}
                    className="font-heading text-base font-bold text-navy hover:text-brand"
                  >
                    Read Article&nbsp;&nbsp;→
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
