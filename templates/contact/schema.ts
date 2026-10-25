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
        extraOption1: text,
        extraOption2: text,
        /** Shown in the enquiry when no service is picked. */
        fallback: text,
      }),
      address: field,
      message: field,
      consent: z.object({ label: text }),
    }),
    chevron: mediaRef,
    submitLabel: text,
    /** {name} is the visitor's name. */
    mailSubject: text,
    /** {email} is the recipient address. */
    sentMessage: text,
  }),
})
export type ContactTemplate = z.infer<typeof contactTemplate>
