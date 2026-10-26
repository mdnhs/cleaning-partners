import "server-only"

import type { Seo } from "@/lib/schemas/common"
import type { PageData, PageKey } from "@/templates/registry"

import type { MediaLookup } from "./media"
import { bulletList, doc, heading2, paragraph, paragraphs } from "./rich-text"

export type PageFixture<K extends PageKey> = { data: PageData<K>; seo: Seo }
export type PagesFixture = { [K in PageKey]: PageFixture<K> }

/**
 * Seed data for the seven fixed pages, verbatim from docs/brief-inventory.json
 * (frozen at 3689369). Strings with {placeholders} are the inventory's `seed`
 * form. The two legal pages are new (no CP source) and are written for CP.
 */
export function pagesFixture(media: MediaLookup): PagesFixture {
  return {
    home: {
      seo: {},
      data: {
        hero: {
          background: media("/images/home/hero.png"),
          title: "Cleaning Partners Ltd.",
          subtitle:
            "The Clean Team. Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
          primaryCta: { label: "Get a Free Quote", href: "#contact" },
          secondaryCta: { label: "Our Services", href: "#services" },
          memberLabel: "Proud member of",
          memberLogo: media("/images/home/icca.png"),
          memberLogoAlt: "Irish Contract Cleaning Association",
        },
        services: {
          imageA: media("/images/home/cleaning-the-counter.png"),
          imageAAlt: "Cleaner wiping down a counter",
          imageB: media("/images/home/vacuuming.png"),
          imageBAlt: "Cleaner vacuuming an office",
          eyebrow: "CHECK OUT",
          title: "Our Services",
          description:
            "Clean as a button! Professional cleaning tailored to your space, delivered by trained and trusted teams.",
          items: [
            {
              title: "Medical Cleaning",
              description:
                "Hygienic, compliant cleaning for clinics and healthcare settings.",
            },
            {
              title: "Commercial Cleaning",
              description:
                "Offices, schools and workplaces kept spotless, on your schedule.",
            },
            {
              title: "Domestic Cleaning",
              description:
                "Reliable home cleaning, from regular visits to deep cleans.",
            },
          ],
          itemIcon: media("/images/home/check.svg"),
          moreText: "and more...",
          cta: { label: "View All Services", href: "/services" },
        },
        blog: {
          eyebrow: "TIPS & NEWS",
          title: "From Our Blog",
          description:
            "Cleaning tips, hygiene advice and news from the Clean Team.",
          count: 3,
        },
      },
    },
    about: {
      seo: {
        description:
          "Over fifteen years of combined experience cleaning homes and businesses across Ireland from our base in Mountmellick, Co. Laois.",
      },
      data: {
        hero: {
          crumb: "About",
          title: "About Us",
          description:
            "We at Cleaning Partners Ltd strive to meet the high standards our clients expect.",
        },
        story: {
          imageA: media("/images/home/cleaning-the-counter.png"),
          imageAAlt: "Cleaner wiping down a bathroom counter",
          imageB: media("/images/home/vacuuming.png"),
          imageBAlt: "Cleaner vacuuming an office",
          eyebrow: "WHO WE ARE",
          title: "About Cleaning Partners",
          paragraphs: paragraphs(
            "With combined experience of over fifteen years, our objective has always been to provide a first-class service to all our customers. Since our establishment, we have greatly expanded and are continuously growing our customer base.",
            "We have a dedicated team of experienced, trained and long-standing staff who clean within a variety of sectors.",
            "Based in the Midlands, in our offices in Derryguile, Mountmellick, Co. Laois. This central hub allows us to provide services to homes and businesses across Ireland."
          ),
          sectorsHeading: "Sectors we clean in",
          sectors: [
            "HSE",
            "County Council",
            "Retail",
            "Commercial",
            "Residential",
          ],
          cta: { label: "Get a Free Quote", href: "#contact" },
        },
        stats: [
          { value: "15+", label: "Years of combined experience" },
          { value: "5", label: "Sectors served, from HSE to residential" },
          { value: "24hr", label: "Contact line: {phone24h}" },
          { value: "Nationwide", label: "Homes and businesses across Ireland" },
        ],
      },
    },
    services: {
      seo: {
        description:
          "Medical, education, commercial and retail cleaning plus ULV fogging for hospitals, GP clinics, schools, offices, shops and homes across Ireland.",
      },
      data: {
        hero: {
          image: media("/images/home/cleaning-the-counter.png"),
          crumb: "Services",
          title: "Our Services",
          description:
            "Cleaning for hospitals, health centres and GP clinics, schools and colleges, offices, shops and homes.",
        },
        grid: {
          eyebrow: "CHECK OUT",
          title: "Clean as a Button!",
          intro:
            "Professional cleaning tailored to your space, delivered by trained and trusted teams. Prices vary, so every quote is tailored to you.",
          priceBadge: "Prices Vary",
          learnMoreAria: "Learn more about {title}",
          learnMore: "Learn More  →",
          quoteCta: { label: "Get A Quote", href: "#contact" },
          helpCard: {
            icon: media("/images/services/icon-help.svg"),
            title: "Not sure what you need?",
            body: "Tell us about your space and we'll put together a cleaning plan and price that suits you.",
            cta: { label: "Contact Us", href: "#contact" },
            callLabel: "Or call {office} Ext {officeExtension}",
          },
        },
        detail: {
          breadcrumbHref: "/services",
          breadcrumbLabel: "Services",
          overviewEyebrow: "SERVICE OVERVIEW",
          includedHeading: "What's Included",
          placesHeading: "Where We Clean",
          sidebarAria: "Our services",
          sidebarHeading: "Our Services",
          officeHours: { title: "Office Hours", hours: "Mon – Fri: 9am – 6pm" },
        },
      },
    },
    blog: {
      seo: {
        description:
          "Cleaning tips, hygiene advice and news from the Clean Team.",
      },
      data: {
        hero: {
          image: media("/images/home/vacuuming.png"),
          crumb: "Blog",
          title: "Our Blog",
          description:
            "Cleaning tips, hygiene advice and news from the Clean Team.",
        },
        featuredArticle: null,
        pageSize: 6,
        allLabel: "All Posts",
        filterAria: "Filter by category",
        featuredLabel: "Featured",
        emptyState:
          "No articles match your search. Try another term or category.",
        paginationAria: "Pagination",
        prevAria: "Previous page",
        prevLabel: "←",
        nextAria: "Next page",
        nextLabel: "→",
        article: {
          breadcrumbBlogHref: "/blog",
          breadcrumbBlog: "Blog",
          authorName: "The Clean Team",
          readTime: "{n} min read",
          tagsLabel: "Tags:",
          writtenBy: "Written by The Clean Team",
          authorBio:
            "Cleaning Partners Ltd. Medical, commercial and domestic cleaning from Mountmellick, Co. Laois.",
          searchAction: "/blog",
          categoriesHeading: "Categories",
          recentHeading: "Recent Posts",
          related: { eyebrow: "KEEP READING", title: "Related Articles" },
          share: {
            label: "Share:",
            aria: "Share on {network}",
            networks: [
              {
                label: "f",
                name: "Facebook",
                url: "https://www.facebook.com/sharer/sharer.php?u={url}",
              },
              {
                label: "in",
                name: "LinkedIn",
                url: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
              },
              {
                label: "X",
                name: "X",
                url: "https://x.com/intent/post?url={url}",
              },
            ],
          },
        },
      },
    },
    contact: {
      seo: {
        description:
          "Get in touch with the Clean Team for a free, no-obligation quote. 24hr contact: {phone24h}.",
      },
      data: {
        hero: {
          crumb: "Contact",
          title: "Contact Us",
          description:
            "Get in touch with the Clean Team for a free, no-obligation quote.",
        },
        contactTitle: "Ways to Reach Us",
        quoteForm: {
          eyebrow: "FREE QUOTE",
          title: "Request a Quote",
          intro:
            "Tell us about your space and we'll put together a cleaning plan and price that suits you.",
          stepsHeading: "What happens next",
          steps: [
            {
              title: "Send your request",
              description:
                "Fill in the form with a few details about your space.",
            },
            {
              title: "We get in touch",
              description:
                "Our team contacts you to talk through what you need.",
            },
            {
              title: "Your custom plan",
              description:
                "We customise a cleaning schedule and price to suit you.",
            },
          ],
          urgentTitle: "Need us urgently?",
          formTitle: "Send us your details",
          fields: {
            name: {
              label: "Full Name",
              placeholder: "John Murphy",
              error: "Please enter your name.",
            },
            phone: {
              label: "Phone Number",
              placeholder: "085 000 0000",
              error: "Please enter a phone number we can reach you on.",
            },
            email: {
              label: "Email Address",
              placeholder: "you@email.com",
              error: "Please enter a valid email address.",
            },
            service: {
              label: "Service Required",
              placeholder: "Select a service",
              extraOptions: ["Domestic Cleaning", "Other"],
              fallback: "Not sure",
              error: "Please choose a service from the list.",
            },
            address: {
              label: "Address / Eircode",
              placeholder: "e.g. Mountmellick, R32 YX49",
              error: "Please check your address or Eircode.",
            },
            message: {
              label: "Tell us about your space",
              placeholder:
                "Type of building, size, how often you need cleaning…",
              error: "Please shorten your message.",
            },
            consent: {
              label: "I agree to be contacted about my enquiry.",
              error: "Please agree to be contacted so we can reply.",
            },
          },
          chevron: media("/images/contact/chevron.svg"),
          submitLabel: "Send Request",
          mailSubject: "Quote request from {name}",
          sentMessage:
            "Thanks, we've received your request and will be in touch shortly. You can also email us at {email}.",
          sendingLabel: "Sending…",
          errorMessage: "Something went wrong. Please try again, or call us.",
          rateLimitedMessage:
            "Too many attempts. Please try again in a few minutes.",
        },
      },
    },
    privacy: {
      seo: {},
      data: {
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
    },
    terms: {
      seo: {},
      data: {
        hero: {
          image: media("/images/home/hero.png"),
          crumb: "Terms",
          title: "Terms and Conditions",
          description:
            "The terms for using the Cleaning Partners Ltd. website.",
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
    },
  }
}
