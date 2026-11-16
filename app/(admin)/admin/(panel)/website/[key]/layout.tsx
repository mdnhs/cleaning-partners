import { WebsiteTabPanel } from "@/components/admin/website/website-tabs"

/**
 * The screen's page (and the parts it opens in place) sit in one panel that
 * fades in on navigation. The pages do the guarding (and 404s).
 */
export default function WebsiteScreenLayout({
  children,
}: LayoutProps<"/admin/website/[key]">) {
  return <WebsiteTabPanel>{children}</WebsiteTabPanel>
}
