import "server-only"

import type { PageFixture } from "./pages"
import type { MediaLookup } from "./media"

const f = (label: string, placeholder = "", help = "") => ({
  label,
  placeholder,
  help,
})
const tel = { label: "(085) 806 2369", href: "tel:+353858062369" }
const mail = {
  label: "jobs@cleaningpartners.ie",
  href: "mailto:jobs@cleaningpartners.ie",
}

/**
 * Page "careers": the words of Figma nodes 496:16 (careers), 497:285 (job)
 * and 498:285 (application). Select options the design leaves closed (hours,
 * years, experience, how you heard) are written for CP.
 */
export function careersPageFixture(media: MediaLookup): PageFixture<"careers"> {
  return {
    seo: {},
    data: {
      hero: {
        crumb: "Careers",
        title: "Careers",
        description:
          "Join the Clean Team — steady hours, paid training and a friendly local team across the Midlands.",
      },
      why: {
        eyebrow: "WHY JOIN US",
        title: "Why Work With The Clean Team",
        description:
          "We look after our people the way we look after our clients — with care, respect and reliable support.",
        cards: [
          {
            title: "Paid Training",
            description:
              "Manual Handling, Infection Prevention & Control and chemical safety certs — all paid for, from day one.",
            icon: media("/images/careers/training.svg"),
          },
          {
            title: "Weekly Pay",
            description:
              "Paid every Friday by bank transfer, with rosters issued two weeks in advance.",
            icon: media("/images/careers/pay.svg"),
          },
          {
            title: "Uniform & Equipment",
            description:
              "Full uniform, PPE and professional-grade equipment provided on every site.",
            icon: media("/images/careers/uniform.svg"),
          },
          {
            title: "Room to Grow",
            description:
              "A clear path from Cleaning Operative to Team Lead and Site Supervisor.",
            icon: media("/images/careers/growth.svg"),
          },
        ],
      },
      open: {
        eyebrow: "NOW HIRING",
        title: "Open Positions",
        intro:
          "Find a role that suits your hours and location. New positions are added every week.",
        countLabel: "{count} open roles",
        searchPlaceholder: "Search by job title or keyword",
        allLocations: "All Locations",
        allTypes: "All Job Types",
        allRoles: "All Roles ({count})",
        openPill: "Open",
        postedLabel: "Posted {ago}",
        viewJob: "View Job",
        emptyText:
          "No open roles match your search. Try another location or job type, or send us your CV below.",
      },
      previous: {
        eyebrow: "CLOSED ROLES",
        title: "Previous Openings",
        intro:
          "These positions have now been filled. Join our talent pool below to hear about similar roles first.",
        closedPill: "Closed",
        closedOn: "Closed on {date}",
        filled: "Position Filled",
      },
      process: {
        eyebrow: "HOW IT WORKS",
        title: "Our Hiring Process",
        intro:
          "From application to your first shift — usually within two weeks.",
        steps: [
          {
            title: "Apply Online",
            description:
              "Takes about 5 minutes — just your details, availability and CV.",
          },
          {
            title: "Quick Phone Chat",
            description:
              "Our recruitment team calls to talk through hours, location and experience.",
          },
          {
            title: "Interview & Vetting",
            description:
              "A short, friendly interview, two references and Garda vetting where required.",
          },
          {
            title: "Paid Induction",
            description:
              "Complete your induction and certified training before your first shift.",
          },
        ],
      },
      talentPool: {
        eyebrow: "TALENT POOL",
        title: "Don’t see the right role?",
        body: "Send us your CV and we’ll be in touch when a role near you opens up. We hire across Laois, Offaly, Kildare and Westmeath all year round.",
        cta: { label: "Send Us Your CV", href: "/careers/apply" },
        call: { label: "Call (085) 806 2369", href: tel.href },
      },
      job: {
        nowHiring: "Now Hiring",
        applyNow: "Apply Now",
        saveJob: "Save Job",
        savedJob: "Saved",
        aboutTitle: "About the Role",
        responsibilitiesTitle: "Key Responsibilities",
        lookingForTitle: "What We’re Looking For",
        essentialTitle: "Essential",
        requiredPill: "Required",
        desirableTitle: "Desirable",
        nicePill: "Nice to have",
        offerTitle: "What We Offer",
        equalOpportunities:
          "Cleaning Partners is an equal opportunities employer. We welcome applications from everyone regardless of gender, civil or family status, sexual orientation, religion, age, disability, race or membership of the Traveller community. If you need any reasonable accommodation during the recruitment process, just let us know.",
        summaryTitle: "Job Summary",
        summaryLabels: {
          reference: "Job Reference",
          location: "Location",
          type: "Job Type",
          hours: "Hours",
          pay: "Pay",
          start: "Start Date",
          closing: "Closing Date",
        },
        applyForJob: "Apply for This Job",
        share: "Share this job",
        linkCopied: "Link copied",
        questionsTitle: "Questions about this role?",
        questionsBody: "Talk to our Recruitment Team — we’re happy to help.",
        phone: tel,
        email: mail,
        beforeTitle: "Before You Apply",
        beforeIntro: "Have these ready to make applying quick:",
        beforeItems: [
          "Your contact details and Eircode",
          "Proof of your right to work in Ireland",
          "Your availability and preferred hours",
          "An up-to-date CV (optional but helpful)",
        ],
        similarEyebrow: "MORE OPPORTUNITIES",
        similarTitle: "Similar Roles",
        viewAll: "View All Jobs",
        closedNotice:
          "This role has closed and is no longer taking applications. See our open roles, or send us your CV for future openings.",
      },
      apply: {
        crumb: "Apply",
        title: "Apply for This Role",
        talentPoolTitle: "Send Us Your CV",
        subtitle: "{title} · {location} · Ref {reference}",
        talentPoolSubtitle:
          "Tell us about yourself and we’ll be in touch when a role near you opens up.",
        back: "Back to job details",
        formTitle: "Application Form",
        formIntro:
          "It only takes about 5 minutes. Fields marked * are required. No experience needed — full training is provided.",
        sections: {
          personal: {
            title: "Personal Details",
            description: "How we can contact you about your application.",
          },
          eligibility: {
            title: "Eligibility & Vetting",
            description:
              "Required for all roles, and for healthcare sites in particular.",
          },
          availability: {
            title: "Availability",
            description:
              "Tell us when you can work so we can match you to the right roster.",
          },
          experience: {
            title: "Experience & Training",
            description: "Experience is a bonus, not a must.",
          },
          cv: {
            title: "CV & Cover Note",
            description: "A CV helps, but it’s optional for operative roles.",
          },
          consent: {
            title: "Declaration & Consent",
            description: "Please read and confirm before you submit.",
          },
        },
        fields: {
          firstName: f("First Name", "e.g. Mary"),
          surname: f("Surname", "e.g. Kelly"),
          email: f("Email Address", "you@email.com"),
          phone: f("Mobile Number", "085 000 0000"),
          address: f("Address", "Street address"),
          town: f("Town / County", "e.g. Portlaoise, Co. Laois"),
          eircode: f("Eircode", "e.g. R32 YX49"),
          rightToWork: f(
            "Which best describes your permission to work in Ireland?",
            "",
            "We’ll ask to see proof of your permission at interview — you don’t need to upload documents now."
          ),
          permissionExpiry: f(
            "Permission Expiry Date (if applicable)",
            "DD / MM / YYYY"
          ),
          gardaVetting: f(
            "Some of our sites need Garda vetting. Are you willing to complete Garda vetting?"
          ),
          livedAbroad: f(
            "Have you lived outside Ireland for 6 months or more since the age of 16?",
            "",
            "If yes, we’ll ask for a police clearance certificate from that country as part of vetting."
          ),
          startDate: f("Earliest Start Date", "DD / MM / YYYY"),
          hoursPerWeek: f("Hours per Week", "Select hours"),
          shifts: f("Which shifts can you work?"),
          transport: f(
            "Do you have a full driving licence and access to transport?"
          ),
          experience: f("Cleaning Experience", "Select years"),
          healthcareExperience: f(
            "Healthcare Cleaning Experience",
            "Select an option"
          ),
          recentRole: f(
            "Most Recent Employer & Role",
            "e.g. Office Cleaner at ABC Facilities, 2024–2026"
          ),
          certificates: f(
            "Certificates you hold (optional)",
            "",
            "Don’t have these yet? No problem — we provide full paid training for all certificates before your first shift."
          ),
          cv: f("Upload Your CV (optional)"),
          note: f(
            "Anything else you’d like us to know?",
            "e.g. the hours that suit you best, or any experience not on your CV…"
          ),
          heardAbout: f("How did you hear about this job?", "Select an option"),
        },
        options: {
          rightToWork: [
            "Irish or UK citizen",
            "EU / EEA / Swiss citizen",
            "Stamp 4 or Stamp 5",
            "Stamp 1G (Graduate)",
            "Stamp 1 (Employment Permit)",
            "Stamp 2 (Student – up to 20 hrs in term)",
          ],
          hours: [
            "Up to 10 hours",
            "10–20 hours",
            "20–30 hours",
            "30–39 hours",
            "Full-time (39 hours)",
          ],
          years: [
            "No experience yet",
            "Less than 1 year",
            "1–2 years",
            "3–5 years",
            "More than 5 years",
          ],
          healthcare: [
            "None",
            "Less than 1 year",
            "1–2 years",
            "More than 2 years",
          ],
          shifts: [
            "Early mornings (6am–11am)",
            "Daytime (9am–5pm)",
            "Evenings (5pm–10pm)",
            "Weekends",
            "Bank holidays",
            "Flexible / cover shifts",
          ],
          certificates: [
            "Manual Handling",
            "Infection Prevention & Control",
            "HSELanD Hand Hygiene",
            "Chemical Safety (COSHH)",
            "Safe Pass",
            "First Aid Responder (FAR)",
          ],
          heardAbout: [
            "Our website",
            "Indeed",
            "Facebook or Instagram",
            "A friend or family member",
            "A sign or poster",
            "Other",
          ],
        },
        yes: "Yes",
        no: "No",
        required: "*",
        selectPlaceholder: "Select an option",
        cvDrop: "Drag & drop your CV here, ",
        cvBrowse: "or browse files",
        cvHelp: "PDF, DOC or DOCX · Max 5MB",
        declaration:
          "I confirm that the information in this application is true and complete.",
        privacy:
          "I agree to Cleaning Partners processing my personal data for this application, including reference and vetting checks, in line with the Privacy Notice.",
        keepOnFile:
          "Keep my details on file for 12 months and contact me about future roles.",
        equalOpportunities:
          "Cleaning Partners is an equal opportunities employer. We do not ask for your age, date of birth, marital or family status. If you need any reasonable accommodation during the process, please let us know above.",
        submit: "Submit Application",
        next: "Continue",
        sending: "Sending…",
        privacyNote:
          "Your information is encrypted and handled in line with GDPR.",
        success: {
          title: "Thank you — your application is in",
          body: "We’ve received your application and will be in touch, usually within 3 working days. A confirmation has been sent to your email.",
        },
        errors: {
          required: "Please fill in this field.",
          invalidEmail: "Enter a valid email address.",
          cvType: "Upload a PDF, DOC or DOCX file.",
          cvSize: "Your CV can be up to 5 MB.",
          closed:
            "This role has just closed and is no longer taking applications.",
          rateLimited:
            "Too many attempts. Please try again in a few minutes, or call us.",
          generic:
            "Something went wrong sending your application. Please try again, or call us.",
        },
        sidebar: {
          applyingFor: "YOU’RE APPLYING FOR",
          viewJob: "View job details",
          nextTitle: "What Happens Next",
          nextSteps: [
            {
              title: "We review your application",
              description: "Usually within 3 working days.",
            },
            {
              title: "Quick phone chat",
              description: "We call to talk through hours and location.",
            },
            {
              title: "Interview & vetting",
              description: "A short interview, references and Garda vetting.",
            },
          ],
          dataTitle: "Your Data Is Safe",
          dataBody:
            "We only use your details for recruitment. Unsuccessful applications are deleted after 12 months unless you ask us to keep them, in line with GDPR.",
          helpTitle: "Need Help Applying?",
          phone: tel,
          email: mail,
        },
      },
    },
  }
}
