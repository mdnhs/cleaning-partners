import type { Metadata } from "next"
import NotFound from "next/dist/client/components/builtin/not-found"

import "./globals.css"
import { SmoothScroll } from "@/components/motion/smooth-scroll"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { barlow, fontMono, roboto } from "@/app/fonts"

// Same title and description as app/(site)/layout.tsx.
export const metadata: Metadata = {
  title: "Cleaning Partners Ltd. | The Clean Team",
  description:
    "Medical, commercial and domestic cleaning you can rely on, across the midlands and beyond.",
}

// Next 16 global 404: unmatched URLs bypass every layout (there is no root
// layout once the public site lives in app/(site)), so this reproduces the
// old root layout shell around Next's built-in not-found UI.
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        roboto.variable,
        barlow.variable
      )}
    >
      <body>
        <noscript>
          <style>{`[data-intro]{visibility:visible!important}`}</style>
        </noscript>
        <SmoothScroll />
        <ThemeProvider>
          <NotFound />
        </ThemeProvider>
      </body>
    </html>
  )
}
