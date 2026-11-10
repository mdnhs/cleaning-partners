import { PageTransition } from "@/components/motion/page-transition"

export default function SiteTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <PageTransition>{children}</PageTransition>
}
