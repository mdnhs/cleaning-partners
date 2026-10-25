import Image from "next/image"
import Link from "next/link"

import type { BlogPost } from "@/lib/blog-posts"

export function PostCard({ post }: { post: BlogPost }) {
  return (
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
          <span className="rounded-full bg-brand-soft px-3 py-1.5 font-heading text-[13px]/[normal] font-bold text-brand-deep">
            {post.category}
          </span>
          <time
            dateTime={post.date}
            className="text-[13px]/[normal] font-medium text-subtle"
          >
            {post.displayDate}
          </time>
        </div>
        <h3 className="line-clamp-2 font-heading text-2xl leading-[1.2] font-bold text-ink">
          <Link href={`/blog/${post.slug}`} className="hover:text-navy">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-[15px] leading-[1.6] text-body">
          {post.excerpt}
        </p>
        <Link
          href={`/blog/${post.slug}`}
          className="font-heading text-base/[normal] font-bold text-navy hover:text-brand"
        >
          Read Article&nbsp;&nbsp;→
        </Link>
      </div>
    </article>
  )
}
