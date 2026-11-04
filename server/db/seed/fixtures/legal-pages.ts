import "server-only"

import type { Seo } from "@/lib/schemas/common"
import type { RichTextDoc } from "@/lib/schemas/common"

import type { MediaLookup } from "./media"
import { bulletList, doc, heading2, paragraph } from "./rich-text"

/** A seeded legal page: a hero and a rich-text body (served at /<slug>). */
export type LegalPageFixture = {
  slug: string
  title: string
  seo: Seo
  hero: {
    image: ReturnType<MediaLookup>
    crumb: string
    title: string
    description: string
  }
  body: RichTextDoc
}

/**
 * The two legal pages every site starts with, in footer order. They are
 * ordinary legal pages: editable, reorderable and deletable in the admin.
 */
export function legalPagesFixture(media: MediaLookup): LegalPageFixture[] {
  return [
    {
      slug: "privacy",
      title: "Privacy Policy",
      seo: {},
      hero: {
        image: media("/images/home/hero.png"),
        crumb: "Privacy",
        title: "Privacy Policy",
        description:
          "How Cleaning Partners Ltd. collects, uses and protects your personal information.",
      },
      body: doc(
        paragraph(
          "Cleaning Partners Ltd. respects your privacy. This policy explains what personal information we collect through this website, why we collect it and the choices you have."
        ),
        heading2("Information we collect"),
        paragraph(
          "When you send us a quote request or contact us, we collect the details you give us: your name, phone number, email address, address or Eircode and a description of the space you would like cleaned."
        ),
        paragraph(
          "If you accept analytics or marketing cookies, we also collect information about how you use the site, such as the pages you visit and how you arrived."
        ),
        heading2("How we use it"),
        bulletList(
          "To reply to your enquiry and prepare a quote.",
          "To provide and manage the cleaning services you ask for.",
          "To improve this website and measure how it performs, only with your consent."
        ),
        heading2("Sharing your information"),
        paragraph(
          "We do not sell your personal information. We share it only with the service providers who help us run this website and respond to enquiries, and where the law requires it."
        ),
        heading2("Your rights"),
        paragraph(
          "Under data protection law you can ask to see, correct or delete the personal information we hold about you, and withdraw consent at any time. To do so, email info@cleaningpartners.ie."
        ),
        heading2("Contact us"),
        paragraph(
          "Cleaning Partners Ltd., Derryguile, Mountmellick, Co. Laois, R32 YX49. Email info@cleaningpartners.ie."
        )
      ),
    },
    {
      slug: "terms",
      title: "Terms and Conditions",
      seo: {},
      hero: {
        image: media("/images/home/hero.png"),
        crumb: "Terms",
        title: "Terms and Conditions",
        description: "The terms for using the Cleaning Partners Ltd. website.",
      },
      body: doc(
        paragraph(
          "These terms apply to your use of the Cleaning Partners Ltd. website. By using the site you agree to them."
        ),
        heading2("Using this website"),
        paragraph(
          "The information on this site is for general guidance about our cleaning services. We take care to keep it accurate and up to date, but it is not a contract or an offer."
        ),
        heading2("Quotes and services"),
        paragraph(
          "Prices vary with the size and type of space and how often it is cleaned. Every quote is tailored to you."
        ),
        heading2("Our content"),
        paragraph(
          "The text, images and logos on this site belong to Cleaning Partners Ltd. or are used with permission. Please do not copy or reuse them without asking us first."
        ),
        heading2("Liability"),
        paragraph(
          "We are not responsible for any loss that comes from relying on the general information on this site, or from links to websites we do not run. Nothing here limits any right you have under law."
        ),
        heading2("Contact us"),
        paragraph(
          "Questions about these terms? Email info@cleaningpartners.ie or call us on 057 8697670 Ext 4."
        )
      ),
    },
  ]
}
