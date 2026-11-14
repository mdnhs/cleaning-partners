import { NotFoundContent } from "@/components/not-found-content"

// notFound() inside a public page (a missing post, job or service): renders
// in the (site) layout, so the navbar and footer come from there.
export default function SiteNotFound() {
  return <NotFoundContent />
}
