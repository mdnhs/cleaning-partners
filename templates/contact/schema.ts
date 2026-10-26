import { z } from "zod"

import { mediaRef, pageHeroText, text } from "@/lib/schemas/common"

const field = z.object({ label: text, placeholder: text })

/** Page "contact" (/contact): hero, the info-cards title and the quote form. The info cards and map are settings. */
export const contactTemplate = z.object({
  hero: pageHeroText,
  /** Title of the shared contact section on this page. */
  contactTitle: text,
  quoteForm: z.object({
    eyebrow: text,
    title: text,
    intro: text,
    stepsHeading: text,
    steps: z.array(z.object({ title: text, description: text })).min(1),
    urgentTitle: text,
    formTitle: text,
    fields: z.object({
      name: field,
      phone: field,
      email: field,
      service: field.extend({
        /** Options added after the services collection. */
        extraOptions: z.array(text),
        /** Server-side: written in the notification email when no service is picked. */
        fallback: text,
      }),
      address: field,
      message: field,
      consent: z.object({ label: text }),
    }),
    chevron: mediaRef,
    submitLabel: text,
    /** Server-side: subject of the staff notification. {name} is the visitor's name. */
    mailSubject: text,
    /** Shown after a successful send. {email} is the contact email. */
    sentMessage: text,
    /** Button label while the request is in flight. */
    sendingLabel: text,
    /** Shown when the request fails. */
    errorMessage: text,
    /** Shown when the visitor is rate limited (429). */
    rateLimitedMessage: text,
  }),
})
export type ContactTemplate = z.infer<typeof contactTemplate>
