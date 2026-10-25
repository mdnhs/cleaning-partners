import type { EditorMeta } from "@/components/admin/schema-form/editor-meta"
import type { EditableSettingsKey } from "@/lib/admin/settings-keys"

const PLACEHOLDER_HELP =
  "Placeholders such as {phone24h} or {office} are filled from Contact details."

/** Editor hints per settings key (labels default to the field name). */
export const settingsEditorMeta: Record<EditableSettingsKey, EditorMeta> = {
  site: {
    fields: {
      name: { label: "Site name" },
      legalName: { label: "Legal name" },
      logo: { label: "Logo", aspect: "square" },
      logoAlt: { label: "Logo description (alt text)", width: "full" },
      logoLarge: {
        label: "Large logo",
        aspect: "square",
        help: "The bigger logo of the home hero and the article page.",
      },
      defaultHeroImage: {
        label: "Default banner image",
        help: "Used by inner pages that do not pick a banner of their own.",
      },
      // Kept in the schema (stored values stay valid) but not edited: the
      // public design has no dark surface with a logo, so the field would
      // have no effect.
      logoOnDark: {
        label: "Logo on dark backgrounds",
        aspect: "square",
        hidden: true,
      },
      logoAnimation: {
        label: "Animated logo (Lottie)",
        aspect: "square",
        mediaKind: "lottie",
        help: "Plays in a loop in the header and footer. The image logo shows while it loads and for visitors who reduce motion.",
      },
      favicon: { label: "Browser tab icon", aspect: "square" },
      productionUrl: {
        label: "Production URL",
        width: "full",
        help: "The live address, e.g. https://www.cleaningpartners.ie. Decides whether this copy of the site counts as production.",
      },
      timezone: { label: "Time zone", help: "IANA name, e.g. Europe/Dublin." },
      locale: {
        label: "Language",
        help: "Language tag of the public site, e.g. en.",
      },
    },
    groups: {
      "": [
        {
          title: "Identity",
          description: "The names the site uses for the company.",
          fields: ["name", "legalName"],
        },
        {
          title: "Logos and images",
          description:
            "Shown in the header, the footer, the hero and the browser tab.",
          fields: [
            "logo",
            "logoAlt",
            "logoLarge",
            "logoOnDark",
            "logoAnimation",
            "favicon",
            "defaultHeroImage",
          ],
        },
        {
          title: "Production URL",
          description: "Where the live site is published.",
          fields: ["productionUrl"],
        },
        {
          title: "Language and time",
          description: "Used for dates, times and the page language.",
          fields: ["timezone", "locale"],
        },
      ],
    },
  },
  contact: {
    fields: {
      phone24h: { label: "24-hour number", icon: "phone" },
      phone24Label: {
        label: "24-hour line text",
        help: "{phone24h} is replaced with the 24-hour number.",
        width: "full",
      },
      office: { label: "Office number", icon: "phone" },
      officeExtension: { label: "Office extension" },
      mobile: { label: "Mobile number", icon: "phone" },
      email: { label: "Main email" },
      hours: { label: "Office hours", icon: "clock", width: "full" },
      addressLine1: { label: "Address line 1", icon: "map" },
      addressLine2: { label: "Address line 2" },
    },
    groups: {
      "": [
        {
          title: "Phone numbers",
          description:
            "Shown in the header, the footer and on the contact page; tel: links are made from them.",
          fields: [
            "phone24h",
            "office",
            "officeExtension",
            "mobile",
            "phone24Label",
          ],
        },
        {
          title: "Email",
          description: "Where people write to you.",
          fields: ["email"],
        },
        {
          title: "Address",
          description: "Your office address.",
          fields: ["addressLine1", "addressLine2"],
        },
        {
          title: "Opening hours",
          description: "Shown next to the office number.",
          fields: ["hours"],
        },
      ],
    },
  },
  navigation: {
    fields: {
      links: {
        label: "Header links",
        itemName: "Link",
        itemLabel: "label",
        help: "Also listed as Quick links in the footer.",
      },
      cta: { label: "Header button" },
      menuAria: {
        label: "Menu button label (screen readers)",
        help: "Not visible; read aloud by assistive technology.",
      },
      breadcrumbHome: { label: "Breadcrumb home text" },
      breadcrumbHomeHref: { label: "Breadcrumb home link" },
    },
    groups: {
      "": [
        {
          title: "Menu",
          description: "The links across the top of every page.",
          fields: ["links"],
        },
        {
          title: "Call to action",
          description: "The highlighted button at the end of the menu.",
          fields: ["cta", "menuAria"],
        },
        {
          title: "Breadcrumbs",
          description: "The first crumb on inner pages.",
          fields: ["breadcrumbHome", "breadcrumbHomeHref"],
        },
      ],
    },
  },
  footer: {
    fields: {
      tagline: {
        label: "Tagline",
        widget: "textarea",
        rows: 3,
        width: "full",
      },
      quickLinksTitle: { label: "Quick links heading" },
      contactTitle: { label: "Contact heading" },
      addressLine2: {
        label: "Address line 2 (footer wording)",
        help: "The footer's own wording of the second address line.",
      },
      contactOfficeLine: {
        label: "Office line",
        help: "{office} and {officeExtension} are filled from Contact details.",
        width: "full",
      },
      groupTitle: { label: "Group heading" },
      copyright: { label: "Copyright line", width: "full" },
      privacyLabel: { label: "Privacy link text" },
      privacyHref: { label: "Privacy link" },
      termsLabel: { label: "Terms link text" },
      termsHref: { label: "Terms link" },
    },
    groups: {
      "": [
        {
          title: "Footer text",
          description: "The tagline and the column headings.",
          fields: ["tagline", "quickLinksTitle", "contactTitle", "groupTitle"],
        },
        {
          title: "Contact column",
          description: "How the address and office number read in the footer.",
          fields: ["addressLine2", "contactOfficeLine"],
        },
        {
          title: "Legal",
          description: "The copyright line and the privacy and terms links.",
          fields: [
            "copyright",
            "privacyLabel",
            "privacyHref",
            "termsLabel",
            "termsHref",
          ],
        },
      ],
    },
  },
  microcopy: {
    fields: {
      viewAllPosts: { label: "“View all posts” text" },
      viewAllPostsHref: { label: "“View all posts” link" },
      breadcrumbAria: {
        label: "Breadcrumb label (screen readers)",
        help: "Not visible; read aloud by assistive technology.",
      },
      checkIcon: { label: "Tick icon", aspect: "square" },
      searchIcon: { label: "Search icon", aspect: "square" },
      searchLabel: { label: "Search label" },
      searchPlaceholder: { label: "Search placeholder" },
      readArticle: { label: "“Read article” text" },
      quoteCard: { label: "Quote card" },
      "quoteCard.title": { label: "Title" },
      "quoteCard.body": {
        label: "Text",
        widget: "textarea",
        rows: 3,
        width: "full",
      },
      "quoteCard.telLabel": {
        label: "Phone line",
        help: "{office} and {officeExtension} are filled from Contact details.",
      },
      "quoteCard.cta": { label: "Button" },
    },
    groups: {
      "": [
        {
          title: "Blog",
          description: "Labels on the blog list and articles.",
          fields: ["viewAllPosts", "viewAllPostsHref", "readArticle"],
        },
        {
          title: "Search",
          description: "The search box labels.",
          fields: ["searchLabel", "searchPlaceholder", "searchIcon"],
        },
        {
          title: "Small labels",
          description: "Icons and screen-reader text used across pages.",
          fields: ["checkIcon", "breadcrumbAria"],
        },
        {
          title: "Quote card",
          description: "The card that invites visitors to ask for a quote.",
          fields: ["quoteCard"],
        },
      ],
    },
  },
  "sections.clients": {
    fields: {
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
    },
    groups: {
      "": [
        {
          title: "Heading",
          description: "Above the strip of client logos.",
          fields: ["eyebrow", "title"],
        },
      ],
    },
  },
  "sections.whyChooseUs": {
    fields: {
      background: { label: "Background image" },
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
      description: {
        label: "Text",
        widget: "textarea",
        rows: 3,
        width: "full",
      },
      features: { label: "Features", itemName: "Feature", itemLabel: "title" },
      "features[].icon": { label: "Icon", aspect: "square" },
      "features[].description": {
        label: "Description",
        widget: "textarea",
        rows: 2,
      },
    },
    groups: {
      "": [
        {
          title: "Text",
          description: "The heading and copy of the section.",
          fields: ["eyebrow", "title", "description"],
        },
        {
          title: "Background",
          description: "The photo behind the section.",
          fields: ["background"],
        },
        {
          title: "Features",
          description: "The reasons, each with an icon.",
          fields: ["features"],
        },
      ],
    },
  },
  "sections.testimonials": {
    fields: {
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
      starsAria: {
        label: "Star rating label (screen readers)",
        help: "{rating} is the testimonial's rating, 1 to 5. Not visible; read aloud by assistive technology.",
        width: "full",
      },
      verifiedLabel: { label: "Verified label" },
    },
    groups: {
      "": [
        {
          title: "Heading",
          description:
            "Above the testimonials (the quotes are under Collections).",
          fields: ["eyebrow", "title"],
        },
        {
          title: "Labels",
          description: "Small text on each testimonial.",
          fields: ["starsAria", "verifiedLabel"],
        },
      ],
    },
  },
  "sections.team": {
    fields: {
      background: { label: "Background image" },
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
      description: {
        label: "Text",
        widget: "textarea",
        rows: 3,
        width: "full",
      },
    },
    groups: {
      "": [
        {
          title: "Text",
          description: "The heading of “Meet the team”.",
          fields: ["eyebrow", "title", "description"],
        },
        {
          title: "Background",
          description: "The photo behind the section.",
          fields: ["background"],
        },
      ],
    },
  },
  "sections.contact": {
    fields: {
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
      infoCards: {
        label: "Contact cards",
        itemName: "Card",
        itemLabel: "title",
        help: PLACEHOLDER_HELP,
      },
      "infoCards[].icon": { label: "Icon", aspect: "square" },
      "infoCards[].lines": {
        label: "Lines",
        itemName: "Line",
      },
      memberLogo: { label: "Membership logo", aspect: "square" },
      memberLogoAlt: { label: "Membership logo description (alt text)" },
      memberTitle: { label: "Membership title" },
      memberSubtitle: { label: "Membership subtitle" },
      socials: {
        label: "Social links",
        itemName: "Link",
        itemLabel: "label",
      },
      "socials[].icon": { label: "Icon", aspect: "square" },
      quoteBox: { label: "Quote box" },
      "quoteBox.title": { label: "Title" },
      "quoteBox.body": {
        label: "Text",
        widget: "textarea",
        rows: 3,
        width: "full",
      },
      "quoteBox.cta": { label: "Button" },
    },
    groups: {
      "": [
        {
          title: "Heading",
          description: "The top of the Contact section.",
          fields: ["eyebrow", "title"],
        },
        {
          title: "Contact cards",
          description: "The cards with numbers, email, address and hours.",
          fields: ["infoCards"],
        },
        {
          title: "Membership",
          description: "The trade association badge.",
          fields: [
            "memberLogo",
            "memberLogoAlt",
            "memberTitle",
            "memberSubtitle",
          ],
        },
        {
          title: "Social links",
          description: "Icons linking to your social profiles.",
          fields: ["socials"],
        },
        {
          title: "Quote box",
          description: "The box that points visitors to the quote form.",
          fields: ["quoteBox"],
        },
      ],
    },
  },
  "sections.map": {
    fields: {
      ariaLabel: {
        label: "Map description (screen readers)",
        help: "Not visible; read aloud by assistive technology.",
        width: "full",
      },
      tileImagePattern: {
        label: "Map tile address",
        help: "{index} is the tile number, 0 to 31.",
        width: "full",
      },
      href: {
        label: "Map link",
        help: "Where the map card links to, e.g. Google Maps.",
        width: "full",
      },
      markerLabel: { label: "Pin label" },
      pin: { label: "Pin icon", aspect: "square" },
    },
    groups: {
      "": [
        {
          title: "Link",
          description: "Where the location card takes visitors.",
          fields: ["href", "ariaLabel"],
        },
        {
          title: "Map image",
          description: "The tiles and the pin drawn on top.",
          fields: ["tileImagePattern", "markerLabel", "pin"],
        },
      ],
    },
  },
  "sections.howItWorks": {
    fields: {
      eyebrow: { label: "Small heading" },
      title: { label: "Heading" },
      steps: { label: "Steps", itemName: "Step", itemLabel: "title" },
      "steps[].description": {
        label: "Description",
        widget: "textarea",
        rows: 2,
      },
    },
    groups: {
      "": [
        {
          title: "Heading",
          description: "Shown on every service page.",
          fields: ["eyebrow", "title"],
        },
        {
          title: "Steps",
          description: "The numbered steps, in order.",
          fields: ["steps"],
        },
      ],
    },
  },
  leads: {
    fields: {
      recipients: {
        label: "Notify these addresses",
        itemName: "Recipient",
        help: "Each new enquiry is emailed to every address.",
      },
      retentionMonths: {
        label: "Keep enquiries for (months)",
        help: "Older enquiries are deleted automatically.",
      },
      acknowledgement: {
        label: "Send an acknowledgement",
        help: "Email the person who sent the enquiry to confirm it arrived.",
        width: "full",
      },
    },
    groups: {
      "": [
        {
          title: "Notifications",
          description: "Who hears about a new enquiry.",
          fields: ["recipients", "acknowledgement"],
        },
        {
          title: "Retention",
          description: "How long enquiries are kept.",
          fields: ["retentionMonths"],
        },
      ],
    },
  },
}
