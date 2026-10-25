import "server-only"

import type { SettingsKey, SettingsValue } from "@/lib/schemas/settings"
import { DEFAULT_THEME } from "@/lib/theme/schema"

import type { MediaLookup } from "./media"

export type SettingsFixture = { [K in SettingsKey]: SettingsValue<K> }

/**
 * Seed values for every settings key, copied verbatim from the static site
 * (docs/brief-inventory.json and the components). {placeholders} are filled
 * in at render (lib/interpolate.ts), so contact numbers are edited once.
 * Keep dashes, spaces and quotes exactly (the arrows follow two no-break
 * spaces, \u00a0): "Mon–Fri" has no spaces around the
 * en dash, "9am – 6pm" has.
 */
export function settingsFixture(media: MediaLookup): SettingsFixture {
  return {
    site: {
      name: "Cleaning Partners Ltd.",
      legalName: "Cleaning Partners Ltd.",
      logo: media("/images/home/logo.png"),
      logoAlt: "Cleaning Partners",
      logoLarge: media("/images/home/cleaning-partners-logo.png"),
      defaultHeroImage: media("/images/home/hero.png"),
      logoOnDark: null,
      logoAnimation: null,
      favicon: null,
      productionUrl: null,
      timezone: "Europe/Dublin",
      locale: "en",
    },
    contact: {
      phone24h: "(085) 8062369",
      phone24Label: "24hr contact: {phone24h}",
      office: "057 8697670",
      officeExtension: "4",
      mobile: "085 806 2369",
      email: "info@cleaningpartners.ie",
      hours: "Mon–Fri: 9am – 6pm",
      addressLine1: "Derryguile, Mountmellick",
      addressLine2: "Co. Laois, Ireland. R32 YX49",
    },
    navigation: {
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      cta: { label: "Get a Quote", href: "#contact" },
      menuAria: "Open menu",
      breadcrumbHome: "Home",
      breadcrumbHomeHref: "/",
    },
    footer: {
      tagline:
        "The Clean Team. Medical, commercial and domestic cleaning from Mountmellick, Co. Laois.",
      quickLinksTitle: "QUICK LINKS",
      contactTitle: "CONTACT",
      addressLine2: "Co. Laois, R32 YX49",
      contactOfficeLine: "Tel: {office} Ext {officeExtension}",
      groupTitle: "OTHER SERVICES IN THE GROUP",
      copyright: "© 2026 Cleaning Partners Ltd. All rights reserved.",
      privacyLabel: "Privacy Policy",
      privacyHref: "/privacy",
      termsLabel: "Terms",
      termsHref: "/terms",
    },
    "sections.clients": {
      eyebrow: "TRUSTED PARTNERS",
      title: "Who We Work With",
    },
    "sections.whyChooseUs": {
      background: media("/images/home/why-choose-us.png"),
      eyebrow: "CLEANING PARTNERS",
      title: "Why Choose Us?",
      description:
        "We at Cleaning Partners Ltd strive to meet the high standards our clients expect.",
      features: [
        {
          title: "Skilled Cleaners",
          description: "Trained, vetted staff who take pride in their work.",
          icon: media("/images/home/feature-skilled-cleaners.png"),
        },
        {
          title: "Trusted Service",
          description:
            "Long-standing relationships with clients across Ireland.",
          icon: media("/images/home/feature-trusted-service.png"),
        },
        {
          title: "Competitive Price",
          description: "Quality cleaning at a fair, transparent price.",
          icon: media("/images/home/feature-competitive-price.png"),
        },
        {
          title: "Timely",
          description: "On time, every time, working around your schedule.",
          icon: media("/images/home/feature-timely.png"),
        },
      ],
    },
    "sections.testimonials": {
      eyebrow: "TESTIMONIALS",
      title: "What Our Customers Say",
      starsAria: "{rating} out of 5 stars",
      verifiedLabel: "Verified customer",
    },
    "sections.team": {
      background: media("/images/home/meet-the-team.png"),
      eyebrow: "OUR PEOPLE",
      title: "Meet The Team",
      description:
        "The family behind Cleaning Partners, sister company to Security Partners.",
    },
    "sections.contact": {
      eyebrow: "GET IN TOUCH",
      title: "Contact Us",
      infoCards: [
        {
          title: "Phone",
          icon: media("/images/home/phone.svg"),
          lines: [
            "Tel: {office} Ext {officeExtension}",
            "Mobile: {mobile}",
            "24hr contact: {phone24h}",
          ],
        },
        {
          title: "Email",
          icon: media("/images/home/mail.svg"),
          lines: ["{email}"],
        },
        {
          title: "Location",
          icon: media("/images/home/pin.svg"),
          lines: ["{addressLine1},", "{addressLine2}"],
        },
        {
          title: "Office Hours",
          icon: media("/images/home/clock.svg"),
          lines: ["{hours}"],
        },
      ],
      memberLogo: media("/images/home/icca-member.png"),
      memberLogoAlt: "ICCA",
      memberTitle: "Member of the ICCA",
      memberSubtitle: "Irish Contract Cleaning Association",
      socials: [
        {
          label: "Facebook",
          icon: media("/images/home/facebook.png"),
          href: "#",
        },
        {
          label: "Instagram",
          icon: media("/images/home/instagram.png"),
          href: "#",
        },
      ],
      quoteBox: {
        title: "Need a Quote?",
        body: "Tell us about your space and we'll put together a cleaning plan and price that suits you.",
        cta: { label: "Fill the Form", href: "/contact#quote" },
      },
    },
    "sections.map": {
      ariaLabel: "Map showing Cleaning Partners in Mountmellick, Co. Laois",
      tileImagePattern: "/images/home/tiles/tile-{index}.png",
      href: "https://www.google.com/maps/search/?api=1&query=Derryguile%2C+Mountmellick%2C+Co.+Laois%2C+R32+YX49",
      markerLabel: "Cleaning Partners Ltd.",
      pin: media("/images/home/map-pin.svg"),
    },
    "sections.howItWorks": {
      eyebrow: "HOW IT WORKS",
      title: "Simple From Start to Finish",
      steps: [
        {
          title: "Get in touch",
          description:
            "Call us or fill in the quote form and tell us about your facility.",
        },
        {
          title: "Custom schedule",
          description:
            "We work closely with you to customise a cleaning schedule that suits your business.",
        },
        {
          title: "Daily cleans & deep cleans",
          description:
            "Our trained team cleans daily, with a deep clean service on request.",
        },
      ],
    },
    "seo.defaults": {
      title: "Cleaning Partners Ltd. | The Clean Team",
      titleTemplate: "{title} | Cleaning Partners Ltd.",
      description:
        "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
      ogImage: null,
      organization: {
        type: "LocalBusiness",
        streetAddress: "Derryguile",
        addressLocality: "Mountmellick",
        addressRegion: "Co. Laois",
        postalCode: "R32 YX49",
        addressCountry: "IE",
        areaServed: "Ireland",
        sameAs: [],
      },
      robots: "index",
      verification: { google: "", bing: "" },
    },
    consent: {
      title: "We use cookies",
      body: "We use necessary cookies to run this site. With your consent we also use analytics and marketing cookies to understand how the site is used.",
      acceptLabel: "Accept all",
      rejectLabel: "Reject non-essential",
      customiseLabel: "Customise",
      saveLabel: "Save choices",
      manageLabel: "Cookie settings",
      closeLabel: "Close",
      policyLink: { label: "Privacy Policy", href: "/privacy" },
      categories: {
        necessary: {
          label: "Necessary",
          description: "Required for the site to work. Always on.",
        },
        analytics: {
          label: "Analytics",
          description: "Helps us understand how visitors use the site.",
        },
        marketing: {
          label: "Marketing",
          description: "Lets us measure our advertising.",
        },
      },
      version: 1,
      reconsentMonths: 6,
    },
    tracking: {
      enabled: false,
      gtmEnabled: false,
      gtmId: null,
      ga4Enabled: false,
      ga4Id: null,
      metaEnabled: false,
      metaPixelId: null,
    },
    customCode: { disabled: false, allowedHosts: [], snippets: [] },
    microcopy: {
      viewAllPosts: "View All Posts\u00a0\u00a0→",
      viewAllPostsHref: "/blog",
      breadcrumbAria: "Breadcrumb",
      checkIcon: media("/images/services/check.svg"),
      searchIcon: media("/images/blog/search.svg"),
      searchLabel: "Search articles",
      searchPlaceholder: "Search articles…",
      readArticle: "Read Article\u00a0\u00a0→",
      quoteCard: {
        title: "Need a Quote?",
        body: "Tell us about your space and we'll put together a cleaning plan and price that suits you.",
        telLabel: "Tel: {office} Ext {officeExtension}",
        cta: { label: "Get a Free Quote", href: "#contact" },
      },
    },
    leads: {
      recipients: ["info@cleaningpartners.ie"],
      retentionMonths: 24,
      acknowledgement: false,
    },
    // Same value the *_theme migration inserts (no <style> by default).
    theme: DEFAULT_THEME,
  }
}
