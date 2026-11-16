import { Skeleton } from "@/components/ui/skeleton"

// /admin/help: the topics column (help/layout.tsx) around the article.
export const HelpPageSkeleton = () => (
  <div
    role="status"
    aria-busy
    className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]"
  >
    <span className="sr-only">Loading help…</span>
    <div className="hidden flex-col gap-2 lg:flex">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <Skeleton key={i} className="bg-skeleton h-7 rounded-lg" />
      ))}
    </div>
    <div className="flex min-w-0 flex-col gap-6">
      <Skeleton className="bg-skeleton h-10 w-36 rounded-xl lg:hidden" />
      <HelpArticleSkeleton />
    </div>
  </div>
)

// One article (breadcrumb, title, lead, sections) and, on wide screens,
// "On this page": the page's own fallback while the topics column stays.
export const HelpArticleSkeleton = () => (
  <div
    role="status"
    aria-busy
    className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_14rem]"
  >
    <span className="sr-only">Loading article…</span>
    <div className="flex max-w-[70ch] flex-col gap-4">
      <Skeleton className="bg-skeleton h-4 w-48 rounded-md" />
      <Skeleton className="bg-skeleton h-9 w-2/3 rounded-lg" />
      <Skeleton className="bg-skeleton h-16 w-full rounded-lg" />
      {[0, 1].map((i) => (
        <div key={i} className="mt-6 flex flex-col gap-3">
          <Skeleton className="bg-skeleton h-6 w-1/3 rounded-md" />
          <Skeleton className="bg-skeleton h-4 w-full rounded-md" />
          <Skeleton className="bg-skeleton h-4 w-5/6 rounded-md" />
          <Skeleton className="bg-skeleton h-4 w-4/6 rounded-md" />
        </div>
      ))}
    </div>
    <div className="hidden flex-col gap-2 xl:flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="bg-skeleton h-5 rounded-md" />
      ))}
    </div>
  </div>
)
